import { repo } from "@/lib/db/torneo-repo";

async function main() {
  const nombres = ["Los Tigres", "Las Águilas", "Los Lobos", "Las Panteras"];
  const existentes = new Set((await repo.listarParejas()).map((p) => p.nombre));
  for (const nombre of nombres) {
    if (!existentes.has(nombre)) {
      await repo.registrarPareja(nombre);
      console.log(`Insertada pareja de ejemplo: ${nombre}`);
    }
  }
  console.log("Seed completado.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
