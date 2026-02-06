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
 * Nettoie les données orphelines d'un cercle (en cas d'échec de création précédent)
 *
 * @param circleId - ID du cercle à nettoyer
 */
const cleanupCircleData = async (circleId: string): Promise<void> => {
  try {
    console.log('🧹 [CircleService] Nettoyage des données orphelines pour:', circleId);
    // Supprimer les assignments
    await supabase.from('circle_assignments').delete().eq('circle_id', circleId);
    // Supprimer les membres
    await supabase.from('circle_members').delete().eq('circle_id', circleId);
    // Supprimer le cercle
    await supabase.from('circles').delete().eq('id', circleId);
    console.log('✅ [CircleService] Nettoyage terminé');
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur nettoyage:', error.message);
  }
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

  let createdCircleId: string | null = null;

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
    createdCircleId = circle.id;
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
      // Nettoyer toutes les données créées
      await cleanupCircleData(circle.id);
      return { success: false, error: 'Erreur lors de l\'ajout au cercle.' };
    }

    const membership = memberData as CircleMember;
    console.log('✅ [CircleService] Membre ajouté:', membership.id);

    // 6. Vérifier si des assignments existent déjà pour ce cercle
    const { count: existingAssignments } = await supabase
      .from('circle_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circle.id);

    if (existingAssignments && existingAssignments > 0) {
      console.log('⚠️ [CircleService] Assignments déjà existants:', existingAssignments);
      // Supprimer les assignments existants avant de recréer
      await supabase.from('circle_assignments').delete().eq('circle_id', circle.id);
      console.log('🧹 [CircleService] Assignments existants supprimés');
    }

    // 7. Créer les 30 assignments pour les Juz
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
      // En cas d'erreur de contrainte unique, nettoyer et réessayer une fois
      if (assignError.code === '23505') {
        console.log('🔄 [CircleService] Tentative de nettoyage et recréation...');
        await supabase.from('circle_assignments').delete().eq('circle_id', circle.id);

        const { error: retryError } = await supabase
          .from('circle_assignments')
          .insert(assignments);

        if (retryError) {
          console.error('❌ [CircleService] Échec après retry:', retryError.message);
          // Les assignments ne sont pas critiques, on continue
        } else {
          console.log('✅ [CircleService] 30 assignments créés (après retry)');
        }
      }
    } else {
      console.log('✅ [CircleService] 30 assignments créés');
    }

    return {
      success: true,
      data: { circle, membership },
    };

  } catch (error: any) {
    console.error('❌ [CircleService] Erreur createCircle:', error.message);
    // Nettoyer en cas d'erreur inattendue
    if (createdCircleId) {
      await cleanupCircleData(createdCircleId);
    }
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

// ===== FONCTIONS POUR REJOINDRE UN CERCLE =====

/** Données pour rejoindre un cercle */
interface JoinCircleData {
  code: string;
  nickname: string;
  deviceId: string;
}

/** Résultat de la jonction à un cercle */
interface JoinCircleResult {
  circle: Circle;
  membership: CircleMember;
}

/**
 * Rejoint un cercle de lecture existant
 *
 * @param data - Code du cercle, pseudo et deviceId
 * @returns Résultat avec le cercle rejoint et l'adhésion
 */
export const joinCircle = async (
  data: JoinCircleData
): Promise<OperationResult<JoinCircleResult>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible. Vérifiez votre connexion.' };
  }

  try {
    console.log('🔵 [CircleService] Tentative de rejoindre un cercle avec le code:', data.code);

    // 1. Vérifier que l'utilisateur n'est pas déjà dans un cercle actif
    const existingCircle = await checkUserCircle(data.deviceId);
    if (existingCircle) {
      return {
        success: false,
        error: 'Tu es déjà dans un cercle. Quitte ton cercle actuel pour en rejoindre un autre.',
      };
    }

    // 2. Valider le pseudo
    const trimmedNickname = data.nickname.trim();
    if (!trimmedNickname) {
      return { success: false, error: 'Ton pseudo est requis.' };
    }
    if (trimmedNickname.length > 20) {
      return { success: false, error: 'Le pseudo ne peut pas dépasser 20 caractères.' };
    }

    // 3. Valider le code et trouver le cercle
    const normalizedCode = data.code.toUpperCase().trim();
    const codeRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!codeRegex.test(normalizedCode)) {
      return { success: false, error: 'Code invalide ou cercle introuvable.' };
    }

    const circle = await getCircleByCode(normalizedCode);
    if (!circle) {
      return { success: false, error: 'Code invalide ou cercle introuvable.' };
    }

    // 4. Vérifier que le cercle n'a pas expiré
    if (new Date(circle.expires_at) < new Date()) {
      return { success: false, error: 'Ce cercle a expiré.' };
    }

    // 5. Vérifier que le cercle n'est pas plein (max 30 membres)
    const memberCount = await getCircleMemberCount(circle.id);
    if (memberCount >= 30) {
      return { success: false, error: 'Ce cercle est complet (30 membres maximum).' };
    }

    // 6. Vérifier que le pseudo n'est pas déjà utilisé dans ce cercle
    const { data: existingNickname, error: nicknameError } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circle.id)
      .ilike('nickname', trimmedNickname)
      .limit(1);

    if (!nicknameError && existingNickname && existingNickname.length > 0) {
      return { success: false, error: 'Ce pseudo est déjà utilisé dans ce cercle.' };
    }

    // 7. Créer l'entrée dans circle_members
    const { data: memberData, error: memberError } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circle.id,
        device_id: data.deviceId,
        nickname: trimmedNickname,
        is_organizer: false,
      })
      .select()
      .single();

    if (memberError) {
      console.error('❌ [CircleService] Erreur ajout membre:', memberError.message);
      return { success: false, error: 'Erreur lors de la jonction au cercle.' };
    }

    const membership = memberData as CircleMember;
    console.log('✅ [CircleService] Membre ajouté au cercle:', circle.name);

    return {
      success: true,
      data: { circle, membership },
    };

  } catch (error: any) {
    console.error('❌ [CircleService] Erreur joinCircle:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Récupère tous les membres d'un cercle
 *
 * @param circleId - ID du cercle
 * @returns Liste des membres avec pseudo et statut organisateur
 */
export const getCircleMembers = async (circleId: string): Promise<CircleMember[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('circle_members')
      .select('*')
      .eq('circle_id', circleId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('❌ [CircleService] Erreur getCircleMembers:', error.message);
      return [];
    }

    return (data || []) as CircleMember[];
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur getCircleMembers:', error.message);
    return [];
  }
};

// ===== FONCTIONS DU DASHBOARD =====

/**
 * Récupère les détails complets d'un cercle (données fraîches)
 *
 * @param circleId - ID du cercle
 * @returns Le cercle ou null
 */
export const getCircleDetails = async (circleId: string): Promise<Circle | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('circles')
      .select('*')
      .eq('id', circleId)
      .single();

    if (error) {
      console.error('❌ [CircleService] Erreur getCircleDetails:', error.message);
      return null;
    }

    return data as Circle;
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur getCircleDetails:', error.message);
    return null;
  }
};

