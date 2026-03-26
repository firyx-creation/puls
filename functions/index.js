// ═══════════════════════════════════════════════════════════════
//  PULS. — CLOUD FUNCTION
//  S'exécute sur Firebase (serveur) quand un nouveau post est créé
//  Envoie les notifications push FCM aux bons utilisateurs
// ═══════════════════════════════════════════════════════════════

const functions  = require("firebase-functions");
const admin      = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ── Déclenché à chaque nouveau post dans Firestore ──
exports.sendPostNotification = functions.firestore
  .document("posts/{postId}")
  .onCreate(async (snap, context) => {
    const post = snap.data();

    // N'envoie pas si le post est programmé dans le futur
    const now = admin.firestore.Timestamp.now();
    if (post.publishAt && post.publishAt.seconds > now.seconds + 10) {
      console.log("Post programmé, pas de notif maintenant.");
      return null;
    }

    // N'envoie pas si l'admin n'a pas coché "notifier"
    if (!post.notify) {
      console.log("Notif désactivée pour ce post.");
      return null;
    }

    const theme = post.theme || "other";
    const title = `puls. — ${themeLabel(theme)}`;
    const body  = post.title || "Nouveau contenu disponible !";

    // Récupère tous les tokens FCM dont les prefs incluent ce thème
    const tokensSnap = await db.collection("fcm_tokens")
      .where("prefs", "array-contains", theme)
      .get();

    if (tokensSnap.empty) {
      console.log("Aucun abonné pour le thème:", theme);
      return null;
    }

    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
    if (tokens.length === 0) return null;

    console.log(`Envoi de ${tokens.length} notifications pour le thème ${theme}...`);

    // Envoie par lots de 500 (limite FCM)
    const chunks = chunkArray(tokens, 500);
    for (const chunk of chunks) {
      const message = {
        notification: { title, body },
        data: {
          postId: context.params.postId,
          theme,
          url: "/",
        },
        tokens: chunk,
        webpush: {
          notification: {
            title,
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            vibrate: [200, 100, 200],
          },
          fcmOptions: { link: "/" },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Succès: ${response.successCount}, Échec: ${response.failureCount}`);

      // Nettoie les tokens invalides
      const invalid = [];
      response.responses.forEach((r, i) => {
        if (!r.success && r.error?.code === "messaging/registration-token-not-registered") {
          invalid.push(chunk[i]);
        }
      });
      if (invalid.length > 0) {
        const batch = db.batch();
        invalid.forEach(token => {
          const ref = db.collection("fcm_tokens").doc(token);
          batch.delete(ref);
        });
        await batch.commit();
        console.log(`${invalid.length} tokens invalides supprimés.`);
      }
    }

    return null;
  });

// ── Déclenché pour les posts programmés ──
// Vérifie toutes les minutes si des posts programmés doivent être publiés
exports.publishScheduledPosts = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    const snap = await db.collection("posts")
      .where("publishAt", "<=", now)
      .where("notified", "==", false)
      .get();

    for (const doc of snap.docs) {
      const post = doc.data();
      
      // Marque comme notifié pour ne pas renvoyer
      await doc.ref.update({ notified: true });
      
      // Envoie les notifications si le post les demande
      if (post.notify) {
        try {
          // Récupère les abonnés du thème
          const theme = post.theme || "other";
          const title = `puls. — ${themeLabel(theme)}`;
          const body = post.title || "Nouveau contenu disponible !";

          const tokensSnap = await db.collection("fcm_tokens")
            .where("prefs", "array-contains", theme)
            .get();

          if (tokensSnap.empty) {
            console.log("Aucun abonné pour le thème schedulé:", theme);
            return;
          }

          const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
          if (tokens.length === 0) return;

          console.log(`Envoi de ${tokens.length} notifications pour post schedulé (thème ${theme})...`);

          // Envoie par lots de 500
          const chunks = chunkArray(tokens, 500);
          for (const chunk of chunks) {
            const message = {
              notification: { title, body },
              data: {
                postId: doc.id,
                theme,
                url: "/",
              },
              tokens: chunk,
              webpush: {
                notification: {
                  title,
                  body,
                  icon: "/icons/icon-192.png",
                  badge: "/icons/icon-192.png",
                  vibrate: [200, 100, 200],
                },
                fcmOptions: { link: "/" },
              },
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`Succès: ${response.successCount}, Échec: ${response.failureCount}`);

            // Nettoie les tokens invalides
            const invalid = [];
            response.responses.forEach((r, i) => {
              if (!r.success && r.error?.code === "messaging/registration-token-not-registered") {
                invalid.push(chunk[i]);
              }
            });
            if (invalid.length > 0) {
              const batch = db.batch();
              invalid.forEach(token => {
                const ref = db.collection("fcm_tokens").doc(token);
                batch.delete(ref);
              });
              await batch.commit();
              console.log(`${invalid.length} tokens invalides supprimés.`);
            }
          }
        } catch (err) {
          console.error("Erreur lors de l'envoi des notifications programmées:", err);
        }
      }
    }
    
    return null;
  });

// ── Helpers ──
function themeLabel(theme) {
  const map = {
    live:     "🔴 Live",
    video:    "🎬 Vidéo",
    short:    "⚡ Short",
    event:    "📅 Événement",
    game:     "🎮 Jouer avec moi",
    creation: "🎨 Création",
    invite:   "📨 Invitation",
    other:    "💬 Nouveau post",
  };
  return map[theme] || "Nouveau post";
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
