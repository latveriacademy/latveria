ALTER TABLE "chat_messages" ADD COLUMN "media_url" text;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "is_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;