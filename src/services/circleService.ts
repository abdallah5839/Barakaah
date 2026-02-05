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
  CircleAssignment,
} from '../types/circle.types';

// ===== TYPES LOCAUX =====

interface UserCircleInfo {
  circle: Circle;
  membership: CircleMember;
}

/** Données pour créer un nouveau cercle */
interface CreateCircleData {
  name: string;
  organizerNickname: string;
  expiresAt: Date;
  deviceId: string;
}

/** Résultat de la création d'un cercle */
interface CreateCircleResult {
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

// ===== FONCTIONS DE CRÉATION =====

/**
 * Caractères autorisés pour le code (sans ambiguïté : 0, O, I, L exclus)
 */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Génère un code unique de 8 caractères format XXXX-XXXX
 * Vérifie que le code n'existe pas déjà dans la base
 *
 * @returns Code unique au format XXXX-XXXX
 */
export const generateCircleCode = async (): Promise<string> => {
  const generateRandomCode = (): string => {
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    return `${code.substring(0, 4)}-${code.substring(4, 8)}`;
  };

  // Générer un code et vérifier qu'il n'existe pas
  let code = generateRandomCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existingCircle = await getCircleByCode(code);
    if (!existingCircle) {
      console.log('🔑 [CircleService] Code généré:', code);
      return code;
    }
    code = generateRandomCode();
    attempts++;
  }

  // En dernier recours, ajouter un timestamp
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  code = `${code.substring(0, 4)}-${timestamp}`;
  console.log('🔑 [CircleService] Code généré (avec timestamp):', code);
  return code;
};

/**
 * Crée un nouveau cercle de lecture
 *
 * @param data - Données de création du cercle
 * @returns Résultat avec le cercle créé et l'adhésion du créateur
 *
 * @example
 * ```ts
 * const result = await createCircle({
 *   name: 'Cercle familial',
 *   organizerNickname: 'Papa',
 *   expiresAt: new Date('2024-12-31'),
 *   deviceId: 'uuid-device-id',
 * });
 * if (result.success) {
 *   console.log('Cercle créé:', result.data.circle.code);
 * }
 * ```
 */
export const createCircle = async (
  data: CreateCircleData
): Promise<OperationResult<CreateCircleResult>> => {
  // Vérifier la configuration Supabase
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Service non disponible. Vérifiez votre connexion.',
    };
  }

  try {
    console.log('🔵 [CircleService] Création du cercle:', data.name);

    // 1. Vérifier que l'utilisateur n'est pas déjà dans un cercle actif
    const existingCircle = await checkUserCircle(data.deviceId);
    if (existingCircle) {
      return {
        success: false,
        error: `Vous êtes déjà membre du cercle "${existingCircle.circle.name}". Quittez ce cercle pour en créer un nouveau.`,
      };
    }

    // 2. Valider les données
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'Le nom du cercle est requis.' };
    }
    if (data.name.length > 50) {
      return { success: false, error: 'Le nom du cercle ne peut pas dépasser 50 caractères.' };
    }
    if (!data.organizerNickname || data.organizerNickname.trim().length === 0) {
      return { success: false, error: 'Votre pseudo est requis.' };
    }
    if (data.organizerNickname.length > 20) {
      return { success: false, error: 'Le pseudo ne peut pas dépasser 20 caractères.' };
    }

    // Vérifier la date limite
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const maxDate = new Date(now);
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    if (data.expiresAt < tomorrow) {
      return { success: false, error: 'La date limite doit être au moins demain.' };
    }
    if (data.expiresAt > maxDate) {
      return { success: false, error: 'La date limite ne peut pas dépasser 1 an.' };
    }

    // 3. Générer un code unique
    const code = await generateCircleCode();

    // 4. Créer le cercle dans Supabase
    const { data: circleData, error: circleError } = await supabase
      .from('circles')
      .insert({
        code,
        name: data.name.trim(),
        organizer_id: data.deviceId,
        expires_at: data.expiresAt.toISOString(),
        total_juz: 30,
        completed_juz: 0,
        status: 'active',
      })
      .select()
      .single();

    if (circleError) {
      console.error('❌ [CircleService] Erreur création cercle:', circleError.message);
      return { success: false, error: 'Erreur lors de la création du cercle.' };
    }

    const circle = circleData as Circle;
    console.log('✅ [CircleService] Cercle créé:', circle.id);

    // 5. Ajouter le créateur comme membre organisateur
    const { data: memberData, error: memberError } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circle.id,
        device_id: data.deviceId,
        nickname: data.organizerNickname.trim(),
        is_organizer: true,
      })
      .select()
      .single();

    if (memberError) {
      console.error('❌ [CircleService] Erreur création membre:', memberError.message);
      // Supprimer le cercle créé en cas d'échec
      await supabase.from('circles').delete().eq('id', circle.id);
      return { success: false, error: 'Erreur lors de l\'ajout au cercle.' };
    }

    const membership = memberData as CircleMember;
    console.log('✅ [CircleService] Membre ajouté:', membership.id);

    // 6. Créer les 30 assignments pour les Juz
    const assignments = Array.from({ length: 30 }, (_, i) => ({
      circle_id: circle.id,
      juz_number: i + 1,
      member_id: null,
      status: 'unassigned',
    }));

    const { error: assignError } = await supabase
      .from('circle_assignments')
      .insert(assignments);

    if (assignError) {
      console.error('❌ [CircleService] Erreur création assignments:', assignError.message);
      // Note: On ne supprime pas le cercle car les assignments ne sont pas critiques
      // Ils peuvent être recréés plus tard si nécessaire
    } else {
      console.log('✅ [CircleService] 30 assignments créés');
    }

    return {
      success: true,
      data: { circle, membership },
    };

  } catch (error: any) {
    console.error('❌ [CircleService] Erreur createCircle:', error.message);
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    };
  }
};

/**
 * Compte le nombre de membres dans un cercle
 *
 * @param circleId - ID du cercle
 * @returns Nombre de membres
 */
export const getCircleMemberCount = async (circleId: string): Promise<number> => {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circleId);

    if (error) {
      console.error('❌ [CircleService] Erreur count membres:', error.message);
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur getCircleMemberCount:', error.message);
    return 0;
  }
};

// ===== EXPORTS =====

export default {
  checkUserCircle,
  isUserInCircle,
  getUserCircleHistory,
  getCircleByCode,
  validateCircleCode,
  generateCircleCode,
  createCircle,
  getCircleMemberCount,
};
