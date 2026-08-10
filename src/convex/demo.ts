import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { emptyAnamnese, type Clinica, type Material, type ToothTreatment, type TreatmentType } from "./shared";
import { requireRole } from "./users";
import { Doc, Id } from "./_generated/dataModel";

interface SamplePatient {
  fullName: string;
  rg: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email?: string;
  address: string;
  triage: Clinica;
  triageDetail: string;
}

/** Gera pacientes de demonstração (apenas professor) para testar o fluxo. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireRole(ctx, "professor");
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const samplePatients: SamplePatient[] = [
      {
        fullName: "Maria Aparecida da Silva",
        rg: "12.345.678-9",
        cpf: "123.456.789-00",
        birthDate: "1978-04-12",
        phone: "(11) 98877-1122",
        email: "maria.silva@example.com",
        address: "Rua das Flores, 123 – Centro, São Paulo/SP",
        triage: "ENDODONTIA",
        triageDetail: "Dor no dente 26, sensibilidade ao frio.",
      },
      {
        fullName: "João Pedro Santos",
        rg: "98.765.432-1",
        cpf: "987.654.321-00",
        birthDate: "1965-09-30",
        phone: "(11) 97766-3344",
        address: "Av. Brasil, 456 – Jardim Paulista, São Paulo/SP",
        triage: "PRÓTESE",
        triageDetail: "Encaminhado para avaliação protética (coroa no 11).",
      },
      {
        fullName: "Ana Beatriz Oliveira",
        rg: "55.444.333-2",
        cpf: "555.444.333-11",
        birthDate: "2001-01-25",
        phone: "(11) 96655-8899",
        address: "Rua Harmonia, 78 – Vila Madalena, São Paulo/SP",
        triage: "ORTODONTIA",
        triageDetail: "Avaliação ortodôntica inicial.",
      },
      {
        fullName: "Carlos Eduardo Pereira",
        rg: "11.222.333-4",
        cpf: "111.222.333-44",
        birthDate: "1990-07-15",
        phone: "(11) 95544-7788",
        address: "Rua Augusta, 900 – Consolação, São Paulo/SP",
        triage: "DENTÍSTICA",
        triageDetail: "Restaurações insatisfatórias em molares inferiores.",
      },
    ];

    // se já existe demo, não duplica
    const existing = await ctx.db.query("patients").collect();
    if (existing.some((p) => p.fullName === samplePatients[0].fullName)) {
      return { created: 0, message: "Dados de demonstração já existem." };
    }

    const students = (await ctx.db.query("users").collect()).filter(
      (u) => u.role === "aluno",
    );

    const patientIds: Id<"patients">[] = [];
    for (const sp of samplePatients) {
      const pid = await ctx.db.insert("patients", {
        fullName: sp.fullName,
        rg: sp.rg,
        cpf: sp.cpf,
        birthDate: sp.birthDate,
        phone: sp.phone,
        email: sp.email,
        address: sp.address,
        triage: sp.triage,
        triageDetail: sp.triageDetail,
        status: "em_atendimento",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      patientIds.push(pid);
      await ctx.db.insert("prontuarios", {
        patientId: pid,
        anamnese: {
          ...emptyAnamnese(),
          queixaPrincipal: sp.triageDetail ?? "",
          hda:
            sp.triage === "ENDODONTIA"
              ? "Dor intermitente há 2 semanas, piora à noite."
              : "",
          historicoMedico: sp.triage === "PRÓTESE" ? ["Hipertensão"] : [],
          medicamentos: sp.triage === "PRÓTESE" ? "Losartana 50mg" : "",
          observacoes: "",
        },
        anamneseStatus: "approved",
        teeth: [],
        procedures: [],
        signatures: [],
        status: "em_andamento",
        updatedAt: now,
      });
    }

    // odontograma de exemplo no paciente 1 (26, 11, 36, 16, 45, 24)
    const pront1 = await ctx.db
      .query("prontuarios")
      .withIndex("by_patient", (q) => q.eq("patientId", patientIds[0]))
      .unique();
    if (pront1) {
      const mk = (
        tooth: number,
        type: TreatmentType,
        extra: Partial<ToothTreatment> = {},
        status: ToothTreatment["status"] = "approved",
      ): ToothTreatment => ({
        id: `demo-${tooth}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        status,
        createdBy: userId,
        createdByName: "Dados de demonstração",
        updatedAt: now,
        ...extra,
      });
      await ctx.db.patch(pront1._id, {
        teeth: [
          {
            tooth: 26,
            treatments: [
              mk(26, "endodontia", { condutos: [0, 1, 2] }),
              mk(26, "coroa", { material: "zirconia" as Material }, "pending"),
            ],
          },
          {
            tooth: 11,
            treatments: [mk(11, "coroa", { material: "ceramica" as Material })],
          },
          {
            tooth: 36,
            treatments: [
              mk(
                36,
                "restauracao",
                { material: "amalgama" as Material, classe: "I" },
                "pending",
              ),
            ],
          },
          {
            tooth: 16,
            treatments: [mk(16, "ausente")],
          },
          {
            tooth: 45,
            treatments: [
              mk(
                45,
                "implante",
                { material: "zirconia" as Material, componentProtesico: "Cone morse" },
                "pending",
              ),
            ],
          },
          {
            tooth: 24,
            treatments: [
              mk(24, "restauracao", { material: "resina" as Material, classe: "IV" }),
            ],
          },
        ],
        updatedAt: now,
      });
    }

    // vincula pacientes 1 e 2 ao primeiro aluno, se existir
    if (students.length > 0) {
      const s = students[0];
      await ctx.db.insert("patientAccess", {
        patientId: patientIds[0],
        studentId: s._id,
        accessEnd: undefined,
        grantedBy: userId,
        createdAt: now,
      });
      await ctx.db.insert("patientAccess", {
        patientId: patientIds[1],
        studentId: s._id,
        accessEnd: undefined,
        grantedBy: userId,
        createdAt: now,
      });
      // exemplo de planejamento diário pendente do aluno
      await ctx.db.insert("dailyPlans", {
        studentId: s._id,
        studentName: s.name ?? "Aluno(a)",
        date: today,
        patientId: patientIds[0],
        patientName: samplePatients[0].fullName,
        tooth: "26",
        procedure:
          "Iniciar tratamento endodôntico do 26: acesso coronário e localização dos canais. " +
          "Após avaliação do professor, definir técnica de instrumentação.",
        notes:
          "Paciente relata dor. Solicitar radiografia periapical antes do procedimento.",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    // exemplo de agenda
    await ctx.db.insert("appointments", {
      patientId: patientIds[2],
      patientName: samplePatients[2].fullName,
      date: today,
      time: "08:30",
      clinic: "ORTODONTIA",
      reason: "Primeira consulta — avaliação ortodôntica.",
      studentId: students.length > 0 ? students[0]._id : undefined,
      studentName:
        students.length > 0 ? (students[0].name ?? undefined) : undefined,
      status: "agendado",
      createdBy: userId,
      createdAt: now,
    });

    return {
      created: patientIds.length,
      message: "Dados de demonstração criados.",
    };
  },
});
