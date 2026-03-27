export default async function handler(req, res) {
  // On récupère les données envoyées par ton app
  const { title, theme, themeLabel } = req.body;

  console.log("📨 API send-push reçu:", { title, theme, themeLabel });

  // Récupère les clés depuis les variables d'environnement
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) {
    console.error("❌ Variables d'environnement OneSignal manquantes!");
    return res.status(500).json({ error: "Variables d'environnement OneSignal manquantes" });
  }

  // Deux options pour envoyer :
  // 1. Par segment (tous les utilisateurs) - plus fiable
  // 2. Par filtre de tag - si les tags sont bien définis
  
  const body = {
    app_id: ONESIGNAL_APP_ID,
    headings: { "en": "puls. — " + themeLabel },
    contents: { "en": title },
    url: "https://puls-eight.vercel.app",
    // Utiliser segments au lieu de filters pour une meilleure fiabilité
    included_segments: ["All"],
    // Filtrer par tag quand même pour plus de précision
    filters: [
      { "field": "tag", "key": theme, "relation": "=", "value": "true" }
    ]
  };

  console.log("📤 Préparation envoi OneSignal avec:");
  console.log("  - Theme tag:", theme);
  console.log("  - Titre:", title);

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic " + ONESIGNAL_REST_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ Erreur OneSignal API:", {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      
      // Si "All included players are not subscribed", c'est normal au départ
      if (data.errors && data.errors.includes("All included players are not subscribed")) {
        console.warn("⚠️ Aucun utilisateur abonné pour ce thème - c'est normal au départ");
        return res.status(200).json({ 
          success: false, 
          message: "Aucun utilisateur abonné pour ce thème",
          data: data
        });
      }
      
      return res.status(response.status).json(data);
    }
    
    console.log("✅ Notification envoyée via OneSignal:", {
      id: data.id,
      recipients: data.recipients
    });
    return res.status(200).json(data);
    
  } catch (err) {
    console.error("❌ Erreur fetch OneSignal:", err.message);
    return res.status(500).json({ error: err.message });
  }
}