const WIDTH = 640;
const HEIGHT = 360;
const FPS = 15;
const MS_PER_PARAGRAPH = 2500;
const MAX_PARAGRAPHS = 6;
const POSE_CYCLE_MS = 200;

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "video/webm";
}

function splitParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0 && text.trim()) paragraphs.push(text.trim());
  return paragraphs.slice(0, MAX_PARAGRAPHS);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
      if (yy > HEIGHT - 20) return;
    } else {
      line = candidate;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pose: number,
) {
  ctx.strokeStyle = "#f8fafc";
  ctx.fillStyle = "#f8fafc";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(cx, cy - 60, 18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - 42);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();

  const armSwing = [
    { left: -0.6, right: 0.6 },
    { left: 0.2, right: -0.2 },
    { left: 0.8, right: -0.8 },
  ][pose];
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx + Math.sin(armSwing.left) * 30, cy - 30 + Math.cos(armSwing.left) * 30);
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx + Math.sin(armSwing.right) * 30, cy - 30 + Math.cos(armSwing.right) * 30);
  ctx.stroke();

  const legSwing = [
    { left: -0.25, right: 0.25 },
    { left: 0.15, right: -0.15 },
    { left: 0.35, right: -0.35 },
  ][pose];
  ctx.beginPath();
  ctx.moveTo(cx, cy + 10);
  ctx.lineTo(cx + Math.sin(legSwing.left) * 35, cy + 10 + Math.cos(legSwing.left) * 35);
  ctx.moveTo(cx, cy + 10);
  ctx.lineTo(cx + Math.sin(legSwing.right) * 35, cy + 10 + Math.cos(legSwing.right) * 35);
  ctx.stroke();
}

export async function generateStickFigureVideo(text: string): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder wird vom Browser nicht unterstützt (Chrome empfohlen).");
  }
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) {
    throw new Error("Kein Inhalt zum Animieren. Bitte zuerst Lerninhalt eingeben.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas-Kontext nicht verfügbar.");

  const stream = canvas.captureStream(FPS);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e: any) => reject(e.error ?? new Error("MediaRecorder-Fehler"));
  });

  recorder.start();
  const start = performance.now();
  const totalDuration = paragraphs.length * MS_PER_PARAGRAPH;

  const render = () => {
    const elapsed = performance.now() - start;
    const idx = Math.min(Math.floor(elapsed / MS_PER_PARAGRAPH), paragraphs.length - 1);
    const pose = Math.floor(elapsed / POSE_CYCLE_MS) % 3;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#64748b";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${idx + 1} / ${paragraphs.length}`, WIDTH - 50, 20);

    drawStickFigure(ctx, 90, 230, pose);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "18px sans-serif";
    wrapText(ctx, paragraphs[idx], 180, 100, WIDTH - 200, 24);

    if (elapsed < totalDuration) {
      requestAnimationFrame(render);
    } else {
      recorder.stop();
    }
  };
  requestAnimationFrame(render);

  return done;
}
