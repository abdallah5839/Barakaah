/**
 * Données statiques des 30 Juz du Coran
 * Chaque Juz contient ses délimitations (sourate/verset de début et fin)
 */

import { JuzInfo } from '../types/circle.types';

/**
 * Liste complète des 30 Juz avec leurs délimitations exactes
 * Référence : Division traditionnelle du Coran en 30 parties égales
 */
export const JUZ_DATA: JuzInfo[] = [
  {
    number: 1,
    start_surah: 'Al-Fatiha',
    start_surah_number: 1,
    start_verse: 1,
    end_surah: 'Al-Baqarah',
    end_surah_number: 2,
    end_verse: 141,
    name_ar: 'الم',
  },
  {
    number: 2,
    start_surah: 'Al-Baqarah',
    start_surah_number: 2,
    start_verse: 142,
    end_surah: 'Al-Baqarah',
    end_surah_number: 2,
    end_verse: 252,
    name_ar: 'سَيَقُولُ',
  },
  {
    number: 3,
    start_surah: 'Al-Baqarah',
    start_surah_number: 2,
    start_verse: 253,
    end_surah: 'Al-Imran',
    end_surah_number: 3,
    end_verse: 92,
    name_ar: 'تِلْكَ الرُّسُلُ',
  },
  {
    number: 4,
    start_surah: 'Al-Imran',
    start_surah_number: 3,
    start_verse: 93,
    end_surah: 'An-Nisa',
    end_surah_number: 4,
    end_verse: 23,
    name_ar: 'لَنْ تَنَالُوا',
  },
  {
    number: 5,
    start_surah: 'An-Nisa',
    start_surah_number: 4,
    start_verse: 24,
    end_surah: 'An-Nisa',
    end_surah_number: 4,
    end_verse: 147,
    name_ar: 'وَالْمُحْصَنَاتُ',
  },
  {
    number: 6,
    start_surah: 'An-Nisa',
    start_surah_number: 4,
    start_verse: 148,
    end_surah: 'Al-Ma\'idah',
    end_surah_number: 5,
    end_verse: 81,
    name_ar: 'لَا يُحِبُّ اللَّهُ',
  },
  {
    number: 7,
    start_surah: 'Al-Ma\'idah',
    start_surah_number: 5,
    start_verse: 82,
    end_surah: 'Al-An\'am',
    end_surah_number: 6,
    end_verse: 110,
    name_ar: 'لَتَجِدَنَّ',
  },
  {
    number: 8,
    start_surah: 'Al-An\'am',
    start_surah_number: 6,
    start_verse: 111,
    end_surah: 'Al-A\'raf',
    end_surah_number: 7,
    end_verse: 87,
    name_ar: 'وَلَوْ أَنَّنَا',
  },
  {
    number: 9,
    start_surah: 'Al-A\'raf',
    start_surah_number: 7,
    start_verse: 88,
    end_surah: 'Al-Anfal',
    end_surah_number: 8,
    end_verse: 40,
    name_ar: 'قَالَ الْمَلَأُ',
  },
  {
    number: 10,
    start_surah: 'Al-Anfal',
    start_surah_number: 8,
    start_verse: 41,
    end_surah: 'At-Tawbah',
    end_surah_number: 9,
    end_verse: 92,
    name_ar: 'وَاعْلَمُوا',
  },
  {
    number: 11,
    start_surah: 'At-Tawbah',
    start_surah_number: 9,
    start_verse: 93,
    end_surah: 'Hud',
    end_surah_number: 11,
    end_verse: 5,
    name_ar: 'يَعْتَذِرُونَ',
  },
  {
    number: 12,
    start_surah: 'Hud',
    start_surah_number: 11,
    start_verse: 6,
    end_surah: 'Yusuf',
    end_surah_number: 12,
    end_verse: 52,
    name_ar: 'وَمَا مِنْ دَابَّةٍ',
  },
  {
    number: 13,
    start_surah: 'Yusuf',
    start_surah_number: 12,
    start_verse: 53,
    end_surah: 'Ibrahim',
    end_surah_number: 14,
    end_verse: 52,
    name_ar: 'وَمَا أُبَرِّئُ',
  },
  {
    number: 14,
    start_surah: 'Al-Hijr',
    start_surah_number: 15,
    start_verse: 1,
    end_surah: 'An-Nahl',
    end_surah_number: 16,
    end_verse: 128,
    name_ar: 'رُبَمَا',
  },
  {
    number: 15,
    start_surah: 'Al-Isra',
    start_surah_number: 17,
    start_verse: 1,
    end_surah: 'Al-Kahf',
    end_surah_number: 18,
    end_verse: 74,
    name_ar: 'سُبْحَانَ الَّذِي',
  },
  {
    number: 16,
    start_surah: 'Al-Kahf',
    start_surah_number: 18,
    start_verse: 75,
    end_surah: 'Ta-Ha',
    end_surah_number: 20,
    end_verse: 135,
    name_ar: 'قَالَ أَلَمْ',
  },
  {
    number: 17,
    start_surah: 'Al-Anbiya',
    start_surah_number: 21,
    start_verse: 1,
    end_surah: 'Al-Hajj',
    end_surah_number: 22,
    end_verse: 78,
    name_ar: 'اقْتَرَبَ',
  },
  {
    number: 18,
    start_surah: 'Al-Mu\'minun',
    start_surah_number: 23,
    start_verse: 1,
    end_surah: 'Al-Furqan',
    end_surah_number: 25,
    end_verse: 20,
    name_ar: 'قَدْ أَفْلَحَ',
  },
  {
    number: 19,
    start_surah: 'Al-Furqan',
    start_surah_number: 25,
    start_verse: 21,
    end_surah: 'An-Naml',
    end_surah_number: 27,
    end_verse: 55,
    name_ar: 'وَقَالَ الَّذِينَ',
  },
  {
    number: 20,
    start_surah: 'An-Naml',
    start_surah_number: 27,
    start_verse: 56,
    end_surah: 'Al-Ankabut',
    end_surah_number: 29,
    end_verse: 45,
    name_ar: 'أَمَّنْ خَلَقَ',
  },
  {
    number: 21,
    start_surah: 'Al-Ankabut',
    start_surah_number: 29,
    start_verse: 46,
    end_surah: 'Al-Ahzab',
    end_surah_number: 33,
    end_verse: 30,
    name_ar: 'وَلَا تُجَادِلُوا',
  },
  {
    number: 22,
    start_surah: 'Al-Ahzab',
    start_surah_number: 33,
    start_verse: 31,
    end_surah: 'Ya-Sin',
    end_surah_number: 36,
    end_verse: 27,
    name_ar: 'وَمَنْ يَقْنُتْ',
  },
  {
    number: 23,
    start_surah: 'Ya-Sin',
    start_surah_number: 36,
    start_verse: 28,
    end_surah: 'Az-Zumar',
    end_surah_number: 39,
    end_verse: 31,
    name_ar: 'وَمَا أَنْزَلْنَا',
  },
  {
    number: 24,
    start_surah: 'Az-Zumar',
    start_surah_number: 39,
    start_verse: 32,
    end_surah: 'Fussilat',
    end_surah_number: 41,
    end_verse: 46,
    name_ar: 'فَمَنْ أَظْلَمُ',
  },
  {
    number: 25,
    start_surah: 'Fussilat',
    start_surah_number: 41,
    start_verse: 47,
    end_surah: 'Al-Jathiyah',
    end_surah_number: 45,
    end_verse: 37,
    name_ar: 'إِلَيْهِ يُرَدُّ',
  },
  {
    number: 26,
    start_surah: 'Al-Ahqaf',
    start_surah_number: 46,
    start_verse: 1,
    end_surah: 'Adh-Dhariyat',
    end_surah_number: 51,
    end_verse: 30,
    name_ar: 'حم',
  },
  {
    number: 27,
    start_surah: 'Adh-Dhariyat',
    start_surah_number: 51,
    start_verse: 31,
    end_surah: 'Al-Hadid',
    end_surah_number: 57,
    end_verse: 29,
    name_ar: 'قَالَ فَمَا خَطْبُكُمْ',
  },
  {
    number: 28,
    start_surah: 'Al-Mujadila',
    start_surah_number: 58,
    start_verse: 1,
    end_surah: 'At-Tahrim',
    end_surah_number: 66,
    end_verse: 12,
    name_ar: 'قَدْ سَمِعَ',
  },
  {
    number: 29,
    start_surah: 'Al-Mulk',
    start_surah_number: 67,
    start_verse: 1,
    end_surah: 'Al-Mursalat',
    end_surah_number: 77,
    end_verse: 50,
    name_ar: 'تَبَارَكَ',
  },
  {
    number: 30,
    start_surah: 'An-Naba',
    start_surah_number: 78,
    start_verse: 1,
    end_surah: 'An-Nas',
    end_surah_number: 114,
    end_verse: 6,
    name_ar: 'عَمَّ',
  },
];

