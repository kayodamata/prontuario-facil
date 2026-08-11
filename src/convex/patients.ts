import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { clinicValidator, emptyAnamnese, isTeacher, patientStatusValidator } from "./shared";
import { requireTeacher, requireUser } from "./users";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    fullName: v.string(),
    rg: v.optional(v.string()),
    cpf: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    triage: v.optional(clinicValidator),
    triageDetail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role === "aluno") {
      throw new Error("Alunos(as) não podem cadastrar pacientes.");
    }
    const fullName = args.fullName.trim();
    if (!fullName) throw new Error("Informe o nome completo do paciente.");
    const now = Date.now();
    const patientId = await ctx.db.insert("patients", {
      fullName,
      rg: args.rg?.trim() || undefined,
      cpf: args.cpf?.trim() || undefined,
      birthDate: args.birthDate || undefined,
      phone: args.phone?.trim() || undefined,
      email: args.email?.trim() || undefined,
      address: args.address?.trim() || undefined,
      triage: args.triage,
      triageDetail: args.triageDetail?.trim() || undefined,
      status: args.triage ? "em_atendimento" : "aguardando",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    // prontuário vazio é criado junto
    await ctx.db.insert("prontuarios", {
      patientId,
      anamnese: emptyAnamnese(),
      anamneseStatus: "approved",
      teeth: [],
      procedures: [],
      periodontalExams: [],
      plaqueExams: [],
      extraoralExams: [],
      signatures: [],
      status: "em_andamento",
      updatedAt: now,
    });
    return patientId;
  },
});

/** Se o aluno tem acesso ativo ao paciente (designado, dentro do prazo). */
export async function hasStudentAccess(
  ctx: Parameters<typeof requireUser>[0],
  studentId: Id<"users">,
  patientId: Id<"patients">,
) {
  const rows = await ctx.db
    .query("patientAccess")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  const row = rows.find((r) => r.patientId === patientId);
  if (!row) return false;
  if (row.accessEnd) {
    const today = new Date().toISOString().slice(0, 10);
    if (row.accessEnd < today) return false;
  }
  return true;
}

/**
 * Lista de pacientes conforme o perfil:
 * - recepção / professor: banco completo
 * - aluno: apenas pacientes designados
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    const patients = await ctx.db.query("patients").collect();
    if (user.role === "aluno") {
      const access = await ctx.db
        .query("patientAccess")
        .withIndex("by_student", (q) => q.eq("studentId", userId))
        .collect();
      const ids = new Set<string>();
      const today = new Date().toISOString().slice(0, 10);
      for (const a of access) {
        if (!a.accessEnd || a.accessEnd >= today) ids.add(a.patientId);
      }
      return patients.filter((p) => ids.has(p._id));
    }
    return patients;
  },
});

export const get = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const { userId, user } = await requireUser(ctx);
    const patient = await ctx.db.get(patientId);
    if (!patient) throw new Error("Paciente não encontrado.");
    if (user.role === "aluno") {
      const ok = await hasStudentAccess(ctx, userId, patientId);
      if (!ok) {
        throw new Error("Você não tem acesso a este paciente.");
      }
    }
    return patient;
  },
});

/** Recepção atualiza triagem / finalidade e encaminha para atendimento. */
export const updateTriage = mutation({
  args: {
    patientId: v.id("patients"),
    triage: clinicValidator,
    triageDetail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "recepcao" && !isTeacher(user)) {
      throw new Error("Apenas recepção, professor ou administração podem triar pacientes.");
    }
    await ctx.db.patch(args.patientId, {
      triage: args.triage,
      triageDetail: args.triageDetail?.trim() || undefined,
      status: "em_atendimento",
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    patientId: v.id("patients"),
    status: patientStatusValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "recepcao" && !isTeacher(user)) {
      throw new Error("Acesso restrito.");
    }
    await ctx.db.patch(args.patientId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/** Professor designa um paciente a um(a) aluno(a). Acesso expira em accessEnd. */
export const assign = mutation({
  args: {
    patientId: v.id("patients"),
    studentId: v.id("users"),
    accessEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireTeacher(ctx);
    const student = await ctx.db.get(args.studentId);
    if (!student || student.role !== "aluno") {
      throw new Error("Selecione um(a) aluno(a) válido(a).");
    }
    // remove vínculo anterior para o mesmo par
    const existing = await ctx.db
      .query("patientAccess")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const e of existing) {
      if (e.studentId === args.studentId) await ctx.db.delete(e._id);
    }
    await ctx.db.insert("patientAccess", {
      patientId: args.patientId,
      studentId: args.studentId,
      accessEnd: args.accessEnd || undefined,
      grantedBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const unassign = mutation({
  args: { patientId: v.id("patients"), studentId: v.id("users") },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const existing = await ctx.db
      .query("patientAccess")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const e of existing) {
      if (e.studentId === args.studentId) await ctx.db.delete(e._id);
    }
  },
});
