/**
 * Hook usePrayerTimes - Version simplifiée
 * Gère les horaires de prière avec countdown temps réel
 */

import { useState, useEffect } from 'react';
import {
  PrayerTimes,
  Coordinates,
  CalculationMethod,
} from 'adhan';
import moment from 'moment-timezone';
import { DEFAULT_COORDINATES, PRAYER_NAMES } from '../constants';

// Timezone Abidjan
const TIMEZONE = 'Africa/Abidjan';

// Types
export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface Prayer {
  name: PrayerName;
  nameFrench: string;
  nameArabic: string;
  time: Date;
  timeString: string;
  isPassed: boolean;
  isNext: boolean;
}

export interface CountdownData {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  formatted: string;
  isUrgent: boolean;
}

export interface UsePrayerTimesResult {
  prayers: Prayer[];
  nextPrayer: Prayer | null;
  currentPrayer: PrayerName | null;
  countdown: CountdownData;
  countdownString: string;
  currentTimeAbidjan: string;
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Hook principal
 */
export const usePrayerTimes = (): UsePrayerTimesResult => {
  // États
  const [currentTimeAbidjan, setCurrentTimeAbidjan] = useState<string>('--:--:--');
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [nextPrayer, setNextPrayer] = useState<Prayer | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<PrayerName | null>(null);
  const [countdown, setCountdown] = useState<CountdownData>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    formatted: '00:00:00',
    isUrgent: false,
  });
  const [countdownString, setCountdownString] = useState<string>('--');
  const [isLoading, setIsLoading] = useState(true);

  // Stocker les horaires calculés (ne change pas pendant la journée)
  const [todayPrayers, setTodayPrayers] = useState<Prayer[]>([]);
  const [tomorrowFajr, setTomorrowFajr] = useState<Prayer | null>(null);

  /**
   * Calcule les horaires de prière (appelé une seule fois au montage)
   */
  const calculatePrayerTimes = () => {
    console.log('=== CALCUL DES HORAIRES DE PRIÈRE ===');

    const now = moment().tz(TIMEZONE);
    console.log('Heure actuelle Abidjan:', now.format('HH:mm:ss'));

    // Coordonnées Abidjan
    const coords = new Coordinates(
      DEFAULT_COORDINATES.latitude,
      DEFAULT_COORDINATES.longitude
    );

    // Méthode Jafari
    const params = CalculationMethod.Tehran();

    // Calcul pour aujourd'hui
    const todayDate = new Date(now.year(), now.month(), now.date());
    const times = new PrayerTimes(coords, todayDate, params);

    // Créer la liste des prières
    const prayersList: Prayer[] = [
      {
        name: 'fajr',
        nameFrench: PRAYER_NAMES.fajr.french,
        nameArabic: PRAYER_NAMES.fajr.arabic,
        time: times.fajr,
        timeString: moment(times.fajr).tz(TIMEZONE).format('HH:mm'),
        isPassed: false,
        isNext: false,
      },
      {
        name: 'sunrise',
        nameFrench: PRAYER_NAMES.sunrise.french,
        nameArabic: PRAYER_NAMES.sunrise.arabic,
        time: times.sunrise,
        timeString: moment(times.sunrise).tz(TIMEZONE).format('HH:mm'),
        isPassed: false,
        isNext: false,
      },
      {
        name: 'dhuhr',
        nameFrench: PRAYER_NAMES.dhuhr.french,
        nameArabic: PRAYER_NAMES.dhuhr.arabic,
        time: times.dhuhr,
        timeString: moment(times.dhuhr).tz(TIMEZONE).format('HH:mm'),
        isPassed: false,
        isNext: false,
      },
      {
        name: 'asr',
        nameFrench: PRAYER_NAMES.asr.french,
        nameArabic: PRAYER_NAMES.asr.arabic,
        time: times.asr,
        timeString: moment(times.asr).tz(TIMEZONE).format('HH:mm'),
        isPassed: false,
        isNext: false,
      },
      {
        name: 'maghrib',
        nameFrench: PRAYER_NAMES.maghrib.french,
        nameArabic: PRAYER_NAMES.maghrib.arabic,
        time: times.maghrib,
        timeString: moment(times.maghrib).tz(TIMEZONE).format('HH:mm'),
        isPassed: false,
        isNext: false,
      },
      {
        name: 'isha',
        nameFrench: PRAYER_NAMES.isha.french,
        nameArabic: PRAYER_NAMES.isha.arabic,
        time: times.isha,
        timeString: moment(times.isha).tz(TIMEZONE).format('HH:mm'),
        isPassed: false,
        isNext: false,
      },
    ];

    console.log('Horaires calculés (6 dont Chourouk):');
    prayersList.forEach(p => console.log(`  ${p.nameFrench} (${p.name}): ${p.timeString}`));
    console.log('Sunrise brut adhan:', times.sunrise);

    // Calcul Fajr demain
    const tomorrowDate = new Date(now.year(), now.month(), now.date() + 1);
    const tomorrowTimes = new PrayerTimes(coords, tomorrowDate, params);
    const fajrTomorrow: Prayer = {
      name: 'fajr',
      nameFrench: PRAYER_NAMES.fajr.french,
      nameArabic: PRAYER_NAMES.fajr.arabic,
      time: tomorrowTimes.fajr,
      timeString: moment(tomorrowTimes.fajr).tz(TIMEZONE).format('HH:mm'),
      isPassed: false,
      isNext: false,
    };
    console.log('Fajr demain:', fajrTomorrow.timeString);

    setTodayPrayers(prayersList);
    setTomorrowFajr(fajrTomorrow);
    setIsLoading(false);

    console.log('=== FIN CALCUL ===');
  };

  /**
   * Met à jour l'état chaque seconde
   */
  const updateEverySecond = () => {
    // 1. Mettre à jour l'heure actuelle
    const now = moment().tz(TIMEZONE);
    const timeStr = now.format('HH:mm:ss');
    setCurrentTimeAbidjan(timeStr);

    // 2. Si pas encore de prières calculées, sortir
    if (todayPrayers.length === 0) {
      return;
    }

    // 3. Déterminer quelle prière est la prochaine
    let foundNextPrayer: Prayer | null = null;
    let foundCurrentPrayer: PrayerName | null = null;

    const updatedPrayers = todayPrayers.map((prayer, index) => {
      const prayerMoment = moment(prayer.time).tz(TIMEZONE);
      const isPassed = now.isAfter(prayerMoment);

      // Chourouk n'est jamais "prochaine prière" — c'est une heure informative
      let isNext = false;
      if (!foundNextPrayer && !isPassed && prayer.name !== 'sunrise') {
        isNext = true;
        foundNextPrayer = { ...prayer, isPassed, isNext: true };
        // Trouver la dernière prière passée (en ignorant sunrise)
        for (let j = index - 1; j >= 0; j--) {
          if (todayPrayers[j].name !== 'sunrise') {
            foundCurrentPrayer = todayPrayers[j].name;
            break;
          }
        }
      }

      return { ...prayer, isPassed, isNext };
    });

    // 4. Si toutes les prières sont passées, prochaine = Fajr demain
    if (!foundNextPrayer && tomorrowFajr) {
      foundNextPrayer = { ...tomorrowFajr, isPassed: false, isNext: true };
      foundCurrentPrayer = 'isha';
    }

    // 5. Calculer le countdown
    if (foundNextPrayer) {
      const targetMoment = moment(foundNextPrayer.time).tz(TIMEZONE);
      const diffMs = targetMoment.diff(now);

      if (diffMs > 0) {
        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const isUrgent = totalSeconds < 300; // moins de 5 min

        // Format countdown string
        let countdownStr: string;
        if (hours > 0) {
          countdownStr = `${hours}h ${minutes}min ${seconds}s`;
        } else if (minutes > 0) {
          countdownStr = `${minutes}min ${seconds}s`;
        } else {
          countdownStr = `${seconds}s`;
        }

        setCountdown({
          hours,
          minutes,
          seconds,
          totalSeconds,
          formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          isUrgent,
        });
        setCountdownString(countdownStr);

        // Log toutes les 10 secondes
        if (seconds % 10 === 0) {
          console.log(`⏱️ ${timeStr} | Prochaine: ${foundNextPrayer.nameFrench} | Dans: ${countdownStr}`);
        }
      }
    }

    // 6. Mettre à jour les états
    setPrayers(updatedPrayers);
    setNextPrayer(foundNextPrayer);
    setCurrentPrayer(foundCurrentPrayer);
  };

  // Effet pour calculer les horaires au montage
  useEffect(() => {
    console.log('>>> usePrayerTimes MONTÉ');
    calculatePrayerTimes();
  }, []);

  // Effet pour la mise à jour chaque seconde
  useEffect(() => {
    console.log('>>> setInterval DÉMARRÉ');

    // Exécuter immédiatement
    updateEverySecond();

    // Puis chaque seconde
    const intervalId = setInterval(() => {
      updateEverySecond();
    }, 1000);

    // Cleanup
    return () => {
      console.log('>>> setInterval NETTOYÉ');
      clearInterval(intervalId);
    };
  }, [todayPrayers, tomorrowFajr]); // Re-créer l'interval quand les prières changent

  // Fonction refresh
  const refresh = () => {
    console.log('>>> REFRESH appelé');
    setIsLoading(true);
    calculatePrayerTimes();
  };

  return {
    prayers,
    nextPrayer,
    currentPrayer,
    countdown,
    countdownString,
    currentTimeAbidjan,
    isLoading,
    refresh,
  };
};

export default usePrayerTimes;
