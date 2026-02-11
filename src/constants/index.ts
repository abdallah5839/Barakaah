/**
 * Export centralisé des constantes
 */

export * from './colors';
export * from './typography';
export * from './spacing';

// Constantes de l'application
export const APP_NAME = 'Sakina';

// Coordonnées par défaut (Abidjan, Côte d'Ivoire)
export const DEFAULT_COORDINATES = {
  latitude: 5.3600,
  longitude: -4.0083,
  city: 'Abidjan, Côte d\'Ivoire',
  timezone: 'Africa/Abidjan',
};

// Noms des prières
export const PRAYER_NAMES = {
  fajr: { french: 'Fajr', arabic: 'الفجر' },
  sunrise: { french: 'Lever du soleil', arabic: 'الشروق' },
  dhuhr: { french: 'Dhuhr', arabic: 'الظهر' },
  asr: { french: 'Asr', arabic: 'العصر' },
  maghrib: { french: 'Maghrib', arabic: 'المغرب' },
  isha: { french: 'Isha', arabic: 'العشاء' },
} as const;

// Jours de la semaine en français
export const DAYS_FR = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;

// Mois en français
export const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;
