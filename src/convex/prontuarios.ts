import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  anamneseValidator,
  classeValidator,
  emptyAnamnese,
  emptyVitalSigns,
  isTeacher,
  materialValidator,
  periodontalExamValidator,
  plaqueExamValidator,
  signatureRoleValidator,
  treatmentTypeValidator,
  vitalSignsValidator,
  type Anamnese,
  type PeriodontalExam,
  type PlaqueExam,
  type Signature,
  type SignatureRole,
  type ToothRecord,
  type VitalSigns,
} from "./shared";
import { hasStudentAccess } from "./patients";
import { requireTeacher, requireUser } from "./users";
import { Doc, Id } from "./_generated/dataModel";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

async function getProntuario(ctx: Parameters<typeof requireUser>[0], patientId: Id<"patients">) {
  const prontuario = await ctx.db
    .query("prontuarios")
    .withIndex("by_patient", (q) => q.eq("patientId", patientId))
    .unique();
  if (!prontuario) throw new Error("Prontuário não encontrado.");
  // Prontuários criados antes da adição de periograma/índice de placa podem
  // não ter esses campos — normaliza para arrays vazios em todas as operações.
  return {
    ...prontuario,
    teeth: prontuario.teeth ?? [],
    // Procedimentos criados antes de sinais vitais/assinaturas por
    // procedimento não possuem esses campos — normaliza para valores vazios.
    procedures: (prontuario.procedures ?? []).map((p) => ({
      ...p,
      vitalSigns: p.vitalSigns ?? emptyVitalSigns(),
      signatures: p.signatures ?? [],
    })),
    periodontalExams: prontuario.periodontalExams ?? [],
    plaqueExams: prontuario.plaqueExams ?? [],
    signatures: prontuario.signatures ?? [],
  } as Doc<"prontuarios">;
}

/** Verifica acesso clínico (aluno precisa estar designado). */
async function requireClinicalAccess(
  ctx: Parameters<typeof requireUser>[0],
  patientId: Id<"patients">,
) {
  const { userId, user } = await requireUser(ctx);
  if (user.role === "recepcao") {
    throw new Error("Recepção não possui acesso aos dados clínicos.");
  }
  if (user.role === "aluno") {
    const ok = await hasStudentAccess(ctx, userId, patientId);
    if (!ok) throw new Error("Você não tem acesso a este paciente.");
  }
  return { userId, user };
}

/**
 * Prontuário completo conforme o perfil:
 * - recepção: apenas metadados (existem anexos, mas não abre dados sensíveis)
 * - aluno: prontuário completo do paciente designado
 * - professor: prontuário completo de todos os pacientes
 */
export const get = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const { userId, user } = await requireUser(ctx);
    const patient = await ctx.db.get(patientId);
    if (!patient) throw new Error("Paciente não encontrado.");
    if (user.role === "aluno") {
      const ok = await hasStudentAccess(ctx, userId, patientId);
      if (!ok) throw new Error("Você não tem acesso a este paciente.");
    }
    const prontuario = await getProntuario(ctx, patientId);
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .collect();

    // permissões — professor e administração têm acesso clínico total
    const canApprove = isTeacher(user);
    const canEdit = isTeacher(user) || user.role === "aluno";
    const canViewSensitive = isTeacher(user) || user.role === "aluno";
    const isReception = user.role === "recepcao";

    // dados sensíveis: recepção NÃO recebe conteúdo nem storageId dos anexos
    const safeProntuario = isReception
      ? {
          ...prontuario,
          anamnese: emptyAnamnese(),
          anamneseDraft: undefined,
          teeth: [],
          procedures: [],
          periodontalExams: [],
          plaqueExams: [],
          signatures: [],
        }
      : prontuario;

    const safeAttachments = await Promise.all(
      attachments.map(async (a) => ({
        _id: a._id,
        name: a.name,
        type: a.type,
        kind: a.kind,
        size: a.size,
        status: a.status,
        uploadedByName: a.uploadedByName,
        createdAt: a.createdAt,
        // recepção não recebe o storageId → não consegue abrir o arquivo
        storageId: isReception ? undefined : a.storageId,
        url: isReception ? undefined : await ctx.storage.getUrl(a.storageId),
      })),
    );

    // vínculo do aluno logado com este paciente
    let assignment: { studentId: string; studentName: string; accessEnd?: string } | null = null;
    if (user.role === "aluno") {
      const rows = await ctx.db
        .query("patientAccess")
        .withIndex("by_student", (q) => q.eq("studentId", userId))
        .collect();
      const row = rows.find((r) => r.patientId === patientId);
      if (row) {
        assignment = {
          studentId: userId,
          studentName: user.name ?? "Aluno(a)",
          accessEnd: row.accessEnd,
        };
      }
    } else if (user.role === "professor") {
      const rows = await ctx.db
        .query("patientAccess")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
      if (rows.length > 0) {
        const students = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("role"), "aluno"))
          .collect();
        const first = rows[0];
        const s = students.find((x) => x._id === first.studentId);
        assignment = {
          studentId: first.studentId,
          studentName: s?.name ?? "Aluno(a)",
          accessEnd: first.accessEnd,
        };
      }
    }

    return {
      patient,
      prontuario: safeProntuario,
      attachments: safeAttachments,
      assignment,
      permissions: { canApprove, canEdit, canViewSensitive, isReception },
    };
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Odontograma
// ────────────────────────────────────────────────────────────────────────────

