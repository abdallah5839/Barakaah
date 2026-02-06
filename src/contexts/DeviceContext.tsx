/**
 * Context pour l'identifiant unique de l'appareil
 * Rend le device ID disponible dans toute l'application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDeviceId } from '../services/deviceService';

// ===== TYPES =====

interface DeviceContextValue {
  /** Identifiant unique de l'appareil */
  deviceId: string | null;
  /** Indique si le chargement est en cours */
  isLoading: boolean;
  /** Indique si le device ID est prêt à être utilisé */
  isReady: boolean;
  /** Erreur éventuelle lors du chargement */
  error: string | null;
}

interface DeviceProviderProps {
  children: ReactNode;
}

// ===== CONTEXT =====

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

// ===== PROVIDER =====

/**
 * Provider pour le device ID
 * À placer au niveau racine de l'application
 *
 * @example
 * ```tsx
 * // Dans App.tsx
 * <DeviceProvider>
 *   <App />
 * </DeviceProvider>
 * ```
 */
export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Charger le device ID au montage du provider
  useEffect(() => {
    const initDeviceId = async () => {
      console.log('🔄 [DeviceContext] Initialisation du device ID...');

      try {
        const id = await getDeviceId();
        setDeviceId(id);
        console.log('✅ [DeviceContext] Device ID chargé:', id.substring(0, 8) + '...');
      } catch (err: any) {
        const errorMessage = err.message || 'Erreur lors de l\'initialisation';
        setError(errorMessage);
        console.error('❌ [DeviceContext] Erreur:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initDeviceId();
  }, []);

  const value: DeviceContextValue = {
    deviceId,
    isLoading,
    isReady: !isLoading && deviceId !== null,
    error,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};

// ===== HOOK =====

/**
 * Hook pour accéder au device ID depuis n'importe quel composant
 *
 * @throws Erreur si utilisé en dehors du DeviceProvider
 *
 * @example
 * ```tsx
 * const { deviceId, isReady } = useDevice();
 *
 * if (!isReady) return <Loading />;
 * console.log('Device ID:', deviceId);
 * ```
 */
export const useDevice = (): DeviceContextValue => {
  const context = useContext(DeviceContext);

  if (context === undefined) {
    throw new Error('useDevice doit être utilisé à l\'intérieur d\'un DeviceProvider');
  }

  return context;
};

// ===== EXPORTS =====

export default DeviceProvider;
