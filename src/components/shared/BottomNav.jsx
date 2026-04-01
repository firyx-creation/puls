import { Link, useLocation } from "react-router-dom";
import { Home, PenSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav({ isAdmin }) {
  const location = useLocation();

  const tabs = [
    { path: "/", icon: Home, label: "Feed" },
    ...(isAdmin ? [{ path: "/compose", icon: PenSquare, label: "Publier" }] : []),
    { path: "/settings", icon: Settings, label: "Réglages" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_8px_hsl(265,90%,60%)]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}