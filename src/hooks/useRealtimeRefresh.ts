import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type TableName = "modules" | "quiz_questions" | "profiles" | "user_roles" | "category_order" | "user_display_order";

/**
 * Subscribes to Supabase Realtime changes on specified tables
 * and calls `onRefresh` whenever an INSERT, UPDATE, or DELETE occurs.
 */
export function useRealtimeRefresh(tables: TableName[], onRefresh: () => void) {
  useEffect(() => {
    if (tables.length === 0) return;

    const channelName = `realtime-${tables.join("-")}-${Math.random().toString(36).slice(2, 8)}`;
    let channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onRefresh()
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables.join(",")]); // stable dep
}
