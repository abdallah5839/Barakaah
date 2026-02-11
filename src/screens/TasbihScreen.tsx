/**
 * TasbihScreen - Compteur de prière digital (Tasbih)
 * 5 dhikrs prédéfinis, compteur circulaire animé,
 * retour haptique, objectifs, célébration, persistance AsyncStorage.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Alert,
  Platform,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = 220;
const CIRCLE_STROKE = 10;

const STORAGE_KEY = 'sakina_tasbih_state';

// ===== DHIKR PRESETS =====
interface DhikrPreset {
  id: string;
  arabic: string;
  french: string;
  defaultGoal: number;
}

const DHIKR_PRESETS: DhikrPreset[] = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', french: 'Gloire à Allah', defaultGoal: 100 },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', french: 'Louange à Allah', defaultGoal: 100 },
  { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', french: 'Allah est le plus Grand', defaultGoal: 100 },
  { id: 'lailahaillallah', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', french: 'Pas de divinité sauf Allah', defaultGoal: 100 },
  { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', french: 'Je demande pardon à Allah', defaultGoal: 100 },
];

// ===== PERSISTENCE =====
interface TasbihState {
  currentDhikrId: string;
  count: number;
  goal: number;
  dailyTotal: number;
  lastDate: string;
}

const getToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ===== CIRCULAR PROGRESS (SVG strokeDasharray) =====
const CircularProgress = ({ progress, size, strokeWidth, color, bgColor }: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <Svg width={size} height={size}>
      {/* Background track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bgColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress arc — starts at 12h, fills clockwise */}
      {clampedProgress > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      )}
    </Svg>
  );
};

// ===== MAIN COMPONENT =====
interface TasbihScreenProps {
  navigation?: any;
  isDark?: boolean;
}

