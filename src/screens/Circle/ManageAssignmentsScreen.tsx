/**
 * Écran de gestion des assignations de Juz
 * Grille 6x5 pour assigner les 30 Juz aux membres du cercle
 * Accessible uniquement par l'organisateur
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing, Shadows } from '../../constants';
import {
  getCircleMembers,
  getCircleAssignments,
  assignJuzToMember,
  unassignJuz,
  removeMemberFromCircle,
} from '../../services/circleService';
import type { CircleMember, CircleAssignment } from '../../types/circle.types';

const GRID_COLUMNS = 6;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 8;
const GRID_PADDING = Spacing.screenHorizontal;
const CELL_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
);

// Couleurs pastel pour différencier les membres
const MEMBER_COLORS = [
  '#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#E11D48', '#7C3AED', '#0EA5E9', '#D946EF', '#84CC16',
  '#FB923C', '#A855F7', '#22D3EE', '#F43F5E', '#34D399',
  '#818CF8', '#FB7185', '#38BDF8', '#C084FC', '#4ADE80',
  '#FBBF24', '#2DD4BF', '#A78BFA', '#F87171', '#60A5FA',
];

export const ManageAssignmentsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { goBack, currentRoute } = useCircleNavigation();

  // Extraire les params
  const params = 'params' in currentRoute ? (currentRoute as any).params : {};
  const circleId: string = params?.circleId || '';

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [assignments, setAssignments] = useState<CircleAssignment[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showMemberList, setShowMemberList] = useState(false);
  // Changements en attente : Map<juzNumber, memberId | null>
  const [pendingChanges, setPendingChanges] = useState<Map<number, string | null>>(new Map());

  // Charger les données
  const loadData = useCallback(async () => {
    if (!circleId) return;
    try {
      const [membersData, assignmentsData] = await Promise.all([
        getCircleMembers(circleId),
        getCircleAssignments(circleId),
      ]);
      setMembers(membersData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [circleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map membre -> couleur
  const memberColorMap = new Map<string, string>();
  members.forEach((m, i) => {
    memberColorMap.set(m.id, MEMBER_COLORS[i % MEMBER_COLORS.length]);
  });

  // Initiale d'un membre
  const getMemberInitial = (memberId: string): string => {
    const member = members.find(m => m.id === memberId);
    if (!member) return '?';
    return member.nickname.charAt(0).toUpperCase();
  };

  // Nom d'un membre
  const getMemberName = (memberId: string): string => {
    const member = members.find(m => m.id === memberId);
    return member?.nickname || '?';
  };

  // Déterminer l'état effectif d'un Juz (prenant en compte les modifications pendantes)
  const getEffectiveAssignment = (juzNumber: number): { memberId: string | null; status: string } => {
    if (pendingChanges.has(juzNumber)) {
      const pendingMemberId = pendingChanges.get(juzNumber)!;
      return {
        memberId: pendingMemberId,
        status: pendingMemberId ? 'assigned' : 'unassigned',
      };
    }
    const assignment = assignments.find(a => a.juz_number === juzNumber);
    return {
      memberId: assignment?.member_id || null,
      status: assignment?.status || 'unassigned',
    };
  };

  // Tap sur un Juz
  const handleJuzPress = (juzNumber: number) => {
    if (!selectedMemberId) {
      Alert.alert('Sélectionne un membre', 'Choisis d\'abord un membre dans la liste ci-dessus.');
      return;
    }

    const effective = getEffectiveAssignment(juzNumber);

    // Si le Juz est complété, on ne peut pas le réassigner
    const original = assignments.find(a => a.juz_number === juzNumber);
    if (original?.status === 'completed') {
      Alert.alert('Juz terminé', 'Ce Juz a déjà été complété et ne peut pas être réassigné.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (effective.memberId === selectedMemberId) {
      // Désassigner (toggle off)
      setPendingChanges(prev => new Map(prev).set(juzNumber, null));
    } else {
      // Assigner au membre sélectionné
      setPendingChanges(prev => new Map(prev).set(juzNumber, selectedMemberId));
    }
  };

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (pendingChanges.size === 0) {
      goBack();
      return;
    }

    setIsSaving(true);
    try {
      let errors = 0;
      for (const [juzNumber, memberId] of pendingChanges.entries()) {
        if (memberId) {
          const result = await assignJuzToMember({
            circleId,
            juzNumber,
            memberId,
          });
          if (!result.success) errors++;
        } else {
          const result = await unassignJuz({ circleId, juzNumber });
          if (!result.success) errors++;
        }
      }

      if (errors > 0) {
        Alert.alert('Attention', `${errors} assignation(s) ont échoué.`);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setPendingChanges(new Map());
      goBack();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications.');
    } finally {
      setIsSaving(false);
    }
  };

  // Retirer un membre
  const handleRemoveMember = (member: CircleMember) => {
    if (member.is_organizer) {
      Alert.alert('Impossible', 'L\'organisateur ne peut pas être retiré du cercle.');
      return;
    }

    Alert.alert(
      'Retirer du cercle',
      `Retirer ${member.nickname} du cercle ? Ses Juz seront désassignés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            const result = await removeMemberFromCircle({
              circleId,
              memberId: member.id,
            });
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Nettoyer les pending changes pour ce membre
              setPendingChanges(prev => {
                const updated = new Map(prev);
                for (const [juz, mid] of updated.entries()) {
                  if (mid === member.id) updated.delete(juz);
                }
                return updated;
              });
              if (selectedMemberId === member.id) {
                setSelectedMemberId(null);
              }
              // Recharger les données
              await loadData();
            } else {
              Alert.alert('Erreur', result.error || 'Impossible de retirer le membre.');
            }
          },
        },
      ]
    );
  };

  // Nombre de changements en attente
  const pendingCount = pendingChanges.size;

  // Compter les Juz assignés au membre sélectionné (effectif)
  const getSelectedMemberJuzCount = (): number => {
    if (!selectedMemberId) return 0;
    let count = 0;
    for (let j = 1; j <= 30; j++) {
      const eff = getEffectiveAssignment(j);
      if (eff.memberId === selectedMemberId) count++;
    }
    return count;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              if (pendingCount > 0) {
                Alert.alert(
                  'Modifications non sauvegardées',
                  `Tu as ${pendingCount} modification(s) en attente. Quitter sans sauvegarder ?`,
                  [
                    { text: 'Rester', style: 'cancel' },
                    { text: 'Quitter', style: 'destructive', onPress: goBack },
                  ]
                );
              } else {
                goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Gérer les Assignations
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Sélectionne un membre puis tape sur les Juz
          </Text>
        </View>

        {/* Sélecteur de membre */}
        <View style={styles.selectorSection}>
          <Text style={[styles.selectorLabel, { color: colors.text }]}>Assigner à :</Text>
          <Pressable
            style={[
              styles.selectorButton,
              {
                backgroundColor: colors.surface,
                borderColor: selectedMemberId
                  ? memberColorMap.get(selectedMemberId) || colors.primary
                  : colors.border,
              },
            ]}
            onPress={() => setShowMemberList(!showMemberList)}
          >
            {selectedMember ? (
              <View style={styles.selectorContent}>
                <View
                  style={[
                    styles.selectorDot,
                    { backgroundColor: memberColorMap.get(selectedMemberId!) || colors.primary },
                  ]}
                />
                <Text style={[styles.selectorText, { color: colors.text }]}>
                  {selectedMember.nickname}
                </Text>
                <Text style={[styles.selectorCount, { color: colors.textSecondary }]}>
                  ({getSelectedMemberJuzCount()} Juz)
                </Text>
              </View>
            ) : (
              <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                Sélectionner un membre
              </Text>
            )}
            <Ionicons
              name={showMemberList ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>

          {/* Liste déroulante des membres */}
          {showMemberList && (
            <View style={[styles.memberDropdown, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.medium]}>
              {members.map((member) => {
                const isSelected = member.id === selectedMemberId;
                const memberColor = memberColorMap.get(member.id) || colors.primary;
                // Compter Juz effectifs de ce membre
                let juzCount = 0;
                for (let j = 1; j <= 30; j++) {
                  const eff = getEffectiveAssignment(j);
                  if (eff.memberId === member.id) juzCount++;
                }
                return (
                  <View key={member.id} style={styles.dropdownItemRow}>
                    <Pressable
                      style={[
                        styles.dropdownItem,
                        isSelected && { backgroundColor: memberColor + '15' },
                      ]}
                      onPress={() => {
                        setSelectedMemberId(member.id);
                        setShowMemberList(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View style={[styles.dropdownDot, { backgroundColor: memberColor }]} />
                      <Text style={[styles.dropdownName, { color: colors.text }]}>
                        {member.nickname}
                      </Text>
                      {member.is_organizer && (
                        <View style={[styles.dropdownBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.dropdownBadgeText, { color: colors.primary }]}>Org.</Text>
                        </View>
                      )}
                      <Text style={[styles.dropdownJuzCount, { color: colors.textSecondary }]}>
                        {juzCount} Juz
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={memberColor} />
                      )}
                    </Pressable>
                    {/* Bouton retirer (sauf organisateur) */}
                    {!member.is_organizer && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.removeBtn,
                          pressed && { opacity: 0.6 },
                        ]}
                        onPress={() => handleRemoveMember(member)}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Grille des 30 Juz */}
        <View style={styles.gridSection}>
          <View style={styles.grid}>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNumber) => {
              const effective = getEffectiveAssignment(juzNumber);
              const original = assignments.find(a => a.juz_number === juzNumber);
              const isCompleted = original?.status === 'completed';
              const isAssignedToSelected = effective.memberId === selectedMemberId && selectedMemberId !== null;
              const isAssignedToOther = effective.memberId !== null && !isAssignedToSelected;
              const isUnassigned = effective.memberId === null;
              const hasPending = pendingChanges.has(juzNumber);
              const memberColor = effective.memberId ? memberColorMap.get(effective.memberId) || '#999' : '#999';

              let bgColor: string = colors.border + '40'; // gris clair par défaut
              let textColor: string = colors.textSecondary;
              let borderColor: string = 'transparent';
              let initial = '';

              if (isCompleted) {
                bgColor = '#059669' + '30';
                textColor = '#059669';
                borderColor = '#059669';
              } else if (isAssignedToSelected) {
                bgColor = memberColor + '25';
                textColor = memberColor;
                borderColor = memberColor;
              } else if (isAssignedToOther) {
                bgColor = memberColor + '15';
                textColor = memberColor;
                initial = getMemberInitial(effective.memberId!);
              }

              return (
                <Pressable
                  key={juzNumber}
                  style={[
                    styles.juzCell,
                    {
                      backgroundColor: bgColor,
                      borderColor: borderColor,
                      borderWidth: isAssignedToSelected || isCompleted ? 2 : hasPending ? 2 : 0,
                    },
                    hasPending && !isCompleted && { borderColor: colors.primary, borderStyle: 'dashed' as any },
                  ]}
                  onPress={() => handleJuzPress(juzNumber)}
                  disabled={isCompleted}
                >
                  <Text style={[styles.juzNumber, { color: textColor }]}>
                    {juzNumber}
                  </Text>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#059669" />
                  ) : initial ? (
                    <Text style={[styles.juzInitial, { color: textColor }]}>
                      {initial}
                    </Text>
                  ) : isAssignedToSelected ? (
                    <Ionicons name="checkmark" size={12} color={memberColor} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Légende */}
        <View style={styles.legendSection}>
          <Text style={[styles.legendTitle, { color: colors.text }]}>Légende</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: colors.border + '40' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Non assigné</Text>
            </View>
            {selectedMember && (
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, {
                  backgroundColor: (memberColorMap.get(selectedMemberId!) || colors.primary) + '25',
                  borderWidth: 2,
                  borderColor: memberColorMap.get(selectedMemberId!) || colors.primary,
                }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{selectedMember.nickname}</Text>
              </View>
            )}
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#999' + '15' }]}>
                <Text style={{ fontSize: 8, color: '#999', fontWeight: '700' }}>A</Text>
              </View>
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Autre membre</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, {
                backgroundColor: '#059669' + '30',
                borderWidth: 2,
                borderColor: '#059669',
              }]}>
                <Ionicons name="checkmark" size={8} color="#059669" />
              </View>
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Complété</Text>
            </View>
          </View>
        </View>

        {/* Section membres (résumé par membre) */}
        <View style={styles.membersSection}>
          <Text style={[styles.membersSectionTitle, { color: colors.text }]}>
            Résumé par membre
          </Text>
          {members.map(member => {
            const memberColor = memberColorMap.get(member.id) || colors.primary;
            let juzList: number[] = [];
            for (let j = 1; j <= 30; j++) {
              const eff = getEffectiveAssignment(j);
              if (eff.memberId === member.id) juzList.push(j);
            }
            return (
              <View key={member.id} style={[styles.memberSummary, { backgroundColor: colors.surface }, Shadows.small]}>
                <View style={styles.memberSummaryLeft}>
                  <View style={[styles.memberSummaryDot, { backgroundColor: memberColor }]} />
                  <View>
                    <Text style={[styles.memberSummaryName, { color: colors.text }]}>
                      {member.nickname}
                    </Text>
                    <Text style={[styles.memberSummaryJuz, { color: colors.textSecondary }]}>
                      {juzList.length > 0
                        ? `Juz ${juzList.join(', ')}`
                        : 'Aucun Juz'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.memberSummaryCount, { color: memberColor }]}>
                  {juzList.length}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer avec bouton sauvegarder */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: pendingCount > 0 ? colors.primary : colors.surface,
              borderColor: pendingCount > 0 ? colors.primary : colors.border,
              borderWidth: 1,
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            isSaving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={pendingCount > 0 ? '#fff' : colors.primary} />
          ) : (
            <>
              <Ionicons
                name={pendingCount > 0 ? 'save' : 'checkmark'}
                size={22}
                color={pendingCount > 0 ? '#fff' : colors.text}
              />
              <Text style={[
                styles.saveButtonText,
                { color: pendingCount > 0 ? '#fff' : colors.text },
              ]}>
                {pendingCount > 0 ? `Enregistrer (${pendingCount})` : 'Retour'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.lg,
  },
  instructionText: {
    fontSize: 13,
  },
  // Sélecteur de membre
  selectorSection: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.lg,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectorCount: {
    fontSize: 13,
  },
  selectorPlaceholder: {
    fontSize: 15,
  },
  // Dropdown
  memberDropdown: {
    marginTop: Spacing.sm,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  dropdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  dropdownBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dropdownBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dropdownJuzCount: {
    fontSize: 13,
    marginRight: Spacing.sm,
  },
  removeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  // Grille
  gridSection: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  juzCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: Spacing.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  juzNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  juzInitial: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Légende
  legendSection: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.xl,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 12,
  },
  // Section membres
  membersSection: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.xl,
  },
  membersSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  memberSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.sm,
  },
  memberSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  memberSummaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  memberSummaryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberSummaryJuz: {
    fontSize: 12,
    marginTop: 2,
  },
  memberSummaryCount: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.screenHorizontal,
    paddingBottom: Spacing.xl,
  },
  saveButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: Spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default ManageAssignmentsScreen;
