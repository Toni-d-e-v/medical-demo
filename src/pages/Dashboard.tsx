import { useNavigate } from "react-router-dom";
import { Roadmap } from "@/components/Roadmap";
import { StatsCards } from "@/components/StatsCards";
import { DialogBubble } from "@/components/DialogBubble";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { role, profile } = useAuth();
  const { currentDay } = useApp();
  const navigate = useNavigate();
  const displayName = profile?.full_name?.split(" ")[0] || "dort";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Willkommen zurück, {displayName} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Tag {currentDay} deines Onboardings</p>
      </div>

      <DialogBubble message={`Hallo ${displayName}! Du bist super im Zeitplan. Heute könntest du mit dem Modul 'Triage am Telefon' starten. Schau dir die Leitfäden gut an!`} />

      <StatsCards />

      <div className="grid md:grid-cols-2 gap-4">
        <motion.div
          className="bg-card rounded-xl border p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold">Aktuelles Modul</h3>
          </div>
          <p className="text-foreground font-medium">Triage am Telefon</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Lerne die wichtigsten Triage-Protokolle und Entscheidungsbäume kennen.
          </p>
          <Button size="sm" onClick={() => navigate("/modules/triage")}>
            Fortsetzen <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </motion.div>

        <motion.div
          className="bg-card rounded-xl border p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold">
              ?
            </div>
            <h3 className="font-display font-semibold">Nächstes Quiz</h3>
          </div>
          <p className="text-foreground font-medium">Triage-Grundlagen</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            5 Fragen · ca. 5 Minuten · Bestehensgrenze 80%
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/modules/triage")}>
            Zum Quiz
          </Button>
        </motion.div>
      </div>

      <Roadmap />
    </div>
  );
}