export const TasbihScreen: React.FC<TasbihScreenProps> = ({ navigation, isDark = false }) => {
  const colors = isDark ? Colors.dark : Colors.light;

  // State
  const [currentDhikrId, setCurrentDhikrId] = useState('subhanallah');
  const [count, setCount] = useState(0);
  const [goal, setGoal] = useState(100);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [customGoalText, setCustomGoalText] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Animated values
  const tapScale = useRef(new Animated.Value(1)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;

  // Debounce timer for saving
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current dhikr info
  const currentDhikr = DHIKR_PRESETS.find(d => d.id === currentDhikrId) || DHIKR_PRESETS[0];

  // ===== LOAD STATE =====
  useEffect(() => {
    const loadState = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const state: TasbihState = JSON.parse(raw);
          const today = getToday();

          // Fallback 'custom' from old data to first preset
          const dhikrId = state.currentDhikrId === 'custom' ? 'subhanallah' : state.currentDhikrId;
          setCurrentDhikrId(dhikrId);
          setCount(state.count);
          setGoal(state.goal);
          setDailyTotal(state.lastDate === today ? state.dailyTotal : 0);
        }
      } catch { /* ignore */ }
      setLoaded(true);
    };
    loadState();
  }, []);

  // ===== SAVE STATE (debounced) =====
  const saveState = useCallback((newCount: number, newGoal: number, newDhikrId: string, newDailyTotal: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const state: TasbihState = {
          currentDhikrId: newDhikrId,
          count: newCount,
          goal: newGoal,
          dailyTotal: newDailyTotal,
          lastDate: getToday(),
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch { /* ignore */ }
    }, 500);
  }, []);

  // ===== TAP HANDLER =====
  const handleTap = useCallback(() => {
    const newCount = count + 1;
    const newDaily = dailyTotal + 1;
    setCount(newCount);
    setDailyTotal(newDaily);

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Tap animation
    Animated.sequence([
      Animated.timing(tapScale, { toValue: 0.95, duration: 50, useNativeDriver: true }),
      Animated.timing(tapScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    // Celebration when reaching goal
    if (newCount === goal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCelebration(true);
      celebrationScale.setValue(0);
      Animated.spring(celebrationScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => setShowCelebration(false), 2000);
      });
    }

    saveState(newCount, goal, currentDhikrId, newDaily);
  }, [count, goal, dailyTotal, currentDhikrId, saveState, tapScale, celebrationScale]);

  // ===== RESET =====
  const handleReset = useCallback(() => {
    if (count === 0) return;
    Alert.alert(
      'Réinitialiser',
      'Remettre le compteur à zéro ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => {
            setCount(0);
            setShowCelebration(false);
            saveState(0, goal, currentDhikrId, dailyTotal);
          },
        },
      ],
    );
  }, [count, goal, currentDhikrId, dailyTotal, saveState]);

  // ===== GOAL INPUT =====
  const handleOpenGoalModal = useCallback(() => {
    setCustomGoalText(String(goal));
    setShowGoalModal(true);
  }, [goal]);

  const handleGoalSubmit = useCallback(() => {
    const num = parseInt(customGoalText, 10);
    if (!num || num < 1 || num > 9999) {
      Alert.alert('Erreur', 'Entrez un nombre entre 1 et 9999.');
      return;
    }
    if (num === goal) {
      setShowGoalModal(false);
      return;
    }
    setShowGoalModal(false);
    if (count > 0) {
      Alert.alert(
        'Changer l\'objectif',
        'Le compteur sera remis à zéro. Continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            onPress: () => {
              setGoal(num);
              setCount(0);
              setShowCelebration(false);
              saveState(0, num, currentDhikrId, dailyTotal);
            },
          },
        ],
      );
    } else {
      setGoal(num);
      saveState(0, num, currentDhikrId, dailyTotal);
    }
  }, [customGoalText, goal, count, currentDhikrId, dailyTotal, saveState]);

  // ===== SELECT DHIKR =====
  const handleSelectDhikr = useCallback((dhikr: DhikrPreset) => {
    if (dhikr.id === currentDhikrId) return;
    const doSwitch = () => {
      setCurrentDhikrId(dhikr.id);
      setCount(0);
      setGoal(dhikr.defaultGoal);
      setShowCelebration(false);
      saveState(0, dhikr.defaultGoal, dhikr.id, dailyTotal);
    };

    if (count > 0) {
      Alert.alert(
        'Changer de dhikr',
        'Le compteur sera remis à zéro. Continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: doSwitch },
        ],
      );
    } else {
      doSwitch();
    }
  }, [currentDhikrId, count, dailyTotal, saveState]);

  // ===== PROGRESS =====
  const progress = goal > 0 ? count / goal : 0;

  if (!loaded) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ===== HEADER ===== */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable onPress={navigation?.goBack} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Tasbih</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== DHIKR SELECTOR ===== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dhikrRow}
        >
          {DHIKR_PRESETS.map((dhikr) => {
            const isActive = dhikr.id === currentDhikrId;
            return (
              <Pressable
                key={dhikr.id}
                onPress={() => handleSelectDhikr(dhikr)}
                style={[
                  styles.dhikrChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[
                  styles.dhikrChipArabic,
                  { color: isActive ? '#FFF' : colors.text },
                ]}>
                  {dhikr.arabic}
                </Text>
                <Text style={[
                  styles.dhikrChipFrench,
                  { color: isActive ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
                ]} numberOfLines={1}>
                  {dhikr.french}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ===== CURRENT DHIKR DISPLAY ===== */}
        <View style={styles.currentDhikrContainer}>
          <Text style={[styles.currentArabic, { color: colors.text }]}>{currentDhikr.arabic}</Text>
          <Text style={[styles.currentFrench, { color: colors.textSecondary }]}>{currentDhikr.french}</Text>
        </View>

        {/* ===== CIRCULAR COUNTER ===== */}
        <View style={styles.counterContainer}>
          <Animated.View style={{ transform: [{ scale: tapScale }] }}>
            <Pressable onPress={handleTap} style={styles.tapZone}>
              <CircularProgress
                progress={Math.min(progress, 1)}
                size={CIRCLE_SIZE}
                strokeWidth={CIRCLE_STROKE}
                color={colors.primary}
                bgColor={isDark ? colors.border : '#E5E7EB'}
              />
              <View style={styles.counterInner}>
                <Text style={[styles.countText, { color: colors.text }]}>{count}</Text>
                <Text style={[styles.goalText, { color: colors.textMuted }]}>/ {goal}</Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Celebration */}
          {showCelebration && (
            <Animated.View style={[
              styles.celebrationContainer,
              { transform: [{ scale: celebrationScale }] },
            ]}>
              <Text style={[styles.celebrationText, { color: colors.primary }]}>ما شاء الله</Text>
              <Text style={[styles.celebrationSubtext, { color: colors.textSecondary }]}>Ma sha Allah !</Text>
            </Animated.View>
          )}

          <Text style={[styles.tapHint, { color: colors.textMuted }]}>Appuyez pour compter</Text>
        </View>

        {/* ===== CONTROLS ===== */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={handleReset}
            style={[styles.controlButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="refresh-outline" size={22} color={colors.error} />
            <Text style={[styles.controlLabel, { color: colors.text }]}>Reset</Text>
          </Pressable>

          <Pressable
            onPress={handleOpenGoalModal}
            style={[styles.controlButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="flag-outline" size={22} color={colors.primary} />
            <Text style={[styles.controlLabel, { color: colors.text }]}>
              Objectif : {goal}
            </Text>
          </Pressable>
        </View>

        {/* ===== DAILY STATS ===== */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{dailyTotal}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total du jour</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {goal > 0 ? Math.floor(count / goal) : 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Séries complètes</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ===== GOAL MODAL ===== */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowGoalModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surfaceElevated }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Définir l'objectif</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign: 'center', fontSize: 24 }]}
              placeholder="100"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={customGoalText}
              onChangeText={setCustomGoalText}
              autoFocus
              maxLength={4}
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowGoalModal(false)}
                style={[styles.modalButton, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={handleGoalSubmit}
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Confirmer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ===== STYLES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Dhikr selector
  dhikrRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  dhikrChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  dhikrChipArabic: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dhikrChipFrench: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Current dhikr
  currentDhikrContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currentArabic: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  currentFrench: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Counter
  counterContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  tapZone: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
  },
  goalText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: -4,
  },
  tapHint: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
  },

  // Celebration
  celebrationContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  celebrationText: {
    fontSize: 32,
    fontWeight: '700',
  },
  celebrationSubtext: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    marginTop: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats
  statsCard: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH - 64,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TasbihScreen;
