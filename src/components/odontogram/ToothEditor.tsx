import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CLASSES,
  MATERIAL_LABELS,
  PENDING_COLOR,
  TREATMENT_LABELS,
  type Classe,
  type Material,
  type ToothTreatment,
  type TreatmentType,
} from "@/convex/shared";
import { TOOTH_LOOKUP, toothCanalLabels } from "./odontogram-config";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";

interface ToothEditorProps {
  patientId: string;
  tooth: number;
  treatments: ToothTreatment[];
  canEdit: boolean;
  canApprove: boolean;
  currentUserId?: string;
}

const RESTAURACAO_MATERIALS: Material[] = ["resina", "amalgama", "outro"];
const PROSTHETIC_MATERIALS: Material[] = [
  "resina",
  "ceramica",
  "metal",
  "zirconia",
  "resina_hibrida",
  "outro",
];

export function ToothEditor({
  patientId,
  tooth,
  treatments,
  canEdit,
  canApprove,
  currentUserId,
}: ToothEditorProps) {
  const def = TOOTH_LOOKUP[tooth];
  const canalLabels = def ? toothCanalLabels(def.variant) : [];

  const [type, setType] = useState<TreatmentType | "">("");
  const [material, setMaterial] = useState<Material | "">("");
  const [materialOther, setMaterialOther] = useState("");
  const [classe, setClasse] = useState<Classe | "">("");
  const [component, setComponent] = useState("");
  const [condutos, setCondutos] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTooth = useMutation(api.prontuarios.saveTooth);
  const approveTreatment = useMutation(api.prontuarios.approveTreatment);
  const rejectTreatment = useMutation(api.prontuarios.rejectTreatment);
  const removeTreatment = useMutation(api.prontuarios.removeTreatment);

  const specChips = (t: ToothTreatment) => {
    const chips: string[] = [];
    if (t.material) chips.push(MATERIAL_LABELS[t.material]);
    if (t.materialOther) chips.push(t.materialOther);
    if (t.classe) chips.push(`Classe ${t.classe}`);
    if (t.componentProtesico) chips.push(t.componentProtesico);
    if (t.condutos?.length) chips.push(`${t.condutos.length} conduto(s) obturado(s)`);
    return chips;
  };

  const resetForm = () => {
    setType("");
    setMaterial("");
    setMaterialOther("");
    setClasse("");
    setComponent("");
    setCondutos([]);
    setNote("");
    setError(null);
  };

  const handleSave = async () => {
    if (!type) return;
    setError(null);
    try {
      if (type !== "ausente" && type !== "endodontia" && !material) {
        setError("Selecione o material.");
        return;
      }
      if (type === "endodontia" && condutos.length === 0) {
        setError("Marque ao menos um conduto obturado.");
        return;
      }
      setSaving(true);
      await saveTooth({
        patientId: patientId as never,
        tooth,
        treatment: {
          type,
          material: (material || undefined) as never,
          materialOther: materialOther || undefined,
          classe: (classe || undefined) as never,
          componentProtesico: component || undefined,
          condutos: type === "endodontia" ? condutos : undefined,
          note: note || undefined,
        },
      });
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const needsMaterial =
    type !== "" && type !== "ausente" && type !== "endodontia";
  const materialOptions =
    type === "restauracao" ? RESTAURACAO_MATERIALS : PROSTHETIC_MATERIALS;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/70 bg-card p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h4 className="text-sm font-semibold">Dente {tooth}</h4>
          <p className="text-xs text-muted-foreground">{def?.name}</p>
        </div>
        {treatments.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {treatments.length} {treatments.length === 1 ? "registro" : "registros"}
          </Badge>
        )}
      </div>

      {/* lista de tratamentos */}
      {treatments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum tratamento registrado neste dente.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {treatments.map((t) => {
            const pending = t.status === "pending";
            const isMine = currentUserId && t.createdBy === currentUserId;
            return (
              <li
                key={t.id}
                className="rounded-md border border-border/60 bg-muted/40 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium">
                        {TREATMENT_LABELS[t.type]}
                      </span>
                      {specChips(t).map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {c}
                        </Badge>
                      ))}
                    </div>
                    {t.note && (
                      <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {t.createdByName} ·{" "}
                      {new Date(t.updatedAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {pending ? (
                      <Badge
                        className="text-[10px]"
                        style={{
                          color: PENDING_COLOR,
                          borderColor: PENDING_COLOR,
                          background: "transparent",
                        }}
                        variant="outline"
                      >
                        Pendente
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Aprovado
                      </Badge>
                    )}
                    {pending && canApprove && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-emerald-600"
                          title="Aprovar"
                          onClick={() =>
                            approveTreatment({ patientId: patientId as never, tooth, treatmentId: t.id })
                          }
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-destructive"
                          title="Recusar"
                          onClick={() =>
                            rejectTreatment({ patientId: patientId as never, tooth, treatmentId: t.id })
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    )}
                    {(canApprove || (canEdit && pending && isMine)) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground"
                        title="Remover"
                        onClick={() =>
                          removeTreatment({ patientId: patientId as never, tooth, treatmentId: t.id })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Novo tratamento
            </p>

            <div className="grid gap-2">
              <Label className="text-xs">Tipo de tratamento</Label>
              <Select value={type} onValueChange={(v) => setType(v as TreatmentType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restauracao">Restauração (material + classe)</SelectItem>
                  <SelectItem value="coroa">Coroa</SelectItem>
                  <SelectItem value="onlay">Onlay</SelectItem>
                  <SelectItem value="inlay">Inlay</SelectItem>
                  <SelectItem value="implante">Implante</SelectItem>
                  <SelectItem value="endodontia">Endodontia (conduto obturado)</SelectItem>
                  <SelectItem value="ausente">Dente ausente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "ausente" && (
              <p className="text-xs text-muted-foreground">
                Ao registrar dente ausente, os demais tratamentos deste dente serão
                substituídos.
              </p>
            )}

            {needsMaterial && (
              <div className="grid gap-2">
                <Label className="text-xs">Material</Label>
                <Select
                  value={material}
                  onValueChange={(v) => setMaterial(v as Material)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar material…" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOptions.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MATERIAL_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {material === "outro" && (
                  <Input
                    className="h-8 text-xs"
                    placeholder="Especificar material…"
                    value={materialOther}
                    onChange={(e) => setMaterialOther(e.target.value)}
                  />
                )}
              </div>
            )}

            {type === "restauracao" && (
              <div className="grid gap-2">
                <Label className="text-xs">
                  Classe (I, II, III, IV, V) — quando aplicável
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {CLASSES.map((c) => (
                    <Button
                      key={c}
                      type="button"
                      size="sm"
                      variant={classe === c ? "default" : "outline"}
                      className="h-7 w-9 px-0 text-xs"
                      onClick={() => setClasse(classe === c ? "" : c)}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {type === "implante" && (
              <div className="grid gap-2">
                <Label className="text-xs">Componente protético utilizado</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Ex.: Cone morse, hexágono externo…"
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                />
              </div>
            )}

            {type === "endodontia" && (
              <div className="grid gap-2">
                <Label className="text-xs">
                  Conduto(s) obturado(s) — pode haver mais de um
                </Label>
                {canalLabels.map((label, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-xs hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={condutos.includes(i)}
                      onCheckedChange={(checked) =>
                        setCondutos((prev) =>
                          checked ? [...prev, i] : prev.filter((c) => c !== i),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}

            <div className="grid gap-2">
              <Label className="text-xs">Observação (opcional)</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Ex.: restauração antiga removida…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
              type="button"
              size="sm"
              className="self-start"
              disabled={!type || saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 size-3.5" />
              )}
              Registrar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
