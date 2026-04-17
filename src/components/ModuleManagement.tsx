import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  HelpCircle,
  GripVertical,
  X,
  Clock,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

interface QuizQuestionForm {
  question: string;
  options: string[];
  correctIndex: number;
}

interface ModuleForm {
  title: string;
  description: string;
  content: string;
  duration: string;
  day: number;
  category: string;
  videoUrl: string;
  quizQuestions: QuizQuestionForm[];
}

interface DbModule {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: string;
  day: number;
  category: string;
  video_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface DbQuizQuestion {
  id: string;
  module_id: string;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

const DEFAULT_CATEGORIES = ["Administration", "Untersuchungen", "Prozesse SOP", "IT/EDV"];

const emptyForm: ModuleForm = {
  title: "",
  description: "",
  content: "",
  duration: "30 Min",
  day: 1,
  category: "Grundlagen",
  videoUrl: "",
  quizQuestions: [],
};

const emptyQuestion: QuizQuestionForm = {
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
};

export function ModuleManagement() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [modules, setModules] = useState<DbModule[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModuleForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Drag and drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Sort state
  type SortField = "title" | "category" | "day" | "duration" | null;
  type SortDir = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortedModules = sortField
    ? [...modules].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "title": cmp = a.title.localeCompare(b.title, "de"); break;
          case "category": cmp = a.category.localeCompare(b.category, "de"); break;
          case "day": cmp = a.day - b.day; break;
          case "duration": cmp = parseInt(a.duration) - parseInt(b.duration); break;
        }
        return sortDir === "desc" ? -cmp : cmp;
      })
    : modules;

  const isAdmin = role === "master_admin" || role === "admin";

  const fetchModules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("day", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      const mods = (data as DbModule[]) ?? [];
      setModules(mods);
      const dbCats = [...new Set(mods.map((m) => m.category))];
      const merged = [...DEFAULT_CATEGORIES];
      dbCats.forEach((c) => { if (!merged.includes(c)) merged.push(c); });
      setCategories(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useRealtimeRefresh(["modules", "quiz_questions"], fetchModules);

  const handleRowDragStart = (index: number) => {
    setDragIdx(index);
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };

  const handleRowDrop = async (index: number) => {
    if (dragIdx === null || dragIdx === index) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newMods = [...modules];
    const [moved] = newMods.splice(dragIdx, 1);
    newMods.splice(index, 0, moved);
    setModules(newMods);
    setDragIdx(null);
    setDragOverIdx(null);

    // Persist new sort_order
    for (let i = 0; i < newMods.length; i++) {
      await supabase.from("modules").update({ sort_order: i }).eq("id", newMods[i].id);
    }
    toast({ title: "Reihenfolge gespeichert" });
  };

  const handleRowDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = async (mod: DbModule) => {
    setEditingId(mod.id);

    // Fetch quiz questions for this module
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("module_id", mod.id)
      .order("sort_order", { ascending: true });

    const quizQuestions: QuizQuestionForm[] = (questions as DbQuizQuestion[] | null)?.map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correct_index,
    })) ?? [];

    setForm({
      title: mod.title,
      description: mod.description,
      content: mod.content,
      duration: mod.duration,
      day: mod.day,
      category: mod.category,
      videoUrl: mod.video_url ?? "",
      quizQuestions,
    });
    setDialogOpen(true);
  };

  const addQuestion = () => {
    setForm((f) => ({
      ...f,
      quizQuestions: [...f.quizQuestions, { ...emptyQuestion, options: ["", "", "", ""] }],
    }));
  };

  const removeQuestion = (index: number) => {
    setForm((f) => ({
      ...f,
      quizQuestions: f.quizQuestions.filter((_, i) => i !== index),
    }));
  };

  const updateQuestion = (index: number, field: keyof QuizQuestionForm, value: any) => {
    setForm((f) => ({
      ...f,
      quizQuestions: f.quizQuestions.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    }));
  };

  const updateQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    setForm((f) => ({
      ...f,
      quizQuestions: f.quizQuestions.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, oi) => (oi === optIndex ? value : o)) }
          : q
      ),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Fehler", description: "Titel ist erforderlich.", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      let moduleId = editingId;

      if (editingId) {
        // Update
        const { error } = await supabase
          .from("modules")
          .update({
            title: form.title,
            description: form.description,
            content: form.content,
            duration: form.duration,
            day: form.day,
            category: form.category,
            video_url: form.videoUrl || null,
          })
          .eq("id", editingId);

        if (error) throw error;

        // Delete old quiz questions, then re-insert
        await supabase.from("quiz_questions").delete().eq("module_id", editingId);
      } else {
        // Insert
        const { data, error } = await supabase
          .from("modules")
          .insert({
            title: form.title,
            description: form.description,
            content: form.content,
            duration: form.duration,
            day: form.day,
            category: form.category,
            video_url: form.videoUrl || null,
          })
          .select("id")
          .single();

        if (error) throw error;
        moduleId = data.id;
      }

      // Insert quiz questions
      if (form.quizQuestions.length > 0 && moduleId) {
        const questionsToInsert = form.quizQuestions.map((q, i) => ({
          module_id: moduleId,
          question: q.question,
          options: q.options,
          correct_index: q.correctIndex,
          sort_order: i,
        }));

        const { error: qError } = await supabase.from("quiz_questions").insert(questionsToInsert);
        if (qError) throw qError;
      }

      toast({ title: editingId ? "Modul aktualisiert" : "Modul erstellt", description: form.title });
      setDialogOpen(false);
      fetchModules();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Modul gelöscht" });
      setDeleteConfirm(null);
      fetchModules();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (mod: DbModule) => {
    try {
      const { error } = await supabase
        .from("modules")
        .update({ is_active: !mod.is_active } as any)
        .eq("id", mod.id);
      if (error) throw error;
      toast({ title: mod.is_active ? "Modul deaktiviert" : "Modul aktiviert" });
      fetchModules();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Lernmodule verwalten
          </h2>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Neues Modul
          </Button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : modules.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Noch keine Module erstellt. Klicken Sie auf "Neues Modul", um zu beginnen.
          </div>
        ) : (
          <div className="overflow-x-auto">
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("title")}>
                    <span className="flex items-center">Titel <SortIcon field="title" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("category")}>
                    <span className="flex items-center">Kategorie <SortIcon field="category" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("day")}>
                    <span className="flex items-center">Tag <SortIcon field="day" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("duration")}>
                    <span className="flex items-center">Dauer <SortIcon field="duration" /></span>
                  </TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedModules.map((mod, i) => (
                  <motion.tr
                    key={mod.id}
                    draggable
                    onDragStart={() => handleRowDragStart(i)}
                    onDragOver={(e) => handleRowDragOver(e as any, i)}
                    onDrop={() => handleRowDrop(i)}
                    onDragEnd={handleRowDragEnd}
                    className={`border-b transition-colors hover:bg-muted/50 ${
                      dragOverIdx === i && dragIdx !== i ? "border-t-2 border-t-primary" : ""
                    } ${dragIdx === i ? "opacity-50" : ""}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <TableCell className="w-10 px-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm">{mod.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {mod.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Tag {mod.day}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {mod.duration}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={mod.is_active}
                        onCheckedChange={() => handleToggleActive(mod)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(mod)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {deleteConfirm === mod.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleDelete(mod.id)}
                            >
                              Bestätigen
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Abbrechen
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(mod.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modul bearbeiten" : "Neues Lernmodul erstellen"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5 mt-2">
            {/* Basic info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Titel *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="z.B. Praxissoftware bedienen"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Kurzbeschreibung</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Kurze Zusammenfassung des Moduls..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tag</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.day}
                    onChange={(e) => setForm((f) => ({ ...f, day: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dauer</Label>
                  <Input
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    placeholder="45 Min"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Lerninhalt</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Ausführlicher Lerninhalt des Moduls..."
                rows={5}
              />
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label>Video-URL (optional)</Label>
              <Input
                value={form.videoUrl}
                onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {/* Quiz Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Quiz-Fragen ({form.quizQuestions.length})
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1">
                  <Plus className="h-3 w-3" /> Frage hinzufügen
                </Button>
              </div>

              {form.quizQuestions.map((q, qi) => (
                <div key={qi} className="bg-muted/50 rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      Frage {qi + 1}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeQuestion(qi)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Input
                    value={q.question}
                    onChange={(e) => updateQuestion(qi, "question", e.target.value)}
                    placeholder="Fragetext eingeben..."
                  />

                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correctIndex === oi}
                          onChange={() => updateQuestion(qi, "correctIndex", oi)}
                          className="accent-primary"
                        />
                        <Input
                          value={opt}
                          onChange={(e) => updateQuestionOption(qi, oi, e.target.value)}
                          placeholder={`Antwort ${oi + 1}`}
                          className="h-9 text-sm"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground ml-5">
                      Wählen Sie die korrekte Antwort mit dem Radio-Button aus.
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Wird gespeichert..." : editingId ? "Modul aktualisieren" : "Modul erstellen"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
