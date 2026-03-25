# 📘 GUIDE COMPLET — puls.
## Installation & Déploiement étape par étape

---

## 🗂️ STRUCTURE DU PROJET

```
puls/
├── public/                  ← L'app web (PWA)
│   ├── index.html           ← Page principale
│   ├── manifest.json        ← Config PWA (icône, nom...)
│   ├── firebase-messaging-sw.js  ← Service Worker (notifs + offline)
│   ├── css/
│   │   └── app.css          ← Tout le style (thème sombre)
│   ├── js/
│   │   ├── config.js        ← ⚠️ TU DOIS REMPLIR CE FICHIER
│   │   └── app.js           ← Logique de l'app
│   └── icons/
│       ├── icon-192.png     ← Icône PWA (à créer)
│       └── icon-512.png     ← Icône PWA grande (à créer)
├── functions/               ← Cloud Functions Firebase (serveur)
│   ├── index.js             ← Envoi des notifications push
│   └── package.json
├── electron/                ← App Windows
│   ├── main.js              ← Fenêtre + systray
│   ├── package.json
│   └── icon.ico             ← Icône Windows (à créer)
├── firebase.json            ← Config Firebase
└── firestore.rules          ← Règles de sécurité
```

---

## ✅ ÉTAPE 1 — Installer les outils (1 fois)

### Sur Windows/Mac/Linux, installe :

1. **Node.js** (version 20+) → https://nodejs.org
   - Télécharge "LTS" et installe normalement

2. **Firebase CLI** — ouvre un terminal et tape :
   ```bash
   npm install -g firebase-tools
   ```

3. Vérifie que tout est ok :
   ```bash
   node --version    # doit afficher v20.x.x ou plus
   firebase --version  # doit afficher 13.x.x ou plus
   ```

---

## ✅ ÉTAPE 2 — Créer ton projet Firebase (gratuit)

1. Va sur https://console.firebase.google.com
2. Clique **"Ajouter un projet"**
3. Nom du projet : `puls` (ou ce que tu veux)
4. Désactive Google Analytics (pas nécessaire) → **Créer le projet**
5. Attends ~30 secondes que ça se crée

### Activer Firestore :
1. Dans le menu gauche : **Build → Firestore Database**
2. Clique **"Créer une base de données"**
3. Choisis **"Commencer en mode test"** (on configurera les règles après)
4. Région : `europe-west1` (ou la plus proche de toi)
5. **Activer**

### Activer Storage (pour les images) :
1. Menu gauche : **Build → Storage**
2. **"Commencer"** → mode test → même région → **Terminer**

### Activer les notifications push (FCM) :
1. Menu gauche : ⚙️ **Paramètres du projet** (roue dentée en haut à gauche)
2. Onglet **"Cloud Messaging"**
3. Dans la section **"Web Push certificates"**, clique **"Générer une paire de clés"**
4. **Copie la clé VAPID** qui apparaît → tu en auras besoin à l'étape 4

---

## ✅ ÉTAPE 3 — Récupérer les identifiants Firebase

1. Toujours dans les **Paramètres du projet** (⚙️)
2. Onglet **"Général"** → descends jusqu'à **"Tes applications"**
3. Clique l'icône **`</>`** (Web)
4. Nom de l'app : `puls-web` → **Enregistrer l'app**
5. Firebase te montre un bloc de code avec `firebaseConfig`
6. **Copie ces valeurs** (apiKey, authDomain, projectId, etc.)

---

## ✅ ÉTAPE 4 — Remplir le fichier config.js

Ouvre `public/js/config.js` et remplace chaque valeur :

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",          // ← colle ta valeur
  authDomain:        "puls-xxx.firebaseapp.com",
  projectId:         "puls-xxx",
  storageBucket:     "puls-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};

const VAPID_KEY = "BPxxxxxx...";   // ← la clé VAPID de l'étape 2

const ADMIN_PSEUDO = "alex";       // ← ton pseudo admin (celui qui créera les posts)
```

**⚠️ IMPORTANT : Fais la même chose dans `public/firebase-messaging-sw.js`**
(le Service Worker a besoin des mêmes valeurs, copie-les exactement pareil)

---

## ✅ ÉTAPE 5 — Créer les icônes

Tu as besoin de 2 fichiers PNG dans `public/icons/` :
- `icon-192.png` (192×192 pixels)
- `icon-512.png` (512×512 pixels)

### Option rapide — générer les icônes :
1. Va sur https://favicon.io ou https://realfavicongenerator.net
2. Génère une icône avec le texte "p." sur fond violet (#7c3aed)
3. Télécharge et renomme les fichiers

### Option encore plus rapide — créer un PNG basique :
Utilise n'importe quel éditeur (Paint, Canva, etc.) et crée un carré
192×192 violet foncé avec le texte "p." en blanc.

---

## ✅ ÉTAPE 6 — Déployer sur Firebase Hosting

Dans un terminal, dans le dossier `puls/` :

```bash
# Connexion à Firebase
firebase login

# Sélectionner ton projet
firebase use --add
# → choisit ton projet dans la liste → lui donne l'alias "default"

# Installer les dépendances des Cloud Functions
cd functions
npm install
cd ..