/**
 * Récupère toutes les attributions de Juz d'un cercle
 *
 * @param circleId - ID du cercle
 * @returns Liste des 30 assignments triés par numéro de Juz
 */
export const getCircleAssignments = async (circleId: string): Promise<CircleAssignment[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('circle_assignments')
      .select('*')
      .eq('circle_id', circleId)
      .order('juz_number', { ascending: true });

    if (error) {
      console.error('❌ [CircleService] Erreur getCircleAssignments:', error.message);
      return [];
    }

    return (data || []) as CircleAssignment[];
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur getCircleAssignments:', error.message);
    return [];
  }
};

/**
 * Calcule la progression globale d'un cercle
 *
 * @param circleId - ID du cercle
 * @returns Nombre de Juz complétés et pourcentage
 */
export const getCircleProgress = async (circleId: string): Promise<{ completed: number; total: number; percentage: number }> => {
  if (!isSupabaseConfigured()) return { completed: 0, total: 30, percentage: 0 };

  try {
    const { count, error } = await supabase
      .from('circle_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circleId)
      .eq('status', 'completed');

    if (error) {
      console.error('❌ [CircleService] Erreur getCircleProgress:', error.message);
      return { completed: 0, total: 30, percentage: 0 };
    }

    const completed = count || 0;
    return { completed, total: 30, percentage: Math.round((completed / 30) * 100) };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur getCircleProgress:', error.message);
    return { completed: 0, total: 30, percentage: 0 };
  }
};

// ===== FONCTIONS DE GESTION DES ASSIGNATIONS =====

/**
 * Assigne un Juz à un membre
 *
 * @param data - circleId, juzNumber, memberId
 * @returns Résultat de l'opération
 */
export const assignJuzToMember = async (data: {
  circleId: string;
  juzNumber: number;
  memberId: string;
}): Promise<OperationResult<CircleAssignment>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    const { data: updated, error } = await supabase
      .from('circle_assignments')
      .update({
        member_id: data.memberId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      })
      .eq('circle_id', data.circleId)
      .eq('juz_number', data.juzNumber)
      .select()
      .single();

    if (error) {
      console.error('❌ [CircleService] Erreur assignJuzToMember:', error.message);
      return { success: false, error: 'Erreur lors de l\'assignation.' };
    }

    return { success: true, data: updated as CircleAssignment };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur assignJuzToMember:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Retire l'assignation d'un Juz (redevient "unassigned")
 *
 * @param data - circleId, juzNumber
 * @returns Résultat de l'opération
 */
export const unassignJuz = async (data: {
  circleId: string;
  juzNumber: number;
}): Promise<OperationResult<CircleAssignment>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    const { data: updated, error } = await supabase
      .from('circle_assignments')
      .update({
        member_id: null,
        status: 'unassigned',
        assigned_at: null,
      })
      .eq('circle_id', data.circleId)
      .eq('juz_number', data.juzNumber)
      .select()
      .single();

    if (error) {
      console.error('❌ [CircleService] Erreur unassignJuz:', error.message);
      return { success: false, error: 'Erreur lors de la désassignation.' };
    }

    return { success: true, data: updated as CircleAssignment };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur unassignJuz:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Assigne plusieurs Juz d'un coup à un membre
 *
 * @param data - circleId, juzNumbers[], memberId
 * @returns Résultat de l'opération
 */
export const assignMultipleJuz = async (data: {
  circleId: string;
  juzNumbers: number[];
  memberId: string;
}): Promise<OperationResult<void>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    // Assigner chaque Juz au membre
    for (const juzNumber of data.juzNumbers) {
      const { error } = await supabase
        .from('circle_assignments')
        .update({
          member_id: data.memberId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
        })
        .eq('circle_id', data.circleId)
        .eq('juz_number', juzNumber);

      if (error) {
        console.error(`❌ [CircleService] Erreur assignation Juz ${juzNumber}:`, error.message);
        return { success: false, error: `Erreur pour le Juz ${juzNumber}.` };
      }
    }

    console.log(`✅ [CircleService] ${data.juzNumbers.length} Juz assignés au membre ${data.memberId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur assignMultipleJuz:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Désassigne plusieurs Juz d'un coup
 *
 * @param data - circleId, juzNumbers[]
 * @returns Résultat de l'opération
 */
export const unassignMultipleJuz = async (data: {
  circleId: string;
  juzNumbers: number[];
}): Promise<OperationResult<void>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    for (const juzNumber of data.juzNumbers) {
      const { error } = await supabase
        .from('circle_assignments')
        .update({
          member_id: null,
          status: 'unassigned',
          assigned_at: null,
        })
        .eq('circle_id', data.circleId)
        .eq('juz_number', juzNumber);

      if (error) {
        console.error(`❌ [CircleService] Erreur désassignation Juz ${juzNumber}:`, error.message);
        return { success: false, error: `Erreur pour le Juz ${juzNumber}.` };
      }
    }

    console.log(`✅ [CircleService] ${data.juzNumbers.length} Juz désassignés`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur unassignMultipleJuz:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Retire un membre du cercle
 * Tous ses Juz deviennent "unassigned", puis le membre est supprimé
 * L'organisateur ne peut pas se retirer lui-même
 *
 * @param data - circleId, memberId
 * @returns Résultat de l'opération
 */
export const removeMemberFromCircle = async (data: {
  circleId: string;
  memberId: string;
}): Promise<OperationResult<void>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    // 1. Vérifier que le membre existe et n'est pas l'organisateur
    const { data: member, error: memberError } = await supabase
      .from('circle_members')
      .select('*')
      .eq('id', data.memberId)
      .eq('circle_id', data.circleId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Membre non trouvé.' };
    }

    if (member.is_organizer) {
      return { success: false, error: 'L\'organisateur ne peut pas être retiré du cercle.' };
    }

    // 2. Désassigner tous les Juz du membre
    const { error: unassignError } = await supabase
      .from('circle_assignments')
      .update({
        member_id: null,
        status: 'unassigned',
        assigned_at: null,
      })
      .eq('circle_id', data.circleId)
      .eq('member_id', data.memberId);

    if (unassignError) {
      console.error('❌ [CircleService] Erreur désassignation Juz du membre:', unassignError.message);
      return { success: false, error: 'Erreur lors de la désassignation des Juz.' };
    }

    // 3. Supprimer le membre
    const { error: deleteError } = await supabase
      .from('circle_members')
      .delete()
      .eq('id', data.memberId)
      .eq('circle_id', data.circleId);

    if (deleteError) {
      console.error('❌ [CircleService] Erreur suppression membre:', deleteError.message);
      return { success: false, error: 'Erreur lors de la suppression du membre.' };
    }

    console.log(`✅ [CircleService] Membre ${data.memberId} retiré du cercle ${data.circleId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur removeMemberFromCircle:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

// ===== FONCTIONS DE MARQUAGE DE PROGRESSION =====

/**
 * Marque un Juz comme "en cours" (in_progress)
 * Vérifie que le Juz est bien assigné à cet utilisateur
 */
export const markJuzInProgress = async (data: {
  circleId: string;
  juzNumber: number;
  deviceId: string;
}): Promise<OperationResult<CircleAssignment>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    // 1. Trouver le member_id de cet utilisateur dans ce cercle
    const { data: member, error: memberError } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', data.circleId)
      .eq('device_id', data.deviceId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Tu n\'es pas membre de ce cercle.' };
    }

    // 2. Vérifier que le Juz est assigné à ce membre
    const { data: assignment, error: assignError } = await supabase
      .from('circle_assignments')
      .select('*')
      .eq('circle_id', data.circleId)
      .eq('juz_number', data.juzNumber)
      .eq('member_id', member.id)
      .single();

    if (assignError || !assignment) {
      return { success: false, error: 'Ce Juz ne t\'est pas assigné.' };
    }

    if (assignment.status === 'completed') {
      return { success: false, error: 'Ce Juz est déjà terminé.' };
    }

    if (assignment.status === 'in_progress') {
      return { success: true, data: assignment as CircleAssignment };
    }

    // 3. Mettre à jour le statut
    const { data: updated, error: updateError } = await supabase
      .from('circle_assignments')
      .update({ status: 'in_progress' })
      .eq('id', assignment.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: 'Erreur lors de la mise à jour.' };
    }

    console.log(`✅ [CircleService] Juz ${data.juzNumber} marqué en cours`);
    return { success: true, data: updated as CircleAssignment };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur markJuzInProgress:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Marque un Juz comme "complété" (completed)
 * Vérifie que le Juz est bien assigné à cet utilisateur
 * Met à jour completed_juz dans la table circles
 */
export const markJuzCompleted = async (data: {
  circleId: string;
  juzNumber: number;
  deviceId: string;
}): Promise<OperationResult<{ assignment: CircleAssignment; circleCompleted: boolean }>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    // 1. Trouver le member_id
    const { data: member, error: memberError } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', data.circleId)
      .eq('device_id', data.deviceId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Tu n\'es pas membre de ce cercle.' };
    }

    // 2. Vérifier que le Juz est assigné à ce membre
    const { data: assignment, error: assignError } = await supabase
      .from('circle_assignments')
      .select('*')
      .eq('circle_id', data.circleId)
      .eq('juz_number', data.juzNumber)
      .eq('member_id', member.id)
      .single();

    if (assignError || !assignment) {
      return { success: false, error: 'Ce Juz ne t\'est pas assigné.' };
    }

    if (assignment.status === 'completed') {
      return { success: false, error: 'Ce Juz est déjà terminé.' };
    }

    // 3. Marquer comme complété
    const { data: updated, error: updateError } = await supabase
      .from('circle_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', assignment.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: 'Erreur lors de la mise à jour.' };
    }

    // 4. Mettre à jour completed_juz dans la table circles
    const { count: completedCount } = await supabase
      .from('circle_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', data.circleId)
      .eq('status', 'completed');

    const completed = completedCount || 0;
    await supabase
      .from('circles')
      .update({ completed_juz: completed })
      .eq('id', data.circleId);

    const circleCompleted = completed >= 30;
    if (circleCompleted) {
      // Marquer le cercle comme complété
      await supabase
        .from('circles')
        .update({ status: 'completed' })
        .eq('id', data.circleId);
      console.log('🎉 [CircleService] Khatma complète !');
    }

    console.log(`✅ [CircleService] Juz ${data.juzNumber} marqué complété (${completed}/30)`);
    return { success: true, data: { assignment: updated as CircleAssignment, circleCompleted } };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur markJuzCompleted:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Récupère les Juz assignés à l'utilisateur actuel
 */
