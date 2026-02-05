/**
 * Service pour la gestion des cercles de lecture (Khatma)
 * Gère les opérations CRUD sur les cercles et la vérification d'appartenance
 */

import { supabase, isSupabaseConfigured } from './supabase';
import {
  Circle,
  CircleMember,
  CircleWithDetails,
  OperationResult,
} from '../types/circle.types';

// ===== TYPES LOCAUX =====

interface UserCircleInfo {
  circle: Circle;
  membership: CircleMember;
}

// ===== FONCTIONS DE VÉRIFICATION =====

/**
 * Vérifie si un utilisateur appartient à un cercle actif
 *
 * @param deviceId - Identifiant unique de l'appareil
 * @returns Le cercle et l'adhésion de l'utilisateur, ou null s'il n'appartient à aucun cercle
 *
 * @example
 * ```ts
 * const result = await checkUserCircle('uuid-device-id');
 * if (result) {
 *   console.log('Membre du cercle:', result.circle.name);
 * } else {
 *   console.log('Pas de cercle');
 * }
 * ```
 */
export const checkUserCircle = async (
  deviceId: string
): Promise<UserCircleInfo | null> => {
  // Vérifier si Supabase est configuré
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ [CircleService] Supabase non configuré');
    return null;
  }

  try {
    console.log('🔍 [CircleService] Recherche du cercle pour device:', deviceId.substring(0, 8) + '...');

    // Rechercher l'adhésion de l'utilisateur dans les cercles ACTIFS
    const { data: memberships, error: memberError } = await supabase
      .from('circle_members')
      .select(`
        *,
        circles!inner (*)
      `)
      .eq('device_id', deviceId)
      .eq('circles.status', 'active')
      .limit(1)
      .single();

    if (memberError) {
      // Pas de cercle trouvé (normal si l'utilisateur n'a pas de cercle)
      if (memberError.code === 'PGRST116') {
        console.log('📭 [CircleService] Aucun cercle actif pour cet utilisateur');
        return null;
      }

      // Erreur de table non existante (tables pas encore créées)
      if (memberError.code === '42P01' || memberError.message?.includes('does not exist')) {
        console.log('📭 [CircleService] Tables non créées - aucun cercle');
        return null;
      }

      throw memberError;
    }

    if (!memberships) {
      console.log('📭 [CircleService] Aucun cercle trouvé');
      return null;
    }

    // Extraire le cercle des données jointes
    const membership: CircleMember = {
      id: memberships.id,
      circle_id: memberships.circle_id,
      device_id: memberships.device_id,
      nickname: memberships.nickname,
      joined_at: memberships.joined_at,
      is_organizer: memberships.is_organizer,
    };

    const circle: Circle = memberships.circles as Circle;

    console.log('✅ [CircleService] Cercle trouvé:', circle.name);

    return { circle, membership };

  } catch (error: any) {
    console.error('❌ [CircleService] Erreur checkUserCircle:', error.message);
    return null;
  }
};

/**
 * Vérifie simplement si un utilisateur appartient à un cercle actif
 *
 * @param deviceId - Identifiant unique de l'appareil
 * @returns true si l'utilisateur est membre d'un cercle actif, false sinon
 *
 * @example
 * ```ts
 * const hasCircle = await isUserInCircle('uuid-device-id');
 * if (hasCircle) {
 *   // Rediriger vers le cercle
 * } else {
 *   // Afficher l'écran de création/rejoindre
 * }
 * ```
 */
export const isUserInCircle = async (deviceId: string): Promise<boolean> => {
  const result = await checkUserCircle(deviceId);
  return result !== null;
};

/**
 * Récupère tous les cercles (actifs et complétés) auxquels l'utilisateur a participé
 *
 * @param deviceId - Identifiant unique de l'appareil
 * @returns Liste des cercles avec les informations d'adhésion
 */
export const getUserCircleHistory = async (
  deviceId: string
): Promise<UserCircleInfo[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ [CircleService] Supabase non configuré');
    return [];
  }

  try {
    const { data: memberships, error } = await supabase
      .from('circle_members')
      .select(`
        *,
        circles (*)
      `)
      .eq('device_id', deviceId)
      .order('joined_at', { ascending: false });

    if (error) {
      // Tables non créées
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    if (!memberships || memberships.length === 0) {
      return [];
    }

    return memberships.map((m: any) => ({
      circle: m.circles as Circle,
      membership: {
        id: m.id,
        circle_id: m.circle_id,
        device_id: m.device_id,
        nickname: m.nickname,
        joined_at: m.joined_at,
        is_organizer: m.is_organizer,
      } as CircleMember,
    }));

  } catch (error: any) {
    console.error('❌ [CircleService] Erreur getUserCircleHistory:', error.message);
    return [];
  }
};

/**
 * Récupère un cercle par son code de partage
 *
 * @param code - Code de partage (format XXXX-XXXX)
 * @returns Le cercle ou null si non trouvé
 */
export const getCircleByCode = async (code: string): Promise<Circle | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // Normaliser le code (majuscules)
    const normalizedCode = code.toUpperCase().trim();

    const { data, error } = await supabase
      .from('circles')
      .select('*')
      .eq('code', normalizedCode)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('📭 [CircleService] Cercle non trouvé pour le code:', normalizedCode);
        return null;
      }
      throw error;
    }

    return data as Circle;

  } catch (error: any) {
    console.error('❌ [CircleService] Erreur getCircleByCode:', error.message);
    return null;
  }
};

/**
 * Vérifie si un code de cercle est valide (format et existence)
 *
 * @param code - Code à vérifier
 * @returns Résultat avec le cercle si valide
 */
export const validateCircleCode = async (
  code: string
): Promise<OperationResult<Circle>> => {
  // Vérifier le format (XXXX-XXXX)
  const codeRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  const normalizedCode = code.toUpperCase().trim();

  if (!codeRegex.test(normalizedCode)) {
    return {
      success: false,
      error: 'Format de code invalide. Utilisez le format XXXX-XXXX.',
    };
  }

  // Vérifier l'existence
  const circle = await getCircleByCode(normalizedCode);

  if (!circle) {
    return {
      success: false,
      error: 'Ce code ne correspond à aucun cercle actif.',
    };
  }

  // Vérifier si le cercle n'a pas expiré
  if (new Date(circle.expires_at) < new Date()) {
    return {
      success: false,
      error: 'Ce cercle a expiré.',
    };
  }

  return {
    success: true,
    data: circle,
  };
};

// ===== EXPORTS =====

export default {
  checkUserCircle,
  isUserInCircle,
  getUserCircleHistory,
  getCircleByCode,
  validateCircleCode,
};
