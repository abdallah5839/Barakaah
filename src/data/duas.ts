/**
 * Données des Dua & Invocations
 * Collection complète de Duas islamiques chiites
 */

import { Dua, DuaCategoryInfo, DuaCategory } from '../types/dua';

// Informations sur les catégories
export const duaCategories: DuaCategoryInfo[] = [
  {
    id: 'speciales',
    arabicName: 'الأدعية الخاصة',
    frenchName: 'Dua Chiites Spéciales',
    description: 'Les invocations les plus importantes de la tradition chiite',
    icon: 'star',
    color: '#D4AF37', // Or
  },
  {
    id: 'quotidiennes',
    arabicName: 'الأدعية اليومية',
    frenchName: 'Dua Quotidiennes',
    description: 'Invocations pour chaque moment de la journée',
    icon: 'sunny',
    color: '#059669', // Vert
  },
  {
    id: 'apres-priere',
    arabicName: 'أدعية بعد الصلاة',
    frenchName: 'Dua Après Prière',
    description: 'Invocations à réciter après les prières obligatoires',
    icon: 'time',
    color: '#3B82F6', // Bleu
  },
  {
    id: 'occasions',
    arabicName: 'أدعية المناسبات',
    frenchName: 'Dua pour Occasions',
    description: 'Invocations pour les occasions spéciales et fêtes',
    icon: 'calendar',
    color: '#8B5CF6', // Violet
  },
];

