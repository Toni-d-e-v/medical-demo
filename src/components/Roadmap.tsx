import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Play, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

interface RoadmapModule {
  id: string;
  title: string;
  day: number;
  sort_order: number;
  category: string;
}

export function Roadmap() {
  const { currentDay, completedModules } = useApp();
  const [modules, setModules] = useState<RoadmapModule[]>([]);

  const fetchModules = async () => {
    const { data } = await supabase
      .from("modules")
      .select("id, title, day, sort_order, category")
      .eq("is_active", true)
      .order("day", { ascending: true })
      .order("sort_order", { ascending: true });
    setModules(data ?? []);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useRealtimeRefresh(["modules"], fetchModules);

  const getNodeStatus = (m: RoadmapModule) => {
    if (completedModules.includes(m.id)) return "completed";
    if (m.day <= currentDay) return "active";
    return "upcoming";
  };

  if (modules.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-6 overflow-x-auto">
      <h2 className="font-display font-semibold text-lg mb-1">Onboarding-Roadmap</h2>
      <p className="text-sm text-muted-foreground mb-6">Dein Einarbeitungsplan – {modules.length} Lernziele</p>

      <div className="flex items-center gap-0" style={{ minWidth: `${modules.length * 90}px` }}>
        {modules.map((m, i) => {
          const status = getNodeStatus(m);
          return (
            <div key={m.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  className={`roadmap-node roadmap-node--${status}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                >
                  {status === "completed" && <Check className="h-4 w-4" />}
                  {status === "active" && <Play className="h-3 w-3" />}
                  {status === "upcoming" && <Lock className="h-3 w-3" />}
                </motion.div>
                <span className="text-[10px] text-muted-foreground mt-2 text-center w-20 leading-tight line-clamp-2">
                  {m.title}
                </span>
                <span className="text-[9px] text-muted-foreground/60">Tag {m.day}</span>
              </div>
              {i < modules.length - 1 && (
                <div
                  className={`h-0.5 w-8 mx-1 rounded-full transition-colors ${
                    status === "completed" ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
