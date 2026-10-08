import { z } from "zod";
import type { IrtParameter } from "./irt";
export const irtArtifactSchema = z
  .object({
    datasetId: z.uuid(),
    datasetHash: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.string().trim().min(1).max(100),
    model: z.literal("2PL"),
    source: z.literal("mirt"),
    sourceVersion: z.string().trim().min(1).max(50),
    parameters: z
      .array(
        z.object({
          revisionId: z.uuid(),
          a: z.number().min(0.25).max(3),
          b: z.number().min(-4).max(4),
        }),
      )
      .min(10)
      .max(1000),
    diagnostics: z.object({
      converged: z.literal(true),
      rmsea: z.number().min(0).max(0.1),
      reliability: z.number().min(0.6).max(1),
    }),
  })
  .strict()
  .refine(
    (artifact) =>
      new Set(artifact.parameters.map((p) => p.revisionId)).size === artifact.parameters.length,
    "Versi soal tidak boleh berulang.",
  );
export type IrtDatasetItem = { revisionId: string; responseCount: number; correctRate: number };
export type IrtDiagnostics = z.infer<typeof irtArtifactSchema>["diagnostics"];
export type IrtCalibrationItem = {
  id: string;
  topicSlug: string;
  version: string;
  active: boolean;
  sampleSize: number;
  createdAt: string;
  diagnostics: IrtDiagnostics;
  parameters: IrtParameter[];
  sourceVersion: string;
};
