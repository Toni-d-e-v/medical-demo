import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, TeamMember } from "@/lib/team-utils";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

interface UseTeamMembersOptions {
  sortByRole?: boolean;
}

export function useTeamMembers(options: UseTeamMembersOptions = {}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const roleMap = new Map<string, AppRole>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

    let team: TeamMember[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: roleMap.get(p.id) ?? "user",
      created_at: p.created_at,
    }));

    if (options.sortByRole) {
      const order: AppRole[] = ["master_admin", "admin", "user"];
      team.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
    }

    setMembers(team);
    setLoading(false);
  }, [options.sortByRole]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useRealtimeRefresh(["profiles", "user_roles"], fetchMembers);

  return { members, loading, refetch: fetchMembers };
}
