import { z } from "zod";

export const mathSourcePattern =
  /(\\begin\{tikzpicture\}[\s\S]*?(?:\\end\{tikzpicture\}|$)|\$\$[\s\S]+?\$\$|\$(?!\s)[^$\n]+?\$)/g;

export const lexiconAnnotationSchema = z
  .object({
    id: z.uuid(),
    term: z.string().trim().min(1).max(100),
    start: z.number().int().min(0).max(1000),
    end: z.number().int().min(1).max(1000),
    definition: z.string().trim().min(1).max(500),
    partOfSpeech: z.string().trim().min(1).max(50),
    phonetic: z.string().trim().max(100).default(""),
    context: z.string().trim().min(1).max(1000),
    example: z.string().trim().max(500).default(""),
    etymology: z.string().trim().max(500).default(""),
    synonyms: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  })
  .strict();
export type LexiconAnnotation = z.infer<typeof lexiconAnnotationSchema>;

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
