/**
 * Composant temporaire pour tester la connexion Supabase
 * À RETIRER AVANT PRODUCTION
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';

interface SupabaseTestBannerProps {
  onClose?: () => void;
}

export const SupabaseTestBanner: React.FC<SupabaseTestBannerProps> = ({ onClose }) => {
  const { status, errorMessage, latency, retry } = useSupabaseConnection();

  // Couleurs selon le statut
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#10B981';
      case 'connecting': return '#F59E0B';
      case 'error': return '#EF4444';
      case 'not_configured': return '#6B7280';
      default: return '#6B7280';
    }
  };

  // Icône selon le statut
  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return 'checkmark-circle';
      case 'connecting': return 'sync';
      case 'error': return 'close-circle';
      case 'not_configured': return 'warning';
      default: return 'help-circle';
    }
  };

  // Texte selon le statut
  const getStatusText = () => {
    switch (status) {
      case 'connected': return `Supabase connecté${latency ? ` (${latency}ms)` : ''}`;
      case 'connecting': return 'Connexion à Supabase...';
      case 'error': return errorMessage || 'Erreur de connexion';
      case 'not_configured': return 'Supabase non configuré';
      default: return 'Statut inconnu';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
      <View style={styles.content}>
        <Ionicons name={getStatusIcon() as any} size={20} color={getStatusColor()} />
        <Text style={[styles.text, { color: getStatusColor() }]} numberOfLines={2}>
          {getStatusText()}
        </Text>
      </View>
      <View style={styles.actions}>
        {(status === 'error' || status === 'not_configured') && (
          <Pressable onPress={retry} style={styles.retryButton}>
            <Ionicons name="refresh" size={18} color={getStatusColor()} />
          </Pressable>
        )}
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={18} color="#666" />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
});

export default SupabaseTestBanner;
