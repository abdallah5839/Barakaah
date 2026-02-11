/**
 * Écran Dua — Liste des invocations avec design premium Sakina
 * Header gradient, cartes catégories dorées, favoris, recherche
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDua } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
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
  onGoHome?: () => void;
}

// ===== PRESSABLE SCALE HELPER =====
const PressableScale = ({ onPress, style, children }: { onPress: () => void; style?: any; children: React.ReactNode }) => {
  const scale = useMemo(() => new Animated.Value(1), []);
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
      onPress={onPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export const DuaScreen: React.FC<DuaScreenProps> = ({ navigation, onGoHome }) => {
  const { colors, isDark } = useTheme();
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

  // Gradient colors for header
  const headerGradient = isDark
    ? ['#0F2D1E', '#1a4731', '#0F172A'] as const
    : ['#0F4C35', '#16a34a', '#166534'] as const;

  // --- Renderers ---

  const renderImportantDuaCard = (dua: Dua) => {
    const isInFavorites = isFavorite(dua.id);
    const importanceColor = dua.importance === 'tres-haute' ? colors.secondary : colors.primary;

    return (
      <PressableScale key={dua.id} onPress={() => navigateToDuaDetail(dua)}>
        <View style={[styles.importantCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={[styles.importantCardAccent, { backgroundColor: importanceColor }]} />
          <View style={styles.importantCardContent}>
            <View style={styles.importantCardHeader}>
              <View style={[styles.importanceDot, { backgroundColor: importanceColor }]} />
              <Text style={[styles.importantDuaArabic, { color: colors.text }]}>
                {dua.arabicName}
              </Text>
            </View>
            <Text style={[styles.importantDuaFrench, { color: colors.text }]}>
              {dua.frenchName}
            </Text>
            <Text style={[styles.importantDuaOccasion, { color: colors.textSecondary }]} numberOfLines={1}>
              {dua.occasion}
            </Text>
            <View style={styles.importantCardFooter}>
              <View style={[styles.durationBadge, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <Text style={[styles.durationText, { color: colors.primary }]}>{dua.duration}</Text>
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
        </View>
      </PressableScale>
    );
  };

  const renderCategoryCard = (category: DuaCategoryInfo) => {
    const duasCount = getDuasByCategory(category.id).length;
    return (
      <PressableScale key={category.id} onPress={() => navigateToCategory(category)} style={styles.categoryCardWrapper}>
        <View style={[styles.categoryCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '18' }]}>
            <Ionicons name={category.icon as any} size={24} color={category.color} />
          </View>
          <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>
            {category.frenchName}
          </Text>
          <Text style={[styles.categoryArabicName, { color: colors.secondary }]} numberOfLines={1}>
            {category.arabicName}
          </Text>
          <Text style={[styles.categoryCount, { color: colors.textMuted }]}>
            {duasCount} dua{duasCount > 1 ? 's' : ''}
          </Text>
        </View>
      </PressableScale>
    );
  };

  const renderSearchResultCard = (dua: Dua) => {
    const isInFavorites = isFavorite(dua.id);
    return (
      <PressableScale key={dua.id} onPress={() => navigateToDuaDetail(dua)}>
        <View style={[styles.searchResultCard, { backgroundColor: colors.surface }, Shadows.small]}>
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
        </View>
      </PressableScale>
    );
  };

  const renderFavoriteCard = (dua: Dua) => (
    <PressableScale key={dua.id} onPress={() => navigateToDuaDetail(dua)}>
      <View style={[styles.favoriteCard, { backgroundColor: colors.surface }, Shadows.small]}>
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
      </View>
    </PressableScale>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ===== PREMIUM HEADER WITH GRADIENT ===== */}
        <LinearGradient colors={headerGradient} style={styles.headerGradient}>
          {onGoHome && (
            <Pressable onPress={onGoHome} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
          )}
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Duas & Invocations</Text>
              <Text style={styles.headerArabic}>الدعاء</Text>
            </View>
            <View style={styles.headerIconContainer}>
              <Ionicons name="hand-left" size={28} color="#D4AF37" />
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Collection de prières chiites authentiques</Text>

          {/* Search inside header */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une dua..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
              </Pressable>
            )}
          </View>
        </LinearGradient>

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
              <View style={styles.sectionTitleRow}>
                <Ionicons name="diamond" size={16} color={colors.secondary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Duas Essentielles
                </Text>
              </View>
              <View style={styles.importantDuasContainer}>
                {importantDuas.map(dua => renderImportantDuaCard(dua))}
              </View>
            </View>

            {/* ===== CATEGORIES ===== */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="grid" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Catégories
                </Text>
              </View>
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
                    <Ionicons name="star" size={16} color={colors.secondary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // --- Premium Header ---
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerArabic: {
    fontSize: 20,
    color: '#D4AF37',
    fontWeight: '600',
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Search ---
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 2,
  },

  // --- Sections ---
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // --- Important duas ---
  importantDuasContainer: {
    gap: 12,
  },
  importantCard: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  importantCardAccent: {
    width: 4,
  },
  importantCardContent: {
    flex: 1,
    padding: 16,
  },
  importantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  importanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  importantDuaArabic: {
    fontSize: 18,
    fontWeight: '700',
  },
  importantDuaFrench: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  importantDuaOccasion: {
    fontSize: 13,
    marginBottom: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Categories ---
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  categoryCardWrapper: {
    width: CARD_WIDTH,
  },
  categoryCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 130,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  categoryArabicName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '500',
  },

  // --- Search results ---
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  searchResultContent: {
    flex: 1,
    marginRight: 12,
  },
  searchResultArabic: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  searchResultFrench: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  searchResultOccasion: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },

  // --- Favorites ---
  favoritesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  favoritesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoritesContainer: {
    gap: 8,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  favoriteCardContent: {
    flex: 1,
    marginRight: 12,
  },
  favoriteArabic: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  favoriteFrench: {
    fontSize: 13,
  },

  // --- Bottom ---
  bottomSpacer: {
    height: 40,
  },
});

export default DuaScreen;
