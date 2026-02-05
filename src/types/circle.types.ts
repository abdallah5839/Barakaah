/**
 * Types TypeScript pour le module Cercle de Lecture (Khatma)
 * Définition des interfaces pour les tables Supabase
 */

// ===== TYPES PRINCIPAUX =====

/**
 * Cercle de lecture - représente une Khatma collective
 */
export interface Circle {
  id: string;
  /** Code unique de partage (format "XXXX-XXXX") */
  code: string;
  /** Nom du cercle (max 50 caractères) */
  name: string;
  /** ID de l'appareil de l'organisateur */
  organizer_id: string;
  /** Date de création (ISO timestamp) */
  created_at: string;
  /** Date d'expiration (ISO timestamp) */
  expires_at: string;
  /** Nombre total de Juz (toujours 30) */
  total_juz: number;
  /** Nombre de Juz complétés (0-30) */
  completed_juz: number;
  /** Statut du cercle */
  status: CircleStatus;
}

/**
 * Membre d'un cercle de lecture
 */
export interface CircleMember {
  id: string;
  /** ID du cercle */
  circle_id: string;
  /** ID unique de l'appareil */
  device_id: string;
  /** Pseudo du membre (max 20 caractères) */
  nickname: string;
  /** Date d'adhésion (ISO timestamp) */
  joined_at: string;
  /** Est l'organisateur du cercle */
  is_organizer: boolean;
}

/**
 * Attribution d'un Juz à un membre
 */
export interface CircleAssignment {
  id: string;
  /** ID du cercle */
  circle_id: string;
  /** ID du membre (null si non assigné) */
  member_id: string | null;
  /** Numéro du Juz (1-30) */
  juz_number: number;
  /** Statut de l'attribution */
  status: AssignmentStatus;
  /** Date d'attribution (null si non assigné) */
  assigned_at: string | null;
  /** Date de complétion (null si non complété) */
  completed_at: string | null;
}

// ===== TYPES ÉNUMÉRÉS =====

/** Statut possible d'un cercle */
export type CircleStatus = 'active' | 'completed';

/** Statut possible d'une attribution */
export type AssignmentStatus = 'unassigned' | 'assigned' | 'in_progress' | 'completed';

// ===== DONNÉES STATIQUES =====

/**
 * Informations sur un Juz (partie du Coran)
 */
export interface JuzInfo {
  /** Numéro du Juz (1-30) */
  number: number;
  /** Sourate de début */
  start_surah: string;
  /** Numéro de sourate de début */
  start_surah_number: number;
  /** Verset de début */
  start_verse: number;
  /** Sourate de fin */
  end_surah: string;
  /** Numéro de sourate de fin */
  end_surah_number: number;
  /** Verset de fin */
  end_verse: number;
  /** Nom arabe du Juz */
  name_ar: string;
}

// ===== TYPES POUR LES REQUÊTES =====

/** Données pour créer un nouveau cercle */
export interface CreateCircleInput {
  name: string;
  organizer_nickname: string;
}

/** Données pour rejoindre un cercle */
export interface JoinCircleInput {
  code: string;
  nickname: string;
}

/** Données pour prendre un Juz */
export interface TakeJuzInput {
  circle_id: string;
  juz_number: number;
}

/** Données pour marquer un Juz comme complété */
export interface CompleteJuzInput {
  circle_id: string;
  juz_number: number;
}

// ===== TYPES POUR LES RÉPONSES ENRICHIES =====

/** Cercle avec ses membres et attributions */
export interface CircleWithDetails extends Circle {
  members: CircleMember[];
  assignments: CircleAssignment[];
}

/** Attribution avec informations du membre */
export interface AssignmentWithMember extends CircleAssignment {
  member?: CircleMember;
}

// ===== TYPES UTILITAIRES =====

/** État de la connexion Supabase */
export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'not_configured';

/** Résultat d'une opération avec erreur potentielle */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
