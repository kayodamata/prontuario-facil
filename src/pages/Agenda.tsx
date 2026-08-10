import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
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
  APPOINTMENT_STATUS_LABELS,
  CLINICAS,
  type AppointmentStatus,
} from "@/convex/shared";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function Agenda() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => new Date(),
  );
  const [open, setOpen] = useState(false);

  const selected = selectedDate
    ? selectedDate.toISOString().slice(0, 10)
    : todayStr();

  const appointments = useQuery(api.appointments.list);
  const patients = useQuery(api.patients.list);
  const students = useQuery(api.users.listStudents);

  const create = useMutation(api.appointments.create);
  const setStatus = useMutation(api.appointments.setStatus);
  const remove = useMutation(api.appointments.remove);

  const dayAppointments = useMemo(
    () =>
      (appointments ?? [])
        .filter((a) => a.date === selected)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selected],
  );

  const dayCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments ?? []) {
      map.set(a.date, (map.get(a.date) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

  const statusClass: Record<AppointmentStatus, string> = {
    agendado: "border-border text-muted-foreground",
    confirmado: "border-foreground/40 text-foreground",
    compareceu: "border-emerald-600/40 text-emerald-700",
    faltou: "border-destructive/50 text-destructive",
    cancelado: "border-border text-muted-foreground line-through",
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Marque e acompanhe os atendimentos do dia.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Novo agendamento
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-border/70 bg-card p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            components={{
              DayButton: (props) => {
                const count = dayCount.get(
                  props.day.date.toISOString().slice(0, 10),
                );
                return (
                  <span className="relative block">
                    <CalendarDayButton {...props} />
                    {count ? (
                      <span className="pointer-events-none absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground" />
                    ) : null}
                  </span>
                );
              },
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium capitalize">
              {new Date(selected + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </h2>
            <span className="text-xs text-muted-foreground">
              {dayAppointments.length}{" "}
              {dayAppointments.length === 1 ? "consulta" : "consultas"}
            </span>
          </div>

          {dayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center">
              <CalendarDays className="size-6 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum agendamento para este dia.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {dayAppointments.map((a) => (
                <li
                  key={a._id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3"
                >
                  <span className="w-12 text-sm font-medium tabular-nums">
                    {a.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.patientName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.clinic ? `${a.clinic} · ` : ""}
                      {a.studentName ? `aluno(a): ${a.studentName}` : "sem aluno(a)"}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </p>
                  </div>
                  <Select
                    value={a.status}
                    onValueChange={(v) =>
                      setStatus({
                        appointmentId: a._id,
                        status: v as AppointmentStatus,
                      })
                    }
                  >
                    <SelectTrigger
                      className={cn("h-7 w-32 text-xs", statusClass[a.status])}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPOINTMENT_STATUS_LABELS).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => remove({ appointmentId: a._id })}
                  >
                    Excluir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NewAppointmentDialog
        open={open}
        onOpenChange={setOpen}
        defaultDate={selected}
        patients={patients ?? []}
        students={students ?? []}
        onSave={async (data) => {
          await create({
            patientId: data.patientId as never,
            date: data.date,
            time: data.time,
            clinic: data.clinic as never,
            reason: data.reason,
            studentId: data.studentId as never,
          });
          toast.success("Agendamento criado.");
        }}
      />
    </div>
  );
}

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
  patients: { _id: string; fullName: string }[];
  students: { _id: string; name: string }[];
  onSave: (data: {
    patientId: string;
    date: string;
    time: string;
    clinic?: string;
    reason?: string;
    studentId?: string;
  }) => Promise<void>;
}

function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultDate,
  patients,
  students,
  onSave,
}: NewAppointmentDialogProps) {
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("08:00");
  const [clinic, setClinic] = useState<string>("");
  const [reason, setReason] = useState("");
  const [studentId, setStudentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!patientId) return setError("Selecione o paciente.");
    if (!date || !time) return setError("Informe data e horário.");
    setSaving(true);
    try {
      await onSave({
        patientId,
        date,
        time,
        clinic: clinic || undefined,
        reason: reason || undefined,
        studentId: studentId || undefined,
      });
      setPatientId("");
      setReason("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao agendar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>
            Marque o paciente no dia e horário desejados.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Paciente</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecionar paciente…" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              <Label className="text-xs">Horário</Label>
              <Input
                type="time"
                className="h-9 text-xs"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Finalidade (triagem)</Label>
            <Select value={clinic} onValueChange={setClinic}>
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
          <div className="grid gap-1.5">
            <Label className="text-xs">Aluno(a) responsável (opcional)</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Sem aluno(a)…" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Motivo / observações</Label>
            <Textarea
              className="min-h-16 text-xs"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: primeira consulta — avaliação inicial"
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
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
