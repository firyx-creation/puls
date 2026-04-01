/**
 * Vercel Serverless Function pour envoyer les notifications OneSignal
 * À placer dans: api/send-notification.js
 * 
 * Variables d'environnement requises:
 * - ONESIGNAL_REST_API_KEY
 * - VITE_ONESIGNAL_APP_ID
 */

export default async function handler(req, res) {
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier la clé API secrète (optionnel mais recommandé)
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.NOTIFICATION_SECRET_TOKEN;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, message, url = '/', segment = 'All' } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.VITE_ONESIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: message },
        url: url,
        included_segments: [segment],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', data);
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({
      success: true,
      notificationId: data.body?.notification_id,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      error: 'Failed to send notification',
      details: error.message,
    });
  }
}
