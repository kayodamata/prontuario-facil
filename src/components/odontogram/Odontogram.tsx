import { cn } from "@/lib/utils";
import {
  CANAL_COLOR,
  MATERIAL_COLORS,
  MATERIAL_LABELS,
  MISSING_COLOR,
  PENDING_COLOR,
  type Material,
  type ToothRecord,
} from "@/convex/shared";
import { MANDIBULAR_TEETH, MAXILLARY_TEETH } from "./odontogram-config";
import { ToothSVG } from "./ToothSVG";

interface OdontogramProps {
  teeth: ToothRecord[];
  selectedTooth?: number | null;
  onSelectTooth?: (tooth: number) => void;
  interactive?: boolean;
  className?: string;
}

function ArchRow({
  teeth,
  records,
  selectedTooth,
  onSelectTooth,
  interactive,
}: {
  teeth: (typeof MAXILLARY_TEETH)[number][];
  records: ToothRecord[];
  selectedTooth?: number | null;
  onSelectTooth?: (tooth: number) => void;
  interactive?: boolean;
}) {
  const teethEls = teeth.map((def, i) => {
    const record = records.find((r) => r.tooth === def.tooth);
    const isMidlineGap = i === 7; // entre 11|21 (superior) / 41|31 (inferior)
    return (
      <div key={def.tooth} className="flex items-start">
        {isMidlineGap && <div className="w-6" />}
        <div className="flex flex-col items-center">
          <ToothSVG
            def={def}
            treatments={record?.treatments ?? []}
            selected={selectedTooth === def.tooth}
            onClick={interactive && onSelectTooth ? () => onSelectTooth(def.tooth) : undefined}
            width={44}
          />
        </div>
      </div>
    );
  });
  return (
    <div className="flex justify-center overflow-x-auto pb-1">
      <div className="flex gap-[3px]">{teethEls}</div>
    </div>
  );
}

function Legend() {
  const materials = (
    ["resina", "amalgama", "ceramica", "metal", "zirconia", "resina_hibrida"] as Material[]
  );
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
      <span className="font-medium uppercase tracking-widest text-foreground/70">
        Legenda
      </span>
      {materials.map((m) => (
        <span key={m} className="flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-[3px] border border-black/10"
            style={{ background: MATERIAL_COLORS[m] }}
          />
          {MATERIAL_LABELS[m]}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-[2px] rounded bg-[--canal]"
          style={{ background: CANAL_COLOR }}
        />
        Conduto obturado
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center rounded-[3px] text-[8px] font-bold"
          style={{ color: MISSING_COLOR, border: `1.5px solid ${MISSING_COLOR}`, padding: "0 2px" }}
        >
          ✕
        </span>
        Ausente
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-4 rounded-[3px]"
          style={{ border: `1.5px dashed ${PENDING_COLOR}` }}
        />
        Aguardando professor
      </span>
    </div>
  );
}

export function Odontogram({
  teeth,
  selectedTooth,
  onSelectTooth,
  interactive = false,
  className,
}: OdontogramProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Arcada superior
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          (visão do paciente)
        </span>
      </div>
      <ArchRow
        teeth={MAXILLARY_TEETH}
        records={teeth}
        selectedTooth={selectedTooth}
        onSelectTooth={onSelectTooth}
        interactive={interactive}
      />
      <div className="my-2 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
          Linha média
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <ArchRow
        teeth={MANDIBULAR_TEETH}
        records={teeth}
        selectedTooth={selectedTooth}
        onSelectTooth={onSelectTooth}
        interactive={interactive}
      />
      <div className="mb-1 mt-1 flex items-center justify-between px-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Arcada inferior
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          Direito · Esquerdo
        </span>
      </div>
      <Legend />
    </div>
  );
}
