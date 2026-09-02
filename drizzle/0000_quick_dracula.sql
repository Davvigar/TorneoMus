CREATE TABLE "enfrentamientos" (
	"id" serial PRIMARY KEY NOT NULL,
	"pareja1_id" integer NOT NULL,
	"pareja2_id" integer,
	"ronda" integer NOT NULL,
	"ganador_id" integer,
	"jugado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parejas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"derrotas" integer DEFAULT 0 NOT NULL,
	"eliminada" boolean DEFAULT false NOT NULL,
	"descansos" integer DEFAULT 0 NOT NULL,
	"rivales" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parejas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_pareja1_id_parejas_id_fk" FOREIGN KEY ("pareja1_id") REFERENCES "public"."parejas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_pareja2_id_parejas_id_fk" FOREIGN KEY ("pareja2_id") REFERENCES "public"."parejas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enfrentamientos" ADD CONSTRAINT "enfrentamientos_ganador_id_parejas_id_fk" FOREIGN KEY ("ganador_id") REFERENCES "public"."parejas"("id") ON DELETE no action ON UPDATE no action;