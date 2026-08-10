import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PLAN_STATUS_LABELS, PENDING_COLOR } from "@/convex/shared";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function PlanMineView() {
  const plans = useQuery(api.plans.listMine);
  const patients = useQuery(api.patients.list);

  const submit = useMutation(api.plans.submit);
  const remove = useMutation(api.plans.remove);

  const [date, setDate] = useState(todayStr());
  const [patientId, setPatientId] = useState("");
  const [tooth, setTooth] = useState("");
  const [procedure, setProcedure] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myPatients = (patients ?? []).filter(
    (p) => p.fullName !== undefined,
  );
  const selectedPatient = myPatients.find((p) => p._id === patientId);

  const handleSubmit = async () => {
    setError(null);
    if (!patientId) return setError("Selecione o paciente.");
    if (!procedure.trim()) return setError("Descreva o procedimento planejado.");
    setSaving(true);
    try {
      await submit({
        date,
        patientId: patientId as never,
        patientName: selectedPatient?.fullName ?? "Paciente",
        tooth: tooth || undefined,
        procedure,
        notes: notes || undefined,
      });
      setTooth("");
      setProcedure("");
      setNotes("");
      toast.success("Planejamento enviado para avaliação do professor.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...(plans ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-light tracking-tight">
          Planejamento diário
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Antes de iniciar qualquer procedimento, envie seu planejamento do dia.
          O professor avalia, corrige e devolve.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Formulário */}
        <section className="flex flex-col gap-4 rounded-lg border border-border/70 bg-card p-5">
          <h2 className="text-sm font-medium">Novo planejamento</h2>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Paciente</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecionar paciente designado…" />
                </SelectTrigger>
                <SelectContent>
                  {myPatients.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Procedimento planejado</Label>
              <Textarea
                className="min-h-24 text-sm"
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
                placeholder="Descreva o que será realizado no atendimento de hoje…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea
                className="min-h-16 text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Materiais, radiografias solicitadas, dúvidas…"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              className="self-start"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 size-4" />
              )}
              Enviar para o professor
            </Button>
          </div>
        </section>

        {/* Histórico */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Meus envios</h2>
          {sorted.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nenhum planejamento enviado ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sorted.map((p) => (
                <li
                  key={p._id}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-foreground">
                        {p.patientName}
                      </span>
                      {p.tooth && (
                        <Badge variant="secondary" className="text-[10px]">
                          Dente {p.tooth}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        p.status === "pending" && "border-amber-600/50 text-amber-700",
                        p.status === "approved" && "border-emerald-600/40 text-emerald-700",
                      )}
                    >
                      {PLAN_STATUS_LABELS[p.status]}
                    </Badge>
                  </div>

                  {p.status === "pending" ? (
                    <p className="text-xs text-muted-foreground">{p.procedure}</p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        {p.procedureApproved &&
                          p.procedureApproved !== p.procedure && (
                            <div className="grid gap-0.5">
                              <span
                                className="text-[10px] font-medium uppercase tracking-wider"
                                style={{ color: PENDING_COLOR }}
                              >
                                Correção do professor
                              </span>
                              <p
                                className="rounded-md border px-3 py-2 text-xs"
                                style={{
                                  borderColor: PENDING_COLOR,
                                  background: `${PENDING_COLOR}0d`,
                                  color: PENDING_COLOR,
                                }}
                              >
                                {p.procedureApproved}
                              </p>
                            </div>
                          )}
                        {p.procedureApproved &&
                          p.procedureApproved === p.procedure && (
                            <p className="text-xs text-muted-foreground">
                              {p.procedure}
                            </p>
                          )}
                        {p.feedback && (
                          <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                            <span className="font-medium">Parecer: </span>
                            {p.feedback}
                          </p>
                        )}
                        {!p.procedureApproved && (
                          <p className="text-xs text-muted-foreground">
                            {p.procedure}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(p.date + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    {p.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-muted-foreground"
                        onClick={() => remove({ planId: p._id })}
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
