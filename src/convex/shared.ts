import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ────────────────────────────────────────────────────────────────────────────
// Roles
// ────────────────────────────────────────────────────────────────────────────
export const ROLES = ["recepcao", "professor", "aluno"] as const;
export type Role = (typeof ROLES)[number];
export const roleValidator = v.union(...ROLES.map((r) => v.literal(r)));

export const ROLE_LABELS: Record<Role, string> = {
  recepcao: "Recepção",
  professor: "Professor(a)",
  aluno: "Aluno(a)",
};

// ────────────────────────────────────────────────────────────────────────────
// Clinicas / triagem — "veio à instituição para qual finalidade?"
// ────────────────────────────────────────────────────────────────────────────
export const CLINICAS = [
  "HOF",
  "PERIODONTIA",
  "ENDODONTIA",
  "CIRURGIA",
  "DENTÍSTICA",
  "PRÓTESE",
  "DIAGNÓSTICO",
  "PEDIATRIA",
  "ODONTOLOGIA DIGITAL",
  "ORTODONTIA",
  "ESTOMATOLOGIA",
  "ODONTOGERIATRIA",
] as const;
export type Clinica = (typeof CLINICAS)[number] | "OUTRO";
export const clinicValidator = v.union(
  ...CLINICAS.map((c) => v.literal(c)),
  v.literal("OUTRO"),
);

// ────────────────────────────────────────────────────────────────────────────
// Odontograma — tratamentos, materiais, classes
// ────────────────────────────────────────────────────────────────────────────
export const TREATMENT_TYPES = [
  "restauracao",
  "coroa",
  "onlay",
  "inlay",
  "implante",
  "endodontia",
  "ausente",
] as const;
export type TreatmentType = (typeof TREATMENT_TYPES)[number];

export const MATERIALS = [
  "resina",
  "amalgama",
  "ceramica",
  "metal",
  "zirconia",
  "resina_hibrida",
  "outro",
] as const;
export type Material = (typeof MATERIALS)[number];

export const CLASSES = ["I", "II", "III", "IV", "V"] as const;
export type Classe = (typeof CLASSES)[number];

export const TREATMENT_STATUS = ["pending", "approved", "rejected"] as const;
export type TreatmentStatus = (typeof TREATMENT_STATUS)[number];

export const treatmentTypeValidator = v.union(
  ...TREATMENT_TYPES.map((t) => v.literal(t)),
);
export const materialValidator = v.union(...MATERIALS.map((m) => v.literal(m)));
export const classeValidator = v.union(...CLASSES.map((c) => v.literal(c)));
export const treatmentStatusValidator = v.union(
  ...TREATMENT_STATUS.map((s) => v.literal(s)),
);

export interface ToothTreatment {
  id: string;
  type: TreatmentType;
  material?: Material;
  materialOther?: string;
  classe?: Classe;
  componentProtesico?: string;
  condutos?: number[];
  note?: string;
  status: TreatmentStatus;
  createdBy: Id<"users">;
  createdByName?: string;
  updatedAt: number;
}

export interface ToothRecord {
  tooth: number;
  treatments: ToothTreatment[];
}

export const treatmentValidator = v.object({
  id: v.string(),
  type: treatmentTypeValidator,
  material: v.optional(materialValidator),
  materialOther: v.optional(v.string()),
  classe: v.optional(classeValidator),
  componentProtesico: v.optional(v.string()),
  condutos: v.optional(v.array(v.number())),
  note: v.optional(v.string()),
  status: treatmentStatusValidator,
  createdBy: v.id("users"),
  createdByName: v.optional(v.string()),
  updatedAt: v.number(),
});

export const toothRecordValidator = v.object({
  tooth: v.number(),
  treatments: v.array(treatmentValidator),
});

// ────────────────────────────────────────────────────────────────────────────
// Anamnese (estrutura clicável + campo final "especificar")
// ────────────────────────────────────────────────────────────────────────────
export interface Anamnese {
  queixaPrincipal: string;
  hda: string;
  historicoMedico: string[];
  medicamentos: string;
  habitos: string[];
  examesAnteriores: string;
  especificar: string;
  observacoes: string;
}

export const anamneseValidator = v.object({
  queixaPrincipal: v.optional(v.string()),
  hda: v.optional(v.string()),
  historicoMedico: v.optional(v.array(v.string())),
  medicamentos: v.optional(v.string()),
  habitos: v.optional(v.array(v.string())),
  examesAnteriores: v.optional(v.string()),
  especificar: v.optional(v.string()),
  observacoes: v.optional(v.string()),
});

export const emptyAnamnese = (): Anamnese => ({
  queixaPrincipal: "",
  hda: "",
  historicoMedico: [],
  medicamentos: "",
  habitos: [],
  examesAnteriores: "",
  especificar: "",
  observacoes: "",
});

