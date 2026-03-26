# PULS. — GUIDE DE CONFIGURATION

## 🐛 Bugs corrigés

1. ✅ **Suppression du mélange OneSignal/ntfy.sh** - Utilisation de OneSignal uniquement
2. ✅ **Suppression de l'API Vercel manquante** - Notification directe depuis le navigateur
3. ✅ **Nettoyage du code Firebase** - Utilisation de Supabase seulement
4. ✅ **Correction de la fonction sendOneSignalNotification** - Gestion d'erreurs complète
5. ✅ **Fix des tags OneSignal** - Configuration correcte des filtres
6. ✅ **Amélioration du flux de notifications** - Feedback utilisateur

## 📋 Configuration Supabase (OBLIGATOIRE)

### 1. Créer la table `posts`

Va dans Supabase > SQL Editor et exécute :

```sql
-- Table pour les posts
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  theme TEXT NOT NULL,
  image_url TEXT,
  timer_type TEXT DEFAULT 'none',
  timer_target TIMESTAMPTZ,
  publish_at TIMESTAMPTZ DEFAULT NOW(),
  author TEXT NOT NULL,
  notify BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_posts_publish_at ON posts(publish_at DESC);
CREATE INDEX idx_posts_theme ON posts(theme);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Active Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Politique : tout le monde peut lire les posts publiés
CREATE POLICY "Tout le monde peut lire les posts publiés"
  ON posts FOR SELECT
  USING (publish_at <= NOW());

-- Politique : tout le monde peut créer (tu peux restreindre après)
CREATE POLICY "Tout le monde peut créer des posts"
  ON posts FOR INSERT
  WITH CHECK (true);
```

### 2. Créer la table `users`

```sql
-- Table pour les utilisateurs
CREATE TABLE users (
  pseudo TEXT PRIMARY KEY,
  prefs JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique : tout le monde peut lire
CREATE POLICY "Lecture publique"
  ON users FOR SELECT
  USING (true);

-- Politique : tout le monde peut créer/modifier son profil
CREATE POLICY "Upsert publique"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Update publique"
  ON users FOR UPDATE
  USING (true);
```

### 3. Créer le Storage pour les images

1. Va dans **Storage** > **Create Bucket**
2. Nom : `images`
3. **Public bucket** : ✅ Coché
4. Clique sur **Save**

Ensuite, configure les politiques :

```sql
-- Permet à tout le monde d'uploader des images
CREATE POLICY "Tout le monde peut uploader"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images');

-- Permet à tout le monde de lire les images
CREATE POLICY "Images publiques"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');
```

### 4. Activer Realtime

1. Va dans **Database** > **Replication**
2. Trouve la table `posts`
3. Active **Realtime** (toggle à droite)

## 🔔 Configuration OneSignal

### Étape 1 : Créer un compte OneSignal

1. Va sur [onesignal.com](https://onesignal.com)
2. Crée un compte gratuit
3. Crée une nouvelle app **Web Push**

### Étape 2 : Configuration Web Push

1. Dans **Settings** > **Platforms** > **Web**
2. **Site URL** : `https://ton-domaine.vercel.app` (ou localhost pour les tests)
3. **Default Icon URL** : URL de ton icône (optionnel)
4. **Auto Resubscribe** : ✅ Activé
5. Sauvegarde

### Étape 3 : Récupérer tes clés

Les clés dans `config.js` sont déjà configurées :
- `ONESIGNAL_APP_ID` : ✅ Déjà configuré
- `ONESIGNAL_REST_KEY` : ✅ Déjà configuré

**⚠️ IMPORTANT** : Ne partage JAMAIS ta `ONESIGNAL_REST_KEY` publiquement !

Pour la production, tu devrais créer une API serverless (Vercel Functions) pour cacher cette clé.

## 🚀 Déploiement

### Option 1 : Vercel (recommandé)

1. Push ton code sur GitHub
2. Va sur [vercel.com](https://vercel.com)
3. **Import Git Repository**
4. Sélectionne ton repo
5. Configure les variables d'environnement (optionnel)
6. Deploy !

### Option 2 : Netlify

1. Push ton code sur GitHub
2. Va sur [netlify.com](https://netlify.com)
3. **New site from Git**
4. Sélectionne ton repo
5. Build settings :
   - **Build command** : (vide)
   - **Publish directory** : `.`
6. Deploy !

## 📱 Test des notifications

### 1. Test local (avec HTTPS)

OneSignal nécessite HTTPS. Pour tester en local :

```bash
# Utilise ngrok ou localhost.run
npx ngrok http 3000
```

Ou utilise un serveur local HTTPS :

```bash
# Avec Python
python3 -m http.server 8000 --bind 127.0.0.1
```

### 2. Autoriser les notifications

1. Ouvre l'app dans ton navigateur
2. Crée un compte avec ton pseudo
3. Active les notifications (toggle)
4. **Autorise** quand le navigateur demande la permission

### 3. Tester l'envoi

1. Connecte-toi en tant qu'admin (pseudo = "Firyx")
2. Crée un nouveau post
3. Coche "Notifier les abonnés"
4. Publie
5. Vérifie la console pour les logs

## 🔧 Debugging

### Problème : "Notifications refusées"

**Solution** : 
- Vérifie que tu es sur HTTPS (ou localhost)
- Réinitialise les permissions du navigateur
- Chrome : `chrome://settings/content/notifications`
- Safari : Préférences > Sites web > Notifications

### Problème : "Erreur OneSignal API"

**Solution** :
- Vérifie que `ONESIGNAL_REST_KEY` est correcte
- Ouvre la console réseau (F12) pour voir l'erreur exacte
- Vérifie que l'app OneSignal est bien configurée en "Web Push"

### Problème : "Les posts ne s'affichent pas"

**Solution** :
- Vérifie la console pour les erreurs Supabase
- Vérifie que les politiques RLS sont bien configurées
- Vérifie que `publish_at` est dans le passé

### Problème : "L'upload d'image échoue"

**Solution** :
- Vérifie que le bucket `images` existe
- Vérifie qu'il est public
- Vérifie les politiques de storage

## 📊 Monitoring

### OneSignal Dashboard

Va sur [onesignal.com](https://onesignal.com) > Dashboard pour voir :
- Nombre de notifications envoyées
- Taux de délivrance
- Nombre d'utilisateurs abonnés
- Tags actifs

### Supabase Dashboard

Va sur [supabase.com](https://supabase.com) > Project pour voir :
- Nombre de posts
- Nombre d'utilisateurs
- Utilisation du storage
- Logs en temps réel

## 🎯 Prochaines étapes

1. **Sécuriser l'API** : Créer une Vercel Function pour cacher `ONESIGNAL_REST_KEY`
2. **Modération** : Ajouter un système de validation des posts
3. **Likes/Commentaires** : Ajouter de l'interaction
4. **Notifications programmées** : Utiliser Supabase Edge Functions pour les posts programmés
5. **Analytics** : Intégrer Google Analytics ou Plausible

## 📝 Structure des fichiers

```
puls/
├── index.html              # Page principale
├── manifest.json           # PWA manifest
├── OneSignalSDKWorker.js   # Service Worker OneSignal
├── css/
│   └── app.css            # Styles
├── js/
│   ├── config.js          # Configuration (Supabase + OneSignal)
│   └── app.js             # Logique principale
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 🆘 Support

- **OneSignal Docs** : https://documentation.onesignal.com/docs/web-push-quickstart
- **Supabase Docs** : https://supabase.com/docs
- **Discord Supabase** : https://discord.supabase.com

---

Fait avec ❤️ par Firyx
