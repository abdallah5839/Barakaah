/**
 * Écran de succès après création d'un cercle
 * Affiche le code et permet le partage
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing, Shadows } from '../../constants';
import { Circle, CircleMember } from '../../types/circle.types';

// Props du composant (reçues via le navigateur)
interface CircleCreatedScreenProps {
  circle?: Circle;
  membership?: CircleMember;
}

export const CircleCreatedScreen: React.FC = () => {
  const { colors } = useTheme();
  const { reset, currentRoute } = useCircleNavigation();

  // Récupérer les params depuis le contexte de navigation
  const params = 'params' in currentRoute ? currentRoute.params as { circle: Circle; membership: CircleMember } : null;
  const circle = params?.circle;
  const membership = params?.membership;

  // Si pas de params, retourner un écran vide (ne devrait pas arriver)
  if (!circle || !membership) {
    return null;
  }

  // Copier le code dans le presse-papier
  const copyCode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(circle.code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copié !', 'Le code a été copié dans le presse-papier');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le code');
    }
  }, [circle.code]);

  // Partager le cercle
  const shareCircle = useCallback(async () => {
    try {
      const message = `Salam ! Rejoins mon cercle de lecture "${circle.name}" sur Barakaah pour compléter une Khatma ensemble !\n\nCode : ${circle.code}\n\nTélécharge l'app Barakaah et utilise ce code pour nous rejoindre.`;

      await Share.share({
        message,
        title: `Rejoins ${circle.name} sur Barakaah`,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Erreur', 'Impossible de partager');
      }
    }
  }, [circle.name, circle.code]);

  // Aller au dashboard du cercle
  const goToDashboard = useCallback(() => {
    // Reset la navigation pour aller au dashboard
    reset([{ name: 'CircleMain' }]);
  }, [reset]);

  // Calculer le nombre de jours
  const daysLeft = Math.ceil(
    (new Date(circle.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Animation de succès */}
        <View style={styles.successHeader}>
          <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Cercle créé !
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Partage le code pour inviter tes proches
          </Text>
        </View>

        {/* Carte du cercle */}
        <View style={[styles.circleCard, { backgroundColor: colors.surface }, Shadows.medium]}>
          <Text style={[styles.circleName, { color: colors.text }]}>
            {circle.name}
          </Text>
          <Text style={[styles.circleRole, { color: colors.textSecondary }]}>
            Organisateur : {membership.nickname}
          </Text>

          {/* Code en grand */}
          <View style={[styles.codeContainer, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
              Code du cercle
            </Text>
            <Text style={[styles.codeText, { color: colors.primary }]}>
              {circle.code}
            </Text>
          </View>

          {/* Info durée */}
          <View style={styles.durationInfo}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.durationText, { color: colors.textSecondary }]}>
              {daysLeft} jour{daysLeft > 1 ? 's' : ''} pour compléter la Khatma
            </Text>
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionsContainer}>
          {/* Copier le code */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && styles.buttonPressed,
            ]}
            onPress={copyCode}
          >
            <Ionicons name="copy-outline" size={22} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              Copier le code
            </Text>
          </Pressable>

          {/* Partager */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.shareButton,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={shareCircle}
          >
            <Ionicons name="share-social" size={22} color="#fff" />
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>
              Partager le lien
            </Text>
          </Pressable>
        </View>

        {/* Instructions */}
        <View style={[styles.instructionsCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <Text style={[styles.instructionsTitle, { color: colors.text }]}>
            Prochaines étapes
          </Text>

          <View style={styles.instructionItem}>
            <View style={[styles.instructionNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              Partage le code avec tes proches
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={[styles.instructionNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              Ils rejoignent avec le code depuis l'app
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={[styles.instructionNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              Chacun choisit ses Juz à lire
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={[styles.instructionNumber, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              Ensemble, vous complétez la Khatma !
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [
            styles.dashboardButton,
            { backgroundColor: colors.primary },
            pressed && styles.buttonPressed,
          ]}
          onPress={goToDashboard}
        >
          <Text style={styles.dashboardButtonText}>Accéder au Cercle</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  successHeader: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  circleCard: {
    borderRadius: Spacing.radiusLg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  circleName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  circleRole: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  codeContainer: {
    borderRadius: Spacing.radiusMd,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  codeLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 3,
  },
  durationInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  durationText: {
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: Spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
  },
  shareButton: {
    borderWidth: 0,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  instructionsCard: {
    borderRadius: Spacing.radiusMd,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.screenHorizontal,
    paddingBottom: Spacing.xl,
  },
  dashboardButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: Spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dashboardButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CircleCreatedScreen;
