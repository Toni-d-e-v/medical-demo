import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, GripVertical } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { UserPlus, Shield, Users, User, ShieldCheck, ShieldAlert, Pencil } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { type AppRole, ROLE_LABELS, ROLE_COLORS, getInitials } from "@/lib/team-utils";

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  master_admin: <ShieldAlert className="h-3.5 w-3.5" />,
  admin: <ShieldCheck className="h-3.5 w-3.5" />,
  user: <Users className="h-3.5 w-3.5" />,
};

// Mock users with fictional progress
const MOCK_USERS = [
  { id: "mock-1", email: "laura.meier@praxis.ch", full_name: "Laura Meier", role: "user" as AppRole, created_at: "2026-01-15" },
  { id: "mock-2", email: "thomas.huber@praxis.ch", full_name: "Thomas Huber", role: "user" as AppRole, created_at: "2026-02-01" },
  { id: "mock-3", email: "sarah.mueller@praxis.ch", full_name: "Sarah Müller", role: "user" as AppRole, created_at: "2026-02-20" },
  { id: "mock-4", email: "marco.keller@praxis.ch", full_name: "Marco Keller", role: "admin" as AppRole, created_at: "2026-01-10" },
];

const MOCK_PROGRESS: Record<string, number> = {
  "mock-1": 78,
  "mock-2": 45,
  "mock-3": 92,
  "mock-4": 63,
  "30e09590-a81f-4c7b-b8f0-ca750016684e": 12,
  "cffcae96-1c0b-4096-8221-e82e4e44d414": 98,
};