export const saveTooth = mutation({
  args: {
    patientId: v.id("patients"),
    tooth: v.number(),
    treatment: v.object({
      type: treatmentTypeValidator,
      material: v.optional(materialValidator),
      materialOther: v.optional(v.string()),
      classe: v.optional(classeValidator),
      componentProtesico: v.optional(v.string()),
      condutos: v.optional(v.array(v.number())),
      note: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    const now = Date.now();

    const full: (typeof prontuario.teeth)[number]["treatments"][number] = {
      id: newId(),
      type: args.treatment.type,
      material: args.treatment.material,
      materialOther: args.treatment.materialOther?.trim() || undefined,
      classe: args.treatment.classe,
      componentProtesico: args.treatment.componentProtesico?.trim() || undefined,
      condutos: args.treatment.condutos,
      note: args.treatment.note?.trim() || undefined,
      status: isTeacher(user) ? "approved" : "pending",
      createdBy: userId,
      createdByName: user.name ?? "Usuário",
      updatedAt: now,
    };

    let teeth = prontuario.teeth;
    const idx = teeth.findIndex((t) => t.tooth === args.tooth);
    let record: ToothRecord;
    if (idx >= 0) {
      record = teeth[idx];
      // dente ausente substitui tudo que havia no dente
      if (args.treatment.type === "ausente") {
        record = { ...record, treatments: [full] };
      } else {
        record = {
          ...record,
          treatments: [...record.treatments, full],
        };
      }
      teeth = [...teeth.slice(0, idx), record, ...teeth.slice(idx + 1)];
    } else {
      record = { tooth: args.tooth, treatments: [full] };
      teeth = [...teeth, record];
    }

    await ctx.db.patch(prontuario._id, { teeth, updatedAt: now });
    return full;
  },
});

export const approveTreatment = mutation({
  args: {
    patientId: v.id("patients"),
    tooth: v.number(),
    treatmentId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    const teeth = prontuario.teeth.map((t) => {
      if (t.tooth !== args.tooth) return t;
      return {
        ...t,
        treatments: t.treatments.map((tr) =>
          tr.id === args.treatmentId ? { ...tr, status: "approved" as const } : tr,
        ),
      };
    });
    await ctx.db.patch(prontuario._id, {
      teeth,
      updatedAt: Date.now(),
    });
  },
});

export const rejectTreatment = mutation({
  args: {
    patientId: v.id("patients"),
    tooth: v.number(),
    treatmentId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    const teeth = prontuario.teeth.map((t) => {
      if (t.tooth !== args.tooth) return t;
      return {
        ...t,
        treatments: t.treatments.filter((tr) => tr.id !== args.treatmentId),
      };
    });
    await ctx.db.patch(prontuario._id, { teeth, updatedAt: Date.now() });
  },
});

export const removeTreatment = mutation({
  args: {
    patientId: v.id("patients"),
    tooth: v.number(),
    treatmentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    const teeth = prontuario.teeth.map((t) => {
      if (t.tooth !== args.tooth) return t;
      return {
        ...t,
        treatments: t.treatments.filter((tr) => {
          if (tr.id !== args.treatmentId) return true;
          if (user.role === "aluno") {
            // aluno só remove o que é dele e ainda não foi aprovado
            return !(tr.createdBy === userId && tr.status === "pending");
          }
          return false;
        }),
      };
    });
    await ctx.db.patch(prontuario._id, { teeth, updatedAt: Date.now() });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Anamnese
// ────────────────────────────────────────────────────────────────────────────

export const saveAnamnese = mutation({
  args: { patientId: v.id("patients"), anamnese: anamneseValidator },
  handler: async (ctx, args) => {
    const { user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    const now = Date.now();
    if (isTeacher(user)) {
      await ctx.db.patch(prontuario._id, {
        anamnese: args.anamnese as Anamnese,
        anamneseDraft: undefined,
        anamneseStatus: "approved",
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(prontuario._id, {
        anamneseDraft: args.anamnese as Anamnese,
        anamneseStatus: "pending",
        updatedAt: now,
      });
    }
  },
});

export const approveAnamnese = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    if (!prontuario.anamneseDraft) throw new Error("Nada pendente para aprovar.");
    await ctx.db.patch(prontuario._id, {
      anamnese: prontuario.anamneseDraft,
      anamneseDraft: undefined,
      anamneseStatus: "approved",
      updatedAt: Date.now(),
    });
  },
});

export const rejectAnamnese = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      anamneseDraft: undefined,
      anamneseStatus: "approved",
      updatedAt: Date.now(),
    });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Procedimentos / anotações
// ────────────────────────────────────────────────────────────────────────────

export const saveProcedure = mutation({
  args: {
    patientId: v.id("patients"),
    title: v.string(),
    description: v.string(),
    tooth: v.optional(v.string()),
    date: v.optional(v.string()),
    vitalSigns: vitalSignsValidator,
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    const title = args.title.trim();
    if (!title) throw new Error("Informe um título para a anotação.");
    // Sinais vitais são obrigatórios em todo procedimento/consulta.
    const vs = args.vitalSigns;
    if (
      !vs.bloodPressure.trim() ||
      vs.heartRate <= 0 ||
      vs.respiratoryRate <= 0 ||
      vs.temperature <= 0 ||
      vs.oxygenSaturation <= 0
    ) {
      throw new Error(
        "Preencha todos os sinais vitais (PA, FC, FR, temperatura e SpO₂).",
      );
    }
    const item = {
      id: newId(),
      title,
      description: args.description.trim(),
      tooth: args.tooth?.trim() || undefined,
      date: args.date || new Date().toISOString().slice(0, 10),
      vitalSigns: {
        bloodPressure: vs.bloodPressure.trim(),
        heartRate: vs.heartRate,
        respiratoryRate: vs.respiratoryRate,
        temperature: vs.temperature,
        oxygenSaturation: vs.oxygenSaturation,
      } as VitalSigns,
      signatures: [] as Signature[],
      status: isTeacher(user) ? "approved" as const : "pending" as const,
      createdBy: userId,
      createdByName: user.name ?? "Usuário",
      updatedAt: Date.now(),
    };
    await ctx.db.patch(prontuario._id, {
      procedures: [...prontuario.procedures, item],
      updatedAt: Date.now(),
    });
    return item.id;
  },
});

export const approveProcedure = mutation({
  args: { patientId: v.id("patients"), procedureId: v.string() },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      procedures: prontuario.procedures.map((p) =>
        p.id === args.procedureId ? { ...p, status: "approved" as const } : p,
      ),
      updatedAt: Date.now(),
    });
  },
});

