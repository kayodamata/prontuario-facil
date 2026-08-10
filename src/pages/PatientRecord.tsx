import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useNavigate, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ANMNESE_HABITOS_OPTIONS,
  ANMNESE_MEDICO_OPTIONS,
  APPOINTMENT_STATUS_LABELS,
  CLINICAS,
  MATERIAL_LABELS,
  PENDING_COLOR,
  PATIENT_STATUS_LABELS,
  SIGNATURE_ROLE_LABELS,
  TREATMENT_LABELS,
  emptyAnamnese,
  type Anamnese,
  type Material,
} from "@/convex/shared";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { ToothEditor } from "@/components/odontogram/ToothEditor";
import { SignaturePad } from "@/components/SignaturePad";
import {
  ArrowLeft,
  Check,
  Download,
  FileImage,
  FileText,
  Lock,
  Loader2,
  PenLine,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PatientRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const data = useQuery(
    api.prontuarios.get,
    id ? { patientId: id as never } : "skip",
  );

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="h-10 w-64 animate-pulse rounded bg-muted/60" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-muted/60" />
      </div>
    );
  }

  const { patient, prontuario, attachments, assignment, permissions } = data;
  const isReception = permissions.isReception;
  const pendingAttachments = attachments.filter((a) => a.status === "pending");
  const pendingProcedures = prontuario.procedures.filter(
    (p) => p.status === "pending",
  );
  const pendingTeeth = prontuario.teeth.flatMap((t) =>
    t.treatments.filter((tr) => tr.status === "pending"),
  ).length;
  const pendingTotal =
    pendingAttachments.length + pendingProcedures.length + pendingTeeth +
    (prontuario.anamneseStatus === "pending" ? 1 : 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-medium tracking-tight">
                {patient.fullName}
              </h1>
              {patient.triage && (
                <Badge variant="outline" className="text-[10px]">
                  {patient.triage}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {PATIENT_STATUS_LABELS[patient.status]}
              </Badge>
              {prontuario.status === "finalizado" && (
                <Badge className="text-[10px]">Finalizado</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {patient.cpf ? `${patient.cpf} · ` : ""}
              {patient.birthDate
                ? new Date(patient.birthDate + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )
                : ""}
            </p>
          </div>
        </div>
        {pendingTotal > 0 && !isReception && (
          <Badge
            className="text-[10px]"
            style={{
              color: PENDING_COLOR,
              borderColor: PENDING_COLOR,
              background: "transparent",
            }}
            variant="outline"
          >
            {pendingTotal} alteração(ões) aguardando professor
          </Badge>
        )}
      </div>

      {isReception ? (
        <ReceptionLockView patient={patient} attachments={attachments} />
      ) : (
        <Tabs defaultValue="identificacao" className="mt-6">
          <TabsList className="h-9 justify-start overflow-x-auto">
            <TabsTrigger value="identificacao">Identificação</TabsTrigger>
            <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
            <TabsTrigger value="odontograma">
              Odontograma
              {pendingTeeth > 0 && (
                <span
                  className="ml-1.5"
                  style={{ color: PENDING_COLOR }}
                >
                  ·{pendingTeeth}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="procedimentos">
              Procedimentos
              {pendingProcedures.length > 0 && (
                <span className="ml-1.5" style={{ color: PENDING_COLOR }}>
                  ·{pendingProcedures.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="anexos">
              Anexos
              {pendingAttachments.length > 0 && (
                <span className="ml-1.5" style={{ color: PENDING_COLOR }}>
                  ·{pendingAttachments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
          </TabsList>

          <TabsContent value="identificacao" className="mt-4">
            <IdentificationTab
              patient={patient}
              assignment={assignment}
              canAssign={permissions.canApprove}
            />
          </TabsContent>
          <TabsContent value="anamnese" className="mt-4">
            <AnamneseTab
              patientId={patient._id as never}
              anamnese={{ ...emptyAnamnese(), ...prontuario.anamnese }}
              draft={
                prontuario.anamneseDraft
                  ? { ...emptyAnamnese(), ...prontuario.anamneseDraft }
                  : undefined
              }
              status={prontuario.anamneseStatus}
              canEdit={permissions.canEdit}
              canApprove={permissions.canApprove}
            />
          </TabsContent>
          <TabsContent value="odontograma" className="mt-4">
            <OdontogramTab
              patientId={patient._id as never}
              teeth={prontuario.teeth}
              canEdit={permissions.canEdit}
              canApprove={permissions.canApprove}
              currentUserId={user?._id}
            />
          </TabsContent>
          <TabsContent value="procedimentos" className="mt-4">
            <ProceduresTab
              patientId={patient._id as never}
              procedures={prontuario.procedures}
              canEdit={permissions.canEdit}
              canApprove={permissions.canApprove}
              currentUserId={user?._id}
            />
          </TabsContent>
          <TabsContent value="anexos" className="mt-4">
            <AttachmentsTab
              patientId={patient._id as never}
              attachments={attachments}
              canEdit={permissions.canEdit}
              canApprove={permissions.canApprove}
            />
          </TabsContent>
          <TabsContent value="assinaturas" className="mt-4">
            <SignaturesTab
              patientId={patient._id as never}
              signatures={prontuario.signatures}
              status={prontuario.status}
              canApprove={permissions.canApprove}
              currentUserName={user?.name}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Recepção — vê apenas metadados; dados sensíveis ficam bloqueados
// ────────────────────────────────────────────────────────────────────────────
function ReceptionLockView({
  patient,
  attachments,
}: {
  patient: any;
  attachments: { _id: string; name: string; kind: string; status: string }[];
}) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-border/70 bg-card p-5">
        <h3 className="text-sm font-medium">Dados cadastrais</h3>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Nome completo" value={patient.fullName} />
          <Field label="CPF" value={patient.cpf} />
          <Field label="RG" value={patient.rg} />
          <Field label="Nascimento" value={patient.birthDate} />
          <Field label="Telefone" value={patient.phone} />
          <Field label="E-mail" value={patient.email} />
          <div className="col-span-2">
            <Field label="Endereço" value={patient.address} />
          </div>
          <div className="col-span-2">
            <Field label="Finalidade (triagem)" value={patient.triage} />
          </div>
          <div className="col-span-2">
            <Field label="Observações da triagem" value={patient.triageDetail} />
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border/70 bg-card p-5">
        <h3 className="text-sm font-medium">Dados clínicos</h3>
        <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/40 p-4">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-5 text-muted-foreground">
            A recepção não tem acesso aos dados clínicos sensíveis (anamnese,
            odontograma e conteúdo dos exames). O paciente possui{" "}
            <span className="font-medium text-foreground">
              {attachments.length}
            </span>{" "}
            {attachments.length === 1 ? "anexo" : "anexos"} registrados no
            prontuário.
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {attachments.map((a) => (
            <li
              key={a._id}
              className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2.5 text-xs"
            >
              <Lock className="size-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{a.name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {a.kind}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  a.status === "pending" && "border-amber-600/50 text-amber-700",
                )}
              >
                {a.status === "pending" ? "Pendente" : "Autorizado"}
              </Badge>
            </li>
          ))}
          {attachments.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum anexo registrado.
            </p>
          )}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Identificação
// ────────────────────────────────────────────────────────────────────────────
function IdentificationTab({
  patient,
  assignment,
  canAssign,
}: {
  patient: any;
  assignment: {
    studentId: string;
    studentName: string;
    accessEnd?: string;
  } | null;
  canAssign: boolean;
}) {
  // só o professor precisa da lista de alunos(as); alunos não devem chamar essa
  // query (a query lançaria erro e derrubaria a aplicação)
  const students = useQuery(
    api.users.listStudents,
    canAssign ? {} : "skip",
  );
  const assign = useMutation(api.patients.assign);
  const unassign = useMutation(api.patients.unassign);
  const updateTriage = useMutation(api.patients.updateTriage);

  const [studentId, setStudentId] = useState("");
  const [accessEnd, setAccessEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAssign = async () => {
    if (!studentId) return;
    setBusy(true);
    try {
      await assign({
        patientId: patient._id,
        studentId: studentId as never,
        accessEnd: accessEnd || undefined,
      });
      setStudentId("");
      toast.success("Paciente designado ao aluno(a).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao designar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-border/70 bg-card p-5">
        <h3 className="text-sm font-medium">Dados cadastrais</h3>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Nome completo" value={patient.fullName} />
          <Field label="CPF" value={patient.cpf} />
          <Field label="RG" value={patient.rg} />
          <Field label="Nascimento" value={patient.birthDate} />
          <Field label="Telefone" value={patient.phone} />
          <Field label="E-mail" value={patient.email} />
          <div className="col-span-2">
            <Field label="Endereço" value={patient.address} />
          </div>
          <div className="col-span-2">
            <Field label="Finalidade (triagem)" value={patient.triage} />
          </div>
          <div className="col-span-2">
            <Field label="Observações da triagem" value={patient.triageDetail} />
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border/70 bg-card p-5">
        <h3 className="text-sm font-medium">Triagem e encaminhamento</h3>
        <div className="grid gap-1.5">
          <Label className="text-xs">Finalidade</Label>
          <Select
            value={patient.triage ?? ""}
            onValueChange={(v) =>
              updateTriage({
                patientId: patient._id,
                triage: v as never,
              })
            }
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecionar…" />
            </SelectTrigger>
            <SelectContent>
              {CLINICAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canAssign && (
          <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Designar aluno(a)
            </p>
            {assignment ? (
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{assignment.studentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.accessEnd
                      ? `Acesso até ${assignment.accessEnd}`
                      : "Acesso sem prazo definido"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() =>
                    unassign({
                      patientId: patient._id,
                      studentId: assignment.studentId as never,
                    })
                  }
                >
                  Remover
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum aluno(a) designado a este paciente.
              </p>
            )}
            <div className="grid gap-1.5">
              <Label className="text-xs">Aluno(a)</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecionar aluno(a)…" />
                </SelectTrigger>
                <SelectContent>
                  {(students ?? []).map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                      {s.registration ? ` (${s.registration})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">
                  Acesso até (fim do semestre)
                </Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={accessEnd}
                  onChange={(e) => setAccessEnd(e.target.value)}
                />
              </div>
              <Button
                className="h-9"
                onClick={handleAssign}
                disabled={!studentId || busy}
              >
                {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Designar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O(a) aluno(a) só enxerga este prontuário enquanto estiver
              designado(a) e dentro do prazo.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Anamnese
// ────────────────────────────────────────────────────────────────────────────
function AnamneseTab({
  patientId,
  anamnese,
  draft,
  status,
  canEdit,
  canApprove,
}: {
  patientId: never;
  anamnese: Anamnese;
  draft?: Anamnese;
  status: "approved" | "pending";
  canEdit: boolean;
  canApprove: boolean;
}) {
  const saveAnamnese = useMutation(api.prontuarios.saveAnamnese);
  const approveAnamnese = useMutation(api.prontuarios.approveAnamnese);
  const rejectAnamnese = useMutation(api.prontuarios.rejectAnamnese);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Anamnese | null>(null);
  const [saving, setSaving] = useState(false);

  const effective = status === "pending" && draft ? draft : anamnese;

  const set = <K extends keyof Anamnese>(k: K, v: Anamnese[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const toggle = (field: "historicoMedico" | "habitos", value: string) => {
    setForm((f) => {
      if (!f) return f;
      const arr = f[field].includes(value)
        ? f[field].filter((x) => x !== value)
        : [...f[field], value];
      return { ...f, [field]: arr };
    });
  };

  const startEdit = () => {
    setForm({ ...effective, historicoMedico: [...effective.historicoMedico], habitos: [...effective.habitos] });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveAnamnese({ patientId, anamnese: form });
      setEditing(false);
      toast.success(
        canApprove
          ? "Anamnese salva."
          : "Anamnese enviada — aguardando autorização do professor.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const Chips = ({
    label,
    options,
    field,
  }: {
    label: string;
    options: readonly string[];
    field: "historicoMedico" | "habitos";
  }) => (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = effective[field].includes(opt);
          const draftActive = form?.[field].includes(opt) ?? false;
          return (
            <button
              key={opt}
              type="button"
              disabled={!editing}
              onClick={() => toggle(field, opt)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                editing
                  ? draftActive || (active && !draftActive)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50"
                  : active
                    ? "border-foreground/30 bg-muted"
                    : "border-border text-muted-foreground",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
          style={{
            borderColor: PENDING_COLOR,
            background: `${PENDING_COLOR}0d`,
          }}
        >
          <p className="text-xs" style={{ color: PENDING_COLOR }}>
            O(a) aluno(a) enviou alterações na anamnese que ainda não foram
            autorizadas.
          </p>
          {canApprove && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => approveAnamnese({ patientId })}
              >
                <Check className="mr-1.5 size-3.5" />
                Autorizar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => rejectAnamnese({ patientId })}
              >
                <X className="mr-1.5 size-3.5" />
                Recusar
              </Button>
            </div>
          )}
        </div>
        {canEdit ? (
          <>
            {editing ? (
              <AnamneseForm
                form={form ?? effective}
                set={set}
                toggle={toggle}
                onCancel={() => setEditing(false)}
                onSave={handleSave}
                saving={saving}
              />
            ) : (
              <button
                onClick={startEdit}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              >
                <PenLine className="size-3.5" />
                Editar anamnese
              </button>
            )}
            <AnamneseRead anamnese={effective} />
          </>
        ) : (
          <AnamneseRead anamnese={effective} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        editing ? (
          <AnamneseForm
            form={form ?? effective}
            set={set}
            toggle={toggle}
            onCancel={() => setEditing(false)}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <button
            onClick={startEdit}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          >
            <PenLine className="size-3.5" />
            Editar anamnese
          </button>
        )
      ) : null}
      <AnamneseRead anamnese={effective} />
    </div>
  );
}

function AnamneseRead({ anamnese }: { anamnese: Anamnese }) {
  return (
    <section className="grid gap-5 rounded-lg border border-border/70 bg-card p-5">
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Queixa principal</Label>
        <p className="text-sm">{anamnese.queixaPrincipal || "—"}</p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">
          História da doença atual (HDA)
        </Label>
        <p className="text-sm whitespace-pre-wrap">
          {anamnese.hda || "—"}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">
          Antecedentes médicos
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {anamnese.historicoMedico.length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhum registrado.</span>
          ) : (
            anamnese.historicoMedico.map((h) => (
              <Badge key={h} variant="secondary" className="text-[11px] font-normal">
                {h}
              </Badge>
            ))
          )}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Medicamentos em uso</Label>
        <p className="text-sm">{anamnese.medicamentos || "—"}</p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Hábitos</Label>
        <div className="flex flex-wrap gap-1.5">
          {anamnese.habitos.length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhum registrado.</span>
          ) : (
            anamnese.habitos.map((h) => (
              <Badge key={h} variant="secondary" className="text-[11px] font-normal">
                {h}
              </Badge>
            ))
          )}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Exames anteriores</Label>
        <p className="text-sm">{anamnese.examesAnteriores || "—"}</p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Especificar</Label>
        <p className="text-sm whitespace-pre-wrap">{anamnese.especificar || "—"}</p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Observações</Label>
        <p className="text-sm whitespace-pre-wrap">{anamnese.observacoes || "—"}</p>
      </div>
    </section>
  );
}

function AnamneseForm({
  form,
  set,
  toggle,
  onCancel,
  onSave,
  saving,
}: {
  form: Anamnese;
  set: <K extends keyof Anamnese>(k: K, v: Anamnese[K]) => void;
  toggle: (field: "historicoMedico" | "habitos", value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-border/70 bg-card p-5">
      <div className="grid gap-1.5">
        <Label className="text-xs">Queixa principal</Label>
        <Input
          className="h-9 text-xs"
          value={form.queixaPrincipal}
          onChange={(e) => set("queixaPrincipal", e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">História da doença atual (HDA)</Label>
        <Textarea
          className="min-h-20 text-xs"
          value={form.hda}
          onChange={(e) => set("hda", e.target.value)}
        />
      </div>
      <CheckboxChips
        label="Antecedentes médicos (clique para marcar)"
        options={ANMNESE_MEDICO_OPTIONS}
        field="historicoMedico"
        form={form}
        toggle={toggle}
      />
      <div className="grid gap-1.5">
        <Label className="text-xs">Medicamentos em uso</Label>
        <Input
          className="h-9 text-xs"
          value={form.medicamentos}
          onChange={(e) => set("medicamentos", e.target.value)}
        />
      </div>
      <CheckboxChips
        label="Hábitos (clique para marcar)"
        options={ANMNESE_HABITOS_OPTIONS}
        field="habitos"
        form={form}
        toggle={toggle}
      />
      <div className="grid gap-1.5">
        <Label className="text-xs">Exames anteriores</Label>
        <Input
          className="h-9 text-xs"
          value={form.examesAnteriores}
          onChange={(e) => set("examesAnteriores", e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">Especificar</Label>
        <Textarea
          className="min-h-16 text-xs"
          value={form.especificar}
          onChange={(e) => set("especificar", e.target.value)}
          placeholder="Detalhes adicionais que precisam ser especificados…"
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">Observações</Label>
        <Textarea
          className="min-h-16 text-xs"
          value={form.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          Salvar
        </Button>
      </div>
    </section>
  );
}

function CheckboxChips({
  label,
  options,
  field,
  form,
  toggle,
}: {
  label: string;
  options: readonly string[];
  field: "historicoMedico" | "habitos";
  form: Anamnese;
  toggle: (field: "historicoMedico" | "habitos", value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(field, opt)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              form[field].includes(opt)
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/50",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Odontograma
// ────────────────────────────────────────────────────────────────────────────
function OdontogramTab({
  patientId,
  teeth,
  canEdit,
  canApprove,
  currentUserId,
}: {
  patientId: never;
  teeth: any[];
  canEdit: boolean;
  canApprove: boolean;
  currentUserId?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const record = teeth.find((t) => t.tooth === selected) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-border/70 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium">Odontograma</h3>
          {canEdit && (
            <p className="text-[11px] text-muted-foreground">
              Clique em um dente para registrar o tratamento
            </p>
          )}
        </div>
        <Odontogram
          teeth={teeth}
          selectedTooth={selected}
          onSelectTooth={canEdit || canApprove ? setSelected : undefined}
          interactive={canEdit || canApprove}
        />
      </div>
      {selected ? (
        <ToothEditor
          patientId={patientId as never}
          tooth={selected}
          treatments={record?.treatments ?? []}
          canEdit={canEdit}
          canApprove={canApprove}
          currentUserId={currentUserId}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione um dente para ver os tratamentos e registrar alterações.
          </p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Procedimentos
// ────────────────────────────────────────────────────────────────────────────
function ProceduresTab({
  patientId,
  procedures,
  canEdit,
  canApprove,
  currentUserId,
}: {
  patientId: never;
  procedures: any[];
  canEdit: boolean;
  canApprove: boolean;
  currentUserId?: string;
}) {
  const saveProcedure = useMutation(api.prontuarios.saveProcedure);
  const approveProcedure = useMutation(api.prontuarios.approveProcedure);
  const rejectProcedure = useMutation(api.prontuarios.rejectProcedure);
  const removeProcedure = useMutation(api.prontuarios.removeProcedure);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tooth, setTooth] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProcedure({
        patientId,
        title,
        description,
        tooth: tooth || undefined,
      });
      setTitle("");
      setDescription("");
      setTooth("");
      toast.success(
        canApprove
          ? "Anotação registrada."
          : "Anotação enviada — aguardando autorização do professor.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...procedures].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">
          Anotações de procedimentos
          {procedures.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({procedures.length})
            </span>
          )}
        </h3>
        {sorted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhuma anotação registrada.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((p) => {
              const pending = p.status === "pending";
              const isMine = currentUserId && p.createdBy === currentUserId;
              return (
                <li
                  key={p.id}
                  className="rounded-lg border border-border/70 bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{p.title}</p>
                        {p.tooth && (
                          <Badge variant="secondary" className="text-[10px]">
                            Dente {p.tooth}
                          </Badge>
                        )}
                        {pending ? (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{
                              color: PENDING_COLOR,
                              borderColor: PENDING_COLOR,
                            }}
                          >
                            Pendente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Aprovado
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-muted-foreground whitespace-pre-wrap">
                        {p.description}
                      </p>
                      <p className="mt-2 text-[10px] text-muted-foreground/70">
                        {p.createdByName} · {p.date}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {pending && canApprove && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-emerald-600"
                            title="Autorizar"
                            onClick={() =>
                              approveProcedure({
                                patientId,
                                procedureId: p.id,
                              })
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
                              rejectProcedure({
                                patientId,
                                procedureId: p.id,
                              })
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
                            removeProcedure({ patientId, procedureId: p.id })
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
      </section>

      {canEdit && (
        <section className="flex h-fit flex-col gap-3 rounded-lg border border-border/70 bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Nova anotação
          </p>
          <div className="grid gap-1.5">
            <Label className="text-xs">Título</Label>
            <Input
              className="h-9 text-xs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Acesso coronário do 26"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Dente (opcional)</Label>
            <Input
              className="h-9 text-xs"
              value={tooth}
              onChange={(e) => setTooth(e.target.value)}
              placeholder="Ex.: 26"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              className="min-h-24 text-xs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qualquer informação necessária sobre o procedimento…"
            />
          </div>
          <Button
            className="self-start"
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim()}
          >
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            <Plus className="mr-1.5 size-3.5" />
            Registrar
          </Button>
        </section>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Anexos
// ────────────────────────────────────────────────────────────────────────────
function AttachmentsTab({
  patientId,
  attachments,
  canEdit,
  canApprove,
}: {
  patientId: never;
  attachments: {
    _id: Id<"attachments">;
    name: string;
    type: string;
    kind: string;
    size: number;
    status: string;
    uploadedByName: string;
    createdAt: number;
    storageId?: Id<"_storage">;
    url?: string | null;
  }[];
  canEdit: boolean;
  canApprove: boolean;
}) {
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const register = useMutation(api.attachments.register);
  const approve = useMutation(api.attachments.approve);
  const reject = useMutation(api.attachments.reject);
  const remove = useMutation(api.attachments.remove);

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{
    name: string;
    url: string;
    kind: string;
    type: string;
  } | null>(null);
  const inputRef = useState<HTMLInputElement | null>(null)[1];

  const kindOf = (name: string, type: string) => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "dcm" || ext === "dicom") return "dicom";
    if (type.startsWith("image/")) return "imagem";
    if (
      type === "application/pdf" ||
      ext === "pdf" ||
      ext === "doc" ||
      ext === "docx"
    )
      return "documento";
    return "outro";
  };

  const isPdf = (name: string, type: string) =>
    type === "application/pdf" || /\.pdf$/i.test(name);

  const downloadFile = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao baixar o arquivo.");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // fallback: se o fetch for bloqueado (CORS), tenta abrir direto
      window.open(url, "_blank", "noopener");
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Falha no upload.");
      const { storageId } = await result.json();
      await register({
        patientId,
        name: file.name,
        type: file.type || "application/octet-stream",
        kind: kindOf(file.name, file.type),
        size: file.size,
        storageId: storageId as never,
      });
      toast.success(
        canApprove
          ? "Anexo adicionado ao prontuário."
          : "Anexo enviado — só entra no prontuário com autorização do professor.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const sorted = [...attachments].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Exames e imagens</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            JPEG, PNG, PDF, Word e DICOM (.dcm). O aluno anexa; o professor
            autoriza para o prontuário.
          </p>
        </div>
        {canEdit && (
          <label className="relative">
            <input
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.dcm,.dicom"
              ref={(el) => inputRef(el)}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              asChild
              size="sm"
              disabled={uploading}
            >
              <span>
                {uploading ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <FileImage className="mr-1.5 size-3.5" />
                )}
                {uploading ? "Enviando…" : "Anexar arquivo"}
              </span>
            </Button>
          </label>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum exame anexado.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sorted.map((a) => {
            const pending = a.status === "pending";
            return (
              <li
                key={a._id}
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3"
              >
                {a.url ? (
                  <button
                    onClick={() =>
                      setPreview({
                        name: a.name,
                        url: a.url!,
                        kind: a.kind,
                        type: a.type,
                      })
                    }
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
                    title="Visualizar"
                  >
                    {a.kind === "imagem" ? (
                      <FileImage className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </button>
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.kind === "dicom"
                      ? "DICOM · exame obrigatório para isenção de responsabilidade"
                      : a.kind}
                    {" · "}
                    {formatSize(a.size)} · {a.uploadedByName}
                  </p>
                </div>
                {pending ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px]"
                    style={{ color: PENDING_COLOR, borderColor: PENDING_COLOR }}
                  >
                    Pendente
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    Autorizado
                  </Badge>
                )}
                {a.url && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      title="Baixar"
                      onClick={() => downloadFile(a.url!, a.name)}
                    >
                      <Download className="size-3.5" />
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      <a href={a.url} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    </Button>
                  </div>
                )}
                <div className="flex shrink-0 flex-col gap-1">
                  {pending && canApprove && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-emerald-600"
                        title="Autorizar"
                        onClick={() => approve({ attachmentId: a._id as never })}
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive"
                        title="Recusar"
                        onClick={() => reject({ attachmentId: a._id as never })}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}
                  {pending && canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground"
                      title="Remover"
                      onClick={() => remove({ attachmentId: a._id as never })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-h-[92vh] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              {preview?.name}
            </DialogTitle>
          </DialogHeader>
          {preview && preview.kind === "imagem" && (
            <img
              src={preview.url}
              alt={preview.name}
              className="max-h-[70vh] w-full rounded-md object-contain"
            />
          )}
          {preview &&
            preview.kind !== "imagem" &&
            isPdf(preview.name, preview.type) && (
              <iframe
                src={preview.url}
                title={preview.name}
                className="h-[72vh] w-full rounded-md border border-border/70"
              />
            )}
          {preview &&
            preview.kind !== "imagem" &&
            !isPdf(preview.name, preview.type) && (
              <div className="flex flex-col items-center gap-3 rounded-md border border-border/60 bg-muted/40 px-6 py-10 text-center">
                <FileText className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Este formato não pode ser visualizado no navegador.
                  Baixe o arquivo para abrir.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => downloadFile(preview.url, preview.name)}
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Baixar arquivo
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={preview.url} target="_blank" rel="noreferrer">
                      Abrir em nova aba
                    </a>
                  </Button>
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Assinaturas — paciente → aluno → professor
// ────────────────────────────────────────────────────────────────────────────
function SignaturesTab({
  patientId,
  signatures,
  status,
  canApprove,
  currentUserName,
}: {
  patientId: never;
  signatures: { role: string; name: string; dataUrl: string; signedAt: number }[];
  status: string;
  canApprove: boolean;
  currentUserName?: string;
}) {
  const sign = useMutation(api.prontuarios.sign);
  const order: ("paciente" | "aluno" | "professor")[] = [
    "paciente",
    "aluno",
    "professor",
  ];
  const current = order[signatures.length];
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [name, setName] = useState(current === "professor" ? currentUserName ?? "" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    if (!current) return;
    setError(null);
    if (!name.trim()) return setError("Informe o nome de quem assina.");
    if (!dataUrl) return setError("Desenhe a assinatura.");
    setSaving(true);
    try {
      await sign({ patientId, role: current, name: name.trim(), dataUrl });
      setDataUrl(null);
      setName("");
      if (current === "professor") {
        toast.success(
          "Prontuário finalizado! Todas as alterações pendentes foram efetivadas.",
        );
      } else {
        toast.success(`Assinatura do(a) ${SIGNATURE_ROLE_LABELS[current]} registrada.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao assinar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-lg border border-border/70 bg-card p-5">
        <h3 className="text-sm font-medium">Ordem de assinaturas</h3>
        <p className="text-xs text-muted-foreground">
          Paciente → Aluno(a) → Professor(a). As alterações só são efetivadas
          com a assinatura do professor.
        </p>
        <ol className="flex flex-col gap-3">
          {order.map((role, i) => {
            const done = i < signatures.length;
            const isCurrent = role === current;
            return (
              <li
                key={role}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2.5",
                  done && "border-emerald-600/30 bg-emerald-50/40",
                  isCurrent && "border-foreground/30",
                  !done && !isCurrent && "border-border/60 opacity-50",
                )}
              >
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                    done
                      ? "border-emerald-600/50 text-emerald-700"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {SIGNATURE_ROLE_LABELS[role]}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-700">
                        assinando agora
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {done
                      ? `${signatures[i].name} · ${new Date(
                          signatures[i].signedAt,
                        ).toLocaleString("pt-BR")}`
                      : "Aguardando…"}
                  </p>
                </div>
                {done && (
                  <img
                    src={signatures[i].dataUrl}
                    alt={`Assinatura ${role}`}
                    className="h-8 w-24 object-contain"
                  />
                )}
              </li>
            );
          })}
        </ol>
        {status === "finalizado" && (
          <p className="flex items-center gap-2 rounded-md border border-emerald-600/30 bg-emerald-50/50 px-3 py-2.5 text-xs text-emerald-800">
            <ShieldCheck className="size-4" />
            Prontuário finalizado e assinado pelo professor. Nenhuma alteração
            pendente.
          </p>
        )}
      </section>

      {current && (
        <section className="flex h-fit flex-col gap-3 rounded-lg border border-border/70 bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Assinatura do(a) {SIGNATURE_ROLE_LABELS[current]}
          </p>
          <div className="grid gap-1.5">
            <Label className="text-xs">Nome completo</Label>
            <Input
              className="h-9 text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Nome do(a) ${SIGNATURE_ROLE_LABELS[current]}`}
            />
          </div>
          <SignaturePad onChange={setDataUrl} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleSign} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            <PenLine className="mr-1.5 size-4" />
            Assinar e avançar
          </Button>
        </section>
      )}
    </div>
  );
}
