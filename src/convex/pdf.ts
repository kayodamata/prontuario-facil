import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./users";

/** Garante que apenas a administração pode gerar/exportar PDFs. */
async function requireAdmin(ctx: Parameters<typeof requireUser>[0]) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Apenas a administração pode gerar PDFs do prontuário.");
  }
  return { userId, user };
}

/** URL única para o cliente enviar o PDF diretamente ao storage do Convex. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Registra o PDF exportado (auditoria) e retorna a URL pública do arquivo.
 * O cliente faz POST no uploadUrl e recebe o storageId antes de chamar isto.
 */
export const register = mutation({
  args: {
    patientId: v.id("patients"),
    storageId: v.id("_storage"),
    filename: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAdmin(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new Error("Paciente não encontrado.");
    await ctx.db.insert("pdfExports", {
      patientId: args.patientId,
      patientName: patient.fullName,
      filename: args.filename,
      size: args.size,
      storageId: args.storageId,
      createdBy: userId,
      createdByName: user.name ?? "Administração",
      createdAt: Date.now(),
    });
    return await ctx.storage.getUrl(args.storageId);
  },
});
