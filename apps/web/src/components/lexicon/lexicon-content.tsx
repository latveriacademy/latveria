import type { LexiconAnnotation } from "@latveria/shared";
import { enrichAnnotation } from "../../data/lexiconData";

export function LexiconContent({ annotation }: { annotation: LexiconAnnotation }) {
  const data = enrichAnnotation(annotation);
  return (
    <div className="lexicon-content-flow">
      {/* Hero: Word, Phonetic, Part of Speech */}
      <div className="lexicon-hero">
        <div className="lexicon-word-row">
          <h2 className="lexicon-word font-serif">{data.term}</h2>
          {data.phonetic && <span className="lexicon-phonetic font-mono">{data.phonetic}</span>}
        </div>
        <div className="lexicon-pos-tag font-mono">
          <span className="pos-badge">{(data.partOfSpeech || "TERM").toUpperCase()}</span>
          <span>· GLOSARIUM AKADEMIK</span>
        </div>
      </div>

      {/* Definition */}
      <div className="lexicon-section definition-box">
        <div className="section-label-mono">INDONESIAN DEFINITION / DEFINISI</div>
        <p className="lexicon-def-text font-serif">{data.definition}</p>
      </div>

      {/* Context Sentence */}
      {data.context && (
        <div className="lexicon-section">
          <div className="section-label-mono">PASSAGE CONTEXT / KONTEKS KALIMAT</div>
          <div className="lexicon-quote-card">
            <span className="quote-mark">“</span>
            <p className="quote-body font-serif">{data.context}</p>
          </div>
        </div>
      )}

      {/* Exemplar Usage */}
      {data.example && (
        <div className="lexicon-section">
          <div className="section-label-mono">EXEMPLAR USAGE / CONTOH PENGGUNAAN</div>
          <div className="lexicon-example-card">
            <p className="example-text font-serif">{data.example}</p>
          </div>
        </div>
      )}

      {/* Etymology & Synonyms */}
      {(data.etymology || (data.synonyms && data.synonyms.length > 0)) && (
        <div className="lexicon-meta-grid">
          {data.etymology && (
            <div className="meta-col">
              <span className="meta-head-mono">ETYMOLOGY / ASAL KATA</span>
              <span className="meta-content font-serif">{data.etymology}</span>
            </div>
          )}
          {data.synonyms && data.synonyms.length > 0 && (
            <div className="meta-col">
              <span className="meta-head-mono">ACADEMIC SYNONYMS / SINONIM</span>
              <div className="synonym-chips">
                {data.synonyms.map((syn: string, idx: number) => (
                  <span key={idx} className="synonym-chip font-mono">
                    {syn}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
