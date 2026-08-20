const STUDENT_DATA = {
  "meta": {
    "schoolName": "SMK Puncak Alam 3",
    "programName": "Program Bijak Membaca",
    "year": "2026",
    "levels": [
      { "name": "Mengenal Huruf", "short": "L1" },
      { "name": "Suku Kata", "short": "L2" },
      { "name": "Perkataan", "short": "L3" },
      { "name": "Ayat Mudah", "short": "L4" },
      { "name": "Perenggan", "short": "L5" },
      { "name": "Buku & Petikan", "short": "L6" }
    ]
  },
  "students": [
    {
      "id": "s01",
      "name": "Aisyah Binti Ahmad",
      "class": "1 Arif",
      "gender": "P",
      "currentLevel": 3,
      "attendance": [
        { "d": "2026-07-14", "s": "h" },
        { "d": "2026-07-16", "s": "h" },
        { "d": "2026-07-21", "s": "h" },
        { "d": "2026-07-23", "s": "h" },
        { "d": "2026-07-28", "s": "h" },
        { "d": "2026-07-30", "s": "h" },
        { "d": "2026-08-04", "s": "h" },
        { "d": "2026-08-06", "s": "h" },
        { "d": "2026-08-11", "s": "h" },
        { "d": "2026-08-13", "s": "h" },
        { "d": "2026-08-18", "s": "h" }
      ],
      "quizzes": [
        { "d": "2026-07-17", "t": "Kuiz Suku Kata", "s": 88 },
        { "d": "2026-07-31", "t": "Kuiz Perkataan 1", "s": 85 },
        { "d": "2026-08-14", "t": "Kuiz Perkataan 2", "s": 92 }
      ],
      "vocabulary": ["bapa", "ibu", "kakak", "abang", "sekolah", "buku", "guru", "murid"]
    },
    {
      "id": "s02",
      "name": "Muhammad Danish Bin Zulkifli",
      "class": "1 Arif",
      "gender": "L",
      "currentLevel": 2,
      "attendance": [
        { "d": "2026-07-14", "s": "h" },
        { "d": "2026-07-16", "s": "h" },
        { "d": "2026-07-21", "s": "a" },
        { "d": "2026-07-23", "s": "h" },
        { "d": "2026-07-28", "s": "h" },
        { "d": "2026-07-30", "s": "h" },
        { "d": "2026-08-04", "s": "h" },
        { "d": "2026-08-06", "s": "h" },
        { "d": "2026-08-11", "s": "h" },
        { "d": "2026-08-13", "s": "h" },
        { "d": "2026-08-18", "s": "h" }
      ],
      "quizzes": [
        { "d": "2026-07-17", "t": "Kuiz Suku Kata", "s": 72 },
        { "d": "2026-07-31", "t": "Kuiz Perkataan 1", "s": 68 },
        { "d": "2026-08-14", "t": "Kuiz Perkataan 2", "s": 75 }
      ],
      "vocabulary": ["bapa", "ibu", "kakak", "sekolah", "buku", "guru"]
    },
    {
      "id": "s03",
      "name": "Nurul Iman Binti Hassan",
      "class": "1 Arif",
      "gender": "P",
      "currentLevel": 4,
      "attendance": [
        { "d": "2026-07-14", "s": "h" },
        { "d": "2026-07-16", "s": "h" },
        { "d": "2026-07-21", "s": "h" },
        { "d": "2026-07-23", "s": "a" },
        { "d": "2026-07-28", "s": "h" },
        { "d": "2026-07-30", "s": "h" },
        { "d": "2026-08-04", "s": "h" },
        { "d": "2026-08-06", "s": "h" },
        { "d": "2026-08-11", "s": "h" },
        { "d": "2026-08-13", "s": "h" },
        { "d": "2026-08-18", "s": "h" }
      ],
      "quizzes": [
        { "d": "2026-07-17", "t": "Kuiz Suku Kata", "s": 90 },
        { "d": "2026-07-31", "t": "Kuiz Perkataan 1", "s": 88 },
        { "d": "2026-08-14", "t": "Kuiz Ayat Mudah", "s": 90 }
      ],
      "vocabulary": ["bapa", "ibu", "kakak", "abang", "sekolah", "buku", "guru", "murid", "kelas", "pensel"]
    },
    {
      "id": "s04",
      "name": "Faris Hakim Bin Azman",
      "class": "1 Bestari",
      "gender": "L",
      "currentLevel": 1,
      "attendance": [
        { "d": "2026-07-14", "s": "h" },
        { "d": "2026-07-16", "s": "a" },
        { "d": "2026-07-21", "s": "h" },
        { "d": "2026-07-23", "s": "h" },
        { "d": "2026-07-28", "s": "h" },
        { "d": "2026-07-30", "s": "h" },
        { "d": "2026-08-04", "s": "h" },
        { "d": "2026-08-06", "s": "a" },
        { "d": "2026-08-11", "s": "h" },
        { "d": "2026-08-13", "s": "h" },
        { "d": "2026-08-18", "s": "h" }
      ],
      "quizzes": [
        { "d": "2026-07-17", "t": "Kuiz Suku Kata", "s": 60 },
        { "d": "2026-07-31", "t": "Kuiz Suku Kata 2", "s": 64 },
        { "d": "2026-08-14", "t": "Kuiz Suku Kata 3", "s": 70 }
      ],
      "vocabulary": ["bapa", "ibu", "buku", "guru"]
    },
    {
      "id": "s05",
      "name": "Siti Aisyah Binti Rahman",
      "class": "1 Bestari",
      "gender": "P",
      "currentLevel": 3,
      "attendance": [
        { "d": "2026-07-14", "s": "h" },
        { "d": "2026-07-16", "s": "h" },
        { "d": "2026-07-21", "s": "h" },
        { "d": "2026-07-23", "s": "h" },
        { "d": "2026-07-28", "s": "h" },
        { "d": "2026-07-30", "s": "a" },
        { "d": "2026-08-04", "s": "h" },
        { "d": "2026-08-06", "s": "h" },
        { "d": "2026-08-11", "s": "h" },
        { "d": "2026-08-13", "s": "h" },
        { "d": "2026-08-18", "s": "h" }
      ],
      "quizzes": [
        { "d": "2026-07-17", "t": "Kuiz Suku Kata", "s": 80 },
        { "d": "2026-07-31", "t": "Kuiz Perkataan 1", "s": 82 },
        { "d": "2026-08-14", "t": "Kuiz Perkataan 2", "s": 78 }
      ],
      "vocabulary": ["bapa", "ibu", "kakak", "sekolah", "buku", "guru", "murid", "kelas"]
    },
    {
      "id": "s06",
      "name": "Ahmad Zafran Bin Ismail",
      "class": "1 Bestari",
      "gender": "L",
      "currentLevel": 2,
      "attendance": [
        { "d": "2026-07-14", "s": "h" },
        { "d": "2026-07-16", "s": "h" },
        { "d": "2026-07-21", "s": "h" },
        { "d": "2026-07-23", "s": "h" },
        { "d": "2026-07-28", "s": "a" },
        { "d": "2026-07-30", "s": "h" },
        { "d": "2026-08-04", "s": "h" },
        { "d": "2026-08-06", "s": "h" },
        { "d": "2026-08-11", "s": "h" },
        { "d": "2026-08-13", "s": "h" },
        { "d": "2026-08-18", "s": "h" }
      ],
      "quizzes": [
        { "d": "2026-07-17", "t": "Kuiz Suku Kata", "s": 74 },
        { "d": "2026-07-31", "t": "Kuiz Perkataan 1", "s": 71 },
        { "d": "2026-08-14", "t": "Kuiz Perkataan 2", "s": 76 }
      ],
      "vocabulary": ["bapa", "ibu", "kakak", "sekolah", "buku", "guru"]
    }
  ]
};