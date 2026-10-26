CREATE TABLE IF NOT EXISTS "library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'article' NOT NULL,
	"subtest_slug" text,
	"content" text,
	"url" text,
	"thumbnail_url" text,
	"metadata" jsonb,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"author_id" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_items_slug_unique" UNIQUE("slug"),
	CONSTRAINT "library_items_author_id_fk" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL
);
--> statement-breakpoint
ALTER TABLE "library_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_items_type_idx" ON "library_items" ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_items_subtest_idx" ON "library_items" ("subtest_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_items_published_idx" ON "library_items" ("is_published");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_items_created_idx" ON "library_items" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_items_title_idx" ON "library_items" ("title");
