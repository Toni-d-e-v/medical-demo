// Edge function: analyzes uploaded text/PDF/Word documents and returns structured learning content
// PDFs are parsed server-side here using unpdf (Deno-native). DOCX/TXT are extracted client-side and sent as text.

import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY ist nicht konfiguriert." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null) as
      | {
          text?: string;
          pdfBase64?: string;
          fileName?: string;
          moduleTitle?: string;
          moduleCategory?: string;
          mode?: "analyze" | "structure";
        }
      | null;

    if (!body || (typeof body.text !== "string" && typeof body.pdfBase64 !== "string")) {
      return new Response(
        JSON.stringify({ error: "text (string) oder pdfBase64 (string) ist erforderlich." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let extractedText = "";
    if (typeof body.pdfBase64 === "string" && body.pdfBase64.length > 0) {
      try {
        const bytes = base64ToUint8Array(body.pdfBase64);
        if (bytes.byteLength > 20 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: "PDF zu gross (max. 20 MB)." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const pdf = await getDocumentProxy(bytes);
        const { text } = await extractText(pdf, { mergePages: true });
        extractedText = (text || "").trim();
      } catch (pdfErr) {
        console.error("PDF parse error:", pdfErr);
        return new Response(
          JSON.stringify({ error: "PDF konnte nicht gelesen werden. Möglicherweise gescannt oder geschützt." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      extractedText = (body.text || "").trim();
    }

    if (!extractedText || extractedText.length < 20) {
      return new Response(
        JSON.stringify({ error: "Kein Text im Dokument gefunden (eventuell gescanntes PDF)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const text = extractedText.slice(0, 200_000);
    const moduleTitle = (body.moduleTitle || "").slice(0, 200);
    const moduleCategory = (body.moduleCategory || "").slice(0, 100);

    const systemPrompt =
      "Du bist eine Expertin für medizinische Praxisorganisation und erstellst klare Lerninhalte auf Deutsch (Schweizer Hochdeutsch, ohne ß). " +
      "Antworte ausschliesslich mit gültigem JSON ohne Markdown-Codeblöcke.";

    const userInstruction =
      `Analysiere den folgenden Dokumenttext${moduleTitle ? ` für das Lernmodul "${moduleTitle}"` : ""}` +
      `${moduleCategory ? ` (Kategorie: ${moduleCategory})` : ""}.\n\n` +
      `Beurteile, ob der Text bereits klar strukturiert ist (mit Überschriften, Abschnitten, Aufzählungen, klarem Aufbau).\n\n` +
      `Gib ein JSON-Objekt zurück mit genau diesen Feldern:\n` +
      `{\n` +
      `  "isStructured": true|false,\n` +
      `  "reason": "Kurze Begründung (1 Satz) auf Deutsch.",\n` +
      `  "suggestedDescription": "Kurze, prägnante Zusammenfassung in 1–2 Sätzen (max. 250 Zeichen).",\n` +
      `  "originalContent": "Der Originaltext, leicht aufbereitet (Whitespace bereinigt, Absätze erhalten). KEINE inhaltlichen Änderungen.",\n` +
      `  "structuredContent": "Falls isStructured=false: Eine neu strukturierte Version mit Absätzen und ggf. Aufzählungen (- ). Falls isStructured=true: identisch mit originalContent."\n` +
      `}\n\n` +
      `DOKUMENTTEXT:\n${text}`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInstruction },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate Limit erreicht. Bitte später erneut versuchen." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `OpenAI Fehler (${aiResponse.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const raw = aiData?.choices?.[0]?.message?.content;
    if (!raw) {
      return new Response(
        JSON.stringify({ error: "Leere Antwort von AI." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: {
      isStructured?: boolean;
      reason?: string;
      suggestedDescription?: string;
      originalContent?: string;
      structuredContent?: string;
    } = {};
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      parsed = { originalContent: String(raw) };
    }

    return new Response(
      JSON.stringify({
        isStructured: !!parsed.isStructured,
        reason: parsed.reason ?? "",
        suggestedDescription: parsed.suggestedDescription ?? "",
        originalContent: parsed.originalContent ?? text,
        structuredContent: parsed.structuredContent ?? parsed.originalContent ?? text,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
