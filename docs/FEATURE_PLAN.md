# Plan Fitur Latveriacademy

Status: Draf untuk diskusi  
Tanggal: 06 October 2026

---

## Fitur Existing

- Landing page, login, dashboard peserta
- Drilling (latihan soal dengan navigator)
- Bank soal admin dengan impor JSON 5 opsi (A-E)
- Manajemen user admin dengan statistik lengkap
- Leaderboard dengan filter subtes/periode
- EXP/level/streak system
- KaTeX dan TikZ rendering (client-side)
- Tema Latveria Obsidian dan Imperial Parchment

## Fitur MVP yang sedang dikerjakan

- Profil pengguna dengan pengaturan
- Battle World (tryout mode)
- Library (materi belajar)

---

## A. Penyempurnaan Tema

**Status**: Item kecil, bukan fitur baru.

### Situasi Saat Ini
Aplikasi sudah memiliki dua tema: Latveria Obsidian (gelap) dan Imperial Parchment (terang) dengan toggle di header.

### Yang Perlu Dicek
1. Apakah tema sudah persiste di akun (database) atau hanya di localStorage?
2. Apakah sudah ada opsi "Ikuti pengaturan sistem"?

### Aksi yang Dibutuhkan
- Jika belum persiste: tambahkan field `theme_preference` di tabel user (`'light' | 'dark' | 'system'`)
- Tambahkan opsi di halaman profil pengguna
- Backend tidak perlu tahu tema; cukup simpan preference

### Estimasi Usaha: Kecil
Tidak ada perubahan API atau logika domain.

---

## B. Battle World vs PvP: Analisis Konflik

### Situasi Saat Ini
Battle World di PLAN.md tertulis sebagai "tryout mode" - simulasi ujian dengan timer dan state sendiri.

### Masalah dengan PvP
PvP juga memerlukan:
- Timer real-time
- Sinkronisasi antar pemain
- State room/lobby
- Ranking terpisah

Ini BUKAN konflik fundamental, tapi bisa membingungkan user jika naming tidak jelas.

### Opsi Struktur Menu

#### Opsi 1: Battle World sebagai Hub Terintegrasi
```
Battle World
├── Tryout (simulasi ujian, timer sendiri, single player)
└── Versus (PvP 1v1 dan multi-player)
    ├── Quick Match (auto-matchmaking)
    ├── Create Room (host dengan kode)
    └── Join Room (gabung dengan kode)
```

**Kelebihan**: Satu入口 untuk semua mode kompetitif.  
**Kekurangan**: Perlu diferenciasi jelas antara Tryout dan Versus.

#### Opsi 2: Pisahkan Menu
```
Latihan → Drilling
Tryout → Battle World (existing)
Competitif → Versus (PvP) - menu baru
```

**Kelebihan**: Role lebih jelas.  
**Kekurangan**: Menu lebih banyak.

#### Opsi 3: Tab di Battle World
Battle World sekarang punya tab:
- Tab "Latihan" (existing drilling)
- Tab "Tryout" (simulasi ujian)
- Tab "Versus" (PvP)

**Kelebihan**: Paling minim perubahan navigasi.  
**Kekurangan**: Bisa crowded di mobile.

### Rekomendasi
**Opsi 3** - Tab di Battle World. Alasannya:
1. Minim perubahan routing
2. User sudah familiar dengan navigasi Battle World
3. PvP dan Tryout bisa share komponen timer/state jika diarsitektur dengan benar
4. Mudah di-expand ke mode lain

---

## C. PvP Mode

**Lihat**: `docs/PVP_DESIGN.md` untuk desain lengkap.

### Ringkasan
- Mode: duel 1v1 dan lobby multi-pemain (2-8 pemain)
- Host membuat room dengan kode atau tautan
- Aturan skor: benar dapat poin + bonus kecepatan; salah = 0
- Rating Elo dengan musim
- Privasi: hanya nama panggilan, tanpa chat teks, opsi blokir

---

## D. Fitur Baru Berprioritas

### D1. Weak Area Tracking + Rekomendasi Latihan

**Tujuan**: Membantu learner fokus ke topik yang lemah.

