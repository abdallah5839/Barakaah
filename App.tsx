/**
 * App.tsx - Sakina - Application Coranique Chiite Premium
 * Version 3.0 - Fonctionnalites completes
 */

import React, { useState, createContext, useContext, ReactNode, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
  Modal,
  FlatList,
  Animated,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  InteractionManager,
  Share,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import moment from 'moment-hijri';
import momentTz from 'moment-timezone';
import { getAdjustedHijriMoment } from './src/utils/hijriOffset';
import { PrayerTimes, Coordinates, CalculationMethod, CalculationParameters } from 'adhan';

// Import du module Dua
import { DuaProvider, ThemeProvider as DuaThemeProvider } from './src/contexts';
import { DeviceProvider } from './src/contexts/DeviceContext';
import { DuaNavigator } from './src/navigation';
import { QiblaScreen, CalendrierHijriScreen, AboutScreen, DownloadsScreen, TasbihScreen, OnboardingScreen } from './src/screens';
import { CircleNavigator } from './src/navigation/CircleNavigator';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ===== TIMEZONE ET LOCALISATION PAR DÉFAUT =====
const DEFAULT_TIMEZONE = 'Africa/Abidjan';
const DEFAULT_CITY = 'Abidjan';
const DEFAULT_COUNTRY = "Cote d'Ivoire";
const DEFAULT_LATITUDE = 5.3600;
const DEFAULT_LONGITUDE = -4.0083;

// ===== FONCTIONS DE CALCUL DES HORAIRES DE PRIÈRE =====
interface PrayerInfo {
  name: string;
  ar: string;
  time: string;
  icon: string;
  passed: boolean;
  isNext: boolean;
  isSunrise: boolean;
}

interface NextPrayerInfo {
  name: string;
  ar: string;
  time: string;
  icon: string;
}

// Crée les paramètres de calcul Jafari (chiite) avec angles 16°/14°
// Calibration via methodAdjustments pour correspondre à l'app 313 (Abidjan référence)
const createJafariParams = (adjustments?: { [key: string]: number }): CalculationParameters => {
  const params = CalculationMethod.Tehran();
  params.fajrAngle = 16;
  params.ishaAngle = 14;
  params.maghribAngle = 0;

  // Calibration fixe (methodAdjustments) pour aligner sur l'app 313
  params.methodAdjustments.fajr = 4;
  params.methodAdjustments.asr = -1;
  params.methodAdjustments.maghrib = 13;

  // Ajustements utilisateur (se cumulent avec la calibration)
  if (adjustments) {
    params.adjustments.fajr = adjustments['Sobh'] || adjustments['Fajr'] || 0;
    params.adjustments.dhuhr = adjustments['Dohr'] || adjustments['Dhuhr'] || 0;
    params.adjustments.asr = adjustments['Asr'] || 0;
    params.adjustments.maghrib = adjustments['Maghrib'] || 0;
    params.adjustments.isha = adjustments['Icha'] || adjustments['Isha'] || 0;
  }

  return params;
};

// Calcule les horaires de prière pour une position donnée
const calculatePrayerTimesForLocation = (
  latitude: number,
  longitude: number,
  timezone: string,
  adjustments?: { [key: string]: number }
): { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string } => {
  const coords = new Coordinates(latitude, longitude);
  const params = createJafariParams(adjustments);
  const now = momentTz().tz(timezone);
  const date = new Date(now.year(), now.month(), now.date());
  const times = new PrayerTimes(coords, date, params);

  return {
    fajr: momentTz(times.fajr).tz(timezone).format('HH:mm'),
    sunrise: momentTz(times.sunrise).tz(timezone).format('HH:mm'),
    dhuhr: momentTz(times.dhuhr).tz(timezone).format('HH:mm'),
    asr: momentTz(times.asr).tz(timezone).format('HH:mm'),
    maghrib: momentTz(times.maghrib).tz(timezone).format('HH:mm'),
    isha: momentTz(times.isha).tz(timezone).format('HH:mm'),
  };
};

// Détermine quelle prière est la prochaine et lesquelles sont passées
const getPrayersWithStatus = (
  latitude: number,
  longitude: number,
  timezone: string,
  adjustments?: { [key: string]: number }
): { prayers: PrayerInfo[]; nextPrayer: NextPrayerInfo | null; countdown: { h: number; m: number; s: number } } => {
  const times = calculatePrayerTimesForLocation(latitude, longitude, timezone, adjustments);
  const now = momentTz().tz(timezone);
  const currentTimeStr = now.format('HH:mm:ss');

  const prayersList = [
    { name: 'Sobh', ar: 'الصبح', time: times.fajr, icon: 'sunny-outline', isSunrise: false },
    { name: 'Chourouk', ar: 'الشروق', time: times.sunrise, icon: 'sunny', isSunrise: true },
    { name: 'Dohr', ar: 'الظهر', time: times.dhuhr, icon: 'sunny', isSunrise: false },
    { name: 'Asr', ar: 'العصر', time: times.asr, icon: 'partly-sunny-outline', isSunrise: false },
    { name: 'Maghrib', ar: 'المغرب', time: times.maghrib, icon: 'moon-outline', isSunrise: false },
    { name: 'Icha', ar: 'العشاء', time: times.isha, icon: 'cloudy-night-outline', isSunrise: false },
  ];

  let nextPrayer: NextPrayerInfo | null = null;
  let nextPrayerTime: string | null = null;

  const prayersWithStatus: PrayerInfo[] = prayersList.map((prayer, index) => {
    const prayerTimeWithSeconds = prayer.time + ':00';
    const isPassed = currentTimeStr >= prayerTimeWithSeconds;
    let isNext = false;

    // Chourouk n'est jamais "prochaine prière" — c'est une heure informative
    if (!nextPrayer && !isPassed && !prayer.isSunrise) {
      isNext = true;
      nextPrayer = { name: prayer.name, ar: prayer.ar, time: prayer.time, icon: prayer.icon };
      nextPrayerTime = prayer.time;
    }

    return { ...prayer, passed: isPassed, isNext };
  });

  // Si toutes les prières sont passées, la prochaine est Sobh demain
  if (!nextPrayer) {
    const tomorrow = now.clone().add(1, 'day');
    const tomorrowDate = new Date(tomorrow.year(), tomorrow.month(), tomorrow.date());
    const coords = new Coordinates(latitude, longitude);
    const params = createJafariParams(adjustments);
    const tomorrowTimes = new PrayerTimes(coords, tomorrowDate, params);
    const fajrTomorrow = momentTz(tomorrowTimes.fajr).tz(timezone).format('HH:mm');

    nextPrayer = { name: 'Sobh', ar: 'الصبح', time: fajrTomorrow, icon: 'sunny-outline' };
    nextPrayerTime = fajrTomorrow;
  }

  // Calcul du countdown
  let countdown = { h: 0, m: 0, s: 0 };
  if (nextPrayerTime) {
    const [targetH, targetM] = nextPrayerTime.split(':').map(Number);
    let targetMoment = now.clone().hour(targetH).minute(targetM).second(0);

    // Si l'heure cible est passée (Fajr demain), ajouter un jour
    if (targetMoment.isBefore(now)) {
      targetMoment.add(1, 'day');
    }

    const diffMs = targetMoment.diff(now);
    if (diffMs > 0) {
      const totalSeconds = Math.floor(diffMs / 1000);
      countdown = {
        h: Math.floor(totalSeconds / 3600),
        m: Math.floor((totalSeconds % 3600) / 60),
        s: totalSeconds % 60,
      };
    }
  }

  return { prayers: prayersWithStatus, nextPrayer, countdown };
};

// Hook personnalisé pour les horaires de prière en temps réel
const usePrayerTimesRealtime = (latitude: number, longitude: number, timezone: string, adjustments?: { [key: string]: number }) => {
  const [prayers, setPrayers] = useState<PrayerInfo[]>([]);
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  const [currentTime, setCurrentTime] = useState(momentTz().tz(timezone).format('HH:mm:ss'));

  // Sérialiser les adjustments pour la dépendance useEffect
  const adjustmentsKey = JSON.stringify(adjustments || {});

  useEffect(() => {
    // Fonction de mise à jour
    const update = () => {
      const now = momentTz().tz(timezone);
      setCurrentTime(now.format('HH:mm:ss'));

      const result = getPrayersWithStatus(latitude, longitude, timezone, adjustments);
      setPrayers(result.prayers);
      setNextPrayer(result.nextPrayer);
      setCountdown(result.countdown);

    };

    // Mise à jour immédiate
    update();

    // Mise à jour chaque seconde
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [latitude, longitude, timezone, adjustmentsKey]);

  return { prayers, nextPrayer, countdown, currentTime };
};

// ===== TYPES =====
type ScreenName = 'home' | 'coran' | 'prieres' | 'ramadan' | 'dua' | 'settings' | 'qibla' | 'calendrier' | 'about' | 'downloads' | 'cercle' | 'tasbih';

// Titres des écrans pour le header
const SCREEN_TITLES: Record<ScreenName, string> = {
  home: 'Accueil',
  coran: 'Coran',
  prieres: 'Prières',
  ramadan: 'Ramadan',
  dua: 'Dua',
  settings: 'Paramètres',
  qibla: 'Direction Qibla',
  calendrier: 'Calendrier Hijri',
  about: 'À propos',
  downloads: 'Téléchargements',
  cercle: 'Cercle de Lecture',
  tasbih: 'Tasbih',
};

interface Bookmark {
  id: string;
  surahNumber: number;
  verseNumber: number;
  surahName: string;
  note: string;
  color: string;
  timestamp: number;
}

interface FavoriteVerse {
  id: string;
  surahNumber: number;
  verseNumber: number;
  surahName: string;
  arabic: string;
  french: string;
  timestamp: number;
}

interface ReadingHistory {
  date: string;
  versesRead: number;
  minutesSpent: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysRead: number;
  lastReadDate: string;
  lastGoalMetDate: string;
  dailyGoal: number;
  todayVersesRead: number;
  readingHistory: ReadingHistory[];
}

interface LastReadPosition {
  surahNumber: number;
  surahName: string;
  verseNumber: number;
  timestamp: number;
}

interface TodayReadVerses {
  date: string;  // Format YYYY-MM-DD
  verses: string[];  // Format "surah:verse" ex: ["1:1", "1:2", "2:255"]
}

interface Settings {
  // Location
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  // Prayer
  calculationMethod: string;
  prayerAdjustments: { [key: string]: number };
  // Notifications
  notificationsEnabled: boolean;
  notificationMinutes: number;
  prayerNotifications: { [key: string]: boolean };
  dailyReadingReminder: boolean;
  duaKumaylReminder: boolean;
  // Appearance
  themeMode: 'light' | 'dark' | 'auto';
  arabicFontSize: number;
  arabicFont: string;
  // Reading
  showArabic: boolean;
  showTranslation: boolean;
  showPhonetic: boolean;
  fullScreenMode: boolean;
  defaultReciter: string;
  // Audio
  audioSpeed: number;
  verseRepeat: number;
  // Ramadan
  ramadanDailyGoal: number;
  ramadanNotifications: boolean;
  ramadanIftarReminder: number; // minutes before Iftar
  ramadanSuhoorReminder: boolean;
}

// ===== CONSTANTS =====
const STORAGE_KEYS = {
  SETTINGS: 'sakina_settings',
  BOOKMARKS: 'sakina_bookmarks',
  STREAK: 'sakina_streak',
  LAST_READ: 'sakina_lastread',
  RAMADAN_PROGRESS: 'sakina_ramadan_progress',
  RAMADAN_JOURNAL: 'sakina_ramadan_journal',
  FAVORITES: 'sakina_favorites',
  TODAY_READ_VERSES: 'sakina_today_read_verses',
};

const DEFAULT_SETTINGS: Settings = {
  city: DEFAULT_CITY,
  country: DEFAULT_COUNTRY,
  latitude: DEFAULT_LATITUDE,
  longitude: DEFAULT_LONGITUDE,
  timezone: DEFAULT_TIMEZONE,
  calculationMethod: 'Jafari',
  prayerAdjustments: { Sobh: 0, Dohr: 0, Asr: 0, Maghrib: 0, Icha: 0 },
  notificationsEnabled: true,
  notificationMinutes: 10,
  prayerNotifications: { Sobh: true, Dohr: true, Asr: true, Maghrib: true, Icha: true },
  dailyReadingReminder: true,
  duaKumaylReminder: true,
  themeMode: 'light',
  arabicFontSize: 24,
  arabicFont: 'Uthmani',
  showArabic: true,
  showTranslation: true,
  showPhonetic: true,
  fullScreenMode: false,
  defaultReciter: 'minsh',
  audioSpeed: 1,
  verseRepeat: 1,
  ramadanDailyGoal: 10,
  ramadanNotifications: true,
  ramadanIftarReminder: 10,
  ramadanSuhoorReminder: true,
};

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  totalDaysRead: 0,
  lastReadDate: '',
  lastGoalMetDate: '',
  dailyGoal: 10,
  todayVersesRead: 0,
  readingHistory: [],
};

const RECITERS = [
  { id: 'minsh', name: 'Mishary Rashid Alafasy' },
  { id: 'basit', name: 'Abdul Basit' },
  { id: 'sudais', name: 'Abdurrahman As-Sudais' },
];

const BOOKMARK_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#8B5CF6'];

const POPULAR_CITIES = [
  // Côte d'Ivoire
  { city: 'Abidjan', country: "Cote d'Ivoire", lat: 5.3600, lng: -4.0083, tz: 'Africa/Abidjan' },
  { city: 'Bouake', country: "Cote d'Ivoire", lat: 7.6939, lng: -5.0308, tz: 'Africa/Abidjan' },
  { city: 'Yamoussoukro', country: "Cote d'Ivoire", lat: 6.8276, lng: -5.2893, tz: 'Africa/Abidjan' },
  { city: 'San Pedro', country: "Cote d'Ivoire", lat: 4.7392, lng: -6.6426, tz: 'Africa/Abidjan' },
  { city: 'Korhogo', country: "Cote d'Ivoire", lat: 9.4580, lng: -5.6295, tz: 'Africa/Abidjan' },
  // Afrique de l'Ouest
  { city: 'Dakar', country: 'Senegal', lat: 14.7167, lng: -17.4677, tz: 'Africa/Dakar' },
  { city: 'Bamako', country: 'Mali', lat: 12.6392, lng: -8.0029, tz: 'Africa/Bamako' },
  { city: 'Conakry', country: 'Guinee', lat: 9.6412, lng: -13.5784, tz: 'Africa/Conakry' },
  { city: 'Ouagadougou', country: 'Burkina Faso', lat: 12.3714, lng: -1.5197, tz: 'Africa/Ouagadougou' },
  // Afrique du Nord
  { city: 'Casablanca', country: 'Maroc', lat: 33.5731, lng: -7.5898, tz: 'Africa/Casablanca' },
  { city: 'Alger', country: 'Algerie', lat: 36.7538, lng: 3.0588, tz: 'Africa/Algiers' },
  { city: 'Tunis', country: 'Tunisie', lat: 36.8065, lng: 10.1815, tz: 'Africa/Tunis' },
  // Lieux saints
  { city: 'Makkah', country: 'Arabie Saoudite', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' },
  { city: 'Madinah', country: 'Arabie Saoudite', lat: 24.5247, lng: 39.5692, tz: 'Asia/Riyadh' },
  // Europe
  { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
  { city: 'Dubai', country: 'EAU', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },
];

// ===== RAMADAN CONSTANTS =====
const TOTAL_QURAN_VERSES = 6236;
const RAMADAN_DAYS = 30;

const HIJRI_MONTHS_FR = [
  'Mouharram', 'Safar', 'Rabi al-Awal', 'Rabi al-Thani',
  'Joumada al-Awal', 'Joumada al-Thani', 'Rajab', 'Chaabane',
  'Ramadan', 'Chawwal', 'Dhoul Qidah', 'Dhoul Hijja',
];

const IFTAR_DUAS = [
  {
    id: 1,
    arabic: 'اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
    transliteration: 'Allahumma laka sumtu wa ala rizqika aftartu',
    translation: "O Allah, c'est pour Toi que j'ai jeune et c'est avec Ta subsistance que je romps mon jeune",
    source: 'Abu Dawud',
  },
  {
    id: 2,
    arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
    transliteration: "Dhahaba adh-dhama'u wabtallatil-'urooqu wa thabatal-ajru in sha Allah",
    translation: "La soif est partie, les veines se sont humidifiees et la recompense est confirmee si Allah le veut",
    source: 'Abu Dawud',
  },
  {
    id: 3,
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ أَنْ تَغْفِرَ لِي',
    transliteration: "Allahumma inni as'aluka bi-rahmatika al-lati wasi'at kulla shay'in an taghfira li",
    translation: "O Allah, je Te demande par Ta misericorde qui englobe toute chose, de me pardonner",
    source: 'Ibn Majah',
  },
];

// Couleurs thème Ramadan
const RamadanColors = {
  primary: '#4C1D95',      // Violet profond
  primaryLight: '#7C3AED',
  secondary: '#F59E0B',    // Or
  accent: '#1E3A8A',       // Bleu nuit
  backgroundGradient: ['#1E1B4B', '#312E81', '#1E3A8A'] as const,
  cardGradient: ['#4C1D95', '#6D28D9'] as const,
  iftarGradient: ['#F59E0B', '#D97706', '#B45309'] as const,
  starColor: '#FCD34D',
};

// Types Ramadan
type RamadanStatus = 'before' | 'during' | 'after';

interface RamadanInfo {
  status: RamadanStatus;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  hijriMonthName: string;
  ramadanDay?: number;
  daysUntilRamadan?: number;
  daysUntilEnd?: number;
}

interface RamadanProgressData {
  year: number;
  dailyGoal: number;
  totalVersesRead: number;
  dailyProgress: { day: number; date: string; versesRead: number; goalMet: boolean }[];
}

interface RamadanJournalEntry {
  day: number;
  date: string;
  hijriDate: string;
  notes: string;
  versesRead: number;
  updatedAt: number;
}

// ===== RAMADAN UTILITY FUNCTIONS =====
const getRamadanInfo = (): RamadanInfo => {
  const m = getAdjustedHijriMoment();
  const hijriDay = m.iDate();
  const hijriMonth = m.iMonth() + 1;
  const hijriYear = m.iYear();
  const hijriMonthName = HIJRI_MONTHS_FR[hijriMonth - 1];

  if (hijriMonth === 9) {
    return {
      status: 'during',
      hijriDay,
      hijriMonth,
      hijriYear,
      hijriMonthName,
      ramadanDay: hijriDay,
      daysUntilEnd: RAMADAN_DAYS - hijriDay,
    };
  } else if (hijriMonth < 9) {
    const ramadanStart = moment(`${hijriYear}/9/1`, 'iYYYY/iM/iD');
    const daysUntil = ramadanStart.diff(m, 'days');
    return {
      status: 'before',
      hijriDay,
      hijriMonth,
      hijriYear,
      hijriMonthName,
      daysUntilRamadan: daysUntil,
    };
  } else {
    const nextRamadanStart = moment(`${hijriYear + 1}/9/1`, 'iYYYY/iM/iD');
    const daysUntil = nextRamadanStart.diff(m, 'days');
    return {
      status: 'after',
      hijriDay,
      hijriMonth,
      hijriYear: hijriYear + 1,
      hijriMonthName,
      daysUntilRamadan: daysUntil,
    };
  }
};

const isSpecialNight = (ramadanDay: number): boolean => {
  return [21, 23, 25, 27, 29].includes(ramadanDay);
};

const getSpecialDayDescription = (ramadanDay: number): string | null => {
  if (ramadanDay === 15) return 'Milieu du Ramadan';
  if (ramadanDay === 21) return 'Nuit du Destin potentielle';
  if (ramadanDay === 23) return 'Nuit du Destin potentielle';
  if (ramadanDay === 25) return 'Nuit du Destin potentielle';
  if (ramadanDay === 27) return 'Nuit du Destin probable';
  if (ramadanDay === 29) return 'Nuit du Destin potentielle';
  return null;
};

const Colors = {
  light: {
    primary: '#16a34a',
    primaryDark: '#166534',
    primaryDeep: '#0F4C35',
    secondary: '#D4AF37',
    secondaryLight: '#F4E4BA',
    secondaryDark: '#B8960C',
    cream: '#FBF9F3',
    background: '#F9FAFB',
    backgroundGradient: ['#0F4C35', '#166534', '#F9FAFB'] as const,
    headerGradient: ['#0F4C35', '#166534'] as const,
    surface: '#FFFFFF',
    surfaceElevated: 'rgba(255, 255, 255, 0.97)',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: 'rgba(229, 231, 235, 0.5)',
    glassBg: 'rgba(255, 255, 255, 0.92)',
    glassStroke: 'rgba(255, 255, 255, 0.6)',
    success: '#16a34a',
    error: '#DC2626',
    prayerCardGradient: ['#0F4C35', '#166534', '#16a34a'] as const,
    qiblaGradient: ['#0E7490', '#0891B2'] as const,
  },
  dark: {
    primary: '#22c55e',
    primaryDark: '#16a34a',
    primaryDeep: '#0A3D2B',
    secondary: '#FBBF24',
    secondaryLight: '#78350F',
    secondaryDark: '#D97706',
    cream: '#1E293B',
    background: '#0F172A',
    backgroundGradient: ['#0A1628', '#0F172A', '#1E293B'] as const,
    headerGradient: ['#0A1628', '#1E293B'] as const,
    surface: '#1E293B',
    surfaceElevated: 'rgba(30, 41, 59, 0.97)',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderLight: 'rgba(51, 65, 85, 0.5)',
    glassBg: 'rgba(30, 41, 59, 0.92)',
    glassStroke: 'rgba(255, 255, 255, 0.08)',
    success: '#22c55e',
    error: '#EF4444',
    prayerCardGradient: ['#0A3D2B', '#16a34a', '#22c55e'] as const,
    qiblaGradient: ['#155E75', '#0E7490'] as const,
  },
};

type ThemeColors = typeof Colors.light & typeof Colors.dark;

// ===== CONTEXTS =====
interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'timestamp'>) => void;
  removeBookmark: (id: string) => void;
  favorites: FavoriteVerse[];
  addFavorite: (fav: Omit<FavoriteVerse, 'id' | 'timestamp'>) => void;
  removeFavorite: (id: string) => void;
  streak: StreakData;
  updateStreak: (versesRead: number) => void;
  updateDailyGoal: (goal: number) => void;
  lastRead: LastReadPosition | null;
  updateLastRead: (position: Omit<LastReadPosition, 'timestamp'>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// ===== PROVIDERS =====
const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [settingsData, bookmarksData, streakData, lastReadData, favoritesData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_READ),
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
      ]);

      if (settingsData) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) });
      if (bookmarksData) setBookmarks(JSON.parse(bookmarksData));
      if (favoritesData) setFavorites(JSON.parse(favoritesData));
      if (streakData) {
        const loaded: StreakData = { ...DEFAULT_STREAK, ...JSON.parse(streakData) };
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Nouveau jour : remettre le compteur de versets à 0
        if (loaded.lastReadDate !== today) {
          loaded.todayVersesRead = 0;
        }

        // Si l'objectif n'a été atteint ni aujourd'hui ni hier → streak = 0
        if (loaded.lastGoalMetDate !== today && loaded.lastGoalMetDate !== yesterday) {
          loaded.currentStreak = 0;
        }

        setStreak(loaded);
        await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(loaded));
      }
      if (lastReadData) setLastRead(JSON.parse(lastReadData));
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoaded(true);
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  };

  const addBookmark = async (bookmark: Omit<Bookmark, 'id' | 'timestamp'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
  };

  const removeBookmark = async (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
  };

  const addFavorite = async (fav: Omit<FavoriteVerse, 'id' | 'timestamp'>) => {
    const newFav: FavoriteVerse = {
      ...fav,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    const updated = [...favorites, newFav];
    setFavorites(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  };

  const removeFavorite = async (id: string) => {
    const updated = favorites.filter(f => f.id !== id);
    setFavorites(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  };

  const updateStreak = async (versesRead: number) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = { ...streak };

    // Nouveau jour : remettre le compteur de versets à 0
    if (newStreak.lastReadDate !== today) {
      newStreak.todayVersesRead = 0;
      newStreak.totalDaysRead += 1;
      newStreak.lastReadDate = today;

      // Si l'objectif n'a été atteint ni aujourd'hui ni hier → streak = 0
      if (newStreak.lastGoalMetDate !== today && newStreak.lastGoalMetDate !== yesterday) {
        newStreak.currentStreak = 0;
      }
    }

    // Incrémenter les versets lus
    newStreak.todayVersesRead += versesRead;

    // Vérifier si l'objectif vient d'être atteint (première fois aujourd'hui)
    if (newStreak.todayVersesRead >= newStreak.dailyGoal && newStreak.lastGoalMetDate !== today) {
      // Objectif atteint pour la première fois aujourd'hui
      if (newStreak.lastGoalMetDate === yesterday) {
        // Jour consécutif → chaîne +1
        newStreak.currentStreak += 1;
      } else {
        // Chaîne brisée → recommencer à 1
        newStreak.currentStreak = 1;
      }
      newStreak.lastGoalMetDate = today;

      if (newStreak.currentStreak > newStreak.longestStreak) {
        newStreak.longestStreak = newStreak.currentStreak;
      }
    }

    // Mettre à jour l'historique du jour
    const todayEntry = newStreak.readingHistory.find(h => h.date === today);
    if (todayEntry) {
      todayEntry.versesRead = newStreak.todayVersesRead;
    } else {
      newStreak.readingHistory.push({
        date: today,
        versesRead: newStreak.todayVersesRead,
        minutesSpent: 0,
      });
    }

    setStreak(newStreak);
    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(newStreak));
  };

  const updateDailyGoal = async (goal: number) => {
    const newStreak = { ...streak, dailyGoal: goal };
    setStreak(newStreak);
    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(newStreak));
  };

  const updateLastRead = async (position: Omit<LastReadPosition, 'timestamp'>) => {
    const updated: LastReadPosition = { ...position, timestamp: Date.now() };
    setLastRead(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(updated));
  };

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ color: '#FFF', marginTop: 16 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SettingsContext.Provider value={{
      settings, updateSettings, bookmarks, addBookmark, removeBookmark,
      favorites, addFavorite, removeFavorite,
      streak, updateStreak, updateDailyGoal, lastRead, updateLastRead,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { settings, updateSettings } = useSettings();
  const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'auto' && false);
  const colors = (isDark ? Colors.dark : Colors.light) as ThemeColors;

  const toggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMode = settings.themeMode === 'light' ? 'dark' : 'light';
    updateSettings({ themeMode: newMode });
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ===== ANIMATED COMPONENTS =====
const PressableScale = ({ children, onPress, style, disabled }: { children: ReactNode; onPress?: () => void; style?: any; disabled?: boolean }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }
      }}
      disabled={disabled}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const FadeInView = ({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

const PulseView = ({ children, style }: { children: ReactNode; style?: any }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale: pulseAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

const ShimmerGold = ({ children, style }: { children: ReactNode; style?: any }) => {
  const shimmer = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.85, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[{ opacity: shimmer }, style]}>
      {children}
    </Animated.View>
  );
};

const ScaleInView = ({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: any }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ===== UI COMPONENTS =====
const GlassCard = ({ children, style, colors: c, gold }: { children: ReactNode; style?: any; colors: ThemeColors; gold?: boolean }) => (
  <View style={[styles.glassCard, { backgroundColor: c.glassBg, borderColor: gold ? c.secondary + '40' : c.glassStroke }, gold && { shadowColor: c.secondary, shadowOpacity: 0.08 }, style]}>
    {children}
  </View>
);

const CountdownTimer = () => {
  const [time, setTime] = useState({ h: 2, m: 34, s: 12 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) h = 23;
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (n: number) => n.toString().padStart(2, '0');

  return (
    <Text style={styles.countdown}>
      Dans {fmt(time.h)}h {fmt(time.m)}min {fmt(time.s)}s
    </Text>
  );
};

// ===== CUSTOM HEADER =====
interface CustomHeaderProps {
  title: string;
  showBackButton: boolean;
  onBack: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
}

const CustomHeader = ({ title, showBackButton, onBack, rightIcon, onRightPress }: CustomHeaderProps) => {
  const { colors } = useTheme();

  return (
    <View style={[headerStyles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border + '40' }]}>
      <View style={headerStyles.leftSection}>
        {showBackButton ? (
          <PressableScale onPress={onBack} style={headerStyles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </PressableScale>
        ) : (
          <View style={headerStyles.backPlaceholder} />
        )}
      </View>

      <Text style={[headerStyles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={headerStyles.rightSection}>
        {rightIcon && onRightPress ? (
          <PressableScale onPress={onRightPress} style={headerStyles.rightButton}>
            <Ionicons name={rightIcon as any} size={24} color={colors.textSecondary} />
          </PressableScale>
        ) : (
          <View style={headerStyles.rightPlaceholder} />
        )}
      </View>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    zIndex: 100,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  leftSection: {
    width: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 44,
    height: 44,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  rightSection: {
    width: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightPlaceholder: {
    width: 44,
    height: 44,
  },
});

// ===== QURAN DATA (chargé depuis les fichiers JSON) =====
const surahsMetadata = require('./assets/data/quran/surahs-metadata.json');
const SURAHS = surahsMetadata.map((s: any) => ({
  number: s.id,
  name: s.nameTransliteration,
  nameAr: s.nameArabic,
  versesCount: s.totalVerses,
  type: s.revelationType === 'meccan' ? 'Mecquoise' : 'Médinoise',
}));

// Cache mémoire des versets déjà chargés
const versesCache = new Map<number, { num: number; ar: string; fr: string; ph: string }[]>();

// Lazy require : Metro bundle les fichiers mais ne les évalue qu'à l'appel
const requireSurahFile = (n: number): any => {
  switch (n) {
    case 1: return require('./assets/data/quran/verses/surah_001.json');
    case 2: return require('./assets/data/quran/verses/surah_002.json');
    case 3: return require('./assets/data/quran/verses/surah_003.json');
    case 4: return require('./assets/data/quran/verses/surah_004.json');
    case 5: return require('./assets/data/quran/verses/surah_005.json');
    case 6: return require('./assets/data/quran/verses/surah_006.json');
    case 7: return require('./assets/data/quran/verses/surah_007.json');
    case 8: return require('./assets/data/quran/verses/surah_008.json');
    case 9: return require('./assets/data/quran/verses/surah_009.json');
    case 10: return require('./assets/data/quran/verses/surah_010.json');
    case 11: return require('./assets/data/quran/verses/surah_011.json');
    case 12: return require('./assets/data/quran/verses/surah_012.json');
    case 13: return require('./assets/data/quran/verses/surah_013.json');
    case 14: return require('./assets/data/quran/verses/surah_014.json');
    case 15: return require('./assets/data/quran/verses/surah_015.json');
    case 16: return require('./assets/data/quran/verses/surah_016.json');
    case 17: return require('./assets/data/quran/verses/surah_017.json');
    case 18: return require('./assets/data/quran/verses/surah_018.json');
    case 19: return require('./assets/data/quran/verses/surah_019.json');
    case 20: return require('./assets/data/quran/verses/surah_020.json');
    case 21: return require('./assets/data/quran/verses/surah_021.json');
    case 22: return require('./assets/data/quran/verses/surah_022.json');
    case 23: return require('./assets/data/quran/verses/surah_023.json');
    case 24: return require('./assets/data/quran/verses/surah_024.json');
    case 25: return require('./assets/data/quran/verses/surah_025.json');
    case 26: return require('./assets/data/quran/verses/surah_026.json');
    case 27: return require('./assets/data/quran/verses/surah_027.json');
    case 28: return require('./assets/data/quran/verses/surah_028.json');
    case 29: return require('./assets/data/quran/verses/surah_029.json');
    case 30: return require('./assets/data/quran/verses/surah_030.json');
    case 31: return require('./assets/data/quran/verses/surah_031.json');
    case 32: return require('./assets/data/quran/verses/surah_032.json');
    case 33: return require('./assets/data/quran/verses/surah_033.json');
    case 34: return require('./assets/data/quran/verses/surah_034.json');
    case 35: return require('./assets/data/quran/verses/surah_035.json');
    case 36: return require('./assets/data/quran/verses/surah_036.json');
    case 37: return require('./assets/data/quran/verses/surah_037.json');
    case 38: return require('./assets/data/quran/verses/surah_038.json');
    case 39: return require('./assets/data/quran/verses/surah_039.json');
    case 40: return require('./assets/data/quran/verses/surah_040.json');
    case 41: return require('./assets/data/quran/verses/surah_041.json');
    case 42: return require('./assets/data/quran/verses/surah_042.json');
    case 43: return require('./assets/data/quran/verses/surah_043.json');
    case 44: return require('./assets/data/quran/verses/surah_044.json');
    case 45: return require('./assets/data/quran/verses/surah_045.json');
    case 46: return require('./assets/data/quran/verses/surah_046.json');
    case 47: return require('./assets/data/quran/verses/surah_047.json');
    case 48: return require('./assets/data/quran/verses/surah_048.json');
    case 49: return require('./assets/data/quran/verses/surah_049.json');
    case 50: return require('./assets/data/quran/verses/surah_050.json');
    case 51: return require('./assets/data/quran/verses/surah_051.json');
    case 52: return require('./assets/data/quran/verses/surah_052.json');
    case 53: return require('./assets/data/quran/verses/surah_053.json');
    case 54: return require('./assets/data/quran/verses/surah_054.json');
    case 55: return require('./assets/data/quran/verses/surah_055.json');
    case 56: return require('./assets/data/quran/verses/surah_056.json');
    case 57: return require('./assets/data/quran/verses/surah_057.json');
    case 58: return require('./assets/data/quran/verses/surah_058.json');
    case 59: return require('./assets/data/quran/verses/surah_059.json');
    case 60: return require('./assets/data/quran/verses/surah_060.json');
    case 61: return require('./assets/data/quran/verses/surah_061.json');
    case 62: return require('./assets/data/quran/verses/surah_062.json');
    case 63: return require('./assets/data/quran/verses/surah_063.json');
    case 64: return require('./assets/data/quran/verses/surah_064.json');
    case 65: return require('./assets/data/quran/verses/surah_065.json');
    case 66: return require('./assets/data/quran/verses/surah_066.json');
    case 67: return require('./assets/data/quran/verses/surah_067.json');
    case 68: return require('./assets/data/quran/verses/surah_068.json');
    case 69: return require('./assets/data/quran/verses/surah_069.json');
    case 70: return require('./assets/data/quran/verses/surah_070.json');
    case 71: return require('./assets/data/quran/verses/surah_071.json');
    case 72: return require('./assets/data/quran/verses/surah_072.json');
    case 73: return require('./assets/data/quran/verses/surah_073.json');
    case 74: return require('./assets/data/quran/verses/surah_074.json');
    case 75: return require('./assets/data/quran/verses/surah_075.json');
    case 76: return require('./assets/data/quran/verses/surah_076.json');
    case 77: return require('./assets/data/quran/verses/surah_077.json');
    case 78: return require('./assets/data/quran/verses/surah_078.json');
    case 79: return require('./assets/data/quran/verses/surah_079.json');
    case 80: return require('./assets/data/quran/verses/surah_080.json');
    case 81: return require('./assets/data/quran/verses/surah_081.json');
    case 82: return require('./assets/data/quran/verses/surah_082.json');
    case 83: return require('./assets/data/quran/verses/surah_083.json');
    case 84: return require('./assets/data/quran/verses/surah_084.json');
    case 85: return require('./assets/data/quran/verses/surah_085.json');
    case 86: return require('./assets/data/quran/verses/surah_086.json');
    case 87: return require('./assets/data/quran/verses/surah_087.json');
    case 88: return require('./assets/data/quran/verses/surah_088.json');
    case 89: return require('./assets/data/quran/verses/surah_089.json');
    case 90: return require('./assets/data/quran/verses/surah_090.json');
    case 91: return require('./assets/data/quran/verses/surah_091.json');
    case 92: return require('./assets/data/quran/verses/surah_092.json');
    case 93: return require('./assets/data/quran/verses/surah_093.json');
    case 94: return require('./assets/data/quran/verses/surah_094.json');
    case 95: return require('./assets/data/quran/verses/surah_095.json');
    case 96: return require('./assets/data/quran/verses/surah_096.json');
    case 97: return require('./assets/data/quran/verses/surah_097.json');
    case 98: return require('./assets/data/quran/verses/surah_098.json');
    case 99: return require('./assets/data/quran/verses/surah_099.json');
    case 100: return require('./assets/data/quran/verses/surah_100.json');
    case 101: return require('./assets/data/quran/verses/surah_101.json');
    case 102: return require('./assets/data/quran/verses/surah_102.json');
    case 103: return require('./assets/data/quran/verses/surah_103.json');
    case 104: return require('./assets/data/quran/verses/surah_104.json');
    case 105: return require('./assets/data/quran/verses/surah_105.json');
    case 106: return require('./assets/data/quran/verses/surah_106.json');
    case 107: return require('./assets/data/quran/verses/surah_107.json');
    case 108: return require('./assets/data/quran/verses/surah_108.json');
    case 109: return require('./assets/data/quran/verses/surah_109.json');
    case 110: return require('./assets/data/quran/verses/surah_110.json');
    case 111: return require('./assets/data/quran/verses/surah_111.json');
    case 112: return require('./assets/data/quran/verses/surah_112.json');
    case 113: return require('./assets/data/quran/verses/surah_113.json');
    case 114: return require('./assets/data/quran/verses/surah_114.json');
    default: return null;
  }
};

const getSurahVerses = (surahNumber: number) => {
  const cached = versesCache.get(surahNumber);
  if (cached) return cached;
  const data = requireSurahFile(surahNumber);
  if (!data) return [];
  const verses = data.verses.map((v: any) => ({
    num: v.number,
    ar: v.arabic,
    fr: v.french,
    ph: v.phonetic,
  }));
  versesCache.set(surahNumber, verses);
  return verses;
};

// ===== DAILY VERSE (deterministic based on date) =====
const DAILY_VERSE_LIKED_KEY = 'sakina_daily_verse_liked';

// Total Quran verses = 6236. Build a cumulative index per surah for O(1) lookup.
const surahCumulativeVerses: number[] = [];
let _cumTotal = 0;
for (const s of surahsMetadata) {
  surahCumulativeVerses.push(_cumTotal);
  _cumTotal += s.totalVerses;
}
// TOTAL_QURAN_VERSES already declared above (6236)

interface DailyVerse {
  surahNumber: number;
  surahName: string;
  surahNameAr: string;
  verseNumber: number;
  arabic: string;
  french: string;
}

const getDailyVerse = (): DailyVerse => {
  // Deterministic index based on date: same day = same verse
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  // Mix in the year so the cycle doesn't repeat each year
  const seed = dayOfYear + now.getFullYear() * 367;
  const globalIndex = ((seed * 2654435761) >>> 0) % TOTAL_QURAN_VERSES;

  // Find which surah this global index falls into
  let surahIdx = 0;
  for (let i = 0; i < surahCumulativeVerses.length; i++) {
    if (i + 1 < surahCumulativeVerses.length && globalIndex >= surahCumulativeVerses[i + 1]) {
      continue;
    }
    surahIdx = i;
    break;
  }
  const surahNumber = surahIdx + 1;
  const verseIndex = globalIndex - surahCumulativeVerses[surahIdx];

  const surahMeta = surahsMetadata[surahIdx];
  const verses = getSurahVerses(surahNumber);
  const verse = verses[verseIndex] || verses[0];

  return {
    surahNumber,
    surahName: surahMeta.nameTransliteration,
    surahNameAr: surahMeta.nameArabic,
    verseNumber: verse.num,
    arabic: verse.ar,
    french: verse.fr,
  };
};

// ===== NAVIGATION CONTEXT =====
interface NavigationContextType {
  navigate: (screen: ScreenName) => void;
  goBack: () => void;
  canGoBack: boolean;
  currentScreen: ScreenName;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used within NavigationProvider');
  return context;
};

// ===== HOME SCREEN =====
// Kaaba coordinates for Qibla
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

const HomeScreen = ({ onNavigate }: { onNavigate: (s: ScreenName) => void }) => {
  const { colors, toggleTheme, isDark } = useTheme();
  const { streak, lastRead, settings } = useSettings();
  const ramadanInfo = getRamadanInfo();

  // ===== VERSET DU JOUR =====
  const dailyVerse = useMemo(() => getDailyVerse(), []);
  const [isDailyVerseLiked, setIsDailyVerseLiked] = useState(false);

  // Charger l'état "liké" depuis AsyncStorage
  useEffect(() => {
    const loadLikedState = async () => {
      try {
        const data = await AsyncStorage.getItem(DAILY_VERSE_LIKED_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          // Check if it's the same verse (same day)
          if (parsed.surahNumber === dailyVerse.surahNumber && parsed.verseNumber === dailyVerse.verseNumber) {
            setIsDailyVerseLiked(true);
          }
        }
      } catch {}
    };
    loadLikedState();
  }, [dailyVerse]);

  const handleDailyVerseLike = useCallback(async () => {
    const newLiked = !isDailyVerseLiked;
    setIsDailyVerseLiked(newLiked);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (newLiked) {
        await AsyncStorage.setItem(DAILY_VERSE_LIKED_KEY, JSON.stringify({
          surahNumber: dailyVerse.surahNumber,
          verseNumber: dailyVerse.verseNumber,
          surahName: dailyVerse.surahName,
          arabic: dailyVerse.arabic,
          french: dailyVerse.french,
          likedAt: new Date().toISOString(),
        }));
      } else {
        await AsyncStorage.removeItem(DAILY_VERSE_LIKED_KEY);
      }
    } catch {}
  }, [isDailyVerseLiked, dailyVerse]);

  const handleDailyVerseShare = useCallback(async () => {
    const text = `${dailyVerse.arabic}\n\n"${dailyVerse.french}"\n\nSourate ${dailyVerse.surahName} (${dailyVerse.surahNumber}:${dailyVerse.verseNumber})\n\n- Partagé depuis l'app Sakina`;
    try { await Share.share({ message: text }); } catch {}
  }, [dailyVerse]);

  // État du cercle de l'utilisateur
  const [userCircle, setUserCircle] = useState<{
    circle: { id: string; name: string; completed_juz: number; expires_at: string };
    membership: { nickname: string };
  } | null>(null);

  // Charger le cercle de l'utilisateur
  useEffect(() => {
    const loadCircle = async () => {
      try {
        const { getDeviceId } = await import('./src/services/deviceService');
        const { checkUserCircle } = await import('./src/services/circleService');
        const deviceId = await getDeviceId();
        const result = await checkUserCircle(deviceId);
        setUserCircle(result);
      } catch (error) {
        // Silently fail - circle loading is non-critical
      }
    };
    loadCircle();
  }, []);

  // Utiliser le hook temps réel pour les horaires de prière
  const { prayers: homePrayers, nextPrayer, countdown, currentTime } = usePrayerTimesRealtime(
    settings.latitude || DEFAULT_LATITUDE,
    settings.longitude || DEFAULT_LONGITUDE,
    settings.timezone || DEFAULT_TIMEZONE,
    settings.prayerAdjustments
  );

  // Qibla calculation
  const qiblaData = useMemo(() => {
    const lat = settings.latitude || DEFAULT_LATITUDE;
    const lng = settings.longitude || DEFAULT_LONGITUDE;

    // Calculate Qibla angle
    const lat1 = lat * Math.PI / 180;
    const lat2 = KAABA_LAT * Math.PI / 180;
    const dLng = (KAABA_LNG - lng) * Math.PI / 180;

    const y = Math.sin(dLng);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLng);
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    if (angle < 0) angle += 360;

    // Calculate distance (Haversine)
    const R = 6371;
    const dLat = (KAABA_LAT - lat) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = Math.round(R * c);

    return { angle: Math.round(angle), distance };
  }, [settings.latitude, settings.longitude]);

  // Week days for calendar card
  const weekDays = useMemo(() => {
    try {
      const days = [];
      const todayRaw = moment();                      // pour le jour de la semaine grégorien
      const todayAdjusted = getAdjustedHijriMoment(); // pour le jour Hijri
      const todayHijriDay = todayAdjusted.iDate();

      for (let i = 0; i < 7; i++) {
        const dayDate = todayRaw.clone().add(i - todayRaw.day(), 'days').toDate();
        const dayAdjusted = getAdjustedHijriMoment(dayDate);
        days.push({
          dayName: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][i],
          hijriDay: dayAdjusted.iDate(),
          isToday: i === todayRaw.day(),
        });
      }
      return days;
    } catch (e) {
      // Fallback if moment-hijri fails
      return [
        { dayName: 'D', hijriDay: 1, isToday: false },
        { dayName: 'L', hijriDay: 2, isToday: false },
        { dayName: 'M', hijriDay: 3, isToday: false },
        { dayName: 'M', hijriDay: 4, isToday: true },
        { dayName: 'J', hijriDay: 5, isToday: false },
        { dayName: 'V', hijriDay: 6, isToday: false },
        { dayName: 'S', hijriDay: 7, isToday: false },
      ];
    }
  }, []);

  // Countdown Iftar pour HomeScreen (utilise le vrai maghrib)
  const [iftarCountdown, setIftarCountdown] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (ramadanInfo.status !== 'during') return;

    const updateIftarCountdown = () => {
      const times = calculatePrayerTimesForLocation(
        settings.latitude || DEFAULT_LATITUDE,
        settings.longitude || DEFAULT_LONGITUDE,
        settings.timezone || DEFAULT_TIMEZONE
      );
      const maghribTime = times.maghrib;
      const now = momentTz().tz(settings.timezone || DEFAULT_TIMEZONE);
      const [mH, mM] = maghribTime.split(':').map(Number);
      const iftar = now.clone().hour(mH).minute(mM).second(0);
      const diff = iftar.diff(now);

      if (diff > 0) {
        const totalSec = Math.floor(diff / 1000);
        setIftarCountdown({
          h: Math.floor(totalSec / 3600),
          m: Math.floor((totalSec % 3600) / 60),
          s: totalSec % 60,
        });
      }
    };

    updateIftarCountdown();
    const interval = setInterval(updateIftarCountdown, 1000);
    return () => clearInterval(interval);
  }, [ramadanInfo.status, settings.latitude, settings.longitude, settings.timezone]);

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Il y a moins d'1 heure";
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  };

  // Formater countdown prière
  const fmt = (n: number) => n.toString().padStart(2, '0');
  const prayerCountdownStr = `Dans ${fmt(countdown.h)}h ${fmt(countdown.m)}min ${fmt(countdown.s)}s`;

  // Progress bar percentage
  const streakPct = Math.min(100, (streak.todayVersesRead / streak.dailyGoal) * 100);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      {/* ===== PREMIUM HEADER WITH GRADIENT ===== */}
      <LinearGradient colors={colors.headerGradient} style={homeStyles.headerGradient}>
        <FadeInView delay={50} style={homeStyles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image source={require('./assets/logo.png')} style={{ width: 44, height: 44, borderRadius: 12 }} />
            <View>
              <Text style={homeStyles.logoText}>Sakina</Text>
              <Text style={{ fontSize: 14, color: colors.secondary, fontWeight: '500', marginTop: 1 }}>سكينة</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale onPress={toggleTheme}>
              <View style={homeStyles.headerIconBtn}>
                <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.secondary} />
              </View>
            </PressableScale>
            <PressableScale onPress={() => onNavigate('settings')}>
              <View style={homeStyles.headerIconBtn}>
                <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.8)" />
              </View>
            </PressableScale>
          </View>
        </FadeInView>

        <FadeInView delay={100} style={homeStyles.headerInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={homeStyles.headerCity}>{settings.city}, {settings.country}</Text>
          </View>
          <View style={homeStyles.headerDateRow}>
            <ShimmerGold>
              <View style={homeStyles.hijriBadge}>
                <Ionicons name="moon" size={11} color={colors.secondary} />
                <Text style={[homeStyles.hijriBadgeText, { color: colors.secondary }]}>
                  {ramadanInfo.hijriDay} {ramadanInfo.hijriMonthName} {ramadanInfo.hijriYear}
                </Text>
              </View>
            </ShimmerGold>
            <Text style={homeStyles.headerGregorian}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </FadeInView>
      </LinearGradient>

      {/* ===== QUICK ACCESS ICONS ===== */}
      <FadeInView delay={150}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={homeStyles.quickAccessRow}>
          {[
            { name: 'coran' as ScreenName, label: 'Coran', icon: 'book-outline', bg: [colors.primary, '#0F4C35'] },
            { name: 'dua' as ScreenName, label: 'Dua', icon: 'hand-right-outline', bg: [colors.secondary, colors.secondaryDark] },
            { name: 'ramadan' as ScreenName, label: 'Ramadan', icon: 'sparkles-outline', bg: ['#7C3AED', '#4C1D95'] },
            { name: 'qibla' as ScreenName, label: 'Qibla', icon: 'compass-outline', bg: ['#0891B2', '#0E7490'] },
            { name: 'tasbih' as ScreenName, label: 'Tasbih', icon: 'radio-button-on-outline', bg: ['#D4AF37', '#B8860B'] },
            { name: 'prieres' as ScreenName, label: 'Prieres', icon: 'moon-outline', bg: [colors.primary, colors.primaryDark] },
          ].map((item, i) => (
            <ScaleInView key={item.name} delay={150 + i * 60}>
              <PressableScale onPress={() => onNavigate(item.name)} style={homeStyles.quickAccessItem}>
                <LinearGradient colors={item.bg as [string, string]} style={homeStyles.quickAccessCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={item.icon as any} size={24} color="#FFF" />
                </LinearGradient>
                <Text style={[homeStyles.quickAccessLabel, { color: colors.text }]}>{item.label}</Text>
              </PressableScale>
            </ScaleInView>
          ))}
        </ScrollView>
      </FadeInView>

      <View style={homeStyles.cardsContainer}>
        {/* ===== HERO PRAYER CARD ===== */}
        {nextPrayer && (
          <FadeInView delay={200}>
            <PressableScale onPress={() => onNavigate('prieres')}>
              <View style={homeStyles.prayerCardWrapper}>
                <LinearGradient colors={colors.prayerCardGradient} style={homeStyles.prayerCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  {/* Gold accent top */}
                  <ShimmerGold><View style={homeStyles.prayerGoldLine} /></ShimmerGold>
                  <View style={homeStyles.prayerCardInner}>
                    <Text style={homeStyles.prayerLabelText}>PROCHAINE PRIERE</Text>
                    <View style={homeStyles.prayerMainRow}>
                      <PulseView>
                        <View style={homeStyles.prayerBigIcon}>
                          <Ionicons name={nextPrayer.icon as any} size={32} color="#FFF" />
                        </View>
                      </PulseView>
                      <View style={homeStyles.prayerInfo}>
                        <Text style={homeStyles.prayerNameText}>{nextPrayer.name}</Text>
                        <Text style={homeStyles.prayerNameAr}>{nextPrayer.ar}</Text>
                      </View>
                      <Text style={homeStyles.prayerTimeText}>{nextPrayer.time}</Text>
                    </View>
                    {/* Progress bar */}
                    <View style={homeStyles.prayerProgressTrack}>
                      <View style={[homeStyles.prayerProgressFill, { width: `${Math.max(5, Math.min(100, ((24 * 60 - countdown.h * 60 - countdown.m) / (24 * 60)) * 100))}%` }]} />
                      <View style={[homeStyles.prayerProgressDot, { left: `${Math.max(2, Math.min(98, ((24 * 60 - countdown.h * 60 - countdown.m) / (24 * 60)) * 100))}%` }]} />
                    </View>
                    <View style={homeStyles.prayerCountdownRow}>
                      <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                      <Text style={homeStyles.prayerCountdownText}>{prayerCountdownStr}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </PressableScale>
          </FadeInView>
        )}

        {/* ===== COMPACT PRAYER TIMES ROW ===== */}
        {homePrayers.length > 0 && (
          <FadeInView delay={250}>
            <View style={[homeStyles.card, { backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' }}>
                {homePrayers.map((p) => (
                  <View key={p.name} style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: p.isNext ? '700' : '500',
                      color: p.isSunrise ? colors.secondary : p.isNext ? colors.primary : p.passed ? colors.textMuted : colors.textSecondary,
                      marginBottom: 3,
                    }}>
                      {p.isSunrise ? '☀️' : p.name}
                    </Text>
                    <Text style={{
                      fontSize: 13,
                      fontWeight: p.isNext ? '800' : '600',
                      color: p.isSunrise ? colors.secondary : p.isNext ? colors.primary : p.passed ? colors.textMuted : colors.text,
                    }}>
                      {p.time}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeInView>
        )}

        {/* ===== READING STREAK CARD ===== */}
        <FadeInView delay={300}>
          <PressableScale onPress={() => onNavigate('coran')}>
            <View style={[homeStyles.card, { backgroundColor: colors.surface }]}>
              <View style={homeStyles.cardHeaderRow}>
                <View style={[homeStyles.cardIconBox, { backgroundColor: colors.secondary + '18' }]}>
                  <Text style={{ fontSize: 22 }}>📖</Text>
                </View>
                <Text style={[homeStyles.cardTitle, { color: colors.text }]}>Ta Lecture Aujourd'hui</Text>
              </View>
              <View style={homeStyles.readingStatsRow}>
                <View style={[homeStyles.streakBadge, { backgroundColor: streak.currentStreak > 0 ? '#FEF3C7' : colors.border + '40' }]}>
                  <Text style={{ fontSize: 16 }}>🔥</Text>
                  <Text style={[homeStyles.streakBadgeText, { color: streak.currentStreak > 0 ? '#B45309' : colors.textMuted }]}>
                    Jour {streak.currentStreak}
                  </Text>
                </View>
                <Text style={[homeStyles.readingCount, { color: colors.text }]}>
                  {streak.todayVersesRead}/{streak.dailyGoal} <Text style={{ color: colors.textSecondary, fontSize: 13 }}>versets</Text>
                </Text>
              </View>
              {/* Progress bar */}
              <View style={[homeStyles.readingProgressTrack, { backgroundColor: colors.border + '40' }]}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary] as [string, string]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[homeStyles.readingProgressFill, { width: `${streakPct}%` }]}
                />
              </View>
              <Text style={[homeStyles.readingPct, { color: colors.textMuted }]}>{Math.round(streakPct)}%</Text>
              {/* Last read */}
              {lastRead && (
                <View style={[homeStyles.lastReadRow, { borderTopColor: colors.border + '40' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[homeStyles.lastReadLabel, { color: colors.textSecondary }]}>Derniere lecture</Text>
                    <Text style={[homeStyles.lastReadSurah, { color: colors.text }]}>
                      {lastRead.surahName} - v.{lastRead.verseNumber}
                    </Text>
                    <Text style={[homeStyles.lastReadAgo, { color: colors.textMuted }]}>{getTimeAgo(lastRead.timestamp)}</Text>
                  </View>
                  <View style={[homeStyles.readBtn, { backgroundColor: colors.primary }]}>
                    <Text style={homeStyles.readBtnText}>Lire</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFF" />
                  </View>
                </View>
              )}
            </View>
          </PressableScale>
        </FadeInView>

        {/* ===== VERSE OF THE DAY ===== */}
        <FadeInView delay={350}>
          <View style={[homeStyles.verseCard, { backgroundColor: colors.cream, borderColor: colors.secondary + '35' }]}>
            {/* Ornamental top */}
            <ShimmerGold>
              <View style={homeStyles.verseOrnamentRow}>
                <View style={[homeStyles.verseDash, { backgroundColor: colors.secondary + '50' }]} />
                <Ionicons name="sparkles" size={12} color={colors.secondary} />
                <Text style={[homeStyles.verseSectionLabel, { color: colors.secondary }]}>VERSET DU JOUR</Text>
                <Ionicons name="sparkles" size={12} color={colors.secondary} />
                <View style={[homeStyles.verseDash, { backgroundColor: colors.secondary + '50' }]} />
              </View>
            </ShimmerGold>
            <Text style={[homeStyles.verseArabicText, { color: colors.text }]}>
              {dailyVerse.arabic}
            </Text>
            <View style={[homeStyles.verseDivider, { backgroundColor: colors.secondary + '30' }]} />
            <Text style={[homeStyles.verseFrenchText, { color: colors.textSecondary }]}>
              "{dailyVerse.french}"
            </Text>
            <Text style={[homeStyles.verseRefText, { color: colors.secondary }]}>
              Sourate {dailyVerse.surahName} ({dailyVerse.surahNumber}:{dailyVerse.verseNumber})
            </Text>
            <View style={homeStyles.verseActions}>
              <PressableScale onPress={handleDailyVerseShare}>
                <View style={[homeStyles.verseActionBtn, { backgroundColor: colors.secondary + '15' }]}>
                  <Ionicons name="share-outline" size={18} color={colors.secondary} />
                </View>
              </PressableScale>
              <PressableScale onPress={handleDailyVerseLike}>
                <View style={[homeStyles.verseActionBtn, { backgroundColor: isDailyVerseLiked ? '#EF444420' : colors.secondary + '15' }]}>
                  <Ionicons name={isDailyVerseLiked ? 'heart' : 'heart-outline'} size={18} color={isDailyVerseLiked ? '#EF4444' : colors.secondary} />
                </View>
              </PressableScale>
            </View>
          </View>
        </FadeInView>

        {/* ===== RAMADAN CARD ===== */}
        {ramadanInfo.status === 'during' ? (
          <FadeInView delay={400}>
            <PressableScale onPress={() => onNavigate('ramadan')}>
              <LinearGradient colors={['#312E81', '#4C1D95', '#6D28D9']} style={homeStyles.ramadanCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={homeStyles.ramadanHeader}>
                  <Text style={{ fontSize: 28 }}>🌙</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={homeStyles.ramadanTitle}>RAMADAN</Text>
                    <Text style={homeStyles.ramadanSubtitle}>Jour {ramadanInfo.ramadanDay}/{RAMADAN_DAYS}</Text>
                  </View>
                </View>
                <View style={homeStyles.ramadanCountdownRow}>
                  {[
                    { val: fmt(iftarCountdown.h), label: 'hrs' },
                    { val: fmt(iftarCountdown.m), label: 'min' },
                    { val: fmt(iftarCountdown.s), label: 'sec' },
                  ].map((t, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Text style={homeStyles.ramadanColon}>:</Text>}
                      <View style={homeStyles.ramadanDigitBox}>
                        <Text style={homeStyles.ramadanDigit}>{t.val}</Text>
                        <Text style={homeStyles.ramadanDigitLabel}>{t.label}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
                <Text style={homeStyles.ramadanIftarLabel}>Iftar dans</Text>
              </LinearGradient>
            </PressableScale>
          </FadeInView>
        ) : (
          <FadeInView delay={400}>
            <PressableScale onPress={() => onNavigate('ramadan')}>
              <LinearGradient colors={['#312E81', '#4C1D95', '#6D28D9']} style={homeStyles.ramadanCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={homeStyles.ramadanHeader}>
                  <Text style={{ fontSize: 28 }}>🌙</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={homeStyles.ramadanTitle}>RAMADAN {ramadanInfo.hijriYear}</Text>
                    <Text style={homeStyles.ramadanSubtitle}>Dans {ramadanInfo.daysUntilRamadan} jours</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" />
                </View>
              </LinearGradient>
            </PressableScale>
          </FadeInView>
        )}

        {/* ===== CIRCLE DE LECTURE ===== */}
        <FadeInView delay={450}>
          <PressableScale onPress={() => onNavigate('cercle')}>
            <View style={[homeStyles.card, { backgroundColor: colors.surface }]}>
              <View style={homeStyles.cardHeaderRow}>
                <View style={[homeStyles.cardIconBox, { backgroundColor: colors.secondary + '18' }]}>
                  <Ionicons name="people" size={20} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[homeStyles.cardTitle, { color: colors.text }]}>
                    {userCircle ? userCircle.circle.name : 'Cercle de Lecture'}
                  </Text>
                  {!userCircle && <Text style={[homeStyles.cardSubtitle, { color: colors.textSecondary }]}>Lisez le Coran en famille</Text>}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
              {userCircle && (
                <>
                  <View style={homeStyles.circleProgressRow}>
                    <Text style={[homeStyles.circleJuzText, { color: colors.text }]}>{userCircle.circle.completed_juz}/30 Juz</Text>
                    <Text style={[homeStyles.circleDaysText, { color: colors.textSecondary }]}>
                      {(() => {
                        const d = Math.ceil((new Date(userCircle.circle.expires_at).getTime() - Date.now()) / 86400000);
                        return d > 0 ? `${d}j restant${d > 1 ? 's' : ''}` : 'Expire';
                      })()}
                    </Text>
                  </View>
                  <View style={[homeStyles.circleBarTrack, { backgroundColor: colors.border + '40' }]}>
                    <LinearGradient
                      colors={[colors.primary, colors.secondary] as [string, string]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[homeStyles.circleBarFill, { width: `${Math.round((userCircle.circle.completed_juz / 30) * 100)}%` }]}
                    />
                  </View>
                </>
              )}
            </View>
          </PressableScale>
        </FadeInView>

        {/* ===== QIBLA COMPACT CARD ===== */}
        <FadeInView delay={500}>
          <PressableScale onPress={() => onNavigate('qibla')}>
            <LinearGradient colors={colors.qiblaGradient} style={homeStyles.qiblaCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={homeStyles.qiblaMiniCompass}>
                <View style={[homeStyles.qiblaNeedle, { transform: [{ rotate: `${qiblaData.angle}deg` }] }]}>
                  <View style={homeStyles.qiblaNeedleArrow} />
                </View>
                <Text style={{ fontSize: 16 }}>🕋</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={homeStyles.qiblaLabel}>DIRECTION QIBLA</Text>
                <Text style={homeStyles.qiblaAngle}>{qiblaData.angle}° NE</Text>
              </View>
              <Text style={homeStyles.qiblaDistance}>{qiblaData.distance.toLocaleString()} km</Text>
            </LinearGradient>
          </PressableScale>
        </FadeInView>

        {/* ===== CALENDAR HIJRI ===== */}
        <FadeInView delay={550}>
          <PressableScale onPress={() => onNavigate('calendrier')}>
            <View style={[homeStyles.card, { backgroundColor: colors.surface }]}>
              <View style={homeStyles.cardHeaderRow}>
                <View style={[homeStyles.cardIconBox, { backgroundColor: colors.secondary + '18' }]}>
                  <Ionicons name="calendar" size={18} color={colors.secondary} />
                </View>
                <Text style={[homeStyles.cardTitle, { color: colors.text }]}>
                  {ramadanInfo.hijriMonthName} {ramadanInfo.hijriYear}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              <View style={homeStyles.calendarWeekRow}>
                {weekDays.map((day, idx) => (
                  <View key={idx} style={[homeStyles.calendarDayCell, day.isToday && [homeStyles.calendarDayToday, { backgroundColor: colors.secondary }]]}>
                    <Text style={[homeStyles.calendarDayName, { color: day.isToday ? '#FFF' : colors.textMuted }]}>{day.dayName}</Text>
                    <Text style={[homeStyles.calendarDayNum, { color: day.isToday ? '#FFF' : colors.text }]}>{day.hijriDay}</Text>
                  </View>
                ))}
              </View>
            </View>
          </PressableScale>
        </FadeInView>

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
};

// ===== HOME STYLES =====
const homeStyles = StyleSheet.create({
  // Header gradient area
  headerGradient: { paddingTop: Platform.OS === 'android' ? 44 : 20, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  logoText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { marginTop: 4 },
  headerCity: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  headerDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  hijriBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(212,175,55,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)' },
  hijriBadgeText: { fontSize: 12, fontWeight: '600' },
  headerGregorian: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  // Quick Access
  quickAccessRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 20 },
  quickAccessItem: { alignItems: 'center', width: 64 },
  quickAccessCircle: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  quickAccessLabel: { fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' },

  // Cards container
  cardsContainer: { paddingHorizontal: 16 },

  // Generic card
  card: { borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },

  // Prayer Hero Card
  prayerCardWrapper: { borderRadius: 24, overflow: 'hidden', marginBottom: 14, borderWidth: 2, borderColor: 'rgba(212,175,55,0.4)', shadowColor: '#0F4C35', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  prayerCard: { padding: 20, paddingTop: 0 },
  prayerGoldLine: { height: 3, backgroundColor: '#D4AF37', borderRadius: 2, alignSelf: 'center', width: 50, marginTop: 12, marginBottom: 16 },
  prayerCardInner: { alignItems: 'center' },
  prayerLabelText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 14 },
  prayerMainRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16 },
  prayerBigIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.4)' },
  prayerInfo: { flex: 1, marginLeft: 16 },
  prayerNameText: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  prayerNameAr: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  prayerTimeText: { fontSize: 36, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'] as any },
  prayerProgressTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12 },
  prayerProgressFill: { height: '100%', borderRadius: 2, backgroundColor: 'rgba(212,175,55,0.7)' },
  prayerProgressDot: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#D4AF37', borderWidth: 2, borderColor: '#FFF' },
  prayerCountdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prayerCountdownText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  // Reading/Streak Card
  readingStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 10 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  streakBadgeText: { fontSize: 13, fontWeight: '700' },
  readingCount: { fontSize: 18, fontWeight: '800' },
  readingProgressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  readingProgressFill: { height: '100%', borderRadius: 4 },
  readingPct: { fontSize: 11, textAlign: 'right', fontWeight: '600' },
  lastReadRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  lastReadLabel: { fontSize: 11, fontWeight: '500' },
  lastReadSurah: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  lastReadAgo: { fontSize: 11, marginTop: 2 },
  readBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  readBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Verse Card
  verseCard: { borderRadius: 20, padding: 24, marginBottom: 14, borderWidth: 1, alignItems: 'center' },
  verseOrnamentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  verseDash: { flex: 1, height: 1 },
  verseSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  verseArabicText: { fontSize: 28, lineHeight: 48, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif' },
  verseDivider: { width: 40, height: 1.5, borderRadius: 1, marginVertical: 16 },
  verseFrenchText: { fontSize: 15, textAlign: 'center', fontStyle: 'italic', lineHeight: 24, paddingHorizontal: 8 },
  verseRefText: { fontSize: 12, fontWeight: '600', marginTop: 14 },
  verseActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  verseActionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Ramadan
  ramadanCard: { borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  ramadanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ramadanTitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 2 },
  ramadanSubtitle: { fontSize: 17, fontWeight: '700', color: '#FFF', marginTop: 2 },
  ramadanCountdownRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', marginBottom: 8 },
  ramadanDigitBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, minWidth: 64 },
  ramadanDigit: { fontSize: 28, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'] as any },
  ramadanDigitLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 2, letterSpacing: 1 },
  ramadanColon: { fontSize: 24, fontWeight: '800', color: 'rgba(255,255,255,0.4)', marginHorizontal: 6, marginTop: 6 },
  ramadanIftarLabel: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 1 },

  // Circle
  circleProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 8 },
  circleJuzText: { fontSize: 14, fontWeight: '700' },
  circleDaysText: { fontSize: 12 },
  circleBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  circleBarFill: { height: '100%', borderRadius: 3 },

  // Qibla compact
  qiblaCard: { borderRadius: 16, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  qiblaMiniCompass: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  qiblaNeedle: { position: 'absolute', width: 3, height: 22, alignItems: 'center' },
  qiblaNeedleArrow: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FFF' },
  qiblaLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  qiblaAngle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 2 },
  qiblaDistance: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Calendar
  calendarWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  calendarDayCell: { width: 38, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  calendarDayToday: { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  calendarDayName: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  calendarDayNum: { fontSize: 15, fontWeight: '700' },
});

// ===== MEMOIZED VERSE CARD =====
type VerseCardProps = {
  verse: { num: number; ar: string; fr: string; ph: string };
  colors: any;
  showArabic: boolean;
  showTranslation: boolean;
  showPhonetic: boolean;
  arabicFontSize: number;
  bookmarked: boolean;
  bookmarkColor?: string;
  favorited: boolean;
  isCurrentAudio: boolean;
  onBookmark: (num: number) => void;
  onPlay: (num: number) => void;
  onFavorite: (v: { num: number; ar: string; fr: string }) => void;
  onShare: (v: { num: number; ar: string; fr: string }) => void;
  onLayout: (num: number, y: number) => void;
};

const VerseCard = React.memo(({ verse, colors, showArabic, showTranslation, showPhonetic, arabicFontSize, bookmarked, bookmarkColor, favorited, isCurrentAudio, onBookmark, onPlay, onFavorite, onShare, onLayout }: VerseCardProps) => (
  <View onLayout={(e) => onLayout(verse.num, e.nativeEvent.layout.y)}>
    <View style={[
      coranStyles.verseCard,
      { backgroundColor: colors.surface },
      bookmarked && { borderLeftWidth: 4, borderLeftColor: bookmarkColor },
      isCurrentAudio && { backgroundColor: colors.primary + '10', borderColor: colors.primary, borderWidth: 1.5 }
    ]}>
      <View style={coranStyles.verseHeader}>
        <View style={[coranStyles.verseBadge, { borderColor: isCurrentAudio ? colors.primary : colors.secondary, backgroundColor: isCurrentAudio ? colors.primary + '15' : 'transparent' }]}>
          <Text style={[coranStyles.verseNumText, { color: isCurrentAudio ? colors.primary : colors.secondary }]}>{verse.num}</Text>
        </View>
        <PressableScale onPress={() => onBookmark(verse.num)}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? bookmarkColor : colors.textMuted}
          />
        </PressableScale>
      </View>

      {showArabic && (
        <Text style={[coranStyles.arabicText, { color: colors.text, fontSize: arabicFontSize }]}>
          {verse.ar}
        </Text>
      )}
      {showTranslation && (
        <Text style={[coranStyles.frenchText, { color: colors.textSecondary }]}>{verse.fr}</Text>
      )}
      {showPhonetic && (
        <Text style={[coranStyles.phoneticText, { color: colors.textMuted }]}>{verse.ph}</Text>
      )}

      <View style={coranStyles.verseActions}>
        <PressableScale onPress={() => onPlay(verse.num)}>
          <View style={[coranStyles.playBtn, { backgroundColor: isCurrentAudio ? colors.primary : colors.primary + '15' }]}>
            <Ionicons
              name={isCurrentAudio ? 'pause' : 'play'}
              size={18}
              color={isCurrentAudio ? '#FFF' : colors.primary}
            />
          </View>
        </PressableScale>
        <PressableScale onPress={() => onFavorite(verse)}>
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={20}
            color={favorited ? '#EF4444' : colors.textMuted}
          />
        </PressableScale>
        <PressableScale onPress={() => onShare(verse)}>
          <Ionicons name="share-outline" size={20} color={colors.textMuted} />
        </PressableScale>
      </View>
    </View>
  </View>
));

// ===== MEMOIZED TOGGLE =====
const CoranToggle = React.memo(({ label, active, colors, onPress }: { label: string; active: boolean; colors: any; onPress: () => void }) => (
  <PressableScale onPress={onPress} style={{ width: 105 }}>
    <LinearGradient
      colors={active ? [colors.primary, colors.primaryDark] : [colors.surface, colors.surface]}
      style={[styles.toggleBtn, { borderColor: active ? colors.primary : colors.border, width: '100%' }]}
    >
      <Text style={{ color: active ? '#FFF' : colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </LinearGradient>
  </PressableScale>
));

// ===== MEMOIZED SURAH MODAL ITEM =====
const SurahModalItem = React.memo(({ item, isSelected, colors, onSelect }: { item: any; isSelected: boolean; colors: any; onSelect: (item: any) => void }) => (
  <PressableScale onPress={() => onSelect(item)}>
    <View style={[coranStyles.surahItem, { borderBottomColor: colors.border + '30', backgroundColor: isSelected ? colors.primary + '08' : 'transparent' }]}>
      <View style={[coranStyles.surahItemNum, { borderColor: isSelected ? colors.primary : colors.secondary }]}>
        <Text style={{ color: isSelected ? colors.primary : colors.secondary, fontSize: 13, fontWeight: '700' }}>{item.number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[coranStyles.surahItemName, { color: colors.text }]}>{item.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.versesCount} versets</Text>
      </View>
      <Text style={{ color: colors.secondary, fontSize: 17, fontWeight: '500' }}>{item.nameAr}</Text>
      {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 8 }} />}
    </View>
  </PressableScale>
));

// ===== CORAN SCREEN =====
const CoranScreen = () => {
  const { colors } = useTheme();
  const { settings, updateSettings, bookmarks, addBookmark, removeBookmark, favorites, addFavorite, removeFavorite, updateStreak, updateLastRead, lastRead } = useSettings();
  const navigation = useNavigation();

  const [currentSurah, setCurrentSurah] = useState(SURAHS[0]);
  const hasRestoredPosition = useRef(false);

  // FlatList ref for scroll control
  const flatListRef = useRef<FlatList>(null);
  const versePositions = useRef<Record<number, number>>({});
  const versePositionsSurah = useRef(0);
  const [currentVisibleVerse, setCurrentVisibleVerse] = useState(1);
  const currentVisibleVerseRef = useRef(1);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const needsScrollRestore = useRef(false);

  // Tracking des versets lus par scroll
  const readVersesRef = useRef<Set<string>>(new Set());
  const pendingVersesCountRef = useRef(0);
  const streakDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Versets lus aujourd'hui (persistés)
  const [todayReadVerses, setTodayReadVerses] = useState<Set<string>>(new Set());
  const todayReadVersesLoaded = useRef(false);

  // Charger les versets lus du jour depuis AsyncStorage
  useEffect(() => {
    const loadTodayReadVerses = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const data = await AsyncStorage.getItem(STORAGE_KEYS.TODAY_READ_VERSES);
        if (data) {
          const parsed: TodayReadVerses = JSON.parse(data);
          if (parsed.date === today) {
            setTodayReadVerses(new Set(parsed.verses));
            readVersesRef.current = new Set(parsed.verses);
          } else {
            setTodayReadVerses(new Set());
            readVersesRef.current = new Set();
          }
        }
        todayReadVersesLoaded.current = true;
      } catch (error) {
        todayReadVersesLoaded.current = true;
      }
    };
    loadTodayReadVerses();
  }, []);

  // Configuration audio iOS (mode silencieux)
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  }, []);

  // Restaurer la dernière sourate lue au montage + pré-charger le cache
  useEffect(() => {
    if (!hasRestoredPosition.current && lastRead) {
      const saved = SURAHS.find((s: any) => s.number === lastRead.surahNumber);
      if (saved) {
        getSurahVerses(lastRead.surahNumber);
        needsScrollRestore.current = true;
        setCurrentSurah(saved);
      }
      hasRestoredPosition.current = true;
    }
  }, [lastRead]);

  const [showSurahModal, setShowSurahModal] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkColor, setBookmarkColor] = useState(BOOKMARK_COLORS[0]);

  // Versets de la sourate courante (chargés dynamiquement)
  const [currentVerses, setCurrentVerses] = useState<{ num: number; ar: string; fr: string; ph: string }[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState(true);

  useEffect(() => {
    setIsLoadingVerses(true);
    const task = InteractionManager.runAfterInteractions(() => {
      const verses = getSurahVerses(currentSurah.number);
      setCurrentVerses(verses);
      setIsLoadingVerses(false);
    });
    return () => task.cancel();
  }, [currentSurah.number]);

  // Animation pulse pour skeleton loader
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (isLoadingVerses) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(skeletonOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLoadingVerses]);

  // Audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioVerse, setCurrentAudioVerse] = useState(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const autoScrollEnabledRef = useRef(true);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    setCurrentAudioVerse(1);
    setCurrentVisibleVerse(1);
    currentVisibleVerseRef.current = 1;
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [currentSurah]);

  // Pre-compute bookmark and favorite lookup maps for O(1) access
  const bookmarkMap = useMemo(() => {
    const map = new Map<number, { color: string; id: string }>();
    bookmarks.forEach((b: any) => {
      if (b.surahNumber === currentSurah.number) {
        map.set(b.verseNumber, { color: b.color, id: b.id });
      }
    });
    return map;
  }, [bookmarks, currentSurah.number]);

  const favoriteMap = useMemo(() => {
    const map = new Map<number, string>();
    favorites.forEach((f: any) => {
      if (f.surahNumber === currentSurah.number) {
        map.set(f.verseNumber, f.id);
      }
    });
    return map;
  }, [favorites, currentSurah.number]);

  // Enregistrer la position Y de chaque verset via onLayout
  const onVerseLayout = useCallback((verseNum: number, y: number) => {
    if (versePositionsSurah.current !== currentSurah.number) {
      versePositions.current = {};
      versePositionsSurah.current = currentSurah.number;
    }
    versePositions.current[verseNum] = y;
  }, [currentSurah.number]);

  // Scroll vers le verset restauré avec retry (FlatList version)
  const scrollToSavedVerse = useCallback((verseIndex: number, attempt: number) => {
    if (attempt > 8) return;
    if (flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({ index: verseIndex, animated: true, viewOffset: 50 });
      } catch {
        setTimeout(() => scrollToSavedVerse(verseIndex, attempt + 1), 300);
      }
    }
  }, []);

  // Restaurer la position du verset quand les versets sont chargés
  useEffect(() => {
    if (needsScrollRestore.current && lastRead && lastRead.verseNumber > 1
        && currentSurah.number === lastRead.surahNumber && currentVerses.length > 0) {
      needsScrollRestore.current = false;
      const target = lastRead.verseNumber;
      setCurrentVisibleVerse(target);
      currentVisibleVerseRef.current = target;
      const targetIndex = Math.min(target - 1, currentVerses.length - 1);
      setTimeout(() => scrollToSavedVerse(targetIndex, 0), 400);
    }
  }, [currentVerses]);

  // Detect visible verse from FlatList viewable items
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const firstVisible = viewableItems[0].item;
      if (firstVisible && firstVisible.num !== currentVisibleVerseRef.current) {
        currentVisibleVerseRef.current = firstVisible.num;
        setCurrentVisibleVerse(firstVisible.num);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 30, minimumViewTime: 100 }).current;

  // Sauvegarde automatique de la position avec debounce
  useEffect(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      updateLastRead({
        surahNumber: currentSurah.number,
        surahName: currentSurah.name,
        verseNumber: currentVisibleVerse,
      });
    }, 1500);
    return () => { if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current); };
  }, [currentVisibleVerse, currentSurah]);

  // Tracking versets lus
  useEffect(() => {
    const key = `${currentSurah.number}_${currentVisibleVerse}`;
    if (!todayReadVersesLoaded.current) return;

    if (!readVersesRef.current.has(key)) {
      readVersesRef.current.add(key);
      pendingVersesCountRef.current += 1;

      const today = new Date().toISOString().split('T')[0];
      const versesArray = Array.from(readVersesRef.current);
      AsyncStorage.setItem(
        STORAGE_KEYS.TODAY_READ_VERSES,
        JSON.stringify({ date: today, verses: versesArray })
      );

      if (streakDebounceRef.current) clearTimeout(streakDebounceRef.current);
      streakDebounceRef.current = setTimeout(() => {
        if (pendingVersesCountRef.current > 0) {
          updateStreak(pendingVersesCountRef.current);
          pendingVersesCountRef.current = 0;
        }
      }, 2000);
    }
  }, [currentVisibleVerse, currentSurah.number]);

  // Sauvegarder les versets en attente au démontage
  useEffect(() => {
    return () => {
      if (streakDebounceRef.current) clearTimeout(streakDebounceRef.current);
      if (pendingVersesCountRef.current > 0) {
        updateStreak(pendingVersesCountRef.current);
        pendingVersesCountRef.current = 0;
      }
    };
  }, []);

  const playVerse = useCallback(async (verseNum: number) => {
    try {
      if (sound) await sound.unloadAsync();

      const surahStr = currentSurah.number.toString().padStart(3, '0');
      const verseStr = verseNum.toString().padStart(3, '0');
      const url = `https://everyayah.com/data/Alafasy_128kbps/${surahStr}${verseStr}.mp3`;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate: settings.audioSpeed }
      );

      setSound(newSound);
      setIsPlaying(true);
      setCurrentAudioVerse(verseNum);

      // Auto-scroll to the verse being played
      if (autoScrollEnabledRef.current && flatListRef.current) {
        const idx = verseNum - 1;
        if (idx >= 0 && idx < currentVerses.length) {
          try { flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 }); } catch {}
        }
      }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.durationMillis) {
            setAudioProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            // Re-enable auto-scroll when transitioning to next verse
            autoScrollEnabledRef.current = true;
            if (verseNum < currentVerses.length) {
              playVerse(verseNum + 1);
            } else {
              setIsPlaying(false);
            }
          }
        }
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger l\'audio');
    }
  }, [sound, currentSurah.number, settings.audioSpeed, currentVerses.length]);

  const togglePlayPause = useCallback(async () => {
    if (!sound) {
      playVerse(currentVisibleVerse);
      return;
    }
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
    setIsPlaying(!isPlaying);
  }, [sound, isPlaying, currentVisibleVerse, playVerse]);

  const goToPreviousVerse = useCallback(() => {
    if (currentVisibleVerse > 1) {
      const newVerse = currentVisibleVerse - 1;
      const idx = newVerse - 1;
      if (flatListRef.current && idx >= 0) {
        try { flatListRef.current.scrollToIndex({ index: idx, animated: true, viewOffset: 50 }); } catch {}
      }
      playVerse(newVerse);
    }
  }, [currentVisibleVerse, playVerse]);

  const goToNextVerse = useCallback(() => {
    if (currentVisibleVerse < currentVerses.length) {
      const newVerse = currentVisibleVerse + 1;
      const idx = newVerse - 1;
      if (flatListRef.current && idx < currentVerses.length) {
        try { flatListRef.current.scrollToIndex({ index: idx, animated: true, viewOffset: 50 }); } catch {}
      }
      playVerse(newVerse);
    }
  }, [currentVisibleVerse, currentVerses.length, playVerse]);

  const handleBookmarkPress = useCallback((verseNum: number) => {
    const existing = bookmarkMap.get(verseNum);
    if (existing) {
      removeBookmark(existing.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setSelectedVerse(verseNum);
      setBookmarkNote('');
      setBookmarkColor(BOOKMARK_COLORS[0]);
      setShowBookmarkModal(true);
    }
  }, [bookmarkMap, removeBookmark]);

  const saveBookmark = useCallback(() => {
    if (selectedVerse) {
      addBookmark({
        surahNumber: currentSurah.number,
        verseNumber: selectedVerse,
        surahName: currentSurah.name,
        note: bookmarkNote,
        color: bookmarkColor,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowBookmarkModal(false);
    }
  }, [selectedVerse, currentSurah, bookmarkNote, bookmarkColor, addBookmark]);

  const toggleFavorite = useCallback((verse: { num: number; ar: string; fr: string }) => {
    const existingId = favoriteMap.get(verse.num);
    if (existingId) {
      removeFavorite(existingId);
    } else {
      addFavorite({
        surahNumber: currentSurah.number,
        verseNumber: verse.num,
        surahName: currentSurah.name,
        arabic: verse.ar,
        french: verse.fr,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [favoriteMap, currentSurah, removeFavorite, addFavorite]);

  const shareVerse = useCallback(async (verse: { num: number; ar: string; fr: string }) => {
    const text = `Sourate ${currentSurah.name}, Verset ${verse.num}\n\n${verse.ar}\n\n"${verse.fr}"\n\n- Partagé via l'app Sakina`;
    try { await Share.share({ message: text }); } catch {}
  }, [currentSurah.name]);

  const handleGoBack = useCallback(() => {
    if (isPlaying) {
      Alert.alert(
        'Lecture en cours',
        'Voulez-vous arrêter la lecture et revenir en arrière ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Arrêter et revenir',
            style: 'destructive',
            onPress: async () => {
              if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
              }
              setIsPlaying(false);
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [isPlaying, sound, navigation]);

  // Toggle callbacks (memoized)
  const toggleArabic = useCallback(() => {
    if (settings.showArabic && !settings.showTranslation && !settings.showPhonetic) return;
    updateSettings({ showArabic: !settings.showArabic });
  }, [settings.showArabic, settings.showTranslation, settings.showPhonetic, updateSettings]);

  const toggleFrancais = useCallback(() => {
    if (!settings.showArabic && settings.showTranslation && !settings.showPhonetic) return;
    updateSettings({ showTranslation: !settings.showTranslation });
  }, [settings.showArabic, settings.showTranslation, settings.showPhonetic, updateSettings]);

  const togglePhonetic = useCallback(() => {
    if (!settings.showArabic && !settings.showTranslation && settings.showPhonetic) return;
    updateSettings({ showPhonetic: !settings.showPhonetic });
  }, [settings.showArabic, settings.showTranslation, settings.showPhonetic, updateSettings]);

  // Surah modal select handler
  const handleSurahSelect = useCallback((item: any) => {
    setCurrentSurah(item);
    setShowSurahModal(false);
  }, []);

  // FlatList renderItem for verses
  const renderVerse = useCallback(({ item: v }: { item: { num: number; ar: string; fr: string; ph: string } }) => {
    const bm = bookmarkMap.get(v.num);
    return (
      <VerseCard
        verse={v}
        colors={colors}
        showArabic={settings.showArabic}
        showTranslation={settings.showTranslation}
        showPhonetic={settings.showPhonetic}
        arabicFontSize={settings.arabicFontSize}
        bookmarked={!!bm}
        bookmarkColor={bm?.color}
        favorited={favoriteMap.has(v.num)}
        isCurrentAudio={currentAudioVerse === v.num && isPlaying}
        onBookmark={handleBookmarkPress}
        onPlay={playVerse}
        onFavorite={toggleFavorite}
        onShare={shareVerse}
        onLayout={onVerseLayout}
      />
    );
  }, [colors, settings.showArabic, settings.showTranslation, settings.showPhonetic, settings.arabicFontSize, bookmarkMap, favoriteMap, currentAudioVerse, isPlaying, handleBookmarkPress, playVerse, toggleFavorite, shareVerse, onVerseLayout]);

  const verseKeyExtractor = useCallback((item: { num: number }) => item.num.toString(), []);

  // FlatList renderItem for surah modal
  const renderSurahItem = useCallback(({ item }: { item: any }) => (
    <SurahModalItem item={item} isSelected={item.number === currentSurah.number} colors={colors} onSelect={handleSurahSelect} />
  ), [currentSurah.number, colors, handleSurahSelect]);

  const surahKeyExtractor = useCallback((item: any) => item.number.toString(), []);

  // Skeleton loader
  const skeletonData = useMemo(() => [0, 1, 2, 3], []);

  // FlatList footer spacer
  const ListFooter = useMemo(() => <View style={{ height: 180 }} />, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ===== COMPACT HEADER ===== */}
      <LinearGradient colors={colors.headerGradient} style={coranStyles.headerGradient}>
        <View style={coranStyles.headerTop}>
          {navigation.canGoBack && (
            <PressableScale onPress={handleGoBack}>
              <View style={coranStyles.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </View>
            </PressableScale>
          )}
          <PressableScale onPress={() => setShowSurahModal(true)} style={{ flex: 1 }}>
            <View style={coranStyles.headerSurahRow}>
              <Text style={coranStyles.headerSurahFr} numberOfLines={1}>{currentSurah.name}</Text>
              <Text style={coranStyles.headerSurahAr}>{currentSurah.nameAr}</Text>
              <Text style={coranStyles.headerVerseCount}>({currentSurah.versesCount}v)</Text>
            </View>
          </PressableScale>
          <PressableScale onPress={() => setShowSurahModal(true)}>
            <View style={coranStyles.chevronBox}>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.8)" />
            </View>
          </PressableScale>
        </View>
      </LinearGradient>

      {/* ===== TOGGLE BAR ===== */}
      <View style={[coranStyles.toggleBar, { backgroundColor: colors.surface, borderBottomColor: colors.border + '30' }]}>
        <CoranToggle label="Arabe" active={settings.showArabic} colors={colors} onPress={toggleArabic} />
        <CoranToggle label="Francais" active={settings.showTranslation} colors={colors} onPress={toggleFrancais} />
        <CoranToggle label="Phonetique" active={settings.showPhonetic} colors={colors} onPress={togglePhonetic} />
      </View>

      {/* ===== VERSES FLATLIST ===== */}
      {isLoadingVerses ? (
        <View style={{ padding: 16 }}>
          {skeletonData.map((k) => (
            <Animated.View key={k} style={{ opacity: skeletonOpacity, marginBottom: 10 }}>
              <View style={[coranStyles.verseCard, { backgroundColor: colors.surface }]}>
                <View style={coranStyles.verseHeader}>
                  <View style={[coranStyles.verseBadge, { borderColor: colors.textMuted + '40' }]} />
                  <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: colors.textMuted + '30' }} />
                </View>
                <View style={{ height: 28, borderRadius: 8, backgroundColor: colors.border + '30', marginTop: 12, width: '90%', alignSelf: 'flex-end' }} />
                <View style={{ height: 16, borderRadius: 6, backgroundColor: colors.border + '30', marginTop: 10, width: '70%' }} />
              </View>
            </Animated.View>
          ))}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={currentVerses}
          renderItem={renderVerse}
          keyExtractor={verseKeyExtractor}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== 'web'}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListFooterComponent={ListFooter}
          onScrollBeginDrag={() => {
            if (isPlaying) {
              autoScrollEnabledRef.current = false;
              if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
            }
          }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              if (flatListRef.current) {
                try { flatListRef.current.scrollToIndex({ index: info.index, animated: true }); } catch {}
              }
            }, 500);
          }}
        />
      )}

      {/* ===== AUDIO PLAYER BAR ===== */}
      <View style={[coranStyles.audioBar, { backgroundColor: colors.surface, borderTopColor: colors.border + '30' }]}>
        <View style={[coranStyles.audioTrack, { backgroundColor: colors.border + '30' }]}>
          <LinearGradient
            colors={[colors.primary, colors.secondary] as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[coranStyles.audioFill, { width: `${audioProgress * 100}%` }]}
          />
        </View>
        <View style={coranStyles.audioControls}>
          <PressableScale onPress={goToPreviousVerse}>
            <Ionicons name="play-skip-back" size={24} color={colors.text} />
          </PressableScale>
          <PressableScale onPress={togglePlayPause}>
            <LinearGradient colors={[colors.primary, colors.primaryDark] as [string, string]} style={coranStyles.mainPlayBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#FFF" />
            </LinearGradient>
          </PressableScale>
          <PressableScale onPress={goToNextVerse}>
            <Ionicons name="play-skip-forward" size={24} color={colors.text} />
          </PressableScale>
        </View>
        <Text style={[coranStyles.audioLabel, { color: colors.textMuted }]}>
          Verset {currentVisibleVerse} / {currentVerses.length}
        </Text>
      </View>

      {/* ===== SURAH MODAL ===== */}
      <Modal visible={showSurahModal} transparent animationType="slide">
        <View style={coranStyles.modalOverlay}>
          <View style={[coranStyles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={coranStyles.modalHeader}>
              <Text style={[coranStyles.modalTitle, { color: colors.text }]}>Choisir une sourate</Text>
              <PressableScale onPress={() => setShowSurahModal(false)}>
                <View style={[coranStyles.modalCloseBtn, { backgroundColor: colors.background }]}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </View>
              </PressableScale>
            </View>
            <FlatList
              data={SURAHS}
              keyExtractor={surahKeyExtractor}
              renderItem={renderSurahItem}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS !== 'web'}
              getItemLayout={(_, index) => ({ length: 60, offset: 60 * index, index })}
            />
          </View>
        </View>
      </Modal>

      {/* Bookmark Modal */}
      <Modal visible={showBookmarkModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.bookmarkModal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Ajouter un marque-page</Text>
              <Text style={[styles.bookmarkVerse, { color: colors.textSecondary }]}>
                {currentSurah.name} - Verset {selectedVerse}
              </Text>

              <TextInput
                style={[styles.noteInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Note (optionnel)"
                placeholderTextColor={colors.textMuted}
                value={bookmarkNote}
                onChangeText={setBookmarkNote}
                multiline
              />

              <Text style={[styles.colorLabel, { color: colors.text }]}>Couleur</Text>
              <View style={styles.colorPicker}>
                {BOOKMARK_COLORS.map(color => (
                  <PressableScale key={color} onPress={() => setBookmarkColor(color)}>
                    <View style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      bookmarkColor === color && styles.colorSelected
                    ]} />
                  </PressableScale>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <PressableScale onPress={() => setShowBookmarkModal(false)} style={{ flex: 1 }}>
                  <View style={[styles.modalBtn, { backgroundColor: colors.background }]}>
                    <Text style={{ color: colors.text }}>Annuler</Text>
                  </View>
                </PressableScale>
                <PressableScale onPress={saveBookmark} style={{ flex: 1 }}>
                  <View style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: '#FFF' }}>Enregistrer</Text>
                  </View>
                </PressableScale>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ===== CORAN STYLES =====
const coranStyles = StyleSheet.create({
  headerGradient: { paddingTop: Platform.OS === 'android' ? 44 : 20, paddingBottom: 12, paddingHorizontal: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerSurahRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSurahFr: { fontSize: 17, fontWeight: '700', color: '#FFF', flexShrink: 1 },
  headerSurahAr: { fontSize: 17, color: '#D4AF37', fontWeight: '600' },
  headerVerseCount: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  chevronBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  toggleBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5 },

  verseCard: { borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  verseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  verseBadge: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  verseNumText: { fontWeight: '700', fontSize: 13 },
  arabicText: { textAlign: 'center', marginBottom: 14, lineHeight: 42, fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif' },
  frenchText: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 10, paddingHorizontal: 8 },
  phoneticText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic', lineHeight: 20, marginBottom: 14 },
  verseActions: { flexDirection: 'row', justifyContent: 'center', gap: 20, alignItems: 'center', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.05)' },
  playBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  audioBar: { borderTopWidth: 0.5, paddingVertical: 10, paddingHorizontal: 20 },
  audioTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  audioFill: { height: '100%', borderRadius: 2 },
  audioControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28 },
  mainPlayBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  audioLabel: { textAlign: 'center', marginTop: 6, fontSize: 11, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  surahItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 0.5, gap: 12 },
  surahItemNum: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  surahItemName: { fontSize: 15, fontWeight: '600' },
});

// ===== PRIERES SCREEN =====
const PrieresScreen = () => {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const navigation = useNavigation();

  // Utiliser le hook temps réel pour les horaires de prière
  const { prayers, nextPrayer, countdown, currentTime } = usePrayerTimesRealtime(
    settings.latitude || DEFAULT_LATITUDE,
    settings.longitude || DEFAULT_LONGITUDE,
    settings.timezone || DEFAULT_TIMEZONE,
    settings.prayerAdjustments
  );

  // Date du jour formatée
  const todayDate = momentTz().tz(settings.timezone || DEFAULT_TIMEZONE);
  const formattedDate = todayDate.format('dddd D MMMM YYYY');

  // Formater countdown
  const fmt = (n: number) => n.toString().padStart(2, '0');
  const countdownStr = `Dans ${fmt(countdown.h)}h ${fmt(countdown.m)}min ${fmt(countdown.s)}s`;

  // Progress (how many passed) — Chourouk ne compte pas
  const passedCount = prayers.filter(p => p.passed && !p.isSunrise).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ===== PREMIUM HEADER ===== */}
        <LinearGradient colors={colors.headerGradient} style={prieresStyles.headerGradient}>
          <FadeInView delay={50}>
            <View style={prieresStyles.headerTop}>
              {navigation.canGoBack && (
                <PressableScale onPress={navigation.goBack}>
                  <View style={prieresStyles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                  </View>
                </PressableScale>
              )}
              <View style={{ flex: 1 }}>
                <Text style={prieresStyles.headerTitle}>Horaires de Priere</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={prieresStyles.headerCity}>{settings.city}, {settings.country}</Text>
                </View>
              </View>
              <View style={prieresStyles.timeBox}>
                <Text style={prieresStyles.timeText}>{currentTime}</Text>
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={100}>
            <View style={prieresStyles.dateRow}>
              <View style={prieresStyles.hijriBadge}>
                <Ionicons name="moon" size={11} color={colors.secondary} />
                <Text style={[prieresStyles.hijriText, { color: colors.secondary }]}>
                  {(() => {
                    try {
                      const h = getAdjustedHijriMoment();
                      const months = ['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Ula','Jumada al-Thani','Rajab','Sha\'ban','Ramadan','Shawwal','Dhu al-Qi\'dah','Dhu al-Hijjah'];
                      return `${h.iDate()} ${months[h.iMonth()]} ${h.iYear()}`;
                    } catch { return ''; }
                  })()}
                </Text>
              </View>
              <Text style={prieresStyles.gregorianText}>{formattedDate}</Text>
            </View>
          </FadeInView>

          {/* Next Prayer Hero */}
          {nextPrayer && (
            <FadeInView delay={150}>
              <View style={prieresStyles.nextPrayerCard}>
                <ShimmerGold><View style={prieresStyles.nextPrayerGoldLine} /></ShimmerGold>
                <View style={prieresStyles.nextPrayerInner}>
                  <Text style={prieresStyles.nextPrayerLabel}>PROCHAINE PRIERE</Text>
                  <View style={prieresStyles.nextPrayerMainRow}>
                    <PulseView>
                      <View style={prieresStyles.nextPrayerIcon}>
                        <Ionicons name={nextPrayer.icon as any} size={28} color="#FFF" />
                      </View>
                    </PulseView>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={prieresStyles.nextPrayerName}>{nextPrayer.name}</Text>
                      <Text style={prieresStyles.nextPrayerAr}>{nextPrayer.ar}</Text>
                    </View>
                    <Text style={prieresStyles.nextPrayerTime}>{nextPrayer.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={prieresStyles.nextPrayerCountdown}>{countdownStr}</Text>
                  </View>
                </View>
              </View>
            </FadeInView>
          )}
        </LinearGradient>

        {/* ===== PROGRESS BAR ===== */}
        <FadeInView delay={250}>
          <View style={prieresStyles.progressSection}>
            <View style={prieresStyles.progressHeader}>
              <Text style={[prieresStyles.sectionTitle, { color: colors.text }]}>Horaires du jour</Text>
              <View style={[prieresStyles.progressBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[prieresStyles.progressBadgeText, { color: colors.primary }]}>{passedCount}/5</Text>
              </View>
            </View>
            <View style={[prieresStyles.progressTrack, { backgroundColor: colors.border + '40' }]}>
              <LinearGradient
                colors={[colors.primary, colors.secondary] as [string, string]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[prieresStyles.progressFill, { width: `${(passedCount / 5) * 100}%` as any }]}
              />
            </View>
          </View>
        </FadeInView>

        {/* ===== PRAYER LIST ===== */}
        <View style={prieresStyles.prayerList}>
          {prayers.map((p, i) => (
            <FadeInView key={p.name} delay={300 + i * 80}>
              <View style={[
                prieresStyles.prayerRow,
                { backgroundColor: colors.surface },
                p.isNext && { borderWidth: 2, borderColor: colors.secondary + '50', shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
                p.passed && !p.isSunrise && { opacity: 0.55 },
                p.isSunrise && { opacity: 0.8, borderLeftWidth: 3, borderLeftColor: colors.secondary + '60' },
              ]}>
                <View style={[prieresStyles.prayerIconBox, {
                  backgroundColor: p.isSunrise
                    ? colors.secondary + '20'
                    : p.isNext ? colors.primary : colors.primary + '12'
                }]}>
                  <Ionicons name={p.icon as any} size={20} color={p.isSunrise ? colors.secondary : p.isNext ? '#FFF' : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    p.isSunrise ? { fontSize: 14, fontWeight: '500' as const } : prieresStyles.prayerRowName,
                    { color: p.isSunrise ? colors.secondary : colors.text }
                  ]}>{p.name}</Text>
                  <Text style={{ color: p.isSunrise ? colors.secondary + 'AA' : colors.textSecondary, fontSize: 12 }}>{p.ar}</Text>
                </View>
                {p.isNext && (
                  <View style={[prieresStyles.nextBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={prieresStyles.nextBadgeText}>SUIVANTE</Text>
                  </View>
                )}
                {p.isSunrise && (
                  <Text style={{ fontSize: 10, color: colors.secondary + 'AA', marginRight: 8 }}>Lever du soleil</Text>
                )}
                {p.passed && !p.isSunrise && <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginRight: 8 }} />}
                <Text style={[
                  p.isSunrise ? { fontSize: 18, fontWeight: '600' as const } : prieresStyles.prayerRowTime,
                  { color: p.isSunrise ? colors.secondary : p.isNext ? colors.primary : colors.text }
                ]}>{p.time}</Text>
              </View>
            </FadeInView>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

// ===== PRIERES STYLES =====
const prieresStyles = StyleSheet.create({
  headerGradient: { paddingTop: Platform.OS === 'android' ? 44 : 20, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerCity: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  timeBox: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  timeText: { fontSize: 14, fontWeight: '700', color: '#FFF', fontVariant: ['tabular-nums'] as any },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  hijriBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(212,175,55,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)' },
  hijriText: { fontSize: 11, fontWeight: '600' },
  gregorianText: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  nextPrayerCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', overflow: 'hidden' },
  nextPrayerGoldLine: { height: 3, backgroundColor: '#D4AF37', borderRadius: 2, alignSelf: 'center', width: 50, marginTop: 12 },
  nextPrayerInner: { padding: 18, paddingTop: 14, alignItems: 'center' },
  nextPrayerLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 12 },
  nextPrayerMainRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 12 },
  nextPrayerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.4)' },
  nextPrayerName: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  nextPrayerAr: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  nextPrayerTime: { fontSize: 32, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'] as any },
  nextPrayerCountdown: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  progressSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  progressBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  progressBadgeText: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  methodText: { fontSize: 11, fontWeight: '500' },

  prayerList: { paddingHorizontal: 16 },
  prayerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  prayerIconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  prayerRowName: { fontSize: 16, fontWeight: '600' },
  prayerRowTime: { fontSize: 20, fontWeight: '700' },
  nextBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 10 },
  nextBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  noteCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, padding: 14, borderRadius: 14 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 16 },
});

// ===== SETTINGS SCREEN =====
const SettingsScreen = () => {
  const { colors } = useTheme();
  const { settings, updateSettings, bookmarks, favorites, removeFavorite, streak, updateDailyGoal } = useSettings();
  const navigation = useNavigation();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const getGPSLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusee', 'Activez la localisation dans les parametres');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      updateSettings({
        city: address.city || 'Ville inconnue',
        country: address.country || '',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setShowLocationModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de recuperer la position');
    }
    setIsLoadingLocation(false);
  };

  const selectCity = (city: typeof POPULAR_CITIES[0]) => {
    updateSettings({
      city: city.city,
      country: city.country,
      latitude: city.lat,
      longitude: city.lng,
    });
    setShowLocationModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const Section = ({ title, icon, children }: { title: string; icon: string; children: ReactNode }) => (
    <FadeInView style={settingsStyles.section}>
      <View style={settingsStyles.sectionHeader}>
        <View style={[settingsStyles.sectionIconBox, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name={icon as any} size={16} color={colors.primary} />
        </View>
        <Text style={[settingsStyles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <View style={[settingsStyles.sectionLine, { backgroundColor: colors.border + '40' }]} />
      </View>
      <View style={[settingsStyles.sectionCard, { backgroundColor: colors.surface }]}>
        {children}
      </View>
    </FadeInView>
  );

  const SettingRow = ({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) => (
    <PressableScale onPress={onPress} disabled={!onPress}>
      <View style={[settingsStyles.row, { borderBottomColor: colors.border + '30' }]}>
        <Text style={[settingsStyles.rowLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginLeft: 12 }}>
          {value && <Text style={[settingsStyles.rowValue, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{value}</Text>}
          {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 6, flexShrink: 0 }} />}
        </View>
      </View>
    </PressableScale>
  );

  const SettingToggle = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <View style={[settingsStyles.row, { borderBottomColor: colors.border + '30' }]}>
      <Text style={[settingsStyles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ===== PREMIUM HEADER ===== */}
      <LinearGradient colors={colors.headerGradient} style={settingsStyles.headerGradient}>
        <FadeInView delay={50}>
          <View style={settingsStyles.headerTop}>
            {navigation.canGoBack && (
              <PressableScale onPress={navigation.goBack}>
                <View style={settingsStyles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color="#FFF" />
                </View>
              </PressableScale>
            )}
            <View style={{ flex: 1 }}>
              <Text style={settingsStyles.headerTitle}>Parametres</Text>
              <Text style={settingsStyles.headerSubtitle}>Personnalisez votre experience</Text>
            </View>
            <Ionicons name="settings" size={22} color={colors.secondary} />
          </View>
        </FadeInView>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16 }}>

        <Section title="LOCALISATION" icon="location-outline">
          <SettingRow
            label="Ville"
            value={`${settings.city}, ${settings.country}`}
            onPress={() => setShowLocationModal(true)}
          />
        </Section>

        <Section title="NOTIFICATIONS" icon="notifications-outline">
          <SettingToggle
            label="Activer les notifications"
            value={settings.notificationsEnabled}
            onToggle={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
          />
          <View style={[settingsStyles.row, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[settingsStyles.rowLabel, { color: colors.text, marginBottom: 10 }]}>Rappel avant prière</Text>
            <View style={settingsStyles.minutesSelector}>
              {[5, 10, 15].map(min => (
                <PressableScale
                  key={min}
                  onPress={() => updateSettings({ notificationMinutes: min })}
                  style={{ flex: 1 }}
                >
                  <View style={[
                    settingsStyles.minuteBtn,
                    {
                      backgroundColor: settings.notificationMinutes === min ? colors.primary : colors.background,
                      borderColor: colors.border
                    }
                  ]}>
                    <Text style={{ color: settings.notificationMinutes === min ? '#FFF' : colors.text, fontSize: 13, fontWeight: '600' }}>
                      {min} min
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
          <SettingToggle
            label="Rappel lecture quotidienne"
            value={settings.dailyReadingReminder}
            onToggle={() => updateSettings({ dailyReadingReminder: !settings.dailyReadingReminder })}
          />
          <SettingToggle
            label="Dua Kumayl (jeudi soir)"
            value={settings.duaKumaylReminder}
            onToggle={() => updateSettings({ duaKumaylReminder: !settings.duaKumaylReminder })}
          />
        </Section>

        <Section title="APPARENCE" icon="color-palette-outline">
          <View style={[settingsStyles.row, { borderBottomColor: colors.border }]}>
            <Text style={[settingsStyles.rowLabel, { color: colors.text }]}>Theme</Text>
            <View style={settingsStyles.themePicker}>
              {(['light', 'dark', 'auto'] as const).map(mode => (
                <PressableScale key={mode} onPress={() => updateSettings({ themeMode: mode })}>
                  <View style={[
                    settingsStyles.themeModeBtn,
                    {
                      backgroundColor: settings.themeMode === mode ? colors.primary : colors.background,
                      borderColor: colors.border
                    }
                  ]}>
                    <Ionicons
                      name={mode === 'light' ? 'sunny' : mode === 'dark' ? 'moon' : 'phone-portrait'}
                      size={16}
                      color={settings.themeMode === mode ? '#FFF' : colors.text}
                    />
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
          <View style={[settingsStyles.row, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[settingsStyles.rowLabel, { color: colors.text }]}>Taille texte arabe</Text>
              <Text style={[settingsStyles.rowValue, { color: colors.primary }]}>{settings.arabicFontSize}px</Text>
            </View>
            <View style={settingsStyles.sliderRow}>
              <Text style={{ color: colors.textMuted }}>A</Text>
              <View style={settingsStyles.sliderTrack}>
                <View style={[settingsStyles.sliderFill, { width: `${((settings.arabicFontSize - 16) / 24) * 100}%`, backgroundColor: colors.primary }]} />
                <View style={settingsStyles.sliderBtns}>
                  {[16, 20, 24, 28, 32, 36, 40].map(size => (
                    <PressableScale key={size} onPress={() => updateSettings({ arabicFontSize: size })}>
                      <View style={[settingsStyles.sliderDot, settings.arabicFontSize === size && { backgroundColor: colors.primary }]} />
                    </PressableScale>
                  ))}
                </View>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>A</Text>
            </View>
          </View>
        </Section>

        <Section title="LECTURE DU CORAN" icon="book-outline">
          <SettingToggle
            label="Afficher texte arabe"
            value={settings.showArabic}
            onToggle={() => {
              if (settings.showArabic && !settings.showTranslation && !settings.showPhonetic) return;
              updateSettings({ showArabic: !settings.showArabic });
            }}
          />
          <SettingToggle
            label="Afficher traduction française"
            value={settings.showTranslation}
            onToggle={() => {
              if (!settings.showArabic && settings.showTranslation && !settings.showPhonetic) return;
              updateSettings({ showTranslation: !settings.showTranslation });
            }}
          />
          <SettingToggle
            label="Afficher phonétique"
            value={settings.showPhonetic}
            onToggle={() => {
              if (!settings.showArabic && !settings.showTranslation && settings.showPhonetic) return;
              updateSettings({ showPhonetic: !settings.showPhonetic });
            }}
          />
          <View style={[settingsStyles.row, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[settingsStyles.rowLabel, { color: colors.text }]}>Objectif quotidien (versets)</Text>
              <Text style={[settingsStyles.rowValue, { color: colors.primary }]}>{streak.dailyGoal}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                {[5, 10, 20, 30, 50, 100, 200].map(goal => (
                  <PressableScale key={goal} onPress={() => updateDailyGoal(goal)}>
                    <View style={[
                      settingsStyles.goalBtn,
                      {
                        backgroundColor: streak.dailyGoal === goal ? colors.primary : colors.background,
                        borderColor: colors.border
                      }
                    ]}>
                      <Text style={{ color: streak.dailyGoal === goal ? '#FFF' : colors.text, fontSize: 13, fontWeight: '600' }}>
                        {goal}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
            </ScrollView>
          </View>
          <SettingRow
            label="Recitateur par defaut"
            value={RECITERS.find(r => r.id === settings.defaultReciter)?.name}
            onPress={() => {}}
          />
          <SettingRow
            label="Mes marque-pages"
            value={`${bookmarks.length} marque-pages`}
            onPress={() => setShowBookmarksModal(true)}
          />
          <SettingRow
            label="Mes favoris"
            value={`${favorites.length} favoris`}
            onPress={() => setShowFavoritesModal(true)}
          />
        </Section>

        <Section title="RAMADAN" icon="moon-outline">
          <SettingToggle
            label="Notifications Ramadan"
            value={settings.ramadanNotifications}
            onToggle={() => updateSettings({ ramadanNotifications: !settings.ramadanNotifications })}
          />
          <View style={[settingsStyles.row, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[settingsStyles.rowLabel, { color: colors.text, marginBottom: 10 }]}>Rappel avant Iftar</Text>
            <View style={settingsStyles.minutesSelector}>
              {[5, 10, 15, 30].map(min => (
                <PressableScale key={min} onPress={() => updateSettings({ ramadanIftarReminder: min })} style={{ flex: 1 }}>
                  <View style={[
                    settingsStyles.minuteBtn,
                    {
                      backgroundColor: settings.ramadanIftarReminder === min ? colors.primary : colors.background,
                      borderColor: colors.border
                    }
                  ]}>
                    <Text style={{ color: settings.ramadanIftarReminder === min ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>
                      {min} min
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
          <SettingToggle
            label="Rappel Suhoor"
            value={settings.ramadanSuhoorReminder}
            onToggle={() => updateSettings({ ramadanSuhoorReminder: !settings.ramadanSuhoorReminder })}
          />
        </Section>

        <Section title="OUTILS" icon="apps-outline">
          <SettingRow
            label="Direction Qibla"
            value="Boussole"
            onPress={() => navigation.navigate('qibla')}
          />
          <SettingRow
            label="Calendrier Hijri"
            value="Dates islamiques"
            onPress={() => navigation.navigate('calendrier')}
          />
          <SettingRow
            label="Téléchargements"
            value="Mode hors ligne"
            onPress={() => navigation.navigate('downloads')}
          />
        </Section>

        <Section title="A PROPOS" icon="information-circle-outline">
          <SettingRow label="Version" value="1.0.0" />
          <SettingRow
            label="À propos de Sakina"
            onPress={() => navigation.navigate('about')}
          />
        </Section>

        <View style={{ height: 120 }} />
      </View>

      {/* Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choisir une ville</Text>
              <PressableScale onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </PressableScale>
            </View>

            <PressableScale onPress={getGPSLocation}>
              <View style={[styles.gpsButton, { backgroundColor: colors.primary }]}>
                {isLoadingLocation ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={20} color="#FFF" />
                    <Text style={styles.gpsButtonText}>Utiliser ma position GPS</Text>
                  </>
                )}
              </View>
            </PressableScale>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Rechercher une ville..."
              placeholderTextColor={colors.textMuted}
              value={searchCity}
              onChangeText={setSearchCity}
            />

            <Text style={[styles.popularLabel, { color: colors.textSecondary }]}>Villes populaires</Text>

            <FlatList
              data={POPULAR_CITIES.filter(c =>
                c.city.toLowerCase().includes(searchCity.toLowerCase()) ||
                c.country.toLowerCase().includes(searchCity.toLowerCase())
              )}
              keyExtractor={item => item.city}
              renderItem={({ item }) => (
                <PressableScale onPress={() => selectCity(item)}>
                  <View style={[styles.cityItem, { borderBottomColor: colors.border }]}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                    <Text style={[styles.cityItemText, { color: colors.text }]}>{item.city}</Text>
                    <Text style={[styles.cityItemCountry, { color: colors.textSecondary }]}>{item.country}</Text>
                  </View>
                </PressableScale>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal visible={showBookmarksModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mes marque-pages</Text>
              <PressableScale onPress={() => setShowBookmarksModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </PressableScale>
            </View>

            {bookmarks.length === 0 ? (
              <View style={styles.emptyBookmarks}>
                <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun marque-page
                </Text>
              </View>
            ) : (
              <FlatList
                data={bookmarks}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.bookmarkItem, { borderLeftColor: item.color, borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bookmarkSurah, { color: colors.text }]}>{item.surahName}</Text>
                      <Text style={[styles.bookmarkVerse, { color: colors.textSecondary }]}>
                        Verset {item.verseNumber}
                      </Text>
                      {item.note && (
                        <Text style={[styles.bookmarkNote, { color: colors.textMuted }]}>{item.note}</Text>
                      )}
                    </View>
                    <Text style={[styles.bookmarkDate, { color: colors.textMuted }]}>
                      {new Date(item.timestamp).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Favorites Modal */}
      <Modal visible={showFavoritesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mes favoris</Text>
              <PressableScale onPress={() => setShowFavoritesModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </PressableScale>
            </View>

            {favorites.length === 0 ? (
              <View style={styles.emptyBookmarks}>
                <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun favori
                </Text>
                <Text style={[{ color: colors.textMuted, fontSize: 13, marginTop: 8, textAlign: 'center' }]}>
                  Appuyez sur le coeur d'un verset pour l'ajouter
                </Text>
              </View>
            ) : (
              <FlatList
                data={favorites}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.bookmarkItem, { borderLeftColor: '#EF4444', borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bookmarkSurah, { color: colors.text }]}>{item.surahName}</Text>
                      <Text style={[styles.bookmarkVerse, { color: colors.textSecondary }]}>
                        Verset {item.verseNumber}
                      </Text>
                      <Text style={[{ color: colors.text, fontSize: 18, fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif', textAlign: 'right', marginTop: 8 }]} numberOfLines={2}>
                        {item.arabic}
                      </Text>
                      <Text style={[{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }]} numberOfLines={2}>
                        {item.french}
                      </Text>
                    </View>
                    <PressableScale onPress={() => removeFavorite(item.id)} style={{ padding: 8 }}>
                      <Ionicons name="heart-dislike-outline" size={22} color="#EF4444" />
                    </PressableScale>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
};

// ===== SETTINGS STYLES =====
const settingsStyles = StyleSheet.create({
  headerGradient: { paddingTop: Platform.OS === 'android' ? 44 : 20, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sectionLine: { flex: 1, height: 1, marginLeft: 8 },
  sectionCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  rowLabel: { fontSize: 14, flexShrink: 0 },
  rowValue: { fontSize: 13, flex: 1, textAlign: 'right' },

  minutesSelector: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  minuteBtn: { flex: 1, minWidth: 55, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  goalBtn: { width: 44, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  themePicker: { flexDirection: 'row', gap: 8 },
  themeModeBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sliderTrack: { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, position: 'relative' },
  sliderFill: { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2 },
  sliderBtns: { position: 'absolute', top: -8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  sliderDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.2)' },
});

// ===== RAMADAN SCREEN =====
const RamadanScreen = () => {
  const { colors } = useTheme();
  const { settings, streak, updateStreak } = useSettings();
  const navigation = useNavigation();

  const [ramadanInfo, setRamadanInfo] = useState<RamadanInfo>(getRamadanInfo());
  const [ramadanCountdown, setRamadanCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [countdownPhase, setCountdownPhase] = useState<'suhoor' | 'iftar' | 'iftarTime'>('iftar');
  const [currentDuaIndex, setCurrentDuaIndex] = useState(0);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [ramadanProgress, setRamadanProgress] = useState<RamadanProgressData | null>(null);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const starAnim = useRef(new Animated.Value(0)).current;

  // Horaires de priere reels via le hook
  const { prayers: ramadanPrayers } = usePrayerTimesRealtime(
    settings.latitude || DEFAULT_LATITUDE,
    settings.longitude || DEFAULT_LONGITUDE,
    settings.timezone || DEFAULT_TIMEZONE,
    settings.prayerAdjustments
  );

  const fajrPrayer = ramadanPrayers.find(p => p.name === 'Sobh');
  const maghribPrayer = ramadanPrayers.find(p => p.name === 'Maghrib');

  // Charger la progression Ramadan
  useEffect(() => {
    loadRamadanProgress();
  }, []);

  const loadRamadanProgress = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RAMADAN_PROGRESS);
      if (data) {
        setRamadanProgress(JSON.parse(data));
      } else {
        // Initialiser la progression
        const newProgress: RamadanProgressData = {
          year: ramadanInfo.hijriYear,
          dailyGoal: settings.ramadanDailyGoal,
          totalVersesRead: streak.todayVersesRead,
          dailyProgress: [],
        };
        setRamadanProgress(newProgress);
      }
    } catch (error) {
      console.error('Error loading Ramadan progress:', error);
    }
  };

  // Animation pulse pour countdown
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Animation etoiles
  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(starAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(starAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    );
    twinkle.start();
    return () => twinkle.stop();
  }, []);

  // Countdown timer basé sur les vrais horaires de prière
  useEffect(() => {
    if (ramadanInfo.status !== 'during') return;
    if (!fajrPrayer || !maghribPrayer) return;

    const tz = settings.timezone || DEFAULT_TIMEZONE;

    const updateCountdown = () => {
      const now = momentTz().tz(tz);
      const currentTimeStr = now.format('HH:mm:ss');

      const fajrTimeStr = fajrPrayer.time + ':00';
      const maghribTimeStr = maghribPrayer.time + ':00';

      if (currentTimeStr >= maghribTimeStr) {
        // Après Maghrib → Bon Iftar !
        setCountdownPhase('iftarTime');
        setRamadanCountdown({ hours: 0, minutes: 0, seconds: 0 });
      } else if (currentTimeStr < fajrTimeStr) {
        // Entre minuit et Sobh → countdown vers Suhoor (fin = heure du Sobh)
        setCountdownPhase('suhoor');
        const [fH, fM] = fajrPrayer.time.split(':').map(Number);
        const target = now.clone().hour(fH).minute(fM).second(0);
        const diffMs = target.diff(now);
        if (diffMs > 0) {
          const totalSec = Math.floor(diffMs / 1000);
          setRamadanCountdown({
            hours: Math.floor(totalSec / 3600),
            minutes: Math.floor((totalSec % 3600) / 60),
            seconds: totalSec % 60,
          });
        }
      } else {
        // Entre Sobh et Maghrib → countdown vers Iftar
        setCountdownPhase('iftar');
        const [mH, mM] = maghribPrayer.time.split(':').map(Number);
        const target = now.clone().hour(mH).minute(mM).second(0);
        const diffMs = target.diff(now);
        if (diffMs > 0) {
          const totalSec = Math.floor(diffMs / 1000);
          setRamadanCountdown({
            hours: Math.floor(totalSec / 3600),
            minutes: Math.floor((totalSec % 3600) / 60),
            seconds: totalSec % 60,
          });
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ramadanInfo.status, fajrPrayer, maghribPrayer]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const progressPercentage = ramadanProgress
    ? Math.min(100, (ramadanProgress.totalVersesRead / TOTAL_QURAN_VERSES) * 100)
    : 0;

  const chartData = useMemo(() => {
    const currentDay = ramadanInfo.ramadanDay || 1;
    return [...Array(7)].map((_, i) => {
      const dayIndex = currentDay - 6 + i;
      if (dayIndex < 1) return { height: 0, isToday: false, label: '' };
      const isToday = i === 6;
      const dailyEntry = ramadanProgress?.dailyProgress?.find(
        (d) => d.day === dayIndex
      );
      const versesRead = dailyEntry?.versesRead || (isToday ? streak.todayVersesRead : 0);
      const goal = settings.ramadanDailyGoal || 208;
      const height = Math.min(100, (versesRead / goal) * 100);
      return { height, isToday, label: isToday ? 'Auj' : `J${dayIndex}` };
    });
  }, [ramadanInfo.ramadanDay, ramadanProgress, streak.todayVersesRead, settings.ramadanDailyGoal]);

  // Rendu AVANT Ramadan
  if (ramadanInfo.status === 'before' || ramadanInfo.status === 'after') {
    const daysUntil = ramadanInfo.daysUntilRamadan || 0;
    const isAfter = ramadanInfo.status === 'after';

    return (
      <View style={ramadanStyles.container}>
        <LinearGradient
          colors={RamadanColors.backgroundGradient}
          style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
          pointerEvents="none"
        />

        <CustomHeader
          title="Ramadan"
          showBackButton={true}
          onBack={() => navigation.canGoBack ? navigation.goBack() : navigation.navigate('home')}
        />

        {/* Etoiles animees */}
        <Animated.View style={[ramadanStyles.starsContainer, { opacity: starAnim }]}>
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={[
                ramadanStyles.star,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                  width: Math.random() * 3 + 1,
                  height: Math.random() * 3 + 1,
                },
              ]}
            />
          ))}
        </Animated.View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={ramadanStyles.beforeContent}>
            {/* Croissant de lune */}
            <View style={ramadanStyles.moonContainer}>
              <Text style={ramadanStyles.moonEmoji}>🌙</Text>
            </View>

            <Text style={ramadanStyles.beforeTitle}>
              RAMADAN {ramadanInfo.hijriYear}
            </Text>

            {isAfter ? (
              <View style={ramadanStyles.afterCard}>
                <Text style={ramadanStyles.afterText}>
                  Ramadan termine
                </Text>
                <Text style={ramadanStyles.afterSubtext}>
                  A l'annee prochaine insha'Allah
                </Text>
                <Text style={ramadanStyles.daysText}>
                  Prochain Ramadan dans
                </Text>
              </View>
            ) : (
              <Text style={ramadanStyles.daysText}>
                DANS
              </Text>
            )}

            {/* Countdown anime */}
            <Animated.View style={[ramadanStyles.countdownCard, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={RamadanColors.cardGradient}
                style={ramadanStyles.countdownGradient}
              >
                <Text style={ramadanStyles.countdownNumber}>{daysUntil}</Text>
                <Text style={ramadanStyles.countdownLabel}>JOURS</Text>
              </LinearGradient>
            </Animated.View>

            {/* Date actuelle Hijri */}
            <View style={ramadanStyles.dateCard}>
              <Text style={ramadanStyles.dateHijri}>
                {ramadanInfo.hijriDay} {ramadanInfo.hijriMonthName} {ramadanInfo.hijriYear - (isAfter ? 1 : 0)}
              </Text>
            </View>

            {/* Conseils de preparation */}
            {!isAfter && (
              <View style={ramadanStyles.tipsCard}>
                <Text style={ramadanStyles.tipsTitle}>
                  Preparez-vous spirituellement
                </Text>
                <View style={ramadanStyles.tipItem}>
                  <Ionicons name="book-outline" size={20} color={RamadanColors.secondary} />
                  <Text style={ramadanStyles.tipText}>Finissez votre lecture du Coran</Text>
                </View>
                <View style={ramadanStyles.tipItem}>
                  <Ionicons name="hand-right-outline" size={20} color={RamadanColors.secondary} />
                  <Text style={ramadanStyles.tipText}>Apprenez les Dua du Ramadan</Text>
                </View>
                <View style={ramadanStyles.tipItem}>
                  <Ionicons name="heart-outline" size={20} color={RamadanColors.secondary} />
                  <Text style={ramadanStyles.tipText}>Preparez vos intentions</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Rendu PENDANT Ramadan
  return (
    <View style={ramadanStyles.container}>
      <LinearGradient
        colors={RamadanColors.backgroundGradient}
        style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
        pointerEvents="none"
      />

      <CustomHeader
        title={`Ramadan - Jour ${ramadanInfo.ramadanDay}/${RAMADAN_DAYS}`}
        showBackButton={true}
        onBack={() => navigation.canGoBack ? navigation.goBack() : navigation.navigate('home')}
      />

      {/* Etoiles animees */}
      <Animated.View style={[ramadanStyles.starsContainer, { opacity: starAnim }]}>
        {[...Array(15)].map((_, i) => (
          <View
            key={i}
            style={[
              ramadanStyles.star,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 30}%`,
                width: Math.random() * 2 + 1,
                height: Math.random() * 2 + 1,
              },
            ]}
          />
        ))}
      </Animated.View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={ramadanStyles.duringContent}>
          {/* Card Countdown Iftar / Suhoor */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={countdownPhase === 'iftarTime' ? ['#22C55E', '#16A34A'] : countdownPhase === 'suhoor' ? ['#1E3A8A', '#312E81'] : RamadanColors.iftarGradient}
              style={ramadanStyles.iftarCard}
            >
              {countdownPhase === 'iftarTime' ? (
                <View style={ramadanStyles.iftarContent}>
                  <Text style={ramadanStyles.iftarLabel}>C'EST L'HEURE DE L'IFTAR !</Text>
                  <Text style={ramadanStyles.iftarEmoji}>🌙</Text>
                  <Text style={ramadanStyles.iftarBlessings}>Bon Iftar !</Text>
                </View>
              ) : countdownPhase === 'suhoor' ? (
                <View style={ramadanStyles.iftarContent}>
                  <Text style={ramadanStyles.iftarLabel}>FIN DU SUHOOR DANS</Text>
                  <Text style={ramadanStyles.iftarCountdown}>
                    {pad(ramadanCountdown.hours)}:{pad(ramadanCountdown.minutes)}:{pad(ramadanCountdown.seconds)}
                  </Text>
                  <View style={ramadanStyles.iftarTimeRow}>
                    <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={ramadanStyles.iftarTime}>
                      Sobh {fajrPrayer?.time || '--:--'} - {settings.city}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={ramadanStyles.iftarContent}>
                  <Text style={ramadanStyles.iftarLabel}>IFTAR (FTOUR) DANS</Text>
                  <Text style={ramadanStyles.iftarCountdown}>
                    {pad(ramadanCountdown.hours)}:{pad(ramadanCountdown.minutes)}:{pad(ramadanCountdown.seconds)}
                  </Text>
                  <View style={ramadanStyles.iftarTimeRow}>
                    <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={ramadanStyles.iftarTime}>
                      Maghrib {maghribPrayer?.time || '--:--'} - {settings.city}
                    </Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Dua de rupture du jeune */}
          <View style={ramadanStyles.duaCard}>
            <View style={ramadanStyles.duaHeader}>
              <Ionicons name="hand-right" size={20} color={RamadanColors.secondary} />
              <Text style={ramadanStyles.duaTitle}>DUA DE RUPTURE DU JEUNE</Text>
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 80));
                setCurrentDuaIndex(index);
              }}
            >
              {IFTAR_DUAS.map((dua, index) => (
                <View key={dua.id} style={[ramadanStyles.duaSlide, { width: SCREEN_WIDTH - 80 }]}>
                  <Text style={ramadanStyles.duaArabic}>{dua.arabic}</Text>
                  <Text style={ramadanStyles.duaTranslit}>{dua.transliteration}</Text>
                  <Text style={ramadanStyles.duaTranslation}>{dua.translation}</Text>
                  <Text style={ramadanStyles.duaSource}>- {dua.source}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Indicateurs de page */}
            <View style={ramadanStyles.duaIndicators}>
              {IFTAR_DUAS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    ramadanStyles.duaIndicator,
                    currentDuaIndex === index && ramadanStyles.duaIndicatorActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Horaire Suhoor */}
          <View style={ramadanStyles.suhoorCard}>
            <Ionicons name="sunny-outline" size={24} color={RamadanColors.secondary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={ramadanStyles.suhoorLabel}>HORAIRE SUHOOR</Text>
              <Text style={ramadanStyles.suhoorTime}>{fajrPrayer?.time || '--:--'}</Text>
            </View>
            <Text style={ramadanStyles.suhoorNote}>Fin du Suhoor</Text>
          </View>

          {/* Tracker de lecture */}
          <View style={ramadanStyles.trackerCard}>
            <View style={ramadanStyles.trackerHeader}>
              <Ionicons name="book" size={20} color={RamadanColors.secondary} />
              <Text style={ramadanStyles.trackerTitle}>TRACKER DE LECTURE</Text>
            </View>

            <Text style={ramadanStyles.trackerGoal}>
              Objectif : Terminer le Coran
            </Text>

            <View style={ramadanStyles.progressBarContainer}>
              <View style={ramadanStyles.progressBarBg}>
                <View
                  style={[
                    ramadanStyles.progressBarFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={ramadanStyles.progressText}>{progressPercentage.toFixed(0)}%</Text>
            </View>

            <View style={ramadanStyles.trackerStats}>
              <View style={ramadanStyles.trackerStat}>
                <Text style={ramadanStyles.trackerStatValue}>
                  {ramadanProgress?.totalVersesRead || streak.todayVersesRead}
                </Text>
                <Text style={ramadanStyles.trackerStatLabel}>/ {TOTAL_QURAN_VERSES} versets</Text>
              </View>
              <View style={ramadanStyles.trackerStat}>
                <Text style={ramadanStyles.trackerStatValue}>
                  {streak.todayVersesRead}
                </Text>
                <Text style={ramadanStyles.trackerStatLabel}>aujourd'hui</Text>
              </View>
            </View>

            {/* Mini graphique */}
            <View style={ramadanStyles.miniChart}>
              {chartData.map((bar, i) => (
                <View key={i} style={ramadanStyles.chartBarContainer}>
                  <View
                    style={[
                      ramadanStyles.chartBar,
                      {
                        height: `${bar.height}%`,
                        backgroundColor: bar.isToday
                          ? RamadanColors.secondary
                          : bar.height > 50
                          ? '#22C55E'
                          : '#6B7280',
                      },
                    ]}
                  />
                  <Text style={ramadanStyles.chartDay}>{bar.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Jour special */}
          {isSpecialNight(ramadanInfo.ramadanDay!) && (
            <View style={ramadanStyles.specialNightCard}>
              <Text style={ramadanStyles.specialNightEmoji}>⭐</Text>
              <Text style={ramadanStyles.specialNightText}>
                {getSpecialDayDescription(ramadanInfo.ramadanDay!)}
              </Text>
              <Text style={ramadanStyles.specialNightSubtext}>
                Multipliez vos adorations cette nuit
              </Text>
            </View>
          )}

          {/* Bouton calendrier */}
          <PressableScale
            style={ramadanStyles.actionButton}
            onPress={() => setShowCalendarModal(true)}
          >
            <Ionicons name="calendar" size={24} color={RamadanColors.secondary} />
            <Text style={ramadanStyles.actionButtonText}>Calendrier Ramadan</Text>
          </PressableScale>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Modal Calendrier */}
      <Modal visible={showCalendarModal} animationType="slide" transparent>
        <View style={ramadanStyles.modalOverlay}>
          <View style={ramadanStyles.modalContent}>
            <View style={ramadanStyles.modalHeader}>
              <Text style={ramadanStyles.modalTitle}>Calendrier Ramadan</Text>
              <PressableScale onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </PressableScale>
            </View>

            <ScrollView>
              <View style={ramadanStyles.calendarGrid}>
                {[...Array(RAMADAN_DAYS)].map((_, i) => {
                  const day = i + 1;
                  const isToday = day === ramadanInfo.ramadanDay;
                  const isPast = day < (ramadanInfo.ramadanDay || 0);
                  const isSpecial = isSpecialNight(day);

                  return (
                    <View
                      key={day}
                      style={[
                        ramadanStyles.calendarDay,
                        isToday && ramadanStyles.calendarDayToday,
                        isPast && ramadanStyles.calendarDayPast,
                      ]}
                    >
                      <Text
                        style={[
                          ramadanStyles.calendarDayNum,
                          isToday && ramadanStyles.calendarDayNumToday,
                        ]}
                      >
                        {day}
                      </Text>
                      {isSpecial && <Text style={ramadanStyles.calendarSpecial}>⭐</Text>}
                      {isPast && (
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#22C55E"
                          style={{ marginTop: 2 }}
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={ramadanStyles.calendarLegend}>
                <View style={ramadanStyles.legendItem}>
                  <View style={[ramadanStyles.legendDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={ramadanStyles.legendText}>Jour passe</Text>
                </View>
                <View style={ramadanStyles.legendItem}>
                  <View style={[ramadanStyles.legendDot, { backgroundColor: RamadanColors.secondary }]} />
                  <Text style={ramadanStyles.legendText}>Aujourd'hui</Text>
                </View>
                <View style={ramadanStyles.legendItem}>
                  <Text style={ramadanStyles.legendText}>⭐ Nuit speciale</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// Styles Ramadan
const ramadanStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  star: {
    position: 'absolute',
    backgroundColor: RamadanColors.starColor,
    borderRadius: 10,
  },
  // Avant Ramadan
  beforeContent: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  moonContainer: {
    marginBottom: 20,
  },
  moonEmoji: {
    fontSize: 80,
  },
  beforeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 20,
  },
  daysText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 3,
    marginBottom: 20,
  },
  afterCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  afterText: {
    fontSize: 24,
    fontWeight: '700',
    color: RamadanColors.secondary,
    marginBottom: 8,
  },
  afterSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  countdownCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
  },
  countdownGradient: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFF',
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 4,
  },
  dateCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 40,
  },
  dateHijri: {
    fontSize: 16,
    color: RamadanColors.secondary,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
  },
  // Pendant Ramadan
  duringContent: {
    padding: 20,
  },
  iftarCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  iftarContent: {
    alignItems: 'center',
  },
  iftarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  iftarCountdown: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },
  iftarTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  iftarTime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 6,
  },
  iftarEmoji: {
    fontSize: 60,
    marginVertical: 10,
  },
  iftarBlessings: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  // Dua
  duaCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  duaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  duaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: RamadanColors.secondary,
    marginLeft: 8,
    letterSpacing: 1,
  },
  duaSlide: {
    paddingHorizontal: 10,
  },
  duaArabic: {
    fontSize: 24,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  duaTranslit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  duaTranslation: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  duaSource: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  duaIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  duaIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  duaIndicatorActive: {
    backgroundColor: RamadanColors.secondary,
    width: 20,
  },
  // Suhoor
  suhoorCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  suhoorLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  suhoorTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  suhoorNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  // Tracker
  trackerCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: RamadanColors.secondary,
    marginLeft: 8,
    letterSpacing: 1,
  },
  trackerGoal: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: RamadanColors.secondary,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: RamadanColors.secondary,
    marginLeft: 12,
  },
  trackerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  trackerStat: {
    alignItems: 'center',
  },
  trackerStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  trackerStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  miniChart: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  chartDay: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  // Special night
  specialNightCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: RamadanColors.secondary,
  },
  specialNightEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  specialNightText: {
    fontSize: 16,
    fontWeight: '700',
    color: RamadanColors.secondary,
    textAlign: 'center',
  },
  specialNightSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  // Actions
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: RamadanColors.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  // Calendar
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarDayToday: {
    backgroundColor: RamadanColors.secondary,
  },
  calendarDayPast: {
    opacity: 0.6,
  },
  calendarDayNum: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  calendarDayNumToday: {
    color: '#000',
  },
  calendarSpecial: {
    fontSize: 10,
    marginTop: 2,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});

// ===== PLACEHOLDER SCREENS =====
const PlaceholderScreen = ({ title, icon, gradient }: { title: string; icon: string; gradient: readonly [string, string] }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.placeholderContainer, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.backgroundGradient} style={StyleSheet.absoluteFill} />

      <CustomHeader
        title={title}
        showBackButton={navigation.canGoBack}
        onBack={navigation.goBack}
      />

      <FadeInView style={styles.placeholderContent}>
        <LinearGradient colors={gradient} style={styles.placeholderIcon}>
          <Ionicons name={icon as any} size={48} color="#FFF" />
        </LinearGradient>
        <Text style={[styles.placeholderTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Bientot disponible</Text>
      </FadeInView>
    </View>
  );
};

// ===== TAB BAR =====
// ===== MAIN APP =====
const AppContent = () => {
  const { isDark, colors } = useTheme();
  const [screen, setScreen] = useState<ScreenName>('home');
  const [navigationHistory, setNavigationHistory] = useState<ScreenName[]>(['home']);

  const navigate = useCallback((newScreen: ScreenName) => {
    setNavigationHistory(prev => [...prev, newScreen]);
    setScreen(newScreen);
  }, []);

  const goBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      const previousScreen = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setScreen(previousScreen);
    }
  }, [navigationHistory]);

  const navigationContextValue: NavigationContextType = {
    navigate,
    goBack,
    canGoBack: navigationHistory.length > 1 && screen !== 'home',
    currentScreen: screen,
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home': return <HomeScreen onNavigate={navigate} />;
      case 'coran': return <CoranScreen />;
      case 'prieres': return <PrieresScreen />;
      case 'ramadan': return <RamadanScreen />;
      case 'dua': return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          {/* Header premium */}
          <LinearGradient colors={['#166534', '#16a34a']} style={{ paddingTop: 16, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
              <Pressable onPress={goBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="arrow-back" size={22} color="#FFF" />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFF' }}>Duas</Text>
                <Text style={{ fontSize: 14, color: '#D4AF37', marginTop: 2 }}>الدعاء</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Corps */}
          <FadeInView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
            {/* Cercle icone */}
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              <Ionicons name="hand-left-outline" size={44} color="#16a34a" />
            </View>

            <Text style={{ fontSize: 24, fontWeight: '700', color: '#166534', marginBottom: 12 }}>
              Bientot disponible
            </Text>
            <Text style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 }}>
              Les invocations (Duas) seront ajoutees{'\n'}dans une prochaine mise a jour
            </Text>
          </FadeInView>
        </View>
      );
      case 'settings': return <SettingsScreen />;
      case 'qibla': return <QiblaScreen navigation={{ goBack }} isDark={isDark} />;
      case 'calendrier': return <CalendrierHijriScreen navigation={{ goBack }} isDark={isDark} />;
      case 'about': return <AboutScreen navigation={{ goBack }} isDark={isDark} />;
      case 'cercle': return (
        <DuaThemeProvider>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              <Pressable onPress={goBack} style={{ padding: 8 }}>
                <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#000'} />
              </Pressable>
            </View>
            <CircleNavigator />
          </View>
        </DuaThemeProvider>
      );
      case 'downloads': return <DownloadsScreen navigation={{ goBack }} isDark={isDark} />;
      case 'tasbih': return <TasbihScreen navigation={{ goBack: () => goBack() }} isDark={isDark} />;
    }
  };

  return (
    <NavigationContext.Provider value={navigationContextValue}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>{renderScreen()}</View>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaView>
    </NavigationContext.Provider>
  );
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem('sakina_onboarding_done');
        setShowOnboarding(done !== 'true');
      } catch {
        setShowOnboarding(false);
      }
      setIsReady(true);
    })();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <DeviceProvider>
        <SettingsProvider>
          <ThemeProvider>
            <DuaProvider>
              <AppContent />
            </DuaProvider>
          </ThemeProvider>
        </SettingsProvider>
      </DeviceProvider>
    </SafeAreaProvider>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },

  // Countdown (used by CountdownComponent)
  countdown: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },

  // Glass Card
  glassCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },

  // Coran Toggle (used by Toggle component)
  toggleBtn: { height: 44, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  // Bookmark Modal
  bookmarkModal: { margin: 20, borderRadius: 20, padding: 24, paddingBottom: 28 },
  bookmarkVerse: { fontSize: 16, marginBottom: 12 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
  colorLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  colorPicker: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorOption: { width: 40, height: 40, borderRadius: 20 },
  colorSelected: { borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },

  // Location Modal
  gpsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  gpsButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  searchInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
  popularLabel: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  cityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  cityItemText: { flex: 1, fontSize: 16, marginLeft: 12 },
  cityItemCountry: { fontSize: 14 },

  // Bookmarks
  emptyBookmarks: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, marginTop: 12 },
  bookmarkItem: { paddingVertical: 14, paddingHorizontal: 16, borderLeftWidth: 4, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  bookmarkSurah: { fontSize: 16, fontWeight: '600' },
  bookmarkNote: { fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  bookmarkDate: { fontSize: 12 },

  // Placeholder
  placeholderContainer: { flex: 1 },
  placeholderContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  placeholderIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  placeholderTitle: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  placeholderText: { fontSize: 15, textAlign: 'center', lineHeight: 24 },
});
