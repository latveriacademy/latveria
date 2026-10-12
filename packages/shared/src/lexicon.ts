import { z } from "zod";

const environmentPatterns = [
  "tikzpicture",
  "circuitikz",
  "forest",
  "pspicture",
  "axis",
  "tabular",
  "array",
].map((name) => String.raw`\\begin\{${name}\}[\s\S]*?(?:\\end\{${name}\}|$)`);

// Keep exactly one capture: split callers use alternating text/source ranges.
export const mathSourcePattern = new RegExp(
  String.raw`(<table\b[\s\S]*?<\/table>|${environmentPatterns.join("|")}|\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\chemfig\{[\s\S]*?\}|\$(?!\s)[^$\n]+?\$)`,
  "gi",
);

export const lexiconAnnotationInputSchema = z.object({
  id: z.string().uuid().optional(),
  term: z.string().trim().min(1).max(100),
  start: z.number().int().min(0).max(10000).optional(),
  end: z.number().int().min(1).max(10000).optional(),
  definition: z.string().trim().min(1).max(500),
  partOfSpeech: z.string().trim().min(1).max(50),
  phonetic: z.string().trim().max(100).default(""),
  context: z.string().trim().max(10000).default(""),
  example: z.string().trim().max(1000).default(""),
  etymology: z.string().trim().max(1000).default(""),
  synonyms: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
});

export const lexiconAnnotationSchema = z
  .object({
    id: z.uuid(),
    term: z.string().trim().min(1).max(100),
    start: z.number().int().min(0).max(10000),
    end: z.number().int().min(1).max(10000),
    definition: z.string().trim().min(1).max(500),
    partOfSpeech: z.string().trim().min(1).max(50),
    phonetic: z.string().trim().max(100).default(""),
    context: z.string().trim().min(1).max(10000),
    example: z.string().trim().max(1000).default(""),
    etymology: z.string().trim().max(1000).default(""),
    synonyms: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  })
  .strict();
export type LexiconAnnotation = z.infer<typeof lexiconAnnotationSchema>;

export function resolveLexiconAnnotations(
  prompt: string,
  annotations: z.input<typeof lexiconAnnotationInputSchema>[],
): LexiconAnnotation[] {
  let searchPos = 0;
  return annotations.map((raw) => {
    let start = raw.start ?? -1;
    let end = raw.end ?? -1;
    if (start === -1 || end === -1) {
      const idx = prompt.indexOf(raw.term, searchPos);
      if (idx !== -1) {
        start = idx;
        end = idx + raw.term.length;
        searchPos = end;
      } else {
        const anyIdx = prompt.indexOf(raw.term);
        if (anyIdx !== -1) {
          start = anyIdx;
          end = anyIdx + raw.term.length;
        }
      }
    }
    return {
      id: raw.id || crypto.randomUUID(),
      term: raw.term,
      start,
      end,
      definition: raw.definition,
      partOfSpeech: raw.partOfSpeech,
      phonetic: raw.phonetic ?? "",
      context: raw.context || prompt,
      example: raw.example ?? "",
      etymology: raw.etymology ?? "",
      synonyms: Array.isArray(raw.synonyms) ? raw.synonyms : [],
    };
  });
}

export function validLexiconRanges(prompt: string, annotations: LexiconAnnotation[]) {
  let offset = 0;
  const plainRanges = prompt.split(mathSourcePattern).flatMap((part, index) => {
    const start = offset;
    offset += part.length;
    return index % 2 === 0 ? [{ start, end: offset }] : [];
  });
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  return (
    new Set(annotations.map((item) => item.id)).size === annotations.length &&
    sorted.every(
      (item, index) =>
        item.start < item.end &&
        prompt.slice(item.start, item.end) === item.term &&
        plainRanges.some((range) => item.start >= range.start && item.end <= range.end) &&
        (index === 0 || sorted[index - 1].end <= item.start),
    )
  );
}

export const saveVocabularySchema = z
  .object({ questionId: z.uuid(), annotationId: z.uuid() })
  .strict();
export type VocabularyEntry = {
  id: string;
  questionId: string | null;
  annotationId: string;
  annotation: LexiconAnnotation;
  source: string;
  savedAt: string;
};