**Nilai bagi UTBK learner**: Core value proposition - prep yang efektif harus fokus ke weakness.  
**Nilai bagi casual learner**: Less relevant - mungkin prefer random practice.

**Skema Data Baru**:
```typescript
// Tidak perlu tabel baru - reuse data existing
// subtest_stats di user detail sudah punya:
// - slug, name, answered, correct, accuracy
// Weak areas = bottom 3 subtests by accuracy
```

**Endpoint API** (reuse existing):
- `GET /api/admin/users/:id` sudah mengembalikan `weakAreas`
- Perlu endpoint untuk learner:
  - `GET /api/learner/weak-areas` → array of weak subtests with accuracy
  - `GET /api/learner/recommended-packages?subtest=xxx` → paket yang sesuai

**Perubahan UI**:
- Tab baru di dashboard: "Area Lemah"
- Card per subtest dengan accuracy dan trend
- Rekomendasi paket drill yang sesuai
- Quick action: "Mulai latihan [subtest]"

**Dependensi**:
- Memerlukan data `subtest_stats` dari user detail (sudah ada)
- Integrasi dengan katalog paket (sudah ada)
- Titik integrasi: reuse dari `/api/admin/users/:id` weakAreas

**Estimasi Usaha**: Sedang
- Backend: endpoint baru + rekomendasi logic
- Frontend: halaman baru + komponen card

**Risiko**:
- Akurasi weak areas tergantung jumlah data (butuh minimal N soal per subtest)
- Rekomendasi bisa tidak relevan jika bank soal terbatas

**Pengujian**:
- Unit test untuk algoritma weak area
- Verifikasi rekomendasi sesuai subtest yang lemah
- Edge case: user baru dengan sedikit data

**Paralelisme**: Bisa dikerjakan paralel dengan Bookmarks.

---

### D2. Bookmarks + Review Soal Salah

**Tujuan**: User bisa save soal sulit untuk review ulang.

**Nilai bagi UTBK learner**: Spaced repetition untuk soal yang salah.  
**Nilai bagi casual learner**:收藏 favourite questions.

**Skema Data Baru**:
```typescript
// Tabel bookmark_questions
{
  id: string (UUID)
  user_id: string (FK user)
  question_id: string (FK questions)
  bookmarked_at: timestamp
  notes: text (optional, catatan pribadi)
}
```

**Endpoint API**:
```
POST   /api/learner/bookmarks          - Tambah bookmark
DELETE /api/learner/bookmarks/:id      - Hapus bookmark
GET    /api/learner/bookmarks         - Daftar bookmark (paginated)
GET    /api/learner/bookmarks/wrong    - Soal yang pernah dijawab salah (auto-bookmarked)
PUT    /api/learner/bookmarks/:id/notes - Update catatan
```

**Perubahan UI**:
- Tombol bookmark di setiap soal (drilling dan PvP)
- Halaman "Bookmark Saya" dengan filter (subtest, tanggal, ada catatan)
- Auto-import soal salah ke bookmark (dengan toggle)
- Quick review dari bookmark

**Dependensi**:
- Tidak ada dependensi blocking
- Titik integrasi: tombol bookmark di PracticeQuestion component

**Estimasi Usaha**: Sedang
- Backend: CRUD bookmark + query soal salah
- Frontend: tombol bookmark, halaman bookmark, filter

**Risiko**:
- Bookmark banyak bisa bikin UI crowded
- Auto-bookmark wrong answers perlu UX yang jelas

**Pengujian**:
- CRUD operations
- Verify bookmark persists across sessions
- Pagination works correctly

**Paralelisme**: Bisa dikerjakan paralel dengan Weak Area Tracking.

---

### D3. Streak + Reward + Daily Challenge

**Tujuan**: Gamifikasi yang mendorong kebiasaan belajar harian.

**Nilai bagi UTBK learner**: Consistency penting untuk prep yang efektif.  
**Nilai bagi casual learner**: Fun dan engagement.

**Skema Data Baru**:
```typescript
// Tabel user_streak_config
{
  user_id: string (FK, PK)
  current_streak: integer
  longest_streak: integer
  last_practice_date: date
  streak_freeze_count: integer (default 0)
  total_challenges_completed: integer
}

// Tabel daily_challenges
{
  id: string (UUID)
  question_id: string (FK questions)
  date: date (UNIQUE per day)
  theme: string (optional, mis "Weekend Challenge")
}
```

