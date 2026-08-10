// Login e senha via Convex Auth (provider Password).
// O fluxo signUp recebe `name` (nome completo) e `email` como parâmetros.

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import type { Doc } from "./_generated/dataModel";
import type { WithoutSystemFields } from "convex/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params): WithoutSystemFields<Doc<"users">> & { email: string } => ({
        email: (params.email as string).toLowerCase(),
        name: (params.name as string | undefined) ?? undefined,
      }),
    }),
  ],
});
