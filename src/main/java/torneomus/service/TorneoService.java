package torneomus.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import torneomus.entity.Enfrentamiento;
import torneomus.entity.Pareja;
import torneomus.repository.EnfrentamientoRepository;
import torneomus.repository.ParejaRepository;

@Service
public class TorneoService {
    
    private static final Logger log = LoggerFactory.getLogger(TorneoService.class);
    
    @Autowired
    private ParejaRepository parejaRepository;
    
    @Autowired
    private EnfrentamientoRepository enfrentamientoRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    // Variable para generar aleatoriedad consistente por ronda
    private java.util.Random randomGenerator = new java.util.Random();
    
    // Método auxiliar para selección aleatoria
    private int seleccionarIndiceAleatorio(int maximo) {
        return randomGenerator.nextInt(maximo);
    }
    
    // Registrar una nueva pareja
    @Transactional
    public Pareja registrarPareja(String nombre) {
        log.info("Registrando pareja: {}", nombre);
        if (parejaRepository.existsByNombre(nombre)) {
            throw new RuntimeException("Ya existe una pareja con ese nombre");
        }
        
        Pareja pareja = new Pareja(nombre);
        Pareja guardada = parejaRepository.save(pareja);
        log.info("Pareja registrada con id {}", guardada.getId());
        return guardada;
    }
    
    // Generar las dos primeras rondas de una vez (solo para inicio del torneo)
    @Transactional
    public List<Enfrentamiento> generarPrimerasDosRondas() {
        if (getRondaActual() > 0) {
            throw new RuntimeException("Solo se pueden generar las primeras dos rondas cuando el torneo está en ronda 0");
        }
        
        List<Enfrentamiento> todasLasRondas = new ArrayList<>();
        
        // Generar primera ronda
        List<Enfrentamiento> primeraRonda = generarSiguienteRonda();
        todasLasRondas.addAll(primeraRonda);
        
        // Generar segunda ronda pero mantener el sistema en la ronda 1
        List<Enfrentamiento> segundaRonda = generarRondaEspecifica(2);
        todasLasRondas.addAll(segundaRonda);
        
        log.info("Generadas las dos primeras rondas: {} enfrentamientos en total. El sistema permanecerá en la ronda 1 hasta completarla.", todasLasRondas.size());
        return todasLasRondas;
    }
    
