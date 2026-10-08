export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = isFormData
    ? { ...init?.headers }
    : { "Content-Type": "application/json", ...init?.headers };

  const readOnly = ["GET", "HEAD"].includes((init?.method ?? "GET").toUpperCase());
  let response: Response;
  let text: string;
  for (let attempt = 0; ; attempt++) {
    try {
      response = await fetch(`/api${path}`, {
        credentials: "same-origin",
        ...init,
        headers,
      });
      text = await response.text();
      break;
    } catch (error) {
      if (
        init?.signal?.aborted ||
        !(
          error instanceof TypeError ||
          (error instanceof DOMException && error.name === "NetworkError")
        )
      )
        throw error;
      if (readOnly && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw new ApiError(
        0,
        readOnly
          ? "Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi."
          : "Koneksi terputus saat menyimpan. Periksa apakah perubahan sudah tersimpan sebelum mencoba lagi.",
      );
    }
  }
  let data: { error?: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!response.ok)
    throw new ApiError(response.status, data?.error ?? response.statusText ?? "Permintaan gagal.");
  return data as T;
}
