import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { PLAN_STATUS_LABELS, PENDING_COLOR } from "@/convex/shared";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";

type Plan = Doc<"dailyPlans">;

export function PlansView() {
  const plans = useQuery(api.plans.listAll);
  const [reviewing, setReviewing] = useState<Plan | null>(null);

  if (!plans) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    );
  }

  const pending = plans.filter((p) => p.status === "pending");
  const others = plans.filter((p) => p.status !== "pending");

  const PlanRow = ({ plan }: { plan: Plan }) => (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{plan.patientName}</p>
          <span className="text-xs text-muted-foreground">
            {plan.studentName}
          </span>
          {plan.tooth && (
            <Badge variant="secondary" className="text-[10px]">
              Dente {plan.tooth}
            </Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {plan.procedure}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            plan.status === "pending" && "border-amber-600/50 text-amber-700",
            plan.status === "approved" && "border-emerald-600/40 text-emerald-700",
          )}
        >
          {PLAN_STATUS_LABELS[plan.status]}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {new Date(plan.date + "T12:00:00").toLocaleDateString("pt-BR")}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={() => setReviewing(plan)}
      >
        {plan.status === "pending" ? "Avaliar" : "Ver detalhes"}
      </Button>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-light tracking-tight">
          Planejamento diário
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Avalie os planos enviados pelos alunos, corrija em cor diferenciada e
          devolva com parecer.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <ClipboardCheck className="size-4" />
          Aguardando avaliação
          {pending.length > 0 && (
            <Badge className="text-[10px]">{pending.length}</Badge>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhum planejamento pendente. 🎉
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((p) => (
              <PlanRow key={p._id} plan={p} />
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Histórico</h2>
          <ul className="flex flex-col gap-2">
            {others.map((p) => (
              <PlanRow key={p._id} plan={p} />
            ))}
          </ul>
        </section>
      )}

      {reviewing && (
        <ReviewDialog plan={reviewing} onClose={() => setReviewing(null)} />
      )}
    </div>
  );
}

function ReviewDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const review = useMutation(api.plans.review);
  const [procedure, setProcedure] = useState(
    plan.procedureApproved ?? plan.procedure,
  );
  const [notes, setNotes] = useState(plan.notesApproved ?? plan.notes ?? "");
  const [feedback, setFeedback] = useState(plan.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (status: "approved" | "returned") => {
    setSaving(true);
    setError(null);
    try {
      await review({
        planId: plan._id,
        procedureApproved: procedure,
        notesApproved: notes || undefined,
        status,
        feedback: feedback || undefined,
      });
      toast.success(
        status === "approved"
          ? "Planejamento aprovado."
          : "Planejamento devolvido para revisão.",
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao avaliar.");
      setSaving(false);
    }
  };

  const edited =
    plan.status === "pending" && procedure.trim() !== plan.procedure.trim();

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Avaliar planejamento — {plan.patientName}
          </DialogTitle>
          <DialogDescription>
            {plan.studentName} ·{" "}
            {new Date(plan.date + "T12:00:00").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
            {plan.tooth ? ` · dente ${plan.tooth}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {plan.status === "pending" ? (
            <>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Versão original do(a) aluno(a)
                </Label>
                <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  {plan.procedure}
                </p>
                {plan.notes && (
                  <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                    {plan.notes}
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">
                  Suas correções — ficarão{" "}
                  <span style={{ color: PENDING_COLOR }}>
                    destacadas em cor
                  </span>{" "}
                  para o(a) aluno(a)
                </Label>
                <Textarea
                  className="min-h-24 text-sm"
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                />
                <Label className="text-xs">Observações (corrigidas)</Label>
                <Textarea
                  className="min-h-16 text-xs"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="grid gap-3">
              {plan.procedureApproved && (
                <div className="grid gap-1">
                  <Label className="text-xs">Procedimento aprovado</Label>
                  <p
                    className="rounded-md border px-3 py-2.5 text-sm"
                    style={{
                      borderColor: PENDING_COLOR,
                      background: `${PENDING_COLOR}0d`,
                      color: PENDING_COLOR,
                    }}
                  >
                    {plan.procedureApproved}
                  </p>
                </div>
              )}
              {plan.procedureApproved !== plan.procedure &&
                plan.procedureApproved && (
                  <p className="text-xs text-muted-foreground">
                    Original: <span className="line-through">{plan.procedure}</span>
                  </p>
                )}
              {plan.notesApproved && (
                <div className="grid gap-1">
                  <Label className="text-xs">Observações aprovadas</Label>
                  <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                    {plan.notesApproved}
                  </p>
                </div>
              )}
              {plan.feedback && (
                <div className="grid gap-1">
                  <Label className="text-xs">Parecer do professor</Label>
                  <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-xs">
                    {plan.feedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {edited && (
            <p
              className="rounded-md border px-3 py-2 text-xs"
              style={{
                borderColor: PENDING_COLOR,
                color: PENDING_COLOR,
              }}
            >
              Você alterou o procedimento — as mudanças aparecerão destacadas
              para o(a) aluno(a).
            </p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="grid gap-1.5">
            <Label className="text-xs">Parecer para o(a) aluno(a)</Label>
            <Textarea
              className="min-h-16 text-xs"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Orientações, pontos a corrigir…"
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => submit("returned")}
          >
            Devolver para revisão
          </Button>
          <Button disabled={saving} onClick={() => submit("approved")}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Aprovar planejamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