**Endpoint API**:
```
GET  /api/learner/streak           - Info streak saat ini
GET  /api/learner/daily-challenge  - Soal challenge hari ini
POST /api/learner/daily-challenge/:id/answer - Submit jawaban challenge
GET  /api/learner/streak/freeze    - Info freeze yang tersedia
POST /api/learner/streak/freeze    - Gunakan streak freeze
```

**Perubahan UI**:
- Streak counter di header/dashboard
- Notifikasi/prompt untuk daily challenge
- Confetti animation saat streak milestone
- Modal "Pakai Streak Freeze?" saat skip hari

**Streak Rules**:
- Streak naik jika latihan (min 1 soal) dalam 1 hari kalender WIB
- Streak freeze bisa dipakai 1x per minggu (beli dengan XP atau grant bulanan)
- Streak istirahat 1 hari masih aktif jika pakai freeze

**Daily Challenge Rules**:
- 1 soal per hari, berbeda setiap hari
- Bonus XP extra jika menjawab benar
- Streak khusus daily challenge (terpisah dari overall streak)

**Estimasi Usaha**: Besar
- Backend: streak logic, challenge scheduling, freeze system
- Frontend: streak UI, challenge prompt, animations

**Risiko**:
- Streak farming (maintenance yang tidak bermakna)
- Streak freeze bisa jadi abused

**Pengujian**:
- Streak calculation across timezone
- Streak freeze logic
- Daily challenge rotates correctly

---

### D4. Time Analytics

**Tujuan**: Bantu learner improve speed tanpa mengorbankan accuracy.

**Nilai bagi UTBK learner**: UTBK punya time pressure; know your pacing.  
**Nilai bagi casual learner**: Less urgent.

**Skema Data** (reuse existing):
```typescript
// Data sudah ada di practice_answers:
{
  elapsed_ms: integer  // waktu menjawab dalam ms
}

// Statistik yang perlu dihitung:
- Average time per subtest
- Time distribution (histogram)
- Speed vs accuracy correlation
- Recommended pace per subtest
```

**Endpoint API**:
```
GET /api/learner/analytics/time
  Query: ?subtest=xxx&period=30d
  Response: {
    avgTimePerSubtest: { slug, avgMs, questionCount }
    timeDistribution: { bucket, count }[]
    speedAccuracyTrend: { date, avgTime, accuracy }[]
    recommendedPace: { slug, targetSeconds }
  }
```

**Perubahan UI**:
- Tab "Analytics" di dashboard
- Chart time per subtest
- Heatmap waktu vs akurasi
- Tips: "Rata-rata kamu lebih lambat 30 detik di PBM"

**Estimasi Usaha**: Sedang

**Paralelisme**: Independen dari fitur lain.

---

### D5. Spaced Repetition

**Tujuan**: Review soal berdasarkan interval yang optimal.

**Dependensi**: Memerlukan Bookmarks dan log jawaban salah.

**Skema Data** (reuse):
```typescript
// Jika pakai algoritma SM-2 sederhana:
{
  user_id, question_id,
  ease_factor: float (default 2.5)
  interval: integer (days)
  next_review: date
  repetitions: integer
}
```

**Endpoint API**:
```
GET  /api/learner/review/queue     - Soal untuk review hari ini
POST /api/learner/review/:id/done  - Tandai selesai dengan rating (again/hard/good/easy)
```

**Estimasi Usaha**: Sedang (setelah bookmarks ready)

---

### D6. Custom Study Plans

**Tujuan**: Learning path yang dipersonalisasi.

**Dependensi**: Memerlukan Weak Area Tracking.

**Skema Data**:
```typescript
// Tabel study_plans
{
  id, user_id, name, description,
  target_weekly_hours: integer,
  subtest_goals: jsonb // { subtest: target_accuracy }
  created_at, updated_at
}

// Tabel plan_progress
{
  id, plan_id, date, hours_practiced,
  subtest_progress: jsonb
}
```

**Estimasi Usaha**: Besar (setelah weak areas ready)

---

### D7. Group / Class Management

**Tujuan**: Teacher/coach bisa track dan assign work ke student.

