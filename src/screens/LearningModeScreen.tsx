/**
 * Écran LearningMode - Mode apprentissage par sections
 * Découpe la Dua en sections pour faciliter la mémorisation
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme, useDua } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import { getDuaById } from '../data';
import type { Dua, DuaSection, DuaLearningProgress } from '../types';

interface LearningModeScreenProps {
  navigation?: any;
  route?: {
    params: {
      duaId: string;
    };
  };
}

export const LearningModeScreen: React.FC<LearningModeScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { getLearningProgress, updateLearningProgress, displayPrefs } = useDua();

  const duaId = route?.params?.duaId || 'kumayl';
  const dua = useMemo(() => getDuaById(duaId), [duaId]);

  // États
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showArabic, setShowArabic] = useState(true);
  const [showFrench, setShowFrench] = useState(false);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Charger la progression sauvegardée
  useEffect(() => {
    if (dua) {
      const progress = getLearningProgress(dua.id);
      if (progress) {
        setCurrentSectionIndex(progress.currentSection);
        setCompletedSections(progress.completedSections);
      }
    }
  }, [dua, getLearningProgress]);

  // Sauvegarder la progression
  const saveProgress = useCallback(() => {
    if (dua) {
      const progress: DuaLearningProgress = {
        duaId: dua.id,
        currentSection: currentSectionIndex,
        totalSections: dua.sections.length,
        completedSections,
        lastAccessed: new Date().toISOString(),
      };
      updateLearningProgress(progress);
    }
  }, [dua, currentSectionIndex, completedSections, updateLearningProgress]);

  // Sauvegarder quand on change de section
  useEffect(() => {
    saveProgress();
  }, [currentSectionIndex, completedSections]);

  // Navigation
  const goBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  // Animation de transition
  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(callback, 150);
  };

  // Section suivante
  const goToNextSection = () => {
    if (!dua || currentSectionIndex >= dua.sections.length - 1) return;
    animateTransition(() => {
      setCurrentSectionIndex(prev => prev + 1);
    });
  };

  // Section précédente
  const goToPreviousSection = () => {
    if (currentSectionIndex <= 0) return;
    animateTransition(() => {
      setCurrentSectionIndex(prev => prev - 1);
    });
  };

  // Marquer section comme complétée
  const markSectionCompleted = () => {
    const sectionId = currentSectionIndex;
    if (!completedSections.includes(sectionId)) {
      setCompletedSections(prev => [...prev, sectionId]);
    }
  };

  // Aller à une section spécifique
  const goToSection = (index: number) => {
    animateTransition(() => {
      setCurrentSectionIndex(index);
    });
  };

  // Révéler la traduction
  const revealFrench = () => {
    setShowFrench(true);
  };

  // Révéler la phonétique
  const revealPhonetic = () => {
    setShowPhonetic(true);
  };

  // Reset pour cette section
  const resetSection = () => {
    setShowFrench(false);
    setShowPhonetic(false);
  };

  if (!dua) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Dua non trouvée
        </Text>
      </SafeAreaView>
    );
  }

  const currentSection = dua.sections[currentSectionIndex];
  const totalSections = dua.sections.length;
  const progress = ((currentSectionIndex + 1) / totalSections) * 100;
  const isCurrentCompleted = completedSections.includes(currentSectionIndex);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Mode Apprentissage
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {dua.frenchName}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Barre de progression */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            Section {currentSectionIndex + 1} / {totalSections}
          </Text>
          <Text style={[styles.completedText, { color: colors.primary }]}>
            {completedSections.length} complétée{completedSections.length > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${progress}%` },
            ]}
          />
        </View>

        {/* Indicateurs de sections */}
        <View style={styles.sectionIndicators}>
          {dua.sections.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => goToSection(index)}
              style={[
                styles.sectionDot,
                {
                  backgroundColor:
                    index === currentSectionIndex
                      ? colors.primary
                      : completedSections.includes(index)
                      ? colors.success
                      : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Contenu de la section */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.sectionContent, { opacity: fadeAnim }]}>
          {/* Texte arabe (toujours visible) */}
          <View style={[styles.textCard, { backgroundColor: colors.surface }, Shadows.small]}>
            <View style={styles.textCardHeader}>
              <Text style={[styles.textLabel, { color: colors.primary }]}>
                Texte Arabe
              </Text>
              {isCurrentCompleted && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              )}
            </View>
            <Text style={[styles.arabicText, { color: colors.text }]}>
              {currentSection.arabic}
            </Text>
          </View>

          {/* Phonétique */}
          {showPhonetic ? (
            <View style={[styles.textCard, { backgroundColor: colors.surface }, Shadows.small]}>
              <Text style={[styles.textLabel, { color: colors.secondary }]}>
                Phonétique
              </Text>
              <Text style={[styles.phoneticText, { color: colors.text }]}>
                {currentSection.phonetic}
              </Text>
            </View>
          ) : (
            <Pressable
              style={[styles.revealButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={revealPhonetic}
            >
              <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.revealButtonText, { color: colors.textSecondary }]}>
                Afficher la phonétique
              </Text>
            </Pressable>
          )}

          {/* Traduction française */}
          {showFrench ? (
            <View style={[styles.textCard, { backgroundColor: colors.surface }, Shadows.small]}>
              <Text style={[styles.textLabel, { color: colors.accent }]}>
                Traduction
              </Text>
              <Text style={[styles.frenchText, { color: colors.text }]}>
                {currentSection.french}
              </Text>
            </View>
          ) : (
            <Pressable
              style={[styles.revealButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={revealFrench}
            >
              <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.revealButtonText, { color: colors.textSecondary }]}>
                Afficher la traduction
              </Text>
            </Pressable>
          )}

          {/* Boutons d'action */}
          <View style={styles.actionButtons}>
            {(showFrench || showPhonetic) && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.border }]}
                onPress={resetSection}
              >
                <Ionicons name="refresh" size={18} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  Cacher les aides
                </Text>
              </Pressable>
            )}

            {!isCurrentCompleted && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
                onPress={markSectionCompleted}
              >
                <Ionicons name="checkmark" size={18} color={colors.success} />
                <Text style={[styles.actionButtonText, { color: colors.success }]}>
                  Marquer comme mémorisée
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Navigation entre sections */}
      <View style={[styles.navigationBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={[
            styles.navButton,
            currentSectionIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={goToPreviousSection}
          disabled={currentSectionIndex === 0}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentSectionIndex === 0 ? colors.textSecondary : colors.text}
          />
          <Text
            style={[
              styles.navButtonText,
              { color: currentSectionIndex === 0 ? colors.textSecondary : colors.text },
            ]}
          >
            Précédent
          </Text>
        </Pressable>

        <View style={styles.navCenter}>
          <Text style={[styles.navCenterText, { color: colors.textSecondary }]}>
            {currentSectionIndex + 1} / {totalSections}
          </Text>
        </View>

        <Pressable
          style={[
            styles.navButton,
            styles.navButtonRight,
            currentSectionIndex === totalSections - 1 && styles.navButtonDisabled,
          ]}
          onPress={goToNextSection}
          disabled={currentSectionIndex === totalSections - 1}
        >
          <Text
            style={[
              styles.navButtonText,
              {
                color:
                  currentSectionIndex === totalSections - 1
                    ? colors.textSecondary
                    : colors.text,
              },
            ]}
          >
            Suivant
          </Text>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={
              currentSectionIndex === totalSections - 1
                ? colors.textSecondary
                : colors.text
            }
          />
        </Pressable>
      </View>
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
    marginRight: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
  },
  headerSpacer: {
    width: 32,
  },
  progressSection: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  completedText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  sectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenHorizontal,
  },
  sectionContent: {
    gap: Spacing.md,
  },
  textCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
  },
  textCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  textLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arabicText: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.medium,
    textAlign: 'right',
    lineHeight: Typography.sizes['2xl'] * 2,
  },
  phoneticText: {
    fontSize: Typography.sizes.lg,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.lg * 1.6,
  },
  frenchText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.6,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  revealButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.radiusMd,
  },
  actionButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  navButtonRight: {
    flexDirection: 'row-reverse',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  navCenter: {
    alignItems: 'center',
  },
  navCenterText: {
    fontSize: Typography.sizes.sm,
  },
  errorText: {
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
    marginTop: Spacing['4xl'],
  },
});

export default LearningModeScreen;