export const getMyAssignments = async (data: {
  circleId: string;
  deviceId: string;
}): Promise<CircleAssignment[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    // Trouver le member_id
    const { data: member, error: memberError } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', data.circleId)
      .eq('device_id', data.deviceId)
      .single();

    if (memberError || !member) return [];

    const { data: assignments, error } = await supabase
      .from('circle_assignments')
      .select('*')
      .eq('circle_id', data.circleId)
      .eq('member_id', member.id)
      .order('juz_number', { ascending: true });

    if (error) {
      console.error('❌ [CircleService] Erreur getMyAssignments:', error.message);
      return [];
    }

    return (assignments || []) as CircleAssignment[];
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur getMyAssignments:', error.message);
    return [];
  }
};

// ===== FONCTIONS D'EXPIRATION ET NETTOYAGE =====

/**
 * Vérifie si un cercle est expiré
 */
export const checkCircleExpiration = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

/**
 * Supprime toutes les données d'un cercle (assignments, members, circle)
 */
export const deleteCircle = async (circleId: string): Promise<OperationResult<void>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    console.log('🗑️ [CircleService] Suppression du cercle:', circleId);

    // 1. Supprimer les assignments
    await supabase.from('circle_assignments').delete().eq('circle_id', circleId);
    // 2. Supprimer les membres
    await supabase.from('circle_members').delete().eq('circle_id', circleId);
    // 3. Supprimer le cercle
    const { error } = await supabase.from('circles').delete().eq('id', circleId);

    if (error) {
      console.error('❌ [CircleService] Erreur suppression cercle:', error.message);
      return { success: false, error: 'Erreur lors de la suppression du cercle.' };
    }

    console.log('✅ [CircleService] Cercle supprimé:', circleId);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur deleteCircle:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Quitter un cercle
 * - Organisateur : supprime le cercle entier
 * - Membre standard : désassigne ses Juz et se retire
 */
