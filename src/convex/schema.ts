import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";
import {
  anamneseValidator,
  appointmentStatusValidator,
  clinicValidator,
  extraoralExamValidator,
  patientStatusValidator,
  periodontalExamValidator,
  plaqueExamValidator,
  planStatusValidator,
  procedureValidator,
  roleValidator,
  signatureValidator,
  toothRecordValidator,
  treatmentStatusValidator,
} from "./shared";

export const ROLES = {
  RECEPCAO: "recepcao",
  PROFESSOR: "professor",
  ALUNO: "aluno",
  ADMIN: "admin",
} as const;

export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      cro: v.optional(v.string()), // número do CRO (professores)
      registration: v.optional(v.string()), // matrícula (alunos)
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Cadastro base de pacientes (recepção). Dados sensíveis ficam no prontuário.
    patients: defineTable({
      fullName: v.string(),
      rg: v.optional(v.string()),
      cpf: v.optional(v.string()),
      birthDate: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      address: v.optional(v.string()),
      triage: v.optional(clinicValidator), // finalidade: veio à instituição para quê?
      triageDetail: v.optional(v.string()),
      status: patientStatusValidator,
      createdBy: v.id("users"),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_createdAt", ["createdAt"]),

    // Prontuário clínico do paciente (dados sensíveis)
    prontuarios: defineTable({
      patientId: v.id("patients"),
      anamnese: anamneseValidator,
      anamneseDraft: v.optional(anamneseValidator),
      anamneseStatus: v.union(v.literal("approved"), v.literal("pending")),
      teeth: v.array(toothRecordValidator),
      procedures: v.array(procedureValidator),
      periodontalExams: v.array(periodontalExamValidator),
      plaqueExams: v.array(plaqueExamValidator),
      extraoralExams: v.array(extraoralExamValidator),
      signatures: v.array(signatureValidator),
      status: v.union(v.literal("em_andamento"), v.literal("finalizado")),
      updatedAt: v.number(),
    }).index("by_patient", ["patientId"]),

    // Permissão de acesso do aluno a um paciente (designado pelo professor)
    patientAccess: defineTable({
      patientId: v.id("patients"),
      studentId: v.id("users"),
      accessEnd: v.optional(v.string()), // até quando o acesso vale (yyyy-mm-dd)
      grantedBy: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_patient", ["patientId"]),

    // Agenda (recepção)
    appointments: defineTable({
      patientId: v.id("patients"),
      patientName: v.string(),
      date: v.string(), // yyyy-mm-dd
      time: v.string(),
      clinic: v.optional(clinicValidator),
      reason: v.optional(v.string()),
      studentId: v.optional(v.id("users")),
      studentName: v.optional(v.string()),
      status: appointmentStatusValidator,
      createdBy: v.id("users"),
      createdAt: v.number(),
    }).index("by_date", ["date"]),

    // Planejamento diário (aluno → professor)
    dailyPlans: defineTable({
      studentId: v.id("users"),
      studentName: v.string(),
      date: v.string(), // yyyy-mm-dd
      patientId: v.optional(v.id("patients")),
      patientName: v.string(),
      tooth: v.optional(v.string()),
      procedure: v.string(), // versão do aluno
      procedureApproved: v.optional(v.string()), // versão do professor (correções)
      notes: v.optional(v.string()),
      notesApproved: v.optional(v.string()),
      status: planStatusValidator,
      feedback: v.optional(v.string()),
      professorId: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_status", ["status"])
      .index("by_patient", ["patientId"]),

    // Anexos de exames e imagens (JPEG, PNG, PDF, WORD, DICOM…)
    attachments: defineTable({
      patientId: v.id("patients"),
      name: v.string(),
      type: v.string(), // mime type
      kind: v.string(), // imagem | radiografia | documento | dicom | outro
      size: v.number(),
      storageId: v.id("_storage"),
      uploadedBy: v.id("users"),
      uploadedByName: v.string(),
      status: treatmentStatusValidator, // pending → approved pelo professor
      approvedBy: v.optional(v.id("users")),
      createdAt: v.number(),
    }).index("by_patient", ["patientId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
