import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router';
import styles from './library.module.css';
import {
  Search,
  SlidersHorizontal,
  X,
  Play,
  RotateCcw,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Filter,
  Check
} from 'lucide-react';

export type PackageType = 'Tryout' | 'Paket Latihan' | 'HOTS' | 'Adaptasi' | 'Simulasi' | 'Airdrop Fundamental';
export type PackageStatus = 'Baru' | 'Sedang Berjalan' | 'Selesai';

export interface CatalogPackageItem {
  id: string;
  realPackageId?: string | null;
  name: string;
  subtest: string;
  subtestSlug: string;
  subtestShort: string;
  type: PackageType;
  questionCount: number;
  durationMinutes: number;
  description: string;
  section: 'tps' | 'literasi' | 'tka' | 'mandiri' | 'matkul';
  order: number;
  isRecommended?: boolean;
  isNew?: boolean;
}

const DEFAULT_CATALOG: CatalogPackageItem[] = [
  {
    id: 'pkg-pu-1',
    name: 'Tryout Fundamental UTBK 2027',
    subtest: 'Penalaran Umum',
    subtestSlug: 'penalaran-umum',
    subtestShort: 'PU',
    type: 'Tryout',
    questionCount: 30,
    durationMinutes: 30,
    description: 'Latihan Penalaran Umum dengan fokus pada pola hubungan, penalaran analitik, silogisme, dan kuantitas.',
    section: 'tps',
    order: 1,
    isRecommended: true,
    isNew: true,
  },
  {
    id: 'pkg-pu-2',
    name: 'Silogisme & Logika Analitik Kompleks',
    subtest: 'Penalaran Umum',
    subtestSlug: 'penalaran-umum',
    subtestShort: 'PU',
    type: 'HOTS',
    questionCount: 20,
    durationMinutes: 20,
    description: 'Bedah penalaran logis tingkat lanjut, penempatan posisi urutan berulang, dan multi-kondisi hipotesis.',
    section: 'tps',
    order: 2,
    isRecommended: true,
  },
  {
    id: 'pkg-ppu-1',
    name: 'Makna Kontekstual & Kosakata',
    subtest: 'Pengetahuan dan Pemahaman Umum',
    subtestSlug: 'pengetahuan-pemahaman-umum',
    subtestShort: 'PPU',
    type: 'Paket Latihan',
    questionCount: 20,
    durationMinutes: 20,
    description: 'Eksplorasi makna leksikal, relasi antar-gagasan, sinonim kontekstual, dan simpulan paragraf.',
    section: 'tps',
    order: 3,
    isRecommended: true,
  },
  {
    id: 'pkg-pbm-1',
    name: 'Sintaksis, Konjungsi & Ejaan PUEBI',
    subtest: 'Pemahaman Bacaan dan Menulis',
    subtestSlug: 'pemahaman-bacaan-menulis',
    subtestShort: 'PBM',
    type: 'Paket Latihan',
    questionCount: 20,
    durationMinutes: 25,
    description: 'Uji pemahaman struktur kalimat baku, ketepatan pemakaian huruf kapital, dan tanda baca standar.',
    section: 'tps',
    order: 4,
    isRecommended: true,
  },
  {
    id: 'pkg-pk-1',
    name: 'Aljabar, Geometri & Aritmetika Kuantitatif',
    subtest: 'Pengetahuan Kuantitatif',
    subtestSlug: 'pengetahuan-kuantitatif',
    subtestShort: 'PK',
    type: 'Paket Latihan',
    questionCount: 20,
    durationMinutes: 25,
    description: 'Fondasi aljabar linear, persamaan kuadrat, sifat sudut bangun datar, dan persentase numerik.',
    section: 'tps',
    order: 5,
    isRecommended: true,
    isNew: true,
  },
  {
    id: 'pkg-lbi-1',
    name: 'Inferensi Teks & Narasi Sastra',
    subtest: 'Literasi dalam Bahasa Indonesia',
    subtestSlug: 'literasi-bahasa-indonesia',
    subtestShort: 'LBI',
    type: 'Paket Latihan',
    questionCount: 20,
    durationMinutes: 30,
    description: 'Menangkap pesan tersirat, amanat cerita, perwatakan tokoh, dan suasana cerita sastra kontemporer.',
    section: 'literasi',
    order: 6,
  },
  {
    id: 'pkg-lbe-1',
    name: 'Academic Reading & Inferences',
    subtest: 'Literasi dalam Bahasa Inggris',
    subtestSlug: 'literasi-bahasa-inggris',
    subtestShort: 'LBE',
    type: 'Paket Latihan',
    questionCount: 20,
    durationMinutes: 30,
    description: 'Main ideas, author tone, lexical contextual guessing, and inference from scientific journals.',
    section: 'literasi',
    order: 7,
    isRecommended: true,
  },
  {
    id: 'pkg-pm-1',
    name: 'Pemodelan Aritmetika & Real-world Problem',
    subtest: 'Penalaran Matematika',
    subtestSlug: 'penalaran-matematika',
    subtestShort: 'PM',
    type: 'Paket Latihan',
    questionCount: 20,
    durationMinutes: 30,
    description: 'Kalkulasi bunga tunggal, diskon bertingkat, probabilitas kejadian, dan penafsiran grafik tren.',
    section: 'literasi',
    order: 8,
    isRecommended: true,
  },
  {
    id: 'pkg-mandiri-1',
    name: 'Matematika Dasar & Aljabar Seleksi Mandiri',
    subtest: 'Matematika Dasar',
    subtestSlug: 'matematika-dasar',
    subtestShort: 'MD',
    type: 'Paket Latihan',
    questionCount: 15,
    durationMinutes: 25,
    description: 'Materi persamaan kuadrat, matriks, eksponen, dan logaritma untuk persiapan ujian mandiri SIMAK UI, UTUL UGM, dan SM ITB.',
    section: 'tka',
    order: 9,
    isNew: true,
  },
  {
    id: 'pkg-matkul-1',
    name: 'Kalkulus Dasar: Diferensial & Integral',
    subtest: 'Kalkulus',
    subtestSlug: 'kalkulus',
    subtestShort: 'KALK',
    type: 'Paket Latihan',
    questionCount: 15,
    durationMinutes: 30,
    description: 'Latihan konsep limit kontinuitas, turunan parsial, dan teknik pengintegralan untuk tingkat universitas.',
    section: 'matkul',
    order: 10,
    isNew: true,
  },
  {
    id: 'pkg-tka-fis-1',
    name: 'Mekanika & Dinamika Fisika Dasar',
    subtest: 'Fisika Dasar',
    subtestSlug: 'fisika-dasar',
    subtestShort: 'FIS',
    type: 'Paket Latihan',
    questionCount: 15,
    durationMinutes: 25,
    description: 'Kinematika gerak lurus dan melingkar, hukum Newton, usaha, energi, dan momentum.',
    section: 'tka',
    order: 11,
    isNew: true,
  },
  {
    id: 'pkg-tka-eko-1',
    name: 'Mikro & Makro Ekonomi Terapan',
    subtest: 'Ekonomi',
    subtestSlug: 'ekonomi',
    subtestShort: 'EKO',
    type: 'Paket Latihan',
    questionCount: 15,
    durationMinutes: 25,
    description: 'Elastisitas harga penawaran dan permintaan, struktur pasar persaingan, dan pendapatan nasional.',
    section: 'tka',
    order: 12,
    isNew: true,
  }
];

