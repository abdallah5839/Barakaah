/**
 * CalendrierHijriScreen - Calendrier islamique hijri
 * Affiche le calendrier avec les dates importantes
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment-hijri';
import { Spacing, Typography, Shadows } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = (SCREEN_WIDTH - Spacing.screenHorizontal * 2 - 6 * Spacing.xs) / 7;

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
    error: '#DC2626',
  },
  dark: {
    primary: '#10B981',
    secondary: '#FBBF24',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    error: '#EF4444',
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

// Événements islamiques (date hijri : mois-jour)
interface IslamicEvent {
  date: string; // format: "MM-DD"
  name: string;
  type: 'celebration' | 'mourning' | 'special' | 'sacred';
  description: string;
}

const ISLAMIC_EVENTS: IslamicEvent[] = [
  // Muharram (1)
  { date: '01-01', name: 'Nouvel An Hijri', type: 'celebration', description: 'Début de l\'année islamique' },
  { date: '01-09', name: 'Tasua', type: 'mourning', description: 'Veille d\'Ashura' },
  { date: '01-10', name: 'Ashura', type: 'mourning', description: 'Martyre de l\'Imam Hussein (as)' },
  { date: '01-25', name: 'Martyrdom Imam Sajjad', type: 'mourning', description: 'Martyre de l\'Imam Sajjad (as)' },

  // Safar (2)
  { date: '02-07', name: 'Naissance Imam Musa Kadhim', type: 'celebration', description: '7ème Imam' },
  { date: '02-20', name: 'Arbaeen', type: 'mourning', description: '40 jours après Ashura' },
  { date: '02-28', name: 'Wafat du Prophète', type: 'mourning', description: 'Décès du Prophète Muhammad (sawas)' },

  // Rabi al-Awwal (3)
  { date: '03-08', name: 'Martyrdom Imam Hassan Askari', type: 'mourning', description: '11ème Imam' },
  { date: '03-12', name: 'Mawlid an-Nabi', type: 'celebration', description: 'Naissance du Prophète Muhammad (sawas)' },
  { date: '03-17', name: 'Naissance Imam Jafar Sadiq', type: 'celebration', description: '6ème Imam' },

  // Rabi al-Thani (4)
  { date: '04-08', name: 'Naissance Imam Hassan Askari', type: 'celebration', description: '11ème Imam' },

  // Jumada al-Awwal (5)
  { date: '05-05', name: 'Naissance Sayyida Zaynab', type: 'celebration', description: 'Petite-fille du Prophète' },
  { date: '05-13', name: 'Martyrdom Fatima Zahra', type: 'mourning', description: 'Fille du Prophète (sawas)' },

  // Jumada al-Thani (6)
  { date: '06-03', name: 'Martyrdom Fatima Zahra (2)', type: 'mourning', description: 'Autre date rapportée' },
  { date: '06-20', name: 'Naissance Fatima Zahra', type: 'celebration', description: 'Fille du Prophète (sawas)' },

  // Rajab (7)
  { date: '07-01', name: 'Naissance Imam Baqir', type: 'celebration', description: '5ème Imam' },
  { date: '07-03', name: 'Martyrdom Imam Hadi', type: 'mourning', description: '10ème Imam' },
  { date: '07-10', name: 'Naissance Imam Jawad', type: 'celebration', description: '9ème Imam' },
  { date: '07-13', name: 'Naissance Imam Ali', type: 'celebration', description: '1er Imam, né dans la Kaaba' },
  { date: '07-15', name: 'Wafat Sayyida Zaynab', type: 'mourning', description: 'Petite-fille du Prophète' },
  { date: '07-25', name: 'Martyrdom Imam Kadhim', type: 'mourning', description: '7ème Imam' },
  { date: '07-27', name: 'Laylat al-Miraj', type: 'special', description: 'Nuit du voyage nocturne' },

  // Shaban (8)
  { date: '08-03', name: 'Naissance Imam Hussein', type: 'celebration', description: '3ème Imam' },
  { date: '08-04', name: 'Naissance Abul Fadl Abbas', type: 'celebration', description: 'Frère de l\'Imam Hussein' },
  { date: '08-05', name: 'Naissance Imam Sajjad', type: 'celebration', description: '4ème Imam' },
  { date: '08-15', name: 'Naissance Imam Mahdi', type: 'celebration', description: '12ème Imam, l\'Imam caché' },

  // Ramadan (9)
  { date: '09-01', name: 'Début du Ramadan', type: 'sacred', description: 'Mois du jeûne' },
  { date: '09-15', name: 'Naissance Imam Hassan', type: 'celebration', description: '2ème Imam' },
  { date: '09-19', name: 'Blessure Imam Ali', type: 'mourning', description: 'Nuit de Qadr probable' },
  { date: '09-21', name: 'Martyrdom Imam Ali', type: 'mourning', description: '1er Imam' },
  { date: '09-23', name: 'Laylat al-Qadr', type: 'special', description: 'Nuit du Destin (probable)' },

  // Shawwal (10)
  { date: '10-01', name: 'Eid al-Fitr', type: 'celebration', description: 'Fête de la rupture du jeûne' },
  { date: '10-25', name: 'Martyrdom Imam Sadiq', type: 'mourning', description: '6ème Imam' },

  // Dhul Qadah (11)
  { date: '11-01', name: 'Début mois sacré', type: 'sacred', description: 'Mois sacré' },
  { date: '11-11', name: 'Naissance Imam Rida', type: 'celebration', description: '8ème Imam' },
  { date: '11-29', name: 'Martyrdom Imam Jawad', type: 'mourning', description: '9ème Imam' },

  // Dhul Hijjah (12)
  { date: '12-07', name: 'Martyrdom Imam Baqir', type: 'mourning', description: '5ème Imam' },
  { date: '12-09', name: 'Jour d\'Arafat', type: 'special', description: 'Veille de l\'Aïd al-Adha' },
  { date: '12-10', name: 'Eid al-Adha', type: 'celebration', description: 'Fête du Sacrifice' },
  { date: '12-15', name: 'Naissance Imam Hadi', type: 'celebration', description: '10ème Imam' },
  { date: '12-18', name: 'Eid al-Ghadir', type: 'celebration', description: 'Proclamation de l\'Imam Ali comme successeur' },
  { date: '12-24', name: 'Eid al-Mubahala', type: 'special', description: 'Jour de la Mubahala' },
];

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
  const [currentDate, setCurrentDate] = useState(moment());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

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

  // Événements du mois actuel
  const monthEvents = useMemo(() => {
    const monthStr = String(hijriMonth + 1).padStart(2, '0');
    return ISLAMIC_EVENTS.filter((event) => event.date.startsWith(monthStr));
  }, [hijriMonth]);

  // Obtenir les événements d'un jour
  const getEventsForDay = useCallback((day: number) => {
    const monthStr = String(hijriMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${monthStr}-${dayStr}`;
    return ISLAMIC_EVENTS.filter((event) => event.date === dateStr);
  }, [hijriMonth]);

  // Vérifier si aujourd'hui
  const isToday = useCallback((day: number) => {
    const today = moment();
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
    setCurrentDate(moment());
  };

  // Sélection jour
  const handleDayPress = (day: number | null) => {
    if (day) {
      setSelectedDay(day);
      setShowDayModal(true);
    }
  };

  // Retour
  const goBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Couleur selon type d'événement
  const getEventColor = (type: IslamicEvent['type']) => {
    switch (type) {
      case 'celebration':
        return colors.primary;
      case 'mourning':
        return colors.error;
      case 'special':
        return colors.secondary;
      case 'sacred':
        return '#8B5CF6';
      default:
        return colors.textSecondary;
    }
  };

  // Détails du jour sélectionné
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selectedGregorianDate = selectedDay
    ? moment().iYear(hijriYear).iMonth(hijriMonth).iDate(selectedDay).format('DD MMMM YYYY')
    : '';

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

      <ScrollView showsVerticalScrollIndicator={false}>
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
            const events = day ? getEventsForDay(day) : [];
            const hasEvents = events.length > 0;
            const isTodayDay = day ? isToday(day) : false;

            return (
              <Pressable
                key={index}
                style={[
                  styles.dayCell,
                  isTodayDay && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => handleDayPress(day)}
                disabled={!day}
              >
                {day && (
                  <>
                    <Text
                      style={[
                        styles.dayText,
                        { color: isTodayDay ? colors.primary : colors.text },
                        isTodayDay && styles.dayTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasEvents && (
                      <View style={styles.eventDots}>
                        {events.slice(0, 3).map((event, i) => (
                          <View
                            key={i}
                            style={[
                              styles.eventDot,
                              { backgroundColor: getEventColor(event.type) },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Événements du mois */}
        <View style={styles.eventsSection}>
          <Text style={[styles.eventsSectionTitle, { color: colors.text }]}>
            Événements du mois
          </Text>
          {monthEvents.length > 0 ? (
            monthEvents.map((event, index) => (
              <View
                key={index}
                style={[styles.eventCard, { backgroundColor: colors.surface }, Shadows.small]}
              >
                <View
                  style={[styles.eventIndicator, { backgroundColor: getEventColor(event.type) }]}
                />
                <View style={styles.eventContent}>
                  <Text style={[styles.eventDate, { color: colors.textSecondary }]}>
                    {parseInt(event.date.split('-')[1])} {hijriMonthName.fr}
                  </Text>
                  <Text style={[styles.eventName, { color: colors.text }]}>{event.name}</Text>
                  <Text style={[styles.eventDescription, { color: colors.textSecondary }]}>
                    {event.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.eventTypeBadge,
                    { backgroundColor: getEventColor(event.type) + '20' },
                  ]}
                >
                  <Ionicons
                    name={
                      event.type === 'celebration'
                        ? 'star'
                        : event.type === 'mourning'
                        ? 'water'
                        : event.type === 'special'
                        ? 'moon'
                        : 'sparkles'
                    }
                    size={16}
                    color={getEventColor(event.type)}
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.noEvents, { color: colors.textSecondary }]}>
              Aucun événement ce mois
            </Text>
          )}
        </View>

        {/* Légende */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Célébration</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Deuil</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Spécial</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Sacré</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal détails jour */}
      <Modal
        visible={showDayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDayModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDayModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedDay} {hijriMonthName.fr} {hijriYear}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {selectedGregorianDate}
              </Text>
            </View>

            {selectedDayEvents.length > 0 ? (
              <View style={styles.modalEvents}>
                {selectedDayEvents.map((event, index) => (
                  <View
                    key={index}
                    style={[
                      styles.modalEventCard,
                      { borderLeftColor: getEventColor(event.type) },
                    ]}
                  >
                    <Text style={[styles.modalEventName, { color: colors.text }]}>
                      {event.name}
                    </Text>
                    <Text style={[styles.modalEventDesc, { color: colors.textSecondary }]}>
                      {event.description}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.modalNoEvents, { color: colors.textSecondary }]}>
                Aucun événement ce jour
              </Text>
            )}

            <Pressable
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowDayModal(false)}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </Pressable>
          </View>
        </Pressable>
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
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  todayButton: {
    padding: Spacing.xs,
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
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.sm,
  },
  weekdayCell: {
    width: DAY_SIZE,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.screenHorizontal,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DAY_SIZE / 2,
    marginBottom: Spacing.xs,
  },
  dayText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  dayTextToday: {
    fontWeight: Typography.weights.bold,
  },
  eventDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventsSection: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
  },
  eventsSectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.sm,
  },
  eventIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  eventContent: {
    flex: 1,
  },
  eventDate: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.xs,
  },
  eventName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  eventDescription: {
    fontSize: Typography.sizes.sm,
  },
  eventTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  noEvents: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    fontSize: Typography.sizes.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: Typography.sizes.sm,
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenHorizontal,
  },
  modalContent: {
    width: '100%',
    borderRadius: Spacing.radiusLg,
    padding: Spacing.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.md,
    marginTop: Spacing.xs,
  },
  modalEvents: {
    gap: Spacing.md,
  },
  modalEventCard: {
    borderLeftWidth: 4,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalEventName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  modalEventDesc: {
    fontSize: Typography.sizes.sm,
  },
  modalNoEvents: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    fontSize: Typography.sizes.md,
  },
  modalCloseButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radiusMd,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});

export default CalendrierHijriScreen;
