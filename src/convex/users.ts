import {
  createAccount,
  getAuthUserId,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import {
  action,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
  ActionCtx,
} from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
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
export async function requireRole(
  ctx: AuthCtx,
  role: "recepcao" | "professor" | "aluno" | "admin",
) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== role) {
    throw new Error("Acesso restrito: necessário perfil de " + role + ".");
  }
  return { userId, user };
}

/** Require perfis com acesso ao prontuário (admin tem acesso total). */
export async function requireClinical(ctx: AuthCtx) {
  const { userId, user } = await requireUser(ctx);
  if (
    user.role !== "aluno" &&
    user.role !== "professor" &&
    user.role !== "admin"
  ) {
    throw new Error("Acesso restrito a perfis clínicos.");
  }
  return { userId, user };
}

/** Require perfil com poder de autorização (professor ou administração). */
export async function requireTeacher(ctx: AuthCtx) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== "professor" && user.role !== "admin") {
    throw new Error("Acesso restrito: necessário perfil de professor(a).");
  }
  return { userId, user };
}

/** Require admin dentro de uma action (via ctx.runQuery, pois action não tem db). */
export async function requireAdminAction(ctx: ActionCtx) {
  const me = (await ctx.runQuery(api.users.currentUser)) as Doc<"users"> | null;
  if (!me) throw new Error("Não autenticado.");
  if (me.role !== "admin") {
    throw new Error("Acesso restrito: necessário perfil de administração.");
  }
  return me;
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
    if (args.role === "admin") {
      const admins = (await ctx.db.query("users").collect()).filter(
        (u) => u.role === "admin",
      );
      if (admins.length > 0) {
        throw new Error(
          "Já existe um administrador no sistema. Peça ao administrador para criar seu acesso.",
        );
      }
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
    // alunos(as) não precisam da lista — retorna vazio em vez de lançar erro,
    // pois query com erro derruba a aplicação no cliente (convex/react)
    if (user.role === "aluno") return [];
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
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "Professor(a)",
        cro: u.cro ?? "",
      }));
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Administração — gerenciamento de usuários (nível "admin")
// ────────────────────────────────────────────────────────────────────────────

/** Existe ao menos um administrador no sistema? (usado no cadastro inicial) */
export const hasAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const users = await ctx.db.query("users").collect();
    return users.some((u) => u.role === "admin");
  },
});

/** Lista completa de usuários (apenas administração). */
export const adminListUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role)
      .map((u) => ({
        _id: u._id,
        name: u.name ?? "Sem nome",
        email: u.email ?? "",
        role: u.role!,
        cro: u.cro ?? "",
        registration: u.registration ?? "",
        createdAt: u._creationTime,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** E-mail de um usuário (usado internamente pela administração). */
export const adminGetUserEmail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Usuário não encontrado.");
    return { email: user.email ?? null, name: user.name ?? "Sem nome" };
  },
});

/** Administração cria um usuário com login e senha (conta de senha). */
export const adminCreateUser = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: roleValidator,
    cro: v.optional(v.string()),
    registration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx);
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    if (!email.includes("@")) throw new Error("E-mail inválido.");
    if (!name) throw new Error("Informe o nome completo.");
    if (args.password.length < 8) {
      throw new Error("A senha deve ter no mínimo 8 caracteres.");
    }
    if (args.role === "professor" && !args.cro?.trim()) {
      throw new Error("Professor(a) precisa informar o número do CRO.");
    }
    try {
      await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: args.password },
        profile: {
          email,
          name,
          role: args.role,
          cro: args.role === "professor" ? args.cro?.trim() : undefined,
          registration:
            args.role === "aluno" ? args.registration?.trim() : undefined,
        },
      });
    } catch (e) {
      throw new Error(
        e instanceof Error && /already exists/i.test(e.message)
          ? "Já existe uma conta com este e-mail."
          : "Não foi possível criar o usuário.",
      );
    }
  },
});

/** Administração remove um usuário e todos os seus vínculos. */
export const adminRemoveUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "admin");
    if (args.userId === userId) {
      throw new Error("Você não pode remover a própria conta.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Usuário não encontrado.");
    if (target.role === "admin") {
      const admins = (await ctx.db.query("users").collect()).filter(
        (u) => u.role === "admin",
      );
      if (admins.length <= 1) {
        throw new Error("Não é possível remover o último administrador.");
      }
    }
    // sessões e credenciais de autenticação
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const a of accounts) await ctx.db.delete(a._id);
    // vínculos clínicos (alunos): acessos, planejamentos e agenda
    const access = await ctx.db
      .query("patientAccess")
      .withIndex("by_student", (q) => q.eq("studentId", args.userId))
      .collect();
    for (const a of access) await ctx.db.delete(a._id);
    const plans = await ctx.db
      .query("dailyPlans")
      .withIndex("by_student", (q) => q.eq("studentId", args.userId))
      .collect();
    for (const p of plans) await ctx.db.delete(p._id);
    const appts = await ctx.db
      .query("appointments")
      .filter((q) => q.eq(q.field("studentId"), args.userId))
      .collect();
    for (const a of appts) await ctx.db.delete(a._id);
    await ctx.db.delete(args.userId);
  },
});

/** Administração altera o nível de acesso de um usuário. */
export const adminSetRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
    cro: v.optional(v.string()),
    registration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, "admin");
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Usuário não encontrado.");
    if (args.role === "professor" && !args.cro?.trim()) {
      throw new Error("Professor(a) precisa informar o número do CRO.");
    }
    if (target.role === "admin" && args.role !== "admin" && target._id === userId) {
      throw new Error("Você não pode rebaixar a própria conta.");
    }
    await ctx.db.patch(args.userId, {
      role: args.role,
      cro: args.role === "professor" ? args.cro?.trim() : undefined,
      registration:
        args.role === "aluno" ? args.registration?.trim() : undefined,
    });
  },
});

/** Administração redefine a senha de um usuário. */
export const adminResetPassword = action({
  args: { userId: v.id("users"), newPassword: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx);
    if (args.newPassword.length < 8) {
      throw new Error("A senha deve ter no mínimo 8 caracteres.");
    }
    const target = await ctx.runQuery(api.users.adminGetUserEmail, {
      userId: args.userId,
    });
    if (!target.email) throw new Error("Usuário sem e-mail vinculado.");
    try {
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: target.email.toLowerCase(), secret: args.newPassword },
      });
    } catch (e) {
      throw new Error(
        e instanceof Error
          ? e.message
          : "Não foi possível redefinir a senha.",
      );
    }
  },
});
