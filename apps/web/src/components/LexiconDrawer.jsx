import React from "react";
import { useApp } from "../context/AppContext";
import { Bookmark } from "lucide-react";
import { sound } from "../utils/audioFeedback";
import { AppDialog } from "./app-dialog";

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
    <AppDialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) closeLexicon();
      }}
      title={wordData.word}
      description={`${wordData.phonetic ? `${wordData.phonetic} · ` : ""}${wordData.partOfSpeech}`}
      className="lexicon-drawer-panel"
      style={{ left: "auto", right: 0, top: 0, transform: "none", maxHeight: "100dvh" }}
    >
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
    </AppDialog>
  );
};
