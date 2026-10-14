import { Button } from "../../../components/ui/button";
import { tikzExamples } from "../../../lib/math/tikz-examples";
import styles from "../admin.module.css";

export function TikzHelp({
  prompt,
  onApply,
  disabled,
  diagramError,
  setDiagramError,
}: {
  prompt: string;
  onApply: (next: string) => void;
  disabled?: boolean;
  diagramError: string;
  setDiagramError: (err: string) => void;
}) {
  return (
    <details className={styles.diagramHelp}>
      <summary>Tambahkan diagram geometri</summary>
      <p>
        TikZ dasar mendukung garis, poligon, rectangle, lingkaran, elips, dan label LaTeX. Koordinat
        (x,y,z) diproyeksikan untuk bangun ruang.
      </p>
      <div className={styles.formActions}>
        {tikzExamples.map((example) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            key={example.name}
            disabled={disabled}
            onClick={() => {
              const next = prompt.trim() ? `${prompt}\n\n${example.source}` : example.source;
              if (next.length > 5000) {
                setDiagramError(
                  "Contoh ini melebihi batas 5.000 karakter pertanyaan. Ringkas teks atau diagram sebelum menambahkannya.",
                );
                return;
              }
              onApply(next);
              setDiagramError("");
            }}
          >
            Tambahkan {example.name.toLowerCase()}
          </Button>
        ))}
      </div>
      <p>
        Ubah koordinat dan label di teks pertanyaan. Gunakan <code>% alt: deskripsi bangun</code>{" "}
        untuk membantu pembaca layar. Sintaks TikZ lain belum didukung.
      </p>
      {diagramError && <p role="alert">{diagramError}</p>}
    </details>
  );
}
