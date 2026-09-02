import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <h1 className="text-2xl">Página no encontrada</h1>
      <Link
        href="/"
        className="rounded-2xl border border-borde px-4 py-2 text-sm hover:bg-papel"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
