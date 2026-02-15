/**
 * CalendrierHijriScreen - Calendrier islamique hijri
 * Calendrier simple avec les dates Hijri
 */

import React, { useState, useMemo, useCallback } from 'react';
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
import moment from 'moment-hijri';
import { Spacing, Typography } from '../constants';
import { getAdjustedHijriMoment, HIJRI_DAY_OFFSET } from '../utils/hijriOffset';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = 44;
const GRID_HORIZONTAL_PADDING = 16;

// Couleurs
const Colors = {
  light: {
    primary: '#059669',
    secondary: '#D4AF37',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  },
  dark: {
    primary: '#10B981',
    secondary: '#FBBF24',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
  },
};

// Noms des mois hijri en arabe et français
const HIJRI_MONTHS = [
  { ar: 'محرم', fr: 'Muharram' },
  { ar: 'صفر', fr: 'Safar' },
  { ar: 'ربيع الأول', fr: 'Rabi al-Awwal' },
  { ar: 'ربيع الثاني', fr: 'Rabi al-Thani' },
  { ar: 'جمادى الأولى', fr: 'Jumada al-Awwal' },
  { ar: 'جمادى الثانية', fr: 'Jumada al-Thani' },
  { ar: 'رجب', fr: 'Rajab' },
  { ar: 'شعبان', fr: 'Shaban' },
  { ar: 'رمضان', fr: 'Ramadan' },
  { ar: 'شوال', fr: 'Shawwal' },
  { ar: 'ذو القعدة', fr: 'Dhul Qadah' },
  { ar: 'ذو الحجة', fr: 'Dhul Hijjah' },
];

// Jours de la semaine
const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface CalendrierHijriScreenProps {
  navigation?: any;
  isDark?: boolean;
}

export const CalendrierHijriScreen: React.FC<CalendrierHijriScreenProps> = ({
  navigation,
  isDark = false,
}) => {
  const colors = isDark ? Colors.dark : Colors.light;

  // États
  const [currentDate, setCurrentDate] = useState(getAdjustedHijriMoment());

  // Mois hijri actuel
  const hijriMonth = currentDate.iMonth();
  const hijriYear = currentDate.iYear();
  const hijriMonthName = HIJRI_MONTHS[hijriMonth];

  // Jours dans le mois
  const daysInMonth = currentDate.iDaysInMonth();

  // Premier jour du mois (jour de la semaine)
  const firstDayOfMonth = moment().iYear(hijriYear).iMonth(hijriMonth).iDate(1);
  const startDayOfWeek = firstDayOfMonth.day();

  // Générer les jours du calendrier
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];

    // Jours vides avant le premier jour
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [daysInMonth, startDayOfWeek]);

  // Vérifier si aujourd'hui
  const isToday = useCallback((day: number) => {
    const today = getAdjustedHijriMoment();
    return (
      today.iYear() === hijriYear &&
      today.iMonth() === hijriMonth &&
      today.iDate() === day
    );
  }, [hijriYear, hijriMonth]);

  // Navigation mois
  const goToPreviousMonth = () => {
    setCurrentDate(currentDate.clone().subtract(1, 'iMonth'));
  };

  const goToNextMonth = () => {
    setCurrentDate(currentDate.clone().add(1, 'iMonth'));
  };

  const goToToday = () => {
    setCurrentDate(getAdjustedHijriMoment());
  };

  // Retour
  const goBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Calendrier Hijri</Text>
        <Pressable onPress={goToToday} style={styles.todayButton}>
          <Ionicons name="today" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Navigation mois */}
        <View style={[styles.monthNavigation, { backgroundColor: colors.surface }]}>
          <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.monthInfo}>
            <Text style={[styles.monthNameFr, { color: colors.text }]}>
              {hijriMonthName.fr} {hijriYear}
            </Text>
            <Text style={[styles.monthNameAr, { color: colors.textSecondary }]}>
              {hijriMonthName.ar}
            </Text>
          </View>
          <Pressable onPress={goToNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Jours de la semaine */}
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <Text
                style={[
                  styles.weekdayText,
                  { color: index === 5 ? colors.primary : colors.textSecondary },
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Grille du calendrier */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            const isTodayDay = day ? isToday(day) : false;

            return (
              <View
                key={index}
                style={[
                  styles.dayCell,
                  isTodayDay && { backgroundColor: colors.primary + '20' },
                ]}
              >
                {day && (
                  <Text
                    style={[
                      styles.dayText,
                      { color: isTodayDay ? colors.primary : colors.text },
                      isTodayDay && styles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                )}
              </View>
            );
          })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  todayButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.lg,
  },
  navButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthNameFr: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  monthNameAr: {
    fontSize: Typography.sizes.md,
    marginTop: Spacing.xs,
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
  },
  dayCell: {
    width: (SCREEN_WIDTH - GRID_HORIZONTAL_PADDING * 2) / 7,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  dayText: {
    fontSize: 18,
    fontWeight: '500',
  },
  dayTextToday: {
    fontWeight: '700',
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default CalendrierHijriScreen;