**Nilai**: cocok untuk bimbel, guru, atau self-study group.

**Skema Data**:
```typescript
// Tabel groups
{
  id, name, description, owner_id,
  invite_code: string (UNIQUE)
  is_public: boolean
  max_members: integer
}

// Tabel group_members
{
  group_id, user_id, role (owner/admin/member),
  joined_at
}

// Tabel group_assignments
{
  id, group_id, package_id,
  assigned_by, due_date,
  title, description
}
```

**Endpoint API**:
```
POST   /api/learner/groups          - Buat group
GET    /api/learner/groups           - Daftar group saya
POST   /api/learner/groups/:id/join - Gabung via invite code
GET    /api/learner/groups/:id       - Detail + member list
POST   /api/learner/groups/:id/assignments - Buat assignment

// Admin endpoints
GET    /api/admin/groups/:id/analytics - Progress semua member
```

**Privasi** (kritis untuk user < 18 tahun):
- Default: group adalah private
- Invite only via code
- No public profiles
- Teacher bisa lihat progress student, student tidak bisa lihat progress orang lain
- Chat/group messaging: TIDAK ADA (hanya emote preset)

**Estimasi Usaha**: Besar

**Paralelisme**: Independen, bisa dikerjakan tim berbeda.

---

### D8. Progress Sharing

**Tujuan**: Bagikan achievement ke social media.

**Skema Data** (tidak ada tabel baru):
```typescript
// Generate shareable card dari data existing:
{
  level, xp, streak, badges[],
  achievements[]
}
```

**Endpoint API**:
```
GET /api/learner/share-card
  Query: ?style=minimal|detailed
  Response: Data untuk generate image (PNG via og:image style)
```

**Catatan**:
- Card adalah image, bukan live page
- Tidak ada personal data tambahan yang terbuka
- Referral system: see separate section

---

### D9. Referral System

**Tujuan**: Organic growth.

**Skema Data**:
```typescript
// Tabel referrals
{
  referrer_id, referee_id,
  referral_code: string,
  referred_at: timestamp,
  reward_claimed: boolean
}
```

**Anti-penyalahgunaan**:
- Reward hanya sekali per referee
- Reward claimable setelah referee reach level X
- Batasi referral per user (mis. max 10)
- Deteksi pattern curang (multiple accounts, self-referral)

**Estimasi Usaha**: Sedang

---

### D10. PDF Export

**Tujuan**: Export hasil latihan untuk arsip/print.

**Skema Data** (tidak ada tabel baru).

**Endpoint API**:
```
GET /api/learner/results/:id/export?format=pdf
  Response: PDF binary stream
```

**Library**: Gunakan server-side PDF generation (puppeteer, pdfkit, atau similar).

**Catatan Privasi**: PDF tidak boleh mengandung data pribadi yang tidak perlu.

**Estimasi Usaha**: Sedang

---

### D11. Offline PWA

**Tujuan**: Practice bisa dilakukan offline.

**Analisis TikZ**:
```
TikZ rendering: CLIENT-SIDE (React component)
KaTeX rendering: CLIENT-SIDE (browser)

Implikasi:
- Math/TikZ akan work offline jika sudah di-cache
- Butuh service worker untuk cache assets
- API calls tetap butuh network
```

**Yang Bisa Offline**:
- Practice dengan soal yang sudah di-cache
- Review bookmarked questions
- View cached results

**Yang Tidak Bisa Offline**:
- Login (butuh auth)
- Submit jawaban baru
- Daily challenge baru
- Leaderboard

**Estimasi Usaha**: Besar
- Service worker setup
- Cache strategy
- Sync logic

---

### D12. AI Study Assistant

**Dihapus sementara**.

**Alasan**:
- Biaya API yang tidak terprediksi
- Akurasi untuk matematika masih challenging
- Moderasi untuk user < 18 tahun kompleks
- Bisa direvisi nanti jika biaya dan akurasi sudah acceptable

---

## E. Tryout Mode dan Penskoran UTBK

### Sistem Saat Ini
Tryout mode (Battle World) menghitung:
- `correctCount` / `totalCount` = akurasi
- XP dari jawaban benar

### Opsi Penskoran

#### Opsi A: Simple Percentage
```
Score = (correct / total) * 100
```