    // Generar emparejamientos para la siguiente ronda
    @Transactional
    public List<Enfrentamiento> generarSiguienteRonda() {
        List<Pareja> parejasActivas = parejaRepository.findParejasActivasWithRivales();
        
        log.info("Generando siguiente ronda. Parejas activas detectadas: {}", parejasActivas.size());
        
        if (parejasActivas.size() < 2) {
            throw new RuntimeException("No hay suficientes parejas activas para generar una ronda");
        }
        
        int rondaActual = getRondaActual();
        int nuevaRonda = rondaActual + 1;
        log.info("Ronda actual: {}, nueva ronda: {}", rondaActual, nuevaRonda);
        
        // Mezclar aleatoriamente las parejas para esta ronda con semilla basada en la ronda
        randomGenerator.setSeed(System.currentTimeMillis() + nuevaRonda);
        java.util.Collections.shuffle(parejasActivas, randomGenerator);
        log.info("Parejas mezcladas aleatoriamente para la ronda {} con semilla {}", nuevaRonda, System.currentTimeMillis() + nuevaRonda);
        
        // Si es impar el número de parejas, una descansa: elegir aleatoriamente entre las que tienen menos descansos
        if (parejasActivas.size() % 2 == 1) {
            parejasActivas.sort(java.util.Comparator.comparingInt(Pareja::getDescansos).thenComparing(Pareja::getNombre));
            
            // Encontrar el mínimo número de descansos
            int minDescansos = parejasActivas.get(0).getDescansos();
            
            // Filtrar parejas con el mínimo número de descansos
            List<Pareja> candidatosDescanso = parejasActivas.stream()
                    .filter(p -> p.getDescansos() == minDescansos)
                    .collect(Collectors.toList());
            
            // Seleccionar aleatoriamente entre los candidatos
            int indiceAleatorio = randomGenerator.nextInt(candidatosDescanso.size());
            Pareja queDescansa = candidatosDescanso.get(indiceAleatorio);
            
            // Remover la pareja seleccionada de la lista principal
            parejasActivas.remove(queDescansa);
            
            queDescansa.setDescansos(queDescansa.getDescansos() + 1);
            parejaRepository.save(queDescansa);
            // Crear un enfrentamiento de descanso para mostrar en UI (pareja2 = pareja1 para evitar NULL en BD)
            Enfrentamiento descanso = new Enfrentamiento(queDescansa, queDescansa, nuevaRonda);
            descanso.setJugado(true);
            enfrentamientoRepository.save(descanso);
            log.info("Descansa esta ronda: {} (descansos acumulados: {}) - seleccionada aleatoriamente entre {} candidatos", 
                    queDescansa.getNombre(), queDescansa.getDescansos(), candidatosDescanso.size());
        }
        
        List<Enfrentamiento> enfrentamientos = new ArrayList<>();
        List<Pareja> parejasDisponibles = new ArrayList<>(parejasActivas);
        
        // Generar emparejamientos de forma verdaderamente aleatoria
        while (parejasDisponibles.size() >= 2) {
            // Seleccionar pareja1 de forma aleatoria
            int indiceAleatorio = (int) (Math.random() * parejasDisponibles.size());
            Pareja pareja1 = parejasDisponibles.remove(indiceAleatorio);
            
            Pareja pareja2 = encontrarMejorRival(pareja1, parejasDisponibles, nuevaRonda);
            
            if (pareja2 != null) {
                parejasDisponibles.remove(pareja2);
                
                Enfrentamiento enfrentamiento = new Enfrentamiento(pareja1, pareja2, nuevaRonda);
                enfrentamiento = enfrentamientoRepository.save(enfrentamiento);
                enfrentamientos.add(enfrentamiento);
                
                // Actualizar rivales jugados
                pareja1.agregarRival(pareja2.getNombre());
                pareja2.agregarRival(pareja1.getNombre());
                parejaRepository.save(pareja1);
                parejaRepository.save(pareja2);
                log.info("Emparejadas: {} vs {} en ronda {}", pareja1.getNombre(), pareja2.getNombre(), nuevaRonda);
            } else {
                log.warn("No se encontró rival para {} en esta iteración", pareja1.getNombre());
            }
        }
        
        log.info("Total enfrentamientos generados: {}", enfrentamientos.size());
        return enfrentamientos;
    }
    
