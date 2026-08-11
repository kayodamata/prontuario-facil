import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ATM_DOR_MUSCULAR,
  ATM_DOR_MUSCULAR_LABELS,
  ATM_RUIDOS,
  ATM_RUIDOS_LABELS,
  LINFONODO_STATUS,
  LINFONODO_STATUS_LABELS,
  PENDING_COLOR,
  emptyAtm,
  emptyLinfonodos,
  hasExtraoralData,
  type AtmAvaliacao,
  type ExtraoralExam,
  type LinfonodoAchado,
  type LinfonodoStatus,
} from "@/convex/shared";
import {
  Check,
  Eye,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

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
// Exame extraoral — Linfonodos + ATM (mesma aba)
// ────────────────────────────────────────────────────────────────────────────

export function ExtraoralTab({
  patientId,
  exams,
  canEdit,
  canApprove,
  currentUserId,
}: {
  patientId: never;
  exams: ExtraoralExam[];
  canEdit: boolean;
  canApprove: boolean;
  currentUserId?: string;
}) {
  const save = useMutation(api.prontuarios.saveExtraoral);
  const approve = useMutation(api.prontuarios.approveExtraoral);
  const reject = useMutation(api.prontuarios.rejectExtraoral);
  const remove = useMutation(api.prontuarios.removeExtraoral);

  const [creating, setCreating] = useState(false);
  const [date, setDate] = useState(today());
  const [linfonodos, setLinfonodos] = useState<LinfonodoAchado[]>([]);
  const [atm, setAtm] = useState<AtmAvaliacao>(emptyAtm());
  const [viewing, setViewing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pendingCount = exams.filter((e) => e.status === "pending").length;
  const sorted = [...exams].sort((a, b) => b.updatedAt - a.updatedAt);

  const startNew = () => {
    setLinfonodos(emptyLinfonodos());
    setAtm(emptyAtm());
    setDate(today());
    setCreating(true);
    setViewing(null);
  };

  const updateLinfonodo = (grupo: string, status: LinfonodoStatus) => {
    setLinfonodos((prev) =>
      prev.map((l) => (l.grupo === grupo ? { ...l, status } : l)),
    );
  };

  const handleSave = async () => {
    if (!hasExtraoralData({ linfonodos, atm })) {
      toast.error(
        "Registre ao menos um achado: linfonodos palpáveis ou dados da ATM.",
      );
      return;
    }
    setBusy(true);
    try {
      await save({ patientId, date, linfonodos, atm });
      toast.success(
        canApprove
          ? "Exame extraoral registrado."
          : "Exame extraoral enviado — aguardando autorização do professor.",
      );
      setCreating(false);
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
          <h3 className="text-sm font-medium">Exame extraoral</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Linfonodos cervicofaciais e avaliação da ATM.
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
              <p className="pb-1 text-[11px] text-muted-foreground">
                Preencha as duas seções abaixo — linfonodos e ATM.
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

          <LinfonodosEditor
            linfonodos={linfonodos}
            onChange={updateLinfonodo}
          />

          <div className="mt-5 border-t border-border/60 pt-5">
            <AtmEditor atm={atm} onChange={setAtm} />
          </div>
        </div>
      )}

      {pendingCount > 0 && !creating && (
        <p
          className="rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: PENDING_COLOR, color: PENDING_COLOR }}
        >
          {pendingCount} exame(s) extraoral(is) aguardando autorização do
          professor.
        </p>
      )}

      {sorted.length === 0 && !creating ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum exame extraoral registrado ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((exam) => {
            const isMine = currentUserId && exam.createdBy === currentUserId;
            const isViewing = viewing === exam.id;
            const palpaveis = exam.linfonodos.filter(
              (l) => l.status === "palpavel",
            ).length;
            return (
              <li
                key={exam.id}
                className="rounded-lg border border-border/70 bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium">
                      {exam.date
                        ? new Date(exam.date + "T12:00:00").toLocaleDateString(
                            "pt-BR",
                          )
                        : "—"}
                    </p>
                    <StatusBadge status={exam.status} />
                    {palpaveis > 0 && (
                      <Badge
                        variant="outline"
                        className="border-amber-600/50 text-[10px] text-amber-700"
                      >
                        {palpaveis} grupo(s) palpável(is)
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {exam.createdByName}
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
                    <ExtraoralRead exam={exam} />
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
// Seção Linfonodos (formulário) — apenas estado: palpável / não palpável /
// não examinado
// ────────────────────────────────────────────────────────────────────────────

function LinfonodosEditor({
  linfonodos,
  onChange,
}: {
  linfonodos: LinfonodoAchado[];
  onChange: (grupo: string, status: LinfonodoStatus) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium">Linfonodos</h4>
        <p className="text-[11px] text-muted-foreground">
          Palpação bilateral dos grupos cervicofaciais
        </p>
      </div>
      <div className="mt-3 grid gap-2">
        {linfonodos.map((l) => (
          <div
            key={l.grupo}
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 p-3",
              l.status === "palpavel" && "border-amber-500/50 bg-amber-50/40",
            )}
          >
            <p className="text-xs font-medium">{l.grupo}</p>
            <div className="flex gap-1">
              {LINFONODO_STATUS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(l.grupo, s)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    l.status === s
                      ? s === "palpavel"
                        ? "border-amber-600 bg-amber-600 text-white"
                        : s === "nao_palpavel"
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-border bg-muted text-muted-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40",
                  )}
                >
                  {LINFONODO_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Seção ATM (formulário) — sem campos numéricos
// ────────────────────────────────────────────────────────────────────────────

function AtmEditor({
  atm,
  onChange,
}: {
  atm: AtmAvaliacao;
  onChange: (a: AtmAvaliacao) => void;
}) {
  const set = <K extends keyof AtmAvaliacao>(k: K, v: AtmAvaliacao[K]) =>
    onChange({ ...atm, [k]: v });

  const toggle = (field: "ruidos" | "dorMuscular", value: string) => {
    const arr = atm[field].includes(value)
      ? atm[field].filter((x) => x !== value)
      : [...atm[field], value];
    set(field, arr);
  };

  return (
    <div>
      <h4 className="text-sm font-medium">ATM (articulação temporomandibular)</h4>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs">Dor à palpação da ATM</Label>
          <select
            value={atm.dorPalpacao}
            onChange={(e) =>
              set("dorPalpacao", e.target.value as AtmAvaliacao["dorPalpacao"])
            }
            className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-foreground/50"
          >
            <option value="ausente">Ausente</option>
            <option value="direita">Direita</option>
            <option value="esquerda">Esquerda</option>
            <option value="bilateral">Bilateral</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Ruídos articulares</Label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ATM_RUIDOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggle("ruidos", r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  atm.ruidos.includes(r)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50",
                )}
              >
                {ATM_RUIDOS_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Desvio de abertura</Label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(
              [
                ["reto", "Reto"],
                ["direita", "Para a direita"],
                ["esquerda", "Para a esquerda"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set("desvioAbertura", value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  atm.desvioAbertura === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Dor muscular à palpação</Label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ATM_DOR_MUSCULAR.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggle("dorMuscular", m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  atm.dorMuscular.includes(m)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50",
                )}
              >
                {ATM_DOR_MUSCULAR_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label className="text-xs">Observações</Label>
          <Textarea
            className="min-h-16 text-xs"
            value={atm.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Ex.: crepitação bilateral à abertura, estalo doloroso ao mastigar…"
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Leitura do exame (visualização expandida)
// ────────────────────────────────────────────────────────────────────────────

function ExtraoralRead({ exam }: { exam: ExtraoralExam }) {
  const examinados = exam.linfonodos.filter(
    (l) => l.status !== "nao_examinado",
  );
  const palpaveis = exam.linfonodos.filter((l) => l.status === "palpavel");
  const a = exam.atm;
  const ruidos = a.ruidos.filter((r) => r !== "ausente");
  const dorMuscular = a.dorMuscular.filter((m) => m !== "nega");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Linfonodos
        </h4>
        {examinados.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhum grupo linfonodal examinado.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {examinados.map((l) => (
              <li
                key={l.grupo}
                className={cn(
                  "flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-xs",
                  l.status === "palpavel" && "border-amber-500/50 bg-amber-50/40",
                )}
              >
                <span className="font-medium">{l.grupo}</span>
                <span
                  className={cn(
                    "ml-2",
                    l.status === "palpavel"
                      ? "font-medium text-amber-700"
                      : "text-emerald-700",
                  )}
                >
                  {LINFONODO_STATUS_LABELS[l.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
        {palpaveis.length > 0 && (
          <p className="mt-2 text-[11px] font-medium text-amber-700">
            {palpaveis.length} grupo(s) palpável(is) — considerar
            linfonodomegalia e investigação.
          </p>
        )}
      </div>

      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          ATM
        </h4>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Dor à palpação
            </dt>
            <dd className="capitalize">
              {a.dorPalpacao === "ausente" ? "Ausente" : a.dorPalpacao}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Ruídos
            </dt>
            <dd>
              {ruidos.length > 0
                ? ruidos.map((r) => ATM_RUIDOS_LABELS[r] ?? r).join(", ")
                : "Ausentes"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Desvio de abertura
            </dt>
            <dd className="capitalize">
              {a.desvioAbertura === "reto"
                ? "Reto"
                : `Para a ${a.desvioAbertura}`}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Dor muscular
            </dt>
            <dd>
              {dorMuscular.length > 0
                ? dorMuscular
                    .map((m) => ATM_DOR_MUSCULAR_LABELS[m] ?? m)
                    .join(", ")
                : "Nega"}
            </dd>
          </div>
          {a.observacoes && (
            <div className="col-span-2">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Observações
              </dt>
              <dd className="whitespace-pre-wrap">{a.observacoes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
