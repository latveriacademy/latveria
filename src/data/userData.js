// LATVERIA SCHOLAR DOSSIER — CURRENT USER RECORD

export const DEFAULT_USER = {
  id: 'LTV-0824',
  name: 'Nashki',
  codename: 'Warrior Nashki',
  title: 'Citizen-Scholar of Latveria',
  institution: 'Imperial Academy of Sciences & Strategy',
  targetUniversity: 'Universitas Indonesia — Kedokteran (Pilihan 1)',
  secondaryTarget: 'Institut Teknologi Bandung — STEI-R (Pilihan 2)',
  bio: 'Dedikasi tanpa kompromi untuk penguasaan penalaran analitis dan literasi tingkat lanjut.',
  motto: 'Knowledge is power. Latveria demands both.',
  level: 8,
  currentXP: 1240,
  nextLevelXP: 2000,
  streakDays: 12,
  accuracy: 84.7,
  questionsCompleted: 420,
  practiceHours: 38.5,
  currentRank: 14,
  cohortTotal: 840,
  joinedDate: 'August 2025',
  status: 'ACTIVE • PROTOCOL COMPLIANT',
  securityClearance: 'TIER-3 SCHOLASTIC',
  
  todayTraining: [
    { id: 'tt-1', subject: 'Penalaran Umum', subjectId: 'PU', count: 10, completed: true, xp: 50 },
    { id: 'tt-2', subject: 'Pengetahuan & Pemahaman Umum', subjectId: 'PPU', count: 10, completed: true, xp: 50 },
    { id: 'tt-3', subject: 'Pemahaman Bacaan & Menulis', subjectId: 'PBM', count: 5, completed: true, xp: 30 },
    { id: 'tt-4', subject: 'Pengetahuan Kuantitatif', subjectId: 'PK', count: 10, completed: false, xp: 60 },
    { id: 'tt-5', subject: 'Literasi Bahasa Inggris', subjectId: 'LBE', count: 5, completed: false, xp: 40 }
  ],

  recentActivities: [
    { id: 'act-1', code: 'PU', subject: 'Penalaran Umum', title: 'Selesai 20 Soal Analisis Logika Deduktif', xp: 80, time: '2 jam lalu', accuracy: '85%' },
    { id: 'act-2', code: 'LBE', subject: 'Literasi Bahasa Inggris', title: 'Sesi Critical Reading: Epistemic Hegemony', xp: 50, time: 'Kemarin, 21:40', accuracy: '90%' },
    { id: 'act-3', code: 'PBM', subject: 'Pemahaman Bacaan & Menulis', title: 'Tuntas Evaluasi Kalimat Efektif & PUEBI', xp: 100, time: '2 hari lalu', accuracy: '92%' },
    { id: 'act-4', code: 'PK', subject: 'Pengetahuan Kuantitatif', title: 'Kecukupan Data & Geometri Analitik', xp: 65, time: '3 hari lalu', accuracy: '80%' }
  ],

  weeklyChartData: [
    { day: 'Sen', fullDay: 'Senin', questions: 45, xp: 280, accuracy: 82 },
    { day: 'Sel', fullDay: 'Selasa', questions: 60, xp: 390, accuracy: 88 },
    { day: 'Rab', fullDay: 'Rabu', questions: 55, xp: 340, accuracy: 85 },
    { day: 'Kam', fullDay: 'Kamis', questions: 40, xp: 260, accuracy: 80 },
    { day: 'Jum', fullDay: 'Jumat', questions: 70, xp: 450, accuracy: 87 },
    { day: 'Sab', fullDay: 'Sabtu', questions: 85, xp: 560, accuracy: 91 },
    { day: 'Min', fullDay: 'Minggu', questions: 65, xp: 410, accuracy: 89 }
  ],

  subjectMastery: [
    { id: 'PU', name: 'Penalaran Umum', mastery: 88, status: 'Distinction' },
    { id: 'PPU', name: 'Pengetahuan & Pemahaman Umum', mastery: 82, status: 'Proficient' },
    { id: 'PBM', name: 'Pemahaman Bacaan & Menulis', mastery: 91, status: 'Exemplary' },
    { id: 'PK', name: 'Pengetahuan Kuantitatif', mastery: 76, status: 'Solid' },
    { id: 'LBI', name: 'Literasi Bahasa Indonesia', mastery: 89, status: 'Exemplary' },
    { id: 'LBE', name: 'Literasi Bahasa Inggris', mastery: 86, status: 'Distinction' },
    { id: 'PM', name: 'Penalaran Matematika', mastery: 79, status: 'Solid' }
  ]
};
