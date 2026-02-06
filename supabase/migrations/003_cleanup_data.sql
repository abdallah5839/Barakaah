-- =====================================================
-- Migration 003: Cleanup Orphaned Data
-- =====================================================
-- Ce script nettoie les données orphelines laissées par
-- des créations de cercles échouées.
--
-- ATTENTION: À exécuter une seule fois pour nettoyer
-- les données de développement/test.
-- =====================================================

-- ===== 1. SUPPRIMER LES DONNÉES ORPHELINES =====

-- D'abord supprimer les assignments (dépend de circles)
DELETE FROM circle_assignments;

-- Ensuite supprimer les members (dépend de circles)
DELETE FROM circle_members;

-- Enfin supprimer les circles
DELETE FROM circles;

-- ===== 2. VÉRIFICATION =====
-- Affiche le nombre de lignes restantes (devrait être 0)

SELECT 'circles' as table_name, COUNT(*) as row_count FROM circles
UNION ALL
SELECT 'circle_members', COUNT(*) FROM circle_members
UNION ALL
SELECT 'circle_assignments', COUNT(*) FROM circle_assignments;
