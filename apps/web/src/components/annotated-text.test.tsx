import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { lexiconAnnotationSchema } from "@latveria/shared";
import { AnnotatedText } from "./annotated-text";

const annotation = lexiconAnnotationSchema.parse({
  id: "00000000-0000-4000-8000-000000000099",
  term: "fried",
  start: 14,
  end: 19,
  definition: "Rusak",
  partOfSpeech: "adjective",
  context: "The phone was fried.",
});

it("annotates only the selected occurrence, preserves text and escapes markup", () => {
  const html = renderToStaticMarkup(
    <AnnotatedText annotations={[annotation]} onOpen={() => {}}>
      The phone was fried. The egg was fried. &lt;
    </AnnotatedText>,
  );
  expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(1);
  expect(html).toContain('aria-label="Arti fried"');
  expect(html).toContain("The egg was fried.");
});

it("leaves text inert when callbacks are absent or ranges are stale", () => {
  expect(
    renderToStaticMarkup(
      <AnnotatedText annotations={[annotation]}>The phone was fried.</AnnotatedText>,
    ),
  ).not.toContain("button");
  expect(
    renderToStaticMarkup(
      <AnnotatedText annotations={[annotation]} onOpen={() => {}}>
        Different text.
      </AnnotatedText>,
    ),
  ).not.toContain("button");
});
