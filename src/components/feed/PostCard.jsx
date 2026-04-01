import { useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { postService } from "@/api/supabaseServices";
import { cn } from "@/lib/utils";
import { THEME_CONFIG } from "../shared/ThemeChip";
import TimerDisplay from "../shared/TimerDisplay";
import YouTubeEmbed from "../shared/YouTubeEmbed";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PostCard({ post, userEmail, isAdmin, onUpdate, onDelete }) {
  const [animateLike, setAnimateLike] = useState(false);
  const liked = post.liked_by?.includes(userEmail);
  const theme = THEME_CONFIG[post.theme];

  const handleLike = async () => {
    try {
      const newLikedBy = liked
        ? (post.liked_by || []).filter((e) => e !== userEmail)
        : [...(post.liked_by || []), userEmail];

      setAnimateLike(!liked);
      await postService.update(post.id, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length,
      });
      onUpdate?.();
    } catch (error) {
      console.error("Failed to update likes:", error);
      setAnimateLike(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Supprimer ce post ?")) {
      try {
        await postService.delete(post.id);
        onDelete?.();
      } catch (error) {
        console.error("Failed to delete post:", error);
      }
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      {/* Image */}
      {post.image_url && (
        <div className="w-full aspect-video overflow-hidden">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* YouTube */}
      {!post.image_url && post.youtube_url && (
        <YouTubeEmbed url={post.youtube_url} />
      )}

      <div className="p-4 space-y-3">
        {/* Theme badge + date */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-xs font-medium text-primary">
            {theme?.emoji} {theme?.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(post.created_date), "d MMM yyyy · HH:mm", { locale: fr })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold leading-tight">{post.title}</h3>

        {/* Description */}
        {post.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{post.description}</p>
        )}

        {/* Timer */}
        <TimerDisplay type={post.timer_type} date={post.timer_date} />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium",
              liked
                ? "text-red-400 bg-red-400/10"
                : "text-muted-foreground hover:text-red-400 hover:bg-red-400/5"
            )}
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-transform",
                liked && "fill-current",
                animateLike && "scale-125"
              )}
              onAnimationEnd={() => setAnimateLike(false)}
            />
            <span>{post.likes_count || 0}</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      {/* Image */}
      {post.image_url && (
        <div className="w-full aspect-video overflow-hidden">
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* YouTube */}
      {!post.image_url && post.youtube_url && (
        <YouTubeEmbed url={post.youtube_url} />
      )}

      <div className="p-4 space-y-3">
        {/* Theme badge + date */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-xs font-medium text-primary">
            {theme?.emoji} {theme?.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(post.created_date), "d MMM yyyy · HH:mm", { locale: fr })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold leading-tight">{post.title}</h3>

        {/* Description */}
        {post.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{post.description}</p>
        )}

        {/* Timer */}
        <TimerDisplay type={post.timer_type} date={post.timer_date} />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium",
              liked
                ? "text-red-400 bg-red-400/10"
                : "text-muted-foreground hover:text-red-400 hover:bg-red-400/5"
            )}
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-transform",
                liked && "fill-current",
                animateLike && "scale-125"
              )}
              onAnimationEnd={() => setAnimateLike(false)}
            />
            <span>{post.likes_count || 0}</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}