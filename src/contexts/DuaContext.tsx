/**
 * DuaContext - Gestion de l'état des Dua
 * Favoris, préférences d'affichage, progression, positions audio
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DuaFavorites,
  DuaDisplayPreferences,
  DuaLearningProgress,
  DuaAudioPosition,
  DuaKumaylReminder,
} from '../types/dua';

// Clés AsyncStorage
const STORAGE_KEYS = {
  FAVORITES: '@sakina_dua_favorites',
  DISPLAY_PREFS: '@sakina_dua_display_prefs',
  LEARNING_PROGRESS: '@sakina_dua_learning_progress',
  AUDIO_POSITIONS: '@sakina_dua_audio_positions',
  KUMAYL_REMINDER: '@sakina_dua_kumayl_reminder',
};

// Valeurs par défaut
const DEFAULT_DISPLAY_PREFS: DuaDisplayPreferences = {
  showArabic: true,
  showFrench: true,
  showPhonetic: false,
};

const DEFAULT_KUMAYL_REMINDER: DuaKumaylReminder = {
  enabled: true,
  hour: 20,
  minute: 0,
};

// Interface du contexte
interface DuaContextType {
  // Favoris
  favorites: string[];
  isFavorite: (duaId: string) => boolean;
  toggleFavorite: (duaId: string) => void;

  // Préférences d'affichage
  displayPrefs: DuaDisplayPreferences;
  updateDisplayPrefs: (prefs: Partial<DuaDisplayPreferences>) => void;

  // Progression d'apprentissage
  learningProgress: Record<string, DuaLearningProgress>;
  getLearningProgress: (duaId: string) => DuaLearningProgress | null;
  updateLearningProgress: (progress: DuaLearningProgress) => void;

  // Positions audio
  audioPositions: Record<string, DuaAudioPosition>;
  getAudioPosition: (duaId: string) => number;
  saveAudioPosition: (duaId: string, position: number) => void;

  // Rappel Kumayl
  kumaylReminder: DuaKumaylReminder;
  updateKumaylReminder: (reminder: Partial<DuaKumaylReminder>) => void;

  // État de chargement
  isLoading: boolean;
}

// Création du contexte
const DuaContext = createContext<DuaContextType | undefined>(undefined);

// Props du Provider
interface DuaProviderProps {
  children: ReactNode;
}

/**
 * DuaProvider - Fournit l'état global des Dua
 */