const STATUS_OPTIONS: (PackageStatus | 'Semua')[] = ['Semua', 'Baru', 'Sedang Berjalan', 'Selesai'];
const TYPE_OPTIONS: (PackageType | 'Semua')[] = ['Semua', 'Tryout', 'Paket Latihan', 'HOTS', 'Adaptasi', 'Simulasi'];

interface ApiPackageItem {
  id: string;
  name: string;
  description: string | null;
  order: number;
  topicId: string;
  topicName: string;
  topicSlug: string;
  packageType?: string | null;
  category?: string | null;
  duration?: number | null;
  isFullTryout?: boolean;
  questionCount: number;
}

interface AppTopicItem {
  id: string;
  slug: string;
  name: string;
  category: string;
}

type CategoryTab = 'semua' | 'tps' | 'literasi' | 'tka' | 'tryout';

export const LibraryView: React.FC = () => {
  const {
    topics,
    history,
    activeSession,
    startPractice,
    loading
  } = useApp();

  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<CategoryTab>('semua');
  const [selectedSubtest, setSelectedSubtest] = useState<string>('Semua Subtes');
  const [selectedStatus, setSelectedStatus] = useState<PackageStatus | 'Semua'>('Semua');
  const [selectedType, setSelectedType] = useState<PackageType | 'Semua'>('Semua');

  // Mobile Filter Drawer State
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Detail Modal State
  const [selectedDetailPkg, setSelectedDetailPkg] = useState<CatalogPackageItem | null>(null);
  const [selectedPracticeMode, setSelectedPracticeMode] = useState<'Practice' | 'Timed Practice'>('Practice');

  // Load API packages to sync with DB
  const [apiPackages, setApiPackages] = useState<ApiPackageItem[]>([]);

  useEffect(() => {
    fetch('/api/learner/packages')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setApiPackages(data);
      })
      .catch(() => {});
  }, []);

  // Merge API packages with curated catalog items
  const catalogList = useMemo(() => {
    const merged = [...DEFAULT_CATALOG];

    if (apiPackages.length > 0) {
      apiPackages.forEach((apiPkg) => {
        const isTkaOrMandiri =
          apiPkg.category === 'tka' ||
          apiPkg.category === 'ujian-mandiri' ||
          apiPkg.category === 'mata-kuliah' ||
          ['matematika-dasar', 'kalkulus', 'fisika-dasar', 'ekonomi'].includes(apiPkg.topicSlug);

        const section: CatalogPackageItem['section'] = isTkaOrMandiri
          ? (apiPkg.category === 'mata-kuliah' ? 'matkul' : 'tka')
          : ['penalaran-umum', 'pengetahuan-pemahaman-umum', 'pemahaman-bacaan-menulis', 'pengetahuan-kuantitatif'].includes(apiPkg.topicSlug)
          ? 'tps'
          : 'literasi';

        const existingIdx = merged.findIndex(
          (m) => m.subtestSlug === apiPkg.topicSlug && (m.name === apiPkg.name || apiPkg.name === 'Paket 1')
        );

        if (existingIdx >= 0) {
          merged[existingIdx] = {
            ...merged[existingIdx],
            realPackageId: apiPkg.id,
            questionCount: apiPkg.questionCount > 0 ? apiPkg.questionCount : merged[existingIdx].questionCount,
            durationMinutes: apiPkg.duration || merged[existingIdx].durationMinutes,
            section,
          };
        } else {
          merged.push({
            id: apiPkg.id,
            realPackageId: apiPkg.id,
            name: apiPkg.name,
            subtest: apiPkg.topicName,
            subtestSlug: apiPkg.topicSlug,
            subtestShort: apiPkg.topicSlug.split('-').map((s: string) => s[0].toUpperCase()).join(''),
            type: (apiPkg.packageType as PackageType) || (apiPkg.isFullTryout ? 'Tryout' : 'Paket Latihan'),
            questionCount: apiPkg.questionCount || 20,
            durationMinutes: apiPkg.duration || Math.max(15, Math.round((apiPkg.questionCount || 20) * 1.5)),
            description: apiPkg.description || `Paket latihan ${apiPkg.name} untuk materi ${apiPkg.topicName}.`,
            section,
            order: apiPkg.order || 99,
            isNew: true,
          });
        }
      });
    }

    return merged;
  }, [apiPackages]);

  // Dynamic subtest list
  const subtestOptions = useMemo(() => {
    const list = Array.from(new Set(catalogList.map((p) => p.subtest)));
    return ['Semua Subtes', ...list];
  }, [catalogList]);

  // Derive dynamic status & progress for each package
  const getPackageRuntimeState = (pkg: CatalogPackageItem) => {
    if (activeSession && !activeSession.isEvaluated) {
      const matchActive =
        (pkg.realPackageId && activeSession.packageId === pkg.realPackageId) ||
        activeSession.packageName === pkg.name ||
        (activeSession.subjectSlug === pkg.subtestSlug && !activeSession.packageId);

      if (matchActive) {
        const answeredCount = Object.keys(activeSession.answers || {}).length;
        const total = activeSession.totalQuestions || pkg.questionCount;
        const accuracy = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
        return {
          status: 'Sedang Berjalan' as PackageStatus,
          answeredCount,
          totalCount: total,
          accuracy,
          progressText: `${answeredCount} / ${total} selesai`,
          score: null,
          attemptId: null,
        };
      }
    }

    if (Array.isArray(history) && history.length > 0) {
      const attempt = history.find(
        (h) =>
          (pkg.realPackageId && h.packageId === pkg.realPackageId) ||
          h.packageName === pkg.name ||
          (h.slug === pkg.subtestSlug && (h.packageName === 'Paket 1' || !h.packageName))
      );

      if (attempt) {
        const score = Math.round((attempt.correct / attempt.total) * 100);
        return {
          status: 'Selesai' as PackageStatus,
          answeredCount: attempt.total,
          totalCount: attempt.total,
          accuracy: score,
          progressText: `${attempt.correct} / ${attempt.total} selesai`,
          score,
          attemptId: attempt.id,
        };
      }
    }

    return {
      status: 'Baru' as PackageStatus,
      answeredCount: 0,
      totalCount: pkg.questionCount,
      accuracy: 0,
      progressText: 'Belum dikerjakan',
      score: null,
      attemptId: null,
    };
  };

  // Filtered Packages
  const filteredPackages = useMemo(() => {
    return catalogList.filter((pkg) => {
      const runtime = getPackageRuntimeState(pkg);

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = pkg.name.toLowerCase().includes(q);
        const matchesSubtest = pkg.subtest.toLowerCase().includes(q);
        const matchesDesc = pkg.description.toLowerCase().includes(q);
        const matchesType = pkg.type.toLowerCase().includes(q);
        if (!matchesName && !matchesSubtest && !matchesDesc && !matchesType) return false;
      }

      // Quick Category Pill
      if (selectedCategoryTab === 'tps' && pkg.section !== 'tps') return false;
      if (selectedCategoryTab === 'literasi' && pkg.section !== 'literasi') return false;
      if (selectedCategoryTab === 'tka' && pkg.section !== 'tka' && pkg.section !== 'mandiri' && pkg.section !== 'matkul') return false;
      if (selectedCategoryTab === 'tryout' && pkg.type !== 'Tryout' && pkg.type !== 'Simulasi' && !pkg.name.toLowerCase().includes('tryout')) return false;

      // Subtest Filter
      if (selectedSubtest !== 'Semua Subtes' && pkg.subtest !== selectedSubtest) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'Semua' && runtime.status !== selectedStatus) {
        return false;
      }

      // Type Filter
      if (selectedType !== 'Semua' && pkg.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [catalogList, searchQuery, selectedCategoryTab, selectedSubtest, selectedStatus, selectedType, history, activeSession]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSubtest !== 'Semua Subtes') count++;
    if (selectedStatus !== 'Semua') count++;
    if (selectedType !== 'Semua') count++;
    return count;
  }, [selectedSubtest, selectedStatus, selectedType]);

  const resetFilters = () => {
    setSelectedSubtest('Semua Subtes');
    setSelectedStatus('Semua');
    setSelectedType('Semua');
    setSelectedCategoryTab('semua');
    setSearchQuery('');
  };

  // Launch package directly in Quiz Engine
  const handleStartPackage = (pkg: CatalogPackageItem, mode: 'Practice' | 'Timed Practice' = 'Practice') => {
    setSelectedDetailPkg(null);
    const topic = (topics as AppTopicItem[]).find((t) => t.slug === pkg.subtestSlug);
    const subjectId = topic ? topic.id : pkg.subtestShort;
    startPractice(subjectId, mode, pkg.questionCount, '', pkg.realPackageId || null);
    navigate(`/dashboard?tab=practice&subtes=${encodeURIComponent(pkg.subtestSlug)}`);
  };

  const handleViewResult = (attemptId: string) => {
    navigate(`/dashboard/riwayat/${encodeURIComponent(attemptId)}`);
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Bar: Archival Tag, Title, Subtitle, & Search */}
      <header className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.headerArchival}>
            <span className="dot-stamp" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-gold)' }} />
            <span>LIBRARY // ARCHIVE</span>
          </div>
          <h1 className={styles.title}>Library</h1>
          <p className={styles.subtitle}>Temukan paket soal dan uji kemampuanmu.</p>
        </div>

        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Cari paket soal, subtes, topik..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      {/* 2. Quick Editorial Category Tabs */}
      <div className={styles.categoryBar}>
        <div className={styles.categoryPills} role="tablist" aria-label="Kategori paket">
          {([
            { id: 'semua', label: 'SEMUA PAKET' },
            { id: 'tps', label: 'TPS' },
            { id: 'literasi', label: 'LITERASI' },
            { id: 'tka', label: 'TKA & MANDIRI' },
            { id: 'tryout', label: 'TRYOUT' },
          ] as const).map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selectedCategoryTab === cat.id}
              className={`${styles.categoryPill} ${selectedCategoryTab === cat.id ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategoryTab(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.mobileFilterToggle}
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
        >
          <Filter size={14} />
          <span>FILTER {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
        </button>
      </div>

      {/* 3. Main 2-Column Layout */}
      <div className={styles.layout}>
        {/* Left Column: Filter Sidebar */}
        <aside className={styles.filterSidebar}>
          <div className={styles.filterHeader}>
            <div className={styles.filterHeaderTitle}>
              <SlidersHorizontal size={14} />
              <span>FILTER PAKET</span>
            </div>
            {activeFilterCount > 0 && (
              <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                Reset ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Subtest Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterGroupLabel}>Subtes / Materi</span>
            <div className={styles.filterOptionsList}>
              {subtestOptions.map((sub) => (
                <div
                  key={sub}
                  className={`${styles.filterOptionRow} ${selectedSubtest === sub ? styles.filterOptionRowActive : ''}`}
                  onClick={() => setSelectedSubtest(sub)}
                >
                  <span>{sub}</span>
                  {selectedSubtest === sub && <Check size={14} />}
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterGroupLabel}>Status Pengerjaan</span>
            <div className={styles.filterChipRow}>
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`${styles.filterChip} ${selectedStatus === st ? styles.filterChipActive : ''}`}
                  onClick={() => setSelectedStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterGroupLabel}>Tipe Paket</span>
            <div className={styles.filterChipRow}>
              {TYPE_OPTIONS.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  className={`${styles.filterChip} ${selectedType === tp ? styles.filterChipActive : ''}`}
                  onClick={() => setSelectedType(tp)}
                >
                  {tp}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Packages Grid & Summary */}
        <section className={styles.contentArea}>
          <div className={styles.resultsSummaryBar}>
            <span className={styles.resultsCount}>
              {filteredPackages.length} Paket Soal Tersedia
            </span>
            {(activeFilterCount > 0 || searchQuery) && (
              <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                Bersihkan Filter
              </button>
            )}
          </div>

          {filteredPackages.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={48} className={styles.emptyStateIcon} />
              <h3 className={styles.emptyStateTitle}>Tidak ada paket yang sesuai</h3>
              <p className={styles.emptyStateText}>
                Coba sesuaikan kata kunci pencarian atau ubah kriteria filter subtes dan status.
              </p>
              <button type="button" className={styles.btnActionOutline} onClick={resetFilters}>
                Kembalikan Filter
              </button>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {filteredPackages.map((pkg) => {
                const runtime = getPackageRuntimeState(pkg);

                return (
                  <div
                    key={pkg.id}
                    className={styles.card}
                    onClick={() => setSelectedDetailPkg(pkg)}
                  >
                    <div>
                      {/* Top Metadata Row */}
                      <div className={styles.cardHeaderLine}>
                        <span className={styles.cardSubtest}>{pkg.subtest}</span>

                        <div
                          className={`${styles.statusBadge} ${
                            runtime.status === 'Selesai'
                              ? styles.statusSelesai
                              : runtime.status === 'Sedang Berjalan'
                              ? styles.statusSedang
                              : styles.statusBaru
                          }`}
                        >
                          <span>
                            {runtime.status === 'Selesai'
                              ? '✓ SELESAI'
                              : runtime.status === 'Sedang Berjalan'
                              ? '◑ SEDANG BERJALAN'
                              : '○ BARU'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <h3 className={styles.cardTitle}>{pkg.name}</h3>
                      <p className={styles.cardDesc}>{pkg.description}</p>

                      {/* Metadata row */}
                      <div className={styles.cardMetaRow}>
                        <span className={styles.cardMetaItem}>
                          ◉ {pkg.questionCount} Soal
                        </span>
                        <span className={styles.cardMetaItem}>
                          ◷ {pkg.durationMinutes} Menit
                        </span>
                        <span className={styles.typeBadge}>{pkg.type}</span>
                      </div>
                    </div>

                    <div>
                      <div className={styles.cardDivider} />

                      {/* Progress / Score Section */}
                      {runtime.status === 'Sedang Berjalan' && (
                        <div className={styles.cardProgressArea}>
                          <div className={styles.progressInfoRow}>
                            <span>{runtime.progressText}</span>
                            <span>{runtime.accuracy}% accuracy</span>
                          </div>
                          <div className={styles.progressBarContainer}>
                            <div
                              className={styles.progressBarFill}
                              style={{ width: `${runtime.accuracy}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {runtime.status === 'Selesai' && (
                        <div className={styles.cardProgressArea}>
                          <div className={styles.progressInfoRow}>
                            <span className={styles.cardScoreBadge}>
                              AKURASI <span className={styles.scoreValue}>{runtime.score}%</span>
                            </span>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>SELESAI</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                        {runtime.status === 'Baru' && (
                          <button
                            type="button"
                            className={styles.btnActionPrimary}
                            disabled={loading}
                            onClick={() => handleStartPackage(pkg)}
                          >
                            <Play size={14} />
                            <span>Mulai Paket</span>
                          </button>
                        )}

                        {runtime.status === 'Sedang Berjalan' && (
                          <button
                            type="button"
                            className={`${styles.btnActionPrimary} ${styles.btnActionGold}`}
                            disabled={loading}
                            onClick={() => handleStartPackage(pkg)}
                          >
                            <Play size={14} />
                            <span>Lanjutkan</span>
                          </button>
                        )}

                        {runtime.status === 'Selesai' && (
                          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                            {runtime.attemptId && (
                              <button
                                type="button"
                                className={styles.btnActionOutline}
                                onClick={() => handleViewResult(runtime.attemptId!)}
                              >
                                <BarChart2 size={14} />
                                <span>Hasil</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.btnActionPrimary}
                              disabled={loading}
                              onClick={() => handleStartPackage(pkg)}
                              style={{ flex: 1 }}
                            >
                              <RotateCcw size={14} />
                              <span>Ulangi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 4. Package Detail Modal */}
      {selectedDetailPkg && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedDetailPkg(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderContent}>
                <div className={styles.modalSubtestBadge}>
                  {selectedDetailPkg.subtest}
                </div>
                <h3 className={styles.modalTitle}>{selectedDetailPkg.name}</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedDetailPkg(null)}
                aria-label="Tutup detail paket"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              {/* Meta Grid */}
              <div className={styles.metaGrid}>
                <div className={styles.metaGridItem}>
                  <span className={styles.metaGridLabel}>Jumlah Soal</span>
                  <span className={styles.metaGridVal}>{selectedDetailPkg.questionCount} Soal</span>
                </div>
                <div className={styles.metaGridItem}>
                  <span className={styles.metaGridLabel}>Estimasi Durasi</span>
                  <span className={styles.metaGridVal}>{selectedDetailPkg.durationMinutes} Menit</span>
                </div>
                <div className={styles.metaGridItem}>
                  <span className={styles.metaGridLabel}>Subtes</span>
                  <span className={styles.metaGridVal}>{selectedDetailPkg.subtest}</span>
                </div>
                <div className={styles.metaGridItem}>
                  <span className={styles.metaGridLabel}>Tipe Materi</span>
                  <span className={styles.metaGridVal}>{selectedDetailPkg.type}</span>
                </div>
              </div>

              {/* Description */}
              <div className={styles.modalDescSection}>
                <span className={styles.sectionLabel}>Deskripsi Paket</span>
                <p className={styles.descText}>{selectedDetailPkg.description}</p>
              </div>

              {/* Progress Record */}
              <div className={styles.modalDescSection}>
                <span className={styles.sectionLabel}>Progress Status</span>
                <div className={styles.progressBox}>
                  {(() => {
                    const runtime = getPackageRuntimeState(selectedDetailPkg);
                    if (runtime.status === 'Baru') {
                      return (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          Belum dikerjakan
                        </div>
                      );
                    }
                    if (runtime.status === 'Sedang Berjalan') {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                            <span>{runtime.progressText}</span>
                            <span style={{ color: 'var(--accent-gold)' }}>{runtime.accuracy}% Accuracy</span>
                          </div>
                          <div className={styles.progressBarContainer}>
                            <div className={styles.progressBarFill} style={{ width: `${runtime.accuracy}%` }} />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={16} /> Selesai ({runtime.progressText})
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                          AKURASI: {runtime.score}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Practice Mode Choice */}
              <div className={styles.modeSelectGroup}>
                <span className={styles.sectionLabel}>Pilihan Ritme Latihan</span>
                <div className={styles.modeOptions}>
                  <label
                    className={`${styles.modeOptionLabel} ${
                      selectedPracticeMode === 'Practice' ? styles.modeOptionLabelActive : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="lib-practice-mode"
                      value="Practice"
                      checked={selectedPracticeMode === 'Practice'}
                      onChange={() => setSelectedPracticeMode('Practice')}
                    />
                    <div className={styles.modeOptionContent}>
                      <span className={styles.modeOptionTitle}>Tanpa Batas Waktu</span>
                      <span className={styles.modeOptionDesc}>Sesuai ritme belajar sendiri</span>
                    </div>
                  </label>

                  <label
                    className={`${styles.modeOptionLabel} ${
                      selectedPracticeMode === 'Timed Practice' ? styles.modeOptionLabelActive : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="lib-practice-mode"
                      value="Timed Practice"
                      checked={selectedPracticeMode === 'Timed Practice'}
                      onChange={() => setSelectedPracticeMode('Timed Practice')}
                    />
                    <div className={styles.modeOptionContent}>
                      <span className={styles.modeOptionTitle}>Batas Waktu Standar</span>
                      <span className={styles.modeOptionDesc}>90 detik per soal ({selectedDetailPkg.durationMinutes} menit)</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnActionOutline}
                onClick={() => setSelectedDetailPkg(null)}
              >
                Tutup
              </button>

              {(() => {
                const runtime = getPackageRuntimeState(selectedDetailPkg);
                if (runtime.status === 'Baru') {
                  return (
                    <button
                      type="button"
                      className={styles.btnActionPrimary}
                      disabled={loading}
                      onClick={() => handleStartPackage(selectedDetailPkg, selectedPracticeMode)}
                    >
                      <Play size={15} />
                      <span>Mulai Paket</span>
                    </button>
                  );
                }
                if (runtime.status === 'Sedang Berjalan') {
                  return (
                    <button
                      type="button"
                      className={`${styles.btnActionPrimary} ${styles.btnActionGold}`}
                      disabled={loading}
                      onClick={() => handleStartPackage(selectedDetailPkg, selectedPracticeMode)}
                    >
                      <Play size={15} />
                      <span>Lanjutkan</span>
                    </button>
                  );
                }
                return (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {runtime.attemptId && (
                      <button
                        type="button"
                        className={styles.btnActionOutline}
                        onClick={() => handleViewResult(runtime.attemptId!)}
                      >
                        <BarChart2 size={15} />
                        <span>Lihat Hasil</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.btnActionPrimary}
                      disabled={loading}
                      onClick={() => handleStartPackage(selectedDetailPkg, selectedPracticeMode)}
                    >
                      <RotateCcw size={15} />
                      <span>Kerjakan Lagi</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 5. Mobile Filter Drawer / Bottom Sheet */}
      {mobileFilterOpen && (
        <div className={styles.modalBackdrop} onClick={() => setMobileFilterOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderContent}>
                <h3 className={styles.modalTitle}>Filter Paket Soal</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setMobileFilterOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Subtest */}
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>Subtes</span>
                <div className={styles.filterOptionsList}>
                  {subtestOptions.map((sub) => (
                    <div
                      key={sub}
                      className={`${styles.filterOptionRow} ${selectedSubtest === sub ? styles.filterOptionRowActive : ''}`}
                      onClick={() => setSelectedSubtest(sub)}
                    >
                      <span>{sub}</span>
                      {selectedSubtest === sub && <Check size={14} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>Status</span>
                <div className={styles.filterChipRow}>
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`${styles.filterChip} ${selectedStatus === st ? styles.filterChipActive : ''}`}
                      onClick={() => setSelectedStatus(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>Tipe Paket</span>
                <div className={styles.filterChipRow}>
                  {TYPE_OPTIONS.map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      className={`${styles.filterChip} ${selectedType === tp ? styles.filterChipActive : ''}`}
                      onClick={() => setSelectedType(tp)}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnActionOutline}
                onClick={resetFilters}
              >
                Reset Filter
              </button>
              <button
                type="button"
                className={styles.btnActionPrimary}
                onClick={() => setMobileFilterOpen(false)}
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
