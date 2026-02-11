/**
 * Écran DuaCategory - Liste des Duas par catégorie avec design premium Sakina
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDua } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import { getDuasByCategory, getCategoryInfo } from '../data';
import type { Dua, DuaCategory } from '../types';

interface DuaCategoryScreenProps {
  navigation?: any;
  route?: {
    params: {
      categoryId: DuaCategory;
    };
  };
}

// ===== PRESSABLE SCALE HELPER =====
const PressableScale = ({ onPress, children }: { onPress: () => void; children: React.ReactNode }) => {
  const scale = useMemo(() => new Animated.Value(1), []);
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export const DuaCategoryScreen: React.FC<DuaCategoryScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors, isDark } = useTheme();
  const { isFavorite, toggleFavorite } = useDua();

  const categoryId = route?.params?.categoryId || 'speciales';
  const categoryInfo = useMemo(() => getCategoryInfo(categoryId), [categoryId]);
  const categoryDuas = useMemo(() => getDuasByCategory(categoryId), [categoryId]);

  const navigateToDuaDetail = (dua: Dua) => {
    if (navigation) navigation.navigate('DuaDetail', { duaId: dua.id });
  };

  const goBack = () => {
    if (navigation) navigation.goBack();
  };

  const headerGradient = isDark
    ? ['#0F2D1E', '#1a4731', '#0F172A'] as const
    : ['#0F4C35', '#16a34a', '#166534'] as const;

  const renderDuaCard = (dua: Dua, index: number) => {
    const isInFavorites = isFavorite(dua.id);
    const importanceColor =
      dua.importance === 'tres-haute'
        ? colors.secondary
        : dua.importance === 'haute'
        ? colors.primary
        : colors.textSecondary;

    return (
      <PressableScale key={dua.id} onPress={() => navigateToDuaDetail(dua)}>
        <View style={[styles.duaCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={[styles.duaCardAccent, { backgroundColor: importanceColor }]} />
          <View style={styles.duaCardContent}>
            <View style={styles.duaCardHeader}>
              <View style={[styles.duaNumberBadge, { backgroundColor: (categoryInfo?.color || colors.primary) + '15' }]}>
                <Text style={[styles.duaNumberText, { color: categoryInfo?.color || colors.primary }]}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.duaArabic, { color: colors.text }]}>
                  {dua.arabicName}
                </Text>
                <Text style={[styles.duaFrench, { color: colors.text }]}>
                  {dua.frenchName}
                </Text>
              </View>
              <Pressable onPress={() => toggleFavorite(dua.id)} hitSlop={10}>
                <Ionicons
                  name={isInFavorites ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isInFavorites ? '#EF4444' : colors.textMuted}
                />
              </Pressable>
            </View>

            <Text style={[styles.duaDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {dua.description}
            </Text>

            <View style={styles.duaCardFooter}>
              <View style={[styles.metaBadge, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.primary }]}>{dua.duration}</Text>
              </View>
              <View style={[styles.metaBadge, { backgroundColor: colors.secondary + '12' }]}>
                <Ionicons name="calendar-outline" size={13} color={colors.secondary} />
                <Text style={[styles.metaText, { color: colors.secondary }]} numberOfLines={1}>{dua.occasion}</Text>
              </View>
            </View>
          </View>
        </View>
      </PressableScale>
    );
  };

  if (!categoryInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Catégorie non trouvée
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ===== PREMIUM HEADER ===== */}
        <LinearGradient colors={headerGradient} style={styles.headerGradient}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerContent}>
            <View style={[styles.headerCategoryIcon, { backgroundColor: categoryInfo.color + '25' }]}>
              <Ionicons name={categoryInfo.icon as any} size={32} color={categoryInfo.color} />
            </View>
            <Text style={styles.headerTitle}>{categoryInfo.frenchName}</Text>
            <Text style={styles.headerArabic}>{categoryInfo.arabicName}</Text>
            <Text style={styles.headerCount}>
              {categoryDuas.length} dua{categoryDuas.length > 1 ? 's' : ''} disponible{categoryDuas.length > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.headerDescriptionContainer}>
            <Text style={styles.headerDescription}>{categoryInfo.description}</Text>
          </View>
        </LinearGradient>

        {/* ===== LISTE DES DUAS ===== */}
        <View style={styles.listContainer}>
          {categoryDuas.map((dua, index) => renderDuaCard(dua, index))}
        </View>

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
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerCategoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerArabic: {
    fontSize: 18,
    color: '#D4AF37',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  headerCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  headerDescriptionContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
  },
  headerDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    textAlign: 'center',
  },

  // --- List ---
  listContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: 20,
    gap: 12,
  },

  // --- Dua Card ---
  duaCard: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  duaCardAccent: {
    width: 4,
  },
  duaCardContent: {
    flex: 1,
    padding: 16,
  },
  duaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  duaNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  duaArabic: {
    fontSize: 17,
    fontWeight: '700',
  },
  duaFrench: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 1,
  },
  duaDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  duaCardFooter: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // --- Other ---
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default DuaCategoryScreen;
