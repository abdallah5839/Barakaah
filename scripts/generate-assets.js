/**
 * Script pour générer des images placeholder pour les assets
 * Exécuter avec : node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');

// Image PNG 1x1 pixel vert (#059669) encodée en base64
const greenPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Image PNG 1x1 pixel blanc encodée en base64
const whitePixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const assetsDir = path.join(__dirname, '..', 'assets');

// Créer le dossier assets s'il n'existe pas
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Fichiers à créer
const files = [
  { name: 'icon.png', data: greenPixelBase64 },
  { name: 'splash.png', data: greenPixelBase64 },
  { name: 'adaptive-icon.png', data: greenPixelBase64 },
  { name: 'favicon.png', data: greenPixelBase64 },
];

files.forEach(({ name, data }) => {
  const filePath = path.join(assetsDir, name);
  const buffer = Buffer.from(data, 'base64');
  fs.writeFileSync(filePath, buffer);
  console.log(`Créé: ${name}`);
});

console.log('\nAssets placeholder créés avec succès!');
console.log('Remplacez-les par vos vraies images plus tard.');
