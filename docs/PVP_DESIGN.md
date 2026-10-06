# PvP Mode - Desain Teknis

Status: Draf untuk diskusi  
Tanggal: 06 October 2026  
Referensi: `docs/FEATURE_PLAN.md`

---

## Ringkasan Eksekutif

Mode PvP memungkinkan learner bersaing secara real-time menjawab soal. Dua mode: **duel (1v1)** dan **lobby multi-pemain (2-8)**. Pemain berebut poin berdasarkan kecepatan dan akurasi; jawaban benar yang tercepat mendapat poin tertinggi. Sistem rating Elo musiman dengan hadiah XP.

---

## 1. Stack Teknis

### 1.1 Kondisi Saat Ini

```
Frontend:  React + Vite + React Router
Backend:   Hono + Better Auth + Drizzle ORM
Database:  PostgreSQL (Supabase)
Runtime:   Bun 1.3.14
Real-time: BELUM ADA
```

### 1.2 Opsi Real-Time

| Opsi | Deskripsi | Kelebihan | Kekurangan |
|------|-----------|-----------|-------------|
| **A. Hono WebSocket** | `@hono/ws` experimental | Satu codebase Hono, seamless integration | Experimental, dokumentasi terbatas |
| **B. Dedicated WS Server** | Server terpisah (ws library) | Stabil, production-ready | Infra baru, perlu proxy/coordination |
| **C. SSE + Polling** | Server-Sent Events untuk push | Mudah diimplementasi | Tidak true bidirectional, latency lebih tinggi |
| **D. Long Polling** | Polling berkala | Kompatibel everywhere | Boros resource, latency tinggi |

**Rekomendasi**: **Opsi A - Hono WebSocket**

Alasan:
1. Minim perubahan infra - tetap satu server
2. Integrasi dengan auth yang ada lebih mudah
3. Bun runtime sudah support WebSocket
4. Experimental sudah cukup stabil untuk use case ini

### 1.3 Redis vs In-Memory

| Penyimpanan | Kapan | Kelebihan | Kekurangan |
|-------------|-------|-----------|-------------|
| **In-Memory** | < 100 concurrent players | Simpel, tidak perlu infra baru | Lost on restart, tidak bisa scale horizontal |
| **Redis** | > 100 concurrent players | Persistent, scalable | Infra baru, complexity |

**Rekomendasi MVP**: In-Memory dengan persist critical data ke PostgreSQL

Untuk MVP, state room di-memory cukup karena:
- Target pertama: user count rendah
- Jika server restart, room yang aktif akan terminate
- Data final (hasil match) akan tetap tersimpan di PostgreSQL

---

## 2. Mode dan Alur Pertandingan

### 2.1 Mode

| Mode | Pemain | Keterangan |
|------|--------|-------------|
| **Duel** | 2 | Quick match 1v1 |
| **Lobby** | 2-8 | Multi-player, configurable |

### 2.2 Lobby Settings

| Setting | Default | Opsi | Host Configurable |
|---------|---------|------|-------------------|
| Subtes | Campuran | Single subtes, Campuran | Ya |
| Jumlah Soal | 10 | 5, 10, 15 | Ya |
| Waktu/Soal | Auto | Auto, 30s, 45s, 60s | Ya (dalam batas) |
| Max Pemain | 8 | 2-8 | Ya |
| Visibilitas | Privat | Privat, Publik | Ya |
| Ranked | No | Yes/No | Ya (host only) |

### 2.3 Waktu Per Soal Otomatis

**Masalah**: Soal PU/PBM (bacaan panjang) butuh waktu lebih dari soal matematika singkat.

**Solusi**: Waktu berdasarkan kategori subtes

| Subtes | Waktu Default | Batas Min | Batas Max |
|--------|--------------|-----------|-----------|
| PU | 60s | 45s | 90s |
| PPU | 45s | 30s | 60s |
| PBM | 75s | 60s | 120s |
| PK | 30s | 20s | 45s |
| BI | 45s | 30s | 60s |
| EN | 45s | 30s | 60s |
| PM | 45s | 30s | 60s |
| Campuran | 45s | 30s | 90s |

Host dapat pilih waktu dalam rentang Min-Max. Untuk "Campuran", pakai waktu subtes yang paling panjang di batch soal.

### 2.4 Alur Pertandingan

```
LOBBY (wait for players, ready check)
    ↓ (all ready or host starts)
COUNTDOWN (3-5 detik, sync state)
    ↓
[ ROUND_START (timer mulai)
    → PLAYERS ANSWER (max 1 answer per player)
    → TIMER EXPIRES OR ALL ANSWERED
  ROUND_END (reveal answer)
  REVEAL (3-5 detik, show points, standings)
] × N soal
    ↓
FINAL_RESULTS (peringkat, XP reward)
```

### 2.5 Sinkronisasi Render

**Masalah**: Klien dengan device lambat (parsing KaTeX/TikZ) bisa disadvantage.

**Solusi**:
1. Server kirim soal + metadata ("needsRender": true/false)
2. Klien kirim "READY" setelah soal terender
3. Server tunggu semua klien READY (max 5 detik)
4. Jika timeout, timer mulai dengan soalnya apa adanya

