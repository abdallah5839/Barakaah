/**
 * Utilitaires pour le module Ramadan
 * Gestion du calendrier Hijri et détection du Ramadan
 * Timezone par défaut: Africa/Abidjan
 */

import momentTz from 'moment-timezone';
import moment from 'moment-hijri';
import { DEFAULT_COORDINATES } from '../constants';
import { getAdjustedHijriMoment } from './hijriOffset';

// Timezone par défaut
const DEFAULT_TIMEZONE = DEFAULT_COORDINATES.timezone || 'Africa/Abidjan';

// Types
export type RamadanStatus = 'before' | 'during' | 'after';

export interface RamadanInfo {
  status: RamadanStatus;
  currentHijriDate: {
    day: number;
    month: number;
    year: number;
    monthName: string;
  };
  ramadanYear: number;
  ramadanDay?: number; // 1-30 si pendant le Ramadan
  daysUntilRamadan?: number; // Si avant le Ramadan
  daysUntilEnd?: number; // Si pendant le Ramadan
  ramadanStartDate?: Date; // Date de début du Ramadan
  ramadanEndDate?: Date; // Date de fin du Ramadan
}

export interface DailySchedule {
  suhoorEnd: string; // Heure fin Suhoor (Fajr)
  iftarTime: string; // Heure Iftar (Maghrib)
  fajrTime: string;
  maghribTime: string;
}

// Noms des mois Hijri
const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Shaban',
  'Ramadan',
  'Shawwal',
  'Dhul Qadah',
  'Dhul Hijjah',
];

// Noms des mois Hijri en français
const HIJRI_MONTHS_FR = [
  'Mouharram',
  'Safar',
  'Rabi al-Awal',
  'Rabi al-Thani',
  'Joumada al-Awal',
  'Joumada al-Thani',
  'Rajab',
  'Chaabane',
  'Ramadan',
  'Chawwal',
  'Dhoul Qidah',
  'Dhoul Hijja',
];

/**
 * Obtient la date Hijri actuelle dans la timezone d'Abidjan
 */
export function getCurrentHijriDate(timezone: string = DEFAULT_TIMEZONE): { day: number; month: number; year: number; monthName: string; monthNameFr: string } {
  const m = getAdjustedHijriMoment(new Date(), timezone);
  return {
    day: m.iDate(),
    month: m.iMonth() + 1, // iMonth() retourne 0-11
    year: m.iYear(),
    monthName: HIJRI_MONTHS[m.iMonth()],
    monthNameFr: HIJRI_MONTHS_FR[m.iMonth()],
  };
}

/**
 * Détecte le statut du Ramadan (avant, pendant, après)
 */
export function getRamadanStatus(timezone: string = DEFAULT_TIMEZONE): RamadanInfo {
  const m = getAdjustedHijriMoment(new Date(), timezone);
  const hijriMonth = m.iMonth() + 1; // 1-12
  const hijriDay = m.iDate();
  const hijriYear = m.iYear();

  const currentHijriDate = {
    day: hijriDay,
    month: hijriMonth,
    year: hijriYear,
    monthName: HIJRI_MONTHS_FR[hijriMonth - 1],
  };

  // Mois 9 = Ramadan
  if (hijriMonth === 9) {
    // Pendant le Ramadan
    const daysInRamadan = 30; // Le Ramadan a généralement 29 ou 30 jours
    return {
      status: 'during',
      currentHijriDate,
      ramadanYear: hijriYear,
      ramadanDay: hijriDay,
      daysUntilEnd: daysInRamadan - hijriDay,
    };
  } else if (hijriMonth < 9) {
    // Avant le Ramadan
    const daysUntilRamadan = calculateDaysUntilRamadan(m);
    const ramadanStart = getRamadanStartDate(hijriYear);
    return {
      status: 'before',
      currentHijriDate,
      ramadanYear: hijriYear,
      daysUntilRamadan,
      ramadanStartDate: ramadanStart,
    };
  } else {
    // Après le Ramadan (mois > 9)
    const nextYearRamadanStart = getRamadanStartDate(hijriYear + 1);
    const daysUntilNextRamadan = calculateDaysUntilDate(nextYearRamadanStart);
    return {
      status: 'after',
      currentHijriDate,
      ramadanYear: hijriYear + 1,
      daysUntilRamadan: daysUntilNextRamadan,
      ramadanStartDate: nextYearRamadanStart,
    };
  }
}

/**
 * Calcule le nombre de jours jusqu'au Ramadan
 */
function calculateDaysUntilRamadan(currentMoment: moment.Moment): number {
  const hijriYear = currentMoment.iYear();
  const ramadanStart = moment(`${hijriYear}/9/1`, 'iYYYY/iM/iD');
  return ramadanStart.diff(currentMoment, 'days');
}

/**
 * Calcule le nombre de jours jusqu'à une date donnée
 */
function calculateDaysUntilDate(targetDate: Date, timezone: string = DEFAULT_TIMEZONE): number {
  const now = momentTz().tz(timezone);
  const target = momentTz(targetDate).tz(timezone);
  return target.diff(now, 'days');
}

/**
 * Obtient la date grégorienne de début du Ramadan pour une année Hijri donnée
 */
export function getRamadanStartDate(hijriYear: number): Date {
  const ramadanStart = moment(`${hijriYear}/9/1`, 'iYYYY/iM/iD');
  return ramadanStart.toDate();
}

/**
 * Obtient la date grégorienne de fin du Ramadan pour une année Hijri donnée
 */
export function getRamadanEndDate(hijriYear: number): Date {
  // Ramadan a généralement 29 ou 30 jours, on prend 30 par sécurité
  const ramadanEnd = moment(`${hijriYear}/9/30`, 'iYYYY/iM/iD');
  return ramadanEnd.toDate();
}

