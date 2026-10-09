export type TryoutHistoryEntry = {
  id: string;
  packageId: string;
  name: string;
  completedAt: string | null;
  score: number | null;
  scoringVersion: string;
  method: "simulation" | "irt-2pl" | "legacy";
  isCompleteUtbk: boolean;
};
