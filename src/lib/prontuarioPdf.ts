import { jsPDF } from "jspdf";
import {
  ATM_DOR_MUSCULAR_LABELS,
  ATM_RUIDOS_LABELS,
  LINFONODO_STATUS_LABELS,
  MATERIAL_LABELS,
  PATIENT_STATUS_LABELS,
  SIGNATURE_ROLE_LABELS,
  TREATMENT_LABELS,
  evaluateVitalSigns,
  oLearyIndex,
  type Anamnese,
  type ExtraoralExam,
  type PeriodontalExam,
  type PeriodontalTooth,
  type PlaqueExam,
  type ProcedureNote,
  type Signature,
  type ToothRecord,
} from "@/convex/shared";

// ────────────────────────────────────────────────────────────────────────────
// Layout (A4 em mm)
// ────────────────────────────────────────────────────────────────────────────
const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 284;

const INK = [30, 41, 59] as const; // slate-800
const MUTED = [100, 116, 139] as const; // slate-500
const FAINT = [148, 163, 184] as const; // slate-400
const DARK = [15, 23, 42] as const; // slate-900

export interface ProntuarioPdfInput {
  patient: {
    fullName: string;
    rg?: string;
    cpf?: string;
    birthDate?: string;
    phone?: string;
    email?: string;
    address?: string;
    triage?: string;
    triageDetail?: string;
    status: string;
  };
  prontuario: {
    status: string;
    updatedAt: number;
    anamnese: Anamnese;
    teeth: ToothRecord[];
    procedures: ProcedureNote[];
    periodontalExams: PeriodontalExam[];
    plaqueExams: PlaqueExam[];
    extraoralExams: ExtraoralExam[];
    signatures: Signature[];
  };
  attachments: {
    name: string;
    kind: string;
    status: string;
    uploadedByName?: string;
    createdAt: number;
  }[];
}

interface PdfCtx {
  doc: jsPDF;
  y: number;
}

// jsPDF (fontes padrão, WinAnsi) não cobre caracteres como ₂, ≥, → — troca por
// equivalentes seguros para não corromper o texto no PDF.
function pdfSafe(s: string): string {
  return s
    .replace(/₂/g, "2")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[→←⇒⇐]/g, "-");
}

const fmtDate = (d?: string) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const fmtTimestamp = (t: number) =>
  new Date(t).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const statusLabel = (s: string) =>
  s === "pending" ? "Pendente" : s === "approved" ? "Aprovado" : "—";

/** Garante espaço vertical; vira página quando necessário. */
function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > FOOTER_Y) {
    ctx.doc.addPage();
    ctx.y = 18;
  }
}

