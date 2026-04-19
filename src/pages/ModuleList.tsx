import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Check, Lock, ArrowRight, Clock, BookOpen, FolderOpen, Settings, GripVertical, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DialogBubble } from "@/components/DialogBubble";
import { ModuleManagement } from "@/components/ModuleManagement";
import { LearningProgress } from "@/components/modules/LearningProgress";
import { CategoryManager } from "@/components/CategoryManager";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { PetraTooltip } from "@/components/PetraTooltip";

interface DbModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  day: number;
  category: string;
  sort_order: number;
}

export default function ModuleList() {
  const { completedModules, currentDay } = useApp();
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "master_admin" || role === "admin";
  const navigate = useNavigate();
  const [modules, setModules] = useState<DbModule[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Category drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Module drag state (per category)
  const [modDragKey, setModDragKey] = useState<string | null>(null); // "cat::index"
  const [modDragOverKey, setModDragOverKey] = useState<string | null>(null);

  const fetchCategoryOrder = async () => {
    const { data } = await supabase
      .from("category_order")
      .select("category_name, sort_order")
      .order("sort_order", { ascending: true });
    return (data ?? []).map((r: any) => r.category_name as string);
  };

  const fetchModules = useCallback(async () => {
    const [{ data }, orderedCats] = await Promise.all([
      supabase
        .from("modules")
        .select("id, title, description, duration, day, category, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("day", { ascending: true }),
      fetchCategoryOrder(),
    ]);
    const allMods = (data ?? []) as (DbModule & { is_active: boolean })[];
    const cats = [...new Set(allMods.map((m) => m.category))];
    setAllCategories(cats);

    // Build final order: DB order first, then any new categories not yet in the order table
    const finalOrder = [
      ...orderedCats.filter((c) => cats.includes(c)),
      ...cats.filter((c) => !orderedCats.includes(c)),
    ];
    setCategoryOrder(finalOrder);
    setModules(allMods.filter((m: any) => m.is_active));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  useRealtimeRefresh(["modules", "category_order"], fetchModules);

  const saveCategoryOrder = async (newOrder: string[]) => {
    // Upsert all categories with new sort_order
    for (let i = 0; i < newOrder.length; i++) {
      await supabase
        .from("category_order")
        .upsert(
          { category_name: newOrder[i], sort_order: i },
          { onConflict: "category_name" }
        );
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newOrder = [...categoryOrder];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, moved);
    setCategoryOrder(newOrder);
    setDragIndex(null);
    setDragOverIndex(null);

    await saveCategoryOrder(newOrder);
    toast({ title: "Reihenfolge gespeichert" });
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Module reorder within a category
  const handleModDragStart = (category: string, index: number, e: React.DragEvent) => {
    e.stopPropagation();
    setModDragKey(`${category}::${index}`);
  };

  const handleModDragOver = (category: string, index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModDragOverKey(`${category}::${index}`);
  };

  const handleModDrop = async (category: string, index: number, e: React.DragEvent) => {
    e.stopPropagation();
    if (!modDragKey) return;
    const [dragCat, dragIdxStr] = modDragKey.split("::");
    const dragIdx = parseInt(dragIdxStr);
    if (dragCat !== category || dragIdx === index) {
      setModDragKey(null);
      setModDragOverKey(null);
      return;
    }
    const catMods = [...(grouped[category] ?? [])];
    const [moved] = catMods.splice(dragIdx, 1);
    catMods.splice(index, 0, moved);

    // Optimistic update
    const newModules = modules.map((m) => {
      if (m.category !== category) return m;
      const newIdx = catMods.findIndex((cm) => cm.id === m.id);
      return { ...m, sort_order: newIdx };
    });
    setModules(newModules as any);
    setModDragKey(null);
    setModDragOverKey(null);

    // Persist
    for (let i = 0; i < catMods.length; i++) {
      await supabase.from("modules").update({ sort_order: i }).eq("id", catMods[i].id);
    }
    toast({ title: "Modulreihenfolge gespeichert" });
  };

  const handleModDragEnd = () => {
    setModDragKey(null);
    setModDragOverKey(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const grouped = categoryOrder.reduce<Record<string, DbModule[]>>((acc, cat) => {
    acc[cat] = modules
      .filter((m) => m.category === cat)
      .sort((a, b) => a.sort_order - b.sort_order);
    return acc;
  }, {});

  const moduleListContent = (
    <div className="space-y-6 flex-1 min-w-0">
      {isAdmin && (
        <CategoryManager categories={categoryOrder} onCategoriesChanged={fetchModules} />
      )}
      

      <DialogBubble message="Tipp: Fokussiere dich auf das aktuelle Modul. Nach dem Abschluss wird das Quiz freigeschaltet – so steigerst du deinen Score am effektivsten!" />

      {modules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Noch keine aktiven Lernmodule verfügbar.
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={[]} className="space-y-3">
          {categoryOrder.map((category, catIdx) => {
            const catModules = grouped[category] ?? [];
            if (catModules.length === 0 && !isAdmin) return null;

            return (
              <div
                key={category}
                draggable={isAdmin}
                onDragStart={() => isAdmin && handleDragStart(catIdx)}
                onDragOver={(e) => isAdmin && handleDragOver(e, catIdx)}
                onDrop={() => isAdmin && handleDrop(catIdx)}
                onDragEnd={handleDragEnd}
                className={`transition-all ${
                  dragOverIndex === catIdx && dragIndex !== catIdx
                    ? "border-t-2 border-primary"
                    : ""
                } ${dragIndex === catIdx ? "opacity-50" : ""}`}
              >
                <AccordionItem value={category} className="border rounded-xl bg-card overflow-hidden">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/40 [&>svg]:hidden [&[data-state=open]_.chevron-icon]:rotate-180">
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <GripVertical
                          className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                      )}
                      <ChevronDown className="chevron-icon h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground" />
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <span className="font-display font-semibold text-base">{category}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {catModules.length} {catModules.length === 1 ? "Modul" : "Module"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-2">
                      {catModules.map((mod, i) => {
                        const completed = completedModules.includes(mod.id);
                        const available = mod.day <= currentDay;
                        const isCurrent = available && !completed;

                        return (
                          <motion.div
                            key={mod.id}
                            draggable={isAdmin}
                            onDragStart={(e) => isAdmin && handleModDragStart(category, i, e as any)}
                            onDragOver={(e) => isAdmin && handleModDragOver(category, i, e as any)}
                            onDrop={(e) => isAdmin && handleModDrop(category, i, e as any)}
                            onDragEnd={handleModDragEnd}
                            className={`bg-background rounded-lg border p-4 flex items-center gap-4 transition-shadow ${
                              isCurrent ? "shadow-md border-primary/30" : ""
                            } ${!available ? "opacity-60" : ""} ${
                              modDragOverKey === `${category}::${i}` && modDragKey !== `${category}::${i}` ? "border-t-2 border-t-primary" : ""
                            } ${modDragKey === `${category}::${i}` ? "opacity-50" : ""}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: available ? 1 : 0.6, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            {isAdmin && (
                              <GripVertical
                                className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
                                onMouseDown={(e) => e.stopPropagation()}
                              />
                            )}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                completed
                                  ? "bg-success/10 text-success"
                                  : isCurrent
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {completed ? (
                                <Check className="h-5 w-5" />
                              ) : available ? (
                                <BookOpen className="h-4 w-4" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-display font-semibold text-sm">{mod.title}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {mod.duration}
                                </span>
                                <span>Tag {mod.day}</span>
                              </div>
                            </div>

                            {available && (
                              <Button
                                variant={completed ? "outline" : "default"}
                                size="sm"
                                onClick={() => navigate(`/modules/${mod.id}`)}
                              >
                                {completed ? "Wiederholen" : "Starten"} <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </div>
            );
          })}
        </Accordion>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Lernmodule</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAdmin
            ? "Verwalten und durchsuchen Sie alle Lernmodule."
            : "Schliesse die Module der Reihe nach ab, um deinen Kompetenz-Score zu erhöhen."}
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <PetraTooltip text="Schaut die Module aus Sicht der Lernenden an – inklusive Fortschritt und Reihenfolge." title="Übersicht">
              <TabsTrigger value="overview" className="gap-1.5">
                <BookOpen className="h-4 w-4" />
                Übersicht
              </TabsTrigger>
            </PetraTooltip>
            <PetraTooltip text="Hier kannst du Module anlegen, bearbeiten, deaktivieren oder löschen." title="Modulverwaltung">
              <TabsTrigger value="manage" className="gap-1.5">
                <Settings className="h-4 w-4" />
                Verwaltung
              </TabsTrigger>
            </PetraTooltip>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <div className="flex gap-6">
              {moduleListContent}
              <aside className="hidden lg:block w-80 shrink-0">
                <LearningProgress modules={modules} categoryOrder={categoryOrder} layout="column" />
              </aside>
            </div>
          </TabsContent>
          <TabsContent value="manage" className="mt-4">
            <ModuleManagement />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex gap-6">
          {moduleListContent}
          <aside className="hidden lg:block w-80 shrink-0">
            <LearningProgress modules={modules} categoryOrder={categoryOrder} layout="column" />
          </aside>
        </div>
      )}
    </div>
  );
}
