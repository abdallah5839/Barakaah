/**
 * Versets du Coran - Chargement depuis les fichiers JSON
 * 114 sourates, 6236 versets
 */

export interface Verse {
  number: number;
  arabic: string;
  french: string;
  phonetic: string;
  juz?: number;
  hizb?: number;
  page?: number;
}

export interface SurahVerses {
  surahNumber: number;
  verses: Verse[];
}

// Chargement des fichiers JSON par sourate
const surahFiles: Record<number, { verses: Verse[] }> = {
  1: require('../../assets/data/quran/verses/surah_001.json'),
  2: require('../../assets/data/quran/verses/surah_002.json'),
  3: require('../../assets/data/quran/verses/surah_003.json'),
  4: require('../../assets/data/quran/verses/surah_004.json'),
  5: require('../../assets/data/quran/verses/surah_005.json'),
  6: require('../../assets/data/quran/verses/surah_006.json'),
  7: require('../../assets/data/quran/verses/surah_007.json'),
  8: require('../../assets/data/quran/verses/surah_008.json'),
  9: require('../../assets/data/quran/verses/surah_009.json'),
  10: require('../../assets/data/quran/verses/surah_010.json'),
  11: require('../../assets/data/quran/verses/surah_011.json'),
  12: require('../../assets/data/quran/verses/surah_012.json'),
  13: require('../../assets/data/quran/verses/surah_013.json'),
  14: require('../../assets/data/quran/verses/surah_014.json'),
  15: require('../../assets/data/quran/verses/surah_015.json'),
  16: require('../../assets/data/quran/verses/surah_016.json'),
  17: require('../../assets/data/quran/verses/surah_017.json'),
  18: require('../../assets/data/quran/verses/surah_018.json'),
  19: require('../../assets/data/quran/verses/surah_019.json'),
  20: require('../../assets/data/quran/verses/surah_020.json'),
  21: require('../../assets/data/quran/verses/surah_021.json'),
  22: require('../../assets/data/quran/verses/surah_022.json'),
  23: require('../../assets/data/quran/verses/surah_023.json'),
  24: require('../../assets/data/quran/verses/surah_024.json'),
  25: require('../../assets/data/quran/verses/surah_025.json'),
  26: require('../../assets/data/quran/verses/surah_026.json'),
  27: require('../../assets/data/quran/verses/surah_027.json'),
  28: require('../../assets/data/quran/verses/surah_028.json'),
  29: require('../../assets/data/quran/verses/surah_029.json'),
  30: require('../../assets/data/quran/verses/surah_030.json'),
  31: require('../../assets/data/quran/verses/surah_031.json'),
  32: require('../../assets/data/quran/verses/surah_032.json'),
  33: require('../../assets/data/quran/verses/surah_033.json'),
  34: require('../../assets/data/quran/verses/surah_034.json'),
  35: require('../../assets/data/quran/verses/surah_035.json'),
  36: require('../../assets/data/quran/verses/surah_036.json'),
  37: require('../../assets/data/quran/verses/surah_037.json'),
  38: require('../../assets/data/quran/verses/surah_038.json'),
  39: require('../../assets/data/quran/verses/surah_039.json'),
  40: require('../../assets/data/quran/verses/surah_040.json'),
  41: require('../../assets/data/quran/verses/surah_041.json'),
  42: require('../../assets/data/quran/verses/surah_042.json'),
  43: require('../../assets/data/quran/verses/surah_043.json'),
  44: require('../../assets/data/quran/verses/surah_044.json'),
  45: require('../../assets/data/quran/verses/surah_045.json'),
  46: require('../../assets/data/quran/verses/surah_046.json'),
  47: require('../../assets/data/quran/verses/surah_047.json'),
  48: require('../../assets/data/quran/verses/surah_048.json'),
  49: require('../../assets/data/quran/verses/surah_049.json'),
  50: require('../../assets/data/quran/verses/surah_050.json'),
  51: require('../../assets/data/quran/verses/surah_051.json'),
  52: require('../../assets/data/quran/verses/surah_052.json'),
  53: require('../../assets/data/quran/verses/surah_053.json'),
  54: require('../../assets/data/quran/verses/surah_054.json'),
  55: require('../../assets/data/quran/verses/surah_055.json'),
  56: require('../../assets/data/quran/verses/surah_056.json'),
  57: require('../../assets/data/quran/verses/surah_057.json'),
  58: require('../../assets/data/quran/verses/surah_058.json'),
  59: require('../../assets/data/quran/verses/surah_059.json'),
  60: require('../../assets/data/quran/verses/surah_060.json'),
  61: require('../../assets/data/quran/verses/surah_061.json'),
  62: require('../../assets/data/quran/verses/surah_062.json'),
  63: require('../../assets/data/quran/verses/surah_063.json'),
  64: require('../../assets/data/quran/verses/surah_064.json'),
  65: require('../../assets/data/quran/verses/surah_065.json'),
  66: require('../../assets/data/quran/verses/surah_066.json'),
  67: require('../../assets/data/quran/verses/surah_067.json'),
  68: require('../../assets/data/quran/verses/surah_068.json'),
  69: require('../../assets/data/quran/verses/surah_069.json'),
  70: require('../../assets/data/quran/verses/surah_070.json'),
  71: require('../../assets/data/quran/verses/surah_071.json'),
  72: require('../../assets/data/quran/verses/surah_072.json'),
  73: require('../../assets/data/quran/verses/surah_073.json'),
  74: require('../../assets/data/quran/verses/surah_074.json'),
  75: require('../../assets/data/quran/verses/surah_075.json'),
  76: require('../../assets/data/quran/verses/surah_076.json'),
  77: require('../../assets/data/quran/verses/surah_077.json'),
  78: require('../../assets/data/quran/verses/surah_078.json'),
  79: require('../../assets/data/quran/verses/surah_079.json'),
  80: require('../../assets/data/quran/verses/surah_080.json'),
  81: require('../../assets/data/quran/verses/surah_081.json'),
  82: require('../../assets/data/quran/verses/surah_082.json'),
  83: require('../../assets/data/quran/verses/surah_083.json'),
  84: require('../../assets/data/quran/verses/surah_084.json'),
  85: require('../../assets/data/quran/verses/surah_085.json'),
  86: require('../../assets/data/quran/verses/surah_086.json'),
  87: require('../../assets/data/quran/verses/surah_087.json'),
  88: require('../../assets/data/quran/verses/surah_088.json'),
  89: require('../../assets/data/quran/verses/surah_089.json'),
  90: require('../../assets/data/quran/verses/surah_090.json'),
  91: require('../../assets/data/quran/verses/surah_091.json'),
  92: require('../../assets/data/quran/verses/surah_092.json'),
  93: require('../../assets/data/quran/verses/surah_093.json'),
  94: require('../../assets/data/quran/verses/surah_094.json'),
  95: require('../../assets/data/quran/verses/surah_095.json'),
  96: require('../../assets/data/quran/verses/surah_096.json'),
  97: require('../../assets/data/quran/verses/surah_097.json'),
  98: require('../../assets/data/quran/verses/surah_098.json'),
  99: require('../../assets/data/quran/verses/surah_099.json'),
  100: require('../../assets/data/quran/verses/surah_100.json'),
  101: require('../../assets/data/quran/verses/surah_101.json'),
  102: require('../../assets/data/quran/verses/surah_102.json'),
  103: require('../../assets/data/quran/verses/surah_103.json'),
  104: require('../../assets/data/quran/verses/surah_104.json'),
  105: require('../../assets/data/quran/verses/surah_105.json'),
  106: require('../../assets/data/quran/verses/surah_106.json'),
  107: require('../../assets/data/quran/verses/surah_107.json'),
  108: require('../../assets/data/quran/verses/surah_108.json'),
  109: require('../../assets/data/quran/verses/surah_109.json'),
  110: require('../../assets/data/quran/verses/surah_110.json'),
  111: require('../../assets/data/quran/verses/surah_111.json'),
  112: require('../../assets/data/quran/verses/surah_112.json'),
  113: require('../../assets/data/quran/verses/surah_113.json'),
  114: require('../../assets/data/quran/verses/surah_114.json'),
};

/**
 * Récupère les versets d'une sourate
 * @param surahNumber - Numéro de la sourate (1-114)
 */
export const getVersesBySurah = (surahNumber: number): Verse[] => {
  const data = surahFiles[surahNumber];
  return data?.verses || [];
};

/**
 * Toutes les 114 sourates sont disponibles
 */
export const isSurahAvailable = (surahNumber: number): boolean => {
  return surahNumber >= 1 && surahNumber <= 114;
};

export default surahFiles;
