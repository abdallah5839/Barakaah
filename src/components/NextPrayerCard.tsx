/**
 * NextPrayerCard — Prochaine prière avec gradient vert et accent doré
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import type { Prayer, CountdownData } from '../hooks';

interface NextPrayerCardProps {
  prayer: Prayer | null;
  countdown: CountdownData;
  countdownString: string;
}

export const NextPrayerCard: React.FC<NextPrayerCardProps> = ({
  prayer,
  countdown,
  countdownString,
}) => {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (countdown.isUrgent) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [countdown.isUrgent, pulseAnim]);

  if (!prayer) return null;

  const gradientColors: [string, string] = countdown.isUrgent
    ? [colors.prayerUrgentStart, colors.prayerUrgentEnd]
    : [colors.prayerGradientStart, colors.prayerGradientEnd];

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <View style={[styles.outerWrap, Shadows.medium]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          {/* Gold accent line at top */}
          <View style={styles.goldAccent} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.label}>Prochaine prière</Text>
            {countdown.isUrgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="alert-circle" size={13} color="#FFF" />
                <Text style={styles.urgentText}>Bientôt</Text>
              </View>
            )}
          </View>

          <View style={styles.content}>
            <View style={styles.prayerInfo}>
              <Text style={styles.prayerName}>{prayer.nameFrench}</Text>
              <Text style={styles.prayerArabic}>{prayer.nameArabic}</Text>
            </View>
            <View style={styles.timeInfo}>
              <Text style={styles.time}>{prayer.timeString}</Text>
              <Text style={[styles.countdown, countdown.isUrgent && styles.urgentCountdown]}>
                {countdownString}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, ((21600 - countdown.totalSeconds) / 21600) * 100)}%` },
                ]}
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerWrap: {
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: Spacing.md,
    borderRadius: Spacing.radiusXl,
    overflow: 'hidden',
  },
  container: {
    padding: Spacing['2xl'],
    paddingTop: Spacing.lg,
  },
  goldAccent: {
    height: 3,
    backgroundColor: '#D4AF37',
    borderRadius: 2,
    marginBottom: Spacing.md,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: Spacing.sm,
    fontWeight: '500',
    flex: 1,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Spacing.radiusFull,
    gap: 4,
  },
  urgentText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  prayerArabic: {
    fontSize: Typography.sizes.lg,
    color: 'rgba(255,255,255,0.8)',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  countdown: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  urgentCountdown: {
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
  },
  progressContainer: {
    marginTop: Spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 2,
  },
});

export default NextPrayerCard;
