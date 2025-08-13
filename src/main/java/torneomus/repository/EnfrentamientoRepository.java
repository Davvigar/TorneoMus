package torneomus.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import torneomus.entity.Enfrentamiento;
import torneomus.entity.Pareja;

import java.util.List;

@Repository
public interface EnfrentamientoRepository extends JpaRepository<Enfrentamiento, Long> {
    
    List<Enfrentamiento> findByRondaOrderById(int ronda);
    
    List<Enfrentamiento> findByRondaAndJugadoFalse(int ronda);
    
    List<Enfrentamiento> findByJugadoFalse();
    
    @Query("SELECT e FROM Enfrentamiento e WHERE e.pareja1 = ?1 OR e.pareja2 = ?1")
    List<Enfrentamiento> findByPareja(Pareja pareja);
    
    @Query("SELECT e FROM Enfrentamiento e WHERE (e.pareja1 = ?1 AND e.pareja2 = ?2) OR (e.pareja1 = ?2 AND e.pareja2 = ?1)")
    List<Enfrentamiento> findByParejas(Pareja pareja1, Pareja pareja2);
    
    @Query("SELECT MAX(e.ronda) FROM Enfrentamiento e")
    Integer findMaxRonda();
} 