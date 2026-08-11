import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ────────────────────────────────────────────────────────────────────────────
// Roles
// ────────────────────────────────────────────────────────────────────────────
export const ROLES = ["recepcao", "professor", "aluno", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const roleValidator = v.union(...ROLES.map((r) => v.literal(r)));

export const ROLE_LABELS: Record<Role, string> = {
  recepcao: "Recepção",
  professor: "Professor(a)",
  aluno: "Aluno(a)",
  admin: "Administração",
};

/** Perfis com poder de autorização clínica (professor ou administração). */
export function isTeacher(user: { role?: string }): boolean {
  return user.role === "professor" || user.role === "admin";
}

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
// Sinais vitais — obrigatórios em cada procedimento/consulta
// ────────────────────────────────────────────────────────────────────────────
export interface VitalSigns {
  bloodPressure: string; // "120x80" mmHg
  heartRate: number; // bpm
  respiratoryRate: number; // irpm
  temperature: number; // °C
  oxygenSaturation: number; // %
}

export const vitalSignsValidator = v.object({
  bloodPressure: v.string(),
  heartRate: v.number(),
  respiratoryRate: v.number(),
  temperature: v.number(),
  oxygenSaturation: v.number(),
});

export const emptyVitalSigns = (): VitalSigns => ({
  bloodPressure: "",
  heartRate: 0,
  respiratoryRate: 0,
  temperature: 0,
  oxygenSaturation: 0,
});

/** Alerta clínico gerado a partir de sinais vitais fora da faixa de referência. */
export interface VitalSignAlert {
  key:
    | "bloodPressure"
    | "heartRate"
    | "respiratoryRate"
    | "temperature"
    | "oxygenSaturation";
  label: string;
  display: string;
  message: string;
  severity: "warning" | "danger";
}

/**
 * Avalia sinais vitais contra faixas de referência (adulto) e retorna os
 * alertas clínicos encontrados. Valores vazios/zero são ignorados.
 */
export function evaluateVitalSigns(vs: VitalSigns): VitalSignAlert[] {
  const alerts: VitalSignAlert[] = [];

  // Pressão arterial — "120x80", "120/80"…
  const bp = vs.bloodPressure.match(/(\d+)\s*[xX/]\s*(\d+)/);
  if (bp) {
    const sys = Number(bp[1]);
    const dia = Number(bp[2]);
    if (sys >= 140 || dia >= 90) {
      alerts.push({
        key: "bloodPressure",
        label: "Pressão arterial",
        display: `${sys}x${dia} mmHg`,
        message: "Pressão alta (hipertensão)",
        severity: "danger",
      });
    } else if (sys >= 130 || dia >= 85) {
      alerts.push({
        key: "bloodPressure",
        label: "Pressão arterial",
        display: `${sys}x${dia} mmHg`,
        message: "Pressão elevada",
        severity: "warning",
      });
    } else if (sys < 90 || dia < 60) {
      alerts.push({
        key: "bloodPressure",
        label: "Pressão arterial",
        display: `${sys}x${dia} mmHg`,
        message: "Pressão baixa (hipotensão)",
        severity: "warning",
      });
    }
  }

  // Frequência cardíaca — 60–100 bpm
  if (vs.heartRate > 0) {
    if (vs.heartRate > 100) {
      alerts.push({
        key: "heartRate",
        label: "Frequência cardíaca",
        display: `${vs.heartRate} bpm`,
        message: "Taquicardia (FC alta)",
        severity: "warning",
      });
    } else if (vs.heartRate < 60) {
      alerts.push({
        key: "heartRate",
        label: "Frequência cardíaca",
        display: `${vs.heartRate} bpm`,
        message: "Bradicardia (FC baixa)",
        severity: "warning",
      });
    }
  }

  // Frequência respiratória — 12–20 irpm
  if (vs.respiratoryRate > 0) {
    if (vs.respiratoryRate > 20) {
      alerts.push({
        key: "respiratoryRate",
        label: "Frequência respiratória",
        display: `${vs.respiratoryRate} irpm`,
        message: "Taquipneia (FR alta)",
        severity: "warning",
      });
    } else if (vs.respiratoryRate < 12) {
      alerts.push({
        key: "respiratoryRate",
        label: "Frequência respiratória",
        display: `${vs.respiratoryRate} irpm`,
        message: "Bradipneia (FR baixa)",
        severity: "warning",
      });
    }
  }

  // Temperatura axilar — 36,0–37,5 °C
  if (vs.temperature > 0) {
    if (vs.temperature >= 37.8) {
      alerts.push({
        key: "temperature",
        label: "Temperatura",
        display: `${vs.temperature}°C`,
        message: "Febre",
        severity: "danger",
      });
    } else if (vs.temperature >= 37.5) {
      alerts.push({
        key: "temperature",
        label: "Temperatura",
        display: `${vs.temperature}°C`,
        message: "Temperatura elevada (subfebril)",
        severity: "warning",
      });
    } else if (vs.temperature < 35) {
      alerts.push({
        key: "temperature",
        label: "Temperatura",
        display: `${vs.temperature}°C`,
        message: "Hipotermia",
        severity: "warning",
      });
    }
  }

  // Saturação de oxigênio — ≥ 95%
  if (vs.oxygenSaturation > 0) {
    if (vs.oxygenSaturation < 90) {
      alerts.push({
        key: "oxygenSaturation",
        label: "Saturação de oxigênio",
        display: `${vs.oxygenSaturation}%`,
        message: "Hipóxia grave",
        severity: "danger",
      });
    } else if (vs.oxygenSaturation < 95) {
      alerts.push({
        key: "oxygenSaturation",
        label: "Saturação de oxigênio",
        display: `${vs.oxygenSaturation}%`,
        message: "Saturação baixa (hipóxia)",
        severity: "warning",
      });
    }
  }

  return alerts;
}

// ────────────────────────────────────────────────────────────────────────────
// Procedimentos / anotações (um por consulta, com sinais vitais e assinaturas)
// ────────────────────────────────────────────────────────────────────────────
export interface ProcedureNote {
  id: string;
  title: string;
  description: string;
  tooth?: string;
  date?: string;
  vitalSigns: VitalSigns;
  signatures: Signature[];
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
  vitalSigns: vitalSignsValidator,
  signatures: v.array(signatureValidator),
  status: treatmentStatusValidator,
  createdBy: v.id("users"),
  createdByName: v.string(),
  updatedAt: v.number(),
});

