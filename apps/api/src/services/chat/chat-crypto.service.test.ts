import { beforeEach, describe, expect, it } from "vitest";
import {
  decryptDmText,
  decryptDmTextOptional,
  encryptDmText,
  encryptDmTextOptional,
} from "./chat-crypto.service";

describe("Chat Crypto Service (at-rest AES-256-GCM)", () => {
  const user1 = "usr_alpha_123";
  const user2 = "usr_bravo_456";

  beforeEach(() => {
    process.env.CHAT_ENCRYPTION_KEY = "test-secret-key-32-chars-minimum-latveria!!";
  });

  it("encrypts and decrypts text symmetrically between two users", () => {
    const original = "Halo, ini pesan rahasia strategi UTBK!";
    const encrypted = encryptDmText(original, user1, user2);

    expect(encrypted).not.toBe(original);
    expect(encrypted.startsWith("enc:v1:")).toBe(true);

    // Dekripsi dari arah user1 -> user2
    const decrypted1 = decryptDmText(encrypted, user1, user2);
    expect(decrypted1).toBe(original);

    // Dekripsi dari arah user2 -> user1 (simetris)
    const decrypted2 = decryptDmText(encrypted, user2, user1);
    expect(decrypted2).toBe(original);
  });

  it("produces distinct ciphertexts for the same plaintext due to random IV", () => {
    const msg = "Sama persis";
    const enc1 = encryptDmText(msg, user1, user2);
    const enc2 = encryptDmText(msg, user1, user2);

    expect(enc1).not.toBe(enc2);
    expect(decryptDmText(enc1, user1, user2)).toBe(msg);
    expect(decryptDmText(enc2, user1, user2)).toBe(msg);
  });

  it("cannot be decrypted with a different counterpart (isolated keys)", () => {
    const eavesdropper = "usr_charlie_789";
    const original = "Pesan privat antara user1 dan user2";
    const encrypted = encryptDmText(original, user1, user2);

    const decryptedByThirdParty = decryptDmText(encrypted, user1, eavesdropper);
    expect(decryptedByThirdParty).toBe("[Pesan terenkripsi tidak dapat didekripsi]");
  });

  it("returns legacy plaintext as-is without errors (backwards compatibility)", () => {
    const legacyPlaintext = "Pesan lama sebelum sistem enkripsi aktif";
    expect(decryptDmText(legacyPlaintext, user1, user2)).toBe(legacyPlaintext);
  });

  it("handles empty strings and null/undefined values safely", () => {
    expect(encryptDmText("", user1, user2)).toBe("");
    expect(decryptDmText("", user1, user2)).toBe("");

    expect(encryptDmTextOptional(null, user1, user2)).toBeNull();
    expect(encryptDmTextOptional(undefined, user1, user2)).toBeUndefined();
    expect(decryptDmTextOptional(null, user1, user2)).toBeNull();
    expect(decryptDmTextOptional(undefined, user1, user2)).toBeUndefined();
  });

  it("handles tampered ciphertext gracefully without throwing", () => {
    const encrypted = encryptDmText("Pesan rahasia", user1, user2);
    const parts = encrypted.split(":");
    // Rusak ciphertext
    parts[4] = Buffer.from("tampered-data-corrupted").toString("base64");
    const tampered = parts.join(":");

    const result = decryptDmText(tampered, user1, user2);
    expect(result).toBe("[Pesan terenkripsi tidak dapat didekripsi]");
  });
});