export const rejectProcedure = mutation({
  args: { patientId: v.id("patients"), procedureId: v.string() },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      procedures: prontuario.procedures.filter((p) => p.id !== args.procedureId),
      updatedAt: Date.now(),
    });
  },
});

export const removeProcedure = mutation({
  args: { patientId: v.id("patients"), procedureId: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      procedures: prontuario.procedures.filter((p) => {
        if (p.id !== args.procedureId) return true;
        if (user.role === "aluno") {
          return !(p.createdBy === userId && p.status === "pending");
        }
        return false;
      }),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Assinatura de um procedimento específico, em ordem obrigatória:
 * paciente → aluno(a) → professor(a). A assinatura do professor efetiva
 * (aprova) o procedimento.
 */
export const signProcedure = mutation({
  args: {
    patientId: v.id("patients"),
    procedureId: v.string(),
    role: signatureRoleValidator,
    name: v.string(),
    dataUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    const procedure = prontuario.procedures.find(
      (p) => p.id === args.procedureId,
    );
    if (!procedure) throw new Error("Procedimento não encontrado.");
    const now = Date.now();

    const order: SignatureRole[] = ["paciente", "aluno", "professor"];
    const expected = order[procedure.signatures.length];
    if (!expected) {
      throw new Error("Todas as assinaturas deste procedimento já foram coletadas.");
    }
    if (args.role !== expected) {
      throw new Error(
        `Assinatura fora de ordem: aguardando assinatura do(a) ${expected}.`,
      );
    }
    if (args.role === "professor" && !isTeacher(user)) {
      throw new Error("Apenas o(a) professor(a) pode assinar como professor(a).");
    }
    if (args.role === "aluno" && user.role === "recepcao") {
      throw new Error("A recepção não pode assinar como aluno(a).");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Informe o nome de quem assina.");
    if (!args.dataUrl) throw new Error("Assinatura vazia.");

    const signatures = [
      ...procedure.signatures,
      { role: args.role, name, dataUrl: args.dataUrl, signedAt: now },
    ];
    const updated: typeof procedure = {
      ...procedure,
      signatures,
      // a assinatura do professor aprova/efetiva o procedimento
      status: args.role === "professor" ? "approved" : procedure.status,
      updatedAt: now,
    };
    await ctx.db.patch(prontuario._id, {
      procedures: prontuario.procedures.map((p) =>
        p.id === args.procedureId ? updated : p,
      ),
      updatedAt: now,
    });
    return signatures.length;
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Periograma — sondagem periodontal
// ────────────────────────────────────────────────────────────────────────────

export const savePeriodontal = mutation({
  args: {
    patientId: v.id("patients"),
    date: v.string(),
    teeth: v.array(v.object({
      tooth: v.number(),
      pockets: v.object({
        mv: v.number(), v: v.number(), dv: v.number(),
        ml: v.number(), l: v.number(), dl: v.number(),
      }),
      recession: v.object({
        mv: v.number(), v: v.number(), dv: v.number(),
        ml: v.number(), l: v.number(), dl: v.number(),
      }),
      mobility: v.number(),
      furcation: v.number(),
      bleeding: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    const exam: PeriodontalExam = {
      id: newId(),
      date: args.date || new Date().toISOString().slice(0, 10),
      teeth: args.teeth.filter((t) =>
        // guarda apenas dentes com algum dado registrado
        t.pockets.mv + t.pockets.v + t.pockets.dv + t.pockets.ml + t.pockets.l + t.pockets.dl > 0 ||
        t.bleeding ||
        t.mobility > 0 ||
        t.furcation > 0,
      ),
      status: isTeacher(user) ? "approved" : "pending",
      createdBy: userId,
      createdByName: user.name ?? "Usuário",
      updatedAt: Date.now(),
    };
    await ctx.db.patch(prontuario._id, {
      periodontalExams: [...prontuario.periodontalExams, exam],
      updatedAt: Date.now(),
    });
    return exam.id;
  },
});

export const approvePeriodontal = mutation({
  args: { patientId: v.id("patients"), examId: v.string() },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      periodontalExams: prontuario.periodontalExams.map((e) =>
        e.id === args.examId ? { ...e, status: "approved" as const } : e,
      ),
      updatedAt: Date.now(),
    });
  },
});

export const rejectPeriodontal = mutation({
  args: { patientId: v.id("patients"), examId: v.string() },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      periodontalExams: prontuario.periodontalExams.filter((e) => e.id !== args.examId),
      updatedAt: Date.now(),
    });
  },
});

export const removePeriodontal = mutation({
  args: { patientId: v.id("patients"), examId: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      periodontalExams: prontuario.periodontalExams.filter((e) => {
        if (e.id !== args.examId) return true;
        if (user.role === "aluno") {
          return !(e.createdBy === userId && e.status === "pending");
        }
        return false;
      }),
      updatedAt: Date.now(),
    });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Índice de placa (O'Leary)
// ────────────────────────────────────────────────────────────────────────────

export const savePlaque = mutation({
  args: {
    patientId: v.id("patients"),
    date: v.string(),
    teeth: v.array(v.object({
      tooth: v.number(),
      mesial: v.boolean(),
      distal: v.boolean(),
      vestibular: v.boolean(),
      lingual: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    const exam: PlaqueExam = {
      id: newId(),
      date: args.date || new Date().toISOString().slice(0, 10),
      teeth: args.teeth.filter((t) =>
        t.mesial || t.distal || t.vestibular || t.lingual,
      ),
      status: isTeacher(user) ? "approved" : "pending",
      createdBy: userId,
      createdByName: user.name ?? "Usuário",
      updatedAt: Date.now(),
    };
    await ctx.db.patch(prontuario._id, {
      plaqueExams: [...prontuario.plaqueExams, exam],
      updatedAt: Date.now(),
    });
    return exam.id;
  },
});

export const approvePlaque = mutation({
  args: { patientId: v.id("patients"), examId: v.string() },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      plaqueExams: prontuario.plaqueExams.map((e) =>
        e.id === args.examId ? { ...e, status: "approved" as const } : e,
      ),
      updatedAt: Date.now(),
    });
  },
});

export const rejectPlaque = mutation({
  args: { patientId: v.id("patients"), examId: v.string() },
  handler: async (ctx, args) => {
    await requireTeacher(ctx);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      plaqueExams: prontuario.plaqueExams.filter((e) => e.id !== args.examId),
      updatedAt: Date.now(),
    });
  },
});

export const removePlaque = mutation({
  args: { patientId: v.id("patients"), examId: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    await ctx.db.patch(prontuario._id, {
      plaqueExams: prontuario.plaqueExams.filter((e) => {
        if (e.id !== args.examId) return true;
        if (user.role === "aluno") {
          return !(e.createdBy === userId && e.status === "pending");
        }
        return false;
      }),
      updatedAt: Date.now(),
    });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Assinaturas — ordem: paciente → aluno → professor
// ────────────────────────────────────────────────────────────────────────────

export const sign = mutation({
  args: {
    patientId: v.id("patients"),
    role: signatureRoleValidator,
    name: v.string(),
    dataUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireClinicalAccess(ctx, args.patientId);
    const prontuario = await getProntuario(ctx, args.patientId);
    const now = Date.now();

    const order: SignatureRole[] = ["paciente", "aluno", "professor"];
    const expected = order[prontuario.signatures.length];
    if (!expected) throw new Error("Todas as assinaturas já foram coletadas.");
    if (args.role !== expected) {
      throw new Error(
        `Assinatura fora de ordem: aguardando assinatura do(a) ${expected}.`,
      );
    }
    if (args.role === "professor" && !isTeacher(user)) {
      throw new Error("Apenas o(a) professor(a) pode assinar como professor(a).");
    }
    if (args.role === "aluno" && user.role === "recepcao") {
      throw new Error("A recepção não pode assinar como aluno(a).");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Informe o nome de quem assina.");
    if (!args.dataUrl) throw new Error("Assinatura vazia.");

    const signatures = [...prontuario.signatures, { role: args.role, name, dataUrl: args.dataUrl, signedAt: now }];

    // Assinatura do professor finaliza o prontuário e efetiva TODAS as alterações pendentes
    const patch: Partial<Doc<"prontuarios">> = { signatures, updatedAt: now };
    if (args.role === "professor") {
      patch.status = "finalizado";
      patch.teeth = prontuario.teeth.map((t) => ({
        ...t,
        treatments: t.treatments.map((tr) =>
          tr.status === "pending" ? { ...tr, status: "approved" as const } : tr,
        ),
      }));
      patch.procedures = prontuario.procedures.map((p) =>
        p.status === "pending" ? { ...p, status: "approved" as const } : p,
      );
      patch.periodontalExams = prontuario.periodontalExams.map((e) =>
        e.status === "pending" ? { ...e, status: "approved" as const } : e,
      );
      patch.plaqueExams = prontuario.plaqueExams.map((e) =>
        e.status === "pending" ? { ...e, status: "approved" as const } : e,
      );
      if (prontuario.anamneseDraft) {
        patch.anamnese = prontuario.anamneseDraft;
        patch.anamneseDraft = undefined;
        patch.anamneseStatus = "approved";
      }
      const pendingAttachments = await ctx.db
        .query("attachments")
        .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
        .collect();
      for (const a of pendingAttachments) {
        if (a.status === "pending") {
          await ctx.db.patch(a._id, { status: "approved", approvedBy: userId });
        }
      }
    }
    await ctx.db.patch(prontuario._id, patch);
    return signatures.length;
  },
});
