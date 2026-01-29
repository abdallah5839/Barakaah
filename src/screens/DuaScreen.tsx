/**
 * Écran Dua - Liste des invocations
 * Recherche, catégories, favoris, Duas importantes
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDua } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';

// Calcul de la largeur des cards en grille (2 colonnes avec gap)
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = Spacing.md;
const SCREEN_PADDING = Spacing.screenHorizontal;
const CARD_WIDTH = (SCREEN_WIDTH - (SCREEN_PADDING * 2) - CARD_GAP) / 2;
import { Card } from '../components';
import {
  duas,
  duaCategories,
  getImportantDuas,
  searchDuas,
  getDuasByCategory,
} from '../data';
import type { Dua, DuaCategory, DuaCategoryInfo } from '../types';

// Props pour la navigation (à configurer avec Stack Navigator)
interface DuaScreenProps {
  navigation?: any;
}

export const DuaScreen: React.FC<DuaScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { favorites, isFavorite, toggleFavorite } = useDua();

  // État de recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(true);

  // Duas importantes (prioritaires)
  const importantDuas = useMemo(() => getImportantDuas(), []);

  // Résultats de recherche
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchDuas(searchQuery);
  }, [searchQuery]);

  // Duas favoris
  const favoriteDuas = useMemo(() => {
    return duas.filter(dua => favorites.includes(dua.id));
  }, [favorites]);

  // Navigation vers détail Dua
  const navigateToDuaDetail = useCallback((dua: Dua) => {
    if (navigation) {
      navigation.navigate('DuaDetail', { duaId: dua.id });
    }
  }, [navigation]);

  // Navigation vers catégorie
  const navigateToCategory = useCallback((category: DuaCategoryInfo) => {
    if (navigation) {
      navigation.navigate('DuaCategory', { categoryId: category.id });
    }
  }, [navigation]);

  // Rendu d'une card Dua importante
  const renderImportantDuaCard = (dua: Dua) => {
    const isInFavorites = isFavorite(dua.id);
    const importanceColor = dua.importance === 'tres-haute' ? colors.secondary : colors.primary;

    return (
      <Pressable
        key={dua.id}
        style={({ pressed }) => [
          styles.importantCard,
          {
            backgroundColor: colors.surface,
            borderLeftColor: importanceColor,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          Shadows.medium,
        ]}
        onPress={() => navigateToDuaDetail(dua)}
      >
        <View style={styles.importantCardContent}>
          <View style={styles.importantCardHeader}>
            <View style={[styles.importanceIndicator, { backgroundColor: importanceColor }]} />
            <Text style={[styles.importantDuaArabic, { color: colors.text }]}>
              {dua.arabicName}
            </Text>
          </View>
          <Text style={[styles.importantDuaFrench, { color: colors.text }]}>
            {dua.frenchName}
          </Text>
          <Text style={[styles.importantDuaOccasion, { color: colors.textSecondary }]}>
            {dua.occasion}
          </Text>
          <View style={styles.importantCardFooter}>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                {dua.duration}
              </Text>
            </View>
            <Pressable
              onPress={() => toggleFavorite(dua.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isInFavorites ? 'heart' : 'heart-outline'}
                size={22}
                color={isInFavorites ? colors.error : colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  // Rendu d'une card catégorie
  const renderCategoryCard = (category: DuaCategoryInfo) => {
    const duasCount = getDuasByCategory(category.id).length;

    return (
      <Pressable
        key={category.id}
        style={({ pressed }) => [
          styles.categoryCard,
          {
            backgroundColor: colors.surface,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          Shadows.small,
        ]}
        onPress={() => navigateToCategory(category)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
          <Ionicons name={category.icon as any} size={24} color={category.color} />
        </View>
        <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>
          {category.frenchName}
        </Text>
        <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
          {duasCount} dua{duasCount > 1 ? 's' : ''}
        </Text>
      </Pressable>
    );
  };

  // Rendu d'une card Dua dans les résultats de recherche
  const renderSearchResultCard = (dua: Dua) => {
    const isInFavorites = isFavorite(dua.id);

    return (
      <Pressable
        key={dua.id}
        style={({ pressed }) => [
          styles.searchResultCard,
          {
            backgroundColor: colors.surface,
            opacity: pressed ? 0.9 : 1,
          },
          Shadows.small,
        ]}
        onPress={() => navigateToDuaDetail(dua)}
      >
        <View style={styles.searchResultContent}>
          <Text style={[styles.searchResultArabic, { color: colors.text }]}>
            {dua.arabicName}
          </Text>
          <Text style={[styles.searchResultFrench, { color: colors.text }]}>
            {dua.frenchName}
          </Text>
          <Text style={[styles.searchResultOccasion, { color: colors.textSecondary }]}>
            {dua.occasion}
          </Text>
        </View>
        <Pressable
          onPress={() => toggleFavorite(dua.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isInFavorites ? 'heart' : 'heart-outline'}
            size={22}
            color={isInFavorites ? colors.error : colors.textSecondary}
          />
        </Pressable>
      </Pressable>
    );
  };

  // Rendu d'une card favoris
  const renderFavoriteCard = (dua: Dua) => {
    return (
      <Pressable
        key={dua.id}
        style={({ pressed }) => [
          styles.favoriteCard,
          {
            backgroundColor: colors.surface,
            opacity: pressed ? 0.9 : 1,
          },
          Shadows.small,
        ]}
        onPress={() => navigateToDuaDetail(dua)}
      >
        <View style={styles.favoriteCardContent}>
          <Text style={[styles.favoriteArabic, { color: colors.text }]} numberOfLines={1}>
            {dua.arabicName}
          </Text>
          <Text style={[styles.favoriteFrench, { color: colors.textSecondary }]} numberOfLines={1}>
            {dua.frenchName}
          </Text>
        </View>
        <Pressable
          onPress={() => toggleFavorite(dua.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="heart" size={20} color={colors.error} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Dua & Invocations
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Collection de prières chiites
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Rechercher une dua..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Résultats de recherche */}
        {searchResults !== null ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Résultats ({searchResults.length})
            </Text>
            {searchResults.length > 0 ? (
              searchResults.map(dua => renderSearchResultCard(dua))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune dua trouvée pour "{searchQuery}"
              </Text>
            )}
          </View>
        ) : (
          <>
            {/* Duas Importantes */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Duas Importantes
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Les invocations les plus significatives
              </Text>
              <View style={styles.importantDuasContainer}>
                {importantDuas.map(dua => renderImportantDuaCard(dua))}
              </View>
            </View>

            {/* Catégories */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Catégories
              </Text>
              <View style={styles.categoriesGrid}>
                {duaCategories.map(category => renderCategoryCard(category))}
              </View>
            </View>

            {/* Favoris */}
            {favoriteDuas.length > 0 && (
              <View style={styles.section}>
                <Pressable
                  style={styles.favoritesHeader}
                  onPress={() => setShowFavorites(!showFavorites)}
                >
                  <View style={styles.favoritesHeaderLeft}>
                    <Ionicons name="heart" size={20} color={colors.error} />
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0, marginLeft: Spacing.sm }]}>
                      Mes Favoris ({favoriteDuas.length})
                    </Text>
                  </View>
                  <Ionicons
                    name={showFavorites ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {showFavorites && (
                  <View style={styles.favoritesContainer}>
                    {favoriteDuas.map(dua => renderFavoriteCard(dua))}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Espacement en bas */}
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
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.lg,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.radiusMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    paddingVertical: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
  },

  // Duas Importantes
  importantDuasContainer: {
    gap: Spacing.md,
  },
  importantCard: {
    borderRadius: Spacing.radiusLg,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  importantCardContent: {
    padding: Spacing.lg,
  },
  importantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  importanceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  importantDuaArabic: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  importantDuaFrench: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  importantDuaOccasion: {
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
  },
  importantCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  durationText: {
    fontSize: Typography.sizes.sm,
  },

  // Catégories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  categoryCard: {
    width: CARD_WIDTH,
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
    alignItems: 'center',
    minHeight: 120, // Hauteur minimale pour uniformité
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  categoryCount: {
    fontSize: Typography.sizes.sm,
  },

  // Résultats de recherche
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.sm,
  },
  searchResultContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  searchResultArabic: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  searchResultFrench: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  searchResultOccasion: {
    fontSize: Typography.sizes.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  // Favoris
  favoritesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  favoritesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoritesContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
  },
  favoriteCardContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  favoriteArabic: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  favoriteFrench: {
    fontSize: Typography.sizes.sm,
  },

  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default DuaScreen;
