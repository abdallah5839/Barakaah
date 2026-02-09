/**
 * Écran Home (Accueil)
 * Dashboard principal — design luxueux moderne avec touches islamiques
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts';
import { useDevice } from '../contexts/DeviceContext';
import { Spacing, Typography, Shadows, APP_NAME } from '../constants';
import { formatDateFrench, getHijriDate } from '../utils';
import { usePrayerTimes } from '../hooks';
import { NextPrayerCard } from '../components';
import { getDuaOfTheDay, getVerseOfTheDay } from '../data';
import { checkUserCircle } from '../services/circleService';
import { CircleNavigator } from '../navigation/CircleNavigator';
import type { Circle, CircleMember } from '../types/circle.types';

type RootTabParamList = {
  Home: undefined;
  Coran: undefined;
  Prieres: undefined;
  Ramadan: undefined;
  Dua: undefined;
};
type NavigationProp = BottomTabNavigationProp<RootTabParamList, 'Home'>;

// --- Animated Card wrapper ---
const AnimatedCard: React.FC<{
  children: React.ReactNode;
  delay?: number;
  onPress?: () => void;
  style?: any;
}> = ({ children, delay = 0, onPress, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  if (onPress) {
    return (
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            style,
            pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
          ]}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
};

export const HomeScreen: React.FC = () => {
  const { colors, toggleTheme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { deviceId, isReady: deviceReady } = useDevice();
  const [refreshing, setRefreshing] = useState(false);

  // Crescent moon animation
  const crescentRotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(crescentRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(crescentRotate, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const crescentInterpolate = crescentRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  // Circle state
  const [userCircle, setUserCircle] = useState<{
    circle: Circle;
    membership: CircleMember;
  } | null>(null);
  const [circleLoading, setCircleLoading] = useState(true);
  const [showCircleModal, setShowCircleModal] = useState(false);

  const {
    nextPrayer,
    countdown,
    countdownString,
    currentTimeAbidjan,
    refresh,
  } = usePrayerTimes();

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

  useEffect(() => {
    if (deviceReady && deviceId) loadUserCircle();
  }, [deviceReady, deviceId, loadUserCircle]);

  useFocusEffect(
    useCallback(() => {
      if (deviceReady && deviceId) loadUserCircle();
    }, [deviceReady, deviceId, loadUserCircle])
  );

  // Date locale
  const getLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const [todayDateStr, setTodayDateStr] = useState(getLocalDate);

  useFocusEffect(
    useCallback(() => {
      const current = getLocalDate();
      setTodayDateStr(prev => prev !== current ? current : prev);
    }, [])
  );

  const duaOfTheDay = useMemo(() => getDuaOfTheDay(), [todayDateStr]);
  const verseOfTheDay = useMemo(() => getVerseOfTheDay(), [todayDateStr]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    await loadUserCircle();
    setRefreshing(false);
  }, [refresh, loadUserCircle]);

  const goToDuaTab = () => navigation.navigate('Dua');

  const circleProgress = userCircle
    ? Math.round((userCircle.circle.completed_juz / 30) * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ===== HEADER ===== */}
        <AnimatedCard delay={0}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerTitleRow}>
                <Text style={[styles.appName, { color: colors.primaryDark }]}>
                  {APP_NAME}
                </Text>
                <Animated.View style={{ transform: [{ rotate: crescentInterpolate }], marginLeft: 8 }}>
                  <Ionicons name="moon" size={22} color={colors.secondary} />
                </Animated.View>
              </View>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {currentTimeAbidjan}
              </Text>
            </View>
            <Pressable
              onPress={toggleTheme}
              style={[styles.themeButton, { backgroundColor: colors.surface }]}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={colors.secondary}
              />
            </Pressable>
          </View>
        </AnimatedCard>

        {/* ===== PROCHAINE PRIERE ===== */}
        <AnimatedCard delay={50}>
          <NextPrayerCard
            prayer={nextPrayer}
            countdown={countdown}
            countdownString={countdownString}
          />
        </AnimatedCard>

        {/* ===== DATE DU JOUR ===== */}
        <AnimatedCard delay={100} style={[styles.dateCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={styles.dateContainer}>
            <View style={[styles.dateIconWrap, { backgroundColor: colors.secondaryLight }]}>
              <Ionicons name="calendar" size={20} color={colors.secondary} />
            </View>
            <View style={styles.dateTexts}>
              <Text style={[styles.dateGregorian, { color: colors.text }]}>
                {formatDateFrench()}
              </Text>
              <Text style={[styles.dateHijri, { color: colors.secondary }]}>
                {getHijriDate()}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* ===== VERSET DU JOUR ===== */}
        <AnimatedCard delay={150} style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Verset du jour
          </Text>
          <View style={[styles.verseCard, { backgroundColor: colors.surface }, Shadows.small]}>
            <View style={[styles.verseGoldBar, { backgroundColor: colors.secondary }]} />
            <View style={styles.verseContent}>
              <Text style={[styles.verseArabic, { color: colors.text }]}>
                {verseOfTheDay.arabic}
              </Text>
              <View style={[styles.verseDivider, { backgroundColor: colors.secondary + '30' }]} />
              <Text style={[styles.verseFrench, { color: colors.textSecondary }]}>
                {verseOfTheDay.french}
              </Text>
              <View style={styles.verseRefRow}>
                <View style={[styles.verseRefBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.verseRefText, { color: colors.primary }]}>
                    {verseOfTheDay.surahName} - Verset {verseOfTheDay.verseNumber}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* ===== DUA DU JOUR ===== */}
        <AnimatedCard delay={200} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Dua du jour
            </Text>
            <Pressable onPress={goToDuaTab} hitSlop={12}>
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
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.duaCardContent}>
              <View style={[styles.duaIconContainer, { backgroundColor: colors.secondaryLight }]}>
                <Ionicons name="hand-left" size={22} color={colors.secondary} />
              </View>
              <View style={styles.duaInfo}>
                <Text style={[styles.duaArabicName, { color: colors.text }]} numberOfLines={1}>
                  {duaOfTheDay.arabicName}
                </Text>
                <Text style={[styles.duaFrenchName, { color: colors.text }]} numberOfLines={1}>
                  {duaOfTheDay.frenchName}
                </Text>
                <Text style={[styles.duaOccasion, { color: colors.textSecondary }]} numberOfLines={1}>
                  {duaOfTheDay.occasion}
                </Text>
              </View>
              <View style={[styles.chevronWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </View>
          </Pressable>
        </AnimatedCard>

        {/* ===== CERCLE DE LECTURE ===== */}
        <AnimatedCard delay={250} onPress={() => setShowCircleModal(true)} style={[styles.circleCard, { backgroundColor: colors.surface }, Shadows.small]}>
          <View style={styles.circleCardContent}>
            <View style={[styles.circleIconContainer, { backgroundColor: colors.secondaryLight }]}>
              <Ionicons name="people" size={22} color={colors.secondary} />
            </View>
            <View style={styles.circleInfo}>
              {userCircle ? (
                <>
                  <Text style={[styles.circleTitle, { color: colors.text }]} numberOfLines={1}>
                    {userCircle.circle.name}
                  </Text>
                  <Text style={[styles.circleSubtitle, { color: colors.textSecondary }]}>
                    {userCircle.circle.completed_juz}/30 Juz
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
              {userCircle && (
                <View style={[styles.circleProgressTrack, { backgroundColor: colors.border }]}>
                  <LinearGradient
                    colors={[colors.secondary, colors.secondaryDark] as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.circleProgressFill, { width: `${circleProgress}%` as any }]}
                  />
                </View>
              )}
            </View>
            <View style={[styles.chevronWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </View>
        </AnimatedCard>

        {/* ===== ACCES RAPIDES ===== */}
        <AnimatedCard delay={300} style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Accès rapides
          </Text>
          <View style={styles.quickGrid}>
            {([
              { icon: 'book-outline' as const, label: 'Coran', tab: 'Coran' as const, gradient: [colors.primary, colors.primaryDark] },
              { icon: 'time-outline' as const, label: 'Prières', tab: 'Prieres' as const, gradient: [colors.primary, colors.primaryDark] },
              { icon: 'moon-outline' as const, label: 'Ramadan', tab: 'Ramadan' as const, gradient: [colors.ramadanGradientStart, colors.ramadanGradientEnd] },
              { icon: 'hand-left-outline' as const, label: 'Dua', tab: 'Dua' as const, gradient: [colors.secondary, colors.secondaryDark] },
            ]).map((item) => (
              <Pressable
                key={item.tab}
                onPress={() => navigation.navigate(item.tab)}
                style={({ pressed }) => [
                  styles.quickItem,
                  { backgroundColor: colors.surface },
                  Shadows.small,
                  pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                ]}
              >
                <LinearGradient
                  colors={item.gradient as [string, string]}
                  style={styles.quickIconWrap}
                >
                  <Ionicons name={item.icon} size={24} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </AnimatedCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ===== MODAL CERCLE ===== */}
      <Modal
        visible={showCircleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCircleModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => setShowCircleModal(false)}
              style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
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

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    marginTop: 4,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Date ---
  dateCard: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.md,
    borderRadius: Spacing.radiusLg,
    padding: Spacing.lg,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dateTexts: {
    flex: 1,
  },
  dateGregorian: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateHijri: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
  },

  // --- Sections ---
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
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },

  // --- Verse of the day ---
  verseCard: {
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  verseGoldBar: {
    width: 4,
  },
  verseContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  verseArabic: {
    fontSize: 22,
    lineHeight: 40,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    marginBottom: Spacing.md,
  },
  verseDivider: {
    height: 1,
    marginBottom: Spacing.md,
  },
  verseFrench: {
    fontSize: Typography.sizes.md,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.md * 1.7,
    marginBottom: Spacing.md,
  },
  verseRefRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  verseRefBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.radiusFull,
  },
  verseRefText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },

  // --- Dua ---
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaInfo: {
    flex: 1,
  },
  duaArabicName: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  duaFrenchName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  duaOccasion: {
    fontSize: Typography.sizes.xs,
  },

  // --- Circle ---
  circleCard: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInfo: {
    flex: 1,
  },
  circleTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  circleSubtitle: {
    fontSize: Typography.sizes.sm,
    marginBottom: 6,
  },
  circleProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  circleProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // --- Chevron ---
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Quick Access ---
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickItem: {
    width: '47%' as any,
    flexGrow: 1,
    borderRadius: Spacing.radiusLg,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },

  // --- Bottom ---
  bottomSpacer: {
    height: Spacing['4xl'],
  },

  // --- Modal ---
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
