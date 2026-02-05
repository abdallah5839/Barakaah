# Sons de notification Barakaah

## Fichiers requis

- `adhan_short.wav` - Extrait court de l'Adhan (5-8 secondes, "Allahu Akbar")

## Comment creer le fichier adhan_short.wav

### Option 1 : Avec ffmpeg (recommande)

1. Installer ffmpeg : https://ffmpeg.org/download.html
2. Executer cette commande :
```bash
ffmpeg -i adhan_full.mp3 -t 8 -ar 44100 -ac 1 adhan_short.wav
```

### Option 2 : Outil en ligne

1. Aller sur https://mp3cut.net/ ou https://audiotrimmer.com/
2. Charger `adhan_full.mp3`
3. Couper de 0:00 a 0:08 (8 secondes)
4. Exporter en WAV
5. Renommer en `adhan_short.wav`

### Option 3 : Avec Audacity

1. Telecharger Audacity : https://www.audacityteam.org/
2. Ouvrir `adhan_full.mp3`
3. Selectionner les 8 premieres secondes
4. Edition > Supprimer l'audio en dehors de la selection
5. Fichier > Exporter > Exporter en WAV
6. Nommer `adhan_short.wav`

## Specifications techniques

- **Format** : WAV (compatibilite iOS/Android)
- **Duree** : 5-8 secondes max
- **Frequence** : 44100 Hz
- **Canaux** : Mono (1) ou Stereo (2)

## Source

Le fichier `adhan_full.mp3` provient de islamcan.com (Adhan Mishary Rashid Alafasy).
