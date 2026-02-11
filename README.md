# Sakina - Application Coranique Chiite

Application mobile iOS/Android destinée aux musulmans chiites, développée avec React Native et Expo.

## Fonctionnalités (Phase 1 - MVP)

- **Accueil (Dashboard)** : Vue d'ensemble avec prochaine prière, date, verset du jour et accès rapides
- **Lecteur de Coran** : Affichage des versets en 3 colonnes (arabe, français, phonétique) avec toggles
- **Horaires de Prière** : Calcul automatique selon la méthode Jafari (chiite)
- **Mode Sombre/Clair** : Toggle de thème avec persistance
- **Navigation** : 5 onglets (Accueil, Coran, Prières, Ramadan, Dua)

## Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Application Expo Go sur votre téléphone (pour le développement)

## Installation

1. **Cloner le projet** (ou copier les fichiers)

2. **Installer les dépendances**
```bash
cd Sakina
npm install
```

3. **Lancer l'application**
```bash
npx expo start
```

4. **Scanner le QR Code** avec l'application Expo Go sur votre téléphone

## Scripts disponibles

```bash
npm start       # Lance Expo en mode développement
npm run android # Lance sur Android
npm run ios     # Lance sur iOS
npm run web     # Lance en version web
```

## Structure du projet

```
Sakina/
├── App.tsx                    # Point d'entrée de l'application
├── app.json                   # Configuration Expo
├── package.json               # Dépendances
├── tsconfig.json              # Configuration TypeScript
├── babel.config.js            # Configuration Babel
├── assets/                    # Images et ressources
└── src/
    ├── components/            # Composants réutilisables
    │   ├── Card.tsx           # Card générique
    │   ├── NextPrayerCard.tsx # Card prochaine prière (gradient)
    │   ├── PrayerCard.tsx     # Card horaire prière
    │   ├── QuickAccessCard.tsx# Card accès rapide
    │   ├── SurahPicker.tsx    # Sélecteur de sourate
    │   ├── ToggleButton.tsx   # Bouton toggle
    │   └── VerseItem.tsx      # Affichage d'un verset
    │
    ├── screens/               # Écrans de l'application
    │   ├── HomeScreen.tsx     # Accueil / Dashboard
    │   ├── CoranScreen.tsx    # Lecteur de Coran
    │   ├── PrieresScreen.tsx  # Horaires de prière
    │   ├── RamadanScreen.tsx  # Module Ramadan (placeholder)
    │   └── DuaScreen.tsx      # Module Dua (placeholder)
    │
    ├── navigation/            # Configuration navigation
    │   └── AppNavigator.tsx   # Bottom Tab Navigator
    │
    ├── data/                   # Données de l'application
    │   ├── surahs.ts          # Liste des 114 sourates
    │   └── verses.ts          # Versets (Al-Fatiha + début Al-Baqarah)
    │
    ├── contexts/              # Contextes React
    │   └── ThemeContext.tsx   # Gestion du thème clair/sombre
    │
    ├── constants/             # Constantes de l'application
    │   ├── colors.ts          # Palette de couleurs
    │   ├── typography.ts      # Typographie
    │   └── spacing.ts         # Espacements et ombres
    │
    └── utils/                 # Fonctions utilitaires
        ├── prayerTimes.ts     # Calcul des horaires de prière
        └── date.ts            # Formatage des dates
```

## Dépendances principales

| Package | Version | Description |
|---------|---------|-------------|
| expo | ~51.0.0 | Framework React Native |
| react | 18.2.0 | Librairie UI |
| react-native | 0.74.5 | Framework mobile |
| @react-navigation/native | ^6.1.18 | Navigation |
| @react-navigation/bottom-tabs | ^6.5.20 | Navigation par onglets |
| @react-native-async-storage/async-storage | 1.23.1 | Stockage local |
| adhan | ^4.4.3 | Calcul des horaires de prière |
| expo-linear-gradient | ~13.0.0 | Gradients |
| expo-location | ~17.0.0 | Géolocalisation (futur) |
| expo-av | ~14.0.0 | Audio/Vidéo (futur) |
| expo-notifications | ~0.28.0 | Notifications (futur) |

## Palette de couleurs

### Mode Clair
- Primaire : `#059669` (vert émeraude)
- Secondaire : `#D4AF37` (or)
- Background : `#FAFAFA`
- Surface : `#FFFFFF`
- Text : `#1A1A1A`

### Mode Sombre
- Primaire : `#10B981`
- Secondaire : `#FBBF24`
- Background : `#0F172A`
- Surface : `#1E293B`
- Text : `#F1F5F9`

## Choix techniques

### Calcul des horaires de prière
- Utilisation de la librairie `adhan` avec la méthode `Tehran()` qui correspond aux paramètres Jafari utilisés par la majorité des chiites
- Les coordonnées par défaut sont celles de Paris (48.8566, 2.3522)
- Mise à jour automatique du countdown chaque minute

### Gestion du thème
- Utilisation de React Context pour un accès global
- Persistance du choix utilisateur via AsyncStorage
- Changement instantané de toutes les couleurs

### Architecture des composants
- Composants atomiques réutilisables
- Séparation claire entre présentation et logique
- Types TypeScript pour la sécurité du code

### Données placeholder
- Sourate 1 (Al-Fatiha) : 7 versets complets
- Sourate 2 (Al-Baqarah) : 5 premiers versets
- Liste complète des 114 sourates (métadonnées uniquement)

## Prochaines phases de développement

### Phase 2 - Coran complet
- Intégration de tous les versets
- Système de marque-pages
- Ajustement de la taille de police
- Recherche dans le Coran

### Phase 3 - Module Ramadan
- Calendrier du Ramadan
- Horaires Suhur/Iftar
- Compteur de jours
- Duas spéciales

### Phase 4 - Module Dua
- Collection de Duas
- Invocations des Imams (as)
- Audio des récitations

### Phase 5 - Fonctionnalités avancées
- Géolocalisation réelle
- Notifications push pour les prières
- Adhan audio
- Calendrier Hijri complet

## Licence

Projet privé - Tous droits réservés

---

Développé avec React Native + Expo + TypeScript
