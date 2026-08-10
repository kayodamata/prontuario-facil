import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { roleValidator } from "./shared";
import { v } from "convex/values";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }
    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

export type AuthCtx = QueryCtx | MutationCtx;

/** Require a signed-in user; throws otherwise. */
export async function requireUser(ctx: AuthCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Não autenticado.");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Usuário não encontrado.");
  return { userId, user };
}

/** Require a signed-in user with a specific role. */
export async function requireRole(ctx: AuthCtx, role: "recepcao" | "professor" | "aluno") {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== role) {
    throw new Error("Acesso restrito: necessário perfil de " + role + ".");
  }
  return { userId, user };
}

/** Require aluno ou professor (perfis clínicos com acesso ao prontuário). */
export async function requireClinical(ctx: AuthCtx) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== "aluno" && user.role !== "professor") {
    throw new Error("Acesso restrito a perfis clínicos.");
  }
  return { userId, user };
}

/** Assinatura da conta: o usuário escolhe o nível de acesso no primeiro login. */
export const completeProfile = mutation({
  args: {
    role: roleValidator,
    name: v.string(),
    cro: v.optional(v.string()),
    registration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role) {
      throw new Error("Perfil já configurado para esta conta.");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Informe seu nome completo.");
    if (args.role === "professor" && !args.cro?.trim()) {
      throw new Error("Professor(a) precisa informar o número do CRO.");
    }
    await ctx.db.patch(userId, {
      role: args.role,
      name,
      cro: args.role === "professor" ? args.cro?.trim() : undefined,
      registration:
        args.role === "aluno" ? args.registration?.trim() : undefined,
    });
  },
});

/** Lista de alunos(as) — para o professor designar pacientes e a recepção agendar. */
export const listStudents = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    if (user.role === "aluno") throw new Error("Acesso restrito.");
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role === "aluno")
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "Sem nome",
        email: u.email ?? "",
        registration: u.registration ?? "",
      }));
  },
});

/** Lista de professores(as) — exibição de quem avaliou cada item. */
export const listProfessors = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role === "professor")
      .map((u) => ({ _id: u._id, name: u.name ?? "Professor(a)", cro: u.cro ?? "" }));
  },
});
