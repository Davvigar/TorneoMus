package torneomus.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "parejas")
public class Pareja {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String nombre;
    
    @Column(nullable = false)
    private int derrotas = 0;
    
    @ElementCollection
    @CollectionTable(name = "pareja_rivales", joinColumns = @JoinColumn(name = "pareja_id"))
    @Column(name = "rival_nombre")
    private List<String> rivalesJugados = new ArrayList<>();
    
    @Column(nullable = false)
    private boolean eliminada = false;

    @Column(nullable = false)
    private int descansos = 0;
    
    // Constructores
    public Pareja() {}
    
    public Pareja(String nombre) {
        this.nombre = nombre;
    }
    
    // Getters y Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getNombre() {
        return nombre;
    }
    
    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
    
    public int getDerrotas() {
        return derrotas;
    }
    
    public void setDerrotas(int derrotas) {
        this.derrotas = derrotas;
    }
    
    public List<String> getRivalesJugados() {
        return rivalesJugados;
    }
    
    public void setRivalesJugados(List<String> rivalesJugados) {
        this.rivalesJugados = rivalesJugados;
    }
    
    public boolean isEliminada() {
        return eliminada;
    }
    
    public void setEliminada(boolean eliminada) {
        this.eliminada = eliminada;
    }
    
    public int getDescansos() {
        return descansos;
    }

    public void setDescansos(int descansos) {
        this.descansos = descansos;
    }
    
    // Métodos de negocio
    public void agregarDerrota() {
        this.derrotas++;
        if (this.derrotas >= 2) {
            this.eliminada = true;
        }
    }
    
    public void agregarRival(String nombreRival) {
        if (!rivalesJugados.contains(nombreRival)) {
            rivalesJugados.add(nombreRival);
        }
    }
    
    public boolean haJugadoContra(String nombreRival) {
        return rivalesJugados.contains(nombreRival);
    }
    
    public boolean puedeJugar() {
        return !eliminada;
    }
    
    @Override
    public String toString() {
        return "Pareja{" +
                "id=" + id +
                ", nombre='" + nombre + '\'' +
                ", derrotas=" + derrotas +
                ", eliminada=" + eliminada +
                '}';
    }
} 