import { useState } from "react";
import { motion } from "framer-motion";
import { Roadmap } from "@/components/Roadmap";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, ChevronDown, UserPlus, Pencil, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { type AppRole, ROLE_LABELS, getRoleBadgeClass, getInitials } from "@/lib/team-utils";

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full group cursor-pointer">
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
        <h2 className="font-display font-semibold text-sm">{title}</h2>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AdminView() {
  const { members, loading, refetch } = useTeamMembers();
  const { toast } = useToast();

  // Add user form state
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [creating, setCreating] = useState(false);

  // Edit user state
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<{ id: string; full_name: string | null; email: string | null; role: AppRole } | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("user");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openEdit = (m: typeof editMember & {}) => {
    setEditMember(m);
    setEditName(m.full_name ?? "");
    setEditRole(m.role);
    setEditOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    setSaving(true);
    try {
      if (editName !== (editMember.full_name ?? "")) {
        const { error } = await supabase.from("profiles").update({ full_name: editName }).eq("id", editMember.id);
        if (error) throw error;
      }
      if (editRole !== editMember.role) {
        const res = await supabase.functions.invoke("admin-update-role", {
          body: { user_id: editMember.id, role: editRole },
        });
        if (res.error) throw new Error(res.error.message);
        const data = res.data as any;
        if (data?.error) throw new Error(data.error);
      }
      toast({ title: "Gespeichert", description: `${editName} wurde aktualisiert.` });
      setEditOpen(false);
      refetch();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDeleteUser = async () => {
    if (!editMember) return;
    setDeleting(true);
    try {
      const res = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: editMember.id },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as any;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Entfernt", description: `${editMember.full_name || editMember.email} wurde entfernt.` });
      setEditOpen(false);
      refetch();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally { setDeleting(false); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email: newEmail, password: newPassword, full_name: newName, role: newRole },
      });
      if (res.error) throw new Error(res.error.message);
      toast({ title: "Benutzer hinzugefügt", description: `${newName} wurde erfolgreich erstellt.` });
      setAddOpen(false);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("user");
      refetch();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Team-Übersicht</h1>
        <p className="text-muted-foreground text-sm mt-1">Überwachen Sie den Onboarding-Fortschritt Ihres Teams</p>
      </div>

      <CollapsibleSection title="Statistiken" defaultOpen>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border p-5">
            <p className="text-xs text-muted-foreground">Team-Mitglieder</p>
            <p className="text-3xl font-display font-bold text-primary mt-1">{members.length}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-xs text-muted-foreground">Admins</p>
            <p className="text-3xl font-display font-bold mt-1">
              {members.filter((m) => m.role === "admin" || m.role === "master_admin").length}
            </p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-xs text-muted-foreground">User</p>
            <p className="text-3xl font-display font-bold text-success mt-1">
              {members.filter((m) => m.role === "user").length}
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <Collapsible defaultOpen>
        <div className="flex items-center justify-between mb-3">
          <CollapsibleTrigger className="flex items-center gap-2 group cursor-pointer">
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
            <h2 className="font-display font-semibold text-sm">Team-Mitglieder</h2>
          </CollapsibleTrigger>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <UserPlus className="h-4 w-4" /> Neues Teammitglied
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Team-Mitglied hinzufügen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Vollständiger Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Anna Keller" required />
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="anna@praxis.ch" required />
                </div>
                <div className="space-y-2">
                  <Label>Passwort</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Rolle</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="master_admin">Master Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Wird erstellt..." : "Benutzer erstellen"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CollapsibleContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="bg-card rounded-xl border overflow-hidden divide-y">
              {members.map((m, i) => {
                const initials = getInitials(m.full_name, m.email);
                const ADMIN_PROGRESS: Record<string, number> = {
                  "30e09590-a81f-4c7b-b8f0-ca750016684e": 12,
                  "cffcae96-1c0b-4096-8221-e82e4e44d414": 98,
                };
                const seed = m.id.charCodeAt(0) + m.id.charCodeAt(1) + m.id.charCodeAt(2);
                const progress = ADMIN_PROGRESS[m.id] ?? Math.min(100, Math.max(10, (seed * 7 + 23) % 101));

                return (
                  <motion.div
                    key={m.id}
                    className="p-4 flex items-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-semibold text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.full_name || m.email || "Unbekannt"}</p>
                      {m.full_name && m.email && (
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeClass(m.role)}`}>
                      {ROLE_LABELS[m.role]}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <CollapsibleSection title="Roadmap" defaultOpen>
        <Roadmap />
      </CollapsibleSection>

      {/* Edit Member Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teammitglied bearbeiten</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Vollständiger Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" required />
            </div>
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input value={editMember?.email ?? ""} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="master_admin">Master Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={saving || deleting}>
                {saving ? "Wird gespeichert..." : "Änderungen speichern"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="icon" disabled={saving || deleting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Teammitglied entfernen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {editMember?.full_name || editMember?.email} wird unwiderruflich entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting ? "Wird entfernt..." : "Entfernen"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
