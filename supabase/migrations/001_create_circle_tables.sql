-- =====================================================
-- Migration: Création des tables pour le module Cercle de Lecture (Khatma)
-- Application: Barakaah
-- Date: 2026-02
-- =====================================================

-- Activer l'extension UUID si pas déjà active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: circles
-- Description: Cercles de lecture collective (Khatma)
-- =====================================================
CREATE TABLE IF NOT EXISTS circles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Code de partage unique (format XXXX-XXXX)
    code VARCHAR(9) NOT NULL UNIQUE,

    -- Nom du cercle
    name VARCHAR(50) NOT NULL,

    -- ID de l'appareil de l'organisateur
    organizer_id VARCHAR(100) NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Progression
    total_juz INTEGER NOT NULL DEFAULT 30,
    completed_juz INTEGER NOT NULL DEFAULT 0,

    -- Statut
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    -- Contraintes
    CONSTRAINT circles_code_format CHECK (code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$'),
    CONSTRAINT circles_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
    CONSTRAINT circles_total_juz_check CHECK (total_juz = 30),
    CONSTRAINT circles_completed_juz_check CHECK (completed_juz >= 0 AND completed_juz <= 30),
    CONSTRAINT circles_status_check CHECK (status IN ('active', 'completed'))
);

-- Index pour recherche par code (utilisé pour rejoindre un cercle)
CREATE INDEX IF NOT EXISTS idx_circles_code ON circles(code);

-- Index pour recherche par organisateur
CREATE INDEX IF NOT EXISTS idx_circles_organizer ON circles(organizer_id);

-- Index pour filtrer les cercles actifs
CREATE INDEX IF NOT EXISTS idx_circles_status ON circles(status);

-- Index pour nettoyer les cercles expirés
CREATE INDEX IF NOT EXISTS idx_circles_expires_at ON circles(expires_at);

-- =====================================================
-- TABLE: circle_members
-- Description: Membres des cercles de lecture
-- =====================================================
CREATE TABLE IF NOT EXISTS circle_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Référence au cercle
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,

    -- ID unique de l'appareil
    device_id VARCHAR(100) NOT NULL,

    -- Pseudo du membre
    nickname VARCHAR(20) NOT NULL,

    -- Timestamp d'adhésion
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Est l'organisateur du cercle
    is_organizer BOOLEAN NOT NULL DEFAULT FALSE,

    -- Contraintes
    CONSTRAINT members_nickname_length CHECK (char_length(nickname) >= 1 AND char_length(nickname) <= 20),

    -- Un appareil ne peut rejoindre un cercle qu'une fois
    CONSTRAINT unique_member_per_circle UNIQUE (circle_id, device_id)
);

-- Index pour recherche par cercle
CREATE INDEX IF NOT EXISTS idx_members_circle ON circle_members(circle_id);

-- Index pour recherche par appareil (trouver les cercles d'un utilisateur)
CREATE INDEX IF NOT EXISTS idx_members_device ON circle_members(device_id);

-- =====================================================
-- TABLE: circle_assignments
-- Description: Attribution des Juz aux membres
-- =====================================================
CREATE TABLE IF NOT EXISTS circle_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Référence au cercle
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,

    -- Référence au membre (null si non assigné)
    member_id UUID REFERENCES circle_members(id) ON DELETE SET NULL,

    -- Numéro du Juz (1-30)
    juz_number INTEGER NOT NULL,

    -- Statut de l'attribution
    status VARCHAR(20) NOT NULL DEFAULT 'unassigned',

    -- Timestamps
    assigned_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Contraintes
    CONSTRAINT assignments_juz_range CHECK (juz_number >= 1 AND juz_number <= 30),
    CONSTRAINT assignments_status_check CHECK (status IN ('unassigned', 'assigned', 'in_progress', 'completed')),

    -- Un Juz ne peut être assigné qu'une fois par cercle
    CONSTRAINT unique_juz_per_circle UNIQUE (circle_id, juz_number)
);

-- Index pour recherche par cercle
CREATE INDEX IF NOT EXISTS idx_assignments_circle ON circle_assignments(circle_id);

-- Index pour recherche par membre
CREATE INDEX IF NOT EXISTS idx_assignments_member ON circle_assignments(member_id);

-- Index pour filtrer par statut
CREATE INDEX IF NOT EXISTS idx_assignments_status ON circle_assignments(status);

