/**
 * Écran DuaDetail - Affichage détaillé d'une Dua
 * Texte en arabe/français/phonétique avec player audio
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Share,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDua } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import { getDuaById } from '../data';
import { AudioPlayer } from '../components';
import type { Dua, DuaSection } from '../types';

interface DuaDetailScreenProps {
  navigation?: any;
  route?: {
    params: {
      duaId: string;
    };
  };
}

export const DuaDetailScreen: React.FC<DuaDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { isFavorite, toggleFavorite, displayPrefs, updateDisplayPrefs } = useDua();

  const duaId = route?.params?.duaId || 'kumayl';
  const dua = useMemo(() => getDuaById(duaId), [duaId]);

  // États locaux
  const [showMenu, setShowMenu] = useState(false);
  const [showArabic, setShowArabic] = useState(displayPrefs.showArabic);
  const [showFrench, setShowFrench] = useState(displayPrefs.showFrench);
  const [showPhonetic, setShowPhonetic] = useState(displayPrefs.showPhonetic);

  // Navigation
  const goBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const navigateToLearningMode = () => {
    setShowMenu(false);
    if (navigation && dua) {
      navigation.navigate('LearningMode', { duaId: dua.id });
    }
  };

  // Toggle préférences et sauvegarder
  const toggleArabic = useCallback(() => {
    const newValue = !showArabic;
    setShowArabic(newValue);
    updateDisplayPrefs({ showArabic: newValue });
  }, [showArabic, updateDisplayPrefs]);

  const toggleFrench = useCallback(() => {
    const newValue = !showFrench;
    setShowFrench(newValue);
    updateDisplayPrefs({ showFrench: newValue });
  }, [showFrench, updateDisplayPrefs]);

  const togglePhonetic = useCallback(() => {
    const newValue = !showPhonetic;
    setShowPhonetic(newValue);
    updateDisplayPrefs({ showPhonetic: newValue });
  }, [showPhonetic, updateDisplayPrefs]);

  // Partage
  const handleShare = async () => {
    if (!dua) return;
    setShowMenu(false);

    const text = dua.sections
      .map(section => {
        let content = '';
        if (showArabic) content += section.arabic + '\n\n';
        if (showFrench) content += section.french + '\n\n';
        if (showPhonetic) content += section.phonetic + '\n\n';
        return content;
      })
      .join('---\n\n');

    try {
      await Share.share({
        title: `${dua.frenchName} - ${dua.arabicName}`,
        message: `${dua.frenchName} (${dua.arabicName})\n\n${text}\n\nPartagé via Barakaah`,
      });
    } catch (error) {
      console.error('Erreur de partage:', error);
    }
  };

  // Copier dans le presse-papier (via partage)
  const handleCopy = async () => {
    if (!dua) return;
    setShowMenu(false);

    const text = dua.sections
      .map(section => {
        let content = '';
        if (showArabic) content += section.arabic + '\n';
        if (showFrench) content += section.french + '\n';
        if (showPhonetic) content += section.phonetic + '\n';
        return content;
      })
      .join('\n---\n');

    // Utiliser Share pour permettre à l'utilisateur de copier
    try {
      await Share.share({
        message: text,
        title: 'Copier le texte',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le texte');
    }
  };

  // Toggle favori
  const handleToggleFavorite = () => {
    if (dua) {
      toggleFavorite(dua.id);
    }
    setShowMenu(false);
  };

  // Rendu d'une section de texte
  const renderSection = (section: DuaSection, index: number) => {
    return (
      <View
        key={section.id}
        style={[styles.sectionContainer, { borderBottomColor: colors.border }]}
      >
        {/* Numéro de section */}
        <View style={[styles.sectionNumber, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.sectionNumberText, { color: colors.primary }]}>
            {index + 1}
          </Text>
        </View>

        {/* Texte arabe */}
        {showArabic && (
          <Text style={[styles.arabicText, { color: colors.text }]}>
            {section.arabic}
          </Text>
        )}

        {/* Phonétique */}
        {showPhonetic && (
          <Text style={[styles.phoneticText, { color: colors.textSecondary }]}>
            {section.phonetic}
          </Text>
        )}

        {/* Traduction française */}
        {showFrench && (
          <Text style={[styles.frenchText, { color: colors.text }]}>
            {section.french}
          </Text>
        )}
      </View>
    );
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

  const isInFavorites = isFavorite(dua.id);
  const importanceColor = dua.importance === 'tres-haute' ? colors.secondary : colors.primary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerArabic, { color: colors.text }]} numberOfLines={1}>
            {dua.arabicName}
          </Text>
          <Text style={[styles.headerFrench, { color: colors.textSecondary }]} numberOfLines={1}>
            {dua.frenchName}
          </Text>
        </View>
        <Pressable onPress={() => setShowMenu(true)} style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Info bar */}
      <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {dua.occasion}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {dua.duration}
          </Text>
        </View>
        <View style={[styles.importanceBadge, { backgroundColor: importanceColor + '20' }]}>
          <Text style={[styles.importanceText, { color: importanceColor }]}>
            {dua.importance === 'tres-haute' ? 'Très importante' : dua.importance === 'haute' ? 'Importante' : 'Recommandée'}
          </Text>
        </View>
      </View>

      {/* Toggles */}
      <View style={[styles.togglesContainer, { backgroundColor: colors.surface }]}>
        <Pressable
          style={[
            styles.toggleButton,
            showArabic && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={toggleArabic}
        >
          <Text
            style={[
              styles.toggleText,
              { color: showArabic ? colors.primary : colors.textSecondary },
            ]}
          >
            عربي
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            showFrench && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={toggleFrench}
        >
          <Text
            style={[
              styles.toggleText,
              { color: showFrench ? colors.primary : colors.textSecondary },
            ]}
          >
            Français
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            showPhonetic && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={togglePhonetic}
        >
          <Text
            style={[
              styles.toggleText,
              { color: showPhonetic ? colors.primary : colors.textSecondary },
            ]}
          >
            Phonétique
          </Text>
        </Pressable>
      </View>

      {/* Contenu scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <View style={[styles.descriptionContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            {dua.description}
          </Text>
        </View>

        {/* Sections de texte */}
        {dua.sections.map((section, index) => renderSection(section, index))}

        {/* Espace pour le player */}
        <View style={styles.playerSpacer} />
      </ScrollView>

      {/* Player audio fixé en bas */}
      <View style={styles.playerContainer}>
        <AudioPlayer
          audioUrl={dua.audioUrl || ''}
          duaId={dua.id}
          reciter={dua.reciter}
        />
      </View>

      {/* Menu modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
            <Pressable
              style={styles.menuItem}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={isInFavorites ? 'heart' : 'heart-outline'}
                size={22}
                color={isInFavorites ? colors.error : colors.text}
              />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {isInFavorites ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Partager
              </Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleCopy}>
              <Ionicons name="copy-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Copier le texte
              </Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={navigateToLearningMode}>
              <Ionicons name="school-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Mode apprentissage
              </Text>
            </Pressable>

            <Pressable
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Annuler
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  headerArabic: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerFrench: {
    fontSize: Typography.sizes.sm,
  },
  menuButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
  },
  importanceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.radiusSm,
  },
  importanceText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  togglesContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.radiusMd,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
  },
  descriptionContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.lg,
  },
  descriptionText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.6,
  },
  sectionContainer: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  sectionNumberText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  arabicText: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.medium,
    textAlign: 'right',
    lineHeight: Typography.sizes['2xl'] * 2,
    marginBottom: Spacing.md,
  },
  phoneticText: {
    fontSize: Typography.sizes.md,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.md * 1.6,
    marginBottom: Spacing.md,
  },
  frenchText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.6,
  },
  playerSpacer: {
    height: 200,
  },
  playerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: Spacing.radiusXl,
    borderTopRightRadius: Spacing.radiusXl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  menuItemText: {
    fontSize: Typography.sizes.md,
  },
  menuItemCancel: {
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
    marginTop: Spacing['4xl'],
  },
});

export default DuaDetailScreen;
