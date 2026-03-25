export default async function handler(req, res) {
  // On récupère les données envoyées par ton app
  const { title, theme, themeLabel } = req.body;

  const ONESIGNAL_APP_ID = "fa5e5464-d139-4d38-b9d8-438d9f753375";
  const ONESIGNAL_REST_KEY = "os_v2_app_7jpfizgrhfgtrooyiogz65jtowbxkbdn5wdemvv5h4tjquv62hyqwjyilns3765bnse3ms23fekbn6aichbfdz2dzoxkjtqnt77c4lq"; // <--- METS TA CLÉ ICI

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