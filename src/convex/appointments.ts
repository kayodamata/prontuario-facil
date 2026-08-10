import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { appointmentStatusValidator, clinicValidator } from "./shared";
import { requireRole, requireUser } from "./users";

/** Agenda: recepção e professor veem tudo; aluno vê seus agendamentos. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    const all = await ctx.db.query("appointments").collect();
    let rows = all;
    if (user.role === "aluno") {
      rows = all.filter((a) => a.studentId === userId);
    }
    return rows.sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time),
    );
  },
});

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    date: v.string(),
    time: v.string(),
    clinic: v.optional(clinicValidator),
    reason: v.optional(v.string()),
    studentId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role === "aluno") throw new Error("Alunos(as) não agendam pacientes.");
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new Error("Paciente não encontrado.");
    if (!args.date || !args.time) throw new Error("Informe data e horário.");
    let studentName: string | undefined;
    if (args.studentId) {
      const s = await ctx.db.get(args.studentId);
      if (s) studentName = s.name ?? undefined;
    }
    await ctx.db.insert("appointments", {
      patientId: args.patientId,
      patientName: patient.fullName,
      date: args.date,
      time: args.time,
      clinic: args.clinic,
      reason: args.reason?.trim() || undefined,
      studentId: args.studentId || undefined,
      studentName,
      status: "agendado",
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: appointmentStatusValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role === "aluno") throw new Error("Acesso restrito.");
    await ctx.db.patch(args.appointmentId, { status: args.status });
  },
});

export const remove = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role === "aluno") throw new Error("Acesso restrito.");
    await ctx.db.delete(args.appointmentId);
  },
});
