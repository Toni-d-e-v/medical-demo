import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ExplainerScene {
  caption: string;
  narration: string;
  action: string;
}

interface StickmanPlayerProps {
  scenes: ExplainerScene[];
}

// Estimate spoken duration for a German narration string (~14 chars/sec, min 2s)
function estimateDurationMs(text: string): number {
  const chars = text.length;
  return Math.max(2200, Math.round((chars / 14) * 1000) + 600);
}

function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const exact = voices.find((v) => v.lang?.toLowerCase() === "de-ch")
    || voices.find((v) => v.lang?.toLowerCase() === "de-de")
    || voices.find((v) => v.lang?.toLowerCase().startsWith("de"));
  return exact || null;
}

/** Single SVG stickman with frame-driven animation per action */
function Stickman({ action, t }: { action: string; t: number }) {
  // t = 0..1 looped progress within the scene (used for cyclic motions)
  const phase = (Math.sin(t * Math.PI * 4) + 1) / 2; // 0..1 oscillation

  // Default pose values
  let bodyY = 0;
  let leftArmAngle = 20;
  let rightArmAngle = -20;
  let leftLegAngle = 10;
  let rightLegAngle = -10;
  let headBob = 0;
  let mouthOpen = 4;
  let translateX = 0;

  switch (action) {
    case "wave":
      rightArmAngle = -120 - phase * 30;
      mouthOpen = 4 + phase * 3;
      break;
    case "walk":
      translateX = Math.sin(t * Math.PI * 2) * 40;
      leftLegAngle = 30 - phase * 60;
      rightLegAngle = -30 + phase * 60;
      leftArmAngle = -30 + phase * 60;
      rightArmAngle = 30 - phase * 60;
      break;
    case "run":
      translateX = Math.sin(t * Math.PI * 2) * 60;
      leftLegAngle = 50 - phase * 100;
      rightLegAngle = -50 + phase * 100;
      leftArmAngle = -50 + phase * 100;
      rightArmAngle = 50 - phase * 100;
      bodyY = -Math.abs(Math.sin(t * Math.PI * 8)) * 6;
      break;
    case "point":
      rightArmAngle = -90;
      leftArmAngle = 10;
      mouthOpen = 5 + phase * 4;
      break;
    case "think":
      rightArmAngle = -130;
      leftArmAngle = 20;
      headBob = Math.sin(t * Math.PI * 2) * 4;
      break;
    case "celebrate":
      leftArmAngle = -150 - phase * 20;
      rightArmAngle = 150 + phase * 20;
      bodyY = -Math.abs(Math.sin(t * Math.PI * 6)) * 12;
      mouthOpen = 8;
      break;
    case "write":
      rightArmAngle = -50 + Math.sin(t * Math.PI * 6) * 15;
      leftArmAngle = 30;
      break;
    case "lift":
      leftArmAngle = -160;
      rightArmAngle = 160;
      bodyY = phase * 4;
      break;
    case "sit":
      bodyY = 30;
      leftLegAngle = 80;
      rightLegAngle = -80;
      break;
    case "shrug":
      leftArmAngle = -60 + phase * 10;
      rightArmAngle = 60 - phase * 10;
      headBob = -2;
      break;
    case "clap":
      leftArmAngle = -70 + phase * 50;
      rightArmAngle = 70 - phase * 50;
      mouthOpen = 6;
      break;
    case "talk":
    default:
      mouthOpen = 3 + phase * 5;
      leftArmAngle = 20 + Math.sin(t * Math.PI * 3) * 10;
      rightArmAngle = -20 - Math.sin(t * Math.PI * 3) * 10;
      break;
  }

  const headCx = 100;
  const headCy = 60 + bodyY + headBob;
  const neckY = 80 + bodyY;
  const torsoBottomY = 140 + bodyY;
  const hipY = torsoBottomY;

  const armLength = 38;
  const legLength = 46;

  const lArmEnd = {
    x: headCx - 15 + Math.sin((leftArmAngle * Math.PI) / 180) * armLength,
    y: neckY + 15 + Math.cos((leftArmAngle * Math.PI) / 180) * armLength,
  };
  const rArmEnd = {
    x: headCx + 15 + Math.sin((rightArmAngle * Math.PI) / 180) * armLength,
    y: neckY + 15 + Math.cos((rightArmAngle * Math.PI) / 180) * armLength,
  };
  const lLegEnd = {
    x: headCx - 8 + Math.sin((leftLegAngle * Math.PI) / 180) * legLength,
    y: hipY + Math.cos((leftLegAngle * Math.PI) / 180) * legLength,
  };
  const rLegEnd = {
    x: headCx + 8 + Math.sin((rightLegAngle * Math.PI) / 180) * legLength,
    y: hipY + Math.cos((rightLegAngle * Math.PI) / 180) * legLength,
  };

  return (
    <g transform={`translate(${translateX}, 0)`} stroke="hsl(var(--foreground))" strokeWidth="3.5" strokeLinecap="round" fill="none">
      {/* Head */}
      <circle cx={headCx} cy={headCy} r="18" fill="hsl(var(--background))" />
      {/* Eyes */}
      <circle cx={headCx - 6} cy={headCy - 2} r="1.6" fill="hsl(var(--foreground))" stroke="none" />
      <circle cx={headCx + 6} cy={headCy - 2} r="1.6" fill="hsl(var(--foreground))" stroke="none" />
      {/* Mouth */}
      <ellipse cx={headCx} cy={headCy + 7} rx="5" ry={mouthOpen / 2} fill="hsl(var(--foreground))" stroke="none" />
      {/* Neck + torso */}
      <line x1={headCx} y1={headCy + 18} x2={headCx} y2={torsoBottomY} />
      {/* Shoulders */}
      <line x1={headCx - 15} y1={neckY + 15} x2={headCx + 15} y2={neckY + 15} />
      {/* Arms */}
      <line x1={headCx - 15} y1={neckY + 15} x2={lArmEnd.x} y2={lArmEnd.y} />
      <line x1={headCx + 15} y1={neckY + 15} x2={rArmEnd.x} y2={rArmEnd.y} />
      {/* Legs */}
      <line x1={headCx - 8} y1={hipY} x2={lLegEnd.x} y2={lLegEnd.y} />
      <line x1={headCx + 8} y1={hipY} x2={rLegEnd.x} y2={rLegEnd.y} />
    </g>
  );
}

