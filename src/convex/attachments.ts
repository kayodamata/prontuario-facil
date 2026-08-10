import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { hasStudentAccess } from "./patients";
import { requireRole, requireUser } from "./users";

/** URL para upload direto ao armazenamento do Convex. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    if (user.role === "recepcao") {
      throw new Error("Recepção não anexa exames.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const register = mutation({
  args: {
    patientId: v.id("patients"),
    name: v.string(),
    type: v.string(),
    kind: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role === "recepcao") {
      throw new Error("Recepção não anexa exames.");
    }
    if (user.role === "aluno") {
      const ok = await hasStudentAccess(ctx, userId, args.patientId);
      if (!ok) throw new Error("Você não tem acesso a este paciente.");
    }
    await ctx.db.insert("attachments", {
      patientId: args.patientId,
      name: args.name,
      type: args.type,
      kind: args.kind,
      size: args.size,
      storageId: args.storageId,
      uploadedBy: userId,
      uploadedByName: user.name ?? "Usuário",
      // aluno envia → aguarda autorização do professor; professor anexa direto
      status: user.role === "professor" ? "approved" : "pending",
      approvedBy: user.role === "professor" ? userId : undefined,
      createdAt: Date.now(),
    });
  },
});

export const approve = mutation({
  args: { attachmentId: v.id("attachments") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "professor");
    const a = await ctx.db.get(args.attachmentId);
    if (!a) throw new Error("Anexo não encontrado.");
    await ctx.db.patch(args.attachmentId, {
      status: "approved",
      approvedBy: userId,
    });
  },
});

export const reject = mutation({
  args: { attachmentId: v.id("attachments") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "professor");
    const a = await ctx.db.get(args.attachmentId);
    if (!a) throw new Error("Anexo não encontrado.");
    await ctx.storage.delete(a.storageId);
    await ctx.db.delete(args.attachmentId);
  },
});

/** Aluno remove o próprio anexo enquanto estiver pendente. */
export const remove = mutation({
  args: { attachmentId: v.id("attachments") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const a = await ctx.db.get(args.attachmentId);
    if (!a) throw new Error("Anexo não encontrado.");
    if (user.role === "aluno") {
      if (a.uploadedBy !== userId || a.status !== "pending") {
        throw new Error("Só é possível remover o próprio anexo ainda pendente.");
      }
    }
    await ctx.storage.delete(a.storageId);
    await ctx.db.delete(args.attachmentId);
  },
});
