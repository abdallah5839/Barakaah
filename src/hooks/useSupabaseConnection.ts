/**
 * Hook de test de connexion à Supabase
 * Utilisé pour valider la configuration avant utilisation du module Cercle
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { ConnectionStatus } from '../types/circle.types';

interface UseSupabaseConnectionResult {
  /** État actuel de la connexion */
  status: ConnectionStatus;
  /** Message d'erreur si erreur */
  errorMessage: string | null;
  /** Latence de la connexion en ms */
  latency: number | null;
  /** Fonction pour retester la connexion */
  retry: () => void;
}

/**
 * Hook pour tester et surveiller la connexion à Supabase
 * @returns État de la connexion et fonction de retry
 */
export const useSupabaseConnection = (): UseSupabaseConnectionResult => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const testConnection = useCallback(async () => {
    // Vérifier d'abord si Supabase est configuré
    if (!isSupabaseConfigured()) {
      setStatus('not_configured');
      setErrorMessage('Supabase non configuré. Veuillez définir les variables d\'environnement.');
      setLatency(null);
      return;
    }

    setStatus('connecting');
    setErrorMessage(null);

    const startTime = Date.now();

    try {
      // Test simple : requête sur une table système ou ping
      // On utilise une requête légère pour tester la connexion
      const { error } = await supabase
        .from('circles')
        .select('count', { count: 'exact', head: true });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (error) {
        // Si la table n'existe pas encore, c'est normal
        // On vérifie si c'est une erreur de connexion ou juste table manquante
        if (error.message.includes('does not exist') || error.code === '42P01') {
          // Table n'existe pas mais connexion OK
          setStatus('connected');
          setLatency(responseTime);
          console.log('✅ [Supabase] Connexion OK (tables non créées)');
        } else {
          throw error;
        }
      } else {
        setStatus('connected');
        setLatency(responseTime);
        console.log(`✅ [Supabase] Connexion établie (${responseTime}ms)`);
      }
    } catch (err: any) {
      setStatus('error');
      setLatency(null);

      // Messages d'erreur plus explicites
      if (err.message?.includes('fetch')) {
        setErrorMessage('Impossible de joindre le serveur Supabase. Vérifiez votre connexion internet.');
      } else if (err.message?.includes('Invalid API key')) {
        setErrorMessage('Clé API Supabase invalide. Vérifiez EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      } else if (err.message?.includes('Invalid URL')) {
        setErrorMessage('URL Supabase invalide. Vérifiez EXPO_PUBLIC_SUPABASE_URL.');
      } else {
        setErrorMessage(err.message || 'Erreur de connexion inconnue');
      }

      console.error('❌ [Supabase] Erreur de connexion:', err.message);
    }
  }, []);

  // Test initial au montage
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  return {
    status,
    errorMessage,
    latency,
    retry: testConnection,
  };
};

export default useSupabaseConnection;
