/**
 * Écran principal du module Cercle de Lecture (Khatma)
 * Affiche les options de création/rejoindre ou le dashboard du cercle
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
  RefreshControl,
  Share,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { useDevice } from '../../contexts/DeviceContext';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing, Shadows } from '../../constants';
import {
  checkUserCircle,
  getCircleMembers,
  getCircleAssignments,
  getCircleProgress,
  checkCircleExpiration,
  leaveCircle,
  deleteCircle,
  cleanupExpiredCircles,
} from '../../services/circleService';
import { Circle, CircleMember, CircleAssignment } from '../../types/circle.types';

// Clé de cache AsyncStorage pour les données du cercle
const CIRCLE_CACHE_KEY = 'sakina_circle_cache';

// Couleurs uniques par membre pour les avatars
const MEMBER_COLORS = [
  '#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#E11D48', '#7C3AED', '#0EA5E9', '#D946EF', '#84CC16',
  '#FB923C', '#A855F7', '#22D3EE', '#F43F5E', '#34D399',
  '#818CF8', '#FB7185', '#38BDF8', '#C084FC', '#4ADE80',
  '#FBBF24', '#2DD4BF', '#A78BFA', '#F87171', '#60A5FA',
];

// Types pour la navigation du module Cercle
export type CircleStackParamList = {
  CircleMain: undefined;
  CreateCircle: undefined;
  CircleCreated: { circle: Circle; membership: CircleMember };
  JoinCircle: undefined;
  CircleDashboard: { circleId: string };
};

export const CircleScreen: React.FC = () => {
  const { colors } = useTheme();
  const { navigate } = useCircleNavigation();
  const { deviceId, isReady } = useDevice();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [userCircle, setUserCircle] = useState<{
    circle: Circle;
    membership: CircleMember;
  } | null>(null);

  // Dashboard data
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [assignments, setAssignments] = useState<CircleAssignment[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 30, percentage: 0 });

  // Animation de la barre de progression
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animer la barre quand le pourcentage change
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress.percentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress.percentage]);

  // Sauvegarder en cache local
  const saveToCache = useCallback(async (data: {
    userCircle: { circle: Circle; membership: CircleMember } | null;
    members: CircleMember[];
    assignments: CircleAssignment[];
    progress: { completed: number; total: number; percentage: number };
  }) => {
    try {
      await AsyncStorage.setItem(CIRCLE_CACHE_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now(),
      }));
    } catch {}
  }, []);

  // Charger depuis le cache local (fallback offline)
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CIRCLE_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        // Cache valide pendant 1 heure
        if (Date.now() - data.timestamp < 3600000) {
          setUserCircle(data.userCircle);
          setMembers(data.members || []);
          setAssignments(data.assignments || []);
          setProgress(data.progress || { completed: 0, total: 30, percentage: 0 });
          return true;
        }
      }
    } catch {}
    return false;
  }, []);

  // Charger le cercle de l'utilisateur et les données du dashboard
  const loadUserCircle = useCallback(async () => {
    if (!deviceId) return;

    setLoadError(false);
    try {
      // Nettoyer les cercles expirés d'abord
      await cleanupExpiredCircles();

      const result = await checkUserCircle(deviceId);

      // Si l'utilisateur est dans un cercle, vérifier l'expiration
      if (result) {
        const isExpired = checkCircleExpiration(result.circle.expires_at);
        if (isExpired) {
          // Le cercle est expiré - naviguer vers l'écran de fin
          const progressData = await getCircleProgress(result.circle.id);
          await deleteCircle(result.circle.id);
          setUserCircle(null);
          await AsyncStorage.removeItem(CIRCLE_CACHE_KEY);
          navigate('CircleEnded', {
            circleName: result.circle.name,
            completedJuz: progressData.completed,
            totalJuz: 30,
            reason: 'expired',
          });
          return;
        }

        // Charger les données du dashboard
        const [membersData, assignmentsData, progressData] = await Promise.all([
          getCircleMembers(result.circle.id),
          getCircleAssignments(result.circle.id),
          getCircleProgress(result.circle.id),
        ]);
        setMembers(membersData);
        setAssignments(assignmentsData);
        setProgress(progressData);

        // Mettre en cache
        saveToCache({ userCircle: result, members: membersData, assignments: assignmentsData, progress: progressData });
      } else {
        await AsyncStorage.removeItem(CIRCLE_CACHE_KEY);
      }

      setUserCircle(result);
    } catch (error) {
      console.error('Erreur chargement cercle:', error);
      // Tenter le cache offline en cas d'erreur réseau
      const hasCached = await loadFromCache();
      if (!hasCached) {
        setLoadError(true);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [deviceId, navigate, saveToCache, loadFromCache]);

  // Charger au montage et quand le device ID est prêt
  useEffect(() => {
    if (isReady && deviceId) {
      loadUserCircle();
    }
  }, [isReady, deviceId, loadUserCircle]);

  // Rafraîchir manuellement
  const onRefresh = () => {
    setRefreshing(true);
    loadUserCircle();
  };

  // Navigation vers la création
  const goToCreate = () => {
    navigate('CreateCircle');
  };

  // Navigation pour rejoindre
  const goToJoin = () => {
    navigate('JoinCircle');
  };

  // Données dérivées optimisées avec useMemo (toujours appelés, avant tout return)
  const unassignedJuz = useMemo(
    () => assignments.filter(a => a.status === 'unassigned'),
    [assignments]
  );

  const memberColorMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m, i) => map.set(m.id, MEMBER_COLORS[i % MEMBER_COLORS.length]));
    return map;
  }, [members]);

  const memberAssignments = useMemo(
    () => members.map(member => {
      const memberJuz = assignments.filter(a => a.member_id === member.id);
      const completedCount = memberJuz.filter(a => a.status === 'completed').length;
      const inProgressCount = memberJuz.filter(a => a.status === 'in_progress').length;
      const isMe = member.device_id === deviceId;
      return { member, juz: memberJuz, completedCount, inProgressCount, isMe };
    }),
    [members, assignments, deviceId]
  );

  // Affichage du chargement
  if (!isReady || isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Erreur de chargement avec bouton réessayer
  if (loadError && !userCircle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Connexion impossible
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            Vérifie ta connexion internet et réessaie.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => {
              setIsLoading(true);
              setLoadError(false);
              loadUserCircle();
            }}
            accessibilityRole="button"
            accessibilityLabel="Réessayer le chargement"
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Si l'utilisateur est dans un cercle, afficher le dashboard
  if (userCircle) {
    const daysLeft = Math.ceil(
      (new Date(userCircle.circle.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Copier le code dans le presse-papier
    const copyCode = async () => {
      try {
        await Clipboard.setStringAsync(userCircle.circle.code);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Code copié !', `Le code ${userCircle.circle.code} a été copié.`);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de copier le code');
      }
    };

    // Partager le cercle
    const shareCircle = async () => {
      try {
        await Share.share({
          message: `Rejoins mon cercle de lecture du Coran sur Sakina ! Code : ${userCircle.circle.code}`,
          title: `Rejoins ${userCircle.circle.name} sur Sakina`,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error: any) {
        if (error.message !== 'User did not share') {
          Alert.alert('Erreur', 'Impossible de partager');
        }
      }
    };

    // Quitter ou supprimer le cercle
    const handleLeaveCircle = () => {
      const isOrg = userCircle.membership.is_organizer;

      Alert.alert(
        isOrg ? 'Supprimer le cercle' : 'Quitter le cercle',
        isOrg
          ? `Attention ! Supprimer le cercle "${userCircle.circle.name}" ? Cette action est irréversible et affectera tous les membres.`
          : `Tu vas quitter le cercle "${userCircle.circle.name}". Tes Juz seront désassignés. Continuer ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: isOrg ? 'Supprimer' : 'Quitter',
            style: 'destructive',
            onPress: async () => {
              if (!deviceId) return;
              const result = await leaveCircle({
                circleId: userCircle.circle.id,
                deviceId,
              });
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                navigate('CircleEnded', {
                  circleName: userCircle.circle.name,
                  completedJuz: progress.completed,
                  totalJuz: 30,
                  reason: 'left',
                });
              } else {
                Alert.alert('Erreur', result.error || 'Impossible de quitter le cercle.');
              }
            },
          },
        ]
      );
    };

    const isOrganizer = userCircle.membership.is_organizer;

    // Fonction pour le statut d'un membre
    const getMemberStatus = (juz: CircleAssignment[], completedCount: number, inProgressCount: number) => {
      if (juz.length === 0) return { label: 'En attente', color: colors.textSecondary, icon: 'time-outline' as const };
      if (completedCount === juz.length) return { label: 'Terminé', color: colors.success, icon: 'checkmark-circle' as const };
      if (inProgressCount > 0) return { label: 'En cours', color: '#F59E0B', icon: 'sync-outline' as const };
      return { label: 'Assigné', color: colors.primary, icon: 'bookmark-outline' as const };
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* En-tête */}
          <View style={styles.dashboardHeader}>
            <Text style={[styles.dashboardTitle, { color: colors.text }]}>
              {userCircle.circle.name}
            </Text>
            <View style={styles.codeRow}>
              <Text style={[styles.codeInline, { color: colors.primary }]}>
                {userCircle.circle.code}
              </Text>
              <Pressable onPress={copyCode} style={({ pressed }) => [styles.codeSmallBtn, pressed && { opacity: 0.6 }]}>
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
              </Pressable>
              <Pressable onPress={shareCircle} style={({ pressed }) => [styles.codeSmallBtn, pressed && { opacity: 0.6 }]}>
                <Ionicons name="share-social-outline" size={16} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {daysLeft > 0 ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}` : 'Expiré'}
              </Text>
              <View style={[styles.metaDot, { backgroundColor: colors.textSecondary }]} />
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {members.length}/30 membres
              </Text>
            </View>
          </View>

          {/* Avertissement d'expiration */}
          {daysLeft <= 3 && daysLeft > 0 && (
            <View style={styles.section}>
              <View style={[styles.expiryBanner, {
                backgroundColor: daysLeft <= 1 ? colors.error + '15' : '#F59E0B' + '15',
                borderColor: daysLeft <= 1 ? colors.error : '#F59E0B',
              }]}>
                <Ionicons
                  name={daysLeft <= 1 ? 'alert-circle' : 'warning'}
                  size={20}
                  color={daysLeft <= 1 ? colors.error : '#F59E0B'}
                />
                <Text style={[styles.expiryBannerText, {
                  color: daysLeft <= 1 ? colors.error : '#F59E0B',
                }]}>
                  {daysLeft <= 1
                    ? 'Ce cercle expire demain !'
                    : `Ce cercle expire dans ${daysLeft} jours !`}
                </Text>
              </View>
            </View>
          )}

          {/* Progression Globale */}
          <View style={styles.section}>
            <View style={[styles.progressCard, { backgroundColor: colors.surface }, Shadows.small]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: colors.text }]}>Progression</Text>
                <Text style={[styles.progressCount, { color: colors.primary }]}>
                  {progress.percentage}%
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
              <Text style={[styles.progressSubtext, { color: colors.textSecondary }]}>
                {progress.completed}/30 Juz complétés
              </Text>
            </View>
          </View>

          {/* Section Membres */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={18} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Membres ({members.length}/30)
              </Text>
            </View>

            <View style={styles.membersList}>
              {memberAssignments.map(({ member, juz, completedCount, inProgressCount, isMe }) => {
                const status = getMemberStatus(juz, completedCount, inProgressCount);
                return (
                  <View
                    key={member.id}
                    style={[
                      styles.memberCard,
                      { backgroundColor: colors.surface, borderColor: isMe ? colors.primary + '40' : 'transparent' },
                      Shadows.small,
                    ]}
                  >
                    <View style={styles.memberTop}>
                      <View style={[styles.memberAvatar, { backgroundColor: (memberColorMap.get(member.id) || colors.primary) + '20' }]}>
                        <Text style={[styles.memberAvatarText, { color: memberColorMap.get(member.id) || colors.primary }]}>
                          {member.nickname.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <Text style={[styles.memberName, { color: colors.text }]}>{member.nickname}</Text>
                          {member.is_organizer && (
                            <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                              <Text style={[styles.badgeText, { color: colors.primary }]}>Organisateur</Text>
                            </View>
                          )}
                          {isMe && (
                            <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                              <Text style={[styles.badgeText, { color: colors.success }]}>Toi</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.memberJuz, { color: colors.textSecondary }]}>
                          {juz.length > 0
                            ? `Juz ${juz.map(j => j.juz_number).join(', ')}`
                            : 'Aucun Juz assigné'}
                        </Text>
                      </View>
                      <View style={styles.memberStatus}>
                        <Ionicons name={status.icon} size={16} color={status.color} />
                        <Text style={[styles.memberStatusText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Section Juz non assignés */}
          {unassignedJuz.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="book-outline" size={18} color={colors.text} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Juz non assignés : {unassignedJuz.length}
                </Text>
              </View>
              <View style={[styles.unassignedCard, { backgroundColor: colors.surface }, Shadows.small]}>
                <View style={styles.juzChips}>
                  {unassignedJuz.map(a => (
                    <View key={a.juz_number} style={[styles.juzChip, { backgroundColor: colors.border + '50' }]}>
                      <Text style={[styles.juzChipText, { color: colors.textSecondary }]}>
                        {a.juz_number}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Boutons d'action */}
          <View style={styles.section}>
            {/* Continuer ma lecture - visible pour tous les membres */}
            <Pressable
              style={({ pressed }) => [
                styles.dashboardActionButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                navigate('MyReading', { circleId: userCircle.circle.id });
              }}
              accessibilityRole="button"
              accessibilityLabel="Continuer ma lecture du Coran"
            >
              <Ionicons name="book" size={20} color="#fff" />
              <Text style={[styles.dashboardActionText, { color: '#fff' }]}>Continuer ma lecture</Text>
            </Pressable>

            {/* Gérer les assignations - organisateur uniquement */}
            {isOrganizer && (
              <Pressable
                style={({ pressed }) => [
                  styles.dashboardActionButton,
                  { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1, marginTop: Spacing.sm },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => {
                  navigate('ManageAssignments', { circleId: userCircle.circle.id });
                }}
              >
                <Ionicons name="settings-outline" size={20} color={colors.primary} />
                <Text style={[styles.dashboardActionText, { color: colors.primary }]}>Gérer les assignations</Text>
              </Pressable>
            )}
          </View>

          {/* Quitter / Supprimer le cercle */}
          <View style={[styles.section, { marginTop: Spacing.lg }]}>
            <Pressable
              style={({ pressed }) => [
                styles.leaveButton,
                { borderColor: colors.error + '40' },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleLeaveCircle}
            >
              <Ionicons
                name={isOrganizer ? 'trash-outline' : 'exit-outline'}
                size={18}
                color={colors.error}
              />
              <Text style={[styles.leaveButtonText, { color: colors.error }]}>
                {isOrganizer ? 'Supprimer le cercle' : 'Quitter le cercle'}
              </Text>
            </Pressable>
          </View>

          <View style={{ height: Spacing['3xl'] }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Si pas de cercle, afficher les options créer/rejoindre
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.noCircleContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="people" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Cercle de Lecture
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Complétez une Khatma ensemble
          </Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Créez ou rejoignez un cercle pour lire le Coran en groupe. Chaque membre prend en charge une partie (Juz) pour compléter ensemble la lecture complète.
          </Text>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionsContainer}>
          {/* Bouton Créer */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={goToCreate}
            accessibilityRole="button"
            accessibilityLabel="Créer un nouveau cercle de lecture"
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="add-circle-outline" size={32} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Créer un Cercle</Text>
                <Text style={styles.actionSubtitle}>
                  Invitez vos proches à vous rejoindre
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
            </View>
          </Pressable>

          {/* Bouton Rejoindre */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              pressed && styles.buttonPressed,
            ]}
            onPress={goToJoin}
            accessibilityRole="button"
            accessibilityLabel="Rejoindre un cercle de lecture existant"
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="enter-outline" size={32} color={colors.primary} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  Rejoindre un Cercle
                </Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  Entrez le code reçu d'un organisateur
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {/* Info sur les cercles */}
        <View style={styles.section}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Comment ça marche ?
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Le Coran est divisé en 30 parties (Juz). Chaque membre du cercle choisit un ou plusieurs Juz à lire. Ensemble, vous complétez une Khatma !
              </Text>
            </View>
          </View>
        </View>
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
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  noCircleContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.xl,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: Spacing.radiusMd,
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Dashboard styles
  dashboardHeader: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  codeInline: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  codeSmallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  membersList: {
    gap: Spacing.sm,
  },
  memberCard: {
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    borderWidth: 1.5,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberJuz: {
    fontSize: 13,
  },
  memberStatus: {
    alignItems: 'center',
    gap: 2,
  },
  memberStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressSubtext: {
    fontSize: 13,
    marginTop: Spacing.sm,
  },
  unassignedCard: {
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
  },
  juzChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  juzChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  juzChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardActionButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: Spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dashboardActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.radiusMd,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressCount: {
    fontSize: 16,
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
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
  },
  expiryBannerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 44,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing['3xl'],
  },
  retryButton: {
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: Spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CircleScreen;
