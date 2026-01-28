/**
 * Composant SurahPicker
 * Sélecteur déroulant pour choisir une sourate
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

  const renderSurahItem = ({ item }: { item: Surah }) => (
    <Pressable
      onPress={() => handleSelect(item)}
      style={[
        styles.surahItem,
        {
          backgroundColor:
            item.number === selectedSurah
              ? colors.primary + '15'
              : colors.surface,
        },
      ]}
    >
      <View style={[styles.surahNumber, { backgroundColor: colors.primary }]}>
        <Text style={styles.surahNumberText}>{item.number}</Text>
      </View>
      <View style={styles.surahInfo}>
        <Text style={[styles.surahName, { color: colors.text }]}>
          {item.frenchName}
        </Text>
        <Text style={[styles.surahArabic, { color: colors.textSecondary }]}>
          {item.arabicName} • {item.versesCount} versets
        </Text>
      </View>
      {item.number === selectedSurah && (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      )}
    </Pressable>
  );

  return (
    <>
      {/* Bouton de sélection */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[
          styles.selector,
          Shadows.small,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.selectorContent}>
          <Text style={[styles.selectorNumber, { color: colors.primary }]}>
            {selectedSurah}.
          </Text>
          <Text style={[styles.selectorName, { color: colors.text }]}>
            {currentSurah?.frenchName}
          </Text>
          <Text style={[styles.selectorArabic, { color: colors.textSecondary }]}>
            ({currentSurah?.arabicName})
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      {/* Modal avec liste des sourates */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header du modal */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Choisir une sourate
            </Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </Pressable>
          </View>

          {/* Liste des sourates */}
          <FlatList
            data={surahs}
            renderItem={renderSurahItem}
            keyExtractor={(item) => item.number.toString()}
            contentContainerStyle={styles.listContent}
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 56, // Zone tactile confortable
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: Spacing.md,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorNumber: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginRight: Spacing.sm,
  },
  selectorName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginRight: Spacing.sm,
  },
  selectorArabic: {
    fontSize: Typography.sizes.md,
  },
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
    fontWeight: Typography.weights.bold,
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    minHeight: 64, // Zone tactile confortable pour chaque item
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: Spacing.radiusMd,
  },
  surahNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  surahNumberText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  surahInfo: {
    flex: 1,
  },
  surahName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  surahArabic: {
    fontSize: Typography.sizes.sm,
  },
});

export default SurahPicker;