# Configurer les règles Firestore
# (copie le contenu de firestore.rules dans Firebase Console → Firestore → Règles)

# Déployer tout d'un coup
firebase deploy
```

Firebase te donne une URL du style :
`https://puls-xxx.web.app` ← **C'est l'URL de ton app !**

---

## ✅ ÉTAPE 7 — Configurer les règles Firestore

1. Va dans Firebase Console → **Firestore → Règles**
2. Efface tout et colle le contenu de `firestore.rules`
3. Clique **Publier**

---

## ✅ ÉTAPE 8 — Tester l'app

### Sur ton téléphone Android :
1. Ouvre Chrome sur Android
2. Va sur `https://puls-xxx.web.app`
3. Chrome propose automatiquement "Ajouter à l'écran d'accueil"
4. Accepte → l'app s'installe comme une vraie app !

### Sur ton iPhone (iOS 16.4+) :
1. Ouvre Safari (pas Chrome !)
2. Va sur `https://puls-xxx.web.app`
3. Icône Partager (carré avec flèche) → **"Sur l'écran d'accueil"**
4. Nommer "puls." → **Ajouter**
5. Ouvre depuis l'écran d'accueil → accepte les notifications

---

## ✅ ÉTAPE 9 — App Windows (Electron)

### Prérequis :
1. D'abord, mets à jour `electron/main.js` :
   Remplace `TON_PROJECT_ID` par ton vrai project ID Firebase :
   ```javascript
   const APP_URL = "https://puls-xxx.web.app";
   ```

2. Crée un fichier `electron/icon.ico` (icône Windows)
   → Utilise https://convertio.co pour convertir ton PNG en ICO

### Installer et lancer :
```bash
cd electron
npm install
npm start     # Lance l'app en mode dev pour tester
```

### Créer l'exécutable .exe portable :
```bash
npm run build
```
Le fichier `.exe` est dans `electron/dist/` → tu peux le partager/l'envoyer !

---

## 🔔 COMMENT FONCTIONNENT LES NOTIFICATIONS

```
TOI (admin)
  └─► Crées un post avec "Notifier = Oui"
       └─► Firestore sauvegarde le post
            └─► Cloud Function se déclenche automatiquement
                 └─► Cherche tous les tokens FCM dont les prefs = thème du post
                      └─► Envoie les notifications push via FCM (gratuit)
                           └─► Chaque abonné reçoit la notif sur son téléphone/Windows
```

---

## 🛠️ UTILISATION AU QUOTIDIEN

### Pour publier un post (toi, l'admin) :
1. Ouvre l'app (web ou Windows)
2. Configure avec ton pseudo admin (celui dans `ADMIN_PSEUDO`)
3. Le bouton **"＋"** apparaît dans la barre du haut
4. Remplis : titre, description, thème, image, timer, programmation
5. **Publier** → les abonnés du thème reçoivent une notif

### Pour tes abonnés :
1. Ils vont sur ton URL
2. Ils choisissent un pseudo + leurs thèmes préférés
3. Ils acceptent les notifications
4. Sur iOS : ils doivent ajouter à l'écran d'accueil (Safari → Partager → Sur l'écran d'accueil)
5. C'est tout ! Ils reçoivent les notifs automatiquement

---

## 💡 AJOUTER DES THÈMES PLUS TARD

Dans `public/js/config.js`, ajoute dans `ALL_THEMES` :
```javascript
{ id: "podcast", label: "🎙️ Podcast" },
```
Redéploie : `firebase deploy --only hosting`
Les utilisateurs voient le nouveau thème et peuvent l'ajouter depuis le filtre.

---

## 🆓 RÉSUMÉ DES COÛTS

| Service | Limite gratuite | Au-delà |
|---|---|---|
| Firebase Hosting | 10 GB/mois trafic | 0,15$/GB |
| Firestore | 50k lectures/jour | 0,06$/100k |
| Firebase Storage | 5 GB stockage | 0,026$/GB |
| FCM (notifications) | **Illimité** | Gratuit |
| Cloud Functions | 125k invocations/mois | 0,40$/million |

**Pour un usage personnel/communauté petite à moyenne : 100% gratuit.**

---

## ❓ PROBLÈMES FRÉQUENTS

**"Les notifications ne marchent pas sur iOS"**
→ L'utilisateur doit OBLIGATOIREMENT avoir ajouté l'app via Safari → Sur l'écran d'accueil.
  Les notifs PWA iOS ne fonctionnent pas depuis le navigateur directement.

**"Je ne vois pas le bouton ＋ pour créer des posts"**
→ Ton pseudo doit correspondre exactement à `ADMIN_PSEUDO` dans config.js (sensible à la casse).

**"firebase deploy échoue sur les Functions"**
→ Les Cloud Functions nécessitent le plan Blaze (pay-as-you-go). C'est toujours gratuit
  dans les limites, mais tu dois entrer une carte bancaire sur Firebase.
  Alternative : désactive les Functions et utilise un cron job gratuit (cron-job.org)
  qui appelle un endpoint de ton app.

**"L'app ne charge pas offline"**
→ Le Service Worker se met en cache après le premier chargement en ligne.
  Charge une fois avec internet, ensuite ça marche offline.
