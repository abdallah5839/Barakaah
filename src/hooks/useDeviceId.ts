/**
 * Hook pour accéder à l'identifiant unique de l'appareil
 * Charge le device ID au montage et le rend disponible
 */

import { useState, useEffect, useCallback } from 'react';
import { getDeviceId, hasDeviceId } from '../services/deviceService';

interface UseDeviceIdResult {
  /** Identifiant unique de l'appareil (null si en cours de chargement) */
  deviceId: string | null;
  /** Indique si le chargement est en cours */
  isLoading: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Fonction pour recharger le device ID */
  refresh: () => Promise<void>;
}

/**
 * Hook pour accéder au device ID
 *
 * @example
 * ```tsx
 * const { deviceId, isLoading } = useDeviceId();
 *
 * if (isLoading) return <Loading />;
 * console.log('Mon device ID:', deviceId);
 * ```
 */
export const useDeviceId = (): UseDeviceIdResult => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeviceId = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const id = await getDeviceId();
      setDeviceId(id);
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement de l\'identifiant';
      setError(errorMessage);
      console.error('❌ [useDeviceId] Erreur:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger le device ID au montage
  useEffect(() => {
    loadDeviceId();
  }, [loadDeviceId]);

  return {
    deviceId,
    isLoading,
    error,
    refresh: loadDeviceId,
  };
};

export default useDeviceId;
