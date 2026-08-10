import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  CLINICAS,
  PATIENT_STATUS_LABELS,
  type Clinica,
} from "@/convex/shared";
import { Link } from "react-router";
import { FlaskConical, Loader2, Plus, Search, Users } from "lucide-react";

export function PatientsList() {
  const { user } = useAuth();
  const patients = useQuery(api.patients.list);
  const students = useQuery(api.users.listStudents);
  const create = useMutation(api.patients.create);
  const seed = useMutation(api.demo.seed);

  const role = user?.role ?? "recepcao";
  const [query, setQuery] = useState("");
  const [clinic, setClinic] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const filtered = useMemo(() => {
    let rows = patients ?? [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          (p.cpf ?? "").includes(q) ||
          (p.rg ?? "").includes(q),
      );
    }
    if (clinic !== "all") {
      rows = rows.filter((p) => p.triage === clinic);
    }
    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [patients, query, clinic]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seed();
      toast.success(
        res.created > 0
          ? `${res.created} pacientes de demonstração criados.`
          : "Dados de demonstração já existem.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar dados.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight">
            {role === "aluno" ? "Meus pacientes" : "Pacientes"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "recepcao" &&
              "Banco completo de pacientes. Dados clínicos sensíveis ficam no prontuário."}
            {role === "professor" &&
              "Banco completo de pacientes e prontuários."}
            {role === "aluno" &&
              "Somente os pacientes designados a você pelo professor."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {role === "professor" && (
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <FlaskConical className="mr-1.5 size-4" />
              )}
              Dados demo
            </Button>
          )}
          {role !== "aluno" && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Novo paciente
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="h-9 pl-9 text-sm"
            placeholder="Buscar por nome, CPF ou RG…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={clinic} onValueChange={setClinic}>
          <SelectTrigger className="h-9 w-56 text-xs">
            <SelectValue placeholder="Finalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as finalidades</SelectItem>
            {CLINICAS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!patients ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
          <Users className="size-6 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {patients.length === 0
              ? "Nenhum paciente cadastrado ainda."
              : "Nenhum paciente corresponde ao filtro."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/70">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">CPF / RG</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Nascimento</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Contato</th>
                <th className="px-4 py-3 font-medium">Finalidade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{p.fullName}</td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {p.cpf ?? "—"}
                    <span className="mx-1 text-border">·</span>
                    {p.rg ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {p.birthDate
                      ? new Date(p.birthDate + "T12:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {p.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.triage ? (
                      <Badge variant="outline" className="text-[10px]">
                        {p.triage}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Sem triagem
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {PATIENT_STATUS_LABELS[p.status]}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <Link to={`/pacientes/${p._id}`}>Prontuário</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students === undefined && role === "professor" ? null : null}

      <NewPatientDialog
        open={open}
        onOpenChange={setOpen}
        onSave={async (data) => {
          await create(data);
          toast.success("Paciente cadastrado. Prontuário criado.");
        }}
      />
    </div>
  );
}

interface NewPatientData {
  fullName: string;
  rg?: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  triage?: Clinica;
  triageDetail?: string;
}

function NewPatientDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: NewPatientData) => Promise<void>;
}) {
  const [form, setForm] = useState<NewPatientData>({ fullName: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof NewPatientData>(k: K, v: NewPatientData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError(null);
    if (!form.fullName.trim()) return setError("Informe o nome completo.");
    setSaving(true);
    try {
      await onSave(form);
      setForm({ fullName: "" });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cadastrar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo paciente</DialogTitle>
          <DialogDescription>
            Cadastro base — endereço, nome completo, RG, CPF e data de
            nascimento. A triagem define a finalidade do atendimento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">
              Nome completo <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-9 text-xs"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Nome do paciente"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">CPF</Label>
              <Input
                className="h-9 text-xs"
                value={form.cpf ?? ""}
                onChange={(e) => set("cpf", e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">RG</Label>
              <Input
                className="h-9 text-xs"
                value={form.rg ?? ""}
                onChange={(e) => set("rg", e.target.value)}
                placeholder="00.000.000-0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Data de nascimento</Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={form.birthDate ?? ""}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input
                className="h-9 text-xs"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Endereço</Label>
            <Input
              className="h-9 text-xs"
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Rua, número, bairro, cidade/UF"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">E-mail</Label>
            <Input
              type="email"
              className="h-9 text-xs"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="paciente@email.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">
              Veio à instituição para qual finalidade?
            </Label>
            <Select
              value={form.triage ?? ""}
              onValueChange={(v) => set("triage", v as Clinica)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecionar finalidade…" />
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
          <div className="grid gap-1.5">
            <Label className="text-xs">Observações da triagem</Label>
            <Textarea
              className="min-h-16 text-xs"
              value={form.triageDetail ?? ""}
              onChange={(e) => set("triageDetail", e.target.value)}
              placeholder="Motivo, queixa inicial, encaminhamento…"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
