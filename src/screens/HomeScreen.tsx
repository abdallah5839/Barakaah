/**
 * Écran Home (Accueil)
 * Dashboard principal de l'application Barakaah
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts';
import { useDevice } from '../contexts/DeviceContext';
import { Spacing, Typography, Shadows, APP_NAME } from '../constants';
import { formatDateFrench, getHijriDate } from '../utils';
import { usePrayerTimes } from '../hooks';
import { Card, NextPrayerCard, QuickAccessCard } from '../components';
import { getDuaOfTheDay, getVerseOfTheDay } from '../data';
import { checkUserCircle } from '../services/circleService';
import { CircleNavigator } from '../navigation/CircleNavigator';
import type { Circle, CircleMember } from '../types/circle.types';

// Type pour la navigation
type RootTabParamList = {
  Home: undefined;
  Coran: undefined;
  Prieres: undefined;
  Ramadan: undefined;
  Dua: undefined;
};

type NavigationProp = BottomTabNavigationProp<RootTabParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const { colors, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { deviceId, isReady: deviceReady } = useDevice();
  const [refreshing, setRefreshing] = useState(false);

  // État du cercle de l'utilisateur
  const [userCircle, setUserCircle] = useState<{
    circle: Circle;
    membership: CircleMember;
  } | null>(null);
  const [circleLoading, setCircleLoading] = useState(true);
  const [showCircleModal, setShowCircleModal] = useState(false);

  // Utiliser le hook pour les horaires de prière (mise à jour chaque seconde)
  const {
    nextPrayer,
    countdown,
    countdownString,
    currentTimeAbidjan,
    refresh,
  } = usePrayerTimes();

  // Charger le cercle de l'utilisateur
  const loadUserCircle = useCallback(async () => {
    if (!deviceId) return;
    try {
      const result = await checkUserCircle(deviceId);
      setUserCircle(result);
    } catch (error) {
      console.error('Erreur chargement cercle:', error);
    } finally {
      setCircleLoading(false);
    }
  }, [deviceId]);

  // Charger le cercle au montage
  useEffect(() => {
    if (deviceReady && deviceId) {
      loadUserCircle();
    }
  }, [deviceReady, deviceId, loadUserCircle]);

  // Recharger le cercle quand l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      if (deviceReady && deviceId) {
        loadUserCircle();
      }
    }, [deviceReady, deviceId, loadUserCircle])
  );

  // Date locale du jour — état réactif pour déclencher le recalcul quand la date change
  const getLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const [todayDateStr, setTodayDateStr] = useState(getLocalDate);

  // Mettre à jour la date quand l'écran reprend le focus (ex: lendemain)
  useFocusEffect(
    useCallback(() => {
      const current = getLocalDate();
      setTodayDateStr(prev => prev !== current ? current : prev);
    }, [])
  );

  // Dua du jour (basée sur la date)
  const duaOfTheDay = useMemo(() => getDuaOfTheDay(), [todayDateStr]);

  // Rafraîchir les données
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    await loadUserCircle();
    setRefreshing(false);
  }, [refresh, loadUserCircle]);

  // Verset du jour (basé sur la date - recalculé quand la date change)
  const verseOfTheDay = useMemo(() => {
    console.log('📖 Calcul verset du jour pour:', todayDateStr);
    const verse = getVerseOfTheDay();
    console.log('📖 Verset sélectionné:', verse.surahName, 'v.', verse.verseNumber);
    return verse;
  }, [todayDateStr]);

  // Navigation vers l'onglet Dua
  const goToDuaTab = () => {
    navigation.navigate('Dua');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.appName, { color: colors.text }]}>{APP_NAME}</Text>
            <Text style={[styles.currentTime, { color: colors.textSecondary }]}>
              {currentTimeAbidjan}
            </Text>
          </View>
          <Pressable onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={26}
              color={colors.text}
            />
          </Pressable>
        </View>

        {/* Card prochaine prière avec countdown temps réel */}
        <NextPrayerCard
          prayer={nextPrayer}
          countdown={countdown}
          countdownString={countdownString}
        />

        {/* Date du jour */}
        <Card style={styles.dateCard}>
          <View style={styles.dateContainer}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.primary}
              style={styles.dateIcon}
            />
            <View>
              <Text style={[styles.dateGregorian, { color: colors.text }]}>
                {formatDateFrench()}
              </Text>
              <Text style={[styles.dateHijri, { color: colors.secondary }]}>
                {getHijriDate()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Dua du jour */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Dua du jour
            </Text>
            <Pressable onPress={goToDuaTab}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                Voir tout
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={goToDuaTab}
            style={({ pressed }) => [
              styles.duaCard,
              { backgroundColor: colors.surface },
              Shadows.small,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.duaCardContent}>
              <View style={[styles.duaIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="hand-left" size={24} color={colors.primary} />
              </View>
              <View style={styles.duaInfo}>
                <Text style={[styles.duaArabicName, { color: colors.text }]}>
                  {duaOfTheDay.arabicName}
                </Text>
                <Text style={[styles.duaFrenchName, { color: colors.text }]}>
                  {duaOfTheDay.frenchName}
                </Text>
                <Text style={[styles.duaOccasion, { color: colors.textSecondary }]}>
                  {duaOfTheDay.occasion}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {/* Verset du jour */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Verset du jour
          </Text>
          <Card variant="outlined">
            <Text style={[styles.verseArabic, { color: colors.text }]}>
              {verseOfTheDay.arabic}
            </Text>
            <Text style={[styles.verseText, { color: colors.text }]}>
              {verseOfTheDay.french}
            </Text>
            <Text style={[styles.verseReference, { color: colors.textSecondary }]}>
              {verseOfTheDay.surahName} - Verset {verseOfTheDay.verseNumber}
            </Text>
          </Card>
        </View>

        {/* Carte Cercle de Lecture */}
        <View style={styles.sectionContainer}>
          <Pressable
            onPress={() => setShowCircleModal(true)}
            style={({ pressed }) => [
              styles.circleCard,
              { backgroundColor: colors.surface },
              Shadows.small,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.circleCardContent}>
              <View style={[styles.circleIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="people" size={24} color={colors.primary} />
              </View>
              <View style={styles.circleInfo}>
                {userCircle ? (
                  <>
                    <Text style={[styles.circleTitle, { color: colors.text }]}>
                      {userCircle.circle.name}
                    </Text>
                    <Text style={[styles.circleSubtitle, { color: colors.textSecondary }]}>
                      {userCircle.circle.completed_juz}/30 Juz ({Math.round((userCircle.circle.completed_juz / 30) * 100)}%)
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.circleTitle, { color: colors.text }]}>
                      Cercle de Lecture
                    </Text>
                    <Text style={[styles.circleSubtitle, { color: colors.textSecondary }]}>
                      Lisez le Coran en famille
                    </Text>
                  </>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {/* Accès rapides */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Accès rapides
          </Text>
          <View style={styles.quickAccessGrid}>
            <View style={styles.quickAccessRow}>
              <QuickAccessCard
                icon="book-outline"
                label="Coran"
                onPress={() => navigation.navigate('Coran')}
              />
              <QuickAccessCard
                icon="time-outline"
                label="Prières"
                onPress={() => navigation.navigate('Prieres')}
              />
            </View>
            <View style={styles.quickAccessRow}>
              <QuickAccessCard
                icon="moon-outline"
                label="Ramadan"
                onPress={() => navigation.navigate('Ramadan')}
              />
              <QuickAccessCard
                icon="hand-left-outline"
                label="Dua"
                onPress={() => navigation.navigate('Dua')}
              />
            </View>
          </View>
        </View>

        {/* Espacement en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal Cercle de Lecture */}
      <Modal
        visible={showCircleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCircleModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header du modal avec bouton fermer */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => setShowCircleModal(false)}
              style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          {/* Contenu du module Cercle */}
          <CircleNavigator />
        </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  currentTime: {
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.xs,
  },
  themeButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCard: {
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: Spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: Spacing.md,
  },
  dateGregorian: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  dateHijri: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  sectionContainer: {
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
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.md,
  },
  duaCard: {
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
  },
  duaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  duaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaInfo: {
    flex: 1,
  },
  duaArabicName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  duaFrenchName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  duaOccasion: {
    fontSize: Typography.sizes.sm,
  },
  verseArabic: {
    fontSize: 22,
    lineHeight: 36,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    marginBottom: Spacing.sm,
  },
  verseText: {
    fontSize: Typography.sizes.md,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.md * 1.6,
    marginBottom: Spacing.sm,
  },
  verseReference: {
    fontSize: Typography.sizes.sm,
    textAlign: 'right',
  },
  quickAccessGrid: {
    marginTop: Spacing.xs,
  },
  quickAccessRow: {
    flexDirection: 'row',
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
  // Styles pour la carte Cercle
  circleCard: {
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
  },
  circleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  circleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInfo: {
    flex: 1,
  },
  circleTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  circleSubtitle: {
    fontSize: Typography.sizes.sm,
  },
  // Styles pour le modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
