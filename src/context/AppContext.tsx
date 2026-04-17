import { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

interface AppState {
  competenceScore: number;
  setCompetenceScore: (score: number) => void;
  completedModules: string[];
  completeModule: (moduleId: string) => void;
  currentDay: number;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [competenceScore, setCompetenceScore] = useState(42);
  const [completedModules, setCompletedModules] = useState<string[]>(["praxissoftware"]);
  const [currentDay] = useState(90);

  const completeModule = (moduleId: string) => {
    if (!completedModules.includes(moduleId)) {
      setCompletedModules((prev) => [...prev, moduleId]);
      setCompetenceScore((prev) => Math.min(100, prev + 12));
    }
  };

  return (
    <AppContext.Provider
      value={{ competenceScore, setCompetenceScore, completedModules, completeModule, currentDay }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
