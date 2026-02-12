/**
 * Utilitaires pour le calcul des horaires de prière
 * Utilise la méthode Jafari (chiite) via la librairie adhan
 * Timezone par défaut: Africa/Abidjan
 */

import {
  PrayerTimes,
  Coordinates,
  CalculationMethod,
  CalculationParameters,
} from 'adhan';
import moment from 'moment-timezone';
import { DEFAULT_COORDINATES, PRAYER_NAMES } from '../constants';

// Timezone par défaut
const DEFAULT_TIMEZONE = 'Africa/Abidjan';

// Types pour les prières
export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface Prayer {
  name: PrayerName;
  nameFrench: string;
  nameArabic: string;
  time: Date;
  timeString: string;
}

export interface PrayerTimesData {
  prayers: Prayer[];
  nextPrayer: Prayer | null;
  currentPrayer: PrayerName | null;
  timeUntilNext: string;
  date: Date;
}

/**
 * Formate une date en heure (HH:MM) dans la timezone Abidjan
 */
export const formatTime = (date: Date, timezone: string = DEFAULT_TIMEZONE): string => {
  return moment(date).tz(timezone).format('HH:mm');
};

/**
 * Obtient l'heure actuelle dans la timezone spécifiée
 */
export const getCurrentTime = (timezone: string = DEFAULT_TIMEZONE): moment.Moment => {
  return moment().tz(timezone);
};

/**
 * Obtient l'heure actuelle formatée (HH:MM:SS)
 */
export const getCurrentTimeString = (timezone: string = DEFAULT_TIMEZONE): string => {
  return moment().tz(timezone).format('HH:mm:ss');
};

/**
 * Calcule le temps restant jusqu'à une date
 * @returns Chaîne formatée (ex: "2h 34min")
 */
export const getTimeUntil = (targetDate: Date, timezone: string = DEFAULT_TIMEZONE): string => {
  const now = moment().tz(timezone);
  const target = moment(targetDate).tz(timezone);
  const diff = target.diff(now);

  if (diff <= 0) {
    return 'Maintenant';
  }

  const duration = moment.duration(diff);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();

  if (hours > 0) {
    return `Dans ${hours}h ${minutes}min`;
  }
  return `Dans ${minutes}min`;
};

/**
 * Calcule le temps restant avec secondes (pour countdown précis)
 * @returns Objet avec heures, minutes, secondes
 */
export const getTimeUntilDetailed = (targetDate: Date, timezone: string = DEFAULT_TIMEZONE): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  formatted: string;
} => {
  const now = moment().tz(timezone);
  const target = moment(targetDate).tz(timezone);
  const diff = target.diff(now);

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, formatted: '00:00:00' };
  }

  const duration = moment.duration(diff);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  const totalSeconds = Math.floor(diff / 1000);

  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { hours, minutes, seconds, totalSeconds, formatted };
};

/**
 * Calcule les horaires de prière pour une date et des coordonnées données
 * @param date - Date pour laquelle calculer les horaires
 * @param latitude - Latitude de la position
 * @param longitude - Longitude de la position
 * @param timezone - Timezone pour les calculs (défaut: Africa/Abidjan)
 */
