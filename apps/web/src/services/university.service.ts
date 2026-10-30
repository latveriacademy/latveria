export interface UniversityItem {
  id: string;
  name: string;
  code: string;
  city: string;
  region: string;
  type?: string;
  total_majors?: number;
  total_quota?: number;
  total_applicants?: number;
}

export interface MajorItem {
  id: string;
  name: string;
  code?: string;
  degree?: string; // "Sarjana", "Sarjana Terapan", "Diploma Tiga"
  category?: string; // "SAINTEK", "SOSHUM"
  quota?: number;
  applicants?: number;
  passing_grade?: number;
  stat_year?: number;
}

let cachedUniversities: UniversityItem[] | null = null;
const majorsCache = new Map<string, MajorItem[]>();

export const FALLBACK_UNIVERSITIES: UniversityItem[] = [
  {
    id: "006077d9-df05-486d-a020-3192db4967f9",
    name: "Universitas Indonesia",
    code: "UI",
    city: "Kota Depok",
    region: "Jawa Barat",
  },
  {
    id: "08ebcbab-3307-4a61-93b1-9c58222723ea",
    name: "Institut Teknologi Bandung",
    code: "ITB",
    city: "Kota Bandung",
    region: "Jawa Barat",
  },
  {
    id: "ugm-fallback",
    name: "Universitas Gadjah Mada",
    code: "UGM",
    city: "Kab. Sleman",
    region: "D.I. Yogyakarta",
  },
  {
    id: "822a4c27-6287-45c2-9e81-79aeaa1da036",
    name: "Institut Teknologi Sepuluh Nopember",
    code: "ITS",
    city: "Kota Surabaya",
    region: "Jawa Timur",
  },
  {
    id: "74bbf7d2-d70b-4935-8354-16c7ec749fba",
    name: "Universitas Brawijaya",
    code: "UB",
    city: "Kota Malang",
    region: "Jawa Timur",
  },
  {
    id: "6b65ba7f-a003-4d67-806a-78b3fee7444d",
    name: "Universitas Diponegoro",
    code: "UNDIP",
    city: "Kota Semarang",
    region: "Jawa Tengah",
  },
  {
    id: "a07b9e3a-9c16-4c94-9cca-95dee7e9790e",
    name: "Institut Pertanian Bogor",
    code: "IPB",
    city: "Kab. Bogor",
    region: "Jawa Barat",
  },
  {
    id: "29d22c27-e6a0-4aa6-9ded-a2ba3501bb35",
    name: "Universitas Hasanuddin",
    code: "UNHAS",
    city: "Kota Makassar",
    region: "Sulawesi Selatan",
  },
  {
    id: "unpad-fallback",
    name: "Universitas Padjadjaran",
    code: "UNPAD",
    city: "Kab. Sumedang",
    region: "Jawa Barat",
  },
  {
    id: "unair-fallback",
    name: "Universitas Airlangga",
    code: "UNAIR",
    city: "Kota Surabaya",
    region: "Jawa Timur",
  },
];

export function formatDegree(degree?: string): string {
  if (!degree) return "";
  const d = degree.toLowerCase().trim();
  if (
    d.includes("sarjana terapan") ||
    d.includes("diploma empat") ||
    d.includes("d4") ||
    d.includes("d-iv")
  ) {
    return "D4";
  }
  if (d.includes("sarjana") || d.includes("s1") || d.includes("s-1")) {
    return "S1";
  }
  if (d.includes("diploma tiga") || d.includes("d3") || d.includes("d-iii")) {
    return "D3";
  }
  return degree.trim();
}

export function formatTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => {
      // Pertahankan singkatan dalam kurung atau huruf kapital, misal: (STEI-K), TI, IT, DKV
      if (/^\([a-z0-9-]+\)$/i.test(word)) {
        return word.toUpperCase();
      }
      if (/^(ipa|ips|ti|it|dkv|si)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\bDan\b/g, "dan")
    .replace(/\bDi\b/g, "di")
    .replace(/\bKe\b/g, "ke")
    .replace(/\bDari\b/g, "dari")
    .replace(/\bUntuk\b/g, "untuk")
    .replace(/\bPada\b/g, "pada");
}

export function formatTargetPtn(
  universityName: string,
  majorName: string,
  _degree?: string,
): string {
  const cleanUni = universityName.trim();
  const cleanMajor = formatTitleCase(majorName);

  if (!cleanMajor) return cleanUni;
  return `${cleanUni} - ${cleanMajor}`;
}

export async function fetchUniversities(): Promise<UniversityItem[]> {
  if (cachedUniversities && cachedUniversities.length > 0) {
    return cachedUniversities;
  }

  try {
    const [page1Res, page2Res] = await Promise.all([
      fetch("https://api.ibnuhabib.web.id/api/v1/universities?limit=100&offset=0"),
      fetch("https://api.ibnuhabib.web.id/api/v1/universities?limit=100&offset=100"),
    ]);

    if (!page1Res.ok) {
      throw new Error(`Universities API returned status ${page1Res.status}`);
    }

    const page1Data = (await page1Res.json()) as { items?: UniversityItem[] };
    let items = page1Data.items ?? [];

    if (page2Res.ok) {
      const page2Data = (await page2Res.json()) as { items?: UniversityItem[] };
      if (page2Data.items && page2Data.items.length > 0) {
        items = items.concat(page2Data.items);
      }
    }

    if (items.length > 0) {
      cachedUniversities = items;
      return items;
    }
  } catch (error) {
    // shortcut: fallback ke daftar PTN utama jika API offline/terblokir, upgrade jika ada proxy backend
    console.warn("Gagal memuat API universitas, menggunakan fallback:", error);
  }

  return FALLBACK_UNIVERSITIES;
}

export async function fetchMajors(universityId: string): Promise<MajorItem[]> {
  if (!universityId) return [];

  const cached = majorsCache.get(universityId);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.ibnuhabib.web.id/api/v1/majors?university_id=${encodeURIComponent(universityId)}&limit=100&offset=0`,
    );
    if (!res.ok) {
      throw new Error(`Majors API returned status ${res.status}`);
    }

    const data = (await res.json()) as { items?: MajorItem[]; total?: number };
    let items = data.items ?? [];

    if (data.total && data.total > 100) {
      const page2Res = await fetch(
        `https://api.ibnuhabib.web.id/api/v1/majors?university_id=${encodeURIComponent(universityId)}&limit=100&offset=100`,
      );
      if (page2Res.ok) {
        const page2Data = (await page2Res.json()) as { items?: MajorItem[] };
        if (page2Data.items && page2Data.items.length > 0) {
          items = items.concat(page2Data.items);
        }
      }
    }

    majorsCache.set(universityId, items);
    return items;
  } catch (error) {
    console.warn(`Gagal memuat jurusan untuk universitas ${universityId}:`, error);
    return [];
  }
}
