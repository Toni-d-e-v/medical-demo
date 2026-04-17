import { DialogBubble } from "@/components/DialogBubble";
import { libraryResources } from "@/data/library";

export default function LibraryPage() {
  const resources = libraryResources;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Bibliothek</h1>
        <p className="text-muted-foreground text-sm mt-1">Nachschlagewerke und Dokumente für den Praxisalltag</p>
      </div>

      <DialogBubble message="In der Bibliothek findest du alle wichtigen Dokumente und Nachschlagewerke. Nutze sie parallel zu den Modulen!" />

      <div className="grid sm:grid-cols-2 gap-3">
        {resources.map((r) => (
          <div key={r.title} className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {r.type}
            </div>
            <div>
              <p className="font-medium text-sm">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
