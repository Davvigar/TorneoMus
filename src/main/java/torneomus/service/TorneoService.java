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
    
    // Variable para mantener el orden mezclado de parejas
    private List<Pareja> ordenParejasMezcladas = null;
    
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
    
    // Generar emparejamientos para la siguiente ronda
    @Transactional
    public List<Enfrentamiento> generarSiguienteRonda() {
        List<Pareja> parejasActivas;
        
        // Usar el orden mezclado si está disponible, sino obtener de la base de datos
        if (ordenParejasMezcladas != null && !ordenParejasMezcladas.isEmpty()) {
            parejasActivas = new ArrayList<>(ordenParejasMezcladas);
            log.info("Usando orden mezclado de parejas para esta ronda");
            // Limpiar el orden mezclado después de usarlo
            ordenParejasMezcladas = null;
        } else {
            parejasActivas = parejaRepository.findParejasActivasWithRivales();
        }
        
        log.info("Generando siguiente ronda. Parejas activas detectadas: {}", parejasActivas.size());
        
        if (parejasActivas.size() < 2) {
            throw new RuntimeException("No hay suficientes parejas activas para generar una ronda");
        }
        
        int rondaActual = getRondaActual();
        int nuevaRonda = rondaActual + 1;
        log.info("Ronda actual: {}, nueva ronda: {}", rondaActual, nuevaRonda);
        
        // Si es impar el número de parejas, una descansa: elegir la de menos descansos
        if (parejasActivas.size() % 2 == 1) {
            parejasActivas.sort(java.util.Comparator.comparingInt(Pareja::getDescansos).thenComparing(Pareja::getNombre));
            Pareja queDescansa = parejasActivas.remove(0);
            queDescansa.setDescansos(queDescansa.getDescansos() + 1);
            parejaRepository.save(queDescansa);
            // Crear un enfrentamiento de descanso para mostrar en UI (pareja2 = pareja1 para evitar NULL en BD)
            Enfrentamiento descanso = new Enfrentamiento(queDescansa, queDescansa, nuevaRonda);
            descanso.setJugado(true);
            enfrentamientoRepository.save(descanso);
            log.info("Descansa esta ronda: {} (descansos acumulados: {})", queDescansa.getNombre(), queDescansa.getDescansos());
        }
        
        List<Enfrentamiento> enfrentamientos = new ArrayList<>();
        List<Pareja> parejasDisponibles = new ArrayList<>(parejasActivas);
        
        // Generar emparejamientos evitando repetir enfrentamientos
        while (parejasDisponibles.size() >= 2) {
            Pareja pareja1 = parejasDisponibles.remove(0);
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
    
    // Encontrar el mejor rival para una pareja
    private Pareja encontrarMejorRival(Pareja pareja, List<Pareja> candidatos, int ronda) {
        // Priorizar parejas que no han jugado contra esta
        List<Pareja> noJugadas = candidatos.stream()
                .filter(c -> !pareja.haJugadoContra(c.getNombre()))
                .collect(Collectors.toList());
        
        if (!noJugadas.isEmpty()) {
            return noJugadas.get(0);
        }
        
        // Si todas han jugado, tomar la primera disponible
        return candidatos.isEmpty() ? null : candidatos.get(0);
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
            if (rondaDeEsteEnfrentamiento < 3 && nuevoPerdedor.getDerrotas() >= 2) {
                // En rondas 1-2 no eliminamos automáticamente
                nuevoPerdedor.setEliminada(false);
            }
            if (rondaDeEsteEnfrentamiento >= 3 && nuevoPerdedor.getDerrotas() >= 2) {
                nuevoPerdedor.setEliminada(true);
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
        
        // Usar fetch join para evitar LazyInitializationException
        List<Pareja> activasPorDerrotas = parejaRepository.findParejasActivasWithRivales();
        List<Pareja> eliminadas = parejaRepository.findParejasEliminadasWithRivales();
        long totalParejas = parejaRepository.count();
        long activasPorFlag = parejaRepository.countParejasActivas();
        int rondaActual = getRondaActual();
        List<Enfrentamiento> enfrentamientosActuales = getEnfrentamientosRondaActual();
        int pendientesRondaActual = (rondaActual == 0) ? 0 : enfrentamientoRepository.findByRondaAndJugadoFalse(rondaActual).size();
        boolean puedeGenerarNuevaRonda = puedeGenerarNuevaRonda();
        
        estado.put("parejasActivas", activasPorDerrotas);
        estado.put("parejasEliminadas", eliminadas);
        estado.put("rondaActual", rondaActual);
        estado.put("enfrentamientosActuales", enfrentamientosActuales);
        estado.put("totalParejas", totalParejas);
        estado.put("parejasActivasCount", activasPorFlag);
        estado.put("pendientesRondaActual", pendientesRondaActual);
        estado.put("puedeGenerarNuevaRonda", puedeGenerarNuevaRonda);
        estado.put("hayOrdenMezclado", hayOrdenMezcladoDisponible());
        
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
        return enfrentamientoRepository.findByRondaAndJugadoFalse(rondaActual).isEmpty();
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
    
    // Verificar si hay un orden mezclado disponible para la próxima ronda
    public boolean hayOrdenMezcladoDisponible() {
        return ordenParejasMezcladas != null && !ordenParejasMezcladas.isEmpty();
    }

	// Mezclar manualmente las parejas activas para cambiar el orden de emparejamiento
	@Transactional
	public void mezclarParejas() {
		List<Pareja> parejasActivas = parejaRepository.findParejasActivasWithRivales();
		if (parejasActivas.size() < 2) {
			throw new RuntimeException("No hay suficientes parejas activas para mezclar");
		}
		
		// Aplicar shuffle a las parejas activas
		java.util.Collections.shuffle(parejasActivas);
		log.info("Parejas mezcladas manualmente. Nuevo orden: {}", 
			parejasActivas.stream().map(Pareja::getNombre).collect(Collectors.joining(", ")));
		
		// Guardar el orden mezclado en una variable de instancia para usarlo en la siguiente ronda
		this.ordenParejasMezcladas = new ArrayList<>(parejasActivas);
	}

	// Reiniciar torneo: borra enfrentamientos y parejas
	@org.springframework.transaction.annotation.Transactional
	public void reiniciarTorneo() {
		// Limpiar el orden mezclado
		ordenParejasMezcladas = null;
		
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