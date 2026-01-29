/**
 * App.tsx - Barakaah - Application Coranique Chiite Premium
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import moment from 'moment-hijri';
import momentTz from 'moment-timezone';
import { PrayerTimes, Coordinates, CalculationMethod } from 'adhan';

// Import du module Dua
import { DuaProvider, ThemeProvider as DuaThemeProvider } from './src/contexts';
import { DuaNavigator } from './src/navigation';
import { QiblaScreen, CalendrierHijriScreen, AboutScreen, DownloadsScreen } from './src/screens';

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
}

interface NextPrayerInfo {
  name: string;
  ar: string;
  time: string;
  icon: string;
}

// Calcule les horaires de prière pour une position donnée
const calculatePrayerTimesForLocation = (
  latitude: number,
  longitude: number,
  timezone: string
): { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string } => {
  const coords = new Coordinates(latitude, longitude);
  const params = CalculationMethod.Tehran(); // Méthode Jafari (chiite)
  const now = momentTz().tz(timezone);
  const date = new Date(now.year(), now.month(), now.date());
  const times = new PrayerTimes(coords, date, params);

  return {
    fajr: momentTz(times.fajr).tz(timezone).format('HH:mm'),
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
  timezone: string
): { prayers: PrayerInfo[]; nextPrayer: NextPrayerInfo | null; countdown: { h: number; m: number; s: number } } => {
  const times = calculatePrayerTimesForLocation(latitude, longitude, timezone);
  const now = momentTz().tz(timezone);
  const currentTimeStr = now.format('HH:mm:ss');

  const prayersList = [
    { name: 'Fajr', ar: 'الفجر', time: times.fajr, icon: 'sunny-outline' },
    { name: 'Dhuhr', ar: 'الظهر', time: times.dhuhr, icon: 'sunny' },
    { name: 'Asr', ar: 'العصر', time: times.asr, icon: 'partly-sunny-outline' },
    { name: 'Maghrib', ar: 'المغرب', time: times.maghrib, icon: 'moon-outline' },
    { name: 'Isha', ar: 'العشاء', time: times.isha, icon: 'cloudy-night-outline' },
  ];

  let nextPrayer: NextPrayerInfo | null = null;
  let nextPrayerTime: string | null = null;

  const prayersWithStatus: PrayerInfo[] = prayersList.map((prayer, index) => {
    const prayerTimeWithSeconds = prayer.time + ':00';
    const isPassed = currentTimeStr >= prayerTimeWithSeconds;
    let isNext = false;

    if (!nextPrayer && !isPassed) {
      isNext = true;
      nextPrayer = { name: prayer.name, ar: prayer.ar, time: prayer.time, icon: prayer.icon };
      nextPrayerTime = prayer.time;
    }

    return { ...prayer, passed: isPassed, isNext };
  });

  // Si toutes les prières sont passées, la prochaine est Fajr demain
  if (!nextPrayer) {
    const tomorrow = now.clone().add(1, 'day');
    const tomorrowDate = new Date(tomorrow.year(), tomorrow.month(), tomorrow.date());
    const coords = new Coordinates(latitude, longitude);
    const params = CalculationMethod.Tehran();
    const tomorrowTimes = new PrayerTimes(coords, tomorrowDate, params);
    const fajrTomorrow = momentTz(tomorrowTimes.fajr).tz(timezone).format('HH:mm');

    nextPrayer = { name: 'Fajr', ar: 'الفجر', time: fajrTomorrow, icon: 'sunny-outline' };
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
const usePrayerTimesRealtime = (latitude: number, longitude: number, timezone: string) => {
  const [prayers, setPrayers] = useState<PrayerInfo[]>([]);
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  const [currentTime, setCurrentTime] = useState(momentTz().tz(timezone).format('HH:mm:ss'));

  useEffect(() => {
    // Fonction de mise à jour
    const update = () => {
      const now = momentTz().tz(timezone);
      setCurrentTime(now.format('HH:mm:ss'));

      const result = getPrayersWithStatus(latitude, longitude, timezone);
      setPrayers(result.prayers);
      setNextPrayer(result.nextPrayer);
      setCountdown(result.countdown);

      // Debug log toutes les 10 secondes
      if (now.second() % 10 === 0) {
        console.log(`⏱️ ${now.format('HH:mm:ss')} | Prochaine: ${result.nextPrayer?.name} à ${result.nextPrayer?.time} | Dans: ${result.countdown.h}h ${result.countdown.m}min ${result.countdown.s}s`);
      }
    };

    // Mise à jour immédiate
    update();

    // Mise à jour chaque seconde
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [latitude, longitude, timezone]);

  return { prayers, nextPrayer, countdown, currentTime };
};

// ===== TYPES =====
type ScreenName = 'home' | 'coran' | 'prieres' | 'ramadan' | 'dua' | 'settings' | 'qibla' | 'calendrier' | 'about' | 'downloads';

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
  SETTINGS: 'barakaah_settings',
  BOOKMARKS: 'barakaah_bookmarks',
  STREAK: 'barakaah_streak',
  LAST_READ: 'barakaah_lastread',
  RAMADAN_PROGRESS: 'barakaah_ramadan_progress',
  RAMADAN_JOURNAL: 'barakaah_ramadan_journal',
};

const DEFAULT_SETTINGS: Settings = {
  city: DEFAULT_CITY,
  country: DEFAULT_COUNTRY,
  latitude: DEFAULT_LATITUDE,
  longitude: DEFAULT_LONGITUDE,
  timezone: DEFAULT_TIMEZONE,
  calculationMethod: 'Jafari',
  prayerAdjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  notificationsEnabled: true,
  notificationMinutes: 10,
  prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  dailyReadingReminder: true,
  duaKumaylReminder: true,
  themeMode: 'light',
  arabicFontSize: 24,
  arabicFont: 'Uthmani',
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
  const m = moment();
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
    primary: '#059669',
    primaryDark: '#047857',
    secondary: '#D4AF37',
    background: '#FAFAFA',
    backgroundGradient: ['#FFFFFF', '#F0FDF4'] as const,
    surface: '#FFFFFF',
    surfaceElevated: 'rgba(255, 255, 255, 0.95)',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: 'rgba(229, 231, 235, 0.5)',
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassStroke: 'rgba(255, 255, 255, 0.5)',
    success: '#22C55E',
    error: '#EF4444',
    prayerCardGradient: ['#059669', '#047857', '#065F46'] as const,
  },
  dark: {
    primary: '#10B981',
    primaryDark: '#059669',
    secondary: '#FBBF24',
    background: '#0F172A',
    backgroundGradient: ['#0F172A', '#1E293B'] as const,
    surface: '#1E293B',
    surfaceElevated: 'rgba(30, 41, 59, 0.95)',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderLight: 'rgba(51, 65, 85, 0.5)',
    glassBg: 'rgba(30, 41, 59, 0.85)',
    glassStroke: 'rgba(255, 255, 255, 0.1)',
    success: '#22C55E',
    error: '#EF4444',
    prayerCardGradient: ['#10B981', '#059669', '#047857'] as const,
  },
};

type ThemeColors = typeof Colors.light;

// ===== CONTEXTS =====
interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'timestamp'>) => void;
  removeBookmark: (id: string) => void;
  streak: StreakData;
  updateStreak: (versesRead: number) => void;
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
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [settingsData, bookmarksData, streakData, lastReadData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_READ),
      ]);

      if (settingsData) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) });
      if (bookmarksData) setBookmarks(JSON.parse(bookmarksData));
      if (streakData) setStreak({ ...DEFAULT_STREAK, ...JSON.parse(streakData) });
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

  const updateStreak = async (versesRead: number) => {
    const today = new Date().toISOString().split('T')[0];
    let newStreak = { ...streak };

    newStreak.todayVersesRead += versesRead;

    if (newStreak.lastReadDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (newStreak.lastReadDate === yesterday) {
        newStreak.currentStreak += 1;
      } else if (newStreak.lastReadDate !== today) {
        newStreak.currentStreak = 1;
      }
      newStreak.totalDaysRead += 1;
      newStreak.lastReadDate = today;

      newStreak.readingHistory.push({
        date: today,
        versesRead: newStreak.todayVersesRead,
        minutesSpent: 0,
      });
    }

    if (newStreak.currentStreak > newStreak.longestStreak) {
      newStreak.longestStreak = newStreak.currentStreak;
    }

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
      streak, updateStreak, lastRead, updateLastRead,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { settings, updateSettings } = useSettings();
  const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'auto' && false);
  const colors = isDark ? Colors.dark : Colors.light;

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

// ===== UI COMPONENTS =====
const GlassCard = ({ children, style, colors: c }: { children: ReactNode; style?: any; colors: ThemeColors }) => (
  <View style={[styles.glassCard, { backgroundColor: c.glassBg, borderColor: c.glassStroke }, style]}>
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
    <View style={[headerStyles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={headerStyles.leftSection}>
        {showBackButton ? (
          <PressableScale onPress={onBack} style={headerStyles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
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

// ===== QURAN DATA =====
const SURAHS = [
  { number: 1, name: 'Al-Fatiha', nameAr: 'الفاتحة', versesCount: 7, type: 'Mecquoise' },
  { number: 2, name: 'Al-Baqarah', nameAr: 'البقرة', versesCount: 286, type: 'Medinoise' },
  { number: 3, name: 'Al-Imran', nameAr: 'آل عمران', versesCount: 200, type: 'Medinoise' },
];

const FATIHA_VERSES = [
  { num: 1, ar: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', fr: "Au nom d'Allah, le Tout Misericordieux, le Tres Misericordieux.", ph: 'Bismillahi ar-Rahmani ar-Raheem' },
  { num: 2, ar: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', fr: "Louange a Allah, Seigneur de l'univers.", ph: "Al-hamdu lillahi Rabbi al-'aalameen" },
  { num: 3, ar: 'الرَّحْمَٰنِ الرَّحِيمِ', fr: 'Le Tout Misericordieux, le Tres Misericordieux.', ph: 'Ar-Rahmani ar-Raheem' },
  { num: 4, ar: 'مَالِكِ يَوْمِ الدِّينِ', fr: 'Maitre du Jour de la retribution.', ph: 'Maliki yawmi ad-deen' },
  { num: 5, ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', fr: "C'est Toi [Seul] que nous adorons, et c'est Toi [Seul] dont nous implorons secours.", ph: "Iyyaka na'budu wa iyyaka nasta'een" },
  { num: 6, ar: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', fr: 'Guide-nous dans le droit chemin.', ph: 'Ihdina as-sirat al-mustaqeem' },
  { num: 7, ar: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', fr: "Le chemin de ceux que Tu as combles de faveurs, non pas de ceux qui ont encouru Ta colere, ni des egares.", ph: "Sirat allatheena an'amta 'alayhim ghayril maghdoobi 'alayhim wa lad-daalleen" },
];

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

// Islamic events for Calendar card
const ISLAMIC_EVENTS_MINI = [
  { hijriMonth: 1, hijriDay: 1, name: 'Nouvel An Hijri', type: 'celebration' },
  { hijriMonth: 1, hijriDay: 10, name: 'Achoura', type: 'mourning' },
  { hijriMonth: 3, hijriDay: 12, name: 'Mawlid an-Nabi', type: 'celebration' },
  { hijriMonth: 7, hijriDay: 27, name: "Isra et Mi'raj", type: 'special' },
  { hijriMonth: 8, hijriDay: 15, name: 'Nuit du Doute', type: 'special' },
  { hijriMonth: 9, hijriDay: 1, name: 'Debut Ramadan', type: 'celebration' },
  { hijriMonth: 9, hijriDay: 19, name: 'Blessure Imam Ali', type: 'mourning' },
  { hijriMonth: 9, hijriDay: 21, name: 'Martyre Imam Ali', type: 'mourning' },
  { hijriMonth: 9, hijriDay: 27, name: 'Laylat al-Qadr', type: 'special' },
  { hijriMonth: 10, hijriDay: 1, name: 'Eid al-Fitr', type: 'celebration' },
  { hijriMonth: 12, hijriDay: 10, name: 'Eid al-Adha', type: 'celebration' },
  { hijriMonth: 12, hijriDay: 18, name: 'Eid al-Ghadir', type: 'celebration' },
];

const HomeScreen = ({ onNavigate }: { onNavigate: (s: ScreenName) => void }) => {
  const { colors, toggleTheme, isDark } = useTheme();
  const { streak, lastRead, settings } = useSettings();
  const ramadanInfo = getRamadanInfo();

  // Utiliser le hook temps réel pour les horaires de prière
  const { nextPrayer, countdown, currentTime } = usePrayerTimesRealtime(
    settings.latitude || DEFAULT_LATITUDE,
    settings.longitude || DEFAULT_LONGITUDE,
    settings.timezone || DEFAULT_TIMEZONE
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

  // Next Islamic event calculation
  const nextEvent = useMemo(() => {
    try {
      const today = moment();
      const currentHijriMonth = today.iMonth() + 1;
      const currentHijriDay = today.iDate();

      // Find next event - simplified calculation
      let nextEvt = null;
      let minDays = 366;

      for (const evt of ISLAMIC_EVENTS_MINI) {
        let daysUntil = 0;

        // Simple calculation: if event is later this month or in future months
        if (evt.hijriMonth > currentHijriMonth) {
          daysUntil = (evt.hijriMonth - currentHijriMonth) * 30 + evt.hijriDay - currentHijriDay;
        } else if (evt.hijriMonth === currentHijriMonth && evt.hijriDay >= currentHijriDay) {
          daysUntil = evt.hijriDay - currentHijriDay;
        } else {
          // Event passed this year, calculate for next year
          daysUntil = (12 - currentHijriMonth + evt.hijriMonth) * 30 + evt.hijriDay - currentHijriDay;
        }

        if (daysUntil >= 0 && daysUntil < minDays) {
          minDays = daysUntil;
          nextEvt = { ...evt, daysUntil };
        }
      }

      return nextEvt;
    } catch (e) {
      return null;
    }
  }, []);

  // Week days for calendar card
  const weekDays = useMemo(() => {
    try {
      const days = [];
      const today = moment();
      const todayHijriDay = today.iDate();

      for (let i = 0; i < 7; i++) {
        const day = today.clone().add(i - today.day(), 'days');
        const hijriDay = day.iDate();
        days.push({
          dayName: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][i],
          hijriDay: hijriDay,
          isToday: i === today.day(),
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

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={colors.backgroundGradient} style={StyleSheet.absoluteFill} />

      <View style={styles.screenContent}>
        {/* Header */}
        <FadeInView delay={100} style={styles.header}>
          <View>
            <Text style={[styles.appTitle, { color: colors.text }]}>Barakaah</Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>{settings.city} - {currentTime}</Text>
          </View>
          <PressableScale onPress={toggleTheme}>
            <View style={[styles.themeBtn, { backgroundColor: colors.surface }]}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.primary} />
            </View>
          </PressableScale>
        </FadeInView>

        {/* Prayer Card - Dynamique */}
        {nextPrayer && (
          <FadeInView delay={200}>
            <PressableScale onPress={() => onNavigate('prieres')}>
              <LinearGradient colors={colors.prayerCardGradient} style={styles.prayerCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.prayerCardContent}>
                  <View style={styles.prayerCardHeader}>
                    <PulseView>
                      <View style={styles.prayerIconCircle}>
                        <Ionicons name={nextPrayer.icon as any} size={24} color="#FFF" />
                      </View>
                    </PulseView>
                    <Text style={styles.prayerLabel}>PROCHAINE PRIERE</Text>
                  </View>
                  <Text style={styles.prayerName}>{nextPrayer.name}</Text>
                  <Text style={styles.prayerNameAr}>{nextPrayer.ar}</Text>
                  <Text style={styles.prayerTime}>{nextPrayer.time}</Text>
                  <Text style={styles.countdown}>{prayerCountdownStr}</Text>
                </View>
              </LinearGradient>
            </PressableScale>
          </FadeInView>
        )}

        {/* Streak Card */}
        <FadeInView delay={300}>
          <GlassCard colors={colors} style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <View style={styles.streakFlame}>
                <Text style={styles.flameEmoji}>🔥</Text>
                <Text style={[styles.streakNumber, { color: colors.text }]}>{streak.currentStreak}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.streakTitle, { color: colors.text }]}>Chaine de lecture</Text>
                <Text style={[styles.streakSubtitle, { color: colors.textSecondary }]}>
                  {streak.todayVersesRead}/{streak.dailyGoal} versets aujourd'hui
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (streak.todayVersesRead / streak.dailyGoal) * 100)}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            </View>
            <View style={styles.streakStats}>
              <View style={styles.streakStat}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{streak.longestStreak}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Record</Text>
              </View>
              <View style={styles.streakStat}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{streak.totalDaysRead}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Jours total</Text>
              </View>
            </View>
          </GlassCard>
        </FadeInView>

        {/* Last Read Card */}
        {lastRead && (
          <FadeInView delay={350}>
            <PressableScale onPress={() => onNavigate('coran')}>
              <GlassCard colors={colors} style={styles.lastReadCard}>
                <View style={[styles.lastReadIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="book" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lastReadTitle, { color: colors.text }]}>Derniere lecture</Text>
                  <Text style={[styles.lastReadText, { color: colors.textSecondary }]}>
                    {lastRead.surahName} - Verset {lastRead.verseNumber}
                  </Text>
                  <Text style={[styles.lastReadTime, { color: colors.textMuted }]}>
                    {getTimeAgo(lastRead.timestamp)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
              </GlassCard>
            </PressableScale>
          </FadeInView>
        )}

        {/* Ramadan Card - Affichee si pendant le Ramadan */}
        {ramadanInfo.status === 'during' && (
          <FadeInView delay={380}>
            <PressableScale onPress={() => onNavigate('ramadan')}>
              <LinearGradient
                colors={RamadanColors.cardGradient}
                style={styles.ramadanHomeCard}
              >
                <View style={styles.ramadanHomeContent}>
                  <View style={styles.ramadanHomeHeader}>
                    <Text style={styles.ramadanHomeEmoji}>🌙</Text>
                    <View>
                      <Text style={styles.ramadanHomeTitle}>RAMADAN</Text>
                      <Text style={styles.ramadanHomeDay}>Jour {ramadanInfo.ramadanDay}/{RAMADAN_DAYS}</Text>
                    </View>
                  </View>
                  <View style={styles.ramadanHomeCountdown}>
                    <Text style={styles.ramadanHomeLabel}>Iftar dans</Text>
                    <Text style={styles.ramadanHomeTime}>
                      {iftarCountdown.h.toString().padStart(2, '0')}:
                      {iftarCountdown.m.toString().padStart(2, '0')}:
                      {iftarCountdown.s.toString().padStart(2, '0')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </PressableScale>
          </FadeInView>
        )}

        {/* Ramadan Countdown Card - Affichee si avant Ramadan */}
        {(ramadanInfo.status === 'before' || ramadanInfo.status === 'after') && (
          <FadeInView delay={380}>
            <PressableScale onPress={() => onNavigate('ramadan')}>
              <LinearGradient
                colors={['#4C1D95', '#6D28D9']}
                style={styles.ramadanHomeCard}
              >
                <View style={styles.ramadanHomeContent}>
                  <Text style={styles.ramadanHomeEmoji}>🌙</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ramadanHomeTitle}>RAMADAN {ramadanInfo.hijriYear}</Text>
                    <Text style={styles.ramadanHomeDay}>
                      Dans {ramadanInfo.daysUntilRamadan} jours
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </PressableScale>
          </FadeInView>
        )}

        {/* Date Card */}
        <FadeInView delay={400}>
          <GlassCard colors={colors} style={styles.dateCard}>
            <View style={[styles.dateIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={[styles.hijriText, { color: colors.secondary }]}>
                {ramadanInfo.hijriDay} {ramadanInfo.hijriMonthName} {ramadanInfo.hijriYear}
              </Text>
            </View>
          </GlassCard>
        </FadeInView>

        {/* Qibla Card */}
        <FadeInView delay={420}>
          <PressableScale onPress={() => onNavigate('qibla')}>
            <LinearGradient
              colors={['#0891B2', '#06B6D4']}
              style={styles.qiblaHomeCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.qiblaHomeContent}>
                <View style={styles.qiblaHomeLeft}>
                  <View style={styles.qiblaHomeMiniCompass}>
                    <View style={[styles.qiblaHomeNeedle, { transform: [{ rotate: `${qiblaData.angle}deg` }] }]}>
                      <View style={styles.qiblaHomeNeedleArrow} />
                    </View>
                    <Text style={styles.qiblaHomeKaaba}>🕋</Text>
                  </View>
                </View>
                <View style={styles.qiblaHomeRight}>
                  <Text style={styles.qiblaHomeLabel}>DIRECTION QIBLA</Text>
                  <Text style={styles.qiblaHomeAngle}>{qiblaData.angle}°</Text>
                  <Text style={styles.qiblaHomeDistance}>{qiblaData.distance.toLocaleString()} km</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </PressableScale>
        </FadeInView>

        {/* Calendar Card */}
        <FadeInView delay={440}>
          <PressableScale onPress={() => onNavigate('calendrier')}>
            <GlassCard colors={colors} style={styles.calendarHomeCard}>
              <View style={styles.calendarHomeHeader}>
                <View style={[styles.calendarHomeIcon, { backgroundColor: colors.secondary + '20' }]}>
                  <Ionicons name="calendar" size={20} color={colors.secondary} />
                </View>
                <Text style={[styles.calendarHomeTitle, { color: colors.text }]}>Calendrier Hijri</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>

              {/* Mini Week View */}
              <View style={styles.calendarHomeWeek}>
                {weekDays.map((day, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.calendarHomeDay,
                      day.isToday && { backgroundColor: colors.primary }
                    ]}
                  >
                    <Text style={[
                      styles.calendarHomeDayName,
                      { color: day.isToday ? '#FFF' : colors.textMuted }
                    ]}>
                      {day.dayName}
                    </Text>
                    <Text style={[
                      styles.calendarHomeDayNum,
                      { color: day.isToday ? '#FFF' : colors.text }
                    ]}>
                      {day.hijriDay}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Next Event */}
              {nextEvent && (
                <View style={[styles.calendarHomeEvent, { backgroundColor: colors.primary + '10' }]}>
                  <View style={[
                    styles.calendarHomeEventDot,
                    { backgroundColor: nextEvent.type === 'mourning' ? '#EF4444' :
                                       nextEvent.type === 'celebration' ? '#10B981' : '#F59E0B' }
                  ]} />
                  <Text style={[styles.calendarHomeEventText, { color: colors.text }]}>
                    {nextEvent.name}
                  </Text>
                  <Text style={[styles.calendarHomeEventDays, { color: colors.primary }]}>
                    {nextEvent.daysUntil === 0 ? "Aujourd'hui" : `Dans ${nextEvent.daysUntil}j`}
                  </Text>
                </View>
              )}
            </GlassCard>
          </PressableScale>
        </FadeInView>

        {/* Verse Card */}
        <FadeInView delay={450}>
          <GlassCard colors={colors} style={styles.verseCard}>
            <View style={styles.verseTitleRow}>
              <Ionicons name="sparkles" size={16} color={colors.secondary} />
              <Text style={[styles.verseTitle, { color: colors.secondary }]}> VERSET DU JOUR </Text>
              <Ionicons name="sparkles" size={16} color={colors.secondary} />
            </View>
            <View style={[styles.verseLine, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.verseArabic, { color: colors.text }]}>وَإِلَى اللَّهِ الْمَصِيرُ</Text>
            <View style={[styles.verseLine, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.verseTranslation, { color: colors.textSecondary }]}>
              "Et c'est vers Allah que se fait le retour final."
            </Text>
            <Text style={[styles.verseRef, { color: colors.textMuted }]}>Sourate Al-Baqarah (2:285)</Text>
          </GlassCard>
        </FadeInView>

        {/* Quick Access */}
        <FadeInView delay={500}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Acces rapides</Text>
        </FadeInView>

        <View style={styles.quickGrid}>
          {[
            { name: 'coran' as ScreenName, label: 'Coran', icon: 'book-outline', gradient: ['#059669', '#047857'] as const },
            { name: 'prieres' as ScreenName, label: 'Prieres', icon: 'compass-outline', gradient: ['#3B82F6', '#2563EB'] as const },
            { name: 'ramadan' as ScreenName, label: 'Ramadan', icon: 'moon-outline', gradient: ['#8B5CF6', '#7C3AED'] as const },
            { name: 'dua' as ScreenName, label: 'Dua', icon: 'hand-right-outline', gradient: ['#F59E0B', '#D97706'] as const },
          ].map((item, i) => (
            <FadeInView key={item.name} delay={550 + i * 50} style={styles.quickCardWrapper}>
              <PressableScale onPress={() => onNavigate(item.name)}>
                <LinearGradient colors={item.gradient} style={styles.quickCard}>
                  <Ionicons name={item.icon as any} size={36} color="#FFF" />
                  <Text style={styles.quickLabel}>{item.label}</Text>
                </LinearGradient>
              </PressableScale>
            </FadeInView>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
};

// ===== CORAN SCREEN =====
const CoranScreen = () => {
  const { colors } = useTheme();
  const { settings, bookmarks, addBookmark, removeBookmark, updateStreak, updateLastRead } = useSettings();
  const navigation = useNavigation();

  const [currentSurah, setCurrentSurah] = useState(SURAHS[0]);
  const [showSurahModal, setShowSurahModal] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkColor, setBookmarkColor] = useState(BOOKMARK_COLORS[0]);

  // Audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioVerse, setCurrentAudioVerse] = useState(1);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    updateLastRead({
      surahNumber: currentSurah.number,
      surahName: currentSurah.name,
      verseNumber: 1,
    });
  }, [currentSurah]);

  const playVerse = async (verseNum: number) => {
    try {
      if (sound) await sound.unloadAsync();

      const surahStr = currentSurah.number.toString().padStart(3, '0');
      const verseStr = verseNum.toString().padStart(3, '0');
      const url = `https://server.mp3quran.net/${settings.defaultReciter}/${surahStr}${verseStr}.mp3`;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate: settings.audioSpeed }
      );

      setSound(newSound);
      setIsPlaying(true);
      setCurrentAudioVerse(verseNum);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.durationMillis) {
            setAudioProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            if (verseNum < FATIHA_VERSES.length) {
              playVerse(verseNum + 1);
            } else {
              setIsPlaying(false);
            }
          }
        }
      });

      updateStreak(1);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'audio');
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      playVerse(currentAudioVerse);
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const isBookmarked = (verseNum: number) => {
    return bookmarks.some(b => b.surahNumber === currentSurah.number && b.verseNumber === verseNum);
  };

  const getBookmark = (verseNum: number) => {
    return bookmarks.find(b => b.surahNumber === currentSurah.number && b.verseNumber === verseNum);
  };

  const handleBookmarkPress = (verseNum: number) => {
    const existing = getBookmark(verseNum);
    if (existing) {
      removeBookmark(existing.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setSelectedVerse(verseNum);
      setBookmarkNote('');
      setBookmarkColor(BOOKMARK_COLORS[0]);
      setShowBookmarkModal(true);
    }
  };

  const saveBookmark = () => {
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
  };

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

  const Toggle = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <PressableScale onPress={onPress} style={{ width: 105 }}>
      <LinearGradient
        colors={active ? [colors.primary, colors.primaryDark] : [colors.surface, colors.surface]}
        style={[styles.toggleBtn, { borderColor: active ? colors.primary : colors.border, width: '100%' }]}
      >
        <Text style={{ color: active ? '#FFF' : colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
      </LinearGradient>
    </PressableScale>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.backgroundGradient} style={StyleSheet.absoluteFill} />

      <CustomHeader
        title="Coran"
        showBackButton={navigation.canGoBack}
        onBack={handleGoBack}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.screenContentWithHeader}>
          <FadeInView delay={100}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Sourate</Text>
            <PressableScale onPress={() => setShowSurahModal(true)}>
              <GlassCard colors={colors} style={styles.surahSelector}>
                <View>
                  <Text style={[styles.surahName, { color: colors.text }]}>{currentSurah.name}</Text>
                  <Text style={[styles.surahNameAr, { color: colors.primary }]}>{currentSurah.nameAr}</Text>
                </View>
                <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
              </GlassCard>
            </PressableScale>
            <Text style={[styles.surahInfo, { color: colors.textSecondary }]}>
              {currentSurah.versesCount} versets - {currentSurah.type}
            </Text>
          </FadeInView>

          <FadeInView delay={200} style={styles.toggleRow}>
            <Toggle label="Arabe" active={settings.showTranslation || true} onPress={() => {}} />
            <Toggle label="Français" active={settings.showTranslation} onPress={() => {}} />
            <Toggle label="Phonétique" active={settings.showPhonetic} onPress={() => {}} />
          </FadeInView>

          {FATIHA_VERSES.map((v, i) => {
            const bookmarked = isBookmarked(v.num);
            const bookmark = getBookmark(v.num);

            return (
              <FadeInView key={v.num} delay={300 + i * 50}>
                <GlassCard
                  colors={colors}
                  style={[
                    styles.verseItemCard,
                    bookmarked && { borderLeftWidth: 4, borderLeftColor: bookmark?.color }
                  ]}
                >
                  <View style={styles.verseHeader}>
                    <View style={[styles.verseBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.verseNumText}>{v.num}</Text>
                    </View>
                    <PressableScale onPress={() => handleBookmarkPress(v.num)}>
                      <Ionicons
                        name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={24}
                        color={bookmarked ? bookmark?.color : colors.textMuted}
                      />
                    </PressableScale>
                  </View>

                  <Text style={[styles.verseArabicText, { color: colors.text, fontSize: settings.arabicFontSize }]}>
                    {v.ar}
                  </Text>
                  {settings.showTranslation && (
                    <Text style={[styles.verseFrenchText, { color: colors.textSecondary }]}>{v.fr}</Text>
                  )}
                  {settings.showPhonetic && (
                    <Text style={[styles.versePhoneticText, { color: colors.textMuted }]}>{v.ph}</Text>
                  )}

                  <View style={styles.verseActions}>
                    <PressableScale onPress={() => playVerse(v.num)}>
                      <View style={[styles.playBtn, { backgroundColor: currentAudioVerse === v.num && isPlaying ? colors.primary : colors.primary + '20' }]}>
                        <Ionicons
                          name={currentAudioVerse === v.num && isPlaying ? 'pause' : 'play'}
                          size={20}
                          color={currentAudioVerse === v.num && isPlaying ? '#FFF' : colors.primary}
                        />
                      </View>
                    </PressableScale>
                    <PressableScale>
                      <Ionicons name="heart-outline" size={22} color={colors.textMuted} />
                    </PressableScale>
                    <PressableScale>
                      <Ionicons name="share-outline" size={22} color={colors.textMuted} />
                    </PressableScale>
                  </View>
                </GlassCard>
              </FadeInView>
            );
          })}

          <View style={{ height: 180 }} />
        </View>
      </ScrollView>

      {/* Audio Player Bar */}
      <View style={[styles.audioBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.audioProgress}>
          <View style={[styles.audioProgressFill, { width: `${audioProgress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.audioControls}>
          <PressableScale onPress={() => currentAudioVerse > 1 && playVerse(currentAudioVerse - 1)}>
            <Ionicons name="play-skip-back" size={28} color={colors.text} />
          </PressableScale>
          <PressableScale onPress={togglePlayPause}>
            <View style={[styles.mainPlayBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#FFF" />
            </View>
          </PressableScale>
          <PressableScale onPress={() => currentAudioVerse < FATIHA_VERSES.length && playVerse(currentAudioVerse + 1)}>
            <Ionicons name="play-skip-forward" size={28} color={colors.text} />
          </PressableScale>
        </View>
        <Text style={[styles.audioVerseText, { color: colors.textSecondary }]}>
          Verset {currentAudioVerse} / {FATIHA_VERSES.length}
        </Text>
      </View>

      {/* Surah Modal */}
      <Modal visible={showSurahModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choisir une sourate</Text>
              <PressableScale onPress={() => setShowSurahModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </PressableScale>
            </View>
            <FlatList
              data={SURAHS}
              keyExtractor={item => item.number.toString()}
              renderItem={({ item }) => (
                <PressableScale onPress={() => { setCurrentSurah(item); setShowSurahModal(false); }}>
                  <View style={[styles.surahItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.surahNum, { backgroundColor: colors.primary }]}>
                      <Text style={styles.surahNumText}>{item.number}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.surahItemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.surahItemInfo, { color: colors.textSecondary }]}>
                        {item.versesCount} versets
                      </Text>
                    </View>
                    <Text style={[styles.surahItemAr, { color: colors.primary }]}>{item.nameAr}</Text>
                  </View>
                </PressableScale>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Bookmark Modal */}
      <Modal visible={showBookmarkModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
    </View>
  );
};

// ===== PRIERES SCREEN =====
const PrieresScreen = () => {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const navigation = useNavigation();

  // Utiliser le hook temps réel pour les horaires de prière
  const { prayers, nextPrayer, countdown, currentTime } = usePrayerTimesRealtime(
    settings.latitude || DEFAULT_LATITUDE,
    settings.longitude || DEFAULT_LONGITUDE,
    settings.timezone || DEFAULT_TIMEZONE
  );

  // Date du jour formatée
  const todayDate = momentTz().tz(settings.timezone || DEFAULT_TIMEZONE);
  const formattedDate = todayDate.format('dddd D MMMM YYYY');

  // Formater countdown
  const fmt = (n: number) => n.toString().padStart(2, '0');
  const countdownStr = `Dans ${fmt(countdown.h)}h ${fmt(countdown.m)}min ${fmt(countdown.s)}s`;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.backgroundGradient} style={StyleSheet.absoluteFill} />

      <CustomHeader
        title="Prières"
        showBackButton={navigation.canGoBack}
        onBack={navigation.goBack}
        rightIcon="settings-outline"
        onRightPress={() => {}}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.screenContentWithHeader}>
          <FadeInView delay={100} style={styles.locationHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.cityName, { color: colors.text }]}>{settings.city}, {settings.country}</Text>
          </View>
          <View style={[styles.settingsBtn, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{currentTime}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={150}>
          <Text style={[styles.dateSubtext, { color: colors.textSecondary }]}>{formattedDate}</Text>
        </FadeInView>

        {nextPrayer && (
          <FadeInView delay={200}>
            <LinearGradient colors={colors.prayerCardGradient} style={styles.prayerCard}>
              <View style={styles.prayerCardContent}>
                <View style={styles.prayerCardHeader}>
                  <PulseView>
                    <View style={styles.prayerIconCircle}>
                      <Ionicons name={nextPrayer.icon as any} size={24} color="#FFF" />
                    </View>
                  </PulseView>
                  <Text style={styles.prayerLabel}>PROCHAINE PRIERE</Text>
                </View>
                <Text style={styles.prayerName}>{nextPrayer.name}</Text>
                <Text style={styles.prayerNameAr}>{nextPrayer.ar}</Text>
                <Text style={styles.prayerTime}>{nextPrayer.time}</Text>
                <Text style={styles.countdown}>{countdownStr}</Text>
              </View>
            </LinearGradient>
          </FadeInView>
        )}

        <FadeInView delay={300}>
          <View style={styles.prayerListHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>Horaires du jour</Text>
            <Text style={[styles.methodBadge, { color: colors.primary, backgroundColor: colors.primary + '20' }]}>
              Methode {settings.calculationMethod}
            </Text>
          </View>
        </FadeInView>

        {prayers.map((p, i) => (
          <FadeInView key={p.name} delay={400 + i * 100}>
            <GlassCard colors={colors} style={[
              styles.prayerRow,
              p.isNext && { borderWidth: 2, borderColor: colors.primary },
              p.passed && { opacity: 0.5 }
            ]}>
              <View style={[styles.prayerIconBox, { backgroundColor: p.isNext ? colors.primary : colors.primary + '20' }]}>
                <Ionicons name={p.icon as any} size={22} color={p.isNext ? '#FFF' : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.prayerRowName, { color: colors.text }]}>{p.name}</Text>
                <Text style={{ color: colors.textSecondary }}>{p.ar}</Text>
              </View>
              {p.isNext && (
                <View style={[styles.nextBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.nextBadgeText}>SUIVANTE</Text>
                </View>
              )}
              {p.passed && <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 10 }} />}
              <Text style={[styles.prayerRowTime, { color: p.isNext ? colors.primary : colors.text }]}>{p.time}</Text>
            </GlassCard>
          </FadeInView>
        ))}

        <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    </View>
  );
};

// ===== SETTINGS SCREEN =====
const SettingsScreen = () => {
  const { colors } = useTheme();
  const { settings, updateSettings, bookmarks } = useSettings();
  const navigation = useNavigation();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
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
    <FadeInView style={styles.settingsSection}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
        <Text style={[styles.sectionHeaderText, { color: colors.text }]}>{title}</Text>
      </View>
      <GlassCard colors={colors} style={styles.sectionContent}>
        {children}
      </GlassCard>
    </FadeInView>
  );

  const SettingRow = ({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) => (
    <PressableScale onPress={onPress} disabled={!onPress}>
      <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.settingLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginLeft: 12 }}>
          {value && <Text style={[styles.settingValue, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{value}</Text>}
          {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 6, flexShrink: 0 }} />}
        </View>
      </View>
    </PressableScale>
  );

  const SettingToggle = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.backgroundGradient} style={StyleSheet.absoluteFill} />

      <CustomHeader
        title="Paramètres"
        showBackButton={navigation.canGoBack}
        onBack={navigation.goBack}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.screenContentWithHeader}>

        <Section title="LOCALISATION" icon="location-outline">
          <SettingRow
            label="Ville"
            value={`${settings.city}, ${settings.country}`}
            onPress={() => setShowLocationModal(true)}
          />
        </Section>

        <Section title="HORAIRES DE PRIERE" icon="time-outline">
          <SettingRow label="Methode de calcul" value={settings.calculationMethod} onPress={() => {}} />
          <View style={styles.adjustmentsGrid}>
            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
              <View key={prayer} style={styles.adjustmentRow}>
                <Text style={[styles.adjustmentLabel, { color: colors.text }]}>{prayer}</Text>
                <View style={styles.adjustmentBtns}>
                  {[-5, 0, 5].map(adj => (
                    <PressableScale
                      key={adj}
                      onPress={() => updateSettings({
                        prayerAdjustments: { ...settings.prayerAdjustments, [prayer]: adj }
                      })}
                    >
                      <View style={[
                        styles.adjustBtn,
                        {
                          backgroundColor: settings.prayerAdjustments[prayer] === adj ? colors.primary : colors.background,
                          borderColor: colors.border
                        }
                      ]}>
                        <Text style={{
                          color: settings.prayerAdjustments[prayer] === adj ? '#FFF' : colors.text,
                          fontSize: 12
                        }}>
                          {adj > 0 ? `+${adj}` : adj}
                        </Text>
                      </View>
                    </PressableScale>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="NOTIFICATIONS" icon="notifications-outline">
          <SettingToggle
            label="Activer les notifications"
            value={settings.notificationsEnabled}
            onToggle={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
          />
          <View style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 10 }]}>Rappel avant prière</Text>
            <View style={styles.minutesSelector}>
              {[5, 10, 15].map(min => (
                <PressableScale
                  key={min}
                  onPress={() => updateSettings({ notificationMinutes: min })}
                  style={{ flex: 1 }}
                >
                  <View style={[
                    styles.minuteBtn,
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
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
            <View style={styles.themePicker}>
              {(['light', 'dark', 'auto'] as const).map(mode => (
                <PressableScale key={mode} onPress={() => updateSettings({ themeMode: mode })}>
                  <View style={[
                    styles.themeModeBtn,
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
          <View style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Taille texte arabe</Text>
              <Text style={[styles.settingValue, { color: colors.primary }]}>{settings.arabicFontSize}px</Text>
            </View>
            <View style={styles.sliderRow}>
              <Text style={{ color: colors.textMuted }}>A</Text>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((settings.arabicFontSize - 16) / 24) * 100}%`, backgroundColor: colors.primary }]} />
                <View style={styles.sliderBtns}>
                  {[16, 20, 24, 28, 32, 36, 40].map(size => (
                    <PressableScale key={size} onPress={() => updateSettings({ arabicFontSize: size })}>
                      <View style={[styles.sliderDot, settings.arabicFontSize === size && { backgroundColor: colors.primary }]} />
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
            label="Afficher traduction francaise"
            value={settings.showTranslation}
            onToggle={() => updateSettings({ showTranslation: !settings.showTranslation })}
          />
          <SettingToggle
            label="Afficher phonetique"
            value={settings.showPhonetic}
            onToggle={() => updateSettings({ showPhonetic: !settings.showPhonetic })}
          />
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
        </Section>

        <Section title="RAMADAN" icon="moon-outline">
          <View style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Objectif quotidien (versets)</Text>
              <Text style={[styles.settingValue, { color: colors.primary }]}>{settings.ramadanDailyGoal}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                {[5, 10, 20, 30, 50, 100, 200].map(goal => (
                  <PressableScale key={goal} onPress={() => updateSettings({ ramadanDailyGoal: goal })}>
                    <View style={[
                      styles.goalBtn,
                      {
                        backgroundColor: settings.ramadanDailyGoal === goal ? colors.primary : colors.background,
                        borderColor: colors.border
                      }
                    ]}>
                      <Text style={{ color: settings.ramadanDailyGoal === goal ? '#FFF' : colors.text, fontSize: 13, fontWeight: '600' }}>
                        {goal}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
            </ScrollView>
          </View>
          <SettingToggle
            label="Notifications Ramadan"
            value={settings.ramadanNotifications}
            onToggle={() => updateSettings({ ramadanNotifications: !settings.ramadanNotifications })}
          />
          <View style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 10 }]}>Rappel avant Iftar</Text>
            <View style={styles.minutesSelector}>
              {[5, 10, 15, 30].map(min => (
                <PressableScale key={min} onPress={() => updateSettings({ ramadanIftarReminder: min })} style={{ flex: 1 }}>
                  <View style={[
                    styles.minuteBtn,
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
            label="À propos de Barakaah"
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
      </ScrollView>
    </View>
  );
};

// ===== RAMADAN SCREEN =====
const RamadanScreen = () => {
  const { colors } = useTheme();
  const { settings, streak, updateStreak } = useSettings();
  const navigation = useNavigation();

  const [ramadanInfo, setRamadanInfo] = useState<RamadanInfo>(getRamadanInfo());
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isIftarTime, setIsIftarTime] = useState(false);
  const [currentDuaIndex, setCurrentDuaIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalText, setJournalText] = useState('');
  const [ramadanProgress, setRamadanProgress] = useState<RamadanProgressData | null>(null);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const starAnim = useRef(new Animated.Value(0)).current;

  // Horaires de priere pour le calcul (simulation - a remplacer par vraie API)
  const prayerTimes = {
    fajr: '05:30',
    maghrib: '19:45',
  };

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

  // Countdown timer
  useEffect(() => {
    if (ramadanInfo.status !== 'during') return;

    const updateCountdown = () => {
      const now = new Date();
      const [mH, mM] = prayerTimes.maghrib.split(':').map(Number);
      const iftarTime = new Date();
      iftarTime.setHours(mH, mM, 0, 0);

      const diff = iftarTime.getTime() - now.getTime();

      if (diff <= 0) {
        setIsIftarTime(true);
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        setIsIftarTime(false);
        const totalSec = Math.floor(diff / 1000);
        setCountdown({
          hours: Math.floor(totalSec / 3600),
          minutes: Math.floor((totalSec % 3600) / 60),
          seconds: totalSec % 60,
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ramadanInfo.status]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const progressPercentage = ramadanProgress
    ? Math.min(100, (ramadanProgress.totalVersesRead / TOTAL_QURAN_VERSES) * 100)
    : 0;

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
          {/* Card Countdown Iftar */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={isIftarTime ? ['#22C55E', '#16A34A'] : RamadanColors.iftarGradient}
              style={ramadanStyles.iftarCard}
            >
              {isIftarTime ? (
                <View style={ramadanStyles.iftarContent}>
                  <Text style={ramadanStyles.iftarLabel}>C'EST L'HEURE DE L'IFTAR !</Text>
                  <Text style={ramadanStyles.iftarEmoji}>🌙</Text>
                  <Text style={ramadanStyles.iftarBlessings}>Bon Iftar !</Text>
                </View>
              ) : (
                <View style={ramadanStyles.iftarContent}>
                  <Text style={ramadanStyles.iftarLabel}>IFTAR (FTOUR) DANS</Text>
                  <Text style={ramadanStyles.iftarCountdown}>
                    {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
                  </Text>
                  <View style={ramadanStyles.iftarTimeRow}>
                    <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={ramadanStyles.iftarTime}>
                      {prayerTimes.maghrib} - {settings.city}
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
                const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                setCurrentDuaIndex(index);
              }}
            >
              {IFTAR_DUAS.map((dua, index) => (
                <View key={dua.id} style={[ramadanStyles.duaSlide, { width: SCREEN_WIDTH - 40 }]}>
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
              <Text style={ramadanStyles.suhoorTime}>{prayerTimes.fajr}</Text>
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
                  {streak.todayVersesRead}/{settings.ramadanDailyGoal}
                </Text>
                <Text style={ramadanStyles.trackerStatLabel}>aujourd'hui</Text>
              </View>
            </View>

            {/* Mini graphique */}
            <View style={ramadanStyles.miniChart}>
              {[...Array(7)].map((_, i) => {
                const height = Math.random() * 100;
                const isToday = i === 6;
                return (
                  <View key={i} style={ramadanStyles.chartBarContainer}>
                    <View
                      style={[
                        ramadanStyles.chartBar,
                        {
                          height: `${height}%`,
                          backgroundColor: isToday
                            ? RamadanColors.secondary
                            : height > 50
                            ? '#22C55E'
                            : '#6B7280',
                        },
                      ]}
                    />
                    <Text style={ramadanStyles.chartDay}>
                      {isToday ? 'Auj' : `J${ramadanInfo.ramadanDay! - 6 + i}`}
                    </Text>
                  </View>
                );
              })}
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

          {/* Section Videos */}
          <View style={ramadanStyles.videosSection}>
            <Text style={ramadanStyles.sectionTitle}>MES VIDEOS RAMADAN</Text>
            <View style={ramadanStyles.videosGrid}>
              <PressableScale style={ramadanStyles.videoCard}>
                <LinearGradient
                  colors={['#6D28D9', '#4C1D95']}
                  style={ramadanStyles.videoPlaceholder}
                >
                  <Ionicons name="hand-right" size={32} color="#FFF" />
                  <Text style={ramadanStyles.videoLabel}>Dua</Text>
                </LinearGradient>
              </PressableScale>
              <PressableScale style={ramadanStyles.videoCard}>
                <LinearGradient
                  colors={['#1E3A8A', '#1E1B4B']}
                  style={ramadanStyles.videoPlaceholder}
                >
                  <Ionicons name="moon" size={32} color="#FFF" />
                  <Text style={ramadanStyles.videoLabel}>Ramadan</Text>
                </LinearGradient>
              </PressableScale>
            </View>
            <Text style={ramadanStyles.videoHint}>
              Ajoutez vos videos dans assets/ramadan-videos/
            </Text>
          </View>

          {/* Boutons calendrier et journal */}
          <View style={ramadanStyles.actionsRow}>
            <PressableScale
              style={ramadanStyles.actionButton}
              onPress={() => setShowCalendarModal(true)}
            >
              <Ionicons name="calendar" size={24} color={RamadanColors.secondary} />
              <Text style={ramadanStyles.actionButtonText}>Calendrier</Text>
            </PressableScale>
            <PressableScale
              style={ramadanStyles.actionButton}
              onPress={() => setShowJournalModal(true)}
            >
              <Ionicons name="journal" size={24} color={RamadanColors.secondary} />
              <Text style={ramadanStyles.actionButtonText}>Journal</Text>
            </PressableScale>
          </View>

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

      {/* Modal Journal */}
      <Modal visible={showJournalModal} animationType="slide" transparent>
        <View style={ramadanStyles.modalOverlay}>
          <View style={ramadanStyles.modalContent}>
            <View style={ramadanStyles.modalHeader}>
              <Text style={ramadanStyles.modalTitle}>Journal Spirituel</Text>
              <PressableScale onPress={() => setShowJournalModal(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </PressableScale>
            </View>

            <View style={ramadanStyles.journalEntry}>
              <Text style={ramadanStyles.journalDate}>
                Jour {ramadanInfo.ramadanDay} - {new Date().toLocaleDateString('fr-FR')}
              </Text>
              <TextInput
                style={ramadanStyles.journalInput}
                placeholder="Ecrivez vos reflexions du jour..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                value={journalText}
                onChangeText={setJournalText}
              />

              <View style={ramadanStyles.journalStats}>
                <Ionicons name="book-outline" size={16} color={RamadanColors.secondary} />
                <Text style={ramadanStyles.journalStatsText}>
                  {streak.todayVersesRead} versets lus aujourd'hui
                </Text>
              </View>

              <PressableScale
                style={ramadanStyles.journalSaveBtn}
                onPress={async () => {
                  // Sauvegarder le journal
                  try {
                    const journalData = await AsyncStorage.getItem(STORAGE_KEYS.RAMADAN_JOURNAL);
                    const entries = journalData ? JSON.parse(journalData) : [];
                    const entry: RamadanJournalEntry = {
                      day: ramadanInfo.ramadanDay!,
                      date: new Date().toISOString(),
                      hijriDate: `${ramadanInfo.hijriDay} ${ramadanInfo.hijriMonthName}`,
                      notes: journalText,
                      versesRead: streak.todayVersesRead,
                      updatedAt: Date.now(),
                    };
                    // Mettre a jour ou ajouter
                    const existingIndex = entries.findIndex((e: RamadanJournalEntry) => e.day === entry.day);
                    if (existingIndex >= 0) {
                      entries[existingIndex] = entry;
                    } else {
                      entries.push(entry);
                    }
                    await AsyncStorage.setItem(STORAGE_KEYS.RAMADAN_JOURNAL, JSON.stringify(entries));
                    Alert.alert('Succes', 'Journal sauvegarde !');
                    setShowJournalModal(false);
                  } catch (error) {
                    Alert.alert('Erreur', 'Impossible de sauvegarder');
                  }
                }}
              >
                <Text style={ramadanStyles.journalSaveBtnText}>Sauvegarder</Text>
              </PressableScale>
            </View>
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
  // Videos
  videosSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: RamadanColors.secondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  videosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  videoCard: {
    flex: 1,
  },
  videoPlaceholder: {
    height: 100,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 8,
  },
  videoHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 8,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
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
  // Journal
  journalEntry: {
    flex: 1,
  },
  journalDate: {
    fontSize: 16,
    fontWeight: '600',
    color: RamadanColors.secondary,
    marginBottom: 16,
  },
  journalInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#FFF',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  journalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  journalStatsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
  },
  journalSaveBtn: {
    backgroundColor: RamadanColors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  journalSaveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
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
const TabBar = ({ current, onNav }: { current: ScreenName; onNav: (s: ScreenName) => void }) => {
  const { colors } = useTheme();

  const tabs: { name: ScreenName; icon: string; label: string }[] = [
    { name: 'home', icon: 'home-outline', label: 'Accueil' },
    { name: 'coran', icon: 'book-outline', label: 'Coran' },
    { name: 'prieres', icon: 'compass-outline', label: 'Prieres' },
    { name: 'ramadan', icon: 'moon-outline', label: 'Ramadan' },
    { name: 'dua', icon: 'hand-right-outline', label: 'Dua' },
    { name: 'settings', icon: 'settings-outline', label: 'Reglages' },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 10 }]}>
      {tabs.map(tab => {
        const focused = current === tab.name;
        return (
          <PressableScale key={tab.name} onPress={() => onNav(tab.name)} style={styles.tabBtn}>
            <Ionicons
              name={(focused ? tab.icon.replace('-outline', '') : tab.icon) as any}
              size={24}
              color={focused ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.textMuted }]}>{tab.label}</Text>
            {focused && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
          </PressableScale>
        );
      })}
    </View>
  );
};

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

  const handleTabNav = useCallback((newScreen: ScreenName) => {
    // When navigating via tab bar, reset history to just home and the new screen
    if (newScreen === 'home') {
      setNavigationHistory(['home']);
    } else {
      setNavigationHistory(['home', newScreen]);
    }
    setScreen(newScreen);
  }, []);

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
      case 'dua': return <DuaThemeProvider><DuaNavigator /></DuaThemeProvider>;
      case 'settings': return <SettingsScreen />;
      case 'qibla': return <QiblaScreen navigation={{ goBack }} isDark={isDark} />;
      case 'calendrier': return <CalendrierHijriScreen navigation={{ goBack }} isDark={isDark} />;
      case 'about': return <AboutScreen navigation={{ goBack }} isDark={isDark} />;
      case 'downloads': return <DownloadsScreen navigation={{ goBack }} isDark={isDark} />;
    }
  };

  return (
    <NavigationContext.Provider value={navigationContextValue}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>{renderScreen()}</View>
        <TabBar current={screen} onNav={handleTabNav} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaView>
    </NavigationContext.Provider>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <DuaProvider>
          <AppContent />
        </DuaProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  screenContent: { padding: 16, paddingTop: Platform.OS === 'android' ? 40 : 16 },
  screenContentWithHeader: { padding: 16, paddingTop: 12 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  appTitle: { fontSize: 24, fontWeight: '800' },
  appSubtitle: { fontSize: 13, marginTop: 2 },
  themeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },

  // Prayer Card
  prayerCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
  prayerCardContent: { alignItems: 'center' },
  prayerCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  prayerIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  prayerLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  prayerName: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  prayerNameAr: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 2 },
  prayerTime: { color: '#FFF', fontSize: 40, fontWeight: '800', marginVertical: 6 },
  countdown: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },

  // Streak Card
  streakCard: { marginBottom: 12 },
  streakHeader: { flexDirection: 'row', alignItems: 'center' },
  streakFlame: { alignItems: 'center' },
  flameEmoji: { fontSize: 40 },
  streakNumber: { fontSize: 24, fontWeight: '800', marginTop: -8 },
  streakTitle: { fontSize: 18, fontWeight: '700' },
  streakSubtitle: { fontSize: 14, marginTop: 4 },
  progressBar: { height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  streakStats: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  streakStat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },

  // Last Read Card
  lastReadCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  lastReadIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  lastReadTitle: { fontSize: 14, fontWeight: '600' },
  lastReadText: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  lastReadTime: { fontSize: 12, marginTop: 2 },

  // Glass Card
  glassCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },

  // Date Card
  dateCard: { flexDirection: 'row', alignItems: 'center' },
  dateIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dateText: { fontSize: 16, fontWeight: '600' },
  hijriText: { fontSize: 15, marginTop: 2, fontWeight: '500' },

  // Qibla Home Card
  qiblaHomeCard: { borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  qiblaHomeContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  qiblaHomeLeft: { marginRight: 16 },
  qiblaHomeMiniCompass: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  qiblaHomeNeedle: { position: 'absolute', width: 4, height: 28, alignItems: 'center' },
  qiblaHomeNeedleArrow: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FFF' },
  qiblaHomeKaaba: { fontSize: 20 },
  qiblaHomeRight: { flex: 1 },
  qiblaHomeLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  qiblaHomeAngle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 2 },
  qiblaHomeDistance: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },

  // Calendar Home Card
  calendarHomeCard: { paddingVertical: 12, paddingHorizontal: 16 },
  calendarHomeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  calendarHomeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  calendarHomeTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  calendarHomeWeek: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  calendarHomeDay: { width: 36, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calendarHomeDayName: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  calendarHomeDayNum: { fontSize: 14, fontWeight: '700' },
  calendarHomeEvent: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10 },
  calendarHomeEventDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  calendarHomeEventText: { flex: 1, fontSize: 13, fontWeight: '500' },
  calendarHomeEventDays: { fontSize: 12, fontWeight: '700' },

  // Ramadan Home Card
  ramadanHomeCard: { borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  ramadanHomeContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  ramadanHomeHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ramadanHomeEmoji: { fontSize: 32, marginRight: 12 },
  ramadanHomeTitle: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  ramadanHomeDay: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 2 },
  ramadanHomeCountdown: { alignItems: 'flex-end' },
  ramadanHomeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  ramadanHomeTime: { fontSize: 20, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'] as any },

  // Verse Card
  verseCard: { alignItems: 'center', paddingVertical: 24 },
  verseTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  verseTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  verseLine: { width: 60, height: 2, borderRadius: 1, marginVertical: 12 },
  verseArabic: { fontSize: 26, textAlign: 'center', lineHeight: 44 },
  verseTranslation: { fontSize: 15, textAlign: 'center', fontStyle: 'italic', lineHeight: 24, paddingHorizontal: 8, marginTop: 8 },
  verseRef: { fontSize: 13, marginTop: 12 },

  // Quick Grid
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 16 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickCardWrapper: { width: '48%', marginBottom: 12 },
  quickCard: { height: 100, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  quickLabel: { color: '#FFF', marginTop: 8, fontSize: 14, fontWeight: '600' },

  // Tab Bar - centrage parfait
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, height: Platform.OS === 'ios' ? 85 : 65, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8, paddingHorizontal: 0 },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: '500', textAlign: 'center' },
  tabIndicator: { position: 'absolute', bottom: Platform.OS === 'ios' ? 4 : 2, width: 4, height: 4, borderRadius: 2 },

  // Coran Screen
  screenTitle: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: Platform.OS === 'android' ? 0 : 40, letterSpacing: 1, textTransform: 'uppercase' },
  screenTitleLarge: { fontSize: 28, fontWeight: '800', marginBottom: 24, marginTop: Platform.OS === 'android' ? 0 : 40 },
  surahSelector: { marginTop: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  surahName: { fontSize: 24, fontWeight: '700' },
  surahNameAr: { fontSize: 20, marginTop: 2 },
  surahInfo: { textAlign: 'center', fontSize: 14, marginBottom: 20 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 24, paddingHorizontal: 16 },
  toggleBtn: { height: 44, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  verseItemCard: { paddingVertical: 20, marginBottom: 8 },
  verseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  verseBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  verseNumText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  verseArabicText: { textAlign: 'center', marginBottom: 16, lineHeight: 42 },
  verseFrenchText: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 12, paddingHorizontal: 8 },
  versePhoneticText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic', lineHeight: 20, marginBottom: 16 },
  verseActions: { flexDirection: 'row', justifyContent: 'center', gap: 24, alignItems: 'center' },
  playBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  // Audio Bar
  audioBar: { borderTopWidth: 1, paddingVertical: 12, paddingHorizontal: 20 },
  audioProgress: { height: 3, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  audioProgressFill: { height: '100%', borderRadius: 2 },
  audioControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32 },
  mainPlayBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  audioVerseText: { textAlign: 'center', marginTop: 8, fontSize: 12 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  surahItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  surahNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  surahNumText: { color: '#FFF', fontWeight: '700' },
  surahItemName: { fontSize: 16, fontWeight: '600' },
  surahItemInfo: { fontSize: 13, marginTop: 2 },
  surahItemAr: { fontSize: 18 },

  // Bookmark Modal
  bookmarkModal: { margin: 20, borderRadius: 20, padding: 24 },
  bookmarkVerse: { fontSize: 16, marginBottom: 20 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  colorLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  colorPicker: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  colorOption: { width: 40, height: 40, borderRadius: 20 },
  colorSelected: { borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },

  // Prieres Screen
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? 0 : 40 },
  cityName: { fontSize: 24, fontWeight: '700', marginLeft: 8 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dateSubtext: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  prayerListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  methodBadge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  prayerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8 },
  prayerIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  prayerRowName: { fontSize: 17, fontWeight: '600' },
  prayerRowTime: { fontSize: 22, fontWeight: '700' },
  nextBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 10 },
  nextBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Settings Screen
  settingsSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', marginLeft: 8, letterSpacing: 1 },
  sectionContent: { padding: 0 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  settingLabel: { fontSize: 15, flexShrink: 0 },
  settingValue: { fontSize: 14, flex: 1, textAlign: 'right' },
  adjustmentsGrid: { padding: 16 },
  adjustmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  adjustmentLabel: { fontSize: 14, width: 70 },
  adjustmentBtns: { flexDirection: 'row', gap: 8 },
  adjustBtn: { width: 44, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  minutesSelector: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  minuteBtn: { flex: 1, minWidth: 55, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  goalSelector: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  goalBtn: { width: 44, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  themePicker: { flexDirection: 'row', gap: 8 },
  themeModeBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sliderTrack: { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, position: 'relative' },
  sliderFill: { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2 },
  sliderBtns: { position: 'absolute', top: -8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  sliderDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.2)' },

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
