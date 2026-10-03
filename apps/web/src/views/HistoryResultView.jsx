import { useLoaderData, useNavigate } from "react-router";
import { reviewResultToSession } from "../lib/practice-review";
import { PracticeView } from "./PracticeView";

export function HistoryResultView() {
  const result = useLoaderData();
  const navigate = useNavigate();
  return (
    <PracticeView
      key={result.attempt.id}
      reviewSession={reviewResultToSession(result)}
      onReviewExit={() => navigate("/dashboard/riwayat")}
      onReviewStart={() => navigate("/dashboard?tab=practice")}
    />
  );
}
