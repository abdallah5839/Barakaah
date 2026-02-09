/**
 * SurahPicker — Sélecteur de sourate avec design luxueux
 * Numéro dans un cercle à bordure dorée, noms arabe/français élégants
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import { surahs, Surah } from '../data';

interface SurahPickerProps {
  selectedSurah: number;
  onSelectSurah: (surahNumber: number) => void;
}

export const SurahPicker: React.FC<SurahPickerProps> = ({
  selectedSurah,
  onSelectSurah,
}) => {
  const { colors } = useTheme();
  const [isModalVisible, setModalVisible] = useState(false);

  const currentSurah = surahs.find((s) => s.number === selectedSurah);

  const handleSelect = (surah: Surah) => {
    onSelectSurah(surah.number);
    setModalVisible(false);
  };

  const renderSurahItem = ({ item }: { item: Surah }) => {
    const isSelected = item.number === selectedSurah;
    return (
      <Pressable
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          styles.surahItem,
          { backgroundColor: isSelected ? colors.primaryLight : colors.surface },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}
      >
        {/* Gold-bordered number circle */}
        <View style={[styles.surahNumberCircle, { borderColor: colors.secondary }]}>
          <Text style={[styles.surahNumberText, { color: colors.secondary }]}>
            {item.number}
          </Text>
        </View>

        <View style={styles.surahInfo}>
          <Text style={[styles.surahArabicName, { color: colors.text }]}>
            {item.arabicName}
          </Text>
          <Text style={[styles.surahFrenchName, { color: colors.textSecondary }]}>
            {item.frenchName}
          </Text>
        </View>

        <View style={styles.surahMeta}>
          <Text style={[styles.surahVerseCount, { color: colors.textMuted }]}>
            {item.versesCount} v.
          </Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.selector,
          Shadows.small,
          { backgroundColor: colors.surface },
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={[styles.selectorNumberCircle, { borderColor: colors.secondary }]}>
          <Text style={[styles.selectorNumberText, { color: colors.secondary }]}>
            {selectedSurah}
          </Text>
        </View>
        <View style={styles.selectorTextCol}>
          <Text style={[styles.selectorArabic, { color: colors.text }]}>
            {currentSurah?.arabicName}
          </Text>
          <Text style={[styles.selectorFrench, { color: colors.textSecondary }]}>
            {currentSurah?.frenchName}
          </Text>
        </View>
        <View style={[styles.selectorChevron, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="chevron-down" size={18} color={colors.primary} />
        </View>
      </Pressable>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Choisir une sourate
            </Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surface }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={surahs}
            renderItem={renderSurahItem}
            keyExtractor={(item) => item.number.toString()}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            )}
            initialScrollIndex={selectedSurah > 5 ? selectedSurah - 3 : 0}
            getItemLayout={(_, index) => ({
              length: 72,
              offset: 72 * index,
              index,
            })}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // --- Selector button ---
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.radiusLg,
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: Spacing.md,
    gap: Spacing.md,
  },
  selectorNumberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectorTextCol: {
    flex: 1,
  },
  selectorArabic: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectorFrench: {
    fontSize: 13,
  },
  selectorChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Modal ---
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  separator: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },

  // --- Surah item ---
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 72,
    gap: Spacing.md,
  },
  surahNumberCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  surahInfo: {
    flex: 1,
  },
  surahArabicName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  surahFrenchName: {
    fontSize: 13,
  },
  surahMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  surahVerseCount: {
    fontSize: 12,
  },
});

export default SurahPicker;
