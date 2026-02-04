/**
 * Script de fusion des données du Coran
 * Sources :
 *   - quran_fr.json : texte arabe + traduction française
 *   - quran_transliteration.json : translittération (phonétique)
 *   - quran_mehdi.json : juz, page, hizbQuarter par verset
 *
 * Sortie :
 *   - assets/data/quran/surahs-metadata.json
 *   - assets/data/quran/verses/surah_001.json ... surah_114.json
 */

const fs = require('fs');
const path = require('path');

const SOURCES_DIR = path.join(__dirname, '..', 'assets', 'data', 'quran', 'sources');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'data', 'quran');
const VERSES_DIR = path.join(OUTPUT_DIR, 'verses');

// Charger les sources
const quranFr = JSON.parse(fs.readFileSync(path.join(SOURCES_DIR, 'quran_fr.json'), 'utf8'));
const quranTranslit = JSON.parse(fs.readFileSync(path.join(SOURCES_DIR, 'quran_transliteration.json'), 'utf8'));
const quranMehdiRaw = JSON.parse(fs.readFileSync(path.join(SOURCES_DIR, 'quran_mehdi.json'), 'utf8'));

// Le fichier mehdi a une clé "sourates" qui est un tableau de 114 sourates
const quranMehdi = quranMehdiRaw.sourates || [];

// Créer le dossier verses s'il n'existe pas
if (!fs.existsSync(VERSES_DIR)) {
  fs.mkdirSync(VERSES_DIR, { recursive: true });
}

const metadata = [];
let totalVersesCount = 0;

for (let i = 0; i < 114; i++) {
  const fr = quranFr[i];
  const translit = quranTranslit[i];
  const mehdi = quranMehdi[i];

  if (!fr) {
    console.error(`Sourate ${i + 1} manquante dans quran_fr.json`);
    continue;
  }

  const surahId = fr.id;
  const totalVerses = fr.total_verses;

  // Construire les versets fusionnés
  const verses = [];
  for (let v = 0; v < totalVerses; v++) {
    const frVerse = fr.verses[v];
    const translitVerse = translit ? translit.verses[v] : null;

    // Chercher le verset mehdi correspondant
    let mehdiVerse = null;
    if (mehdi && mehdi.versets) {
      mehdiVerse = mehdi.versets.find(mv => mv.position_ds_sourate === v + 1) || mehdi.versets[v];
    }

    verses.push({
      number: v + 1,
      arabic: frVerse ? frVerse.text : '',
      french: frVerse ? frVerse.translation : '',
      phonetic: translitVerse ? translitVerse.transliteration : '',
      juz: mehdiVerse ? mehdiVerse.juz : 0,
      hizb: mehdiVerse ? Math.ceil(mehdiVerse.hizbQuarter / 4) : 0,
      page: mehdiVerse ? mehdiVerse.page : 0,
    });
  }

  totalVersesCount += verses.length;

  // Fichier par sourate
  const surahData = {
    id: surahId,
    nameArabic: fr.name,
    nameTransliteration: fr.transliteration,
    nameFrench: fr.translation,
    revelationType: fr.type,
    totalVerses: totalVerses,
    verses: verses,
  };

  const filename = `surah_${String(surahId).padStart(3, '0')}.json`;
  fs.writeFileSync(path.join(VERSES_DIR, filename), JSON.stringify(surahData, null, 2), 'utf8');

  // Metadata (sans les versets)
  metadata.push({
    id: surahId,
    nameArabic: fr.name,
    nameTransliteration: fr.transliteration,
    nameFrench: fr.translation,
    revelationType: fr.type,
    totalVerses: totalVerses,
  });
}

// Écrire le fichier metadata
fs.writeFileSync(path.join(OUTPUT_DIR, 'surahs-metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

console.log(`Fusion terminée :`);
console.log(`  - ${metadata.length} sourates`);
console.log(`  - ${totalVersesCount} versets au total`);
console.log(`  - ${metadata.length} fichiers dans verses/`);
console.log(`  - 1 fichier surahs-metadata.json`);
