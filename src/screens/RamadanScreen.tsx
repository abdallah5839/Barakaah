/**
 * Écran Ramadan
 * Affiche les informations et duas du Ramadan
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';

// Calcul de la largeur des cards en grille (2 colonnes avec gap)
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = Spacing.md;
const SCREEN_PADDING = Spacing.screenHorizontal;
const FEATURE_CARD_WIDTH = (SCREEN_WIDTH - (SCREEN_PADDING * 2) - CARD_GAP) / 2;
import { Card } from '../components';
import { duas, getDuasByCategory } from '../data';

// Type pour la navigation
type RootTabParamList = {
  Home: undefined;
  Coran: undefined;
  Prieres: undefined;
  Ramadan: undefined;
  Dua: undefined;
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList, 'Ramadan'>;

export const RamadanScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  // Duas liées au Ramadan
  const ramadanDuas = useMemo(() => {
    return duas.filter(
      dua =>
        dua.id === 'dua-ramadan' ||
        dua.id === 'dua-iftar' ||
        dua.id === 'dua-laylat-qadr'
    );
  }, []);

  // Navigation vers l'onglet Dua
  const goToDuaTab = () => {
    navigation.navigate('Dua');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
            <Ionicons name="moon" size={48} color={colors.secondary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Ramadan Mubarak
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Le mois béni de la miséricorde
          </Text>
        </View>

        {/* Informations sur le module */}
        <View style={styles.section}>
          <Card variant="outlined">
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  Module en cours de développement
                </Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Les fonctionnalités complètes du Ramadan (calendrier, horaires Suhur/Iftar, compteur de jours) seront bientôt disponibles.
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Section Duas du Ramadan */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Duas du Ramadan
            </Text>
            <Pressable onPress={goToDuaTab}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                Voir tout
              </Text>
            </Pressable>
          </View>

          <View style={styles.duasContainer}>
            {ramadanDuas.map(dua => (
              <Pressable
                key={dua.id}
                style={({ pressed }) => [
                  styles.duaCard,
                  { backgroundColor: colors.surface },
                  Shadows.small,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={goToDuaTab}
              >
                <View style={styles.duaCardContent}>
                  <View style={[styles.duaIcon, { backgroundColor: colors.secondary + '20' }]}>
                    <Ionicons name="hand-left-outline" size={20} color={colors.secondary} />
                  </View>
                  <View style={styles.duaInfo}>
                    <Text style={[styles.duaArabic, { color: colors.text }]}>
                      {dua.arabicName}
                    </Text>
                    <Text style={[styles.duaFrench, { color: colors.textSecondary }]}>
                      {dua.frenchName}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Fonctionnalités à venir */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Bientôt disponible
          </Text>

          <View style={styles.featuresGrid}>
            <View style={[styles.featureCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="calendar-outline" size={28} color={colors.primary} />
              <Text style={[styles.featureTitle, { color: colors.text }]}>
                Calendrier
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Suivi des jours
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="sunny-outline" size={28} color={colors.secondary} />
              <Text style={[styles.featureTitle, { color: colors.text }]}>
                Suhur
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Heure du repas
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="moon-outline" size={28} color={colors.accent} />
              <Text style={[styles.featureTitle, { color: colors.text }]}>
                Iftar
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Rupture du jeûne
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="flame-outline" size={28} color={colors.error} />
              <Text style={[styles.featureTitle, { color: colors.text }]}>
                Compteur
              </Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                Jours de jeûne
              </Text>
            </View>
          </View>
        </View>

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
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  seeAllText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  duasContainer: {
    gap: Spacing.sm,
  },
  duaCard: {
    borderRadius: Spacing.radiusMd,
    overflow: 'hidden',
  },
  duaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  duaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaInfo: {
    flex: 1,
  },
  duaArabic: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  duaFrench: {
    fontSize: Typography.sizes.sm,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  featureCard: {
    width: FEATURE_CARD_WIDTH,
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
    alignItems: 'center',
    minHeight: 110, // Hauteur minimale pour uniformité
    ...Shadows.small,
  },
  featureTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  featureDesc: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default RamadanScreen;
