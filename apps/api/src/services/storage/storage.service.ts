import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  ALLOWED_AVATAR_MIME_TYPES,
  AVATAR_MAX_SIZE_BYTES,
  AVATAR_MIN_SIZE_BYTES,
} from "@latveria/shared";
import { getDb } from "../../lib/db";
import { user } from "../../lib/db/auth-schema";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const EXTENSION_MIMES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function getMimeFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot !== -1 ? filename.slice(dot).toLowerCase() : "";
  return EXTENSION_MIMES[ext] || "image/jpeg";
}

export function getS3Client() {
  return new Bun.S3Client({
    endpoint: process.env.S3_ENDPOINT || "http://127.0.0.1:9002",
    region: process.env.S3_REGION || "us-east-1",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "latveria",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "latveria123",
    bucket: process.env.S3_BUCKET || "latveria-avatars",
  });
}

export function extractAvatarKey(url: string): string | null {
  const match = url.match(/(avatar-[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif))/i);
  return match ? match[1] : null;
}

export async function getAvatarStream(filename: string) {
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return null;
  }
  const s3 = getS3Client();
  const file = s3.file(filename);
  if (!(await file.exists())) {
    return null;
  }
  return {
    stream: file.stream(),
    type: file.type || getMimeFromFilename(filename),
  };
}

export async function uploadAvatar(userId: string, file: unknown) {
  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, { message: "File foto profil tidak ditemukan." });
  }

  const mime = file.type.toLowerCase();
  const ext = MIME_EXTENSIONS[mime];
  if (
    !ext ||
    !ALLOWED_AVATAR_MIME_TYPES.includes(mime as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])
  ) {
    throw new HTTPException(400, {
      message: "Format foto tidak didukung. Gunakan format JPG, PNG, WebP, atau GIF.",
    });
  }

  const minBytes = Number(process.env.AVATAR_MIN_SIZE_BYTES || AVATAR_MIN_SIZE_BYTES);
  const maxBytes = Number(process.env.AVATAR_MAX_SIZE_BYTES || AVATAR_MAX_SIZE_BYTES);

  if (file.size < minBytes) {
    throw new HTTPException(400, {
      message: `Ukuran foto terlalu kecil (minimal ${Math.round(minBytes / 1024)} KB).`,
    });
  }

  if (file.size > maxBytes) {
    throw new HTTPException(400, {
      message: `Ukuran foto melebihi batas maksimal ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    });
  }

  const filename = `avatar-${userId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const s3 = getS3Client();
  const buffer = await file.arrayBuffer();
  await s3.file(filename).write(buffer, { type: file.type });

  const publicBase = (process.env.S3_PUBLIC_URL || "/api/avatar").trim().replace(/\/+$/, "");
  const avatarUrl = publicBase.startsWith("http")
    ? `${publicBase}/${filename}`
    : `/api/avatar/${filename}`;

  // Clean up previous avatar if hosted locally
  const [curr] = await getDb().select({ image: user.image }).from(user).where(eq(user.id, userId));
  if (curr?.image) {
    const oldKey = extractAvatarKey(curr.image);
    if (oldKey && oldKey !== filename) {
      try {
        await s3.file(oldKey).delete();
      } catch {
        // Ignore S3 deletion error on cleanup
      }
    }
  }

  await getDb()
    .update(user)
    .set({ image: avatarUrl, updatedAt: new Date() })
    .where(eq(user.id, userId));

  return { success: true, image: avatarUrl };
}

export async function deleteAvatar(userId: string) {
  const [curr] = await getDb().select({ image: user.image }).from(user).where(eq(user.id, userId));
  if (curr?.image) {
    const oldKey = extractAvatarKey(curr.image);
    if (oldKey) {
      try {
        await getS3Client().file(oldKey).delete();
      } catch {
        // Ignore S3 deletion error on cleanup
      }
    }
    await getDb()
      .update(user)
      .set({ image: null, updatedAt: new Date() })
      .where(eq(user.id, userId));
  }
  return { success: true, image: null };
}
