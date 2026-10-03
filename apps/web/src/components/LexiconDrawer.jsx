import React from "react";
import { useApp } from "../context/AppContext";
import { BookOpen, X, Sparkles, Volume2, Bookmark, Check } from "lucide-react";
import { sound } from "../utils/audioFeedback";

export const LexiconDrawer = () => {
  const { lexiconState, closeLexicon, showToast } = useApp();
  const { isOpen, wordData } = lexiconState;

  if (!isOpen || !wordData) return null;

  const handleSaveToVocab = () => {
    sound.playSelect();
    showToast(
      `KOSAKATA DIARSIPKAN: "${wordData.word.toUpperCase()}"`,
      "Tersimpan dalam Arsip Glosarium Pribadi Latveria",
      "info",
    );
  };

  return (
    <div className="lexicon-backdrop" onClick={closeLexicon}>
      <aside
        className="lexicon-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lexicon-word-title"
      >
        {/* Header Archive Metadata */}
        <div className="lexicon-header">
          <div className="lexicon-stamp">
            <span className="lexicon-dot" />
            <span className="font-mono">LATVERIAN ACADEMIC LEXICON // ANNOTATION</span>
          </div>
          <button
            type="button"
            className="lexicon-close-btn"
            onClick={closeLexicon}
            aria-label="Tutup Anotasi Glosarium"
          >
            <X size={18} />
          </button>
        </div>

        {/* Word Hero Section */}
        <div className="lexicon-hero">
          <div className="lexicon-word-row">
            <h2 id="lexicon-word-title" className="lexicon-word font-serif">
              {wordData.word}
            </h2>
            {wordData.phonetic && (
              <span className="lexicon-phonetic font-mono">{wordData.phonetic}</span>
            )}
          </div>
          <div className="lexicon-pos-tag font-mono">
            <span>PART OF SPEECH:</span>
            <span className="pos-badge">{wordData.partOfSpeech.toUpperCase()}</span>
          </div>
        </div>

        {/* Indonesian Definition Card */}
        <div className="lexicon-section definition-box">
          <div className="section-label-mono">INDONESIAN DEFINITION / DEFINISI</div>
          <p className="lexicon-def-text font-serif">{wordData.indonesianDefinition}</p>
        </div>

        {/* Academic Context Sentence */}
        {wordData.academicContext && (
          <div className="lexicon-section">
            <div className="section-label-mono">PASSAGE CONTEXT / KONTEKS KALIMAT</div>
            <div className="lexicon-quote-card">
              <span className="quote-mark">“</span>
              <p className="quote-body">{wordData.academicContext}</p>
            </div>
          </div>
        )}

        {/* Exemplar Usage */}
        {wordData.example && (
          <div className="lexicon-section">
            <div className="section-label-mono">EXEMPLAR USAGE / CONTOH PENGGUNAAN</div>
            <div className="lexicon-example-card">
              <p className="example-text">{wordData.example}</p>
            </div>
          </div>
        )}

        {/* Etymology & Synonyms */}
        {(wordData.etymology || wordData.synonyms) && (
          <div className="lexicon-meta-grid">
            {wordData.etymology && (
              <div className="meta-col">
                <span className="meta-head-mono">ETYMOLOGY</span>
                <span className="meta-content font-serif">{wordData.etymology}</span>
              </div>
            )}
            {wordData.synonyms && (
              <div className="meta-col">
                <span className="meta-head-mono">ACADEMIC SYNONYMS</span>
                <div className="synonym-chips">
                  {wordData.synonyms.map((syn, idx) => (
                    <span key={idx} className="synonym-chip font-mono">
                      {syn}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Bar */}
        <div className="lexicon-actions">
          <button type="button" className="btn-archive-vocab" onClick={handleSaveToVocab}>
            <Bookmark size={15} />
            <span>SIMPAN KE ARSIP KOSAKATA</span>
          </button>
          <button type="button" className="btn-dismiss-vocab" onClick={closeLexicon}>
            <span>KEMBALI KE SOAL</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
