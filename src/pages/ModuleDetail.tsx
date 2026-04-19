import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { DialogBubble } from "@/components/DialogBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, XCircle, Video, Pencil, Save, X, Upload, Trash2, FileText, Download, Wand2, Sparkles } from "lucide-react";
import { StickmanPlayer, type ExplainerScene } from "@/components/StickmanPlayer";
import { PetraTooltip } from "@/components/PetraTooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import avatarImg from "@/assets/ai-avatar.png";

function toEmbedUrl(url: string): string {
  if (!url) return url;
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  return url;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface ExplainerScript {
  scenes: ExplainerScene[];
  generatedAt?: string;
}

interface ModuleData {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: string;
  day: number;
  category: string;
  video_url: string | null;
  pdf_url: string | null;
  explainer_script: ExplainerScript | null;
}

export default function ModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { completeModule, completedModules } = useApp();

  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "master_admin";

  const [mod, setMod] = useState<ModuleData | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editPdfUrl, setEditPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [downloadPromptOpen, setDownloadPromptOpen] = useState(false);
  const [explainerGenerating, setExplainerGenerating] = useState(false);
  const [explainerSceneCount, setExplainerSceneCount] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const startEditing = () => {
    if (!mod) return;
    setEditContent(mod.content || "");
    setEditDescription(mod.description || "");
    setEditVideoUrl(mod.video_url || "");
    setEditPdfUrl(mod.pdf_url || "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleVideoUpload = async (file: File) => {
    if (!mod) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Bitte nur Videodateien hochladen");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Maximale Dateigrösse: 100 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "mp4";
    const filePath = `${mod.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("module-videos")
      .upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast.error("Upload fehlgeschlagen: " + uploadError.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("module-videos")
      .getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
    setEditVideoUrl(publicUrl);
    setUploadedVideoUrl(publicUrl);
    setUploading(false);
    toast.success("Video hochgeladen!");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleVideoUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUploadedVideo = () => {
    setEditVideoUrl("");
    setUploadedVideoUrl(null);
  };

  const handlePdfUpload = async (file: File) => {
    if (!mod) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Bitte nur PDF-Dateien hochladen");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Maximale Dateigrösse: 50 MB");
      return;
    }
    setPdfUploading(true);
    const filePath = `${mod.id}/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("module-pdfs")
      .upload(filePath, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      toast.error("Upload fehlgeschlagen: " + uploadError.message);
      setPdfUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("module-pdfs").getPublicUrl(filePath);
    setEditPdfUrl(urlData.publicUrl);
    setPdfUploading(false);
    toast.success("PDF hochgeladen");
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePdfUpload(file);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const generateExplainer = async () => {
    if (!mod) return;
    const sourceText = (editing ? editContent || editDescription : mod.content || mod.description).trim();
    if (sourceText.length < 20) {
      toast.error("Beschreibung/Lerninhalt zu kurz für ein Erklärvideo (mind. 20 Zeichen).");
      return;
    }
    setExplainerGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-explainer", {
        body: {
          description: sourceText,
          title: mod.title,
          sceneCount: explainerSceneCount,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const result = data as { scenes: ExplainerScene[]; generatedAt: string };
      if (!result.scenes || result.scenes.length === 0) {
        throw new Error("Keine Szenen erhalten");
      }
      const payload: ExplainerScript = { scenes: result.scenes, generatedAt: result.generatedAt };
      const { error: upErr } = await supabase
        .from("modules")
        .update({ explainer_script: payload as any })
        .eq("id", mod.id);
      if (upErr) throw upErr;
      setMod({ ...mod, explainer_script: payload });
      toast.success("Erklärvideo erstellt");
    } catch (err: any) {
      toast.error("Fehler: " + (err.message || "unbekannt"));
    } finally {
      setExplainerGenerating(false);
    }
  };

  const confirmDownloadPdf = () => {
    if (!mod?.pdf_url) return;
    const link = document.createElement("a");
    link.href = mod.pdf_url;
    link.download = `${mod.title}.pdf`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadPromptOpen(false);
  };

  const saveChanges = async () => {
    if (!mod) return;
    setSaving(true);
    const { error } = await supabase
      .from("modules")
      .update({
        content: editContent,
        description: editDescription,
        video_url: editVideoUrl.trim() || null,
        pdf_url: editPdfUrl.trim() || null,
      })
      .eq("id", mod.id);
    setSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern");
      return;
    }
    setMod({
      ...mod,
      content: editContent,
      description: editDescription,
      video_url: editVideoUrl.trim() || null,
      pdf_url: editPdfUrl.trim() || null,
    });
    setEditing(false);
    toast.success("Änderungen gespeichert");
  };
  const fetchModule = useCallback(async () => {
    if (!id) return;
    const { data: moduleData } = await supabase
      .from("modules")
      .select("*")
      .eq("id", id)
      .single();

    if (moduleData) {
      setMod(moduleData as ModuleData);
      const { data: qData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", id)
        .order("sort_order", { ascending: true });

      setQuestions(
        (qData ?? []).map((q: any) => ({
          question: q.question,
          options: q.options as string[],
          correctIndex: q.correct_index,
        }))
      );
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchModule();
  }, [fetchModule]);

  useRealtimeRefresh(["modules", "quiz_questions"], fetchModule);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Modul nicht gefunden.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/modules")}>
          Zurück
        </Button>
      </div>
    );
  }

  const isCompleted = completedModules.includes(mod.id);

  const handleAnswer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    if (index === questions[currentQ].correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
    } else {
      setQuizDone(true);
      const passed = (score + (selected === questions[currentQ].correctIndex ? 1 : 0)) / questions.length >= 0.8;
      if (passed) completeModule(mod.id);
    }
  };

  const finalScore = score + (selected !== null && questions[currentQ] && selected === questions[currentQ].correctIndex ? 1 : 0);
  const passed = questions.length > 0 ? finalScore / questions.length >= 0.8 : false;

  return (
    <div className="max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/modules")} className="text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Zurück zu den Modulen
      </Button>

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">{mod.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mod.category} · {mod.duration} · Tag {mod.day}
          </p>
        </div>
        {isCompleted && (
          <span className="badge-score mt-1">
            <CheckCircle2 className="h-3 w-3" /> Bestanden
          </span>
        )}
        {isAdmin && !showQuiz && !editing && (
          <Button size="sm" onClick={startEditing} className="mt-1 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Bearbeiten
          </Button>
        )}
        {isAdmin && editing && (
          <div className="flex gap-2 mt-1">
            <Button size="sm" onClick={saveChanges} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Speichert…" : "Speichern"}
            </Button>
            <Button variant="outline" size="sm" onClick={cancelEditing}>
              <X className="h-3.5 w-3.5 mr-1" /> Abbrechen
            </Button>
          </div>
        )}
      </div>

      {!showQuiz ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-5">
            <div className="bg-card rounded-xl border p-6">
              <h2 className="font-display font-semibold mb-3">Lerninhalt</h2>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Beschreibung</label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Lerninhalt</label>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={10}
                      className="text-sm"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{mod.content || mod.description}</p>
              )}
              {questions.length > 0 && !editing && (
                <p className="mt-4 text-sm text-foreground/80">
                  Am Ende dieses Moduls erwartet dich ein kurzes Quiz mit {questions.length} Fragen.
                  Du benötigst mindestens 80% richtige Antworten, um das Modul abzuschliessen.
                </p>
              )}
            </div>

            <div className="bg-card rounded-xl border p-6">
              <div className="flex items-center gap-2 mb-3">
                <Video className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold">Video-Erklärung</h3>
              </div>
              {editing && (
                <div className="mb-3 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Video-URL (z.B. YouTube-Link)</label>
                    <Input
                      value={editVideoUrl}
                      onChange={(e) => { setEditVideoUrl(e.target.value); setUploadedVideoUrl(null); }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="text-sm"
                      disabled={uploading}
                    />
                  </div>
                  <div className="relative">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Oder Video hochladen (max. 100 MB)</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      {uploading ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                          Video wird hochgeladen…
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Upload className="h-6 w-6" />
                          <span className="text-sm">Datei hierher ziehen oder klicken</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {uploadedVideoUrl && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate flex-1">Video hochgeladen</span>
                      <button onClick={removeUploadedVideo} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {(() => {
                const videoUrl = editing ? editVideoUrl.trim() : mod.video_url;
                if (!videoUrl) {
                  return (
                    <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Video className="h-12 w-12 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">{editing ? "Gib oben eine Video-URL ein oder lade ein Video hoch" : "Video-Player Platzhalter"}</p>
                      </div>
                    </div>
                  );
                }
                const isDirectVideo = videoUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || videoUrl.includes("module-videos");
                if (isDirectVideo) {
                  return (
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <video src={videoUrl} className="w-full h-full" controls />
                    </div>
                  );
                }
                return (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe src={toEmbedUrl(videoUrl)} className="w-full h-full" allowFullScreen />
                  </div>
                );
              })()}
            </div>

            {(editing || mod.pdf_url) && (
              <div className="bg-card rounded-xl border p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold">PDF-Anhang</h3>
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handlePdfFileSelect}
                    />
                    {editPdfUrl ? (
                      <div className="flex items-center gap-2 bg-muted/50 rounded-md border p-2 text-sm">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <a
                          href={editPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 truncate text-primary hover:underline"
                        >
                          PDF ansehen
                        </a>
                        <button
                          onClick={() => setEditPdfUrl("")}
                          className="text-destructive hover:text-destructive/80"
                          aria-label="PDF entfernen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pdfUploading}
                        onClick={() => pdfInputRef.current?.click()}
                        className="gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {pdfUploading ? "Lädt hoch..." : "PDF hochladen (max. 50 MB)"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDownloadPromptOpen(true)}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    PDF herunterladen
                  </Button>
                )}
              </div>
            )}

            {(editing || mod.explainer_script) && (
              <div className="bg-card rounded-xl border p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold">Strichmännchen-Erklärvideo</h3>
                </div>
                {mod.explainer_script && mod.explainer_script.scenes?.length > 0 ? (
                  <div className="space-y-3">
                    <StickmanPlayer scenes={mod.explainer_script.scenes} />
                    {editing && (
                      <p className="text-xs text-muted-foreground">
                        Erstellt am: {mod.explainer_script.generatedAt?.slice(0, 10) || "–"}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Noch kein Erklärvideo vorhanden.
                  </p>
                )}
                {editing && isAdmin && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">
                      Szenen:
                      <select
                        value={explainerSceneCount}
                        onChange={(e) => setExplainerSceneCount(Number(e.target.value))}
                        className="ml-1 bg-background border rounded px-1 py-0.5 text-xs"
                        disabled={explainerGenerating}
                      >
                        {[3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <PetraTooltip
                      text="Erstellt mit KI ein kurzes animiertes Strichmännchen-Video mit Sprecher-Stimme – basierend auf dem Lerninhalt."
                      title="Erklärvideo generieren"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={generateExplainer}
                        disabled={explainerGenerating}
                        className="gap-1.5"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        {explainerGenerating
                          ? "Generiere..."
                          : mod.explainer_script
                            ? "Neu generieren"
                            : "Video generieren"}
                      </Button>
                    </PetraTooltip>
                  </div>
                )}
              </div>
            )}

            {questions.length > 0 && (
              <Button onClick={() => setShowQuiz(true)} className="w-full">
                Quiz starten →
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-xl border p-4 text-center">
              <img
                src={avatarImg}
                alt="Petra – KI-Assistentin"
                className="w-24 h-24 rounded-full mx-auto mb-3 border-2 border-primary/20 object-cover"
              />
              <h3 className="font-display font-semibold text-sm">Petra – Deine KI-Assistentin</h3>
              <p className="text-xs text-muted-foreground mt-1">Ich helfe dir beim Lernen!</p>
            </div>

            <DialogBubble message={`Super, dass du "${mod.title}" gestartet hast! Nimm dir Zeit für die Inhalte.`} />
            <DialogBubble message="Praxis-Tipp: Notiere dir Schlüsselbegriffe, die du noch nicht kennst. Das hilft beim Quiz!" />
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {!quizDone ? (
              <motion.div
                key={currentQ}
                className="bg-card rounded-xl border p-6"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-muted-foreground">
                    Frage {currentQ + 1} von {questions.length}
                  </span>
                  <div className="h-1.5 flex-1 mx-4 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <h3 className="font-display font-semibold mb-4">{questions[currentQ].question}</h3>

                <div className="space-y-2">
                  {questions[currentQ].options.map((opt, i) => {
                    const isCorrect = i === questions[currentQ].correctIndex;
                    const isSelected = selected === i;
                    let optClass = "bg-muted/50 border-transparent hover:bg-muted";
                    if (selected !== null) {
                      if (isCorrect) optClass = "bg-success/10 border-success text-success";
                      else if (isSelected) optClass = "bg-destructive/10 border-destructive text-destructive";
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${optClass} ${
                          selected !== null ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {selected !== null && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                          {selected !== null && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                          <span>{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selected !== null && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                    <Button onClick={nextQuestion} className="w-full">
                      {currentQ < questions.length - 1 ? "Nächste Frage →" : "Ergebnis anzeigen"}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                className="bg-card rounded-xl border p-8 text-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div
                  className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  } animate-score-pop`}
                >
                  {passed ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
                </div>
                <h2 className="text-xl font-display font-bold mb-2">
                  {passed ? "Bestanden! 🎉" : "Nicht bestanden"}
                </h2>
                <p className="text-muted-foreground text-sm mb-1">
                  {finalScore} von {questions.length} richtig ({Math.round((finalScore / questions.length) * 100)}%)
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  {passed
                    ? "Dein Kompetenz-Score wurde erhöht!"
                    : "Du benötigst mindestens 80% richtige Antworten. Versuche es erneut!"}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => navigate("/modules")}>
                    Zur Übersicht
                  </Button>
                  {!passed && (
                    <Button
                      onClick={() => {
                        setShowQuiz(false);
                        setCurrentQ(0);
                        setSelected(null);
                        setScore(0);
                        setQuizDone(false);
                      }}
                    >
                      Nochmal versuchen
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AlertDialog open={downloadPromptOpen} onOpenChange={setDownloadPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PDF herunterladen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das PDF für "{mod.title}" herunterladen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDownloadPdf}>Herunterladen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