// ────────────────────────────────────────────────────────────────────────────
// Periograma — sondagem periodontal (6 sítios por dente)
// ────────────────────────────────────────────────────────────────────────────
export interface PeriodontalSite {
  mv: number; // mesiovestibular
  v: number; // vestibular
  dv: number; // distovestibular
  ml: number; // mesiolingual
  l: number; // lingual
  dl: number; // distolingual
}

export const periodontalSiteValidator = v.object({
  mv: v.number(),
  v: v.number(),
  dv: v.number(),
  ml: v.number(),
  l: v.number(),
  dl: v.number(),
});

export const emptyPeriodontalSite = (): PeriodontalSite => ({
  mv: 0,
  v: 0,
  dv: 0,
  ml: 0,
  l: 0,
  dl: 0,
});

export interface PeriodontalTooth {
  tooth: number;
  pockets: PeriodontalSite; // profundidade de sondagem (mm)
  recession: PeriodontalSite; // recessão gengival (mm)
  mobility: number; // mobilidade 0–3
  furcation: number; // grau de furca 0–3
  bleeding: boolean; // sangramento à sondagem
}

export const periodontalToothValidator = v.object({
  tooth: v.number(),
  pockets: periodontalSiteValidator,
  recession: periodontalSiteValidator,
  mobility: v.number(),
  furcation: v.number(),
  bleeding: v.boolean(),
});

export const emptyPeriodontalTooth = (tooth: number): PeriodontalTooth => ({
  tooth,
  pockets: emptyPeriodontalSite(),
  recession: emptyPeriodontalSite(),
  mobility: 0,
  furcation: 0,
  bleeding: false,
});

export interface PeriodontalExam {
  id: string;
  date: string;
  teeth: PeriodontalTooth[];
  status: TreatmentStatus;
  createdBy: Id<"users">;
  createdByName: string;
  updatedAt: number;
}

export const periodontalExamValidator = v.object({
  id: v.string(),
  date: v.string(),
  teeth: v.array(periodontalToothValidator),
  status: treatmentStatusValidator,
  createdBy: v.id("users"),
  createdByName: v.string(),
  updatedAt: v.number(),
});

// ────────────────────────────────────────────────────────────────────────────
// Índice de placa — O'Leary (4 superfícies por dente)
// ────────────────────────────────────────────────────────────────────────────
export interface PlaqueTooth {
  tooth: number;
  mesial: boolean;
  distal: boolean;
  vestibular: boolean;
  lingual: boolean;
}

export const plaqueToothValidator = v.object({
  tooth: v.number(),
  mesial: v.boolean(),
  distal: v.boolean(),
  vestibular: v.boolean(),
  lingual: v.boolean(),
});

export const emptyPlaqueTooth = (tooth: number): PlaqueTooth => ({
  tooth,
  mesial: false,
  distal: false,
  vestibular: false,
  lingual: false,
});

export interface PlaqueExam {
  id: string;
  date: string;
  teeth: PlaqueTooth[];
  status: TreatmentStatus;
  createdBy: Id<"users">;
  createdByName: string;
  updatedAt: number;
}

export const plaqueExamValidator = v.object({
  id: v.string(),
  date: v.string(),
  teeth: v.array(plaqueToothValidator),
  status: treatmentStatusValidator,
  createdBy: v.id("users"),
  createdByName: v.string(),
  updatedAt: v.number(),
});

/** Percentual O'Leary: superfícies com placa / superfícies examinadas. */
export function oLearyIndex(teeth: PlaqueTooth[]): {
  percent: number;
  withPlaque: number;
  total: number;
} {
  let withPlaque = 0;
  let total = 0;
  for (const t of teeth) {
    total += 4;
    if (t.mesial) withPlaque++;
    if (t.distal) withPlaque++;
    if (t.vestibular) withPlaque++;
    if (t.lingual) withPlaque++;
  }
  return {
    percent: total === 0 ? 0 : Math.round((withPlaque / total) * 100),
    withPlaque,
    total,
  };
}

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
