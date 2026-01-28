/**
 * Types pour le module Dua & Invocations
 */

// Catégories de Dua
export type DuaCategory =
  | 'speciales'      // Dua Chiites Spéciales
  | 'quotidiennes'   // Dua Quotidiennes
  | 'apres-priere'   // Dua Après Prière
  | 'occasions';     // Dua pour Occasions

// Niveaux d'importance
export type DuaImportance = 'tres-haute' | 'haute' | 'moyenne';

// Type de rappel
export type DuaReminder = 'thursday-night' | 'daily' | 'ramadan' | 'ashura' | 'none';

// Section de texte pour une Dua
export interface DuaSection {
  id: number;
  arabic: string;
  french: string;
  phonetic: string;
}

// Structure principale d'une Dua
export interface Dua {
  id: string;
  arabicName: string;
  frenchName: string;
  description: string;
  occasion: string;
  duration: string;          // ex: "15 min"
  durationMinutes: number;   // ex: 15
  importance: DuaImportance;
  category: DuaCategory;
  reminder?: DuaReminder;
  audioUrl?: string;         // URL de l'audio Mishary
  reciter: string;           // Nom du récitateur
  sections: DuaSection[];    // Texte découpé en sections
  keywords: string[];        // Mots-clés pour la recherche
}

// Catégorie de Dua avec métadonnées
export interface DuaCategoryInfo {
  id: DuaCategory;
  arabicName: string;
  frenchName: string;
  description: string;
  icon: string;              // Nom d'icône Ionicons
  color: string;             // Couleur primaire de la catégorie
}

// État des favoris
export interface DuaFavorites {
  duaIds: string[];
  lastUpdated: string;       // ISO date string
}

// Préférences d'affichage
export interface DuaDisplayPreferences {
  showArabic: boolean;
  showFrench: boolean;
  showPhonetic: boolean;
}

// Progression d'apprentissage
export interface DuaLearningProgress {
  duaId: string;
  currentSection: number;
  totalSections: number;
  completedSections: number[];
  lastAccessed: string;      // ISO date string
}

// Position audio sauvegardée
export interface DuaAudioPosition {
  duaId: string;
  position: number;          // Position en millisecondes
  lastPlayed: string;        // ISO date string
}

// Configuration du rappel Dua Kumayl
export interface DuaKumaylReminder {
  enabled: boolean;
  hour: number;              // 19, 20, 21, ou 22
  minute: number;            // Généralement 0
}

// Vitesse de lecture audio
export type AudioPlaybackSpeed = 0.75 | 1 | 1.25;

// État du player audio
export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentPosition: number;   // millisecondes
  duration: number;          // millisecondes
  playbackSpeed: AudioPlaybackSpeed;
  isLooping: boolean;
  volume: number;            // 0-1
}
