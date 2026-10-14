import { useLoaderData, useNavigate } from "react-router";
import { reviewResultToSession } from "../../lib/practice/practice-review";
import { PracticeView } from "../practice/PracticeView";

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
