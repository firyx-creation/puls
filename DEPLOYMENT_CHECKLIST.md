# ✅ Checklist de Déploiement - Migration Base44 → Supabase + Vercel

## 🔍 Avant de déployer

### 1. Installation locale
- [ ] `npm install` - Installer toutes les dépendances
- [ ] Vérifier qu'aucune erreur npm n'apparait

### 2. Configuration Supabase
- [ ] Créer un compte sur https://supabase.com
- [ ] Créer un nouveau projet
- [ ] Aller à SQL Editor et exécuter le contenu de `SETUP_GUIDE.md` (section "Créer les tables")
- [ ] Créer un bucket storage nommé `posts` (public)
- [ ] Copier URL Supabase → `.env.local` (VITE_SUPABASE_URL)
- [ ] Copier clé anon → `.env.local` (VITE_SUPABASE_ANON_KEY)

### 3. Configuration OneSignal
- [ ] Créer un compte sur https://onesignal.com
- [ ] Créer une application
- [ ] Copier App ID → `.env.local` (VITE_ONESIGNAL_APP_ID)
- [ ] Copier REST API Key → À ajouter UNIQUEMENT à Vercel (pas en local)

### 4. Ajouter des admins
- [ ] Dans Supabase SQL Editor, exécuter le contenu de `ADMIN_SETUP.sql`
- [ ] Exécuter: `UPDATE "UserPreference" SET role = 'admin' WHERE created_by = 'votre-email@gmail.com';`
- [ ] Vérifier: `SELECT * FROM "UserPreference" WHERE role = 'admin';`

### 5. Test local
- [ ] `npm run dev`
- [ ] Aller à http://localhost:5173
- [ ] Créer un compte
- [ ] Faire le setup initial
- [ ] Créer un post
- [ ] Vérifier que le post apparait dans le feed
- [ ] Se déconnecter/reconnecter pour vérifier l'authentification

## 🚀 Déploiement sur Vercel

### 1. Github
- [ ] `git add .`
- [ ] `git commit -m "Migration Base44 to Supabase + Vercel"`
- [ ] `git push origin main`

### 2. Vercel
- [ ] Aller à https://vercel.com/new
- [ ] Connecter votre repository GitHub
- [ ] Vercel détecte Vite automatiquement ✅
- [ ] Cliquer "Deploy" (première fois)

### 3. Variables d'environnement Vercel
Après le déploiement initial, aller à Settings → Environment Variables et ajouter:

```
VITE_SUPABASE_URL = https://votre-project.supabase.co
VITE_SUPABASE_ANON_KEY = votre-clé-anon
VITE_ONESIGNAL_APP_ID = votre-app-id-onesignal
ONESIGNAL_REST_API_KEY = votre-rest-api-key
NOTIFICATION_SECRET_TOKEN = (optionnel - générez: uuidgen)
```

### 4. Redéployer
- [ ] Aller à Deployments
- [ ] Cliquer sur les 3 points du dernier déploiement
- [ ] Cliquer "Redeploy"

## 📋 Architecture finale

```
┌─────────────────────────────────────────┐
│  Frontend (Vite + React) - Vercel       │
│  ├─ Auth via Supabase                   │
│  ├─ Posts via Supabase DB               │
│  ├─ Images via Supabase Storage         │
│  └─ Notifs via /api/send-notification   │
└────────────┬────────────────────────────┘
             │
┌────────────┴─────────────────────────────┐
│  Backend Vercel Serverless               │
│  └─ /api/send-notification.js            │
│     (utilise ONESIGNAL_REST_API_KEY)     │
└────────────┬─────────────────────────────┘
             │
┌────────────┴─────────────────────────────┐
│  Services externes                       │
│  ├─ Supabase (DB + Auth + Storage)      │
│  ├─ OneSignal (Push Notifications)      │
│  └─ Vercel (Hosting + Serverless)       │
└──────────────────────────────────────────┘
```

## 🔐 Sécurité - Points clés

✅ **REST API Key OneSignal**: Stockée UNIQUEMENT sur Vercel (pas au frontend)
✅ **Authentification**: Supabase Auth (sécurisée)
✅ **Base de données**: Supabase PostgreSQL avec Row Level Security (RLS)
✅ **Storage**: Bucket publique pour images seulement

## 🐛 Déboguer

**Erreur "Cannot find modules":**
```bash
npm install
npm run dev
```

**Notifications ne s'envoient pas:**
```bash
vercel logs  # Voir les logs Vercel
vercel env list  # Vérifier les variables
```

**Problème d'authentification:**
- Vérifier les URLs autorisées sur Supabase > Settings > URL Configuration
- Ajouter votre domaine Vercel: `https://votre-site.vercel.app`

## ✨ Après le déploiement

- Emails de confirmation Supabase (optionnel)
- Webhook OneSignal (optionnel)
- Domain custom Vercel (optionnel)
- Analytics (optionnel)

---

**Status:** ✅ Prêt à déployer
**Date de création:** 1 Avril 2026
