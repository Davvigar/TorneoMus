package torneomus.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import torneomus.entity.Enfrentamiento;
import torneomus.entity.Pareja;
import torneomus.service.TorneoService;

@Controller
public class TorneoController {
    
    @Autowired
    private TorneoService torneoService;
    
    // Página principal
    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("estado", torneoService.obtenerEstadoTorneo());
        model.addAttribute("torneoTerminado", torneoService.torneoTerminado());
        model.addAttribute("parejaGanadora", torneoService.getParejaGanadora());
        return "index";
    }
    
    // Registrar nueva pareja
    @PostMapping("/pareja/registrar")
    public String registrarPareja(@RequestParam String nombre, RedirectAttributes redirectAttributes) {
        try {
            torneoService.registrarPareja(nombre);
            redirectAttributes.addFlashAttribute("mensaje", "Pareja '" + nombre + "' registrada correctamente");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/";
    }
    
    // Generar nueva ronda
    @GetMapping("/ronda/nueva")
    public String generarNuevaRonda(RedirectAttributes redirectAttributes) {
        try {
            if (!torneoService.puedeGenerarNuevaRonda()) {
                redirectAttributes.addFlashAttribute("error", "No puedes generar una nueva ronda: hay enfrentamientos pendientes en la ronda actual.");
                return "redirect:/";
            }
            List<Enfrentamiento> enfrentamientos = torneoService.generarSiguienteRonda();
            redirectAttributes.addFlashAttribute("mensaje", 
                "Nueva ronda generada con " + enfrentamientos.size() + " enfrentamientos");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/";
    }
    
    // Mostrar formulario para registrar resultado
    @GetMapping("/resultado/{enfrentamientoId}")
    public String mostrarFormularioResultado(@PathVariable Long enfrentamientoId, Model model) {
        Enfrentamiento enfrentamiento = torneoService.getEnfrentamientosRondaActual().stream()
                .filter(e -> e.getId().equals(enfrentamientoId))
                .findFirst()
                .orElse(null);
        
        if (enfrentamiento == null) {
            return "redirect:/";
        }
        
        model.addAttribute("enfrentamiento", enfrentamiento);
        return "resultado";
    }
    
    // Registrar resultado
    @PostMapping("/resultado")
    public String registrarResultado(@RequestParam Long enfrentamientoId, 
                                   @RequestParam Long ganadorId,
                                   RedirectAttributes redirectAttributes) {
        try {
            torneoService.registrarResultado(enfrentamientoId, ganadorId);
            redirectAttributes.addFlashAttribute("mensaje", "Resultado registrado correctamente");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/";
    }
    
    // Mostrar clasificación
    @GetMapping("/clasificacion")
    public String mostrarClasificacion(Model model) {
        model.addAttribute("parejasActivas", torneoService.getAllParejas().stream()
                .filter(p -> !p.isEliminada())
                .sorted((p1, p2) -> Integer.compare(p1.getDerrotas(), p2.getDerrotas()))
                .toList());
        model.addAttribute("parejasEliminadas", torneoService.getAllParejas().stream()
                .filter(Pareja::isEliminada)
                .sorted((p1, p2) -> Integer.compare(p2.getDerrotas(), p1.getDerrotas()))
                .toList());
        return "clasificacion";
    }
    
    // Mostrar historial de rondas
    @GetMapping("/historial")
    public String mostrarHistorial(Model model) {
        int rondaActual = torneoService.getRondaActual();
        model.addAttribute("rondaActual", rondaActual);

        if (rondaActual == 0) {
            model.addAttribute("historial", java.util.Collections.emptyMap());
            return "historial";
        }

        int desde = Math.max(1, rondaActual - 4);
        java.util.Map<Integer, java.util.List<torneomus.entity.Enfrentamiento>> historial = new java.util.LinkedHashMap<>();
        for (int i = desde; i <= rondaActual; i++) {
            historial.put(i, torneoService.getEnfrentamientosPorRonda(i));
        }
        model.addAttribute("historial", historial);
        return "historial";
    }

    // Mezclar parejas manualmente
    @PostMapping("/parejas/mezclar")
    public String mezclarParejas(RedirectAttributes redirectAttributes) {
        try {
            torneoService.mezclarParejas();
            redirectAttributes.addFlashAttribute("mensaje", "Parejas mezcladas correctamente. El nuevo orden se aplicará en la próxima ronda.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "No se pudieron mezclar las parejas: " + e.getMessage());
        }
        return "redirect:/";
    }

    // Reiniciar torneo (borra datos)
    @PostMapping("/torneo/reiniciar")
    public String reiniciarTorneo(RedirectAttributes redirectAttributes) {
        try {
            torneoService.reiniciarTorneo();
            redirectAttributes.addFlashAttribute("mensaje", "Torneo reiniciado. Puedes registrar nuevas parejas.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "No se pudo reiniciar: " + e.getMessage());
        }
        return "redirect:/";
    }
} 