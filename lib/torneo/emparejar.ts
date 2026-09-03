import type { Emparejamiento, Pareja, ResultadoRonda } from "./types";

/** ¿Existe ya un enfrentamiento entre estas dos parejas? (cualquier ronda) */
export type YaSeEnfrentaron = (id1: number, id2: number) => boolean;

type Rng = () => number;

function randInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

function barajar<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Emparejador recursivo con backtracking. Port de
 * TorneoService.intentarEmparejarRecursivo (origin/main):
 * - elige `p1` al azar de las disponibles,
 * - prioriza candidatos que no se han enfrentado a `p1`, ordenados por cuántas
 *   opciones sin repetir le quedarían a `p1` (ascendente, el más restringido
 *   primero),
 * - retrocede si un camino no cierra.
 * `permitirRepetidos=false` en la primera pasada; si no cierra, se reintenta con
 * `true` (repite rival solo cuando es inevitable).
 * Muta `disponibles` durante la búsqueda pero la deja como estaba si devuelve false.
 */
function emparejarRecursivo(
  disponibles: Pareja[],
  salida: Emparejamiento[],
  yaSeEnfrentaron: YaSeEnfrentaron,
  permitirRepetidos: boolean,
  rng: Rng,
): boolean {
  if (disponibles.length < 2) return true;

  const idx = randInt(rng, disponibles.length);
  const [p1] = disponibles.splice(idx, 1);

  const noRepetidos = disponibles.filter((p2) => !yaSeEnfrentaron(p1.id, p2.id));

  if (noRepetidos.length === 0 && !permitirRepetidos) {
    disponibles.splice(idx, 0, p1);
    return false;
  }

  const intentos =
    noRepetidos.length > 0
      ? noRepetidos
      : permitirRepetidos
        ? [...disponibles]
        : [];

  intentos.sort((a, b) => {
    const restA = disponibles.filter(
      (x) => x.id !== a.id && !yaSeEnfrentaron(x.id, p1.id),
    ).length;
    const restB = disponibles.filter(
      (x) => x.id !== b.id && !yaSeEnfrentaron(x.id, p1.id),
    ).length;
    return restA - restB;
  });

  for (const p2 of intentos) {
    const p2idx = disponibles.findIndex((x) => x.id === p2.id);
    disponibles.splice(p2idx, 1);
    salida.push({ pareja1Id: p1.id, pareja2Id: p2.id });
    if (
      emparejarRecursivo(disponibles, salida, yaSeEnfrentaron, permitirRepetidos, rng)
    ) {
      return true;
    }
    salida.pop();
    disponibles.splice(p2idx, 0, p2);
  }

  disponibles.splice(idx, 0, p1);
  return false;
}

/**
 * Genera los emparejamientos de una ronda. No muta la entrada ni toca BD.
 * `parejasActivas` ya viene filtrado a `eliminada = false` por el repo.
 * `yaSeEnfrentaron(a, b)` indica si ya existe un enfrentamiento entre a y b.
 * Devuelve qué pareja descansa (o null) y la lista de emparejamientos; el repo
 * asigna la ronda, inserta y actualiza `descansos`.
 */
export function generarEmparejamientos(
  parejasActivas: Pareja[],
  yaSeEnfrentaron: YaSeEnfrentaron = () => false,
  rng: Rng = Math.random,
): ResultadoRonda {
  if (parejasActivas.length < 2) {
    throw new Error("No hay suficientes parejas activas para generar una ronda");
  }

  let disponibles = barajar(parejasActivas, rng);
  let descansaId: number | null = null;

  if (disponibles.length % 2 === 1) {
    const ordenadas = [...disponibles].sort(
      (a, b) => a.descansos - b.descansos || a.nombre.localeCompare(b.nombre),
    );
    const minDescansos = ordenadas[0].descansos;
    const candidatos = ordenadas.filter((p) => p.descansos === minDescansos);
    const queDescansa = candidatos[randInt(rng, candidatos.length)];
    descansaId = queDescansa.id;
    disponibles = disponibles.filter((p) => p.id !== queDescansa.id);
  }

  const emparejamientos: Emparejamiento[] = [];
  const cola = [...disponibles];
  const ok = emparejarRecursivo(cola, emparejamientos, yaSeEnfrentaron, false, rng);
  if (!ok) {
    emparejamientos.length = 0;
    emparejarRecursivo(
      [...disponibles],
      emparejamientos,
      yaSeEnfrentaron,
      true,
      rng,
    );
  }

  return { descansaId, emparejamientos };
}