// Collection complète des Duas
export const duas: Dua[] = [
  // ═══════════════════════════════════════════════════════════════
  // CATÉGORIE 1: DUA CHIITES SPÉCIALES (Prioritaires)
  // ═══════════════════════════════════════════════════════════════

  // 1. DUA KUMAYL
  {
    id: 'kumayl',
    arabicName: 'دعاء كميل',
    frenchName: 'Dua Kumayl',
    description: 'Dua enseignée par l\'Imam Ali (as) à Kumayl ibn Ziyad. Cette invocation est l\'une des plus importantes et des plus récitées dans la tradition chiite, recommandée particulièrement le jeudi soir.',
    occasion: 'Jeudi soir (Laylat al-Jum\'a)',
    duration: '15 min',
    durationMinutes: 15,
    importance: 'tres-haute',
    category: 'speciales',
    reminder: 'thursday-night',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_KUMAYL',
    reciter: 'Mishary Al-Afasy',
    keywords: ['kumayl', 'kumeil', 'jeudi', 'imam ali', 'pardon', 'repentir'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Section 1 du texte arabe de Dua Kumayl]',
        french: '[PLACEHOLDER - Section 1 de la traduction française de Dua Kumayl]',
        phonetic: '[PLACEHOLDER - Section 1 de la phonétique de Dua Kumayl]',
      },
      {
        id: 2,
        arabic: '[PLACEHOLDER - Section 2 du texte arabe de Dua Kumayl]',
        french: '[PLACEHOLDER - Section 2 de la traduction française de Dua Kumayl]',
        phonetic: '[PLACEHOLDER - Section 2 de la phonétique de Dua Kumayl]',
      },
      {
        id: 3,
        arabic: '[PLACEHOLDER - Section 3 du texte arabe de Dua Kumayl]',
        french: '[PLACEHOLDER - Section 3 de la traduction française de Dua Kumayl]',
        phonetic: '[PLACEHOLDER - Section 3 de la phonétique de Dua Kumayl]',
      },
      {
        id: 4,
        arabic: '[PLACEHOLDER - Section 4 du texte arabe de Dua Kumayl]',
        french: '[PLACEHOLDER - Section 4 de la traduction française de Dua Kumayl]',
        phonetic: '[PLACEHOLDER - Section 4 de la phonétique de Dua Kumayl]',
      },
      {
        id: 5,
        arabic: '[PLACEHOLDER - Section 5 du texte arabe de Dua Kumayl]',
        french: '[PLACEHOLDER - Section 5 de la traduction française de Dua Kumayl]',
        phonetic: '[PLACEHOLDER - Section 5 de la phonétique de Dua Kumayl]',
      },
    ],
  },

  // 2. DUA TAWASSUL
  {
    id: 'tawassul',
    arabicName: 'دعاء التوسل',
    frenchName: 'Dua Tawassul',
    description: 'Dua d\'intercession par les Ahl ul-Bayt (as). Cette invocation permet de se rapprocher d\'Allah par l\'intercession du Prophète (sawas) et de sa famille pure.',
    occasion: 'Toute occasion',
    duration: '10 min',
    durationMinutes: 10,
    importance: 'haute',
    category: 'speciales',
    reminder: 'none',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_TAWASSUL',
    reciter: 'Mishary Al-Afasy',
    keywords: ['tawassul', 'intercession', 'ahl ul-bayt', 'prophète', 'fatima', 'hassan', 'hussein', 'imams'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Section 1 du texte arabe de Dua Tawassul]',
        french: '[PLACEHOLDER - Section 1 de la traduction française de Dua Tawassul]',
        phonetic: '[PLACEHOLDER - Section 1 de la phonétique de Dua Tawassul]',
      },
      {
        id: 2,
        arabic: '[PLACEHOLDER - Section 2 du texte arabe de Dua Tawassul]',
        french: '[PLACEHOLDER - Section 2 de la traduction française de Dua Tawassul]',
        phonetic: '[PLACEHOLDER - Section 2 de la phonétique de Dua Tawassul]',
      },
      {
        id: 3,
        arabic: '[PLACEHOLDER - Section 3 du texte arabe de Dua Tawassul]',
        french: '[PLACEHOLDER - Section 3 de la traduction française de Dua Tawassul]',
        phonetic: '[PLACEHOLDER - Section 3 de la phonétique de Dua Tawassul]',
      },
      {
        id: 4,
        arabic: '[PLACEHOLDER - Section 4 du texte arabe de Dua Tawassul]',
        french: '[PLACEHOLDER - Section 4 de la traduction française de Dua Tawassul]',
        phonetic: '[PLACEHOLDER - Section 4 de la phonétique de Dua Tawassul]',
      },
    ],
  },

  // 3. ZIYARAT ASHURA
  {
    id: 'ziyarat-ashura',
    arabicName: 'زيارة عاشوراء',
    frenchName: 'Ziyarat Ashura',
    description: 'Ziyarat (visite spirituelle) de l\'Imam Hussein (as). Cette invocation commémore le sacrifice de Karbala et est particulièrement récitée le jour d\'Ashura et pendant le mois de Muharram.',
    occasion: 'Jour d\'Ashura / Muharram',
    duration: '20 min',
    durationMinutes: 20,
    importance: 'tres-haute',
    category: 'speciales',
    reminder: 'ashura',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_ZIYARAT_ASHURA',
    reciter: 'Mishary Al-Afasy',
    keywords: ['ziyarat', 'ashura', 'hussein', 'karbala', 'muharram', 'imam hussein'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Section 1 du texte arabe de Ziyarat Ashura]',
        french: '[PLACEHOLDER - Section 1 de la traduction française de Ziyarat Ashura]',
        phonetic: '[PLACEHOLDER - Section 1 de la phonétique de Ziyarat Ashura]',
      },
      {
        id: 2,
        arabic: '[PLACEHOLDER - Section 2 du texte arabe de Ziyarat Ashura]',
        french: '[PLACEHOLDER - Section 2 de la traduction française de Ziyarat Ashura]',
        phonetic: '[PLACEHOLDER - Section 2 de la phonétique de Ziyarat Ashura]',
      },
      {
        id: 3,
        arabic: '[PLACEHOLDER - Section 3 du texte arabe de Ziyarat Ashura]',
        french: '[PLACEHOLDER - Section 3 de la traduction française de Ziyarat Ashura]',
        phonetic: '[PLACEHOLDER - Section 3 de la phonétique de Ziyarat Ashura]',
      },
      {
        id: 4,
        arabic: '[PLACEHOLDER - Section 4 du texte arabe de Ziyarat Ashura]',
        french: '[PLACEHOLDER - Section 4 de la traduction française de Ziyarat Ashura]',
        phonetic: '[PLACEHOLDER - Section 4 de la phonétique de Ziyarat Ashura]',
      },
      {
        id: 5,
        arabic: '[PLACEHOLDER - Section 5 du texte arabe de Ziyarat Ashura]',
        french: '[PLACEHOLDER - Section 5 de la traduction française de Ziyarat Ashura]',
        phonetic: '[PLACEHOLDER - Section 5 de la phonétique de Ziyarat Ashura]',
      },
      {
        id: 6,
        arabic: '[PLACEHOLDER - Section 6 du texte arabe de Ziyarat Ashura - Les 100 malédictions]',
        french: '[PLACEHOLDER - Section 6 de la traduction française de Ziyarat Ashura - Les 100 malédictions]',
        phonetic: '[PLACEHOLDER - Section 6 de la phonétique de Ziyarat Ashura - Les 100 malédictions]',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATÉGORIE 2: DUA QUOTIDIENNES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'dua-matin',
    arabicName: 'دعاء الصباح',
    frenchName: 'Dua du Matin',
    description: 'Invocation recommandée à réciter chaque matin pour commencer la journée avec la bénédiction d\'Allah.',
    occasion: 'Chaque matin',
    duration: '5 min',
    durationMinutes: 5,
    importance: 'moyenne',
    category: 'quotidiennes',
    reminder: 'daily',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_MATIN',
    reciter: 'Mishary Al-Afasy',
    keywords: ['matin', 'sabah', 'réveil', 'journée', 'quotidien'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua du Matin]',
        french: '[PLACEHOLDER - Traduction française de Dua du Matin]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua du Matin]',
      },
    ],
  },

  {
    id: 'dua-soir',
    arabicName: 'دعاء المساء',
    frenchName: 'Dua du Soir',
    description: 'Invocation recommandée à réciter chaque soir pour remercier Allah et demander sa protection pendant la nuit.',
    occasion: 'Chaque soir',
    duration: '5 min',
    durationMinutes: 5,
    importance: 'moyenne',
    category: 'quotidiennes',
    reminder: 'daily',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_SOIR',
    reciter: 'Mishary Al-Afasy',
    keywords: ['soir', 'masa', 'nuit', 'coucher', 'quotidien'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua du Soir]',
        french: '[PLACEHOLDER - Traduction française de Dua du Soir]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua du Soir]',
      },
    ],
  },

  {
    id: 'dua-repas',
    arabicName: 'دعاء الطعام',
    frenchName: 'Dua avant le Repas',
    description: 'Invocation à réciter avant de manger pour bénir la nourriture.',
    occasion: 'Avant les repas',
    duration: '1 min',
    durationMinutes: 1,
    importance: 'moyenne',
    category: 'quotidiennes',
    reminder: 'none',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_REPAS',
    reciter: 'Mishary Al-Afasy',
    keywords: ['repas', 'manger', 'nourriture', 'bénédiction'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua avant le Repas]',
        french: '[PLACEHOLDER - Traduction française de Dua avant le Repas]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua avant le Repas]',
      },
    ],
  },

  {
    id: 'dua-sortie',
    arabicName: 'دعاء الخروج من البيت',
    frenchName: 'Dua en Sortant de la Maison',
    description: 'Invocation à réciter en quittant la maison pour demander la protection d\'Allah.',
    occasion: 'En sortant de la maison',
    duration: '1 min',
    durationMinutes: 1,
    importance: 'moyenne',
    category: 'quotidiennes',
    reminder: 'none',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_SORTIE',
    reciter: 'Mishary Al-Afasy',
    keywords: ['sortie', 'maison', 'voyage', 'protection'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua en Sortant]',
        french: '[PLACEHOLDER - Traduction française de Dua en Sortant]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua en Sortant]',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATÉGORIE 3: DUA APRÈS PRIÈRE
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'tasbih-zahra',
    arabicName: 'تسبيح الزهراء',
    frenchName: 'Tasbih de Fatima Zahra (as)',
    description: 'Le Tasbih enseigné par le Prophète (sawas) à sa fille Fatima (as). 34 fois Allahu Akbar, 33 fois Alhamdulillah, 33 fois Subhanallah.',
    occasion: 'Après chaque prière',
    duration: '3 min',
    durationMinutes: 3,
    importance: 'haute',
    category: 'apres-priere',
    reminder: 'none',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_TASBIH',
    reciter: 'Mishary Al-Afasy',
    keywords: ['tasbih', 'fatima', 'zahra', 'prière', 'dhikr'],
    sections: [
      {
        id: 1,
        arabic: 'اللهُ أَكْبَرُ (٣٤ مرة)',
        french: 'Allah est le Plus Grand (34 fois)',
        phonetic: 'Allahu Akbar (34 fois)',
      },
      {
        id: 2,
        arabic: 'الْحَمْدُ لِلّهِ (٣٣ مرة)',
        french: 'Louange à Allah (33 fois)',
        phonetic: 'Alhamdulillah (33 fois)',
      },
      {
        id: 3,
        arabic: 'سُبْحَانَ اللهِ (٣٣ مرة)',
        french: 'Gloire à Allah (33 fois)',
        phonetic: 'Subhanallah (33 fois)',
      },
    ],
  },

  {
    id: 'dua-apres-fajr',
    arabicName: 'دعاء بعد صلاة الفجر',
    frenchName: 'Dua après Fajr',
    description: 'Invocation recommandée après la prière de l\'aube.',
    occasion: 'Après la prière de Fajr',
    duration: '3 min',
    durationMinutes: 3,
    importance: 'moyenne',
    category: 'apres-priere',
    reminder: 'none',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_APRES_FAJR',
    reciter: 'Mishary Al-Afasy',
    keywords: ['fajr', 'aube', 'matin', 'prière'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua après Fajr]',
        french: '[PLACEHOLDER - Traduction française de Dua après Fajr]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua après Fajr]',
      },
    ],
  },

  {
    id: 'dua-apres-maghrib',
    arabicName: 'دعاء بعد صلاة المغرب',
    frenchName: 'Dua après Maghrib',
    description: 'Invocation recommandée après la prière du coucher du soleil.',
    occasion: 'Après la prière de Maghrib',
    duration: '3 min',
    durationMinutes: 3,
    importance: 'moyenne',
    category: 'apres-priere',
    reminder: 'none',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_APRES_MAGHRIB',
    reciter: 'Mishary Al-Afasy',
    keywords: ['maghrib', 'coucher', 'soir', 'prière'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua après Maghrib]',
        french: '[PLACEHOLDER - Traduction française de Dua après Maghrib]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua après Maghrib]',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CATÉGORIE 4: DUA POUR OCCASIONS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'dua-ramadan',
    arabicName: 'دعاء شهر رمضان',
    frenchName: 'Dua du Ramadan',
    description: 'Invocation spéciale pour le mois béni du Ramadan.',
    occasion: 'Mois de Ramadan',
    duration: '5 min',
    durationMinutes: 5,
    importance: 'haute',
    category: 'occasions',
    reminder: 'ramadan',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_RAMADAN',
    reciter: 'Mishary Al-Afasy',
    keywords: ['ramadan', 'jeûne', 'iftar', 'suhur'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua du Ramadan]',
        french: '[PLACEHOLDER - Traduction française de Dua du Ramadan]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua du Ramadan]',
      },
    ],
  },

  {
    id: 'dua-iftar',
    arabicName: 'دعاء الإفطار',
    frenchName: 'Dua de l\'Iftar',
    description: 'Invocation à réciter au moment de rompre le jeûne.',
    occasion: 'Rupture du jeûne',
    duration: '1 min',
    durationMinutes: 1,
    importance: 'haute',
    category: 'occasions',
    reminder: 'ramadan',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_IFTAR',
    reciter: 'Mishary Al-Afasy',
    keywords: ['iftar', 'jeûne', 'ramadan', 'rupture'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua Iftar]',
        french: '[PLACEHOLDER - Traduction française de Dua Iftar]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua Iftar]',
      },
    ],
  },

  {
    id: 'dua-laylat-qadr',
    arabicName: 'دعاء ليلة القدر',
    frenchName: 'Dua de Laylat al-Qadr',
    description: 'Invocation pour la Nuit du Destin, la nuit la plus bénie de l\'année.',
    occasion: 'Nuit du Destin',
    duration: '10 min',
    durationMinutes: 10,
    importance: 'tres-haute',
    category: 'occasions',
    reminder: 'ramadan',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_LAYLAT_QADR',
    reciter: 'Mishary Al-Afasy',
    keywords: ['laylat', 'qadr', 'destin', 'nuit', 'ramadan'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Texte arabe de Dua Laylat al-Qadr]',
        french: '[PLACEHOLDER - Traduction française de Dua Laylat al-Qadr]',
        phonetic: '[PLACEHOLDER - Phonétique de Dua Laylat al-Qadr]',
      },
    ],
  },

  {
    id: 'dua-arafat',
    arabicName: 'دعاء يوم عرفة',
    frenchName: 'Dua du Jour d\'Arafat',
    description: 'Invocation de l\'Imam Hussein (as) pour le jour d\'Arafat, veille de l\'Aïd al-Adha.',
    occasion: 'Jour d\'Arafat',
    duration: '30 min',
    durationMinutes: 30,
    importance: 'tres-haute',
    category: 'occasions',
    reminder: 'none',
    audioUrl: 'PLACEHOLDER_AUDIO_URL_ARAFAT',
    reciter: 'Mishary Al-Afasy',
    keywords: ['arafat', 'hajj', 'hussein', 'aid', 'adha'],
    sections: [
      {
        id: 1,
        arabic: '[PLACEHOLDER - Section 1 du texte arabe de Dua Arafat]',
        french: '[PLACEHOLDER - Section 1 de la traduction française de Dua Arafat]',
        phonetic: '[PLACEHOLDER - Section 1 de la phonétique de Dua Arafat]',
      },
      {
        id: 2,
        arabic: '[PLACEHOLDER - Section 2 du texte arabe de Dua Arafat]',
        french: '[PLACEHOLDER - Section 2 de la traduction française de Dua Arafat]',
        phonetic: '[PLACEHOLDER - Section 2 de la phonétique de Dua Arafat]',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════

/**
 * Obtenir toutes les Duas d'une catégorie
 */
export const getDuasByCategory = (category: DuaCategory): Dua[] => {
  return duas.filter(dua => dua.category === category);
};

/**
 * Obtenir les 3 Duas prioritaires (importantes)
 */
export const getImportantDuas = (): Dua[] => {
  return duas.filter(dua =>
    dua.id === 'kumayl' ||
    dua.id === 'tawassul' ||
    dua.id === 'ziyarat-ashura'
  );
};

/**
 * Obtenir une Dua par son ID
 */
export const getDuaById = (id: string): Dua | undefined => {
  return duas.find(dua => dua.id === id);
};

/**
 * Rechercher des Duas par texte
 */
export const searchDuas = (query: string): Dua[] => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return duas;

  return duas.filter(dua =>
    dua.frenchName.toLowerCase().includes(normalizedQuery) ||
    dua.arabicName.includes(normalizedQuery) ||
    dua.keywords.some(keyword => keyword.toLowerCase().includes(normalizedQuery)) ||
    dua.description.toLowerCase().includes(normalizedQuery)
  );
};

/**
 * Obtenir les informations d'une catégorie
 */
export const getCategoryInfo = (categoryId: DuaCategory): DuaCategoryInfo | undefined => {
  return duaCategories.find(cat => cat.id === categoryId);
};

/**
 * Obtenir une Dua aléatoire pour "Dua du jour"
 */
export const getRandomDua = (): Dua => {
  const randomIndex = Math.floor(Math.random() * duas.length);
  return duas[randomIndex];
};

/**
 * Obtenir la Dua du jour basée sur la date
 */
export const getDuaOfTheDay = (): Dua => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % duas.length;
  return duas[index];
};

export default duas;