export const leaveCircle = async (data: {
  circleId: string;
  deviceId: string;
}): Promise<OperationResult<{ circleDeleted: boolean }>> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Service non disponible.' };
  }

  try {
    // 1. Trouver le membre
    const { data: member, error: memberError } = await supabase
      .from('circle_members')
      .select('*')
      .eq('circle_id', data.circleId)
      .eq('device_id', data.deviceId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Tu n\'es pas membre de ce cercle.' };
    }

    // 2. Si organisateur → supprimer le cercle entier
    if (member.is_organizer) {
      const deleteResult = await deleteCircle(data.circleId);
      if (!deleteResult.success) return { success: false, error: deleteResult.error };
      console.log('✅ [CircleService] Organisateur a quitté → cercle supprimé');
      return { success: true, data: { circleDeleted: true } };
    }

    // 3. Membre standard → désassigner ses Juz
    await supabase
      .from('circle_assignments')
      .update({ member_id: null, status: 'unassigned', assigned_at: null })
      .eq('circle_id', data.circleId)
      .eq('member_id', member.id);

    // 4. Supprimer l'entrée membre
    const { error: deleteError } = await supabase
      .from('circle_members')
      .delete()
      .eq('id', member.id);

    if (deleteError) {
      console.error('❌ [CircleService] Erreur leave:', deleteError.message);
      return { success: false, error: 'Erreur lors du départ du cercle.' };
    }

    console.log('✅ [CircleService] Membre a quitté le cercle');
    return { success: true, data: { circleDeleted: false } };
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur leaveCircle:', error.message);
    return { success: false, error: 'Une erreur inattendue est survenue.' };
  }
};

