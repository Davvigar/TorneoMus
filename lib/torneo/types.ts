export interface Pareja {
  id: number;
  nombre: string;
  derrotas: number;
  eliminada: boolean;
  descansos: number;
  rivales: string[];
}

export interface Enfrentamiento {
  id: number;
  pareja1Id: number;
  pareja2Id: number | null;
  ronda: number;
  ganadorId: number | null;
  jugado: boolean;
}

export interface Emparejamiento {
  pareja1Id: number;
  pareja2Id: number;
}

export interface ResultadoRonda {
  descansaId: number | null;
  emparejamientos: Emparejamiento[];
}

export interface EstadoTorneo {
  rondaActual: number;
  totalParejas: number;
  parejasActivasCount: number;
  enfrentamientosActuales: Enfrentamiento[];
  pendientesRondaActual: number;
  puedeGenerarNuevaRonda: boolean;
  torneoTerminado: boolean;
  parejaGanadora: Pareja | null;
}

export interface RefPareja {
  id: number;
  nombre: string;
}

export interface EnfrentamientoVista {
  id: number;
  ronda: number;
  jugado: boolean;
  esDescanso: boolean;
  pareja1: RefPareja;
  pareja2: RefPareja | null;
  ganador: RefPareja | null;
  perdedor: RefPareja | null;
}
