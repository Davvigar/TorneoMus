package torneomus.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "enfrentamientos")
public class Enfrentamiento {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "pareja1_id", nullable = false)
    private Pareja pareja1;
    
    @ManyToOne
    @JoinColumn(name = "pareja2_id", nullable = true)
    private Pareja pareja2;
    
    @Column(nullable = false)
    private int ronda;
    
    @ManyToOne
    @JoinColumn(name = "ganador_id")
    private Pareja ganador;
    
    @Column(nullable = false)
    private boolean jugado = false;
    
    // Constructores
    public Enfrentamiento() {}
    
    public Enfrentamiento(Pareja pareja1, Pareja pareja2, int ronda) {
        this.pareja1 = pareja1;
        this.pareja2 = pareja2;
        this.ronda = ronda;
    }
    
    // Getters y Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Pareja getPareja1() {
        return pareja1;
    }
    
    public void setPareja1(Pareja pareja1) {
        this.pareja1 = pareja1;
    }
    
    public Pareja getPareja2() {
        return pareja2;
    }
    
    public void setPareja2(Pareja pareja2) {
        this.pareja2 = pareja2;
    }
    
    public int getRonda() {
        return ronda;
    }
    
    public void setRonda(int ronda) {
        this.ronda = ronda;
    }
    
    public Pareja getGanador() {
        return ganador;
    }
    
    public void setGanador(Pareja ganador) {
        this.ganador = ganador;
        this.jugado = true;
    }
    
    public boolean isJugado() {
        return jugado;
    }
    
    public void setJugado(boolean jugado) {
        this.jugado = jugado;
    }
    
    // Métodos de negocio
    public boolean isDescanso() {
        if (this.pareja1 == null) return false;
        if (this.pareja2 == null) return true;
        if (this.pareja1.getId() != null && this.pareja2.getId() != null) {
            return this.pareja1.getId().equals(this.pareja2.getId());
        }
        return this.pareja1.equals(this.pareja2);
    }
    
    public Pareja getPerdedor() {
        if (isDescanso()) {
            return null;
        }
        if (!jugado || ganador == null) {
            return null;
        }
        return ganador.equals(pareja1) ? pareja2 : pareja1;
    }
    
    public boolean involucraPareja(Pareja pareja) {
        if (pareja == null) return false;
        if (pareja1 != null && pareja1.equals(pareja)) return true;
        return pareja2 != null && pareja2.equals(pareja);
    }
    
    @Override
    public String toString() {
        return "Enfrentamiento{" +
                "id=" + id +
                ", pareja1=" + (pareja1 != null ? pareja1.getNombre() : "-") +
                ", pareja2=" + (pareja2 != null ? pareja2.getNombre() : "DESCANSO") +
                ", ronda=" + ronda +
                ", ganador=" + (ganador != null ? ganador.getNombre() : (isDescanso() ? "No aplica" : "No jugado")) +
                '}';
    }
} 