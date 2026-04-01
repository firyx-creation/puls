# 🔐 Guide Complet: Admins + Notifications Push

## 📋 Table des matières
1. [Système d'Admins](#système-dadmins)
2. [Notifications Push via OneSignal](#notifications-push-via-onesignal)
3. [Sécurité](#sécurité)
4. [Déploiement](#déploiement)

---

## Système d'Admins

### Vue d'ensemble
- Les admins peuvent avoir accès à des fonctionnalités spéciales
- Les admins peuvent supprimer les posts d'autres utilisateurs
- Le rôle d'admin est stocké dans `UserPreference.role`

### 1. Ajouter la colonne `role` à Supabase

**Avant tout, exécutez ce script SQL dans Supabase:**

1. Allez à `SQL Editor` dans Supabase
2. Copiez-collez le contenu de `ADMIN_SETUP.sql`
3. Exécutez le script

```sql
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
ALTER TABLE "UserPreference" 
ADD COLUMN role public.user_role DEFAULT 'user';
```

### 2. Promouvoir un utilisateur en Admin

Dans Supabase, exécutez:
```sql
UPDATE "UserPreference" 
SET role = 'admin' 
WHERE created_by = 'votre-email@gmail.com';
```

### 3. Vérifier les Admins

```sql
SELECT created_by, pseudo, role 
FROM "UserPreference" 
WHERE role = 'admin';
```

### 4. Comment ça fonctionne dans l'App

**Dans Feed.jsx et Settings.jsx:**
```javascript
import { adminService } from '@/api/adminService';

// Vérifier si l'utilisateur est admin
const isAdmin = await adminService.checkIsAdmin(user.email);

// Afficher les fonctionnalités admin si isAdmin === true
{isAdmin && <AdminControls />}
```

---

## Notifications Push via OneSignal

### Architecture de sécurité

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Public)                      │
│  • Enregistrement des utilisateurs aux notifications          │
│  • Appelle /api/send-notification (public)                   │
│  • Clé REST API N'EST PAS exposée ✅ SÉCURISÉ                │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────┐
│            API VERCEL SERVERLESS (Backend)                    │
│  /api/send-notification.js                                   │
│  • Reçoit la requête du frontend                             │
│  • Utilise ONESIGNAL_REST_API_KEY (secrète) ✅ PROTÉGÉE    │
│  • Envoie la notification à OneSignal                        │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────┐
│                     ONESIGNAL (Service)                       │
│  • Reçoit la requête du backend Vercel                       │
│  • Envoie les notifications push aux utilisateurs            │
└──────────────────────────────────────────────────────────────┘
```

### 1. Configuration OneSignal

**Déjà fait:** La colonne `VITE_ONESIGNAL_APP_ID` est dans `.env.local`

**REST API Key (Côté Vercel):**
- Allez à OneSignal Dashboard > Settings > Keys & IDs
- Copiez la `REST API Key`
- **NE LA METTEZ JAMAIS AU FRONTEND**

### 2. Variables d'environnement Vercel

Allez à Vercel Settings > Environment Variables et ajoutez:

```
ONESIGNAL_REST_API_KEY = (votre REST API Key OneSignal)
VITE_ONESIGNAL_APP_ID = fa5e5464-d139-4d38-b9d8-438d9f753375
NOTIFICATION_SECRET_TOKEN = (optionnel - générez un token secret)
```

### 3. Comment envoyer une notification

**Dans le Frontend (Compose.jsx):**
```javascript
import { sendPushNotification } from '@/lib/onesignal';

// Simple
await sendPushNotification({
  title: "Nouveau post!",
  message: "Un utilisateur a publié un nouveau post",
  url: "/",
  segment: "All"  // 'All' ou un segment custom
});
```

**Le système automatiquement:**
1. Appelle `/api/send-notification` (votre API backend)
2. Le backend vérifie les clés secrètes
3. Le backend appelle OneSignal avec la REST API Key
4. OneSignal envoie les notifications aux utilisateurs

### 4. Segments OneSignal (avancé)

Vous pouvez créer des segments pour cibler des groupes d'utilisateurs:
```javascript
// Envoyer seulement aux admins
await sendPushNotification({
  title: "Alert Admin",
  message: "Un nouveau post attend approbation",
  segment: "admin_users"  // ← Custom segment
});
```

Pour créer des segments, utilisez le dashboard OneSignal.

---

## Sécurité

### ✅ Bonnes Pratiques

| ❌ À NE PAS FAIRE | ✅ À FAIRE |
|------------------|-----------|
| Exposer REST API Key au frontend | Stocker dans variables Vercel |
| Faire confiance aux tokens du frontend | Valider les tokens côté backend |
| Logger les clés secrètes | Logger seulement les IDs de notification |
| Utiliser le même token pour tous | Utiliser des tokens uniques par action |

### Sécuriser l'API

**Optionnel mais recommandé:** Ajouter un token secret

```javascript
// En local: générez un uuID
VITE_NOTIFICATION_SECRET_TOKEN=550e8400-e29b-41d4-a716-446655440000

// Le frontend l'envoie:
fetch('/api/send-notification', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_NOTIFICATION_SECRET_TOKEN}`
  }
});

// Le backend le vérifie:
if (req.headers.authorization !== `Bearer ${process.env.NOTIFICATION_SECRET_TOKEN}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

## Déploiement

### Sur Vercel

1. **Pushez le code:**
   ```bash
   git add .
   git commit -m "Add admin system and secure notifications"
   git push origin main
   ```

2. **Variables d'environnement Vercel:**
   ```
   ONESIGNAL_REST_API_KEY = sk_xxx...
   VITE_ONESIGNAL_APP_ID = fa5e5464-d139-4d38-b9d8-438d9f753375
   VITE_SUPABASE_URL = https://ewtwbgbw...supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1Ni...
   NOTIFICATION_SECRET_TOKEN = (optionnel)
   ```

3. **Test:**
   - Créez un post
   - Une notification doit être envoyée via l'API Vercel

### Déboguer les notifications

**Si les notifications ne s'envoient pas:**

1. Vérifiez les logs Vercel:
   ```bash
   vercel logs
   ```

2. Vérifiez que les variables d'environnement sont définies:
   ```bash
   vercel env list
   ```

3. Testez l'API directement:
   ```bash
   curl -X POST https://votre-site.vercel.app/api/send-notification \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","message":"Test message"}'
   ```

---

## Résumé

| Fonctionnalité | Comment ça marche | Où ? |
|---|---|---|
| **Admins** | Colonne `role` dans UserPreference | Supabase |
| **Notifications** | Frontend → Vercel API → OneSignal | Serverless |
| **Sécurité** | REST API Key stockée sur Vercel uniquement | Backend |
| **Vérification rôle** | `adminService.checkIsAdmin()` | Frontend & Backend |

C'est prêt ! 🚀