    // Generar una ronda específica sin cambiar la ronda actual del sistema
    private List<Enfrentamiento> generarRondaEspecifica(int numeroRonda) {
        List<Pareja> parejasActivas = parejaRepository.findParejasActivasWithRivales();
        
        if (parejasActivas.size() < 2) {
            throw new RuntimeException("No hay suficientes parejas activas para generar la ronda " + numeroRonda);
        }
        
        log.info("Generando ronda específica {}. Parejas activas detectadas: {}", numeroRonda, parejasActivas.size());
        
        // Mezclar aleatoriamente las parejas para esta ronda específica con semilla basada en la ronda
        randomGenerator.setSeed(System.currentTimeMillis() + numeroRonda);
        java.util.Collections.shuffle(parejasActivas, randomGenerator);
        log.info("Parejas mezcladas aleatoriamente para la ronda específica {} con semilla {}", numeroRonda, System.currentTimeMillis() + numeroRonda);
        
        // Si es impar el número de parejas, una descansa: elegir aleatoriamente entre las que tienen menos descansos
        if (parejasActivas.size() % 2 == 1) {
            parejasActivas.sort(java.util.Comparator.comparingInt(Pareja::getDescansos).thenComparing(Pareja::getNombre));
            
            // Encontrar el mínimo número de descansos
            int minDescansos = parejasActivas.get(0).getDescansos();
            
            // Filtrar parejas con el mínimo número de descansos
            List<Pareja> candidatosDescanso = parejasActivas.stream()
                    .filter(p -> p.getDescansos() == minDescansos)
                    .collect(Collectors.toList());
            
            // Seleccionar aleatoriamente entre los candidatos
            int indiceAleatorio = randomGenerator.nextInt(candidatosDescanso.size());
            Pareja queDescansa = candidatosDescanso.get(indiceAleatorio);
            
            // Remover la pareja seleccionada de la lista principal
            parejasActivas.remove(queDescansa);
            
            queDescansa.setDescansos(queDescansa.getDescansos() + 1);
            parejaRepository.save(queDescansa);
            // Crear un enfrentamiento de descanso para mostrar en UI (pareja2 = pareja1 para evitar NULL en BD)
            Enfrentamiento descanso = new Enfrentamiento(queDescansa, queDescansa, numeroRonda);
            descanso.setJugado(true);
            enfrentamientoRepository.save(descanso);
            log.info("Descansa esta ronda: {} (descansos acumulados: {}) - seleccionada aleatoriamente entre {} candidatos", 
                    queDescansa.getNombre(), queDescansa.getDescansos(), candidatosDescanso.size());
        }
        
        List<Enfrentamiento> enfrentamientos = new ArrayList<>();
        List<Pareja> parejasDisponibles = new ArrayList<>(parejasActivas);
        
        // Generar emparejamientos de forma verdaderamente aleatoria
        while (parejasDisponibles.size() >= 2) {
            // Seleccionar pareja1 de forma aleatoria
            int indiceAleatorio = (int) (Math.random() * parejasDisponibles.size());
            Pareja pareja1 = parejasDisponibles.remove(indiceAleatorio);
            
            Pareja pareja2 = encontrarMejorRival(pareja1, parejasDisponibles, numeroRonda);
            
            if (pareja2 != null) {
                parejasDisponibles.remove(pareja2);
                
                Enfrentamiento enfrentamiento = new Enfrentamiento(pareja1, pareja2, numeroRonda);
                enfrentamiento = enfrentamientoRepository.save(enfrentamiento);
                enfrentamientos.add(enfrentamiento);
                
                // Actualizar rivales jugados
                pareja1.agregarRival(pareja2.getNombre());
                pareja2.agregarRival(pareja1.getNombre());
                parejaRepository.save(pareja1);
                parejaRepository.save(pareja2);
                log.info("Emparejadas: {} vs {} en ronda {}", pareja1.getNombre(), pareja2.getNombre(), numeroRonda);
            } else {
                log.warn("No se encontró rival para {} en esta iteración", pareja1.getNombre());
            }
        }
        
        log.info("Total enfrentamientos generados para ronda {}: {}", numeroRonda, enfrentamientos.size());
        return enfrentamientos;
    }
    
    // Encontrar el mejor rival para una pareja
    private Pareja encontrarMejorRival(Pareja pareja, List<Pareja> candidatos, int ronda) {
        if (candidatos.isEmpty()) {
            return null;
        }
        
        // Priorizar parejas que no han jugado contra esta
        List<Pareja> noJugadas = candidatos.stream()
                .filter(c -> !pareja.haJugadoContra(c.getNombre()))
                .collect(Collectors.toList());
        
        if (!noJugadas.isEmpty()) {
            // Si hay varias opciones, elegir la que menos veces ha jugado en rondas recientes
            return encontrarParejaMenosActiva(noJugadas);
        }
        
        // Si todas han jugado, verificar si hay alguna que no haya jugado en la ronda anterior
        List<Pareja> noJugadasRondaAnterior = candidatos.stream()
                .filter(c -> !haJugadoEnRondaAnterior(c, ronda))
                .collect(Collectors.toList());
        
        if (!noJugadasRondaAnterior.isEmpty()) {
            return encontrarParejaMenosActiva(noJugadasRondaAnterior);
        }
        
        // Si todas han jugado y todas jugaron en la ronda anterior, tomar la que menos veces ha jugado en rondas recientes
        return encontrarParejaMenosActiva(candidatos);
    }
    
