/**
 * Écran DuaDetail - Design premium Sakina
 * Boutons audio désactivés (Bientôt disponible)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useDua } from '../contexts';
import { Spacing } from '../constants';
import { getDuaById } from '../data';

interface DuaDetailScreenProps {
  navigation?: any;
  route?: {
    params: {
      duaId: string;
    };
  };
}

export const DuaDetailScreen: React.FC<DuaDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors, isDark } = useTheme();
  const { isFavorite, toggleFavorite } = useDua();

  const duaId = route?.params?.duaId || 'kumayl';
  const dua = useMemo(() => getDuaById(duaId), [duaId]);

  const goBack = () => {
    if (navigation) navigation.goBack();
  };

  const handleShare = async () => {
    if (!dua) return;
    try {
      await Share.share({
        title: `${dua.frenchName} - ${dua.arabicName}`,
        message: `${dua.frenchName} (${dua.arabicName})\n${dua.description}\n\nPartagé via Sakina`,
      });
    } catch (error) {
      console.error('Erreur de partage:', error);
    }
  };

  const handleToggleFavorite = () => {
    if (dua) toggleFavorite(dua.id);
  };

  const headerGradient = isDark
    ? ['#0F2D1E', '#1a4731', '#0F172A'] as const
    : ['#0F4C35', '#16a34a', '#166534'] as const;

  if (!dua) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Dua non trouvée</Text>
      </View>
    );
  }

  const isInFavorites = isFavorite(dua.id);
  const importanceColor = dua.importance === 'tres-haute' ? colors.secondary : colors.primary;
  const importanceLabel = dua.importance === 'tres-haute' ? 'Très importante' : dua.importance === 'haute' ? 'Importante' : 'Recommandée';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ===== PREMIUM HEADER ===== */}
        <LinearGradient colors={headerGradient} style={styles.headerGradient}>
          <Pressable onPress={goBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={styles.headerArabicTitle}>{dua.arabicName}</Text>
            <Text style={styles.headerFrenchTitle}>{dua.frenchName}</Text>
          </View>

          {/* Info badges */}
          <View style={styles.infoBadgesRow}>
            <View style={styles.infoBadge}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoBadgeText}>{dua.occasion}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoBadgeText}>{dua.duration}</Text>
            </View>
            <View style={[styles.importanceBadge, { backgroundColor: importanceColor + '30' }]}>
              <Text style={[styles.importanceBadgeText, { color: importanceColor }]}>{importanceLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ===== DESCRIPTION ===== */}
        <View style={styles.contentContainer}>
          <View style={[styles.descriptionCard, { backgroundColor: colors.secondary + '10' }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.secondary} />
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {dua.description}
            </Text>
          </View>

          {/* ===== AUDIO BUTTONS (disabled) ===== */}
          <View style={styles.audioButtonsContainer}>
            <View style={styles.disabledAudioButton}>
              <View style={styles.disabledIconCircle}>
                <Ionicons name="volume-high-outline" size={26} color="#9CA3AF" />
              </View>
              <View style={styles.disabledAudioInfo}>
                <Text style={styles.disabledAudioLabel}>Écouter en Arabe</Text>
                <Text style={styles.disabledAudioSublabel}>Bientôt disponible</Text>
              </View>
            </View>

            <View style={styles.disabledAudioButton}>
              <View style={styles.disabledIconCircle}>
                <Ionicons name="volume-high-outline" size={26} color="#9CA3AF" />
              </View>
              <View style={styles.disabledAudioInfo}>
                <Text style={styles.disabledAudioLabel}>Écouter en Français</Text>
                <Text style={styles.disabledAudioSublabel}>Bientôt disponible</Text>
              </View>
            </View>
          </View>

          {/* ===== ACTION BUTTONS ===== */}
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: isInFavorites ? '#EF4444' + '12' : colors.surface }]}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={isInFavorites ? 'heart' : 'heart-outline'}
                size={22}
                color={isInFavorites ? '#EF4444' : colors.textMuted}
              />
              <Text style={[styles.actionButtonText, { color: isInFavorites ? '#EF4444' : colors.text }]}>
                {isInFavorites ? 'Favori' : 'Ajouter'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Partager</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // --- Premium Header ---
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerTitles: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerArabicTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerFrenchTitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  infoBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  infoBadgeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  importanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  importanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Content ---
  contentContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: 16,
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  // --- Disabled Audio Buttons ---
  audioButtonsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  disabledAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
    opacity: 0.6,
  },
  disabledIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledAudioInfo: {
    flex: 1,
  },
  disabledAudioLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  disabledAudioSublabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // --- Action Buttons ---
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // --- Other ---
  bottomSpacer: {
    height: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
});

export default DuaDetailScreen;
