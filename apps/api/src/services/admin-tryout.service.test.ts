import { describe, expect, it } from "vitest";
import { removeQuestionFromSection } from "./admin-tryout.service";

describe("removeQuestionFromSection", () => {
  it("rejects invalid UUIDs with HTTPException 400", async () => {
    await expect(removeQuestionFromSection("not-a-uuid", "also-not-a-uuid")).rejects.toThrow(
      "ID section atau soal tidak valid",
    );
  });

  it("rejects valid sectionId with invalid questionId", async () => {
    const validUuid = "11111111-1111-4111-8111-111111111111";
    await expect(removeQuestionFromSection(validUuid, "invalid-question")).rejects.toThrow(
      "ID section atau soal tidak valid",
    );
  });
});
