import { useState } from "react";
import type { LexiconAnnotation } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { lookupLexicon } from "../../data/lexiconData";
import styles from "../../components/lexicon.module.css";

export function LexiconEditor({
  prompt,
  annotations,
  onChange,
  disabled,
}: {
  prompt: string;
  annotations: LexiconAnnotation[];
  onChange: (entries: LexiconAnnotation[]) => void;
  disabled: boolean;
}) {
  const [error, setError] = useState("");
  const add = () => {
    const textarea = document.getElementById("prompt");
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const selection = prompt.slice(textarea.selectionStart, textarea.selectionEnd);
    const term = selection.trim();
    const start = textarea.selectionStart + selection.indexOf(term);
    const end = start + term.length;
    if (!term || term.length > 100) {
      setError(
        "Pilih kata atau frasa (maksimal 100 karakter) di kolom Pertanyaan terlebih dahulu.",
      );
      return;
    }
    if (annotations.some((item) => start < item.end && end > item.start)) {
      setError("Teks yang dipilih sudah memiliki anotasi.");
      return;
    }
    const preset = lookupLexicon(term);
    onChange([
      ...annotations,
      {
        id: crypto.randomUUID(),
        term,
        start,
        end,
        definition: preset?.indonesianDefinition || "",
        partOfSpeech: preset?.partOfSpeech || "",
        phonetic: preset?.phonetic || "",
        context: prompt,
        example: preset?.example || "",
        etymology: preset?.etymology || "",
        synonyms: preset?.synonyms ? [...preset.synonyms] : [],
      },
    ]);
    setError("");
  };
  const edit = (id: string, change: Partial<LexiconAnnotation>) =>
    onChange(annotations.map((item) => (item.id === id ? { ...item, ...change } : item)));
  return (
    <div className={styles.editor}>
      <p>
        Pilih kata atau frasa di kolom Pertanyaan, lalu klik Tambah anotasi. Jika teks soal berubah,
        periksa atau buat ulang anotasinya.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || annotations.length >= 20}
        onClick={add}
      >
        Tambah anotasi
      </Button>
      {error && <p role="alert">{error}</p>}
      {annotations.map((item) => (
        <div key={item.id} className={styles.entry}>
          <strong>{item.term}</strong>
          {prompt.slice(item.start, item.end) !== item.term && (
            <p role="alert">Posisi kata berubah. Hapus anotasi ini dan pilih ulang teksnya.</p>
          )}
          <label className={styles.field}>
            Arti sesuai konteks
            <Textarea
              value={item.definition}
              maxLength={500}
              required
              disabled={disabled}
              onChange={(e) => edit(item.id, { definition: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            Kelas kata
            <Input
              value={item.partOfSpeech}
              placeholder="Contoh: noun, verb, adjective, phrase"
              maxLength={50}
              required
              disabled={disabled}
              onChange={(e) => edit(item.id, { partOfSpeech: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            Pelafalan / Fonetik (opsional)
            <Input
              value={item.phonetic ?? ""}
              placeholder="Contoh: /ˈsɒv.rɪn.ti/"
              maxLength={100}
              disabled={disabled}
              onChange={(e) => edit(item.id, { phonetic: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            Kalimat asal
            <Textarea
              value={item.context}
              maxLength={1000}
              required
              disabled={disabled}
              onChange={(e) => edit(item.id, { context: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            Contoh penggunaan (opsional)
            <Textarea
              value={item.example ?? ""}
              maxLength={500}
              disabled={disabled}
              onChange={(e) => edit(item.id, { example: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            Etimologi / Asal kata (opsional)
            <Textarea
              value={item.etymology ?? ""}
              placeholder="Contoh: From Old French souverainete, from Latin super..."
              maxLength={500}
              disabled={disabled}
              onChange={(e) => edit(item.id, { etymology: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            Sinonim (opsional, pisahkan dengan koma)
            <Input
              name={`synonyms-${item.id}`}
              defaultValue={item.synonyms.join(", ")}
              disabled={disabled}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(annotations.filter((entry) => entry.id !== item.id))}
          >
            Hapus anotasi
          </Button>
        </div>
      ))}
    </div>
  );
}
