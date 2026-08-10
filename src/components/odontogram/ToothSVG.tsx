import { cn } from "@/lib/utils";
import {
  CANAL_COLOR,
  MATERIAL_COLORS,
  MISSING_COLOR,
  PENDING_COLOR,
  type Material,
  type ToothTreatment,
} from "@/convex/shared";
import { SHAPES, type ToothDef } from "./odontogram-config";

const materialColor = (t: ToothTreatment): string =>
  MATERIAL_COLORS[(t.material as Material) ?? "resina"];

interface ToothSVGProps {
  def: ToothDef;
  treatments: ToothTreatment[];
  selected?: boolean;
  onClick?: () => void;
  width?: number;
  className?: string;
}

/** SVG de um dente anatômico com os tratamentos sobrepostos. */
export function ToothSVG({
  def,
  treatments,
  selected = false,
  onClick,
  width = 44,
  className,
}: ToothSVGProps) {
  const shape = SHAPES[def.variant];
  const height = Math.round((width * 170) / 120);
  const flipped = def.tooth < 30; // arcada superior: raízes para cima
  const missing = treatments.some((t) => t.type === "ausente");
  const missingPending = treatments.some(
    (t) => t.type === "ausente" && t.status === "pending",
  );
  const hasPending = treatments.some((t) => t.status === "pending");

  const approved = treatments.filter((t) => t.status === "approved");
  const pending = treatments.filter((t) => t.status === "pending");

  return (
    <svg
      viewBox="0 0 120 170"
      width={width}
      height={height}
      onClick={onClick}
      className={cn("transition-transform duration-150", onClick && "cursor-pointer hover:scale-[1.04]", className)}
      role="img"
      aria-label={`Dente ${def.tooth} — ${def.name}`}
    >
      <title>{`Dente ${def.tooth} — ${def.name}`}</title>

      <g transform={flipped ? "rotate(180 60 85)" : undefined}>
        {/* silhueta base */}
        <path
          d={shape.outline}
          fill={missing ? "#fef2f2" : "#fafaf9"}
          stroke={missing ? MISSING_COLOR : "#d6d3d1"}
          strokeWidth={2}
        />

        {/* tratamentos aprovados (sólidos) */}
        {approved.map((t) => renderTreatment(t, false))}
        {/* tratamentos pendentes (destaque tracejado âmbar) */}
        {pending.map((t) => renderTreatment(t, true))}

        {/* sulcos oclusais sutis */}
        {!missing &&
          shape.grooves.map((g, i) => (
            <path
              key={i}
              d={g}
              fill="none"
              stroke="#a8a29e"
              strokeWidth={1.4}
              opacity={0.6}
            />
          ))}
      </g>

      {/* X vermelho do dente ausente (sobre tudo) */}
      {missing && (
        <g transform={flipped ? "rotate(180 60 85)" : undefined}>
          <line
            x1={30}
            y1={16}
            x2={90}
            y2={154}
            stroke={MISSING_COLOR}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={missingPending ? "7 5" : undefined}
          />
          <line
            x1={90}
            y1={16}
            x2={30}
            y2={154}
            stroke={MISSING_COLOR}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={missingPending ? "7 5" : undefined}
          />
        </g>
      )}

      {/* anel de seleção */}
      {selected && (
        <rect
          x={2}
          y={2}
          width={116}
          height={166}
          rx={10}
          fill="none"
          stroke="#18181b"
          strokeWidth={2.5}
        />
      )}

      {/* indicador de edição pendente */}
      {hasPending && !missing && (
        <circle cx={101} cy={9} r={5} fill={PENDING_COLOR} />
      )}

      {/* número FDI */}
      <text
        x={60}
        y={168}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={hasPending ? PENDING_COLOR : "#a8a29e"}
      >
        {def.tooth}
      </text>
    </svg>
  );

  function renderTreatment(t: ToothTreatment, pendingFlag: boolean) {
    const color = materialColor(t);
    const dash = pendingFlag ? { strokeDasharray: "5 3" } : {};
    switch (t.type) {
      case "restauracao":
      case "coroa":
        return (
          <g key={t.id}>
            <path
              d={shape.crown}
              fill={color}
              opacity={pendingFlag ? 0.55 : 0.92}
            />
            <path
              d={shape.crown}
              fill="none"
              stroke={pendingFlag ? PENDING_COLOR : "rgba(0,0,0,0.35)"}
              strokeWidth={pendingFlag ? 2 : 1}
              {...dash}
            />
          </g>
        );
      case "onlay":
        return (
          <g key={t.id}>
            <path d={shape.crown} fill={color} opacity={0.92} />
            <rect
              x={shape.variant === "upperMolar" || shape.variant === "lowerMolar" ? 34 : 38}
              y={8}
              width={shape.variant === "upperMolar" || shape.variant === "lowerMolar" ? 52 : 44}
              height={shape.crownClipY - 14}
              rx={6}
              fill="none"
              stroke={pendingFlag ? PENDING_COLOR : "rgba(0,0,0,0.4)"}
              strokeWidth={pendingFlag ? 2 : 1.2}
              {...dash}
            />
          </g>
        );
      case "inlay":
        return (
          <g key={t.id}>
            <ellipse
              cx={60}
              cy={Math.min(30, shape.crownClipY / 2)}
              rx={16}
              ry={20}
              fill={color}
              opacity={pendingFlag ? 0.7 : 1}
            />
            <ellipse
              cx={60}
              cy={Math.min(30, shape.crownClipY / 2)}
              rx={16}
              ry={20}
              fill="none"
              stroke={pendingFlag ? PENDING_COLOR : "rgba(0,0,0,0.4)"}
              strokeWidth={pendingFlag ? 2 : 1.2}
              {...dash}
            />
          </g>
        );
      case "implante":
        return (
          <g key={t.id}>
            {/* coroa sobre o implante */}
            <path d={shape.crown} fill={color} opacity={0.95} />
            <path
              d={shape.crown}
              fill="none"
              stroke={pendingFlag ? PENDING_COLOR : "rgba(0,0,0,0.35)"}
              strokeWidth={pendingFlag ? 2 : 1}
              {...dash}
            />
            {/* parafuso com roscas na região radicular */}
            <path
              d="M 47 60 L 73 60 C 75 92, 76 122, 73 148 C 71 153, 49 153, 47 148 C 44 122, 45 92, 47 60 Z"
              fill="#a9b1b9"
              stroke="#7d8790"
              strokeWidth={1.2}
            />
            <path
              d="M 46.5 68 L 73.5 68 M 46 76 L 74 76 M 46 84 L 74 84 M 45.5 92 L 74.5 92 M 45.5 100 L 74.5 100 M 45.5 108 L 74.5 108 M 46 116 L 74 116 M 46.5 124 L 73.5 124 M 47 132 L 73 132 M 47.5 140 L 72.5 140"
              stroke="#6d7781"
              strokeWidth={1.6}
            />
            {/* hexágono do pilar */}
            <circle cx={60} cy={58} r={6} fill="#8b95a0" stroke="#6d7781" />
          </g>
        );
      case "endodontia": {
        const selected = t.condutos ?? [];
        const canals = selected
          .filter((i) => shape.canals[i])
          .map((i) => shape.canals[i]);
        return (
          <g key={t.id}>
            {canals.map((c, i) => (
              <path
                key={i}
                d={`M ${c.x} ${c.yTop} C ${c.x - 2.5} ${(c.yTop + c.yBottom) / 2}, ${c.x + 2.5} ${(c.yTop + c.yBottom) / 2}, ${c.x} ${c.yBottom}`}
                fill="none"
                stroke={CANAL_COLOR}
                strokeWidth={pendingFlag ? 2.6 : 3.2}
                strokeLinecap="round"
                opacity={pendingFlag ? 0.65 : 1}
                {...(pendingFlag ? { strokeDasharray: "6 4" } : {})}
              />
            ))}
            {/* câmara pulpar */}
            {canals.length > 0 && (
              <path
                d={`M ${canals[0].x - 6} ${canals[0].yTop} L ${canals[canals.length - 1].x + 6} ${canals[canals.length - 1].yTop}`}
                stroke={CANAL_COLOR}
                strokeWidth={2.4}
                strokeLinecap="round"
                opacity={0.9}
              />
            )}
          </g>
        );
      }
      default:
        return null;
    }
  }
}
