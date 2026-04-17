export type AppRole = "master_admin" | "admin" | "user";

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  created_at: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  master_admin: "Master Admin",
  admin: "Admin",
  user: "User",
};

export const ROLE_COLORS: Record<AppRole, string> = {
  master_admin: "bg-destructive/10 text-destructive border-destructive/20",
  admin: "bg-sky-100 text-sky-700 border-sky-200",
  user: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function getRoleBadgeClass(role: AppRole): string {
  return ROLE_COLORS[role];
}

export function getInitials(fullName: string | null, email: string | null): string {
  if (fullName) {
    return fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return (email?.[0] ?? "?").toUpperCase();
}
