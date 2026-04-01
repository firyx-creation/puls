# 📚 Documentation Complète - Migration Base44 → Supabase + Vercel + Admins + Notifications

## 🎯 Vue d'ensemble

Ce projet a été entièrement migré de **Base44** vers une stack moderne avec:
- **Supabase** pour la base de données et l'authentification
- **Vercel** pour l'hébergement et les API serverless
- **OneSignal** pour les notifications push (sécurisé)
- **Système d'admins** entièrement fonctionnel

## 📦 Contenu du projet

### 📄 Documentation
- `SETUP_GUIDE.md` - Guide complet de configuration Supabase + Vercel
- `ADMINS_AND_NOTIFICATIONS.md` - Système d'admins et notifications détaillé
- `DEPLOYMENT_CHECKLIST.md` - Checklist étape par étape pour déployer
- `README.md` - (This file)

### 🔧 Configuration
- `.env.local` - Variables d'environnement locales
- `vercel.json` - Configuration Vercel
- `vite.config.js` - Configuration Vite (sans Base44)
- `package.json` - Dépendances mises à jour

### 💻 Code Backend
- `api/send-notification.js` - API Vercel pour envoyer les notifs (sécurisé)

### 🎨 Code Frontend
- `src/lib/supabaseClient.js` - Client Supabase
- `src/lib/AuthContext.jsx` - Authentification Supabase
- `src/lib/onesignal.js` - Notifications (utilise maintenant le backend)
- `src/api/supabaseServices.js` - Services Supabase (Post, UserPreference, File)
- `src/api/adminService.js` - Gestion des rôles admin
- `src/pages/Feed.jsx` - Page d'accueil avec admin check
- `src/pages/Settings.jsx` - Réglages avec badge admin
- `src/pages/Compose.jsx` - Créer un post
- `src/pages/Setup.jsx` - Configuration initiale
- `src/components/feed/PostCard.jsx` - Carte de post

### 📊 Base de données SQL
- `ADMIN_SETUP.sql` - Script pour ajouter la colonne `role`

## 🚀 Démarrage rapide

### 1. Installation
```bash
npm install
```

### 2. Configuration locale
Créez `.env.local` avec:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
VITE_ONESIGNAL_APP_ID=fa5e5464-d139-4d38-b9d8-438d9f753375
```

### 3. Setup Supabase
- Allez à votre projet Supabase
- SQL Editor → Copiez le contenu du script dans `SETUP_GUIDE.md`
- Créez un bucket `posts` en Storage

### 4. Développement
```bash
npm run dev
```

### 5. Build & Déploiement
```bash
npm run build
# Déployez sur Vercel via Git
```

## 🔐 Architecture de sécurité

### Authentification
- Supabase Auth (email, Google, etc.)
- Gestion automatique des sessions
- Row Level Security (RLS) sur les tables

### Notifications
```
Frontend → /api/send-notification (public)
         ↓
API Vercel (protégée avec des variables d'env)
         ↓
OneSignal API (utilise REST KEY secrète)
         ↓
User devices (notifications push)
```

**Important:** La REST API Key OneSignal n'est JAMAIS exposée au frontend.

### Base de données
- Supabase PostgreSQL
- RLS activé pour toutes les tables
- Les utilisateurs ne peuvent voir que leurs données

## 👥 Système d'Admins

### Vérifier les admins
```sql
SELECT created_by, pseudo, role FROM "UserPreference" WHERE role = 'admin';
```

### Promouvoir un admin
```sql
UPDATE "UserPreference" 
SET role = 'admin' 
WHERE created_by = 'email@example.com';
```

### Dans le code
```javascript
import { adminService } from '@/api/adminService';

const isAdmin = await adminService.checkIsAdmin(user.email);
if (isAdmin) { /* afficher options admin */ }
```

## 🔔 Notifications Push

### Depuis le frontend
```javascript
import { sendPushNotification } from '@/lib/onesignal';

await sendPushNotification({
  title: "Titre",
  message: "Message",
  url: "/",           // optionnel
  segment: "All"      // optionnel
});
```

### Comment ça fonctionne
1. Frontend appelle `/api/send-notification`
2. API Vercel reçoit la requête
3. API Vercel appelle OneSignal (avec la clé secrète protégée)
4. OneSignal envoie les notifications aux utilisateurs

## 📱 Fonctionnalités

### Pour tous les utilisateurs
- ✅ Créer un compte (email + mot de passe ou Google)
- ✅ Créer des posts (texte, image, YouTube, timer)
- ✅ Afficher/filtrer les posts par thème
- ✅ Liker/unliker des posts
- ✅ Gérer ses préférences
- ✅ Recevoir des notifications

### Pour les admins
- ✅ Supprimer les posts d'autres utilisateurs
- ✅ Badge admin visible dans Settings

## 🧪 Tester

### Tester Supabase
```javascript
import { supabase } from '@/lib/supabaseClient';
const { data } = await supabase.from('Post').select('*');
```

### Tester les notifs
```javascript
import { sendPushNotification } from '@/lib/onesignal';
await sendPushNotification({
  title: "Test",
  message: "Message de test"
});
```

### Tester l'API Vercel
```bash
curl -X POST http://localhost:3000/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Test message"}'
```

## 🛠️ Maintenance

### Logs Vercel
```bash
vercel logs
```

### Voir les variables d'environnement
```bash
vercel env list
```

### Redéployer
```bash
vercel redeploy
```

### Vérifier la base de données
- Dashboard Supabase → Table Editor
- Vérifier les utilisateurs, posts, préférences

## 📊 Structure des tables Supabase

### Post
```sql
- id (UUID, PK)
- title (TEXT)
- description (TEXT)
- theme (VARCHAR)
- image_url (TEXT)
- youtube_url (TEXT)
- timer_type (VARCHAR)
- timer_date (TIMESTAMP)
- scheduled_date (TIMESTAMP)
- is_published (BOOLEAN)
- likes_count (INT)
- liked_by (TEXT[])
- created_by (VARCHAR)
- created_date (TIMESTAMP)
```

### UserPreference
```sql
- id (UUID, PK)
- pseudo (VARCHAR)
- themes (TEXT[])
- notifications_enabled (BOOLEAN)
- setup_complete (BOOLEAN)
- role (user_role: 'user' | 'admin')
- created_by (VARCHAR)
- created_date (TIMESTAMP)
```

## 🚨 Erreurs courantes et solutions

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Cannot find modules" | Dépendances non installées | `npm install` |
| Notifications ne s'envoient pas | REST API Key manquante sur Vercel | Ajouter ONESIGNAL_REST_API_KEY aux env vars |
| "Auth failed" | URL non autorisée | Ajouter le domaine à Supabase > URL Configuration |
| Posts vides | RLS trop restrictif | Vérifier les politiques RLS sur Supabase |

## 📞 Support

Consultez:
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation OneSignal](https://documentation.onesignal.com)

## ✅ Checklist finale

- [ ] Toutes les dépendances installées
- [ ] Supabase configuré et les tables créées
- [ ] OneSignal créé et les clés copiées
- [ ] `.env.local` rempli
- [ ] Tests locaux passent
- [ ] Déployé sur Vercel avec variables d'env
- [ ] Admin setup.sql exécuté
- [ ] Premier admin créé
- [ ] Notifications testées

---

**Version:** 1.0  
**Créé:** 1 Avril 2026  
**Stack:** React + Vite + Supabase + Vercel + OneSignal
