import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { userPreferenceService } from "@/api/supabaseServices";
import { adminService } from "@/api/adminService";
import { maintenanceService } from "@/api/maintenanceService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, User, Shield, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import ThemeChip from "../components/shared/ThemeChip";
import BottomNav from "../components/shared/BottomNav";

const ALL_THEMES = ["live", "video", "short", "event", "game", "creation", "invite", "other"];

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  const { data: pref, isLoading } = useQuery({
    queryKey: ["userPreference", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const list = await userPreferenceService.filter({ created_by: user.email });
        return list[0] || null;
      } catch (error) {
        console.error("Failed to fetch user preferences:", error);
        return null;
      }
    },
    enabled: !!user?.email,
  });

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    if (user?.email) {
      adminService.checkIsAdmin(user.email).then(setIsAdmin);
    }
  }, [user?.email]);

  // Charger le statut de maintenance si admin
  useEffect(() => {
    if (isAdmin) {
      maintenanceService.getStatus().then((status) => {
        setMaintenanceEnabled(status.enabled);
        setMaintenanceMessage(status.message);
      });
    }
  }, [isAdmin]);

  const updatePref = async (field, value) => {
    if (!pref) return;
    setSaving(true);
    try {
      await userPreferenceService.update(pref.id, { [field]: value });
      queryClient.invalidateQueries({ queryKey: ["userPreference", user?.email] });
    } catch (error) {
      console.error("Failed to update preference:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTheme = (theme) => {
    const current = pref?.themes || [];
    const updated = current.includes(theme)
      ? current.filter((t) => t !== theme)
      : [...current, theme];
    updatePref("themes", updated);
  };

  const handleMaintenanceToggle = async (enabled) => {
    setLoadingMaintenance(true);
    try {
      await maintenanceService.setStatus(
        enabled,
        maintenanceMessage || "Maintenance en cours. Reviens plus tard!",
        null
      );
      setMaintenanceEnabled(enabled);
    } catch (error) {
      console.error("Failed to update maintenance status:", error);
      alert("Erreur lors de la mise à jour du statut de maintenance");
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const handleMaintenanceMessageChange = async (newMessage) => {
    setMaintenanceMessage(newMessage);
    try {
      await maintenanceService.setStatus(
        maintenanceEnabled,
        newMessage || "Maintenance en cours. Reviens plus tard!",
        null
      );
    } catch (error) {
      console.error("Failed to update maintenance message:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Réglages</h1>
          {saving && (
            <div className="ml-auto w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          )}
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-4 py-4 space-y-4"
      >
        {/* Pseudo */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ton pseudo
          </label>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold">{pref?.pseudo || "—"}</span>
          </div>
        </div>

        {/* Themes */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tes préférences
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_THEMES.map((theme) => (
              <ThemeChip
                key={theme}
                theme={theme}
                selected={pref?.themes?.includes(theme)}
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
                Notifications
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Recevoir les emails de notification
              </p>
            </div>
            <Switch
              checked={pref?.notifications_enabled ?? true}
              onCheckedChange={(val) => updatePref("notifications_enabled", val)}
            />
          </div>
        </div>

        {/* Admin Badge */}
        {isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-900">Administrateur</p>
              <p className="text-xs text-amber-700">Tu as accès aux fonctionnalités admin</p>
            </div>
          </div>
        )}

        {/* Maintenance */}
        {isAdmin && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <label className="text-xs font-semibold uppercase tracking-wider text-red-600">
                Mode maintenance
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-900">Bloquer l'accès aux non-admin</p>
                <p className="text-xs text-red-700/70 mt-1">
                  Les utilisateurs non-admin verront le message de maintenance
                </p>
              </div>
              <Switch
                checked={maintenanceEnabled}
                onCheckedChange={handleMaintenanceToggle}
                disabled={loadingMaintenance}
              />
            </div>

            {maintenanceEnabled && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-red-600">Message personnalisé</label>
                <Textarea
                  value={maintenanceMessage}
                  onChange={(e) => handleMaintenanceMessageChange(e.target.value)}
                  placeholder="Écris le message que vont voir les utilisateurs..."
                  className="min-h-20 text-sm"
                  disabled={loadingMaintenance}
                />
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </motion.div>

      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}