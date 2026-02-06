/**
 * Écran Ramadan — design luxueux avec croissant doré et touches islamiques
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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import { duas } from '../data';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = Spacing.md;
const SCREEN_PADDING = Spacing.screenHorizontal;
const FEATURE_CARD_WIDTH = (SCREEN_WIDTH - (SCREEN_PADDING * 2) - CARD_GAP) / 2;

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

  const ramadanDuas = useMemo(() => {
    return duas.filter(
      dua =>
        dua.id === 'dua-ramadan' ||
        dua.id === 'dua-iftar' ||
        dua.id === 'dua-laylat-qadr'
    );
  }, []);

  const goToDuaTab = () => navigation.navigate('Dua');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ===== HEADER WITH GRADIENT ===== */}
        <LinearGradient
          colors={[colors.ramadanGradientStart, colors.ramadanGradientEnd] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.crescentWrap}>
              <Ionicons name="moon" size={44} color="#D4AF37" />
            </View>
            <Text style={styles.headerTitle}>Ramadan Mubarak</Text>
            <Text style={styles.headerSubtitle}>Le mois béni de la miséricorde</Text>
            {/* Gold accent line */}
            <View style={styles.headerGoldLine} />
          </View>
        </LinearGradient>

        {/* ===== INFO CARD ===== */}
        <View style={styles.section}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
            <View style={[styles.infoIconWrap, { backgroundColor: colors.secondaryLight }]}>
              <Ionicons name="information-circle" size={20} color={colors.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Module en cours de développement
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Calendrier, horaires Suhur/Iftar et compteur de jours bientôt disponibles.
              </Text>
            </View>
          </View>
        </View>

        {/* ===== DUAS DU RAMADAN ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Duas du Ramadan
            </Text>
            <Pressable onPress={goToDuaTab} hitSlop={12}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
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
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
                onPress={goToDuaTab}
              >
                <View style={styles.duaCardContent}>
                  <View style={[styles.duaIcon, { backgroundColor: colors.secondaryLight }]}>
                    <Ionicons name="hand-left-outline" size={18} color={colors.secondary} />
                  </View>
                  <View style={styles.duaInfo}>
                    <Text style={[styles.duaArabic, { color: colors.text }]} numberOfLines={1}>
                      {dua.arabicName}
                    </Text>
                    <Text style={[styles.duaFrench, { color: colors.textSecondary }]} numberOfLines={1}>
                      {dua.frenchName}
                    </Text>
                  </View>
                  <View style={[styles.chevronWrap, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ===== FEATURES GRID ===== */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Bientôt disponible
          </Text>

          <View style={styles.featuresGrid}>
            {[
              { icon: 'calendar-outline' as const, title: 'Calendrier', desc: 'Suivi des jours', color: colors.primary },
              { icon: 'sunny-outline' as const, title: 'Suhur', desc: 'Heure du repas', color: colors.secondary },
              { icon: 'moon-outline' as const, title: 'Iftar', desc: 'Rupture du jeûne', color: colors.ramadanGradientStart },
              { icon: 'flame-outline' as const, title: 'Compteur', desc: 'Jours de jeûne', color: colors.error },
            ].map((item) => (
              <View
                key={item.title}
                style={[styles.featureCard, { backgroundColor: colors.surface }, Shadows.small]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // --- Header gradient ---
  headerGradient: {
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.screenHorizontal,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  crescentWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.85)',
  },
  headerGoldLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4AF37',
    marginTop: Spacing.lg,
    opacity: 0.7,
  },

  // --- Sections ---
  section: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },

  // --- Info card ---
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: Spacing.radiusLg,
    gap: Spacing.md,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },

  // --- Duas ---
  duasContainer: {
    gap: Spacing.sm,
  },
  duaCard: {
    borderRadius: Spacing.radiusLg,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaInfo: {
    flex: 1,
  },
  duaArabic: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  duaFrench: {
    fontSize: Typography.sizes.sm,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Features grid ---
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
    minHeight: 110,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },

  // --- Bottom ---
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default RamadanScreen;
