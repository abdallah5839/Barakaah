/**
 * Écran pour rejoindre un cercle de lecture existant
 * Formulaire avec code du cercle et pseudo
 */

import React, { useState, useRef } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { useDevice } from '../../contexts/DeviceContext';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing, Shadows } from '../../constants';
import { joinCircle } from '../../services/circleService';

export const JoinCircleScreen: React.FC = () => {
  const { colors } = useTheme();
  const { reset, goBack } = useCircleNavigation();
  const { deviceId } = useDevice();
  const nicknameRef = useRef<TextInput>(null);

  // États du formulaire
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');

  // États de validation
  const [errors, setErrors] = useState<{
    code?: string;
    nickname?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formater le code automatiquement (ajouter le tiret)
  const handleCodeChange = (text: string) => {
    // Retirer tout sauf lettres et chiffres
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Ajouter le tiret après 4 caractères
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.substring(0, 4)}-${cleaned.substring(4, 8)}`;
    }

    setCode(formatted);
    if (errors.code) setErrors(prev => ({ ...prev, code: undefined }));

    // Passer au champ pseudo quand le code est complet
    if (cleaned.length === 8) {
      nicknameRef.current?.focus();
    }
  };

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    const codeRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!code.trim()) {
      newErrors.code = 'Le code du cercle est requis';
    } else if (!codeRegex.test(code.toUpperCase().trim())) {
      newErrors.code = 'Format invalide (XXXX-XXXX)';
    }

    if (!nickname.trim()) {
      newErrors.nickname = 'Ton pseudo est requis';
    } else if (nickname.length > 20) {
      newErrors.nickname = 'Maximum 20 caractères';
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
      const result = await joinCircle({
        code: code.trim(),
        nickname: nickname.trim(),
        deviceId,
      });

      if (result.success && result.data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Naviguer vers le dashboard du cercle
        reset([{ name: 'CircleMain' }]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Afficher l'erreur dans le bon champ
        const errorMsg = result.error || 'Impossible de rejoindre le cercle';

        if (errorMsg.includes('pseudo')) {
          setErrors({ nickname: errorMsg });
        } else if (errorMsg.includes('code') || errorMsg.includes('introuvable') || errorMsg.includes('expiré') || errorMsg.includes('complet')) {
          setErrors({ code: errorMsg });
        } else {
          Alert.alert('Erreur', errorMsg);
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Rejoindre un Cercle
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Illustration */}
          <View style={styles.illustration}>
            <View style={[styles.illustrationIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="enter-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.illustrationText, { color: colors.textSecondary }]}>
              Entre le code reçu de l'organisateur pour rejoindre son cercle
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Champ Code du cercle */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Code du cercle
              </Text>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: errors.code ? colors.error : colors.border,
                  },
                ]}
                placeholder="XXXX-XXXX"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={handleCodeChange}
                maxLength={9}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => nicknameRef.current?.focus()}
              />
              {errors.code && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.code}
                </Text>
              )}
            </View>

            {/* Champ Pseudo */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Ton pseudo
              </Text>
              <TextInput
                ref={nicknameRef}
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
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
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

            {/* Info */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface }, Shadows.small]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Demande le code à l'organisateur du cercle. Il se trouve sur son écran de cercle.
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
                <Ionicons name="enter" size={22} color="#fff" />
                <Text style={styles.submitButtonText}>Rejoindre</Text>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  illustration: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  illustrationIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  illustrationText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  codeInput: {
    height: 64,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
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

export default JoinCircleScreen;
