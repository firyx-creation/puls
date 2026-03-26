export default async function handler(req, res) {
  // On récupère les données envoyées par ton app
  const { title, theme, themeLabel } = req.body;

  // Récupère les clés depuis les variables d'environnement
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) {
    return res.status(500).json({ error: "Variables d'environnement OneSignal manquantes" });
  }

  const body = {
    app_id: ONESIGNAL_APP_ID,
    headings: { "fr": "puls. — " + themeLabel },
    contents: { "fr": title },
    url: "https://puls-eight.vercel.app",
    filters: [
      { "field": "tag", "key": theme, "relation": "=", "value": "true" }
    ]
  };

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
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}