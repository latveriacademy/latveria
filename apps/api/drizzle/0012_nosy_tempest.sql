CREATE TABLE "tryout_package_questions" (
	"package_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tryout_package_questions_unique" UNIQUE("package_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "tryout_package_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tryout_package_questions" ADD CONSTRAINT "tryout_package_questions_package_id_question_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."question_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_package_questions" ADD CONSTRAINT "tryout_package_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;