export const calculatePrayerTimes = (
  date: Date = new Date(),
  latitude: number = DEFAULT_COORDINATES.latitude,
  longitude: number = DEFAULT_COORDINATES.longitude,
  timezone: string = DEFAULT_TIMEZONE
): PrayerTimesData => {
  // Création des coordonnées
  const coordinates = new Coordinates(latitude, longitude);

  // Paramètres de calcul - Méthode Jafari (chiite)
  const params: CalculationParameters = CalculationMethod.Tehran();

  // Utiliser la date dans la timezone correcte
  const dateInTz = moment(date).tz(timezone);
  const dateForCalculation = new Date(
    dateInTz.year(),
    dateInTz.month(),
    dateInTz.date()
  );

  // Calcul des horaires
  const prayerTimes = new PrayerTimes(coordinates, dateForCalculation, params);

  // DEBUG: Afficher les informations de calcul
  console.log('=== DEBUG HORAIRES DE PRIÈRE ===');
  console.log('Heure système:', new Date().toISOString());
  console.log('Heure Abidjan:', moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss'));
  console.log('Coordonnées:', { latitude, longitude });
  console.log('Timezone:', timezone);
  console.log('Date de calcul:', dateForCalculation.toISOString());

  // Construction de la liste des prières
  const prayers: Prayer[] = [
    {
      name: 'fajr',
      nameFrench: PRAYER_NAMES.fajr.french,
      nameArabic: PRAYER_NAMES.fajr.arabic,
      time: prayerTimes.fajr,
      timeString: formatTime(prayerTimes.fajr, timezone),
    },
    {
      name: 'sunrise',
      nameFrench: PRAYER_NAMES.sunrise.french,
      nameArabic: PRAYER_NAMES.sunrise.arabic,
      time: prayerTimes.sunrise,
      timeString: formatTime(prayerTimes.sunrise, timezone),
    },
    {
      name: 'dhuhr',
      nameFrench: PRAYER_NAMES.dhuhr.french,
      nameArabic: PRAYER_NAMES.dhuhr.arabic,
      time: prayerTimes.dhuhr,
      timeString: formatTime(prayerTimes.dhuhr, timezone),
    },
    {
      name: 'asr',
      nameFrench: PRAYER_NAMES.asr.french,
      nameArabic: PRAYER_NAMES.asr.arabic,
      time: prayerTimes.asr,
      timeString: formatTime(prayerTimes.asr, timezone),
    },
    {
      name: 'maghrib',
      nameFrench: PRAYER_NAMES.maghrib.french,
      nameArabic: PRAYER_NAMES.maghrib.arabic,
      time: prayerTimes.maghrib,
      timeString: formatTime(prayerTimes.maghrib, timezone),
    },
    {
      name: 'isha',
      nameFrench: PRAYER_NAMES.isha.french,
      nameArabic: PRAYER_NAMES.isha.arabic,
      time: prayerTimes.isha,
      timeString: formatTime(prayerTimes.isha, timezone),
    },
  ];

  // DEBUG: Afficher les horaires calculés
  console.log('Horaires calculés:');
  prayers.forEach(p => {
    console.log(`  ${p.nameFrench}: ${p.timeString}`);
  });

  // Déterminer la prochaine prière en utilisant l'heure de la timezone
  const now = moment().tz(timezone);
  let nextPrayer: Prayer | null = null;
  let currentPrayer: PrayerName | null = null;

  for (let i = 0; i < prayers.length; i++) {
    const prayerMoment = moment(prayers[i].time).tz(timezone);
    if (prayerMoment.isAfter(now) && prayers[i].name !== 'sunrise') {
      nextPrayer = prayers[i];
      // Trouver la dernière prière passée (en ignorant sunrise)
      for (let j = i - 1; j >= 0; j--) {
        if (prayers[j].name !== 'sunrise') {
          currentPrayer = prayers[j].name;
          break;
        }
      }
      break;
    }
  }

  // Si toutes les prières sont passées, la prochaine est Fajr du lendemain
  if (!nextPrayer) {
    const tomorrow = moment(date).tz(timezone).add(1, 'day').toDate();
    const tomorrowTimes = calculatePrayerTimes(tomorrow, latitude, longitude, timezone);
    nextPrayer = tomorrowTimes.prayers[0]; // Fajr
    currentPrayer = 'isha';
  }

  // Calcul du temps restant
  const timeUntilNext = nextPrayer ? getTimeUntil(nextPrayer.time, timezone) : '';

  console.log('Prochaine prière:', nextPrayer?.nameFrench, 'à', nextPrayer?.timeString);
  console.log('Temps restant:', timeUntilNext);
  console.log('================================');

  return {
    prayers,
    nextPrayer,
    currentPrayer,
    timeUntilNext,
    date: dateForCalculation,
  };
};

/**
 * Vérifie si une prière est la prière en cours (dernière prière passée)
 */
export const isCurrentPrayer = (
  prayerName: PrayerName,
  currentPrayer: PrayerName | null
): boolean => {
  return prayerName === currentPrayer;
};

/**
 * Vérifie si une prière est la prochaine prière
 */
export const isNextPrayer = (
  prayerName: PrayerName,
  nextPrayer: Prayer | null
): boolean => {
  return nextPrayer?.name === prayerName;
};
