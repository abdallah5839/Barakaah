/**
 * Écran principal du module Cercle de Lecture (Khatma)
 * Affiche les options de création/rejoindre ou le dashboard du cercle
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts';
import { useDevice } from '../../contexts/DeviceContext';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing, Shadows } from '../../constants';
import { checkUserCircle } from '../../services/circleService';
import { Circle, CircleMember } from '../../types/circle.types';

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
  const [userCircle, setUserCircle] = useState<{
    circle: Circle;
    membership: CircleMember;
  } | null>(null);

  // Charger le cercle de l'utilisateur
  const loadUserCircle = useCallback(async () => {
    if (!deviceId) return;

    try {
      const result = await checkUserCircle(deviceId);
      setUserCircle(result);
    } catch (error) {
      console.error('Erreur chargement cercle:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [deviceId]);

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

  // Si l'utilisateur est dans un cercle, afficher le dashboard (placeholder)
  if (userCircle) {
    const daysLeft = Math.ceil(
      (new Date(userCircle.circle.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {userCircle.circle.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {userCircle.membership.is_organizer ? 'Organisateur' : 'Membre'}
            </Text>
          </View>

          {/* Code du cercle */}
          <View style={styles.section}>
            <View style={[styles.codeCard, { backgroundColor: colors.surface }, Shadows.medium]}>
              <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
                Code du cercle
              </Text>
              <Text style={[styles.codeText, { color: colors.primary }]}>
                {userCircle.circle.code}
              </Text>
              <Text style={[styles.daysLeft, { color: colors.textSecondary }]}>
                {daysLeft > 0 ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}` : 'Expiré'}
              </Text>
            </View>
          </View>

          {/* Progression */}
          <View style={styles.section}>
            <View style={[styles.progressCard, { backgroundColor: colors.surface }, Shadows.small]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: colors.text }]}>
                  Progression
                </Text>
                <Text style={[styles.progressCount, { color: colors.primary }]}>
                  {userCircle.circle.completed_juz}/30 Juz
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${(userCircle.circle.completed_juz / 30) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Placeholder pour les fonctionnalités à venir */}
          <View style={styles.section}>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
              <Ionicons name="construct-outline" size={24} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  Dashboard en développement
                </Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  La gestion des Juz, les membres et le suivi de progression seront bientôt disponibles.
                </Text>
              </View>
            </View>
          </View>
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
  codeCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Spacing.radiusLg,
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  daysLeft: {
    fontSize: 14,
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
});

export default CircleScreen;
