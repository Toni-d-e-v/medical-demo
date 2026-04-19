// Edge function: generates a stickman explainer-video script from a module description
// Returns JSON with scenes [{ caption, narration, action }]

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTIONS = [
  "wave", "walk", "point", "think", "celebrate",
  "write", "talk", "lift", "run", "sit", "shrug", "clap",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ist nicht konfiguriert." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null) as
      | { description?: string; title?: string; sceneCount?: number }
      | null;

    if (!body || typeof body.description !== "string" || body.description.trim().length < 20) {
      return new Response(JSON.stringify({ error: "description (mind. 20 Zeichen) ist erforderlich." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sceneCount = Math.min(Math.max(Number(body.sceneCount) || 5, 3), 8);
    const title = (body.title || "").slice(0, 200);
    const description = body.description.slice(0, 4000);

    const systemPrompt =
      "Du bist eine Drehbuchautorin für animierte Strichmännchen-Erklärvideos in der medizinischen Praxisorganisation. " +
      "Schreibe auf Deutsch (Schweizer Hochdeutsch, ohne ß). Antworte ausschliesslich mit gültigem JSON ohne Markdown.";

    const userPrompt =
      `Erstelle ein Skript für ein kurzes animiertes Erklärvideo mit Strichmännchen.\n\n` +
      `Modul-Titel: "${title}"\n` +
      `Beschreibung/Lerninhalt:\n${description}\n\n` +
      `Erzeuge GENAU ${sceneCount} Szenen. Jede Szene enthält:\n` +
      `- "caption": Kurzer Bildschirmtext (max 60 Zeichen)\n` +
      `- "narration": Sprechertext (1-2 Sätze, natürlich gesprochen, max 220 Zeichen)\n` +
      `- "action": Eine der erlaubten Strichmännchen-Aktionen: ${ALLOWED_ACTIONS.join(", ")}\n\n` +
      `Antworte ausschliesslich mit JSON:\n` +
      `{ "scenes": [ { "caption": "...", "narration": "...", "action": "..." } ] }`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate Limit erreicht. Bitte später erneut versuchen." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Lovable AI Guthaben aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI-Gateway Fehler (${aiResponse.status})` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const raw = aiData?.choices?.[0]?.message?.content;
    if (!raw) {
      return new Response(JSON.stringify({ error: "Leere Antwort von AI." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { scenes?: Array<{ caption?: string; narration?: string; action?: string }> } = {};
    try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { parsed = {}; }

    const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
    if (scenes.length === 0) {
      return new Response(JSON.stringify({ error: "Konnte keine Szenen erzeugen." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanScenes = scenes
      .map((s) => ({
        caption: String(s?.caption ?? "").slice(0, 80).trim(),
        narration: String(s?.narration ?? "").slice(0, 280).trim(),
        action: ALLOWED_ACTIONS.includes(String(s?.action) as typeof ALLOWED_ACTIONS[number])
          ? String(s.action)
          : "talk",
      }))
      .filter((s) => s.narration.length > 0);

    return new Response(
      JSON.stringify({ scenes: cleanScenes, generatedAt: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-explainer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
