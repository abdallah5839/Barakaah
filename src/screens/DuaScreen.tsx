/**
 * Écran Dua — Liste des invocations avec design luxueux
 * Recherche, catégories avec icônes dorées, favoris étoile dorée
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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDua } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = Spacing.md;
const SCREEN_PADDING = Spacing.screenHorizontal;
const CARD_WIDTH = (SCREEN_WIDTH - (SCREEN_PADDING * 2) - CARD_GAP) / 2;

import {
  duas,
  duaCategories,
  getImportantDuas,
  searchDuas,
  getDuasByCategory,
} from '../data';
import type { Dua, DuaCategory, DuaCategoryInfo } from '../types';

interface DuaScreenProps {
  navigation?: any;
}

export const DuaScreen: React.FC<DuaScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { favorites, isFavorite, toggleFavorite } = useDua();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(true);

  const importantDuas = useMemo(() => getImportantDuas(), []);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchDuas(searchQuery);
  }, [searchQuery]);
  const favoriteDuas = useMemo(() => {
    return duas.filter(dua => favorites.includes(dua.id));
  }, [favorites]);

  const navigateToDuaDetail = useCallback((dua: Dua) => {
    if (navigation) navigation.navigate('DuaDetail', { duaId: dua.id });
  }, [navigation]);

  const navigateToCategory = useCallback((category: DuaCategoryInfo) => {
    if (navigation) navigation.navigate('DuaCategory', { categoryId: category.id });
  }, [navigation]);

  // --- Renderers ---

  const renderImportantDuaCard = (dua: Dua) => {
    const isInFavorites = isFavorite(dua.id);
    const importanceColor = dua.importance === 'tres-haute' ? colors.secondary : colors.primary;

    return (
      <Pressable
        key={dua.id}
        style={({ pressed }) => [
          styles.importantCard,
          { backgroundColor: colors.surface, borderLeftColor: importanceColor },
          Shadows.small,
          pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
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
            <View style={[styles.durationBadge, { backgroundColor: colors.separator }]}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                {dua.duration}
              </Text>
            </View>
            <Pressable onPress={() => toggleFavorite(dua.id)} hitSlop={10}>
              <Ionicons
                name={isInFavorites ? 'star' : 'star-outline'}
                size={22}
                color={isInFavorites ? colors.secondary : colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderCategoryCard = (category: DuaCategoryInfo) => {
    const duasCount = getDuasByCategory(category.id).length;
    return (
      <Pressable
        key={category.id}
        style={({ pressed }) => [
          styles.categoryCard,
          { backgroundColor: colors.surface },
          Shadows.small,
          pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
        ]}
        onPress={() => navigateToCategory(category)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '18' }]}>
          <Ionicons name={category.icon as any} size={22} color={category.color} />
        </View>
        <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>
          {category.frenchName}
        </Text>
        <Text style={[styles.categoryCount, { color: colors.textMuted }]}>
          {duasCount} dua{duasCount > 1 ? 's' : ''}
        </Text>
      </Pressable>
    );
  };

  const renderSearchResultCard = (dua: Dua) => {
    const isInFavorites = isFavorite(dua.id);
    return (
      <Pressable
        key={dua.id}
        style={({ pressed }) => [
          styles.searchResultCard,
          { backgroundColor: colors.surface },
          Shadows.small,
          pressed && { opacity: 0.9 },
        ]}
        onPress={() => navigateToDuaDetail(dua)}
      >
        <View style={styles.searchResultContent}>
          <Text style={[styles.searchResultArabic, { color: colors.text }]}>{dua.arabicName}</Text>
          <Text style={[styles.searchResultFrench, { color: colors.text }]}>{dua.frenchName}</Text>
          <Text style={[styles.searchResultOccasion, { color: colors.textSecondary }]}>{dua.occasion}</Text>
        </View>
        <Pressable onPress={() => toggleFavorite(dua.id)} hitSlop={10}>
          <Ionicons
            name={isInFavorites ? 'star' : 'star-outline'}
            size={20}
            color={isInFavorites ? colors.secondary : colors.textMuted}
          />
        </Pressable>
      </Pressable>
    );
  };

  const renderFavoriteCard = (dua: Dua) => (
    <Pressable
      key={dua.id}
      style={({ pressed }) => [
        styles.favoriteCard,
        { backgroundColor: colors.surface },
        Shadows.small,
        pressed && { opacity: 0.9 },
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
      <Pressable onPress={() => toggleFavorite(dua.id)} hitSlop={10}>
        <Ionicons name="star" size={18} color={colors.secondary} />
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Dua & Invocations
            </Text>
            <Ionicons name="hand-left" size={20} color={colors.secondary} />
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Collection de prières chiites
          </Text>
        </View>

        {/* ===== SEARCH ===== */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Rechercher une dua..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

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
            {/* ===== IMPORTANTES ===== */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Duas Importantes
              </Text>
              <View style={styles.importantDuasContainer}>
                {importantDuas.map(dua => renderImportantDuaCard(dua))}
              </View>
            </View>

            {/* ===== CATEGORIES ===== */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Catégories
              </Text>
              <View style={styles.categoriesGrid}>
                {duaCategories.map(category => renderCategoryCard(category))}
              </View>
            </View>

            {/* ===== FAVORIS ===== */}
            {favoriteDuas.length > 0 && (
              <View style={styles.section}>
                <Pressable
                  style={styles.favoritesHeader}
                  onPress={() => setShowFavorites(!showFavorites)}
                >
                  <View style={styles.favoritesHeaderLeft}>
                    <Ionicons name="star" size={18} color={colors.secondary} />
                    <Text style={[styles.favoritesTitle, { color: colors.text }]}>
                      Mes Favoris ({favoriteDuas.length})
                    </Text>
                  </View>
                  <Ionicons
                    name={showFavorites ? 'chevron-up' : 'chevron-down'}
                    size={18}
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

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // --- Header ---
  header: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    marginTop: 4,
  },

  // --- Search ---
  searchContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.radiusMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    paddingVertical: 2,
  },

  // --- Sections ---
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },

  // --- Important duas ---
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
    fontSize: 18,
    fontWeight: '700',
  },
  importantDuaFrench: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    marginBottom: 4,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Spacing.radiusFull,
  },
  durationText: {
    fontSize: 12,
  },

  // --- Categories ---
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
    minHeight: 110,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 11,
  },

  // --- Search results ---
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
    marginBottom: Spacing.sm,
  },
  searchResultContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  searchResultArabic: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  searchResultFrench: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
    marginBottom: 2,
  },
  searchResultOccasion: {
    fontSize: Typography.sizes.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  // --- Favorites ---
  favoritesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  favoritesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  favoritesTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },
  favoritesContainer: {
    gap: Spacing.sm,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.radiusLg,
  },
  favoriteCardContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  favoriteArabic: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  favoriteFrench: {
    fontSize: Typography.sizes.sm,
  },

  // --- Bottom ---
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default DuaScreen;
