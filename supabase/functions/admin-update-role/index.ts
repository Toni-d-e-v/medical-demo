import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Nicht authentifiziert");

    // Check caller role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    const role = callerRole?.role;
    const { user_id, role: targetRole } = await req.json();

    // Admin can only assign 'user' role
    if (role === "admin" && targetRole !== "user") {
      throw new Error("Admins können nur die User-Rolle vergeben");
    }

    // Only master_admin can assign admin/master_admin
    if (role !== "master_admin" && (targetRole === "admin" || targetRole === "master_admin")) {
      throw new Error("Keine Berechtigung für diese Rolle");
    }

    if (role !== "master_admin" && role !== "admin") {
      throw new Error("Keine Berechtigung");
    }

    const { error } = await adminClient
      .from("user_roles")
      .update({ role: targetRole })
      .eq("user_id", user_id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
