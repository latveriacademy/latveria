export interface ParsedUserInput {
  email: string;
  password: string;
  name?: string;
  role?: "user" | "admin";
}

export function parseCsv(content: string): { valid: ParsedUserInput[]; errors: string[] } {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { valid: [], errors: ["File CSV kosong."] };

  const header = lines[0].split(",").map((c) => c.trim().toLowerCase().replaceAll('"', ""));
  const emailIdx = header.indexOf("email");
  const passwordIdx = header.indexOf("password");
  const nameIdx = header.findIndex((c) => c === "name" || c === "nama");
  const roleIdx = header.indexOf("role");

  if (emailIdx === -1 || passwordIdx === -1) {
    return {
      valid: [],
      errors: ["Header CSV wajib memiliki kolom 'email' dan 'password'."],
    };
  }

  const valid: ParsedUserInput[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());

    const email = row[emailIdx]?.replaceAll('"', "").trim().toLowerCase();
    const password = row[passwordIdx]?.replaceAll('"', "");
    const name = nameIdx !== -1 ? row[nameIdx]?.replaceAll('"', "").trim() : undefined;
    const rawRole =
      roleIdx !== -1 ? row[roleIdx]?.replaceAll('"', "").trim().toLowerCase() : undefined;
    const role: "user" | "admin" = rawRole === "admin" ? "admin" : "user";

    if (!email || !password) {
      errors.push(`Baris ${i + 1}: Email atau password kosong.`);
      continue;
    }
    if (!email.includes("@") || !email.includes(".")) {
      errors.push(`Baris ${i + 1} (${email}): Format email tidak valid.`);
      continue;
    }
    if (password.length < 8) {
      errors.push(`Baris ${i + 1} (${email}): Password minimal 8 karakter.`);
      continue;
    }

    valid.push({ email, password, name: name || undefined, role });
  }

  return { valid, errors };
}

export function parseJson(content: string): { valid: ParsedUserInput[]; errors: string[] } {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      return { valid: [], errors: ["JSON harus berupa array of objects."] };
    }

    const valid: ParsedUserInput[] = [];
    const errors: string[] = [];

    data.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        errors.push(`Item #${index + 1}: Bukan objek valid.`);
        return;
      }
      const email = String(item.email || "")
        .trim()
        .toLowerCase();
      const password = String(item.password || "");
      const name = item.name ? String(item.name).trim() : undefined;
      const role: "user" | "admin" = item.role === "admin" ? "admin" : "user";

      if (!email || !password) {
        errors.push(`Item #${index + 1}: Email atau password kosong.`);
        return;
      }
      if (!email.includes("@") || !email.includes(".")) {
        errors.push(`Item #${index + 1} (${email}): Format email tidak valid.`);
        return;
      }
      if (password.length < 8) {
        errors.push(`Item #${index + 1} (${email}): Password minimal 8 karakter.`);
        return;
      }

      valid.push({ email, password, name: name || undefined, role });
    });

    return { valid, errors };
  } catch (err) {
    return {
      valid: [],
      errors: [err instanceof Error ? `JSON tidak valid: ${err.message}` : "Format JSON salah."],
    };
  }
}