/**
 * Récupérer les informations d'un Juz par son numéro
 * @param number Numéro du Juz (1-30)
 * @returns Informations du Juz ou undefined si non trouvé
 */
export const getJuzByNumber = (number: number): JuzInfo | undefined => {
  return JUZ_DATA.find(juz => juz.number === number);
};

/**
 * Récupérer le Juz contenant une sourate et un verset donné
 * @param surahNumber Numéro de la sourate
 * @param verseNumber Numéro du verset
 * @returns Informations du Juz ou undefined si non trouvé
 */
export const getJuzBySurahVerse = (surahNumber: number, verseNumber: number): JuzInfo | undefined => {
  return JUZ_DATA.find(juz => {
    // Vérifie si le verset est dans la plage du Juz
    if (surahNumber < juz.start_surah_number || surahNumber > juz.end_surah_number) {
      return false;
    }

    // Si c'est la sourate de début
    if (surahNumber === juz.start_surah_number) {
      // Si c'est aussi la sourate de fin (même sourate)
      if (surahNumber === juz.end_surah_number) {
        return verseNumber >= juz.start_verse && verseNumber <= juz.end_verse;
      }
      return verseNumber >= juz.start_verse;
    }

    // Si c'est la sourate de fin
    if (surahNumber === juz.end_surah_number) {
      return verseNumber <= juz.end_verse;
    }

    // Si c'est une sourate entre le début et la fin
    return true;
  });
};

export default JUZ_DATA;
