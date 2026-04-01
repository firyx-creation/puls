import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { userPreferenceService } from "@/api/supabaseServices";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ThemeChip from "../components/shared/ThemeChip";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { initOneSignal, subscribeUser } from "@/lib/onesignal";

const ALL_THEMES = ["live", "video", "short", "event", "game", "creation", "invite", "other"];

export default function Setup() {
  const navigate = useNavigate();
  const [pseudo, setPseudo] = useState("");
  const [selectedThemes, setSelectedThemes] = useState(["live"]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleTheme = (theme) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]
    );
  };

  const handleStart = async () => {
    if (!pseudo.trim()) return;
    setLoading(true);
    try {
      await userPreferenceService.create({
        pseudo: pseudo.trim(),
        themes: selectedThemes,
        notifications_enabled: notificationsEnabled,
        setup_complete: true,
      });
      if (notificationsEnabled) {
        await initOneSignal();
        await subscribeUser();
      }
      toast.success("Profil créé avec succès !");
      navigate("/");
    } catch (error) {
      console.error("Failed to setup profile:", error);
      toast.error("Erreur lors de la création du profil");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight">
            puls<span className="text-primary">.</span>
          </h1>
          <p className="text-muted-foreground text-sm">Ton espace, tes annonces.</p>
        </div>

        {/* Pseudo */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ton pseudo
          </label>
          <Input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="ex: streamer_alex"
            maxLength={30}
            className="bg-secondary border-0 h-12 text-base"
          />
        </div>

        {/* Preferences */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tes préférences{" "}
            <span className="font-normal normal-case text-muted-foreground/60">
              (choisis ce qui t'intéresse)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_THEMES.map((theme) => (
              <ThemeChip
                key={theme}
                theme={theme}
                selected={selectedThemes.includes(theme)}
                onClick={toggleTheme}
              />
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notifications push
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Reçois les alertes en temps réel
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </div>

        {/* Start button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          disabled={!pseudo.trim() || loading}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg disabled:opacity-40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            "Commencer →"
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}