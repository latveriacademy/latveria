import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV standar untuk AES-GCM
const PREFIX = "enc:v1:";

/**
 * Mendapatkan master key 32-byte untuk enkripsi chat at-rest.
 * Otomatis fallback ke BETTER_AUTH_SECRET jika CHAT_ENCRYPTION_KEY tidak disetel.
 */
function getMasterKey(): Buffer {
  const secret =
    process.env.CHAT_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET ||
    "latveria-chat-at-rest-secret-key-fallback";
  return createHash("sha256").update(secret).digest();
}

/**
 * Menurunkan key 32-byte unik per percakapan (userA <-> userB) menggunakan HKDF.
 * Urutan userA dan userB dinormalisasi secara leksikografis sehingga simetris untuk kedua belah pihak.
 */
function deriveConversationKey(userA: string, userB: string): Buffer {
  const salt = [userA, userB].sort().join(":");
  return Buffer.from(hkdfSync("sha256", getMasterKey(), salt, "latveria-chat-dm-v1", 32));
}

/**
 * Enkripsi pesan teks obrolan DM untuk penyimpanan at-rest di database.
 * Format: enc:v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 */
export function encryptDmText(plaintext: string, userA: string, userB: string): string {
  if (!plaintext) return plaintext;
  const key = deriveConversationKey(userA, userB);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/**
 * Dekripsi pesan obrolan DM dari penyimpanan at-rest.
 * Jika pesan tidak menggunakan prefix enc:v1: (pesan plaintext warisan), dikembalikan apa adanya.
 */
export function decryptDmText(text: string, userA: string, userB: string): string {
  if (!text || !text.startsWith(PREFIX)) return text;

  try {
    const parts = text.slice(PREFIX.length).split(":");
    if (parts.length !== 3) return text;
    const [ivB64, tagB64, cipherB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ciphertext = Buffer.from(cipherB64, "base64");

    const key = deriveConversationKey(userA, userB);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (err) {
    // shortcut: error dekripsi mengembalikan penanda aman daripada melempar pengecualian tak tertangani
    console.warn("[ChatCrypto] Gagal mendekripsi pesan DM:", err);
    return "[Pesan terenkripsi tidak dapat didekripsi]";
  }
}

export function encryptDmTextOptional(
  text: string | null | undefined,
  userA: string,
  userB: string,
): string | null | undefined {
  if (text == null) return text;
  return encryptDmText(text, userA, userB);
}

export function decryptDmTextOptional(
  text: string | null | undefined,
  userA: string,
  userB: string,
): string | null | undefined {
  if (text == null) return text;
  return decryptDmText(text, userA, userB);
}
