import { useState, useEffect } from "react";
import { Clock, Timer } from "lucide-react";

export default function TimerDisplay({ type, date }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!date || type === "none") return;

    const update = () => {
      const now = new Date();
      const target = new Date(date);
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(type === "countdown" ? "C'est maintenant !" : "Terminé");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      let str = "";
      if (days > 0) str += `${days}j `;
      if (hours > 0) str += `${hours}h `;
      str += `${minutes}m ${seconds}s`;
      setTimeLeft(str);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [type, date]);

  if (!date || type === "none") return null;

  const Icon = type === "countdown" ? Clock : Timer;
  const label = type === "countdown" ? "Commence dans" : "Temps restant";

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground tabular-nums">{timeLeft}</span>
    </div>
  );
}