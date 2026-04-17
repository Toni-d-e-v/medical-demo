import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FolderPlus, Pencil } from "lucide-react";

interface CategoryManagerProps {
  categories: string[];
  onCategoriesChanged: () => void;
}

export function CategoryManager({ categories, onCategoriesChanged }: CategoryManagerProps) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingCategory, setRenamingCategory] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast({ title: "Fehler", description: "Name darf nicht leer sein.", variant: "destructive" });
      return;
    }
    if (categories.includes(trimmed)) {
      toast({ title: "Fehler", description: "Dieser Ordner existiert bereits.", variant: "destructive" });
      return;
    }
    // Create a placeholder module so the category appears
    setSaving(true);
    const { error } = await supabase.from("modules").insert({
      title: `Neues Modul in ${trimmed}`,
      description: "",
      content: "",
      duration: "30 Min",
      day: 1,
      category: trimmed,
      is_active: false,
    });
    if (error) {
      setSaving(false);
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    // Add to category_order table
    const maxOrder = categories.length;
    await supabase.from("category_order").upsert(
      { category_name: trimmed, sort_order: maxOrder },
      { onConflict: "category_name" }
    );
    setSaving(false);
    toast({ title: "Ordner erstellt", description: trimmed });
    setNewName("");
    setCreateOpen(false);
    onCategoriesChanged();
  };

  const openRename = (cat: string) => {
    setRenamingCategory(cat);
    setRenameValue(cat);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast({ title: "Fehler", description: "Name darf nicht leer sein.", variant: "destructive" });
      return;
    }
    if (trimmed === renamingCategory) {
      setRenameOpen(false);
      return;
    }
    if (categories.includes(trimmed)) {
      toast({ title: "Fehler", description: "Dieser Name existiert bereits.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("modules")
      .update({ category: trimmed })
      .eq("category", renamingCategory);
    // Also update category_order table
    await supabase
      .from("category_order")
      .update({ category_name: trimmed })
      .eq("category_name", renamingCategory);
    setSaving(false);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ordner umbenannt", description: `${renamingCategory} → ${trimmed}` });
      setRenameOpen(false);
      onCategoriesChanged();
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <FolderPlus className="h-4 w-4" />
          Neuer Ordner
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => openRename(cat)}
          >
            <Pencil className="h-3 w-3" />
            {cat}
          </Button>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Neuen Ordner erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Ordnername</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Qualitätsmanagement"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? "Wird erstellt..." : "Ordner erstellen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ordner umbenennen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Neuer Name für „{renamingCategory}"</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
              />
            </div>
            <Button onClick={handleRename} disabled={saving} className="w-full">
              {saving ? "Wird umbenannt..." : "Umbenennen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
