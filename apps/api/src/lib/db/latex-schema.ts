import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const latexRenders = pgTable("latex_renders", {
  id: uuid("id").defaultRandom().primaryKey(),
  hash: text("hash").notNull().unique(),
  source: text("source").notNull(),
  compiler: text("compiler").notNull().default("pdflatex"),
  packages: text("packages").notNull().default("[]"),
  svg: text("svg").notNull(),
  width: text("width"),
  height: text("height"),
  compileTimeMs: integer("compile_time_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();