**Pro**: Mudah dipahami user.  
**Con**: Tidak akurat dengan UTBK real scoring.

#### Opsi B: IRT-like Scoring (Perkiraan)
```
// Tanpa soal sebenarnya, kita pakai estimasi sederhana:
// Soal lebih sulit (lower historical accuracy) = lebih banyak poin
Score = Σ (base_points * difficulty_weight * correctness)
```

**Pro**: Lebih mendekati real scoring.  
**Con**: Butuh data kesulitan soal yang valid.

#### Opsi C: As-is dengan Label Jujur
```
Tampilkan:
- "Latveria Score" (proprietary metric)
- Akurasi % (soal benar / total)
- Ranking relatif

Dengan disclaimer jelas:
"Skor ini adalah perkiraan Latveria, bukan prediksi skor UTBK resmi."
```

**Pro**: Honest, tidak misleading.  
**Con**: User mungkin bingung kenapa berbeda dari ekspektasi.

### Rekomendasi
**Opsi C** - Label jujur dengan disclaimer. Alasannya:
1. Kita tidak punya akses ke sistem IRT UTBK yang sebenarnya
2. Memberi ilusi prediksi yang akurat bisa dangerous
3. User yang serius akan appreciate honesty

---

## F. Paralelisme dan Dependensi

```
Fitur                    Paralel    Dependensi
──────────────────────────────────────────────────
D1. Weak Area Tracking   ✓         -
D2. Bookmarks            ✓         -
D3. Streak+Daily        ✗         -
D4. Time Analytics       ✓         -
D5. Spaced Repetition    ✗         D2 (Bookmarks)
D6. Study Plans         ✗         D1 (Weak Area)
D7. Group Management     ✓         -
D8. Progress Sharing     ✓         -
D9. Referral             ✗         D8
D10. PDF Export         ✓         -
D11. Offline PWA        ✗         -
D12. AI Assistant       -         Dihapus dulu
PvP                     ✗         Perlu desain lengkap
```

**Tim Bisa Bekerja Paralel Pada**:
1. Weak Area Tracking + Bookmarks
2. Time Analytics + PDF Export
3. Group Management (desain schema)
4. Progress Sharing card generation

---

## G. Keputusan yang Sudah Dibuat

| Keputusan | Jawaban |
|-----------|---------|
| Target utama | Learner persiapan UTBK |
| Target sekunder | Casual learner (mekanik kompetitif opsional) |
| Gamifikasi | Penting, tapi dorong kebiasaan belajar benar dan anti-curang |
| Pendekatan | Comprehensive, tim bisa kerja paralel |
| Privasi | Prioritas, terutama untuk user < 18 tahun |
| Voice Input | DIHAPUS dari rencana |
| PvP | Arah utama: 1v1 dan multi-player lobby |

---

## H. Pertanyaan Terbuka

1. **Batas pemain per lobby PvP**: Default 8 pemain sudah tepat, atau perlu lebih/kurang untuk variasi?

2. **Musim PvP**: Apakah ingin seasonal ranking (mingguan/bulanan) sejak awal, atau mulai dengan casual dan tambah season later?

3. **Battle World Navigation**: Apakah opsi tab (Opsi 3 dari analisis) acceptable, atau preferensi lain untuk navigation structure?

4. **Daily Challenge timing**: Midnight WIB atau jam lain (mis. 06:00 WIB) untuk reset daily?

5. **Group Management priority**: Seberapa urgent untuk MVP? Apakah perlu termasuk di fase 1 atau bisa fase 2?

---

## I. Titik Integrasi

| Fitur | Integrates With | How |
|--------|-----------------|-----|
| Weak Area Tracking | Leaderboard, Admin Dashboard | Share subtest_stats computation |
| Bookmarks | PracticeQuestion component | Add bookmark button |
| Bookmarks | Practice Results | Auto-import wrong answers |
| Streak | Practice submit flow | Trigger streak check on submit |
| Daily Challenge | Streak system | Separate challenge streak |
| PvP | Bookmarks | "Soal salah PvP" masuk review |
| PvP | Weak Areas | "Pilihan subtest lemah" untuk PvP |
| Group Management | Leaderboard | Group leaderboards |