    // Verificar si una pareja jugó en la ronda anterior
    private boolean haJugadoEnRondaAnterior(Pareja pareja, int rondaActual) {
        if (rondaActual <= 1) {
            return false; // No hay ronda anterior
        }
        
        try {
            int enfrentamientosRondaAnterior = enfrentamientoRepository.countEnfrentamientosEnRonda(pareja.getId(), rondaActual - 1);
            return enfrentamientosRondaAnterior > 0;
        } catch (Exception e) {
            log.warn("Error al verificar si pareja {} jugó en ronda anterior: {}", pareja.getNombre(), e.getMessage());
            return false;
        }
    }
    
    // Encontrar la pareja que menos veces ha jugado en rondas recientes
    private Pareja encontrarParejaMenosActiva(List<Pareja> candidatos) {
        if (candidatos.isEmpty()) {
            return null;
        }
        
        // Si solo hay un candidato, devolverlo directamente
        if (candidatos.size() == 1) {
            return candidatos.get(0);
        }
        
        // Obtener el número de enfrentamientos jugados en las últimas 2 rondas para cada candidato
        Map<Pareja, Integer> enfrentamientosRecientes = new HashMap<>();
        
        for (Pareja candidato : candidatos) {
            try {
                int enfrentamientosRecientesCount = enfrentamientoRepository.countEnfrentamientosRecientes(candidato.getId());
                enfrentamientosRecientes.put(candidato, enfrentamientosRecientesCount);
            } catch (Exception e) {
                // Si hay algún error, asumir 0 enfrentamientos recientes
                enfrentamientosRecientes.put(candidato, 0);
                log.warn("Error al contar enfrentamientos recientes para pareja {}: {}", candidato.getNombre(), e.getMessage());
            }
        }
        
        // Encontrar el mínimo número de enfrentamientos recientes
        int minEnfrentamientos = enfrentamientosRecientes.values().stream()
                .mapToInt(Integer::intValue)
                .min()
                .orElse(0);
        
        // Filtrar candidatos con el mínimo número de enfrentamientos recientes
        List<Pareja> candidatosConMinimo = candidatos.stream()
                .filter(p -> enfrentamientosRecientes.getOrDefault(p, 0) == minEnfrentamientos)
                .collect(Collectors.toList());
        
        // Si hay múltiples candidatos con el mismo mínimo, seleccionar uno aleatoriamente
        if (candidatosConMinimo.size() > 1) {
            int indiceAleatorio = randomGenerator.nextInt(candidatosConMinimo.size());
            return candidatosConMinimo.get(indiceAleatorio);
        }
        
        // Si solo hay uno, devolverlo
        return candidatosConMinimo.get(0);
    }
    
