// ═══════════════════════════════════════════════════════════════
//  PULS. — CONFIG (Supabase + OneSignal)
//  ► Aucune carte bancaire requise, 100% gratuit
// ═══════════════════════════════════════════════════════════════

// ► Supabase (remplace avec tes vraies valeurs)
const SUPABASE_URL  = "https://ewtwbgbwregewnltnfts.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHdiZ2J3cmVnZXdubHRuZnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTkwOTIsImV4cCI6MjA5MDAzNTA5Mn0.2D_fGo0eOPX9VkffqYULN4ddD8OGKX-APmJPFRiDcuk";

// ► OneSignal (APP ID uniquement - la REST KEY est sécurisée côté serveur)
const ONESIGNAL_APP_ID = "fa5e5464-d139-4d38-b9d8-438d9f753375";

// ► Ton pseudo admin (le seul qui peut créer des posts)
const ADMIN_PSEUDO = "Firyx";

// ► Twitch & YouTube live (optionnel)
const TWITCH_CLIENT_ID = "v06465e5z4k4n5g2d55oz9qf5igzq6";
const TWITCH_BEARER_TOKEN = ""; // DÉSACTIVÉ - token expiré (401)
const TWITCH_CHANNEL_NAME = "firyx_yt";

const YOUTUBE_API_KEY = "AIzaSyC9BfN1gnX3-1iCzy2wOKbDX3MA40f2gjA";
const YOUTUBE_CHANNEL_ID = "UCIO2bQtiEVHfiYJjpQ-BRNg";

// ► Auto-post configuration
const AUTO_POST_ENABLED = {
  youtube_latest_video: false,  // Désactivé pour éviter posts d'amis
  twitch_live: false,           // Désactivé - Twitch 401
  youtube_live: true            // OK - détecte seulement les lives
};

const ALL_THEMES = [
  { id: "live",     label: "🔴 Live" },
  { id: "video",    label: "🎬 Vidéo" },
  { id: "short",    label: "⚡ Short" },
  { id: "event",    label: "📅 Événement" },
  { id: "game",     label: "🎮 Jouer avec moi" },
  { id: "creation", label: "🎨 Création" },
  { id: "invite",   label: "📨 Invitation" },
  { id: "other",    label: "💬 Autre" },
];
