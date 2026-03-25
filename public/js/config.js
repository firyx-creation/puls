// ═══════════════════════════════════════════════════════════════
//  PULS. — CONFIG (Supabase + ntfy.sh)
//  ► Aucune carte bancaire requise, 100% gratuit
// ═══════════════════════════════════════════════════════════════

// ► Supabase (remplace avec tes vraies valeurs — voir GUIDE.md)
const SUPABASE_URL  = "https://ewtwbgbwregewnltnfts.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dHdiZ2J3cmVnZXdubHRuZnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTkwOTIsImV4cCI6MjA5MDAzNTA5Mn0.2D_fGo0eOPX9VkffqYULN4ddD8OGKX-APmJPFRiDcuk";
const ONESIGNAL_APP_ID = "fa5e5464-d139-4d38-b9d8-438d9f753375";
const ONESIGNAL_REST_KEY = "os_v2_app_7jpfizgrhfgtrooyiogz65jtowbxkbdn5wdemvv5h4tjquv62hyqwjyilns3765bnse3ms23fekbn6aichbfdz2dzoxkjtqnt77c4lq"; 
// ► ntfy.sh — Choisis un nom de "topic" unique (comme un canal secret)
// Ex: "puls_alex42" — plus c'est unique, mieux c'est
// Les topics sont publics sur ntfy.sh, donc choisis un nom difficile à deviner
const NTFY_BASE     = "https://ntfy.sh";
const NTFY_TOPICS   = {
  live:     "REMPLACE_puls_live",
  video:    "REMPLACE_puls_video",
  short:    "REMPLACE_puls_short",
  event:    "REMPLACE_puls_event",
  game:     "REMPLACE_puls_game",
  creation: "REMPLACE_puls_creation",
  invite:   "REMPLACE_puls_invite",
  other:    "REMPLACE_puls_other",
};

// ► Ton pseudo admin (le seul qui peut créer des posts)
const ADMIN_PSEUDO = "Firyx";

// ► Tous les thèmes disponibles
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