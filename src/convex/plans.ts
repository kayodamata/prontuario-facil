import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { planStatusValidator } from "./shared";
import { hasStudentAccess } from "./patients";
import { requireTeacher, requireUser } from "./users";

export const submit = mutation({
  args: {
    date: v.string(),
    patientId: v.optional(v.id("patients")),
    patientName: v.string(),
    tooth: v.optional(v.string()),
    procedure: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role === "recepcao") {
      throw new Error("Recepção não envia planejamento diário.");
    }
    if (!args.patientName.trim()) throw new Error("Informe o paciente.");
    if (!args.procedure.trim()) throw new Error("Descreva o procedimento planejado.");
    if (user.role === "aluno" && args.patientId) {
      const ok = await hasStudentAccess(ctx, userId, args.patientId);
      if (!ok) throw new Error("Você não tem acesso a este paciente.");
    }
    const now = Date.now();
    await ctx.db.insert("dailyPlans", {
      studentId: userId,
      studentName: user.name ?? "Aluno(a)",
      date: args.date,
      patientId: args.patientId || undefined,
      patientName: args.patientName.trim(),
      tooth: args.tooth?.trim() || undefined,
      procedure: args.procedure.trim(),
      notes: args.notes?.trim() || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Planejamentos do aluno logado. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    return ctx.db
      .query("dailyPlans")
      .withIndex("by_student", (q) => q.eq("studentId", userId))
      .collect();
  },
});

/** Professor/administração: fila de planejamentos (pendentes primeiro) e histórico. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireTeacher(ctx);
    const plans = await ctx.db.query("dailyPlans").collect();
    return plans.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

/** Quantidade de planejamentos pendentes (badge do professor/administração). */
export const countPending = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "professor" && user.role !== "admin") return 0;
    const plans = await ctx.db.query("dailyPlans").collect();
    return plans.filter((p) => p.status === "pending").length;
  },
});

export const review = mutation({
  args: {
    planId: v.id("dailyPlans"),
    procedureApproved: v.string(),
    notesApproved: v.optional(v.string()),
    status: planStatusValidator,
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireTeacher(ctx);
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Planejamento não encontrado.");
    await ctx.db.patch(args.planId, {
      procedureApproved: args.procedureApproved.trim(),
      notesApproved: args.notesApproved?.trim() || undefined,
      status: args.status,
      feedback: args.feedback?.trim() || undefined,
      professorId: userId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Aluno reenvia um planejamento devolvido para revisão (status "returned").
 * O parecer e as correções anteriores do professor são preservados.
 */
export const update = mutation({
  args: {
    planId: v.id("dailyPlans"),
    date: v.string(),
    tooth: v.optional(v.string()),
    procedure: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Planejamento não encontrado.");
    if (user.role === "aluno") {
      if (plan.studentId !== userId) {
        throw new Error("Este planejamento não é seu.");
      }
      if (plan.status !== "returned") {
        throw new Error(
          "Só é possível editar planejamentos devolvidos para revisão.",
        );
      }
    }
    if (!args.procedure.trim()) {
      throw new Error("Descreva o procedimento planejado.");
    }
    await ctx.db.patch(args.planId, {
      date: args.date,
      tooth: args.tooth?.trim() || undefined,
      procedure: args.procedure.trim(),
      notes: args.notes?.trim() || undefined,
      status: "pending",
      updatedAt: Date.now(),
    });
  },
});

/** Aluno remove planejamento ainda não avaliado. */
export const remove = mutation({
  args: { planId: v.id("dailyPlans") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Planejamento não encontrado.");
    if (user.role === "aluno") {
      if (plan.studentId !== userId) throw new Error("Este planejamento não é seu.");
      if (plan.status !== "pending") {
        throw new Error("Planejamento já avaliado não pode ser removido.");
      }
    }
    await ctx.db.delete(args.planId);
  },
});
