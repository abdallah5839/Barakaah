/**
 * Écran "Ma Lecture" - Affiche les Juz assignés à l'utilisateur
 * Permet de marquer ses Juz comme en cours / terminés
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { useDevice } from '../../contexts/DeviceContext';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing, Shadows } from '../../constants';
import {
  getMyAssignments,
  markJuzInProgress,
  markJuzCompleted,
  getCircleProgress,
} from '../../services/circleService';
import { getJuzByNumber } from '../../data/juzData';
import type { CircleAssignment } from '../../types/circle.types';

export const MyReadingScreen: React.FC = () => {
  const { colors } = useTheme();
  const { goBack, navigate, currentRoute } = useCircleNavigation();
  const { deviceId } = useDevice();

  const params = 'params' in currentRoute ? (currentRoute as any).params : {};
  const circleId: string = params?.circleId || '';

  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState<CircleAssignment[]>([]);
  const [updatingJuz, setUpdatingJuz] = useState<number | null>(null);

  // Animation de la barre de progression
  const progressAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (!circleId || !deviceId) return;
    try {
      const data = await getMyAssignments({ circleId, deviceId });
      setAssignments(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [circleId, deviceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistiques optimisées avec useMemo
  const { completedCount, totalCount, personalPercentage } = useMemo(() => {
    const completed = assignments.filter(a => a.status === 'completed').length;
    const total = assignments.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedCount: completed, totalCount: total, personalPercentage: pct };
  }, [assignments]);

  // Animer la barre quand le pourcentage change
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: personalPercentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [personalPercentage]);

  // Commencer un Juz
  const handleStart = async (juzNumber: number) => {
    if (!deviceId) return;
    setUpdatingJuz(juzNumber);
    try {
      const result = await markJuzInProgress({ circleId, juzNumber, deviceId });
      if (result.success) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await loadData();
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de mettre à jour.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setUpdatingJuz(null);
    }
  };

  // Terminer un Juz
  const handleComplete = async (juzNumber: number) => {
    if (!deviceId) return;

    Alert.alert(
      'Terminer ce Juz ?',
      `Confirmer que tu as terminé la lecture du Juz ${juzNumber} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setUpdatingJuz(juzNumber);
            try {
              const result = await markJuzCompleted({ circleId, juzNumber, deviceId });
              if (result.success && result.data) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await loadData();

                // Vérifier si Khatma complète
                if (result.data.circleCompleted) {
                  setTimeout(() => {
                    Alert.alert(
                      'Khatma Complète !',
                      'Qu\'Allah accepte votre lecture.\n\nVotre cercle a terminé la lecture complète du Coran !',
                      [
                        { text: 'Alhamdulillah' },
                        {
                          text: 'Partager',
                          onPress: () => {
                            Share.share({
                              message: 'Alhamdulillah ! Notre cercle de lecture a complété une Khatma du Coran sur Sakina !',
                            });
                          },
                        },
                      ]
                    );
                  }, 500);
                  return;
                }

                // Vérifier si c'était le dernier Juz personnel
                const remaining = assignments.filter(
                  a => a.juz_number !== juzNumber && a.status !== 'completed'
                );
                if (remaining.length === 0 && totalCount > 0) {
                  setTimeout(() => {
                    Alert.alert(
                      'Tous tes Juz sont terminés !',
                      'Tu as terminé tous les Juz qui t\'étaient assignés. Qu\'Allah accepte ta lecture !',
                    );
                  }, 500);
                } else {
                  setTimeout(() => {
                    Alert.alert(
                      'Bravo !',
                      `Tu as terminé le Juz ${juzNumber} ! Continue comme ça.`,
                    );
                  }, 300);
                }
              } else {
                Alert.alert('Erreur', result.error || 'Impossible de mettre à jour.');
              }
            } catch {
              Alert.alert('Erreur', 'Une erreur est survenue.');
            } finally {
              setUpdatingJuz(null);
            }
          },
        },
      ]
    );
  };

  // Couleur et icône selon le statut
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: '#059669', bg: '#059669' + '15', icon: 'checkmark-circle' as const, label: 'Terminé' };
      case 'in_progress':
        return { color: '#F59E0B', bg: '#F59E0B' + '15', icon: 'sync-outline' as const, label: 'En cours' };
      default:
        return { color: colors.primary, bg: colors.primary + '15', icon: 'bookmark-outline' as const, label: 'Assigné' };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={goBack}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Ma Lecture
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Pas de Juz assignés */}
        {assignments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="book-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Aucun Juz assigné
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              L'organisateur doit d'abord t'assigner des Juz à lire.
            </Text>
          </View>
        ) : (
          <>
            {/* Progression personnelle */}
            <View style={styles.section}>
              <View style={[styles.progressCard, { backgroundColor: colors.surface }, Shadows.small]}>
                <View style={styles.progressRow}>
                  <Text style={[styles.progressLabel, { color: colors.text }]}>
                    Ta progression
                  </Text>
                  <Text style={[styles.progressValue, { color: colors.primary }]}>
                    {completedCount}/{totalCount} Juz ({personalPercentage}%)
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Titre section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="book" size={18} color={colors.text} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Tes Juz à lire
                </Text>
              </View>
            </View>

            {/* Liste des Juz */}
            <View style={styles.juzList}>
              {assignments.map((assignment) => {
                const juzInfo = getJuzByNumber(assignment.juz_number);
                const statusInfo = getStatusInfo(assignment.status);
                const isUpdating = updatingJuz === assignment.juz_number;

                // Description de la portée du Juz
                let rangeText = '';
                if (juzInfo) {
                  if (juzInfo.start_surah === juzInfo.end_surah) {
                    rangeText = `${juzInfo.start_surah} (${juzInfo.start_verse}-${juzInfo.end_verse})`;
                  } else {
                    rangeText = `${juzInfo.start_surah} (${juzInfo.start_verse}) → ${juzInfo.end_surah} (${juzInfo.end_verse})`;
                  }
                }

                return (
                  <Pressable
                    key={assignment.juz_number}
                    style={[
                      styles.juzCard,
                      { backgroundColor: colors.surface, borderLeftColor: statusInfo.color },
                      Shadows.small,
                    ]}
                    onPress={() => navigate('JuzReader', { circleId, juzNumber: assignment.juz_number })}
                  >
                    {/* En-tête de la carte */}
                    <View style={styles.juzCardHeader}>
                      <View style={styles.juzCardLeft}>
                        <View style={[styles.juzNumberBadge, { backgroundColor: statusInfo.bg }]}>
                          <Text style={[styles.juzNumberText, { color: statusInfo.color }]}>
                            {assignment.juz_number}
                          </Text>
                        </View>
                        <View style={styles.juzCardInfo}>
                          <Text style={[styles.juzTitle, { color: colors.text }]}>
                            Juz {assignment.juz_number}
                          </Text>
                          {juzInfo && (
                            <Text style={[styles.juzArabic, { color: colors.textSecondary }]}>
                              {juzInfo.name_ar}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>

                    {/* Portée du Juz */}
                    {rangeText ? (
                      <Text style={[styles.juzRange, { color: colors.textSecondary }]}>
                        {rangeText}
                      </Text>
                    ) : null}

                    {/* Bouton d'action */}
                    {assignment.status === 'assigned' && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                          pressed && { opacity: 0.7 },
                          isUpdating && { opacity: 0.5 },
                        ]}
                        onPress={() => handleStart(assignment.juz_number)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="book-outline" size={18} color={colors.primary} />
                            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                              Commencer
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}

                    {assignment.status === 'in_progress' && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          { backgroundColor: '#059669' + '15', borderColor: '#059669' },
                          pressed && { opacity: 0.7 },
                          isUpdating && { opacity: 0.5 },
                        ]}
                        onPress={() => handleComplete(assignment.juz_number)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#059669" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
                            <Text style={[styles.actionBtnText, { color: '#059669' }]}>
                              Terminer
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}

                    {assignment.status === 'completed' && assignment.completed_at && (
                      <Text style={[styles.completedDate, { color: colors.textSecondary }]}>
                        Terminé le {new Date(assignment.completed_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing['4xl'],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Progression
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.lg,
  },
  progressCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.radiusMd,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Juz list
  juzList: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.md,
  },
  juzCard: {
    borderRadius: Spacing.radiusMd,
    padding: Spacing.lg,
    borderLeftWidth: 4,
  },
  juzCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  juzCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  juzNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  juzNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  juzCardInfo: {
    gap: 1,
  },
  juzTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  juzArabic: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  juzRange: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 44,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  completedDate: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});

export default MyReadingScreen;
