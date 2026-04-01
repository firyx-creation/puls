import { cn } from "@/lib/utils";

const THEME_CONFIG = {
  live: { emoji: "🔴", label: "Live" },
  video: { emoji: "🎬", label: "Vidéo" },
  short: { emoji: "⚡", label: "Short" },
  event: { emoji: "📅", label: "Événement" },
  game: { emoji: "🎮", label: "Jouer avec moi" },
  creation: { emoji: "🎨", label: "Création" },
  invite: { emoji: "📨", label: "Invitation" },
  other: { emoji: "💬", label: "Autre" },
};

export { THEME_CONFIG };

export default function ThemeChip({ theme, selected, onClick, size = "md" }) {
  const config = THEME_CONFIG[theme];
  if (!config) return null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(theme)}
      className={cn(
        "rounded-xl border transition-all duration-200 font-medium select-none",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
        selected
          ? "bg-primary/20 border-primary text-primary-foreground shadow-lg shadow-primary/10"
          : "bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {config.emoji} {config.label}
    </button>
  );
}