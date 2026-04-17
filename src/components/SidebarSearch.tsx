import { useState, useEffect, useRef } from "react";
import { Search, BookOpen, Library, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { libraryResources } from "@/data/library";
import { Input } from "@/components/ui/input";

interface SearchResult {
  type: "module" | "library";
  title: string;
  subtitle: string;
  url: string;
}

export function SidebarSearch({ collapsed }: { collapsed: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();

    // Library results (static)
    const libResults: SearchResult[] = libraryResources
      .filter((r) => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      .map((r) => ({
        type: "library",
        title: r.title,
        subtitle: r.category,
        url: "/library",
      }));

    // Module results (from DB)
    supabase
      .from("modules")
      .select("id, title, category, description")
      .eq("is_active", true)
      .or(`title.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10)
      .then(({ data }) => {
        const modResults: SearchResult[] = (data ?? []).map((m) => ({
          type: "module",
          title: m.title,
          subtitle: m.category,
          url: `/modules/${m.id}`,
        }));
        setResults([...modResults, ...libResults].slice(0, 8));
        setOpen(true);
      });
  }, [query]);

  if (collapsed) {
    return (
      <button
        onClick={() => {
          // In collapsed mode, expand sidebar first or show a minimal search
        }}
        className="flex items-center justify-center w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
        title="Suchen"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative px-3 mb-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen…"
          className="h-8 pl-8 pr-8 text-xs bg-sidebar-accent border-0 focus-visible:ring-1"
          onFocus={() => query.length >= 2 && setOpen(true)}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.title}-${i}`}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              onClick={() => {
                navigate(r.url);
                setQuery("");
                setOpen(false);
              }}
            >
              {r.type === "module" ? (
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <Library className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{r.title}</p>
                <p className="text-[10px] text-muted-foreground">{r.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg p-3">
          <p className="text-xs text-muted-foreground text-center">Keine Ergebnisse</p>
        </div>
      )}
    </div>
  );
}
