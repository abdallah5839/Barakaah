-- =====================================================
-- Migration 002: Fix RLS Policies for Circle Tables
-- =====================================================
-- Ce script corrige les politiques de sécurité (RLS)
-- pour permettre les opérations CRUD sur les tables du cercle.
--
-- ATTENTION: Ces politiques sont permissives pour le développement.
-- En production, il faudra des politiques plus restrictives.
-- =====================================================

-- ===== 1. SUPPRIMER LES ANCIENNES POLITIQUES =====

-- Table circles
DROP POLICY IF EXISTS "circles_select_policy" ON circles;
DROP POLICY IF EXISTS "circles_insert_policy" ON circles;
DROP POLICY IF EXISTS "circles_update_policy" ON circles;
DROP POLICY IF EXISTS "circles_delete_policy" ON circles;
DROP POLICY IF EXISTS "Anyone can view circles" ON circles;
DROP POLICY IF EXISTS "Anyone can create circles" ON circles;
DROP POLICY IF EXISTS "Organizers can update their circles" ON circles;

-- Table circle_members
DROP POLICY IF EXISTS "circle_members_select_policy" ON circle_members;
DROP POLICY IF EXISTS "circle_members_insert_policy" ON circle_members;
DROP POLICY IF EXISTS "circle_members_update_policy" ON circle_members;
DROP POLICY IF EXISTS "circle_members_delete_policy" ON circle_members;
DROP POLICY IF EXISTS "Anyone can view members" ON circle_members;
DROP POLICY IF EXISTS "Anyone can join circles" ON circle_members;

-- Table circle_assignments
DROP POLICY IF EXISTS "circle_assignments_select_policy" ON circle_assignments;
DROP POLICY IF EXISTS "circle_assignments_insert_policy" ON circle_assignments;
DROP POLICY IF EXISTS "circle_assignments_update_policy" ON circle_assignments;
DROP POLICY IF EXISTS "circle_assignments_delete_policy" ON circle_assignments;
DROP POLICY IF EXISTS "Anyone can view assignments" ON circle_assignments;
DROP POLICY IF EXISTS "Members can take assignments" ON circle_assignments;
DROP POLICY IF EXISTS "Members can update their assignments" ON circle_assignments;

-- ===== 2. CRÉER DES POLITIQUES PERMISSIVES =====

-- Table circles: Politiques permissives
CREATE POLICY "circles_select_all" ON circles
  FOR SELECT USING (true);

CREATE POLICY "circles_insert_all" ON circles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "circles_update_all" ON circles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "circles_delete_all" ON circles
  FOR DELETE USING (true);

-- Table circle_members: Politiques permissives
CREATE POLICY "circle_members_select_all" ON circle_members
  FOR SELECT USING (true);

CREATE POLICY "circle_members_insert_all" ON circle_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "circle_members_update_all" ON circle_members
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "circle_members_delete_all" ON circle_members
  FOR DELETE USING (true);

-- Table circle_assignments: Politiques permissives
CREATE POLICY "circle_assignments_select_all" ON circle_assignments
  FOR SELECT USING (true);

CREATE POLICY "circle_assignments_insert_all" ON circle_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "circle_assignments_update_all" ON circle_assignments
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "circle_assignments_delete_all" ON circle_assignments
  FOR DELETE USING (true);

-- ===== 3. VÉRIFICATION =====
-- Affiche les politiques créées pour confirmation

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('circles', 'circle_members', 'circle_assignments')
ORDER BY tablename, policyname;
