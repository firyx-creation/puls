import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postService, fileService } from "@/api/supabaseServices";
import { motion } from "framer-motion";
import { ArrowLeft, ImagePlus, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ThemeChip from "../components/shared/ThemeChip";
import YouTubeEmbed, { extractYouTubeId } from "../components/shared/YouTubeEmbed";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendPushNotification } from "@/lib/onesignal";

const ALL_THEMES = ["live", "video", "short", "event", "game", "creation", "invite", "other"];

export default function Compose() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("live");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [timerType, setTimerType] = useState("none");
  const [timerDate, setTimerDate] = useState("");
  const [schedType, setSchedType] = useState("now");
  const [schedDate, setSchedDate] = useState("");
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) return;
    setPublishing(true);

    try {
      let image_url = null;
      if (imageFile) {
        const uploadResult = await fileService.uploadFile(imageFile, 'posts');
        image_url = uploadResult.url;
      }

      const postData = {
        title: title.trim(),
        description: description.trim() || undefined,
        theme,
        image_url: image_url || undefined,
        youtube_url: youtubeUrl.trim() || undefined,
        timer_type: timerType,
        timer_date: timerType !== "none" && timerDate ? timerDate : undefined,
        scheduled_date: schedType === "later" && schedDate ? schedDate : undefined,
        is_published: true,
        notify_users: notifyUsers,
        likes_count: 0,
        liked_by: [],
      };

      await postService.create(postData);

      // Send push notification via OneSignal
      if (notifyUsers) {
        await sendPushNotification({
          title: title.trim(),
          message: description.trim() || "Nouveau post disponible !",
          url: "/",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post publié !");
      navigate("/");
    } catch (error) {
      console.error("Failed to publish post:", error);
      toast.error("Erreur lors de la publication");
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Nouveau post</h1>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-4 py-4 space-y-4"
      >
        {/* Title */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Titre <span className="text-destructive">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de ton annonce..."
            maxLength={80}
            className="bg-secondary border-0 h-12 text-base"
          />
        </div>

        {/* Description */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Plus de détails..."
            rows={3}
            className="bg-secondary border-0 text-base resize-none"
          />
        </div>

        {/* Theme */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Thème <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_THEMES.map((t) => (
              <ThemeChip key={t} theme={t} selected={theme === t} onClick={setTheme} />
            ))}
          </div>
        </div>

        {/* Image */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Image (optionnel)
          </label>
          <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-border bg-secondary/50 cursor-pointer hover:border-primary/40 transition-colors overflow-hidden">
            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlus className="w-8 h-8" />
                <span className="text-sm">Appuie pour choisir une image</span>
              </div>
            )}
          </label>
        </div>

        {/* YouTube */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vidéo YouTube (optionnel)
          </label>
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Colle un lien YouTube..."
            className="bg-secondary border-0 h-12 text-base"
          />
          {extractYouTubeId(youtubeUrl) && (
            <div className="mt-2">
              <YouTubeEmbed url={youtubeUrl} />
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Timer
          </label>
          <div className="flex rounded-xl bg-secondary overflow-hidden">
            {[
              { val: "none", label: "Aucun" },
              { val: "countdown", label: "Commence dans..." },
              { val: "remaining", label: "Temps restant" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setTimerType(opt.val)}
                className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                  timerType === opt.val
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {timerType !== "none" && (
            <Input
              type="datetime-local"
              value={timerDate}
              onChange={(e) => setTimerDate(e.target.value)}
              className="bg-secondary border-0 h-12"
            />
          )}
        </div>

        {/* Schedule */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Publication
          </label>
          <div className="flex rounded-xl bg-secondary overflow-hidden">
            {[
              { val: "now", label: "Maintenant" },
              { val: "later", label: "Programmer" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setSchedType(opt.val)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  schedType === opt.val
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {schedType === "later" && (
            <Input
              type="datetime-local"
              value={schedDate}
              onChange={(e) => setSchedDate(e.target.value)}
              className="bg-secondary border-0 h-12"
            />
          )}
        </div>

        {/* Notify */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notifier les abonnés
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Envoie un email de notification
              </p>
            </div>
            <Switch checked={notifyUsers} onCheckedChange={setNotifyUsers} />
          </div>
        </div>

        {/* Publish button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePublish}
          disabled={!title.trim() || publishing}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
        >
          {publishing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Publier
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}