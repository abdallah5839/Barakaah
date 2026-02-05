/**
 * Utilitaires pour la gestion des dates
 * Utilise moment-timezone pour gérer correctement les fuseaux horaires
 */

import moment from 'moment-timezone';
import momentHijri from 'moment-hijri';
import { DAYS_FR, MONTHS_FR, DEFAULT_COORDINATES } from '../constants';
import { getAdjustedHijriMoment } from './hijriOffset';

// Timezone par défaut
const DEFAULT_TIMEZONE = DEFAULT_COORDINATES.timezone || 'Africa/Abidjan';

// Mois Hijri en arabe
const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Sha\'ban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qi\'dah',
  'Dhu al-Hijjah',
];

/**
 * Obtient la date actuelle dans la timezone spécifiée
 */
export const getCurrentDate = (timezone: string = DEFAULT_TIMEZONE): moment.Moment => {
  return moment().tz(timezone);
};

/**
 * Formate une date en format français long
 * Ex: "Lundi 19 Janvier 2026"
 */
export const formatDateFrench = (date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string => {
  const m = moment(date).tz(timezone);
  const day = DAYS_FR[m.day()];
  const dayNumber = m.date();
  const month = MONTHS_FR[m.month()];
  const year = m.year();

  return `${day} ${dayNumber} ${month} ${year}`;
};

/**
 * Formate une date en format court
 * Ex: "19/01/2026"
 */
export const formatDateShort = (date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string => {
  return moment(date).tz(timezone).format('DD/MM/YYYY');
};

/**
 * Retourne la date Hijri
 * Utilise moment-hijri pour la conversion
 */
export const getHijriDate = (date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string => {
  const m = getAdjustedHijriMoment(date, timezone);
  const day = m.iDate();
  const monthIndex = m.iMonth();
  const year = m.iYear();
  const monthName = HIJRI_MONTHS[monthIndex];

  return `${day} ${monthName} ${year}`;
};

/**
 * Obtient le jour de la semaine en français
 */
export const getDayNameFrench = (date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string => {
  const m = moment(date).tz(timezone);
  return DAYS_FR[m.day()];
};

/**
 * Obtient le mois en français
 */
export const getMonthNameFrench = (date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string => {
  const m = moment(date).tz(timezone);
  return MONTHS_FR[m.month()];
};

/**
 * Vérifie si deux dates sont le même jour
 */
export const isSameDay = (date1: Date, date2: Date, timezone: string = DEFAULT_TIMEZONE): boolean => {
  const m1 = moment(date1).tz(timezone);
  const m2 = moment(date2).tz(timezone);
  return m1.isSame(m2, 'day');
};

/**
 * Obtient l'heure actuelle formatée
 */
export const getCurrentTimeFormatted = (timezone: string = DEFAULT_TIMEZONE): string => {
  return moment().tz(timezone).format('HH:mm');
};

/**
 * Vérifie si on est pendant le Ramadan
 * Note: Le Ramadan est le 9ème mois du calendrier Hijri (index 8)
 */
export const isRamadan = (date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): boolean => {
  const m = getAdjustedHijriMoment(date, timezone);
  return m.iMonth() === 8; // Ramadan est le 9ème mois (index 8)
};

/**
 * Obtient le jour du Ramadan (si on est en Ramadan)
 */
export const getRamadanDay = (date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): number | null => {
  const m = getAdjustedHijriMoment(date, timezone);
  if (m.iMonth() === 8) {
    return m.iDate();
  }
  return null;
};