export const ANMNESE_MEDICO_OPTIONS = [
  "Hipertensão",
  "Diabetes",
  "Cardiopatia",
  "Asma / alergia respiratória",
  "Alergia a medicamentos",
  "Hepatite",
  "HIV / imunossupressão",
  "Epilepsia",
  "Doença renal",
  "Distúrbios de coagulação",
  "Gestante",
  "Uso de anticoagulante",
  "Outro (especificar)",
] as const;

export const ANMNESE_HABITOS_OPTIONS = [
  "Tabagismo",
  "Etilismo",
  "Bruxismo",
  "Higiene oral insatisfatória",
  "Dieta cariogênica",
  "Respiração bucal",
  "Uso de aparelho ortodôntico",
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Procedimentos / anotações
// ────────────────────────────────────────────────────────────────────────────
export interface ProcedureNote {
  id: string;
  title: string;
  description: string;
  tooth?: string;
  date?: string;
  status: TreatmentStatus;
  createdBy: Id<"users">;
  createdByName: string;
  updatedAt: number;
}

export const procedureValidator = v.object({
  id: v.string(),
  title: v.string(),
  description: v.string(),
  tooth: v.optional(v.string()),
  date: v.optional(v.string()),
  status: treatmentStatusValidator,
  createdBy: v.id("users"),
  createdByName: v.string(),
  updatedAt: v.number(),
});

// ────────────────────────────────────────────────────────────────────────────
// Assinaturas — ordem: paciente → aluno → professor
// ────────────────────────────────────────────────────────────────────────────
export const SIGNATURE_ROLES = ["paciente", "aluno", "professor"] as const;
export type SignatureRole = (typeof SIGNATURE_ROLES)[number];
export const signatureRoleValidator = v.union(
  ...SIGNATURE_ROLES.map((r) => v.literal(r)),
);

export interface Signature {
  role: SignatureRole;
  name: string;
  dataUrl: string;
  signedAt: number;
}

export const signatureValidator = v.object({
  role: signatureRoleValidator,
  name: v.string(),
  dataUrl: v.string(),
  signedAt: v.number(),
});

export const SIGNATURE_ROLE_LABELS: Record<SignatureRole, string> = {
  paciente: "Paciente",
  aluno: "Aluno(a)",
  professor: "Professor(a)",
};

// ────────────────────────────────────────────────────────────────────────────
// Status genéricos
// ────────────────────────────────────────────────────────────────────────────
export const APPOINTMENT_STATUS = [
  "agendado",
  "confirmado",
  "compareceu",
  "faltou",
  "cancelado",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];
export const appointmentStatusValidator = v.union(
  ...APPOINTMENT_STATUS.map((s) => v.literal(s)),
);

export const PATIENT_STATUS = ["aguardando", "em_atendimento", "concluido"] as const;
export type PatientStatus = (typeof PATIENT_STATUS)[number];
export const patientStatusValidator = v.union(
  ...PATIENT_STATUS.map((s) => v.literal(s)),
);

export const PLAN_STATUS = ["pending", "approved", "returned"] as const;
export type PlanStatus = (typeof PLAN_STATUS)[number];
export const planStatusValidator = v.union(
  ...PLAN_STATUS.map((s) => v.literal(s)),
);

// ────────────────────────────────────────────────────────────────────────────
// Rótulos e cores (client-side rendering)
// ────────────────────────────────────────────────────────────────────────────
export const TREATMENT_LABELS: Record<TreatmentType, string> = {
  restauracao: "Restauração",
  coroa: "Coroa",
  onlay: "Onlay",
  inlay: "Inlay",
  implante: "Implante",
  endodontia: "Endodontia (canal)",
  ausente: "Dente ausente",
};

export const MATERIAL_LABELS: Record<Material, string> = {
  resina: "Resina",
  amalgama: "Amálgama",
  ceramica: "Cerâmica",
  metal: "Metal",
  zirconia: "Zircônia",
  resina_hibrida: "Resina híbrida",
  outro: "Outro",
};

/** Cores discretas para preenchimento dos materiais no odontograma */
export const MATERIAL_COLORS: Record<Material, string> = {
  resina: "#7ea6d4",
  amalgama: "#b4b0a8",
  ceramica: "#e4d6b8",
  metal: "#98a2ad",
  zirconia: "#cfc3de",
  resina_hibrida: "#7fb4a9",
  outro: "#c9c4b8",
};

export const CANAL_COLOR = "#e07b39"; // conduto obturado (laranja)
export const PENDING_COLOR = "#d97706"; // edição aguardando autorização (âmbar)
export const MISSING_COLOR = "#dc2626"; // dente ausente (X vermelho)

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  compareceu: "Compareceu",
  faltou: "Faltou",
  cancelado: "Cancelado",
};

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  aguardando: "Aguardando triagem",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  pending: "Aguardando avaliação",
  approved: "Aprovado",
  returned: "Devolvido para revisão",
};
