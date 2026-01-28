/**
 * Versets du Coran - Données placeholder
 * Sourate 1 (Al-Fatiha) : 7 versets complets
 * Sourate 2 (Al-Baqarah) : 5 premiers versets
 */

export interface Verse {
  number: number;
  arabic: string;
  french: string;
  phonetic: string;
}

export interface SurahVerses {
  surahNumber: number;
  verses: Verse[];
}

// Sourate 1 - Al-Fatiha (L'Ouverture)
const alFatiha: SurahVerses = {
  surahNumber: 1,
  verses: [
    {
      number: 1,
      arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      french: 'Au nom d\'Allah, le Tout Miséricordieux, le Très Miséricordieux.',
      phonetic: 'Bismillahi ar-Rahmani ar-Raheem',
    },
    {
      number: 2,
      arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      french: 'Louange à Allah, Seigneur de l\'univers.',
      phonetic: 'Al-hamdu lillahi Rabbi al-\'aalameen',
    },
    {
      number: 3,
      arabic: 'الرَّحْمَٰنِ الرَّحِيمِ',
      french: 'Le Tout Miséricordieux, le Très Miséricordieux.',
      phonetic: 'Ar-Rahmani ar-Raheem',
    },
    {
      number: 4,
      arabic: 'مَالِكِ يَوْمِ الدِّينِ',
      french: 'Maître du Jour de la rétribution.',
      phonetic: 'Maliki yawmi ad-deen',
    },
    {
      number: 5,
      arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      french: 'C\'est Toi [Seul] que nous adorons, et c\'est Toi [Seul] dont nous implorons secours.',
      phonetic: 'Iyyaka na\'budu wa iyyaka nasta\'een',
    },
    {
      number: 6,
      arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
      french: 'Guide-nous dans le droit chemin.',
      phonetic: 'Ihdina as-sirat al-mustaqeem',
    },
    {
      number: 7,
      arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
      french: 'Le chemin de ceux que Tu as comblés de faveurs, non pas de ceux qui ont encouru Ta colère, ni des égarés.',
      phonetic: 'Sirat allatheena an\'amta \'alayhim ghayril maghdoobi \'alayhim wa lad-daalleen',
    },
  ],
};

// Sourate 2 - Al-Baqarah (La Vache) - 5 premiers versets
const alBaqarah: SurahVerses = {
  surahNumber: 2,
  verses: [
    {
      number: 1,
      arabic: 'الم',
      french: 'Alif, Lam, Mim.',
      phonetic: 'Alif-Lam-Meem',
    },
    {
      number: 2,
      arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ',
      french: 'C\'est le Livre au sujet duquel il n\'y a aucun doute, c\'est un guide pour les pieux.',
      phonetic: 'Dhalikal-Kitabu la rayba feehi hudan lil-muttaqeen',
    },
    {
      number: 3,
      arabic: 'الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ',
      french: 'Ceux qui croient à l\'invisible et accomplissent la prière et dépensent [dans l\'obéissance à Allah] de ce que Nous leur avons attribué.',
      phonetic: 'Allatheena yu\'minoona bil-ghaybi wa yuqeemoona as-salata wa mimma razaqnahum yunfiqoon',
    },
    {
      number: 4,
      arabic: 'وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ',
      french: 'Ceux qui croient à ce qui t\'a été descendu (révélé) et à ce qui a été descendu avant toi et qui croient fermement à la vie future.',
      phonetic: 'Wallatheena yu\'minoona bima unzila ilayka wa ma unzila min qablika wa bil-akhirati hum yooqinoon',
    },
    {
      number: 5,
      arabic: 'أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ',
      french: 'Ceux-là sont sur le bon chemin de leur Seigneur, et ce sont eux qui réussissent.',
      phonetic: 'Ula\'ika \'ala hudan min Rabbihim wa ula\'ika humul-muflihoon',
    },
  ],
};

// Collection de tous les versets disponibles
export const versesData: SurahVerses[] = [alFatiha, alBaqarah];

/**
 * Récupère les versets d'une sourate spécifique
 * @param surahNumber - Numéro de la sourate (1-114)
 * @returns Les versets de la sourate ou un tableau vide si non disponible
 */
export const getVersesBySurah = (surahNumber: number): Verse[] => {
  const surah = versesData.find((s) => s.surahNumber === surahNumber);
  return surah?.verses || [];
};

/**
 * Vérifie si les versets d'une sourate sont disponibles
 * @param surahNumber - Numéro de la sourate
 */
export const isSurahAvailable = (surahNumber: number): boolean => {
  return versesData.some((s) => s.surahNumber === surahNumber);
};

export default versesData;
