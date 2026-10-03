// LATVERIA ACADEMIC ARCHIVE — UTBK / SNBT QUESTION REPOSITORY
// High-fidelity questions conforming to standard BP3 / SNPMB blueprint

export const UTBK_SUBJECTS = [
  {
    id: "PU",
    name: "Penalaran Umum",
    code: "SNBT-PU",
    category: "Tes Skolastik",
    topics: 14,
    questionsCount: 420,
    progress: 72,
    accuracy: 84.7,
    description:
      "Penalaran induktif, deduktif, dan kuantitatif untuk menguji kemampuan berpikir logis dan sistematis.",
    icon: "Brain",
  },
  {
    id: "PPU",
    name: "Pengetahuan dan Pemahaman Umum",
    code: "SNBT-PPU",
    category: "Tes Skolastik",
    topics: 12,
    questionsCount: 380,
    progress: 68,
    accuracy: 81.2,
    description:
      "Pemahaman makna kata, struktur paragraf, relasi makna, dan penalaran kontekstual teks informatif.",
    icon: "BookOpen",
  },
  {
    id: "PBM",
    name: "Pemahaman Bacaan dan Menulis",
    code: "SNBT-PBM",
    category: "Tes Skolastik",
    topics: 16,
    questionsCount: 350,
    progress: 80,
    accuracy: 88.0,
    description:
      "Kaidah PUEBI, kalimat efektif, konjungsi antarkalimat, pembentukan kata, dan koherensi paragraf.",
    icon: "PenTool",
  },
  {
    id: "PK",
    name: "Pengetahuan Kuantitatif",
    code: "SNBT-PK",
    category: "Tes Skolastik",
    topics: 18,
    questionsCount: 460,
    progress: 64,
    accuracy: 76.5,
    description:
      "Aritmetika, aljabar, geometri bidang, statistika deskriptif, dan penalaran kecukupan data (1) & (2).",
    icon: "Hash",
  },
  {
    id: "LBI",
    name: "Literasi Bahasa Indonesia",
    code: "SNBT-LBI",
    category: "Tes Literasi",
    topics: 10,
    questionsCount: 310,
    progress: 85,
    accuracy: 89.4,
    description:
      "Menganalisis, mengevaluasi fakta, merefleksikan gagasan, dan menarik simpulan teks eksplanatif kompleks.",
    icon: "FileText",
  },
  {
    id: "LBE",
    name: "Literasi Bahasa Inggris",
    code: "SNBT-LBE",
    category: "Tes Literasi",
    topics: 11,
    questionsCount: 340,
    progress: 78,
    accuracy: 86.2,
    description:
      "Critical reading, synthesizing arguments, author stance, inference, with integrated Latverian Lexicon.",
    icon: "Globe",
  },
  {
    id: "PM",
    name: "Penalaran Matematika",
    code: "SNBT-PM",
    category: "Tes Literasi",
    topics: 15,
    questionsCount: 390,
    progress: 70,
    accuracy: 79.1,
    description:
      "Pemodelan matematis masalah kontekstual nyata, optimasi, analisis tren laju perubahan, dan probabilitas bersyarat.",
    icon: "Compass",
  },
];

