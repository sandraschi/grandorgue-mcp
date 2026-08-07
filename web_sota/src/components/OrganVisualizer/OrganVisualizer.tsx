import { useEffect, useRef } from "react";

interface PipeState {
  index: number;
  active: boolean;
  velocity: number;
  decay: number;
}

interface StopState {
  cc: number;
  name: string;
  active: boolean;
}

const MANUAL_PIPES = { Great: 32, Swell: 24, Pedal: 20, Choir: 16 };
const PIPE_COLORS = { off: "#1e293b", on: "#f59e0b", fading: "#78350f" };

function drawFacade(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pipes: PipeState[],
  stops: StopState[],
) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#0f0f12";
  ctx.fillRect(0, 0, width, height);

  const divisions = Object.entries(MANUAL_PIPES);
  const divHeight = height / divisions.length;

  divisions.forEach(([name, count], divIdx) => {
    const y = divIdx * divHeight;

    ctx.fillStyle = "#52525b";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText(name, 12, y + 16);

    const pipeArea = width - 40;
    const spacing = pipeArea / count;
    const pipeWidth = Math.min(spacing * 0.7, 14);

    for (let i = 0; i < count; i++) {
      const globalIdx = divisions.slice(0, divIdx).reduce((s, d) => s + d[1], 0) + i;
      const pipe = pipes[globalIdx];
      const px = 24 + i * spacing + (spacing - pipeWidth) / 2;
      const ph = divHeight * 0.7;

      let color = PIPE_COLORS.off;
      if (pipe?.active) color = PIPE_COLORS.on;
      else if (pipe && pipe.decay > 0.01) color = PIPE_COLORS.fading;

      ctx.fillStyle = color;
      const animatedWidth = pipe?.active ? pipeWidth * 1.15 : pipeWidth;
      ctx.fillRect(px, y + divHeight - ph, animatedWidth, ph);

      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, y + divHeight - ph, animatedWidth, ph);

      const mouthY = y + divHeight - ph;
      ctx.beginPath();
      ctx.arc(px + animatedWidth / 2, mouthY, animatedWidth / 2, Math.PI, 0);
      ctx.stroke();
    }
  });

  const railY = height - 48;
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, railY, width, 48);

  stops.slice(0, 16).forEach((stop, i) => {
    const sx = 8 + (i * (width - 16)) / 16;
    ctx.fillStyle = stop.active ? "#f59e0b" : "#3f3f46";
    ctx.fillRect(sx, railY + 6, (width - 16) / 16 - 4, 6);
    ctx.fillStyle = stop.active ? "#fbbf24" : "#52525b";
    ctx.font = "7px Inter, sans-serif";
    ctx.fillText(stop.name.substring(0, 8), sx, railY + 24);
  });
}

export default function OrganVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipesRef = useRef<PipeState[]>([]);
  const stopsRef = useRef<StopState[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const animRef = useRef<number>(0);

  const totalPipes = Object.values(MANUAL_PIPES).reduce((a, b) => a + b, 0);
  if (pipesRef.current.length === 0) {
    pipesRef.current = Array.from({ length: totalPipes }, (_, i) => ({
      index: i,
      active: false,
      velocity: 0,
      decay: 0,
    }));
  }

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket("ws://127.0.0.1:11010/ws");
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "note") {
              const pipe = pipesRef.current[msg.note % totalPipes];
              if (pipe) {
                pipe.active = true;
                pipe.velocity = (msg.velocity || 64) / 127;
                pipe.decay = 1;
              }
              for (let d = -2; d <= 2; d++) {
                const nearby = pipesRef.current[(msg.note + d) % totalPipes];
                if (nearby && !nearby.active) {
                  nearby.active = true;
                  nearby.decay = 0.3 + Math.random() * 0.3;
                }
              }
            } else if (msg.type === "note_off") {
              const pipe = pipesRef.current[msg.note % totalPipes];
              if (pipe) pipe.active = false;
            } else if (msg.type === "stop") {
              const existing = stopsRef.current.find((s) => s.cc === msg.cc);
              if (existing) existing.active = msg.state;
              else stopsRef.current.push({ cc: msg.cc, name: `Stop ${msg.cc}`, active: msg.state });
            } else if (msg.type === "panic") {
              pipesRef.current.forEach((p) => {
                p.active = false;
                p.decay = 0;
              });
            }
          } catch {}
        };
        ws.onclose = () => {
          setTimeout(connect, 3000);
        };
        wsRef.current = ws;
      } catch {}
    };
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      pipesRef.current.forEach((p) => {
        if (!p.active && p.decay > 0) p.decay = Math.max(0, p.decay - 0.02);
      });
      drawFacade(ctx, canvas.width, canvas.height, pipesRef.current, stopsRef.current);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="w-full rounded-lg overflow-hidden border border-zinc-800">
      <canvas ref={canvasRef} width={800} height={400} className="w-full h-auto" />
      <div className="bg-zinc-950 px-3 py-1.5 text-[10px] text-zinc-600 flex gap-4">
        <span>Great · Swell · Pedal · Choir</span>
        <span className="text-zinc-700">|</span>
        <span>Live from WebSocket /ws</span>
      </div>
    </div>
  );
}