/**
 * Convertit une date grégorienne en date Hijri
 */
export function gregorianToHijri(date: Date): { day: number; month: number; year: number; monthName: string } {
  const m = getAdjustedHijriMoment(date);
  return {
    day: m.iDate(),
    month: m.iMonth() + 1,
    year: m.iYear(),
    monthName: HIJRI_MONTHS_FR[m.iMonth()],
  };
}

/**
 * Formate une date Hijri en string
 */
export function formatHijriDate(day: number, month: number, year: number): string {
  return `${day} ${HIJRI_MONTHS_FR[month - 1]} ${year}`;
}

/**
 * Vérifie si un jour du Ramadan est une nuit spéciale (impaire des 10 derniers jours)
 */
export function isSpecialNight(ramadanDay: number): boolean {
  // Nuits impaires des 10 derniers jours (21, 23, 25, 27, 29)
  const specialNights = [21, 23, 25, 27, 29];
  return specialNights.includes(ramadanDay);
}

/**
 * Obtient la description d'un jour spécial
 */
export function getSpecialDayDescription(ramadanDay: number): string | null {
  if (ramadanDay === 15) {
    return 'Milieu du Ramadan';
  }
  if (ramadanDay === 21) {
    return 'Nuit du Destin potentielle (21)';
  }
  if (ramadanDay === 23) {
    return 'Nuit du Destin potentielle (23)';
  }
  if (ramadanDay === 25) {
    return 'Nuit du Destin potentielle (25)';
  }
  if (ramadanDay === 27) {
    return 'Nuit du Destin probable (27)';
  }
  if (ramadanDay === 29) {
    return 'Nuit du Destin potentielle (29)';
  }
  return null;
}

/**
 * Calcule le temps restant jusqu'à l'Iftar (Maghrib) dans la timezone d'Abidjan
 */
export function getTimeUntilIftar(maghribTime: string, timezone: string = DEFAULT_TIMEZONE): { hours: number; minutes: number; seconds: number; totalSeconds: number; isPassed: boolean } {
  const now = momentTz().tz(timezone);
  const [hours, minutes] = maghribTime.split(':').map(Number);

  const iftarTime = momentTz().tz(timezone).hours(hours).minutes(minutes).seconds(0).milliseconds(0);

  const diffMs = iftarTime.diff(now);

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPassed: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return { hours: h, minutes: m, seconds: s, totalSeconds, isPassed: false };
}

/**
 * Calcule le temps restant jusqu'au Suhoor (fin = Fajr) dans la timezone d'Abidjan
 */
export function getTimeUntilSuhoorEnd(fajrTime: string, timezone: string = DEFAULT_TIMEZONE): { hours: number; minutes: number; seconds: number; totalSeconds: number; isPassed: boolean } {
  const now = momentTz().tz(timezone);
  const [hours, minutes] = fajrTime.split(':').map(Number);

  let suhoorEnd = momentTz().tz(timezone).hours(hours).minutes(minutes).seconds(0).milliseconds(0);

  // Si Fajr est déjà passé aujourd'hui, on calcule pour demain
  if (now.isAfter(suhoorEnd)) {
    suhoorEnd = suhoorEnd.add(1, 'day');
  }

  const diffMs = suhoorEnd.diff(now);
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return { hours: h, minutes: m, seconds: s, totalSeconds, isPassed: false };
}

/**
 * Formate le countdown en string
 */
export function formatCountdown(hours: number, minutes: number, seconds: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Dua de rupture du jeûne
 */
export const IFTAR_DUAS = [
  {
    id: 1,
    arabic: 'اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
    transliteration: 'Allahumma laka sumtu wa ala rizqika aftartu',
    translation: "Ô Allah, c'est pour Toi que j'ai jeûné et c'est avec Ta subsistance que je romps mon jeûne",
    source: 'Abu Dawud',
  },
  {
    id: 2,
    arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
    transliteration: "Dhahaba adh-dhama'u wabtallatil-'urooqu wa thabatal-ajru in sha Allah",
    translation: "La soif est partie, les veines se sont humidifiées et la récompense est confirmée si Allah le veut",
    source: 'Abu Dawud',
  },
  {
    id: 3,
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ أَنْ تَغْفِرَ لِي',
    transliteration: "Allahumma inni as'aluka bi-rahmatika al-lati wasi'at kulla shay'in an taghfira li",
    translation: "Ô Allah, je Te demande par Ta miséricorde qui englobe toute chose, de me pardonner",
    source: 'Ibn Majah',
  },
];

/**
 * Calcul du pourcentage de lecture du Coran
 */
export const TOTAL_QURAN_VERSES = 6236;

export function calculateReadingProgress(versesRead: number): number {
  return Math.min(100, (versesRead / TOTAL_QURAN_VERSES) * 100);
}

export function calculateDailyTarget(totalDays: number = 30): number {
  return Math.ceil(TOTAL_QURAN_VERSES / totalDays);
}

/**
 * Structure des données de progression Ramadan
 */
export interface RamadanProgressData {
  year: number;
  dailyGoal: number;
  totalVersesRead: number;
  dailyProgress: {
    day: number;
    date: string;
    versesRead: number;
    goalMet: boolean;
  }[];
}

/**
 * Structure des données du journal Ramadan
 */
export interface RamadanJournalEntry {
  day: number;
  date: string;
  hijriDate: string;
  notes: string;
  versesRead: number;
  goalMet: boolean;
  updatedAt: number;
}

export interface RamadanJournalData {
  year: number;
  entries: RamadanJournalEntry[];
}
