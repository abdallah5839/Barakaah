/**
 * DownloadsScreen - Gestion des téléchargements hors ligne
 * Permet de télécharger le contenu pour une utilisation offline
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Shadows } from '../constants';

// Couleurs
const Colors = {
  light: {
    primary: '#059669',
    secondary: '#D4AF37',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#DC2626',
    success: '#22C55E',
  },
  dark: {
    primary: '#10B981',
    secondary: '#FBBF24',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    error: '#EF4444',
    success: '#22C55E',
  },
};

// Clés de stockage
const STORAGE_KEYS = {
  QURAN_DOWNLOADED: '@sakina_quran_downloaded',
  DUAS_DOWNLOADED: '@sakina_duas_downloaded',
  AUDIO_DOWNLOADED: '@sakina_audio_downloaded',
};

interface DownloadItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  size: string;
  isDownloaded: boolean;
  isDownloading: boolean;
  progress: number;
}

interface DownloadsScreenProps {
  navigation?: any;
  isDark?: boolean;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({
  navigation,
  isDark = false,
}) => {
  const colors = isDark ? Colors.dark : Colors.light;

  // États
  const [isOnline, setIsOnline] = useState(true);
  const [downloads, setDownloads] = useState<DownloadItem[]>([
    {
      id: 'quran',
      title: 'Texte du Coran',
      description: 'Arabe, traduction française et phonétique',
      icon: 'book',
      size: '2.5 MB',
      isDownloaded: false,
      isDownloading: false,
      progress: 0,
    },
    {
      id: 'duas',
      title: 'Collection de Duas',
      description: 'Toutes les invocations avec traductions',
      icon: 'hand-left',
      size: '1.2 MB',
      isDownloaded: false,
      isDownloading: false,
      progress: 0,
    },
    {
      id: 'audio',
      title: 'Audio Mishary Al-Afasy',
      description: 'Récitation complète du Coran',
      icon: 'musical-notes',
      size: '~450 MB',
      isDownloaded: false,
      isDownloading: false,
      progress: 0,
    },
  ]);
  const [totalUsed, setTotalUsed] = useState('0 MB');

  // Vérifier connexion
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  // Charger état des téléchargements
  useEffect(() => {
    loadDownloadStatus();
  }, []);

  const loadDownloadStatus = async () => {
    try {
      const [quranStatus, duasStatus, audioStatus] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.QURAN_DOWNLOADED),
        AsyncStorage.getItem(STORAGE_KEYS.DUAS_DOWNLOADED),
        AsyncStorage.getItem(STORAGE_KEYS.AUDIO_DOWNLOADED),
      ]);

      setDownloads((prev) =>
        prev.map((item) => {
          if (item.id === 'quran' && quranStatus === 'true') {
            return { ...item, isDownloaded: true };
          }
          if (item.id === 'duas' && duasStatus === 'true') {
            return { ...item, isDownloaded: true };
          }
          if (item.id === 'audio' && audioStatus === 'true') {
            return { ...item, isDownloaded: true };
          }
          return item;
        })
      );

      // Calculer espace utilisé
      let used = 0;
      if (quranStatus === 'true') used += 2.5;
      if (duasStatus === 'true') used += 1.2;
      if (audioStatus === 'true') used += 450;
      setTotalUsed(`${used.toFixed(1)} MB`);
    } catch (error) {
      console.error('Erreur chargement status:', error);
    }
  };

  // Simuler téléchargement
  const handleDownload = useCallback(async (id: string) => {
    if (!isOnline) {
      Alert.alert('Hors ligne', 'Vous devez être connecté à Internet pour télécharger.');
      return;
    }

    // Mettre à jour état
    setDownloads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isDownloading: true, progress: 0 } : item
      )
    );

    // Simuler progression
    const duration = id === 'audio' ? 10000 : 3000;
    const interval = 100;
    const steps = duration / interval;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;

      setDownloads((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, progress: Math.min(progress, 100) } : item
        )
      );

      if (currentStep >= steps) {
        clearInterval(progressInterval);

        // Marquer comme téléchargé
        setDownloads((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, isDownloading: false, isDownloaded: true, progress: 100 }
              : item
          )
        );

        // Sauvegarder status
        const storageKey =
          id === 'quran'
            ? STORAGE_KEYS.QURAN_DOWNLOADED
            : id === 'duas'
            ? STORAGE_KEYS.DUAS_DOWNLOADED
            : STORAGE_KEYS.AUDIO_DOWNLOADED;

        AsyncStorage.setItem(storageKey, 'true');
        loadDownloadStatus();
      }
    }, interval);
  }, [isOnline]);

  // Supprimer téléchargement
  const handleDelete = useCallback((id: string, title: string) => {
    Alert.alert(
      'Supprimer le téléchargement',
      `Voulez-vous supprimer "${title}" de votre appareil ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const storageKey =
              id === 'quran'
                ? STORAGE_KEYS.QURAN_DOWNLOADED
                : id === 'duas'
                ? STORAGE_KEYS.DUAS_DOWNLOADED
                : STORAGE_KEYS.AUDIO_DOWNLOADED;

            await AsyncStorage.removeItem(storageKey);

            setDownloads((prev) =>
              prev.map((item) =>
                item.id === id
                  ? { ...item, isDownloaded: false, progress: 0 }
                  : item
              )
            );
            loadDownloadStatus();
          },
        },
      ]
    );
  }, []);

  // Retour
  const goBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Téléchargements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status connexion */}
        {!isOnline && (
          <View style={[styles.offlineBanner, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="cloud-offline" size={20} color={colors.error} />
            <Text style={[styles.offlineText, { color: colors.error }]}>
              Vous êtes hors ligne
            </Text>
          </View>
        )}

        {/* Espace utilisé */}
        <View style={[styles.storageCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={styles.storageHeader}>
            <Ionicons name="folder" size={24} color={colors.primary} />
            <Text style={[styles.storageTitle, { color: colors.text }]}>
              Espace utilisé
            </Text>
          </View>
          <View style={styles.storageInfo}>
            <Text style={[styles.storageUsed, { color: colors.text }]}>{totalUsed}</Text>
            <Text style={[styles.storageTotal, { color: colors.textSecondary }]}>
              / 1 GB disponible
            </Text>
          </View>
          <View style={[styles.storageBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.storageBarFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.min((parseFloat(totalUsed) / 1000) * 100, 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Liste des téléchargements */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Contenu disponible
          </Text>

          {downloads.map((item) => (
            <View
              key={item.id}
              style={[styles.downloadCard, { backgroundColor: colors.surface }, Shadows.small]}
            >
              <View style={styles.downloadContent}>
                <View
                  style={[
                    styles.downloadIcon,
                    { backgroundColor: colors.primary + '20' },
                  ]}
                >
                  <Ionicons name={item.icon as any} size={24} color={colors.primary} />
                </View>
                <View style={styles.downloadInfo}>
                  <Text style={[styles.downloadTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.downloadDescription, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.downloadSize, { color: colors.textSecondary }]}>
                    {item.size}
                  </Text>
                </View>
              </View>

              {/* Barre de progression */}
              {item.isDownloading && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: colors.primary, width: `${item.progress}%` },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {Math.round(item.progress)}%
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.downloadActions}>
                {item.isDownloading ? (
                  <View style={styles.downloadingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.downloadingText, { color: colors.textSecondary }]}>
                      Téléchargement...
                    </Text>
                  </View>
                ) : item.isDownloaded ? (
                  <View style={styles.downloadedActions}>
                    <View style={[styles.downloadedBadge, { backgroundColor: colors.success + '20' }]}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={[styles.downloadedText, { color: colors.success }]}>
                        Téléchargé
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.deleteButton, { borderColor: colors.error }]}
                      onPress={() => handleDelete(item.id, item.title)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.downloadButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleDownload(item.id)}
                  >
                    <Ionicons name="download" size={18} color="#FFF" />
                    <Text style={styles.downloadButtonText}>Télécharger</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Les contenus téléchargés sont accessibles même sans connexion Internet.
            L'audio du Coran nécessite beaucoup d'espace de stockage.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.md,
    borderRadius: Spacing.radiusMd,
    gap: Spacing.xs,
  },
  offlineText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  storageCard: {
    margin: Spacing.screenHorizontal,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  storageTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  storageUsed: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  storageTotal: {
    fontSize: Typography.sizes.sm,
    marginLeft: Spacing.xs,
  },
  storageBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  downloadCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
    marginBottom: Spacing.md,
  },
  downloadContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  downloadIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  downloadDescription: {
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.xs,
  },
  downloadSize: {
    fontSize: Typography.sizes.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    minWidth: 40,
    textAlign: 'right',
  },
  downloadActions: {
    marginTop: Spacing.md,
  },
  downloadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  downloadingText: {
    fontSize: Typography.sizes.sm,
  },
  downloadedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.radiusFull,
    gap: Spacing.xs,
  },
  downloadedText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radiusMd,
    gap: Spacing.xs,
  },
  downloadButtonText: {
    color: '#FFF',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default DownloadsScreen;
