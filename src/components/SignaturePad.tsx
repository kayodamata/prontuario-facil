import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  height?: number;
  className?: string;
}

export function SignaturePad({
  onChange,
  disabled = false,
  height = 140,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1c1917";
  }, [height]);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setHasInk(true);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative overflow-hidden rounded-md border border-border/70 bg-white">
        <canvas
          ref={canvasRef}
          style={{ height, width: "100%", touchAction: "none" }}
          className="block w-full"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50">
            Assine aqui
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
          onClick={clear}
          disabled={disabled || !hasInk}
        >
          <Eraser className="size-3" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
