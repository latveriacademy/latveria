import { Fragment } from "react";
import type { LexiconAnnotation } from "@latveria/shared";
import { MathText } from "../math/math-text";
import styles from "./lexicon.module.css";

export function AnnotatedText({
  children,
  annotations = [],
  onOpen,
}: {
  children: string;
  annotations?: LexiconAnnotation[];
  onOpen?: (annotation: LexiconAnnotation) => void;
}) {
  return (
    <MathText
      renderText={
        onOpen
          ? (text, offset) => {
              const entries = annotations
                .filter(
                  (item) =>
                    item.start >= offset &&
                    item.end <= offset + text.length &&
                    children.slice(item.start, item.end) === item.term,
                )
                .sort((a, b) => a.start - b.start);
              let cursor = 0;
              const parts = entries.map((item) => {
                const start = item.start - offset;
                const before = text.slice(cursor, start);
                cursor = item.end - offset;
                return (
                  <Fragment key={item.id}>
                    {before}
                    <button
                      type="button"
                      className={styles.word}
                      aria-label={`Arti ${item.term}`}
                      aria-haspopup="dialog"
                      onClick={() => onOpen(item)}
                    >
                      {item.term}
                    </button>
                  </Fragment>
                );
              });
              return (
                <>
                  {parts}
                  {text.slice(cursor)}
                </>
              );
            }
          : undefined
      }
    >
      {children}
    </MathText>
  );
}