    // Registrar o editar el resultado de un enfrentamiento
    @Transactional
    public void registrarResultado(Long enfrentamientoId, Long ganadorId) {
        Enfrentamiento enfrentamiento = enfrentamientoRepository.findById(enfrentamientoId)
                .orElseThrow(() -> new RuntimeException("Enfrentamiento no encontrado"));

        // No permitir operar sobre descansos
        boolean esDescanso = false;
        try {
            esDescanso = enfrentamiento.isDescanso();
        } catch (Exception ignored) {}
        if (esDescanso) {
            throw new RuntimeException("Este enfrentamiento es un descanso y no admite resultado");
        }

        Pareja nuevoGanador = parejaRepository.findById(ganadorId)
                .orElseThrow(() -> new RuntimeException("Pareja ganadora no encontrada"));

        if (!enfrentamiento.involucraPareja(nuevoGanador)) {
            throw new RuntimeException("La pareja ganadora no participa en este enfrentamiento");
        }

        // Si ya había un ganador y es el mismo, no hacemos nada
        Pareja ganadorAnterior = enfrentamiento.getGanador();
        if (ganadorAnterior != null && ganadorAnterior.getId().equals(nuevoGanador.getId())) {
            return;
        }

        // Deshacer efecto anterior si existía
        if (ganadorAnterior != null) {
            Pareja perdedorAnterior = ganadorAnterior.equals(enfrentamiento.getPareja1())
                    ? enfrentamiento.getPareja2() : enfrentamiento.getPareja1();
            if (perdedorAnterior != null) {
                int derrotas = Math.max(0, perdedorAnterior.getDerrotas() - 1);
                perdedorAnterior.setDerrotas(derrotas);
                if (derrotas < 2) {
                    perdedorAnterior.setEliminada(false);
                }
                parejaRepository.save(perdedorAnterior);
            }
        }

        // Aplicar nuevo ganador
        enfrentamiento.setGanador(nuevoGanador);
        enfrentamiento.setJugado(true);
        enfrentamientoRepository.save(enfrentamiento);

        // Aplicar derrota al nuevo perdedor
        Pareja nuevoPerdedor = nuevoGanador.equals(enfrentamiento.getPareja1())
                ? enfrentamiento.getPareja2() : enfrentamiento.getPareja1();
        if (nuevoPerdedor != null) {
            nuevoPerdedor.agregarDerrota();
            int rondaDeEsteEnfrentamiento = enfrentamiento.getRonda();
            int rondaActual = getRondaActual();
            
            // Lógica mejorada de eliminación
            if (nuevoPerdedor.getDerrotas() >= 2) {
                // Si ya tenemos 2 o más derrotas, verificar si debemos eliminar
                if (rondaDeEsteEnfrentamiento >= 3) {
                    // En rondas 3+ siempre eliminamos con 2 derrotas
                    nuevoPerdedor.setEliminada(true);
                    log.info("Pareja {} eliminada automáticamente en ronda {} (2 derrotas)", 
                            nuevoPerdedor.getNombre(), rondaDeEsteEnfrentamiento);
                } else if (rondaActual >= 2) {
                    // Si ya estamos en ronda 2 o superior, y la pareja tiene 2 derrotas,
                    // la eliminamos automáticamente (independientemente de en qué ronda fue la derrota)
                    nuevoPerdedor.setEliminada(true);
                    log.info("Pareja {} eliminada automáticamente (2 derrotas, torneo en ronda {})", 
                            nuevoPerdedor.getNombre(), rondaActual);
                } else {
                    // En ronda 1 con 2 derrotas, no eliminamos automáticamente
                    nuevoPerdedor.setEliminada(false);
                    log.info("Pareja {} con 2 derrotas en ronda 1, no eliminada automáticamente", 
                            nuevoPerdedor.getNombre());
                }
            } else {
                // Con menos de 2 derrotas, asegurar que no esté eliminada
                nuevoPerdedor.setEliminada(false);
            }
            
            parejaRepository.save(nuevoPerdedor);
        }
    }

    // Obtener enfrentamiento por id
    public Enfrentamiento getEnfrentamiento(Long id) {
        return enfrentamientoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Enfrentamiento no encontrado"));
    }
    
