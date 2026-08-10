import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PENDING_COLOR,
  oLearyIndex,
  type PeriodontalExam,
  type PeriodontalTooth,
  type PlaqueExam,
  type PlaqueTooth,
} from "@/convex/shared";
import {
  Check,
  Eye,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  PeriodontalGrid,
  PeriodontalToothEditor,
  PlaqueGrid,
  PlaqueToothEditor,
} from "./PeriodontalCharts";

const today = () => new Date().toISOString().slice(0, 10);

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge
        variant="outline"
        className="text-[10px]"
        style={{ color: PENDING_COLOR, borderColor: PENDING_COLOR }}
      >
        Pendente
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      Aprovado
    </Badge>
  );
}

function ExamActions({
  status,
  canApprove,
  canEdit,
  isMine,
  onApprove,
  onReject,
  onRemove,
  onToggleView,
  viewing,
}: {
  status: string;
  canApprove: boolean;
  canEdit: boolean;
  isMine: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRemove: () => void;
  onToggleView: () => void;
  viewing: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onToggleView}
      >
        {viewing ? <X className="size-3.5" /> : <Eye className="size-3.5" />}
        <span className="ml-1 hidden sm:inline">{viewing ? "Fechar" : "Ver"}</span>
      </Button>
      {status === "pending" && canApprove && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-700"
            title="Autorizar"
            onClick={onApprove}
          >
            <Check className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            title="Recusar"
            onClick={onReject}
          >
            <X className="size-3.5" />
          </Button>
        </>
      )}
      {(canApprove || (canEdit && status === "pending" && isMine)) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          title="Remover"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Periograma
// ────────────────────────────────────────────────────────────────────────────

export function PeriogramaTab({
  patientId,
  exams,
  canEdit,
  canApprove,
  currentUserId,
}: {
  patientId: never;
  exams: PeriodontalExam[];
  canEdit: boolean;
  canApprove: boolean;
  currentUserId?: string;
}) {
  const save = useMutation(api.prontuarios.savePeriodontal);
  const approve = useMutation(api.prontuarios.approvePeriodontal);
  const reject = useMutation(api.prontuarios.rejectPeriodontal);
  const remove = useMutation(api.prontuarios.removePeriodontal);

  const [creating, setCreating] = useState(false);
  const [date, setDate] = useState(today());
  const [draft, setDraft] = useState<PeriodontalTooth[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pendingCount = exams.filter((e) => e.status === "pending").length;
  const sorted = [...exams].sort((a, b) => b.updatedAt - a.updatedAt);

  const updateDraft = (t: PeriodontalTooth) => {
    setDraft((prev) => {
      const idx = prev.findIndex((x) => x.tooth === t.tooth);
      if (idx >= 0) {
        return [...prev.slice(0, idx), t, ...prev.slice(idx + 1)];
      }
      return [...prev, t];
    });
  };

  const startNew = () => {
    setDraft([]);
    setSelected(null);
    setDate(today());
    setCreating(true);
    setViewing(null);
  };

  const handleSave = async () => {
    if (draft.length === 0) {
      toast.error("Registre ao menos um dente sondado.");
      return;
    }
    setBusy(true);
    try {
      await save({ patientId, date, teeth: draft });
      toast.success(
        canApprove
          ? "Periograma registrado."
          : "Periograma enviado — aguardando autorização do professor.",
      );
      setCreating(false);
      setDraft([]);
      setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Periograma</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Profundidade de sondagem em 6 sítios por dente, recessão,
            mobilidade, furca e sangramento.
          </p>
        </div>
        {canEdit && !creating && (
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-1.5 size-3.5" />
            Novo periograma
          </Button>
        )}
      </div>

      {creating && (
        <div className="rounded-lg border border-border/70 bg-card p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Data da sondagem</Label>
                <Input
                  type="date"
                  className="h-8 w-40 text-xs"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <p className="pb-1 text-[11px] text-muted-foreground">
                Clique nos dentes para preencher os 6 sítios.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreating(false)}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={busy}>
                {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                {canApprove ? "Registrar" : "Enviar para avaliação"}
              </Button>
            </div>
          </div>
          <PeriodontalGrid
            teeth={draft}
            selectedTooth={selected}
            onSelectTooth={setSelected}
            editable
          />
          {selected !== null && (
            <div className="mt-4 rounded-md border border-border/70 bg-muted/30 p-4">
              <PeriodontalToothEditor
                tooth={selected}
                value={draft.find((t) => t.tooth === selected)}
                onChange={updateDraft}
              />
            </div>
          )}
        </div>
      )}

      {pendingCount > 0 && !creating && (
        <p
          className="rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: PENDING_COLOR, color: PENDING_COLOR }}
        >
          {pendingCount} periograma(s) aguardando autorização do professor.
        </p>
      )}

      {sorted.length === 0 && !creating ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum periograma registrado ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((exam) => {
            const isMine = currentUserId && exam.createdBy === currentUserId;
            const isViewing = viewing === exam.id;
            return (
              <li key={exam.id} className="rounded-lg border border-border/70 bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">
                      {exam.date
                        ? new Date(exam.date + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                    <StatusBadge status={exam.status} />
                    <span className="text-[11px] text-muted-foreground">
                      {exam.teeth.length} dentes · {exam.createdByName}
                    </span>
                  </div>
                  <ExamActions
                    status={exam.status}
                    canApprove={canApprove}
                    canEdit={canEdit}
                    isMine={!!isMine}
                    onApprove={() => approve({ patientId, examId: exam.id })}
                    onReject={() => reject({ patientId, examId: exam.id })}
                    onRemove={() => remove({ patientId, examId: exam.id })}
                    onToggleView={() => setViewing(isViewing ? null : exam.id)}
                    viewing={isViewing}
                  />
                </div>
                {isViewing && (
                  <div className="mt-4 border-t border-border/60 pt-4">
                    <PeriodontalGrid teeth={exam.teeth} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Índice de placa (O'Leary)
// ────────────────────────────────────────────────────────────────────────────

export function PlaqueTab({
  patientId,
  exams,
  canEdit,
  canApprove,
  currentUserId,
}: {
  patientId: never;
  exams: PlaqueExam[];
  canEdit: boolean;
  canApprove: boolean;
  currentUserId?: string;
}) {
  const save = useMutation(api.prontuarios.savePlaque);
  const approve = useMutation(api.prontuarios.approvePlaque);
  const reject = useMutation(api.prontuarios.rejectPlaque);
  const remove = useMutation(api.prontuarios.removePlaque);

  const [creating, setCreating] = useState(false);
  const [date, setDate] = useState(today());
  const [draft, setDraft] = useState<PlaqueTooth[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pendingCount = exams.filter((e) => e.status === "pending").length;
  const sorted = [...exams].sort((a, b) => b.updatedAt - a.updatedAt);

  const updateDraft = (t: PlaqueTooth) => {
    setDraft((prev) => {
      const idx = prev.findIndex((x) => x.tooth === t.tooth);
      if (idx >= 0) {
        return [...prev.slice(0, idx), t, ...prev.slice(idx + 1)];
      }
      return [...prev, t];
    });
  };

  const startNew = () => {
    setDraft([]);
    setSelected(null);
    setDate(today());
    setCreating(true);
    setViewing(null);
  };

  const handleSave = async () => {
    if (draft.length === 0) {
      toast.error("Marque ao menos um dente com superfícies.");
      return;
    }
    setBusy(true);
    try {
      await save({ patientId, date, teeth: draft });
      toast.success(
        canApprove
          ? "Índice de placa registrado."
          : "Índice de placa enviado — aguardando autorização do professor.",
      );
      setCreating(false);
      setDraft([]);
      setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  const draftIndex = oLearyIndex(draft);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Índice de placa</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            O'Leary — marcação das 4 superfícies com placa por dente.
          </p>
        </div>
        {canEdit && !creating && (
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-1.5 size-3.5" />
            Novo exame
          </Button>
        )}
      </div>

      {creating && (
        <div className="rounded-lg border border-border/70 bg-card p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Data do exame</Label>
                <Input
                  type="date"
                  className="h-8 w-40 text-xs"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="pb-1">
                <p className="text-[11px] text-muted-foreground">
                  Clique nos dentes para marcar as superfícies.
                </p>
                <p className="mt-0.5 text-xs font-medium">
                  Índice:{" "}
                  <span className="tabular-nums">{draftIndex.percent}%</span>
                  <span className="ml-1 text-muted-foreground">
                    ({draftIndex.withPlaque}/{draftIndex.total} superfícies)
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreating(false)}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={busy}>
                {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                {canApprove ? "Registrar" : "Enviar para avaliação"}
              </Button>
            </div>
          </div>
          <PlaqueGrid
            teeth={draft}
            selectedTooth={selected}
            onSelectTooth={setSelected}
            editable
          />
          {selected !== null && (
            <div className="mt-4 rounded-md border border-border/70 bg-muted/30 p-4">
              <PlaqueToothEditor
                tooth={selected}
                value={draft.find((t) => t.tooth === selected)}
                onChange={updateDraft}
              />
            </div>
          )}
        </div>
      )}

      {pendingCount > 0 && !creating && (
        <p
          className="rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: PENDING_COLOR, color: PENDING_COLOR }}
        >
          {pendingCount} exame(s) de placa aguardando autorização do professor.
        </p>
      )}

      {sorted.length === 0 && !creating ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum índice de placa registrado ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((exam) => {
            const isMine = currentUserId && exam.createdBy === currentUserId;
            const isViewing = viewing === exam.id;
            const idx = oLearyIndex(exam.teeth);
            return (
              <li key={exam.id} className="rounded-lg border border-border/70 bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">
                      {exam.date
                        ? new Date(exam.date + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                    <StatusBadge status={exam.status} />
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        idx.percent >= 50
                          ? "font-semibold text-red-600"
                          : "text-muted-foreground",
                      )}
                    >
                      {idx.percent}% O'Leary
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {exam.teeth.length} dentes · {exam.createdByName}
                    </span>
                  </div>
                  <ExamActions
                    status={exam.status}
                    canApprove={canApprove}
                    canEdit={canEdit}
                    isMine={!!isMine}
                    onApprove={() => approve({ patientId, examId: exam.id })}
                    onReject={() => reject({ patientId, examId: exam.id })}
                    onRemove={() => remove({ patientId, examId: exam.id })}
                    onToggleView={() => setViewing(isViewing ? null : exam.id)}
                    viewing={isViewing}
                  />
                </div>
                {isViewing && (
                  <div className="mt-4 border-t border-border/60 pt-4">
                    <PlaqueGrid teeth={exam.teeth} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
