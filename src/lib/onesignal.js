// ⚠️ Remplace ces valeurs avec tes clés OneSignal
// Dashboard OneSignal > Settings > Keys & IDs
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

let initialized = false;

export async function initOneSignal() {
  if (typeof window === "undefined" || initialized) return;
  if (!ONESIGNAL_APP_ID) {
    console.warn('VITE_ONESIGNAL_APP_ID not configured');
    return;
  }
  
  window.OneSignalDeferred = window.OneSignalDeferred || [];

  await new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      });
      initialized = true;
      resolve();
    });
  });
}

export async function subscribeUser() {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  await new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.Slidedown.promptPush();
      resolve();
    });
  });
}

export async function unsubscribeUser() {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  await new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.User.PushSubscription.optOut();
      resolve();
    });
  });
}

export async function isSubscribed() {
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      resolve(!!OneSignal.User.PushSubscription.optedIn);
    });
  });
}

/**
 * Envoyer une notification push via le backend Vercel (SÉCURISÉ)
 * La clé secrète REST API ne doit JAMAIS être exposée au frontend
 */
export async function sendPushNotification({ title, message, url = "/", segment = "All" }) {
  try {
    // Appeler la fonction Vercel serverless
    const response = await fetch("/api/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Optionnel: ajouter un token secret si configuré
        ...(import.meta.env.VITE_NOTIFICATION_SECRET_TOKEN && {
          "Authorization": `Bearer ${import.meta.env.VITE_NOTIFICATION_SECRET_TOKEN}`
        }),
      },
      body: JSON.stringify({
        title,
        message,
        url: window.location.origin + url,
        segment,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}