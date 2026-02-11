/**
 * Service d'identification de l'appareil
 * Génère et stocke un UUID unique pour identifier l'utilisateur sans compte
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Clé de stockage pour l'identifiant de l'appareil
const DEVICE_ID_KEY = '@sakina_device_id';

/**
 * Génère un UUID v4 unique
 * @returns UUID au format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
const generateUUID = (): string => {
  return Crypto.randomUUID();
};

/**
 * Récupère ou crée l'identifiant unique de l'appareil
 * - Au premier lancement : génère un nouvel UUID et le stocke
 * - Aux lancements suivants : retourne l'UUID existant
 *
 * @returns L'identifiant unique de l'appareil
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    // Tenter de récupérer l'ID existant
    const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (existingId) {
      console.log('📱 [Device] ID existant récupéré:', existingId.substring(0, 8) + '...');
      return existingId;
    }

    // Premier lancement : générer un nouvel ID
    const newId = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);

    console.log('📱 [Device] Nouvel ID généré:', newId.substring(0, 8) + '...');
    return newId;

  } catch (error) {
    console.error('❌ [Device] Erreur lors de la récupération/création de l\'ID:', error);

    // En cas d'erreur, générer un ID temporaire (non persisté)
    // Cela permet à l'app de fonctionner mais l'utilisateur perdra ses données au redémarrage
    const fallbackId = generateUUID();
    console.warn('⚠️ [Device] Utilisation d\'un ID temporaire (non persisté)');
    return fallbackId;
  }
};

/**
 * Vérifie si un device ID existe déjà
 * @returns true si un ID existe, false sinon
 */
export const hasDeviceId = async (): Promise<boolean> => {
  try {
    const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    return existingId !== null;
  } catch (error) {
    console.error('❌ [Device] Erreur lors de la vérification de l\'ID:', error);
    return false;
  }
};

/**
 * Supprime l'identifiant de l'appareil (pour reset/debug)
 * ATTENTION : Cela fera perdre l'accès aux cercles existants
 */
export const clearDeviceId = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    console.log('🗑️ [Device] ID supprimé');
  } catch (error) {
    console.error('❌ [Device] Erreur lors de la suppression de l\'ID:', error);
  }
};

/**
 * Récupère l'ID sans le créer s'il n'existe pas
 * Utile pour vérifier si l'utilisateur est déjà identifié
 *
 * @returns L'ID existant ou null
 */
export const getExistingDeviceId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(DEVICE_ID_KEY);
  } catch (error) {
    console.error('❌ [Device] Erreur lors de la lecture de l\'ID:', error);
    return null;
  }
};

export default {
  getDeviceId,
  hasDeviceId,
  clearDeviceId,
  getExistingDeviceId,
};