export const MOCK_QUESTIONS = {
  PU: [
    {
      id: "PU-01",
      subject: "Penalaran Umum",
      subjectId: "PU",
      difficulty: "Latverian Elite",
      passage: `Semua kandidat akademi Latveria yang menguasai analisis data berpeluang lulus ujian strategi nasional. Sebagian kandidat yang lulus ujian strategi nasional diangkat menjadi perwira intelijensi kognitif. Tidak ada perwira intelijensi kognitif yang gagal dalam verifikasi etika saintifik.\n\nBerdasarkan ketiga premis tersebut, Viktor adalah seorang kandidat akademi Latveria yang menguasai analisis data dan telah diangkat menjadi perwira intelijensi kognitif.`,
      question: "Simpulan yang PASTI BENAR mengenai Viktor berdasarkan teks tersebut adalah ...",
      options: [
        {
          key: "A",
          text: "Viktor pasti lulus verifikasi etika saintifik dan berpeluang lulus ujian strategi nasional.",
        },
        {
          key: "B",
          text: "Semua kandidat akademi yang menguasai analisis data pasti diangkat menjadi perwira intelijensi kognitif.",
        },
        {
          key: "C",
          text: "Viktor belum tentu lulus ujian strategi nasional meskipun menguasai analisis data.",
        },
        {
          key: "D",
          text: "Hanya kandidat yang menguasai analisis data yang tidak gagal dalam verifikasi etika saintifik.",
        },
        {
          key: "E",
          text: "Viktor lulus verifikasi etika saintifik tanpa perlu mengikuti ujian strategi nasional.",
        },
      ],
      correctAnswer: "A",
      explanation: {
        concept: "Silogisme Kategoris & Kuantifikasi Logis",
        stepByStep: [
          "Premis 1: Menguasai analisis data → Berpeluang lulus ujian strategi nasional.",
          "Premis 2: Sebagian yang lulus ujian strategi nasional → Diangkat perwira intelijensi kognitif.",
          "Premis 3: Perwira intelijensi kognitif → TIDAK gagal (artinya PASTI LULUS) verifikasi etika saintifik.",
          "Fakta: Viktor adalah perwira intelijensi kognitif (berarti dia termasuk himpunan perwira dan otomatis lolos verifikasi etika saintifik) serta menguasai analisis data (berpeluang lulus ujian).",
        ],
        whyCorrect:
          "Karena Viktor berstatus perwira intelijensi kognitif, berdasarkan premis 3 ia pasti tidak gagal (lulus) dalam verifikasi etika saintifik. Berdasarkan premis 1, penguasaannya terhadap analisis data memberinya peluang lulus ujian.",
        pitfall:
          'Opsi B salah karena premis 2 hanya menyatakan "sebagian". Opsi D membuat generalisasi terbalik yang tidak didukung teks.',
      },
    },
    {
      id: "PU-02",
      subject: "Penalaran Umum",
      subjectId: "PU",
      difficulty: "Standar",
      passage: `Tingkat retensi memori mahasiswa meningkat ketika tidur minimal 7 jam per hari atau mengonsumsi antioksidan polifenol secara teratur. Penelitian terkini menunjukkan bahwa kelompok mahasiswa yang mengalami penurunan retensi memori ternyata tidur kurang dari 7 jam per hari.`,
      question:
        "Pernyataan berikut yang PALING SESUAI dengan prinsip modus tollens dan informasi di atas adalah ...",
      options: [
        {
          key: "A",
          text: "Kelompok mahasiswa tersebut dipastikan tidak mengonsumsi antioksidan polifenol secara teratur.",
        },
        {
          key: "B",
          text: "Tidur minimal 7 jam adalah satu-satunya faktor penentu retensi memori.",
        },
        {
          key: "C",
          text: "Mengonsumsi antioksidan polifenol dapat menggantikan kebutuhan tidur sepenuhnya.",
        },
        {
          key: "D",
          text: "Mahasiswa yang tidur 8 jam tidak memerlukan konsumsi nutrisi seimbang.",
        },
        {
          key: "E",
          text: "Penurunan retensi memori selalu disebabkan oleh beban tugas akademik berlebih.",
        },
      ],
      correctAnswer: "A",
      explanation: {
        concept: "Disjungsi Inklusif dan Penyangkalan Konsekuen (Modus Tollens)",
        stepByStep: [
          "Kondisi: (Tidur ≥ 7 jam OR Konsumsi Polifenol) → Retensi Memori Meningkat.",
          "Fakta: Retensi memori menurun (artinya Retensi TIDAK meningkat).",
          "Berdasarkan kontraposisi (~Q → ~P): ~(Tidur ≥ 7 jam OR Konsumsi Polifenol) = (Tidur < 7 jam AND TIDAK Konsumsi Polifenol).",
          "Karena retensi memori menurun, kedua kondisi tersebut harus bernilai salah. Sehingga mereka tidak mengonsumsi polifenol.",
        ],
        whyCorrect:
          "Sesuai hukum De Morgan, negasi dari disjungsi (A v B) adalah (~A ^ ~B). Jika akibat bernilai salah, kedua syarat pemicu harus sama-sama tidak terpenuhi.",
        pitfall: "Opsi B keliru mengira disjungsi sebagai syarat tunggal mutlak.",
      },
    },
  ],
  LBE: [
    {
      id: "LBE-01",
      subject: "Literasi Bahasa Inggris",
      subjectId: "LBE",
      difficulty: "Latverian Elite",
      passage: `In an era dominated by algorithmic automation, the doctrine of cognitive sovereignty has emerged as a cornerstone of state resilience. Scholars argue that civic responsibility in the modern republic requires more than passive consumption; it necessitates empirical rigor when evaluating synthetic media. Without deliberate institutional governance, societies face intellectual adversity and epistemic fragmentation.\n\nTechnological hegemony must not supersede human judgment. A balanced system insists that machine intelligence serves pedagogical advancement, ensuring citizens cultivate intellectual diligence rather than reflexive dependency.`,
      question:
        'According to the passage, why is "cognitive sovereignty" deemed essential for modern civic resilience?',
      options: [
        {
          key: "A",
          text: "It completely insulates governments from relying on computational automation.",
        },
        {
          key: "B",
          text: "It fosters empirical scrutiny to counter epistemic vulnerability and synthetic deception.",
        },
        {
          key: "C",
          text: "It replaces formal academic institutions with decentralized machine intelligence.",
        },
        {
          key: "D",
          text: "It discourages citizens from utilizing digital pedagogy in higher education.",
        },
        { key: "E", text: "It centralizes all civic media under monopolistic state broadcasting." },
      ],
      correctAnswer: "B",
      explanation: {
        concept: "Contextual Inference & Synthesized Argumentation",
        stepByStep: [
          'Passage reference: "the doctrine of cognitive sovereignty has emerged as a cornerstone... civic responsibility... necessitates empirical rigor when evaluating synthetic media. Without deliberate institutional governance, societies face intellectual adversity and epistemic fragmentation."',
          "Synthesizing the claim: Cognitive sovereignty protects society against synthetic deception (synthetic media) and epistemic breakdown by training citizens in empirical scrutiny.",
        ],
        whyCorrect:
          "Option B accurately captures both the cause (empirical scrutiny) and the protected objective (countering epistemic fragmentation and synthetic media risks) stated in paragraph 1.",
        pitfall:
          'Option A introduces an absolute extreme ("completely insulates") not found in the text.',
      },
      interactiveWords: [
        "sovereignty",
        "responsibility",
        "empirical",
        "governance",
        "adversity",
        "hegemony",
        "diligence",
      ],
    },
    {
      id: "LBE-02",
      subject: "Literasi Bahasa Inggris",
      subjectId: "LBE",
      difficulty: "Menengah",
      passage: `The preservation of architectural heritage is not merely a nostalgic endeavor; it acts as an anchor for communal identity in rapidly homogenizing metropolitan landscapes. When historic facades are eradicated in favor of utilitarian glass towers, citizens often experience spatial disorientation and diminished historical consciousness.\n\nUrbanists advocate for adaptive reuse, wherein venerable structures are retrofitted with contemporary energy systems while their structural integrity and aesthetic gravity remain intact.`,
      question:
        'The author\'s attitude toward "adaptive reuse" of historic buildings can best be described as ...',
      options: [
        { key: "A", text: "Skeptical of its feasibility in contemporary metropolitan budgets." },
        {
          key: "B",
          text: "Vehemently opposed due to concerns about compromising structural integrity.",
        },
        {
          key: "C",
          text: "Pragmatically favorable as a synthesis of preservation and modernization.",
        },
        { key: "D", text: "Indifferent to both heritage conservation and modern urban renewal." },
        { key: "E", text: "Nostalgic and resistant to any modern energetic retrofitting." },
      ],
      correctAnswer: "C",
      explanation: {
        concept: "Author Tone & Perspective Identification",
        stepByStep: [
          'Paragraph 2 states: "Urbanists advocate for adaptive reuse, wherein venerable structures are retrofitted with contemporary energy systems while their structural integrity and aesthetic gravity remain intact."',
          "The author presents this solution favorably as an intelligent middle ground that solves modernization needs while safeguarding historical identity.",
        ],
        whyCorrect:
          "Option C correctly identifies the pragmatic and supportive tone toward balancing heritage conservation with contemporary demands.",
        pitfall:
          'Option E ignores that the author explicitly endorses "contemporary energy systems".',
      },
      interactiveWords: ["communal", "utilitarian", "venerable", "integrity"],
    },
  ],
  PK: [
    {
      id: "PK-01",
      subject: "Pengetahuan Kuantitatif",
      subjectId: "PK",
      difficulty: "Latverian Elite",
      passage: `Diberikan fungsi kuadrat f(x) = ax² + bx + c dengan a ≠ 0. Grafik fungsi f memotong sumbu-X di dua titik berlainan (x₁, 0) dan (x₂, 0). Diketahui bahwa x₁ + x₂ = 6 dan x₁ · x₂ = 8.\n\nApakah nilai minimum atau maksimum dari f(x) dapat ditentukan secara pasti?\n\n(1) Nilai f(0) = 16\n(2) Titik puncak kurva berada di kuadran I`,
      question:
        "Putuskan apakah pernyataan (1) dan (2) berikut cukup untuk menjawab pertanyaan tersebut!",
      options: [
        {
          key: "A",
          text: "Pernyataan (1) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (2) SAJA tidak cukup.",
        },
        {
          key: "B",
          text: "Pernyataan (2) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (1) SAJA tidak cukup.",
        },
        {
          key: "C",
          text: "DUA pernyataan BERSAMA-SAMA cukup untuk menjawab pertanyaan, tetapi SATU pernyataan SAJA tidak cukup.",
        },
        {
          key: "D",
          text: "Pernyataan (1) SAJA cukup untuk menjawab pertanyaan dan pernyataan (2) SAJA cukup.",
        },
        {
          key: "E",
          text: "Pernyataan (1) dan pernyataan (2) tidak cukup untuk menjawab pertanyaan.",
        },
      ],
      correctAnswer: "A",
      explanation: {
        concept: "Kecukupan Data (Data Sufficiency) & Karakteristik Parabola",
        stepByStep: [
          "Dari akar-akar x₁ dan x₂: Persamaan kuadrat dasar adalah x² - 6x + 8 = 0. Jadi f(x) = a(x² - 6x + 8).",
          "Puncak parabola terletak di x_p = -b/(2a) = (x₁ + x₂)/2 = 6/2 = 3.",
          "Nilai ekstrem adalah f(3) = a(3² - 6(3) + 8) = a(9 - 18 + 8) = -a.",
          "Pernyataan (1): f(0) = 16. Karena f(0) = a(0 - 0 + 8) = 8a, maka 8a = 16 → a = 2. Karena a = 2 > 0, kurva terbuka ke atas dan memiliki nilai minimum = -a = -2. Nilai minimum dapat ditentukan secara unik! Jadi (1) CUKUP.",
          "Pernyataan (2): Titik puncak di kuadran I. Koordinat puncak adalah (3, -a). Jika di kuadran I, maka -a > 0 → a < 0. Nilai a bisa berapa saja (-1, -5, -1/2), sehingga nilai maksimum -a tidak bisa ditentukan nilainya secara pasti. Jadi (2) TIDAK CUKUP.",
        ],
        whyCorrect:
          "Pernyataan (1) memberikan nilai a = 2 secara presisi sehingga nilai minimum parabola pasti bernilai -2. Sementara pernyataan (2) hanya membatasi tanda tanpa memberikan nilai numerik.",
        pitfall:
          "Siswa sering berasumsi bahwa informasi kuadran cukup untuk menetapkan koordinat spesifik.",
      },
    },
    {
      id: "PK-02",
      subject: "Pengetahuan Kuantitatif",
      subjectId: "PK",
      difficulty: "Standar",
      passage: `Sebuah matriks ordo 2x2 memiliki determinan 12. Jika setiap elemen pada matriks tersebut dikalikan dengan skalar k = 3, maka determinan matriks baru tersebut adalah ...`,
      question: "Berapakah nilai determinan dari matriks yang baru?",
      options: [
        { key: "A", text: "36" },
        { key: "B", text: "72" },
        { key: "C", text: "108" },
        { key: "D", text: "144" },
        { key: "E", text: "216" },
      ],
      correctAnswer: "C",
      explanation: {
        concept: "Sifat Determinan Matriks Ordo n: det(k · A) = kⁿ · det(A)",
        stepByStep: [
          "Diketahui ordo matriks n = 2.",
          "Determinan awal det(A) = 12.",
          "Faktor pengali skalar k = 3.",
          "Berdasarkan teorema determinan: det(k · A) = kⁿ · det(A) = 3² · 12 = 9 · 12 = 108.",
        ],
        whyCorrect:
          "Karena perkalian skalar mempengaruhi setiap baris matriks berordo 2x2, determinan berlipat ganda sebesar 3² = 9.",
        pitfall:
          "Kesalahan umum adalah mengalikan langsung 3 x 12 = 36 (mengabaikan ordo matriks n=2).",
      },
    },
  ],
  PBM: [
    {
      id: "PBM-01",
      subject: "Pemahaman Bacaan dan Menulis",
      subjectId: "PBM",
      difficulty: "Standar",
      passage: `(1) Transformasi sistem pendidikan tinggi memerlukan sinergi antar pemangku kepentingan. (2) Namun demikian, disrupsi teknologi sering kali tidak di imbangi oleh kesiapan pedagogis para tenaga pendidik. (3) Akibatnya, kurikulum baru mengalami stagnansi dalam tahap implementasi teknis. (4) Lembaga akreditasi harusnya memfasilitasi rekualifikasi dosen secara berkala. (5) Hal ini demi menjamin relevansi lulusan di pasar tenaga kerja abad ke-21.`,
      question:
        "Kesalahan penggunaan ejaan dan tanda baca dalam teks di atas terdapat pada kalimat ...",
      options: [
        { key: "A", text: "Kalimat (1) dan (3)" },
        { key: "B", text: "Kalimat (2) dan (3)" },
        { key: "C", text: "Kalimat (2) dan (4)" },
        { key: "D", text: "Kalimat (3) dan (5)" },
        { key: "E", text: "Kalimat (1) dan (4)" },
      ],
      correctAnswer: "B",
      explanation: {
        concept: "PUEBI / EYD Edisi V: Penulisan Kata Berimbuhan dan Kata Baku",
        stepByStep: [
          'Kalimat (2): Kata "di imbangi" salah karena imbuhan pasif "di-" harus ditulis serangkai ("diimbangi"), bukan dipisah seperti kata depan penunjuk tempat.',
          'Kalimat (3): Kata "stagnansi" adalah bentuk tidak baku dari bentuk baku "stagnasi".',
          'Kalimat (1): "antar pemangku kepentingan" penulisan bentuk terikat "antar-" seharusnya serangkai ("antarpemangku"), tetapi kesalahan paling fatal dan eksplisit adalah pada butir (2) dan (3).',
        ],
        whyCorrect:
          'Bentuk tidak baku "di imbangi" (seharusnya "diimbangi") dan "stagnansi" (seharusnya "stagnasi") secara tegas melanggar kaidah tata bahasa baku Indonesia.',
        pitfall:
          'Perhatikan pembedaan antara awalan pembentuk verba pasif "di-" dengan preposisi penunjuk tempat "di".',
      },
    },
  ],
  PPU: [
    {
      id: "PPU-01",
      subject: "Pengetahuan dan Pemahaman Umum",
      subjectId: "PPU",
      difficulty: "Standar",
      passage: `Istilah "tekno-otokrasi" mengacu pada pemusatan kendali institusional melalui pemanfaatan algoritma pengawasan massal dan kepemilikan data terpusat. Dalam tatanan ini, legitimasi kekuasaan tidak lagi bersumber semata dari konsensus elektoral, melainkan efisiensi pemrosesan data real-time untuk memprediksi sekaligus mengendalikan perilaku warga.`,
      question:
        'Makna istilah "legitimasi" dalam paragraf tersebut paling dekat maknanya dengan ...',
      options: [
        { key: "A", text: "Otoritas hukum yang bersifat represif" },
        { key: "B", text: "Keabsahan atau pengakuan yang sah secara prinsip kekuasaan" },
        { key: "C", text: "Dominasi militer dalam menegakkan kedaulatan negara" },
        { key: "D", text: "Kapasitas finansial untuk mendanai birokrasi pemerintahan" },
        { key: "E", text: "Kemampuan teknis aparatur dalam mengolah data publik" },
      ],
      correctAnswer: "B",
      explanation: {
        concept: "Makna Kata Kontekstual & Semantik Istilah Sosio-Politik",
        stepByStep: [
          "Kata dasar: Legitimasi berasal dari bahasa Latin legitimus (sah menurut hukum atau prinsip penerimaan umum).",
          'Dalam konteks teks: "legitimasi kekuasaan bersumber dari..." mengindikasikan dasar keabsahan, mandat, atau pembenaran moral/politis atas wewenang yang dijalankan.',
        ],
        whyCorrect:
          "Keabsahan atau pengakuan yang sah secara prinsip kekuasaan adalah definisi presisi dari istilah legitimasi dalam sains politik.",
        pitfall:
          "Opsi A keliru karena legitimasi belum tentu bersifat represif; legitimasi justru seringkali berupa penerimaan sukarela.",
      },
    },
  ],
  LBI: [
    {
      id: "LBI-01",
      subject: "Literasi Bahasa Indonesia",
      subjectId: "LBI",
      difficulty: "Latverian Elite",
      passage: `Krisis ekologis kontemporer sering kali dipandang secara reduksionis sebatas kegagalan mekanisme pasar dalam menginternalisasi biaya degradasi lingkungan. Pandangan ini mengandaikan bahwa instrumen ekonomi semisal pajak karbon dan bursa kredit emisi sudah mencukupi untuk memulihkan keseimbangan biosfer.\n\nNamun, perspektif ekologi kritis menegaskan bahwa krisis ini berakar pada ontologi modern yang memisahkan manusia secara biner dari alam. Selama alam diposisikan semata sebagai deposit sumber daya inert yang siap diekstraksi tanpa batas demi akumulasi kapital, rekayasa regulasi pasar finansial hijau hanya akan memindahkan titik eksploitasi ke lanskap geografis lain tanpa menyentuh akar kausalitas krisis.`,
      question: "Gagasan utama yang dipertahankan oleh penulis dalam teks tersebut adalah ...",
      options: [
        {
          key: "A",
          text: "Pajak karbon dan bursa emisi merupakan solusi paling efisien untuk memulihkan biosfer global.",
        },
        {
          key: "B",
          text: "Krisis lingkungan hidup timbul akibat ketiadaan alokasi dana dari institusi pasar finansial hijau.",
        },
        {
          key: "C",
          text: "Krisis ekologi tidak dapat diselesaikan hanya dengan instrumen pasar tanpa merombak paradigma pemisahan manusia dari alam.",
        },
        {
          key: "D",
          text: "Ontologi modern telah berhasil menjembatani relasi simbiosis mutualisme antara industri dan ekosistem.",
        },
        {
          key: "E",
          text: "Eksploitasi sumber daya alam dapat diterima selama biaya degradasi lingkungan diinternalisasi oleh korporasi.",
        },
      ],
      correctAnswer: "C",
      explanation: {
        concept: "Penentuan Ide Pokok & Argumen Sentral Esai Analitis",
        stepByStep: [
          "Paragraf 1 memaparkan pandangan reduksionis pasar (antitesis).",
          'Paragraf 2 menyajikan sanggahan penulis yang dimulai dengan konjungsi antarkalimat pertentangan "Namun..." (sintesis utama).',
          "Penulis secara eksplisit menyatakan bahwa instrumen pasar hijau tidak menyentuh akar masalah selama cara pandang (ontologi) manusia terhadap alam tidak diubah.",
        ],
        whyCorrect:
          "Opsi C merangkum sintesis menyeluruh dari kedua paragraf: menolak kecukupan solusi pasar semata dan menuntut transformasi paradigma relasi manusia-alam.",
        pitfall: "Opsi A justru merupakan pandangan yang dibantah oleh penulis di paragraf kedua.",
      },
    },
  ],
  PM: [
    {
      id: "PM-01",
      subject: "Penalaran Matematika",
      subjectId: "PM",
      difficulty: "Latverian Elite",
      passage: `Laboratorium Rekayasa Energi Latveria mengembangkan generator mikro-hidro. Biaya operasional harian generator (dalam ribuan Latverian Dinar) dimodelkan oleh fungsi kuadrat B(x) = 2x² - 80x + 1200, dengan x adalah daya listrik yang dibangkitkan (dalam satuan Megawatt). Daya listrik maksimal yang aman dihasilkan generator adalah 35 MW.`,
      question:
        "Daya listrik yang harus dibangkitkan agar biaya operasional harian mencapai minimum serta besar biaya minimum tersebut adalah ...",
      options: [
        { key: "A", text: "20 MW dengan biaya 400 ribu Dinar" },
        { key: "B", text: "20 MW dengan biaya 800 ribu Dinar" },
        { key: "C", text: "25 MW dengan biaya 450 ribu Dinar" },
        { key: "D", text: "35 MW dengan biaya 850 ribu Dinar" },
        { key: "E", text: "15 MW dengan biaya 600 ribu Dinar" },
      ],
      correctAnswer: "A",
      explanation: {
        concept: "Aplikasi Turunan Pertama & Nilai Ekstrem Fungsi Kuadrat",
        stepByStep: [
          "Fungsi biaya: B(x) = 2x² - 80x + 1200.",
          "Nilai minimum tercapai saat turunan pertama B'(x) = 0.",
          "B'(x) = 4x - 80 = 0 → 4x = 80 → x = 20 MW.",
          "Periksa batasan: x = 20 MW berada di bawah batas maksimal 35 MW (memenuhi syarat kelayakan operasional).",
          "Hitung biaya minimum: B(20) = 2(20)² - 80(20) + 1200 = 2(400) - 1600 + 1200 = 800 - 1600 + 1200 = 400 ribu Dinar.",
        ],
        whyCorrect:
          "Sumbu simetri parabola menghasilkan titik minimum di x = 20 MW dengan substitusi nilai sebesar 400 ribu Dinar.",
        pitfall:
          "Kesalahan perhitungan aritmatika tanda minus saat mengevaluasi nilai fungsi kuadrat.",
      },
    },
  ],
};