    // Obtener el estado actual del torneo
    public Map<String, Object> obtenerEstadoTorneo() {
        Map<String, Object> estado = new HashMap<>();
        
        // Verificar y corregir el estado de eliminación si es necesario
        verificarEliminacionParejas();
        
        // Usar fetch join para evitar LazyInitializationException
        List<Pareja> activasPorDerrotas = parejaRepository.findParejasActivasWithRivales();
        List<Pareja> eliminadas = parejaRepository.findParejasEliminadasWithRivales();
        long totalParejas = parejaRepository.count();
        long activasPorFlag = parejaRepository.countParejasActivas();
        int rondaActual = getRondaActual();
        List<Enfrentamiento> enfrentamientosActuales = getEnfrentamientosRondaActual();
        
        // Determinar la ronda que se debe mostrar en la UI
        int rondaAMostrar = rondaActual;
        if (rondaActual == 2) {
            // Si estamos en ronda 2 pero hay pendientes en ronda 1, mostrar ronda 1
            List<Enfrentamiento> enfrentamientosRonda1 = enfrentamientoRepository.findByRondaOrderById(1);
            boolean hayPendientesRonda1 = enfrentamientosRonda1.stream().anyMatch(e -> !e.isJugado());
            if (hayPendientesRonda1) {
                rondaAMostrar = 1;
            }
        }
        
        int pendientesRondaActual = (rondaActual == 0) ? 0 : enfrentamientoRepository.findByRondaAndJugadoFalse(rondaAMostrar).size();
        boolean puedeGenerarNuevaRonda = puedeGenerarNuevaRonda();
        
        estado.put("parejasActivas", activasPorDerrotas);
        estado.put("parejasEliminadas", eliminadas);
        estado.put("rondaActual", rondaActual);
        estado.put("rondaAMostrar", rondaAMostrar);
        estado.put("enfrentamientosActuales", enfrentamientosActuales);
        estado.put("totalParejas", totalParejas);
        estado.put("parejasActivasCount", activasPorFlag);
        estado.put("pendientesRondaActual", pendientesRondaActual);
        estado.put("puedeGenerarNuevaRonda", puedeGenerarNuevaRonda);
        estado.put("puedeGenerarPrimerasDosRondas", puedeGenerarPrimerasDosRondas());
        estado.put("hayOrdenMezclado", false); // No hay orden mezclado manual
        
        log.debug("Estado torneo: totalParejas={}, activasPorDerrotas={}, activasPorFlag={}, rondaActual={}, pendientes={}",
                totalParejas, activasPorDerrotas.size(), activasPorFlag, rondaActual, pendientesRondaActual);
        
        return estado;
    }

    public boolean puedeGenerarNuevaRonda() {
        if (parejaRepository.countParejasActivas() < 2) {
            return false;
        }
        int rondaActual = getRondaActual();
        if (rondaActual == 0) {
            return true;
        }
        
        // Si estamos en la ronda 2, verificar que no haya pendientes en la ronda 1
        if (rondaActual == 2) {
            List<Enfrentamiento> enfrentamientosRonda1 = enfrentamientoRepository.findByRondaOrderById(1);
            boolean hayPendientesRonda1 = enfrentamientosRonda1.stream().anyMatch(e -> !e.isJugado());
            if (hayPendientesRonda1) {
                return false; // No se puede generar nueva ronda si hay pendientes en ronda 1
            }
        }
        
        return enfrentamientoRepository.findByRondaAndJugadoFalse(rondaActual).isEmpty();
    }
    
    public boolean puedeGenerarPrimerasDosRondas() {
        if (parejaRepository.countParejasActivas() < 2) {
            return false;
        }
        int rondaActual = getRondaActual();
        return rondaActual == 0; // Solo cuando no hay rondas generadas
    }
    
    // Obtener la ronda actual
    public int getRondaActual() {
        Integer maxRonda = enfrentamientoRepository.findMaxRonda();
        return maxRonda != null ? maxRonda : 0;
    }
    
    // Obtener enfrentamientos de la ronda actual
    public List<Enfrentamiento> getEnfrentamientosRondaActual() {
        int rondaActual = getRondaActual();
        if (rondaActual == 0) {
            return new ArrayList<>();
        }
        
        // Si estamos en la ronda 2 pero hay enfrentamientos pendientes en la ronda 1, 
        // mostrar los de la ronda 1 para que se completen primero
        if (rondaActual == 2) {
            List<Enfrentamiento> enfrentamientosRonda1 = enfrentamientoRepository.findByRondaOrderById(1);
            boolean hayPendientesRonda1 = enfrentamientosRonda1.stream().anyMatch(e -> !e.isJugado());
            if (hayPendientesRonda1) {
                log.debug("Mostrando enfrentamientos de la ronda 1 ya que hay pendientes por completar");
                return enfrentamientosRonda1;
            }
        }
        
        return enfrentamientoRepository.findByRondaOrderById(rondaActual);
    }
    
    // Verificar si el torneo ha terminado
    public boolean torneoTerminado() {
        long parejasActivas = parejaRepository.countParejasActivas();
        int rondaActual = getRondaActual();
        return rondaActual > 0 && parejasActivas <= 1;
    }
    