-- =====================================================
-- FONCTION: Générer un code de cercle unique
-- =====================================================
CREATE OR REPLACE FUNCTION generate_circle_code()
RETURNS VARCHAR(9) AS $$
DECLARE
    new_code VARCHAR(9);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Générer un code aléatoire format XXXX-XXXX
        new_code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
            SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)
        );

        -- Vérifier si le code existe déjà
        SELECT EXISTS(SELECT 1 FROM circles WHERE code = new_code) INTO code_exists;

        -- Sortir de la boucle si le code est unique
        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: Initialiser les 30 Juz d'un cercle
-- =====================================================
CREATE OR REPLACE FUNCTION initialize_circle_assignments(p_circle_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO circle_assignments (circle_id, juz_number, status)
    SELECT p_circle_id, generate_series(1, 30), 'unassigned';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Créer automatiquement les 30 Juz à la création d'un cercle
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_initialize_assignments()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_circle_assignments(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_circle_created ON circles;
CREATE TRIGGER on_circle_created
    AFTER INSERT ON circles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_assignments();

-- =====================================================
-- TRIGGER: Mettre à jour completed_juz du cercle
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_circle_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_completed INTEGER;
BEGIN
    -- Compter les Juz complétés
    SELECT COUNT(*) INTO v_completed
    FROM circle_assignments
    WHERE circle_id = COALESCE(NEW.circle_id, OLD.circle_id)
    AND status = 'completed';

    -- Mettre à jour le cercle
    UPDATE circles
    SET completed_juz = v_completed,
        status = CASE WHEN v_completed = 30 THEN 'completed' ELSE 'active' END
    WHERE id = COALESCE(NEW.circle_id, OLD.circle_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_assignment_status_change ON circle_assignments;
CREATE TRIGGER on_assignment_status_change
    AFTER INSERT OR UPDATE OF status ON circle_assignments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_circle_progress();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_assignments ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire les cercles (via le code)
CREATE POLICY "circles_select_policy" ON circles
    FOR SELECT USING (true);

-- Politique: Tout le monde peut créer un cercle
CREATE POLICY "circles_insert_policy" ON circles
    FOR INSERT WITH CHECK (true);

-- Politique: Seul l'organisateur peut modifier son cercle
CREATE POLICY "circles_update_policy" ON circles
    FOR UPDATE USING (true);

-- Politique: Seul l'organisateur peut supprimer son cercle
CREATE POLICY "circles_delete_policy" ON circles
    FOR DELETE USING (true);

-- Politique: Tout le monde peut lire les membres
CREATE POLICY "members_select_policy" ON circle_members
    FOR SELECT USING (true);

-- Politique: Tout le monde peut rejoindre un cercle
CREATE POLICY "members_insert_policy" ON circle_members
    FOR INSERT WITH CHECK (true);

-- Politique: Un membre peut se modifier/quitter
CREATE POLICY "members_update_policy" ON circle_members
    FOR UPDATE USING (true);

CREATE POLICY "members_delete_policy" ON circle_members
    FOR DELETE USING (true);

-- Politique: Tout le monde peut lire les attributions
CREATE POLICY "assignments_select_policy" ON circle_assignments
    FOR SELECT USING (true);

-- Politique: Les membres peuvent prendre/compléter des Juz
CREATE POLICY "assignments_update_policy" ON circle_assignments
    FOR UPDATE USING (true);

-- =====================================================
-- COMMENTAIRES SUR LES TABLES
-- =====================================================
COMMENT ON TABLE circles IS 'Cercles de lecture collective du Coran (Khatma)';
COMMENT ON TABLE circle_members IS 'Membres participant aux cercles de lecture';
COMMENT ON TABLE circle_assignments IS 'Attribution des 30 Juz aux membres du cercle';

COMMENT ON COLUMN circles.code IS 'Code de partage unique format XXXX-XXXX';
COMMENT ON COLUMN circles.organizer_id IS 'ID de l''appareil de l''organisateur';
COMMENT ON COLUMN circles.expires_at IS 'Date d''expiration automatique du cercle';

COMMENT ON COLUMN circle_members.device_id IS 'ID unique de l''appareil (persisté localement)';
COMMENT ON COLUMN circle_members.is_organizer IS 'Indique si le membre est l''organisateur du cercle';

COMMENT ON COLUMN circle_assignments.juz_number IS 'Numéro du Juz (1 à 30)';
COMMENT ON COLUMN circle_assignments.status IS 'unassigned, assigned, in_progress, completed';
