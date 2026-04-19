import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import avatarImg from "@/assets/ai-avatar.png";

interface PetraTooltipProps {
  /** The element that triggers the tooltip on hover */
  children: ReactNode;
  /** Petra's explanation text shown in the speech bubble */
  text: string;
  /** Tooltip side; defaults to "top" */
  side?: "top" | "right" | "bottom" | "left";
  /** Optional title shown bold above the text */
  title?: string;
  /** Hover delay in ms (default 200) */
  delay?: number;
  /** Wrap trigger as span (asChild=false) when children isn't a single element */
  asChild?: boolean;
}

/**
 * Hover-Tooltip im Look von Petra (KI-Assistentin):
 * Avatar-Bild links, Sprechblase mit Text rechts.
 */
export function PetraTooltip({
  children,
  text,
  side = "top",
  title,
  delay = 200,
  asChild = true,
}: PetraTooltipProps) {
  return (
    <TooltipProvider delayDuration={delay} skipDelayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild={asChild}>
          {asChild ? children : <span className="inline-flex">{children}</span>}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={10}
          className="max-w-xs p-0 bg-transparent border-0 shadow-none"
        >
          <div className="flex items-start gap-2.5 animate-in fade-in-0 zoom-in-95 duration-150">
            <img
              src={avatarImg}
              alt="Petra – KI-Assistentin"
              className="w-9 h-9 rounded-full border-2 border-primary/30 shrink-0 object-cover bg-card shadow-md"
            />
            <div className="relative bg-card text-card-foreground border border-border rounded-xl rounded-tl-sm shadow-lg px-3 py-2">
              {/* Pointer triangle */}
              <span
                aria-hidden
                className="absolute -left-1.5 top-3 w-3 h-3 rotate-45 bg-card border-l border-b border-border"
              />
              <div className="relative">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                  Petra
                </div>
                {title && (
                  <div className="text-xs font-semibold mb-0.5">{title}</div>
                )}
                <p className="text-xs leading-snug text-foreground/90">{text}</p>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