    // Obtener la pareja ganadora (si el torneo terminó)
    public Pareja getParejaGanadora() {
        if (!torneoTerminado()) {
            return null;
        }
        
        List<Pareja> parejasActivas = parejaRepository.findParejasActivasWithRivales();
        return parejasActivas.isEmpty() ? null : parejasActivas.get(0);
    }
    
    // Obtener todas las parejas
    public List<Pareja> getAllParejas() {
        return parejaRepository.findAll();
    }
    
    // Obtener parejas activas con rivales (fetch join)
    public List<Pareja> getParejasActivasWithRivales() {
        return parejaRepository.findParejasActivasWithRivales();
    }
    
    // Obtener parejas eliminadas con rivales (fetch join)
    public List<Pareja> getParejasEliminadasWithRivales() {
        return parejaRepository.findParejasEliminadasWithRivales();
    }
    
    // Obtener enfrentamientos por ronda
    public List<Enfrentamiento> getEnfrentamientosPorRonda(int ronda) {
        return enfrentamientoRepository.findByRondaOrderById(ronda);
    }
    
    // Obtener enfrentamientos de una ronda específica con validación
    public List<Enfrentamiento> getEnfrentamientosRondaEspecifica(int ronda) {
        if (ronda <= 0) {
            return new ArrayList<>();
        }
        return enfrentamientoRepository.findByRondaOrderById(ronda);
    }
    
    // Verificar si hay un orden mezclado disponible para la próxima ronda
    public boolean hayOrdenMezcladoDisponible() {
        return false; // No hay orden mezclado manual
    }
    
    // Verificar y corregir el estado de eliminación de parejas
    @Transactional
    public void verificarEliminacionParejas() {
        int rondaActual = getRondaActual();
        if (rondaActual < 2) {
            return; // Solo verificar cuando estemos en ronda 2 o superior
        }
        
        List<Pareja> todasLasParejas = parejaRepository.findAll();
        int parejasCorregidas = 0;
        
        for (Pareja pareja : todasLasParejas) {
            if (pareja.getDerrotas() >= 2 && !pareja.isEliminada()) {
                // Pareja con 2+ derrotas que no está eliminada
                pareja.setEliminada(true);
                parejaRepository.save(pareja);
                parejasCorregidas++;
                log.info("Pareja {} marcada como eliminada (2 derrotas, ronda actual: {})", 
                        pareja.getNombre(), rondaActual);
            } else if (pareja.getDerrotas() < 2 && pareja.isEliminada()) {
                // Pareja con menos de 2 derrotas que está marcada como eliminada
                pareja.setEliminada(false);
                parejaRepository.save(pareja);
                parejasCorregidas++;
                log.info("Pareja {} marcada como activa ({} derrotas, ronda actual: {})", 
                        pareja.getNombre(), pareja.getDerrotas(), rondaActual);
            }
        }
        
        if (parejasCorregidas > 0) {
            log.info("Estado de eliminación corregido para {} parejas", parejasCorregidas);
        }
    }

	// Método eliminado: la mezcla ahora es automática en cada ronda

	// Reiniciar torneo: borra enfrentamientos y parejas
	@org.springframework.transaction.annotation.Transactional
	public void reiniciarTorneo() {
		// Limpiar el orden mezclado
		// ordenParejasMezcladas = null; // Eliminado
		
		// Borrar primero enfrentamientos por claves foráneas a parejas
		enfrentamientoRepository.deleteAllInBatch();
		parejaRepository.deleteAllInBatch();
		// Resetear AUTO_INCREMENT para que los IDs empiecen desde 1 de nuevo
		try {
			jdbcTemplate.execute("ALTER TABLE enfrentamientos AUTO_INCREMENT = 1");
			jdbcTemplate.execute("ALTER TABLE parejas AUTO_INCREMENT = 1");
			log.info("AUTO_INCREMENT reiniciado para tablas 'enfrentamientos' y 'parejas'");
		} catch (Exception e) {
			log.warn("No se pudo reiniciar AUTO_INCREMENT: {}", e.getMessage());
		}
	}
} 