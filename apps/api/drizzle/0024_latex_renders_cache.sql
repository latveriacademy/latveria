CREATE TABLE IF NOT EXISTS "latex_renders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" text NOT NULL,
	"source" text NOT NULL,
	"compiler" text DEFAULT 'pdflatex' NOT NULL,
	"packages" text DEFAULT '[]' NOT NULL,
	"svg" text NOT NULL,
	"width" text,
	"height" text,
	"compile_time_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "latex_renders_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
ALTER TABLE "latex_renders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "latex_renders_hash_idx" ON "latex_renders" USING btree ("hash");
