import { cn } from "@/lib/utils";
import {
  MANDIBULAR_TEETH,
  MAXILLARY_TEETH,
  TOOTH_LOOKUP,
} from "@/components/odontogram/odontogram-config";
import type {
  PeriodontalSite,
  PeriodontalTooth,
  PlaqueTooth,
} from "@/convex/shared";

export const SITE_LABELS: Record<keyof PeriodontalSite, string> = {
  mv: "Mesio-vestibular",
  v: "Vestibular",
  dv: "Disto-vestibular",
  ml: "Mesio-lingual",
  l: "Lingual",
  dl: "Disto-lingual",
};

const SITE_KEYS: (keyof PeriodontalSite)[] = ["mv", "v", "dv", "ml", "l", "dl"];

/** Cor de fundo conforme a profundidade de sondagem (mm). */
function pocketColor(value: number): string {
  if (value >= 7) return "bg-red-500/80 text-white";
  if (value >= 5) return "bg-red-300 text-red-950";
  if (value >= 4) return "bg-amber-300 text-amber-950";
  if (value > 0) return "bg-muted text-foreground";
  return "bg-transparent text-muted-foreground/50";
}

function ToothCellFrame({
  tooth,
  children,
  selected,
  onClick,
  editable,
}: {
  tooth: number;
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  editable?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      title={
        onClick
          ? `Dente ${tooth} — ${TOOTH_LOOKUP[tooth]?.name ?? ""}`
          : undefined
      }
      className={cn(
        "flex w-[74px] shrink-0 flex-col items-center rounded-md border px-1 pb-1 pt-0.5",
        editable && onClick && "cursor-pointer",
        selected
          ? "border-foreground bg-muted/60"
          : "border-border/60 bg-card",
      )}
    >
      <span className="text-[8px] font-semibold text-muted-foreground/70">
        {tooth}
      </span>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Periograma
// ────────────────────────────────────────────────────────────────────────────

/** Grade de dentes com os 6 sítios de sondagem. */
export function PeriodontalGrid({
  teeth,
  selectedTooth,
  onSelectTooth,
  editable,
}: {
  teeth: PeriodontalTooth[];
  selectedTooth?: number | null;
  onSelectTooth?: (tooth: number) => void;
  editable?: boolean;
}) {
  const get = (n: number) => teeth.find((t) => t.tooth === n);

  const renderTooth = (tooth: number) => {
    const t = get(tooth);
    return (
      <ToothCellFrame
        tooth={tooth}
        selected={selectedTooth === tooth}
        editable={editable}
        onClick={editable && onSelectTooth ? () => onSelectTooth(tooth) : undefined}
      >
        {t ? (
          <PerioPockets tooth={t} />
        ) : (
          <div className="grid h-[52px] w-full place-items-center">
            <span className="text-[9px] text-muted-foreground/30">—</span>
          </div>
        )}
      </ToothCellFrame>
    );
  };

  return (
    <div className="w-full">
      <ArchHeader label="Arcada superior" />
      <div className="flex justify-center gap-[3px] overflow-x-auto pb-2">
        {MAXILLARY_TEETH.map((def, i) => (
          <div key={def.tooth} className="flex items-start">
            {i === 7 && <div className="w-6" />}
            {renderTooth(def.tooth)}
          </div>
        ))}
      </div>
      <ArchDivider />
      <ArchHeader label="Arcada inferior" />
      <div className="flex justify-center gap-[3px] overflow-x-auto pb-1">
        {MANDIBULAR_TEETH.map((def, i) => (
          <div key={def.tooth} className="flex items-start">
            {i === 7 && <div className="w-6" />}
            {renderTooth(def.tooth)}
          </div>
        ))}
      </div>
      <PerioLegend />
    </div>
  );
}

function ArchHeader({ label }: { label: string }) {
  return (
    <div className="mb-1 flex items-center justify-between px-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground/60">
        Direito · Esquerdo
      </span>
    </div>
  );
}

function ArchDivider() {
  return (
    <div className="my-2 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
        Linha média
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function PerioPockets({ tooth }: { tooth: PeriodontalTooth }) {
  const top = ["mv", "v", "dv"] as const;
  const bottom = ["ml", "l", "dl"] as const;
  return (
    <div className="flex w-full flex-col gap-[2px]">
      <div className="flex gap-[2px]">
        {top.map((k) => (
          <div
            key={k}
            title={SITE_LABELS[k]}
            className={cn(
              "grid h-[15px] w-full place-items-center rounded-[2px] text-[9px] font-medium tabular-nums",
              pocketColor(tooth.pockets[k]),
            )}
          >
            {tooth.pockets[k] || ""}
          </div>
        ))}
      </div>
      <div className="flex gap-[2px]">
        {bottom.map((k) => (
          <div
            key={k}
            title={SITE_LABELS[k]}
            className={cn(
              "grid h-[15px] w-full place-items-center rounded-[2px] text-[9px] font-medium tabular-nums",
              pocketColor(tooth.pockets[k]),
            )}
          >
            {tooth.pockets[k] || ""}
          </div>
        ))}
      </div>
      <div className="mt-[2px] flex items-center justify-between px-[1px] text-[8px] text-muted-foreground">
        <span>M{tooth.mobility}</span>
        <span>F{tooth.furcation}</span>
        {tooth.bleeding ? (
          <span className="font-semibold text-red-600" title="Sangramento à sondagem">
            ●S
          </span>
        ) : (
          <span className="text-muted-foreground/40">●</span>
        )}
      </div>
    </div>
  );
}

function PerioLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
      <span className="font-medium uppercase tracking-widest text-foreground/70">
        Profundidade
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-3 rounded-[2px] bg-muted" /> 1–3 mm
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-3 rounded-[2px] bg-amber-300" /> 4 mm
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-3 rounded-[2px] bg-red-300" /> 5–6 mm
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-3 rounded-[2px] bg-red-500" /> ≥ 7 mm
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-2 rounded-full bg-red-600" /> Sangramento
      </span>
      <span>M = mobilidade · F = furca</span>
    </div>
  );
}

/** Painel de edição de um dente do periograma. */
export function PeriodontalToothEditor({
  tooth,
  value,
  onChange,
}: {
  tooth: number;
  value: PeriodontalTooth | undefined;
  onChange: (t: PeriodontalTooth) => void;
}) {
  const current =
    value ?? {
      tooth,
      pockets: { mv: 0, v: 0, dv: 0, ml: 0, l: 0, dl: 0 },
      recession: { mv: 0, v: 0, dv: 0, ml: 0, l: 0, dl: 0 },
      mobility: 0,
      furcation: 0,
      bleeding: false,
    };

  const setPocket = (k: keyof PeriodontalSite, val: string) => {
    const n = Math.max(0, Math.min(15, Number(val) || 0));
    onChange({ ...current, pockets: { ...current.pockets, [k]: n } });
  };
  const setRecession = (k: keyof PeriodontalSite, val: string) => {
    const n = Math.max(0, Math.min(15, Number(val) || 0));
    onChange({ ...current, recession: { ...current.recession, [k]: n } });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium">
        Dente {tooth}
        <span className="ml-2 font-normal text-muted-foreground">
          {TOOTH_LOOKUP[tooth]?.name}
        </span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {SITE_KEYS.map((k) => (
          <div key={k} className="grid gap-1">
            <span className="text-[9px] text-muted-foreground">
              {SITE_LABELS[k]}
            </span>
            <input
              type="number"
              min={0}
              max={15}
              value={current.pockets[k]}
              onChange={(e) => setPocket(k, e.target.value)}
              className="h-8 rounded-md border border-border bg-background text-center text-sm tabular-nums focus:border-foreground focus:outline-none"
            />
          </div>
        ))}
      </div>
      <div className="grid gap-1">
        <span className="text-[9px] text-muted-foreground">
          Recessão gengival (mm) — vestibular / lingual
        </span>
        <div className="grid grid-cols-6 gap-1.5">
          {SITE_KEYS.map((k) => (
            <input
              key={k}
              type="number"
              min={0}
              max={15}
              value={current.recession[k]}
              onChange={(e) => setRecession(k, e.target.value)}
              title={SITE_LABELS[k]}
              className="h-7 rounded-md border border-border bg-background text-center text-xs tabular-nums focus:border-foreground focus:outline-none"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <span className="text-[9px] text-muted-foreground">Mobilidade</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChange({ ...current, mobility: m })}
                className={cn(
                  "h-7 flex-1 rounded-md border text-xs transition-colors",
                  current.mobility === m
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1">
          <span className="text-[9px] text-muted-foreground">Grau de furca</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onChange({ ...current, furcation: f })}
                className={cn(
                  "h-7 flex-1 rounded-md border text-xs transition-colors",
                  current.furcation === f
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={current.bleeding}
          onChange={(e) => onChange({ ...current, bleeding: e.target.checked })}
          className="size-3.5 accent-red-600"
        />
        Sangramento à sondagem
      </label>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Índice de placa (O'Leary)
// ────────────────────────────────────────────────────────────────────────────

const PLAQUE_KEYS = ["mesial", "distal", "vestibular", "lingual"] as const;
export const PLAQUE_LABELS: Record<(typeof PLAQUE_KEYS)[number], string> = {
  mesial: "M",
  distal: "D",
  vestibular: "V",
  lingual: "L",
};

/** Grade de dentes com as 4 superfícies (O'Leary). */
export function PlaqueGrid({
  teeth,
  selectedTooth,
  onSelectTooth,
  editable,
}: {
  teeth: PlaqueTooth[];
  selectedTooth?: number | null;
  onSelectTooth?: (tooth: number) => void;
  editable?: boolean;
}) {
  const get = (n: number) => teeth.find((t) => t.tooth === n);

  const renderTooth = (tooth: number) => {
    const t = get(tooth);
    const plaque = t
      ? PLAQUE_KEYS.filter((k) => t[k]).length
      : 0;
    return (
      <ToothCellFrame
        tooth={tooth}
        selected={selectedTooth === tooth}
        editable={editable}
        onClick={editable && onSelectTooth ? () => onSelectTooth(tooth) : undefined}
      >
        <div className="grid w-full grid-cols-3 grid-rows-2 gap-[2px]">
          <div className="grid h-3.5 w-full place-items-center rounded-[2px] bg-muted text-[8px]">
            {t?.mesial ? "M" : ""}
          </div>
          <div className="grid h-3.5 w-full place-items-center rounded-[2px] text-[8px]">
            {tooth}
          </div>
          <div className="grid h-3.5 w-full place-items-center rounded-[2px] bg-muted text-[8px]">
            {t?.distal ? "D" : ""}
          </div>
          <div className="grid h-3.5 w-full place-items-center rounded-[2px] bg-muted text-[8px]">
            {t?.lingual ? "L" : ""}
          </div>
          <div className="grid h-3.5 w-full place-items-center rounded-[2px] text-[8px]">
            {plaque > 0 ? `${plaque}/4` : ""}
          </div>
          <div className="grid h-3.5 w-full place-items-center rounded-[2px] bg-muted text-[8px]">
            {t?.vestibular ? "V" : ""}
          </div>
        </div>
      </ToothCellFrame>
    );
  };

  return (
    <div className="w-full">
      <ArchHeader label="Arcada superior" />
      <div className="flex justify-center gap-[3px] overflow-x-auto pb-2">
        {MAXILLARY_TEETH.map((def, i) => (
          <div key={def.tooth} className="flex items-start">
            {i === 7 && <div className="w-6" />}
            {renderTooth(def.tooth)}
          </div>
        ))}
      </div>
      <ArchDivider />
      <ArchHeader label="Arcada inferior" />
      <div className="flex justify-center gap-[3px] overflow-x-auto pb-1">
        {MANDIBULAR_TEETH.map((def, i) => (
          <div key={def.tooth} className="flex items-start">
            {i === 7 && <div className="w-6" />}
            {renderTooth(def.tooth)}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
        <span className="font-medium uppercase tracking-widest text-foreground/70">
          Superfícies
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-[2px] bg-muted" /> M · D ·
          V · L com placa
        </span>
        <span className="flex items-center gap-1">
          Índice O'Leary = superfícies com placa ÷ superfícies examinadas
        </span>
      </div>
    </div>
  );
}

/** Painel de edição de um dente do índice de placa. */
export function PlaqueToothEditor({
  tooth,
  value,
  onChange,
}: {
  tooth: number;
  value: PlaqueTooth | undefined;
  onChange: (t: PlaqueTooth) => void;
}) {
  const current =
    value ?? { tooth, mesial: false, distal: false, vestibular: false, lingual: false };

  const toggle = (k: (typeof PLAQUE_KEYS)[number]) =>
    onChange({ ...current, [k]: !current[k] });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium">
        Dente {tooth}
        <span className="ml-2 font-normal text-muted-foreground">
          {TOOTH_LOOKUP[tooth]?.name}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PLAQUE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            className={cn(
              "flex h-9 items-center justify-between rounded-md border px-3 text-xs transition-colors",
              current[k]
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/40",
            )}
          >
            <span className="font-semibold">{PLAQUE_LABELS[k]}</span>
            <span>{current[k] ? "Com placa" : "Sem placa"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
