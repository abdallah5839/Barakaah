/**
 * Écran DuaCategory - Liste des Duas par catégorie
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
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

export const DuaCategoryScreen: React.FC<DuaCategoryScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { isFavorite, toggleFavorite } = useDua();

  const categoryId = route?.params?.categoryId || 'speciales';
  const categoryInfo = useMemo(() => getCategoryInfo(categoryId), [categoryId]);
  const categoryDuas = useMemo(() => getDuasByCategory(categoryId), [categoryId]);

  const navigateToDuaDetail = (dua: Dua) => {
    if (navigation) {
      navigation.navigate('DuaDetail', { duaId: dua.id });
    }
  };

  const goBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const renderDuaCard = (dua: Dua) => {
    const isInFavorites = isFavorite(dua.id);
    const importanceColor =
      dua.importance === 'tres-haute'
        ? colors.secondary
        : dua.importance === 'haute'
        ? colors.primary
        : colors.textSecondary;

    return (
      <Pressable
        key={dua.id}
        style={({ pressed }) => [
          styles.duaCard,
          {
            backgroundColor: colors.surface,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          Shadows.small,
        ]}
        onPress={() => navigateToDuaDetail(dua)}
      >
        <View style={styles.duaCardContent}>
          <View style={styles.duaCardHeader}>
            <View
              style={[styles.importanceDot, { backgroundColor: importanceColor }]}
            />
            <Text style={[styles.duaArabic, { color: colors.text }]}>
              {dua.arabicName}
            </Text>
          </View>
          <Text style={[styles.duaFrench, { color: colors.text }]}>
            {dua.frenchName}
          </Text>
          <Text style={[styles.duaDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {dua.description}
          </Text>
          <View style={styles.duaCardFooter}>
            <View style={styles.duaMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {dua.duration}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {dua.occasion}
                </Text>
              </View>
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

  if (!categoryInfo) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Catégorie non trouvée
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <View
            style={[
              styles.categoryIconSmall,
              { backgroundColor: categoryInfo.color + '20' },
            ]}
          >
            <Ionicons
              name={categoryInfo.icon as any}
              size={20}
              color={categoryInfo.color}
            />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {categoryInfo.frenchName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {categoryDuas.length} dua{categoryDuas.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
          {categoryInfo.description}
        </Text>
      </View>

      {/* Liste des Duas */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categoryDuas.map(dua => renderDuaCard(dua))}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
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
  descriptionContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
  },
  categoryDescription: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
  },
  duaCard: {
    borderRadius: Spacing.radiusLg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  duaCardContent: {
    padding: Spacing.lg,
  },
  duaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  importanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  duaArabic: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  duaFrench: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  duaDescription: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
    marginBottom: Spacing.md,
  },
  duaCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duaMeta: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: Typography.sizes.sm,
  },
  errorText: {
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
    marginTop: Spacing['4xl'],
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default DuaCategoryScreen;
