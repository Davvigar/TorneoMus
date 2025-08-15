package torneomus.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import torneomus.entity.Pareja;

@Repository
public interface ParejaRepository extends JpaRepository<Pareja, Long> {
    
    Optional<Pareja> findByNombre(String nombre);
    
    List<Pareja> findByEliminadaFalse();
    
    List<Pareja> findByEliminadaTrue();
    
    @Query("SELECT p FROM Pareja p WHERE p.derrotas < 2")
    List<Pareja> findParejasActivas();
    
    @Query("SELECT COUNT(p) FROM Pareja p WHERE p.eliminada = false")
    long countParejasActivas();
    
    @Query("SELECT DISTINCT p FROM Pareja p LEFT JOIN FETCH p.rivalesJugados WHERE p.eliminada = false")
    List<Pareja> findParejasActivasWithRivales();
    
    @Query("SELECT DISTINCT p FROM Pareja p LEFT JOIN FETCH p.rivalesJugados WHERE p.eliminada = true")
    List<Pareja> findParejasEliminadasWithRivales();
    
    @Query("SELECT DISTINCT p FROM Pareja p LEFT JOIN FETCH p.rivalesJugados")
    List<Pareja> findAllWithRivales();
    
    boolean existsByNombre(String nombre);
} 