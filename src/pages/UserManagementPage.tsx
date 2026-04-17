import { UserManagement } from "@/components/UserManagement";

export default function UserManagementPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Benutzerverwaltung</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Benutzer erstellen, Rollen verwalten und Berechtigungen einsehen.
        </p>
      </div>
      <UserManagement />
    </div>
  );
}