---

## 3. Aturan Skor

### 3.1 Rumus Poin

**Paramater**:
- T = waktu soal dalam detik (dari section 2.3)
- t = waktu pemain menjawab dalam detik (0 ≤ t ≤ T)
- basePoints = 50 (konstanta)
- speedBonusMax = 50 (bonus maksimum)
- firstCorrectBonus = 10

**Rumus**:
```
if jawaban == BENAR:
    speedRatio = (T - t) / T
    speedBonus = speedBonusMax * speedRatio
    points = basePoints + floor(speedBonus)
    if isFirstCorrect:
        points += firstCorrectBonus
else:
    points = 0
```

**Contoh Kalkulasi** (T = 45 detik):

| Waktu Jawab | Benar? | First? | Poin |
|-------------|--------|---------|------|
| 0s | Ya | Ya | 110 |
| 0s | Ya | Tidak | 100 |
| 10s | Ya | Ya | 93 |
| 22.5s | Ya | Ya | 75 |
| 45s (deadline) | Ya | Ya | 60 |
| 15s | Salah | - | 0 |
| - | Timeout | - | 0 |

### 3.2 Mitigasi Menebak Cepat

**Masalah**: Karena salah = 0, menebak cepat selalu aman secara matematis.

**Mitigasi**:

1. **Bonus Kecepatan Tidak Dominan**
   - Base points (50) selalu lebih besar dari speed bonus max (50)
   - Menebak dengan cepat TIDAK memberi advantage signifikan

2. **Bonus Akurasi Akhir Match**
   - 80%+ akurasi: +10% bonus poin
   - 60%+ akurasi: +5% bonus poin

3. **Rating + XP Perhatikan Akurasi**

4. **Deteksi Pattern Menebak**
   - Flag: akurasi ~25% + waktu sangat cepat

### 3.3 Konfigurasi Skor

```typescript
export const PVP_SCORING = {
  BASE_POINTS: 50,
  SPEED_BONUS_MAX: 50,
  FIRST_CORRECT_BONUS: 10,
  ACCURACY_BONUS_THRESHOLDS: [
    { threshold: 80, multiplier: 0.1 },
    { threshold: 60, multiplier: 0.05 },
  ],
  TIME_PER_QUESTION: {
    PU: 60, PPU: 45, PBM: 75, PK: 30,
    BI: 45, EN: 45, PM: 45, MIXED: 45,
  },
  TIME_LIMITS: { MIN: 20, MAX: 120 },
};
```

### 3.4 Tiebreaker

1. Total poin
2. Jumlah jawaban benar
3. Total waktu menjawab benar (lebih kecil menang)
4. User ID

---

## 4. Arsitektur Teknis

### 4.1 State Machine Room

```typescript
enum RoomState {
  LOBBY = 'LOBBY',
  COUNTDOWN = 'COUNTDOWN',
  ROUND_ACTIVE = 'ROUND_ACTIVE',
  REVEAL = 'REVEAL',
  FINISHED = 'FINISHED',
}
```

### 4.2 WebSocket Protocol

**Client → Server Messages**:
- `room:create` - Buat room
- `room:join` - Gabung dengan kode
- `room:ready` - Toggle ready
- `room:start` - Host mulai match
- `answer:submit` - Kirim jawaban
- `room:leave` - Keluar room
- `round:ready` - Konfirmasi render selesai

**Server → Client Messages**:
- `room:state` - Update state room
- `round:start` - Mulai round (tanpa kunci)
- `answer:ack` - Acknowledge jawaban (tanpa benar/salah)
- `round:progress` - Progress menjawab
- `round:end` - Reveal jawaban + poin
- `match:end` - Hasil akhir
- `room:player` - Player join/leave
- `error` - Error message
- `status` - Connection status

### 4.3 Server-Authoritative Timing

```typescript
function calculateCorrectedTime(submitTimestamp: number, serverNow: number, playerLatency: number): number {
  const travelTime = (serverNow - submitTimestamp) / 2;
  const correctedTime = travelTime - playerLatency;
  return Math.max(0, correctedTime);
}
```

- NEVER trust client's claimed answer time
- PlayerLatency max cap: 200ms
- Jika latency > 500ms, tampilkan warning

### 4.4 Connection Handling

- Player disconnect: 30 detik reconnect window
- Rounds missed = 0 points
- Host disconnect: auto-promote longest-connected player
- One active connection per account

---

## 5. Anti-Cheat dan Keamanan

### 5.1 Protecting Answer Key

1. Question payload NEVER includes correctAnswer until REVEAL
2. Options dapat di-shuffle per pemain
3. Server validates answer before accepting

### 5.2 Input Validation

- Validasi state room
- Validasi belum answered
- Validasi tidak disconnected

### 5.3 Rate Limiting

```typescript
const RATE_LIMITS = {
  MAX_MESSAGES_PER_SECOND: 10,
  MAX_ANSWERS_PER_MINUTE: 60,
  MAX_CONNECTIONS_PER_IP: 5,
  MAX_ROOMS_PER_MINUTE: 3,
};
```

