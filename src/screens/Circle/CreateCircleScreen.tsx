/**
 * Écran de création d'un nouveau cercle de lecture
 * Formulaire avec nom, pseudo et date limite
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts';
import { useDevice } from '../../contexts/DeviceContext';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing, Shadows } from '../../constants';
import { createCircle } from '../../services/circleService';

export const CreateCircleScreen: React.FC = () => {
  const { colors } = useTheme();
  const { navigate, goBack } = useCircleNavigation();
  const { deviceId } = useDevice();

  // États du formulaire
  const [circleName, setCircleName] = useState('');
  const [nickname, setNickname] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Par défaut: 30 jours
    return date;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // États de validation
  const [errors, setErrors] = useState<{
    circleName?: string;
    nickname?: string;
    expiresAt?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dates limites
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // Demain minimum
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1); // 1 an maximum

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Valider le nom du cercle
    if (!circleName.trim()) {
      newErrors.circleName = 'Le nom du cercle est requis';
    } else if (circleName.length > 50) {
      newErrors.circleName = 'Maximum 50 caractères';
    }

    // Valider le pseudo
    if (!nickname.trim()) {
      newErrors.nickname = 'Votre pseudo est requis';
    } else if (nickname.length > 20) {
      newErrors.nickname = 'Maximum 20 caractères';
    }

    // Valider la date
    if (expiresAt < minDate) {
      newErrors.expiresAt = 'La date doit être au moins demain';
    } else if (expiresAt > maxDate) {
      newErrors.expiresAt = 'La date ne peut pas dépasser 1 an';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!deviceId) {
      Alert.alert('Erreur', 'Impossible d\'identifier votre appareil');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createCircle({
        name: circleName.trim(),
        organizerNickname: nickname.trim(),
        expiresAt,
        deviceId,
      });

      if (result.success && result.data) {
        // Naviguer vers l'écran de succès
        navigate('CircleCreated', {
          circle: result.data.circle,
          membership: result.data.membership,
        });
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de créer le cercle');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestion du DatePicker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setExpiresAt(selectedDate);
      setErrors(prev => ({ ...prev, expiresAt: undefined }));
    }
  };

  // Formater la date pour l'affichage
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Calculer le nombre de jours restants
  const daysFromNow = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              onPress={goBack}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Créer un Cercle
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Champ Nom du cercle */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nom du cercle
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: errors.circleName ? colors.error : colors.border,
                  },
                ]}
                placeholder="Ex: Cercle familial, Amis de la mosquée..."
                placeholderTextColor={colors.textSecondary}
                value={circleName}
                onChangeText={text => {
                  setCircleName(text);
                  if (errors.circleName) setErrors(prev => ({ ...prev, circleName: undefined }));
                }}
                maxLength={50}
                autoFocus
              />
              <View style={styles.inputFooter}>
                {errors.circleName ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.circleName}
                  </Text>
                ) : (
                  <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                    {circleName.length}/50
                  </Text>
                )}
              </View>
            </View>

            {/* Champ Pseudo */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Ton pseudo
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: errors.nickname ? colors.error : colors.border,
                  },
                ]}
                placeholder="Comment tu veux être appelé ?"
                placeholderTextColor={colors.textSecondary}
                value={nickname}
                onChangeText={text => {
                  setNickname(text);
                  if (errors.nickname) setErrors(prev => ({ ...prev, nickname: undefined }));
                }}
                maxLength={20}
              />
              <View style={styles.inputFooter}>
                {errors.nickname ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.nickname}
                  </Text>
                ) : (
                  <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                    {nickname.length}/20
                  </Text>
                )}
              </View>
            </View>

            {/* Champ Date limite */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Date limite de la Khatma
              </Text>
              <Pressable
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: errors.expiresAt ? colors.error : colors.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                <View style={styles.dateTextContainer}>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(expiresAt)}
                  </Text>
                  <Text style={[styles.daysText, { color: colors.textSecondary }]}>
                    Dans {daysFromNow} jour{daysFromNow > 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
              {errors.expiresAt && (
                <Text style={[styles.errorText, { color: colors.error, marginTop: Spacing.xs }]}>
                  {errors.expiresAt}
                </Text>
              )}
            </View>

            {/* DatePicker */}
            {showDatePicker && (
              <DateTimePicker
                value={expiresAt}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={handleDateChange}
                locale="fr-FR"
              />
            )}

            {/* Info sur le cercle */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                En tant qu'organisateur, tu pourras inviter jusqu'à 29 personnes et gérer les attributions des Juz.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bouton de soumission */}
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.submitButtonText}>Créer le Cercle</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  form: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  charCount: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 13,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
  },
  daysText: {
    fontSize: 13,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: Spacing.screenHorizontal,
    paddingBottom: Spacing.xl,
  },
  submitButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: Spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CreateCircleScreen;
