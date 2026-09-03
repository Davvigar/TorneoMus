import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import { Banderines } from "@/components/Banderines";
import { CandadoAdmin } from "@/components/CandadoAdmin";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fuente-inter" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--fuente-fraunces",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Mus Villamantilla",
  description: "Torneo de Mus de las fiestas del pueblo",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await esAdmin();
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <header className="border-b border-borde bg-papel">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="text-2xl sm:text-3xl">
              🏆 Mus Villamantilla
            </Link>
            <CandadoAdmin admin={admin} />
          </div>
          <Banderines />
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 pb-8 pt-4 text-center text-sm text-tinta-suave">
          Fiestas de villamantilla · Torneo de Mus
        </footer>
      </body>
    </html>
  );
}
