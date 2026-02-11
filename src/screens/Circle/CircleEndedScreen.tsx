/**
 * Écran de fin de cercle
 * Affiché quand un cercle expire, est supprimé, ou la Khatma est complète
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing, Shadows } from '../../constants';

type EndReason = 'expired' | 'completed' | 'deleted_by_organizer' | 'left';

export const CircleEndedScreen: React.FC = () => {
  const { colors } = useTheme();
  const { reset, currentRoute } = useCircleNavigation();

  const params = 'params' in currentRoute ? (currentRoute as any).params : {};
  const circleName: string = params?.circleName || 'Cercle';
  const completedJuz: number = params?.completedJuz || 0;
  const totalJuz: number = params?.totalJuz || 30;
  const reason: EndReason = params?.reason || 'expired';

  const percentage = Math.round((completedJuz / totalJuz) * 100);
  const isKhatmaComplete = reason === 'completed' || percentage >= 100;

  const handleDone = () => {
    reset([{ name: 'CircleMain' }]);
  };

  const handleShare = async () => {
    try {
      if (isKhatmaComplete) {
        await Share.share({
          message: 'Alhamdulillah ! Notre cercle de lecture a complété une Khatma du Coran sur Sakina !',
        });
      } else {
        await Share.share({
          message: `Notre cercle "${circleName}" a terminé avec ${completedJuz}/30 Juz lus (${percentage}%) sur Sakina !`,
        });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  // Titre et message selon la raison
  let title = '';
  let subtitle = '';
  let icon: keyof typeof Ionicons.glyphMap = 'time-outline';
  let iconColor: string = colors.textSecondary;

  if (isKhatmaComplete) {
    title = 'Khatma Complète !';
    subtitle = 'Qu\'Allah accepte votre lecture collective';
    icon = 'trophy';
    iconColor = '#F59E0B';
  } else if (reason === 'deleted_by_organizer') {
    title = 'Cercle Supprimé';
    subtitle = 'L\'organisateur a supprimé ce cercle.';
    icon = 'alert-circle-outline';
    iconColor = colors.error;
  } else if (reason === 'left') {
    title = 'Tu as quitté le cercle';
    subtitle = 'Tu peux maintenant créer ou rejoindre un nouveau cercle.';
    icon = 'exit-outline';
    iconColor = colors.textSecondary;
  } else {
    title = 'Cercle Terminé';
    subtitle = 'Ce cercle a expiré et a été supprimé.';
    icon = 'time-outline';
    iconColor = colors.textSecondary;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Icône centrale */}
        <View style={styles.iconSection}>
          <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon} size={56} color={iconColor} />
          </View>
        </View>

        {/* Titre */}
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>

        {/* Nom du cercle */}
        <Text style={[styles.circleName, { color: colors.primary }]}>
          {circleName}
        </Text>

        {/* Résultat */}
        {reason !== 'left' && (
          <View style={styles.resultSection}>
            <Text style={[styles.resultValue, { color: colors.text }]}>
              {completedJuz}/{totalJuz} Juz
            </Text>
            <View style={[styles.resultBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.resultBarFill,
                  {
                    backgroundColor: isKhatmaComplete ? '#059669' : colors.primary,
                    width: `${percentage}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.resultPercentage, { color: colors.textSecondary }]}>
              {percentage}% complété
            </Text>
          </View>
        )}

        {/* Message */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>

        {/* Message d'encouragement */}
        {isKhatmaComplete ? (
          <View style={[styles.messageCard, { backgroundColor: '#059669' + '10' }, Shadows.small]}>
            <Text style={[styles.messageText, { color: '#059669' }]}>
              Félicitations pour cet effort collectif ! Qu'Allah vous récompense et accepte votre lecture.
            </Text>
          </View>
        ) : reason !== 'left' ? (
          <View style={[styles.messageCard, { backgroundColor: colors.surface }, Shadows.small]}>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>
              Félicitations pour vos efforts collectifs ! Tu peux maintenant créer ou rejoindre un nouveau cercle.
            </Text>
          </View>
        ) : null}

        {/* Boutons */}
        <View style={styles.buttonsSection}>
          {(isKhatmaComplete || (reason !== 'left' && percentage > 0)) && (
            <Pressable
              style={({ pressed }) => [
                styles.shareButton,
                { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
              <Text style={[styles.shareButtonText, { color: colors.primary }]}>
                Partager cette réussite
              </Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleDone}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.doneButtonText}>
              {isKhatmaComplete ? 'Terminer' : 'Compris'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing['3xl'],
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  circleName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  resultSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  resultBar: {
    width: '60%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  resultBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  resultPercentage: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  messageCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.xl,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonsSection: {
    gap: Spacing.md,
  },
  shareButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: Spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: Spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CircleEndedScreen;