export function StickmanPlayer({ scenes }: StickmanPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 within current scene
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const sceneDurations = useMemo(
    () => scenes.map((s) => estimateDurationMs(s.narration || s.caption || "")),
    [scenes],
  );
  const totalMs = useMemo(() => sceneDurations.reduce((a, b) => a + b, 0), [sceneDurations]);

  // Load voices (browsers load asynchronously)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const update = () => { voiceRef.current = pickGermanVoice(); };
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Stop everything on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (muted) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1;
    u.pitch = 1;
    if (voiceRef.current) u.voice = voiceRef.current;
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const tick = () => {
    if (!playing || startedAtRef.current === null) return;
    const elapsed = performance.now() - startedAtRef.current;
    const dur = sceneDurations[sceneIdx] || 2000;
    const p = Math.min(1, elapsed / dur);
    setProgress(p);
    if (p >= 1) {
      const next = sceneIdx + 1;
      if (next >= scenes.length) {
        setPlaying(false);
        setProgress(1);
        return;
      }
      setSceneIdx(next);
      startedAtRef.current = performance.now();
      speak(scenes[next].narration);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, sceneIdx, muted]);

  const handlePlay = () => {
    if (scenes.length === 0) return;
    if (progress >= 1 && sceneIdx >= scenes.length - 1) {
      setSceneIdx(0);
      setProgress(0);
    }
    startedAtRef.current = performance.now() - progress * (sceneDurations[sceneIdx] || 2000);
    setPlaying(true);
    speak(scenes[sceneIdx].narration);
  };

  const handlePause = () => {
    setPlaying(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (startedAtRef.current !== null) {
      const elapsed = performance.now() - startedAtRef.current;
      const dur = sceneDurations[sceneIdx] || 2000;
      setProgress(Math.min(1, elapsed / dur));
    }
  };

  const handleRestart = () => {
    setPlaying(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSceneIdx(0);
    setProgress(0);
    startedAtRef.current = null;
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      } else if (!next && playing) {
        speak(scenes[sceneIdx].narration);
      }
      return next;
    });
  };

  if (scenes.length === 0) return null;

  const currentScene = scenes[sceneIdx];
  const overallProgress =
    (sceneDurations.slice(0, sceneIdx).reduce((a, b) => a + b, 0) +
      progress * (sceneDurations[sceneIdx] || 0)) / Math.max(1, totalMs);

  return (
    <div className="rounded-lg overflow-hidden border bg-card">
      <div className="aspect-video bg-gradient-to-br from-muted/40 via-muted/20 to-background relative">
        {/* Ground line */}
        <svg viewBox="0 0 400 240" className="w-full h-full">
          <line x1="20" y1="200" x2="380" y2="200" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
          <Stickman action={currentScene.action} t={progress} />
        </svg>
        {/* Caption overlay */}
        {currentScene.caption && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-foreground/85 text-background text-xs font-medium max-w-[90%] text-center shadow">
            {currentScene.caption}
          </div>
        )}
        {/* Narration subtitle */}
        <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-md bg-background/85 backdrop-blur-sm text-xs sm:text-sm text-center shadow">
          {currentScene.narration}
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 flex items-center gap-3 border-t bg-card">
        <Button
          size="icon"
          variant="ghost"
          onClick={playing ? handlePause : handlePlay}
          aria-label={playing ? "Pausieren" : "Abspielen"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={handleRestart} aria-label="Neu starten">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={toggleMute} aria-label={muted ? "Ton an" : "Ton aus"}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-150"
            style={{ width: `${Math.min(100, Math.max(0, overallProgress * 100))}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {sceneIdx + 1}/{scenes.length}
        </span>
      </div>
    </div>
  );
}
