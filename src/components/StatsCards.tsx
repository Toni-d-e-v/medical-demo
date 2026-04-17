import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Award, BookOpen, Clock, TrendingUp } from "lucide-react";

export function StatsCards() {
  const { competenceScore, completedModules, currentDay } = useApp();

  const stats = [
    {
      label: "Kompetenz-Score",
      value: `${competenceScore}%`,
      icon: Award,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Abgeschlossene Module",
      value: `${completedModules.length} / 9`,
      icon: BookOpen,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Tag im Onboarding",
      value: `${currentDay}`,
      icon: Clock,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Fortschritt",
      value: `${Math.round((currentDay / 90) * 100)}%`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="bg-card rounded-xl border p-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.08 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
          </div>
          <p className="text-2xl font-display font-bold">{s.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