/**
 * Nettoie tous les cercles expirés
 * Appelé au démarrage de l'app ou du module Cercle
 */
export const cleanupExpiredCircles = async (): Promise<number> => {
  if (!isSupabaseConfigured()) return 0;

  try {
    const now = new Date().toISOString();

    // Trouver les cercles expirés
    const { data: expired, error } = await supabase
      .from('circles')
      .select('id')
      .eq('status', 'active')
      .lt('expires_at', now);

    if (error || !expired || expired.length === 0) return 0;

    console.log(`🧹 [CircleService] ${expired.length} cercle(s) expiré(s) à nettoyer`);

    let cleaned = 0;
    for (const circle of expired) {
      const result = await deleteCircle(circle.id);
      if (result.success) cleaned++;
    }

    console.log(`✅ [CircleService] ${cleaned} cercle(s) nettoyé(s)`);
    return cleaned;
  } catch (error: any) {
    console.error('❌ [CircleService] Erreur cleanupExpiredCircles:', error.message);
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
  joinCircle,
  getCircleMembers,
  getCircleDetails,
  getCircleAssignments,
  getCircleProgress,
  assignJuzToMember,
  unassignJuz,
  assignMultipleJuz,
  unassignMultipleJuz,
  removeMemberFromCircle,
  markJuzInProgress,
  markJuzCompleted,
  getMyAssignments,
  checkCircleExpiration,
  deleteCircle,
  leaveCircle,
  cleanupExpiredCircles,
};