### 5.4 XP Farming Prevention

| Lobby Type | XP Multiplier | Max XP/Day |
|-----------|--------------|------------|
| Ranked + 2+ players + diverse opponents | 100% | 500 |
| Public + 2+ players | 50% | 250 |
| Private (friends) | 10% | 50 |

---

## 6. Privasi dan Moderasi

### 6.1 Prinsip untuk User < 18 Tahun

1. Display name only
2. No free text chat (hanya emote preset)
3. Opt-in challenge (default: tidak bisa ditantang)
4. Blocking
5. Reporting

### 6.2 Allowed Emotes

- fire, thinking, lol, nice, surprised, gg

---

## 7. Skema Data

```sql
-- pvp_matches
CREATE TABLE pvp_matches (
  id UUID PRIMARY KEY,
  mode SMALLINT NOT NULL,  -- 1=duel, 2=lobby
  subtest_slug TEXT,
  question_count SMALLINT NOT NULL,
  time_per_question INTEGER NOT NULL,
  is_ranked BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  room_code TEXT,
  status SMALLINT NOT NULL,  -- 0=lobby, 1=active, 2=finished
  created_at TIMESTAMP DEFAULT now(),
  finished_at TIMESTAMP
);

-- pvp_players
CREATE TABLE pvp_players (
  id UUID PRIMARY KEY,
  match_id UUID REFERENCES pvp_matches(id),
  user_id UUID REFERENCES "user"(id),
  rank SMALLINT,
  total_points INTEGER DEFAULT 0,
  correct_count SMALLINT DEFAULT 0,
  avg_time_ms INTEGER,
  xp_earned INTEGER DEFAULT 0,
  rating_before INTEGER,
  rating_after INTEGER,
  rating_change INTEGER
);

-- pvp_rounds
CREATE TABLE pvp_rounds (
  id UUID PRIMARY KEY,
  match_id UUID REFERENCES pvp_matches(id),
  round_number SMALLINT NOT NULL,
  question_id UUID REFERENCES questions(id),
  player_count SMALLINT
);

-- pvp_answers
CREATE TABLE pvp_answers (
  id UUID PRIMARY KEY,
  round_id UUID REFERENCES pvp_rounds(id),
  player_id UUID REFERENCES pvp_players(id),
  choice SMALLINT,
  elapsed_ms INTEGER NOT NULL,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  is_first_correct BOOLEAN DEFAULT false
);

-- pvp_ratings
CREATE TABLE pvp_ratings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),
  rating INTEGER NOT NULL DEFAULT 1500,
  season TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0
);
```

### 7.2 Integrasi dengan Sistem Existing

```sql
ALTER TABLE practice_answers ADD COLUMN source TEXT DEFAULT 'drilling';
-- Values: 'drilling', 'tryout', 'pvp', 'daily_challenge'

-- PvP answers tidak dihitung untuk leaderboard drilling
-- Tapi contribute ke weak area tracking
```

---

## 8. Tahapan Implementasi

### Phase 1: Fondasi (2-3 sprint)

| Task | Estimasi | Paralel |
|------|----------|---------|
| Setup WebSocket in Hono | 1 week | - |
| Schema + Migration | 2 days | - |
| Room state machine | 3 days | Yes |
| Question selection | 2 days | Yes |
| Scoring engine | 3 days | Yes |
| Basic lobby UI | 1 week | Yes |
| Real-time round UI | 1 week | Yes |

### Phase 2: Ranked + Rating (1-2 sprint)

| Task | Estimasi | Paralel |
|------|----------|---------|
| Rating calculation | 2 days | - |
| Season system | 3 days | Yes |
| Leaderboard PvP | 3 days | Yes |
| Anti-cheat | 3 days | Yes |

### Phase 3: Polish (1-2 sprint)

| Task | Estimasi | Paralel |
|------|----------|---------|
| Emote reactions | 2 days | - |
| Report system | 3 days | Yes |
| Block users | 2 days | Yes |
| Disconnect handling | 2 days | Yes |

### Phase 4: Growth (1 sprint)

| Task | Estimasi | Paralel |
|------|----------|---------|
| Public lobbies | 3 days | - |
| Ghost match | 1 week | Yes |
| Daily PvP challenge | 3 days | Yes |

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Scoring engine
- Tiebreaker logic
- Rating calculation

### 9.2 Integration Tests
- Match flow (3+ players)
- Player disconnect/reconnect

### 9.3 Load Tests
- 50 concurrent rooms
- High latency simulation

### 9.4 Security Tests
- No answer key leak
- Rate limiting
- Late answer rejection

---

## 10. Pertanyaan Terbuka

1. **Batasan Pemain**: Default 8 sudah tepat, atau perlu lebih/kurang?

2. **Musim**: Seasonal ranking sejak awal atau casual dulu?

3. **Option Shuffling**: Perlu shuffle per pemain untuk anti-kolusi?

4. **Ghost Match**: Prioritas tinggi atau fase 2/3?

5. **Timer Sync Threshold**: 5 detik sudah tepat atau perlu konfigurasi?
