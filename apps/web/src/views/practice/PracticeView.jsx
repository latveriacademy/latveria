import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { PracticeSession } from "../../components/practice/practice-session";
import { PracticeCatalog } from "./PracticeCatalog";

export function PracticeView({ reviewSession, onReviewExit, onReviewStart } = {}) {
  const { activeSession, setActiveSession, exitPractice } = useApp();
  const [reviewState, setReviewState] = useState(reviewSession ?? null);
  const session = reviewSession ? reviewState : activeSession;
  if (session)
    return (
      <PracticeSession
        activeSession={session}
        setActiveSession={reviewSession ? setReviewState : setActiveSession}
        exitPractice={reviewSession ? onReviewExit : exitPractice}
        reviewSession={reviewSession}
        onReviewStart={onReviewStart}
      />
    );
  return (
    <div className="latveria-view-container practice-catalog-view">
      <PracticeCatalog />
    </div>
  );
}