export function UserManagement() {
  const { role: currentUserRole } = useAuth();
  const { toast } = useToast();
  const { members: users, loading, refetch } = useTeamMembers({ sortByRole: true });

  const [matrixOpen, setMatrixOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<("matrix" | "users")[]>(() => {
    try {
      const saved = localStorage.getItem("admin-section-order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2) return parsed;
      }
    } catch {}
    return ["matrix", "users"];
  });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("user");

  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [creating, setCreating] = useState(false);

  // User drag-and-drop state
  const [orderedUsers, setOrderedUsers] = useState<typeof users>([]);
  const [userDragIdx, setUserDragIdx] = useState<number | null>(null);
  const [userDragOverIdx, setUserDragOverIdx] = useState<number | null>(null);
  const [displayOrder, setDisplayOrder] = useState<Record<string, number>>({});

  const isMasterAdmin = currentUserRole === "master_admin";
  const allowedRolesToAssign: AppRole[] = isMasterAdmin
    ? ["user", "admin", "master_admin"]
    : ["user"];

  // Fetch display order from DB
  useEffect(() => {
    supabase.from("user_display_order").select("user_id, sort_order").then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {};
        data.forEach((d: any) => { map[d.user_id] = d.sort_order; });
        setDisplayOrder(map);
      }
    });
  }, []);

  // Combine and sort users by saved display order, then by role as fallback
  const allUsers = useMemo(() => {
    const combined = [...users, ...MOCK_USERS.filter((m) => !users.find((u) => u.email === m.email))];
    return combined.sort((a, b) => {
      const oa = displayOrder[a.id];
      const ob = displayOrder[b.id];
      if (oa !== undefined && ob !== undefined) return oa - ob;
      if (oa !== undefined) return -1;
      if (ob !== undefined) return 1;
      const order: AppRole[] = ["master_admin", "admin", "user"];
      return order.indexOf(a.role) - order.indexOf(b.role);
    });
  }, [users, displayOrder]);

  useEffect(() => {
    setOrderedUsers(allUsers);
  }, [allUsers]);

  const saveUserOrder = useCallback(async (reordered: typeof users) => {
    const upserts = reordered.map((u, i) => ({ user_id: u.id, sort_order: i, updated_at: new Date().toISOString() }));
    // Filter only real users (not mock)
    const realUpserts = upserts.filter((u) => !u.user_id.startsWith("mock-"));
    if (realUpserts.length === 0) return;
    const { error } = await supabase.from("user_display_order").upsert(realUpserts, { onConflict: "user_id" });
    if (error) {
      toast({ title: "Fehler", description: "Reihenfolge konnte nicht gespeichert werden.", variant: "destructive" });
    }
  }, [toast]);

  const handleUserDragStart = (e: React.DragEvent, index: number) => {
    setUserDragIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleUserDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setUserDragOverIdx(index);
  };
  const handleUserDrop = (index: number) => {
    if (userDragIdx === null || userDragIdx === index) {
      setUserDragIdx(null); setUserDragOverIdx(null); return;
    }
    const newList = [...orderedUsers];
    const [moved] = newList.splice(userDragIdx, 1);
    newList.splice(index, 0, moved);
    setOrderedUsers(newList);
    // Update display order map
    const newOrder: Record<string, number> = {};
    newList.forEach((u, i) => { newOrder[u.id] = i; });
    setDisplayOrder(newOrder);
    saveUserOrder(newList);
    setUserDragIdx(null); setUserDragOverIdx(null);
  };
  const handleUserDragEnd = () => { setUserDragIdx(null); setUserDragOverIdx(null); };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email: newEmail, password: newPassword, full_name: newFullName, role: newRole },
      });
      if (res.error) throw new Error(res.error.message);
      toast({ title: "Benutzer erstellt", description: `${newEmail} wurde als ${ROLE_LABELS[newRole]} angelegt.` });
      setCreateOpen(false);
      setNewEmail(""); setNewFullName(""); setNewPassword(""); setNewRole("user");
      refetch();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      const res = await supabase.functions.invoke("admin-update-role", {
        body: { user_id: userId, role: newRole },
      });
      if (res.error) throw new Error(res.error.message);
      toast({ title: "Rolle aktualisiert", description: `Rolle wurde zu ${ROLE_LABELS[newRole]} geändert.` });
      setEditUserId(null);
      refetch();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const permissionMatrix = [
    { action: "User erstellen", master_admin: true, admin: true, user: false },
    { action: "Admin erstellen", master_admin: true, admin: false, user: false },
    { action: "Master Admin erstellen", master_admin: true, admin: false, user: false },
    { action: "User-Rolle ändern", master_admin: true, admin: true, user: false },
    { action: "Admin-Rolle vergeben", master_admin: true, admin: false, user: false },
    { action: "Master-Admin-Rolle vergeben", master_admin: true, admin: false, user: false },
    { action: "Alle Profile einsehen", master_admin: true, admin: true, user: false },
    { action: "Quiz-Auswertungen einsehen", master_admin: true, admin: true, user: false },
  ];

  // Drag handlers for sections
  const handleSectionDragStart = (index: number) => setDragIdx(index);
  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };
  const handleSectionDrop = (index: number) => {
    if (dragIdx === null || dragIdx === index) {
      setDragIdx(null); setDragOverIdx(null); return;
    }
    const newOrder = [...sectionOrder];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(index, 0, moved);
    setSectionOrder(newOrder);
    localStorage.setItem("admin-section-order", JSON.stringify(newOrder));
    setDragIdx(null); setDragOverIdx(null);
    toast({ title: "Reihenfolge gespeichert" });
  };
  const handleSectionDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const matrixSection = (
    <Collapsible open={matrixOpen} onOpenChange={setMatrixOpen}>
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="flex items-center">
          <div className="pl-3 cursor-grab active:cursor-grabbing" onMouseDown={(e) => e.stopPropagation()}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <CollapsibleTrigger className="flex-1 p-4 border-b flex items-center gap-2 cursor-pointer transition-colors">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${matrixOpen ? "" : "-rotate-90"}`} />
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold">Berechtigungsmatrix</h2>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Aktion</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> Master Admin
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" /> User
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionMatrix.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{row.action}</TableCell>
                    <TableCell className="text-center">
                      {row.master_admin ? <span className="text-primary font-bold">✓</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.admin ? <span className="text-primary font-bold">✓</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.user ? <span className="text-primary font-bold">✓</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );

  const usersSection = (
    <Collapsible open={usersOpen} onOpenChange={setUsersOpen}>
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-0">
            <div className="cursor-grab active:cursor-grabbing mr-2" onMouseDown={(e) => e.stopPropagation()}>
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer">
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${usersOpen ? "" : "-rotate-90"}`} />
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold">Benutzerverwaltung</h2>
            </CollapsibleTrigger>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <UserPlus className="h-4 w-4" /> Neuer Benutzer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Vollständiger Name</Label>
                  <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Anna Keller" required />
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
                      {allowedRolesToAssign.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
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
            <div className="p-8 flex justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Lernfortschritt</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderedUsers.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      draggable
                      onDragStart={(e) => handleUserDragStart(e as any, i)}
                      onDragOver={(e) => handleUserDragOver(e as any, i)}
                      onDrop={() => handleUserDrop(i)}
                      onDragEnd={handleUserDragEnd}
                      className={`border-b transition-colors hover:bg-muted/50 ${
                        userDragIdx === i ? "opacity-50" : ""
                      } ${userDragOverIdx === i && userDragIdx !== i ? "border-t-2 border-t-primary" : ""}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <TableCell className="w-[40px] px-2">
                        <div className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-semibold text-xs shrink-0">
                            {getInitials(user.full_name, user.email)}
                          </div>
                          <span className="font-medium text-sm">{user.full_name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email ?? "—"}</TableCell>
                      <TableCell>
                        {(() => {
                          const progress = MOCK_PROGRESS[user.id] ?? Math.floor(Math.random() * 60 + 20);
                          return (
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress value={progress} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {editUserId === user.id ? (
                          <Select value={editRole} onValueChange={(v) => { setEditRole(v as AppRole); handleUpdateRole(user.id, v as AppRole); }}>
                            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {allowedRolesToAssign.map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={`gap-1 ${ROLE_COLORS[user.role]}`}>
                            {ROLE_ICONS[user.role]}
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editUserId !== user.id && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditUserId(user.id); setEditRole(user.role); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );

  const sections: Record<"matrix" | "users", React.ReactNode> = {
    matrix: matrixSection,
    users: usersSection,
  };

  return (
    <div className="space-y-6">
      {sectionOrder.map((key, idx) => (
        <div
          key={key}
          draggable
          onDragStart={() => handleSectionDragStart(idx)}
          onDragOver={(e) => handleSectionDragOver(e, idx)}
          onDrop={() => handleSectionDrop(idx)}
          onDragEnd={handleSectionDragEnd}
          className={`transition-all ${
            dragOverIdx === idx && dragIdx !== idx ? "border-t-2 border-primary rounded-xl" : ""
          } ${dragIdx === idx ? "opacity-50" : ""}`}
        >
          {sections[key]}
        </div>
      ))}
    </div>
  );
}
