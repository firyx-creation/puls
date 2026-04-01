# Guide de Migration vers Supabase + Vercel

## 1. Configuration de Supabase

### 1.1 Créer un compte et projet Supabase
1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Créez un nouveau projet
3. Attendez que le projet soit initialisé

### 1.2 Récupérer les clés API
1. Allez à `Settings` > `API` dans votre projet Supabase
2. Copier:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` (API Key) → `VITE_SUPABASE_ANON_KEY`

### 1.3 Créer les tables

Allez à `SQL Editor` et exécutez ce script:

```sql
-- Create Post table
CREATE TABLE Post (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  theme VARCHAR(50),
  image_url TEXT,
  youtube_url TEXT,
  timer_type VARCHAR(50) DEFAULT 'none',
  timer_date TIMESTAMP,
  scheduled_date TIMESTAMP,
  is_published BOOLEAN DEFAULT false,
  notify_users BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  liked_by TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by VARCHAR(255),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW()
);

-- Create UserPreference table
CREATE TABLE UserPreference (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pseudo VARCHAR(255) NOT NULL,
  themes TEXT[] DEFAULT ARRAY[]::TEXT[],
  notifications_enabled BOOLEAN DEFAULT true,
  setup_complete BOOLEAN DEFAULT false,
  created_by VARCHAR(255),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW()
);

-- Create storage bucket for posts
-- (Done via Supabase UI: Storage > Create bucket > posts > Public)

-- Create RLS policies (Row Level Security)
ALTER TABLE Post ENABLE ROW LEVEL SECURITY;
ALTER TABLE UserPreference ENABLE ROW LEVEL SECURITY;

-- Allow users to read all published posts
CREATE POLICY "Allow reading published posts"
  ON Post FOR SELECT
  USING (is_published = true);

-- Allow users to read their own unpublished posts
CREATE POLICY "Allow reading own posts"
  ON Post FOR SELECT
  USING (auth.email() = created_by);

-- Allow users to create posts
CREATE POLICY "Allow users to create posts"
  ON Post FOR INSERT
  WITH CHECK (auth.email() = created_by);

-- Allow users to update their own posts
CREATE POLICY "Allow updating own posts"
  ON Post FOR UPDATE
  USING (auth.email() = created_by);

-- Allow users to delete their own posts
CREATE POLICY "Allow deleting own posts"
  ON Post FOR DELETE
  USING (auth.email() = created_by);

-- UserPreference policies
CREATE POLICY "Allow users to create preferences"
  ON UserPreference FOR INSERT
  WITH CHECK (auth.email() = created_by);

CREATE POLICY "Allow users to read own preferences"
  ON UserPreference FOR SELECT
  USING (auth.email() = created_by);

CREATE POLICY "Allow users to update own preferences"
  ON UserPreference FOR UPDATE
  USING (auth.email() = created_by);
```

### 1.4 Configurer Storage

1. Allez à `Storage` dans Supabase
2. Créez un nouveau bucket intitulé `posts`
3. Rendez-le public en changeant les permissions

## 2. Configuration d'Authentification Supabase

### 2.1 Activer Email/Password Auth
1. Allez à `Authentication` > `Providers`
2. Activez `Email` si ce n'est pas fait
3. Configurez les emails de confirmation si souhaité

### 2.2 Configurer les URL autorisées
1. Allez à `Authentication` > `URL Configuration`
2. Ajoutez vos URLs locales et de production:
   - `http://localhost:5173` (développement)
   - `https://votre-domaine.vercel.app` (production)

## 3. Configuration locale

### 3.1 Installer les dépendances
```bash
npm install
```

### 3.2 Mettre à jour .env.local
Créez un fichier `.env.local` à la racine du projet:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anonymous-key
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id
```

### 3.3 Tester localement
```bash
npm run dev
```

## 4. Déploiement sur Vercel

### 4.1 Créer un compte Vercel
1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec GitHub/GitLab/Bitbucket

### 4.2 Importer le projet
1. Cliquez sur `New Project`
2. Sélectionnez votre repository
3. Vercel détectera automatiquement Vite

### 4.3 Configurer les variables d'environnement
1. Dans `Environment Variables`:
   - `VITE_SUPABASE_URL` = votre URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = votre clé API
   - `VITE_ONESIGNAL_APP_ID` = votre ID OneSignal (optionnel)

### 4.4 Déployer
Cliquez sur `Deploy` et attendez que le déploiement soit terminé!

## 5. Points importants

### Performance & Stockage
- Supabase inclut 1GB de stockage gratuit
- Rate limit pour les requêtes: vérifiez votre plan
- Les images sont stockées dans le bucket `posts`

### Sécurité
- Les données sensibles sont protégées par RLS (Row Level Security)
- Les utilisateurs ne peuvent voir que leurs propres données
- Les posts publiés sont accessibles à tous

### Webhooks (optionnel)
Pour les tâches programmées (ex: publier les posts schedulés):
1. Utilisez les Cron Jobs de Vercel
2. Ou connectez un service comme n8n/Zapier à Supabase

## 6. Migration depuis Base44

Toutes les références à Base44 ont été remplacées par:
- `postService` pour les opérations Post
- `userPreferenceService` pour les préférences utilisateur
- `fileService` pour l'upload de fichiers
- `supabase.auth` pour l'authentification

## 7. Support et ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Vercel](https://vercel.com/docs)
- [GitHub du projet puls](https://github.com/your-repo/puls)
