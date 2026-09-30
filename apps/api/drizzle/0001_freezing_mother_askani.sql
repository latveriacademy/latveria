CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"options" text[] NOT NULL,
	"correct_answer" integer NOT NULL,
	"explanation" text NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "questions_four_options" CHECK (array_ndims("questions"."options") = 1 and cardinality("questions"."options") = 4 and array_position("questions"."options", null) is null),
	CONSTRAINT "questions_valid_answer" CHECK ("questions"."correct_answer" between 0 and 3)
);
--> statement-breakpoint
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