export const DuaProvider: React.FC<DuaProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [displayPrefs, setDisplayPrefs] = useState<DuaDisplayPreferences>(DEFAULT_DISPLAY_PREFS);
  const [learningProgress, setLearningProgress] = useState<Record<string, DuaLearningProgress>>({});
  const [audioPositions, setAudioPositions] = useState<Record<string, DuaAudioPosition>>({});
  const [kumaylReminder, setKumaylReminder] = useState<DuaKumaylReminder>(DEFAULT_KUMAYL_REMINDER);

  // Charger les données au démarrage
  useEffect(() => {
    loadAllData();
  }, []);

  // Charger toutes les données depuis AsyncStorage
  const loadAllData = async () => {
    try {
      const [
        storedFavorites,
        storedDisplayPrefs,
        storedLearningProgress,
        storedAudioPositions,
        storedKumaylReminder,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
        AsyncStorage.getItem(STORAGE_KEYS.DISPLAY_PREFS),
        AsyncStorage.getItem(STORAGE_KEYS.LEARNING_PROGRESS),
        AsyncStorage.getItem(STORAGE_KEYS.AUDIO_POSITIONS),
        AsyncStorage.getItem(STORAGE_KEYS.KUMAYL_REMINDER),
      ]);

      if (storedFavorites) {
        const parsed: DuaFavorites = JSON.parse(storedFavorites);
        setFavorites(parsed.duaIds);
      }

      if (storedDisplayPrefs) {
        setDisplayPrefs(JSON.parse(storedDisplayPrefs));
      }

      if (storedLearningProgress) {
        setLearningProgress(JSON.parse(storedLearningProgress));
      }

      if (storedAudioPositions) {
        setAudioPositions(JSON.parse(storedAudioPositions));
      }

      if (storedKumaylReminder) {
        setKumaylReminder(JSON.parse(storedKumaylReminder));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données Dua:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FAVORIS
  // ═══════════════════════════════════════════════════════════════

  const isFavorite = useCallback((duaId: string): boolean => {
    return favorites.includes(duaId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (duaId: string) => {
    try {
      const newFavorites = favorites.includes(duaId)
        ? favorites.filter(id => id !== duaId)
        : [...favorites, duaId];

      setFavorites(newFavorites);

      const data: DuaFavorites = {
        duaIds: newFavorites,
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(data));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris:', error);
    }
  }, [favorites]);

  // ═══════════════════════════════════════════════════════════════
  // PRÉFÉRENCES D'AFFICHAGE
  // ═══════════════════════════════════════════════════════════════

  const updateDisplayPrefs = useCallback(async (prefs: Partial<DuaDisplayPreferences>) => {
    try {
      const newPrefs = { ...displayPrefs, ...prefs };
      setDisplayPrefs(newPrefs);
      await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_PREFS, JSON.stringify(newPrefs));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
    }
  }, [displayPrefs]);

  // ═══════════════════════════════════════════════════════════════
  // PROGRESSION D'APPRENTISSAGE
  // ═══════════════════════════════════════════════════════════════

  const getLearningProgress = useCallback((duaId: string): DuaLearningProgress | null => {
    return learningProgress[duaId] || null;
  }, [learningProgress]);

  const updateLearningProgress = useCallback(async (progress: DuaLearningProgress) => {
    try {
      const newProgress = {
        ...learningProgress,
        [progress.duaId]: {
          ...progress,
          lastAccessed: new Date().toISOString(),
        },
      };
      setLearningProgress(newProgress);
      await AsyncStorage.setItem(STORAGE_KEYS.LEARNING_PROGRESS, JSON.stringify(newProgress));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la progression:', error);
    }
  }, [learningProgress]);

  // ═══════════════════════════════════════════════════════════════
  // POSITIONS AUDIO
  // ═══════════════════════════════════════════════════════════════

  const getAudioPosition = useCallback((duaId: string): number => {
    return audioPositions[duaId]?.position || 0;
  }, [audioPositions]);

  const saveAudioPosition = useCallback(async (duaId: string, position: number) => {
    try {
      const newPositions = {
        ...audioPositions,
        [duaId]: {
          duaId,
          position,
          lastPlayed: new Date().toISOString(),
        },
      };
      setAudioPositions(newPositions);
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_POSITIONS, JSON.stringify(newPositions));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la position audio:', error);
    }
  }, [audioPositions]);

  // ═══════════════════════════════════════════════════════════════
  // RAPPEL KUMAYL
  // ═══════════════════════════════════════════════════════════════

  const updateKumaylReminder = useCallback(async (reminder: Partial<DuaKumaylReminder>) => {
    try {
      const newReminder = { ...kumaylReminder, ...reminder };
      setKumaylReminder(newReminder);
      await AsyncStorage.setItem(STORAGE_KEYS.KUMAYL_REMINDER, JSON.stringify(newReminder));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du rappel Kumayl:', error);
    }
  }, [kumaylReminder]);

  return (
    <DuaContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        displayPrefs,
        updateDisplayPrefs,
        learningProgress,
        getLearningProgress,
        updateLearningProgress,
        audioPositions,
        getAudioPosition,
        saveAudioPosition,
        kumaylReminder,
        updateKumaylReminder,
        isLoading,
      }}
    >
      {children}
    </DuaContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte Dua
 */
export const useDua = (): DuaContextType => {
  const context = useContext(DuaContext);
  if (context === undefined) {
    throw new Error('useDua doit être utilisé à l\'intérieur d\'un DuaProvider');
  }
  return context;
};

export default DuaContext;