function sectionTitle(ctx: PdfCtx, text: string) {
  ensureSpace(ctx, 16);
  ctx.y += 4;
  const doc = ctx.doc;
  doc.setFillColor(...DARK);
  doc.rect(MARGIN, ctx.y, CONTENT_W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(pdfSafe(text).toUpperCase(), MARGIN + 3, ctx.y + 5.6);
  ctx.y += 13;
}

/** Par "rótulo — valor" em duas colunas. */
function kv(ctx: PdfCtx, label: string, value?: string | number | null) {
  ensureSpace(ctx, 8);
  const doc = ctx.doc;
  const text = pdfSafe(String(value ?? "—"));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(label, MARGIN, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(text, CONTENT_W - 62);
  doc.text(lines, MARGIN + 62, ctx.y);
  ctx.y += lines.length * 4.3 + 1.6;
}

/** Parágrafo com rótulo em cima e texto quebrado embaixo. */
function paragraph(ctx: PdfCtx, label: string, value?: string) {
  ensureSpace(ctx, 12);
  const doc = ctx.doc;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(pdfSafe(label), MARGIN, ctx.y);
  ctx.y += 4.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(pdfSafe(value ?? "—"), CONTENT_W);
  doc.text(lines, MARGIN, ctx.y);
  ctx.y += lines.length * 4.3 + 2.4;
}

/** Lista de etiquetas (chips) em uma linha de texto. */
function chips(ctx: PdfCtx, label: string, items: string[], emptyText = "Nenhum registrado.") {
  paragraph(ctx, label, items.length > 0 ? items.map((i) => pdfSafe(i)).join(" · ") : emptyText);
}

/** Dimensões de um PNG a partir do cabeçalho (largura/altura em pixels). */
function pngSize(dataUrl: string): { w: number; h: number } | null {
  try {
    const idx = dataUrl.indexOf(",");
    if (idx < 0) return null;
    const bin = atob(dataUrl.slice(idx + 1));
    if (bin.length < 24 || bin.charCodeAt(0) !== 0x89) return null;
    const w =
      (bin.charCodeAt(16) << 24) |
      (bin.charCodeAt(17) << 16) |
      (bin.charCodeAt(18) << 8) |
      bin.charCodeAt(19);
    const h =
      (bin.charCodeAt(20) << 24) |
      (bin.charCodeAt(21) << 16) |
      (bin.charCodeAt(22) << 8) |
      bin.charCodeAt(23);
    if (!w || !h) return null;
    return { w, h };
  } catch {
    return null;
  }
}

function signatureBlock(ctx: PdfCtx, sig: Signature, label: string) {
  ensureSpace(ctx, 30);
  const doc = ctx.doc;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(pdfSafe(label), MARGIN, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(fmtTimestamp(sig.signedAt), PAGE_W - MARGIN, ctx.y, { align: "right" });
  ctx.y += 2.5;

  const size = pngSize(sig.dataUrl);
  const drawW = 55;
  const drawH = size ? Math.min(20, (drawW * size.h) / size.w) : 12;
  try {
    doc.addImage(sig.dataUrl, "PNG", MARGIN, ctx.y, drawW, drawH);
  } catch {
    // imagem inválida — segue apenas com o texto
  }
  ctx.y += Math.max(drawH, 12) + 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(MARGIN, ctx.y, MARGIN + drawW, ctx.y);
  ctx.y += 5;
}

function tableHeader(ctx: PdfCtx, columns: string[], widths: number[]) {
  const doc = ctx.doc;
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, ctx.y - 3.4, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  let x = MARGIN;
  columns.forEach((c, i) => {
    doc.text(c.toUpperCase(), x + 1.5, ctx.y, { maxWidth: widths[i] - 3 });
    x += widths[i];
  });
  ctx.y += 5.4;
}

function tableRow(ctx: PdfCtx, columns: string[], widths: number[]) {
  const doc = ctx.doc;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  let maxLines = 1;
  const wrapped: string[][] = columns.map((c, i) => {
    const lines = doc.splitTextToSize(pdfSafe(c), widths[i] - 3);
    maxLines = Math.max(maxLines, lines.length);
    return lines;
  });
  ensureSpace(ctx, maxLines * 3.8 + 3);
  let x = MARGIN;
  wrapped.forEach((lines, i) => {
    doc.text(lines, x + 1.5, ctx.y, { maxWidth: widths[i] - 3 });
    x += widths[i];
  });
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, ctx.y + maxLines * 3.8 - 0.4, MARGIN + CONTENT_W, ctx.y + maxLines * 3.8 - 0.4);
  ctx.y += maxLines * 3.8 + 1.8;
}

function deepestSite(t: PeriodontalTooth): number {
  const p = t.pockets;
  return Math.max(p.mv, p.v, p.dv, p.ml, p.l, p.dl);
}
function deepestRecession(t: PeriodontalTooth): number {
  const r = t.recession;
  return Math.max(r.mv, r.v, r.dv, r.ml, r.l, r.dl);
}

function vitalSignsLine(p: ProcedureNote): string {
  const vs = p.vitalSigns;
  const alerts = evaluateVitalSigns(vs);
  const base = `PA ${vs.bloodPressure || "—"} mmHg · FC ${vs.heartRate || "—"} bpm · FR ${
    vs.respiratoryRate || "—"
  } irpm · Temp ${vs.temperature || "—"}°C · SpO2 ${vs.oxygenSaturation || "—"}%`;
  if (alerts.length === 0) return base;
  return `${base}  |  ALERTA: ${alerts.map((a) => `${a.display} — ${a.message}`).join(" · ")}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Gerador principal
// ────────────────────────────────────────────────────────────────────────────

export function generateProntuarioPdf(input: ProntuarioPdfInput): {
  /** PDF pronto para envio ao storage do Convex. */
  blob: Blob;
  filename: string;
} {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setLineHeightFactor(1.15);
  const ctx: PdfCtx = { doc, y: 0 };
  const { patient, prontuario, attachments } = input;

  // ── Cabeçalho da primeira página ─────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 34, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("PRONTUÁRIO CLÍNICO ODONTOLÓGICO", MARGIN, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(pdfSafe(patient.fullName), MARGIN, 21.5);
  doc.setFontSize(8);
  doc.setTextColor(...FAINT);
  doc.text(
    `Documento gerado eletronicamente em ${fmtTimestamp(Date.now())} — uso restrito à administração`,
    MARGIN,
    28.5,
  );
  ctx.y = 40;

  // ── Identificação ────────────────────────────────────────────────────────
  sectionTitle(ctx, "Identificação do paciente");
  kv(ctx, "Nome completo", patient.fullName);
  kv(ctx, "CPF", patient.cpf);
  kv(ctx, "RG", patient.rg);
  kv(ctx, "Data de nascimento", patient.birthDate ? fmtDate(patient.birthDate) : undefined);
  kv(ctx, "Telefone", patient.phone);
  kv(ctx, "E-mail", patient.email);
  kv(ctx, "Endereço", patient.address);
  kv(ctx, "Finalidade (triagem)", patient.triage);
  kv(ctx, "Observações da triagem", patient.triageDetail);
  kv(
    ctx,
    "Status",
    PATIENT_STATUS_LABELS[patient.status as keyof typeof PATIENT_STATUS_LABELS] ??
      patient.status,
  );
  kv(
    ctx,
    "Prontuário",
    prontuario.status === "finalizado" ? "Finalizado" : "Em andamento",
  );
  kv(ctx, "Última atualização", prontuario.updatedAt ? fmtTimestamp(prontuario.updatedAt) : undefined);

  // ── Anamnese ─────────────────────────────────────────────────────────────
  sectionTitle(ctx, "Anamnese");
  const a = prontuario.anamnese;
  paragraph(ctx, "Queixa principal", a.queixaPrincipal);
  paragraph(ctx, "História da doença atual (HDA)", a.hda);
  chips(ctx, "Antecedentes médicos", a.historicoMedico ?? []);
  paragraph(ctx, "Medicamentos em uso", a.medicamentos);
  const alergias = a.alergias ?? { nega: false, itens: [], especificar: "" };
  const alergiaList = [...(alergias.itens ?? []), alergias.especificar].filter(Boolean);
  paragraph(
    ctx,
    "Alergias",
    alergias.nega || alergiaList.length === 0
      ? "NEGA"
      : `SIM — ${alergiaList.join("; ")}`,
  );
  paragraph(ctx, "Cirurgias anteriores", a.cirurgiasAnteriores);
  paragraph(ctx, "Hospitalizações", a.hospitalizacoes);
  paragraph(ctx, "Tendência a sangramento", a.sangramento);
  paragraph(ctx, "Gestação / lactação", a.gestacao);
  chips(ctx, "Hábitos", a.habitos ?? []);
  paragraph(ctx, "Exames anteriores", a.examesAnteriores);
  paragraph(ctx, "Especificar", a.especificar);
  paragraph(ctx, "Observações", a.observacoes);

  // ── Odontograma ──────────────────────────────────────────────────────────
  sectionTitle(ctx, "Odontograma");
  const toothCols = ["Dente", "Tratamento", "Material", "Classe", "Status", "Observação"];
  const toothWidths = [18, 50, 34, 14, 22, 44];
  tableHeader(ctx, toothCols, toothWidths);
  const treatments = prontuario.teeth
    .flatMap((t) => t.treatments.map((tr) => ({ tooth: t.tooth, tr })))
    .sort((x, y) => x.tooth - y.tooth);
  if (treatments.length === 0) {
    paragraph(ctx, "", "Nenhum tratamento registrado.");
  } else {
    treatments.forEach(({ tooth, tr }) => {
      tableRow(ctx, [
        String(tooth),
        TREATMENT_LABELS[tr.type as keyof typeof TREATMENT_LABELS] ?? tr.type,
        tr.material
          ? MATERIAL_LABELS[tr.material as keyof typeof MATERIAL_LABELS] ?? tr.material
          : "—",
        tr.classe ?? "—",
        statusLabel(tr.status),
        tr.note ?? "—",
      ], toothWidths);
    });
  }

  // ── Procedimentos ────────────────────────────────────────────────────────
  sectionTitle(ctx, "Procedimentos e anotações");
  const procedures = [...prontuario.procedures].sort((x, y) => y.updatedAt - x.updatedAt);
  if (procedures.length === 0) {
    paragraph(ctx, "", "Nenhum procedimento registrado.");
  } else {
    procedures.forEach((p, i) => {
      ensureSpace(ctx, 20);
      const doc = ctx.doc;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(`${i + 1}. ${pdfSafe(p.title)}`, MARGIN, ctx.y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(
        `${p.date ? fmtDate(p.date) : "—"} · ${statusLabel(p.status)}${p.tooth ? ` · Dente ${p.tooth}` : ""} · ${pdfSafe(p.createdByName)}`,
        PAGE_W - MARGIN,
        ctx.y,
        { align: "right" },
      );
      ctx.y += 5;
      paragraph(ctx, "Descrição", p.description || "—");
      paragraph(ctx, "Sinais vitais", vitalSignsLine(p));
      const procSignatures = p.signatures ?? [];
      if (procSignatures.length === 0) {
        paragraph(ctx, "Assinaturas do procedimento", "Nenhuma assinatura coletada.");
      } else {
        procSignatures.forEach((s) => {
          signatureBlock(ctx, s, `${SIGNATURE_ROLE_LABELS[s.role]} — ${s.name}`);
        });
      }
    });
  }

  // ── Periograma ───────────────────────────────────────────────────────────
  sectionTitle(ctx, "Periograma");
  const perio = [...prontuario.periodontalExams].sort((x, y) => y.updatedAt - x.updatedAt);
  if (perio.length === 0) {
    paragraph(ctx, "", "Nenhum periograma registrado.");
  } else {
    perio.forEach((e) => {
      ensureSpace(ctx, 14);
      const doc = ctx.doc;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(`${fmtDate(e.date)} — ${statusLabel(e.status)}`, MARGIN, ctx.y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(
        `${e.teeth.length} dentes · ${pdfSafe(e.createdByName)}`,
        PAGE_W - MARGIN,
        ctx.y,
        { align: "right" },
      );
      ctx.y += 4.4;
      e.teeth.forEach((t) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...INK);
        const line = `Dente ${t.tooth} · sondagem máx ${deepestSite(t)} mm · recessão máx ${deepestRecession(t)} mm · mobilidade ${t.mobility} · furca ${t.furcation} · sangramento: ${t.bleeding ? "sim" : "não"}`;
        const lines = doc.splitTextToSize(line, CONTENT_W - 6);
        ensureSpace(ctx, lines.length * 3.8 + 1);
        doc.text(lines, MARGIN + 4, ctx.y);
        ctx.y += lines.length * 3.8 + 1.2;
      });
      ctx.y += 2;
    });
  }

  // ── Índice de placa ──────────────────────────────────────────────────────
  sectionTitle(ctx, "Índice de placa (O'Leary)");
  const plaque = [...prontuario.plaqueExams].sort((x, y) => y.updatedAt - x.updatedAt);
  if (plaque.length === 0) {
    paragraph(ctx, "", "Nenhum índice de placa registrado.");
  } else {
    plaque.forEach((e) => {
      const idx = oLearyIndex(e.teeth);
      ensureSpace(ctx, 10);
      const doc = ctx.doc;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(
        `${fmtDate(e.date)} · ${idx.percent}% O'Leary (${idx.withPlaque}/${idx.total} superfícies) · ${statusLabel(e.status)} · ${pdfSafe(e.createdByName)}`,
        MARGIN,
        ctx.y,
        { maxWidth: CONTENT_W },
      );
      ctx.y += 6;
    });
  }

  // ── Exame extraoral ──────────────────────────────────────────────────────
  sectionTitle(ctx, "Exame extraoral (linfonodos e ATM)");
  const extraoral = [...prontuario.extraoralExams].sort((x, y) => y.updatedAt - x.updatedAt);
  if (extraoral.length === 0) {
    paragraph(ctx, "", "Nenhum exame extraoral registrado.");
  } else {
    extraoral.forEach((e) => {
      ensureSpace(ctx, 14);
      const doc = ctx.doc;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(`${fmtDate(e.date)} — ${statusLabel(e.status)}`, MARGIN, ctx.y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(pdfSafe(e.createdByName), PAGE_W - MARGIN, ctx.y, { align: "right" });
      ctx.y += 4.4;
      const palpaveis = e.linfonodos.filter((l) => l.status === "palpavel");
      const examinados = e.linfonodos.filter((l) => l.status !== "nao_examinado");
      if (examinados.length === 0) {
        paragraph(ctx, "Linfonodos", "Nenhum grupo examinado.");
      } else {
        const lines = examinados.map(
          (l) => `${l.grupo}: ${LINFONODO_STATUS_LABELS[l.status]}`,
        );
        paragraph(ctx, "Linfonodos", lines.join(" · "));
        if (palpaveis.length > 0) {
          paragraph(
            ctx,
            "",
            `${palpaveis.length} grupo(s) palpável(is) — considerar linfonodomegalia e investigação.`,
          );
        }
      }
      const atm = e.atm;
      const ruidos = (atm.ruidos ?? []).filter((r) => r !== "ausente");
      const dorMuscular = (atm.dorMuscular ?? []).filter((m) => m !== "nega");
      paragraph(
        ctx,
        "ATM",
        [
          `Dor à palpação: ${atm.dorPalpacao === "ausente" ? "ausente" : atm.dorPalpacao}`,
          `Ruídos: ${ruidos.length > 0 ? ruidos.map((r) => ATM_RUIDOS_LABELS[r] ?? r).join(", ") : "ausentes"}`,
          `Desvio de abertura: ${atm.desvioAbertura === "reto" ? "reto" : `para a ${atm.desvioAbertura}`}`,
          `Dor muscular: ${dorMuscular.length > 0 ? dorMuscular.map((m) => ATM_DOR_MUSCULAR_LABELS[m] ?? m).join(", ") : "nega"}`,
        ].join(" · "),
      );
      paragraph(ctx, "Observações (ATM)", atm.observacoes);
    });
  }

  // ── Assinaturas do prontuário ────────────────────────────────────────────
  sectionTitle(ctx, "Assinaturas do prontuário");
  const signatures = prontuario.signatures ?? [];
  if (signatures.length === 0) {
    paragraph(ctx, "", "Nenhuma assinatura coletada.");
  } else {
    signatures.forEach((s) => {
      signatureBlock(ctx, s, `${SIGNATURE_ROLE_LABELS[s.role]} — ${s.name}`);
    });
  }

  // ── Anexos ───────────────────────────────────────────────────────────────
  sectionTitle(ctx, "Anexos");
  const annexCols = ["Nome", "Tipo", "Status", "Enviado por", "Data"];
  const annexWidths = [60, 30, 26, 34, 32];
  tableHeader(ctx, annexCols, annexWidths);
  if (attachments.length === 0) {
    paragraph(ctx, "", "Nenhum anexo registrado.");
  } else {
    attachments.forEach((f) => {
      tableRow(
        ctx,
        [
          f.name,
          f.kind,
          f.status === "pending" ? "Pendente" : "Autorizado",
          f.uploadedByName ?? "—",
          f.createdAt ? fmtDate(new Date(f.createdAt).toISOString().slice(0, 10)) : "—",
        ],
        annexWidths,
      );
    });
  }

  // ── Nota final + rodapé em todas as páginas ──────────────────────────────
  ensureSpace(ctx, 14);
  ctx.doc.setFont("helvetica", "italic");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...MUTED);
  ctx.doc.text(
    "Documento confidencial, gerado eletronicamente. Uso exclusivo da administração da clínica.",
    MARGIN,
    ctx.y,
    { maxWidth: CONTENT_W },
  );

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...FAINT);
    doc.text(
      `Prontuário Clínico Odontológico · gerado em ${fmtTimestamp(Date.now())}`,
      MARGIN,
      FOOTER_Y + 5,
    );
    doc.text(`Página ${i} de ${pages}`, PAGE_W - MARGIN, FOOTER_Y + 5, { align: "right" });
  }

  const safeName = patient.fullName.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 60);
  const filename = `prontuario_${safeName || "paciente"}.pdf`;
  return { blob: doc.output("blob"), filename };
}
