import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Trophy, Flame } from "lucide-react";
import { motion } from "framer-motion";

interface DbModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  day: number;
  category: string;
  sort_order: number;
}

interface LearningProgressProps {
  modules: DbModule[];
  categoryOrder: string[];
  layout?: "row" | "column";
}

export function LearningProgress({ modules, categoryOrder, layout = "column" }: LearningProgressProps) {
  const { completedModules, currentDay } = useApp();
  const navigate = useNavigate();

  const categoryProgress = categoryOrder.map((cat) => {
    const catModules = modules.filter((m) => m.category === cat);
    const completed = catModules.filter((m) => completedModules.includes(m.id)).length;
    const total = catModules.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { category: cat, completed, total, percent };
  }).filter((c) => c.total > 0);

  const nextModule = [...modules]
    .sort((a, b) => {
      const catA = categoryOrder.indexOf(a.category);
      const catB = categoryOrder.indexOf(b.category);
      if (catA !== catB) return catA - catB;
      return a.sort_order - b.sort_order;
    })
    .find((m) => m.day <= currentDay && !completedModules.includes(m.id));

  const totalCompleted = modules.filter((m) => completedModules.includes(m.id)).length;
  const totalModules = modules.length;
  const overallPercent = totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0;

  return (
    <div className="space-y-4 sticky top-4">
      {/* Next recommended module */}
      <motion.div
        className="bg-card border rounded-xl p-5 flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {nextModule ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-5 w-5 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Empfohlen
              </span>
            </div>
            <h4 className="font-display font-bold text-base leading-tight">
              {nextModule.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
              {nextModule.description}
            </p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              <span>{nextModule.duration}</span>
              <span>·</span>
              <span>{nextModule.category}</span>
            </div>
            <Button
              className="mt-4 w-full"
              size="sm"
              onClick={() => navigate(`/modules/${nextModule.id}`)}
            >
              Jetzt starten <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-4">
            <Trophy className="h-10 w-10 text-primary mb-3" />
            <h4 className="font-display font-bold text-sm">Alle Module abgeschlossen!</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Grossartig – du hast alle verfügbaren Module bearbeitet.
            </p>
          </div>
        )}
      </motion.div>

      {/* Progress */}
      <motion.div
        className="bg-card border rounded-xl p-5 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-sm">Lernfortschritt</h3>
          </div>
          <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {totalCompleted}/{totalModules}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Gesamt</span>
            <span className="font-medium text-foreground">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} className="h-2.5" />
        </div>

        <div className="space-y-2.5 pt-1">
          {categoryProgress.map((cp) => (
            <div key={cp.category} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[180px]">{cp.category}</span>
                <span className="shrink-0">
                  {cp.completed}/{cp.total}
                </span>
              </div>
              <Progress value={cp.percent} className="h-1.5" />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
