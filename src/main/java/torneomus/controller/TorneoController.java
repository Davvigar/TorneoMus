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
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
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
    
    // Generar las dos primeras rondas de una vez
    @PostMapping("/ronda/primeras-dos")
    public String generarPrimerasDosRondas(RedirectAttributes redirectAttributes) {
        try {
            if (!torneoService.puedeGenerarPrimerasDosRondas()) {
                redirectAttributes.addFlashAttribute("error", "Solo se pueden generar las dos primeras rondas cuando el torneo está en ronda 0.");
                return "redirect:/";
            }
            List<Enfrentamiento> enfrentamientos = torneoService.generarPrimerasDosRondas();
            redirectAttributes.addFlashAttribute("mensaje", 
                "¡Primeras dos rondas generadas! Total: " + enfrentamientos.size() + " enfrentamientos");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/";
    }
    
    // Generar nueva ronda
    @PostMapping("/ronda/nueva")
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
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/clasificacion")
    public String mostrarClasificacion(Model model) {
        // Usar métodos con fetch join para evitar LazyInitializationException
        List<Pareja> parejasActivas = torneoService.getParejasActivasWithRivales();
        List<Pareja> parejasEliminadas = torneoService.getParejasEliminadasWithRivales();
        
        // Ordenar las listas
        parejasActivas.sort((p1, p2) -> Integer.compare(p1.getDerrotas(), p2.getDerrotas()));
        parejasEliminadas.sort((p1, p2) -> Integer.compare(p2.getDerrotas(), p1.getDerrotas()));
        
        model.addAttribute("parejasActivas", parejasActivas);
        model.addAttribute("parejasEliminadas", parejasEliminadas);
        return "clasificacion";
    }
    
    // Mostrar historial de rondas
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/historial")
    public String mostrarHistorial(Model model) {
        int rondaActual = torneoService.getRondaActual();
        model.addAttribute("rondaActual", rondaActual);

        if (rondaActual == 0) {
            model.addAttribute("historial", java.util.Collections.emptyMap());
            return "historial";
        }

        // Mostrar todas las rondas desde el principio (ronda 1 hasta la actual)
        java.util.Map<Integer, java.util.List<torneomus.entity.Enfrentamiento>> historial = new java.util.LinkedHashMap<>();
        for (int i = 1; i <= rondaActual; i++) {
            historial.put(i, torneoService.getEnfrentamientosPorRonda(i));
        }
        model.addAttribute("historial", historial);
        return "historial";
    }

    // Método eliminado: la mezcla ahora es automática en cada ronda

    // Verificar eliminación de parejas
    @PostMapping("/torneo/verificar-eliminacion")
    public String verificarEliminacionParejas(RedirectAttributes redirectAttributes) {
        try {
            torneoService.verificarEliminacionParejas();
            redirectAttributes.addFlashAttribute("mensaje", "Estado de eliminación de parejas verificado y corregido.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "No se pudo verificar la eliminación: " + e.getMessage());
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