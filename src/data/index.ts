/**
 * Export centralisé des données
 */

export { surahs } from './surahs';
export type { Surah } from './surahs';

export { getVersesBySurah, isSurahAvailable } from './verses';
export type { Verse, SurahVerses } from './verses';

export {
  duas,
  duaCategories,
  getDuasByCategory,
  getImportantDuas,
  getDuaById,
  searchDuas,
  getCategoryInfo,
  getRandomDua,
  getDuaOfTheDay,
} from './duas';
