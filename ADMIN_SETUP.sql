-- ============================================
-- SCRIPT SQL POUR AJOUTER LE SYSTÈME D'ADMIN
-- ============================================

-- 1. Créer le type ENUM pour les rôles
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- 2. Ajouter la colonne 'role' à la table UserPreference
ALTER TABLE "UserPreference" 
ADD COLUMN role public.user_role DEFAULT 'user';

-- ============================================
-- EXEMPLES D'UTILISATION
-- ============================================

-- Faire quelqu'un admin (remplacez par le vrai email)
UPDATE "UserPreference" 
SET role = 'admin' 
WHERE created_by = 'admin@example.com';

-- Vérifier tous les admins
SELECT created_by, pseudo, role 
FROM "UserPreference" 
WHERE role = 'admin';

-- Retirer les droits admin à quelqu'un
UPDATE "UserPreference" 
SET role = 'user' 
WHERE created_by = 'ancien-admin@example.com';

-- ============================================
-- CONFIGURER LES RLS (Row Level Security)
-- ============================================

-- La table UserPreference doit avoir les RLS appropriées
-- (déjà faites dans le SETUP_GUIDE.md)

-- Optionnel: Si vous voulez que les admins puissent voir tous les posts
-- (même ceux non publiés), ajoutez cette politique:

CREATE POLICY "Admins can view all posts"
  ON Post FOR SELECT
  USING (
    (SELECT role FROM "UserPreference" WHERE created_by = auth.email()) = 'admin'
  );
