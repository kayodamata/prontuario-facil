import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UserCog,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Role } from "@/convex/shared";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

const ROLE_OPTIONS: {
  role: Role;
  title: string;
  description: string;
  icon: typeof UserRound;
}[] = [
  {
    role: "recepcao",
    title: "Recepção",
    description: "Cadastro, triagem e agenda de pacientes",
    icon: ClipboardList,
  },
  {
    role: "professor",
    title: "Professor(a)",
    description: "Acesso total, avalia e autoriza alterações",
    icon: ShieldCheck,
  },
  {
    role: "aluno",
    title: "Aluno(a)",
    description: "Prontuários designados e planejamento diário",
    icon: GraduationCap,
  },
];

const ADMIN_OPTION: {
  role: Role;
  title: string;
  description: string;
  icon: typeof UserRound;
} = {
  role: "admin",
  title: "Administração",
  description: "Gerencia usuários e níveis de acesso",
  icon: UserCog,
};

function ProfileSetup({ onDone }: { onDone: () => void }) {
  const completeProfile = useMutation(api.users.completeProfile);
  const hasAdmin = useQuery(api.users.hasAdmin);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [cro, setCro] = useState("");
  const [registration, setRegistration] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // a opção de administrador só aparece para a primeira conta (se não há admin)
  const options = hasAdmin ? ROLE_OPTIONS : [...ROLE_OPTIONS, ADMIN_OPTION];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Escolha seu nível de acesso.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await completeProfile({
        role,
        name,
        cro: cro || undefined,
        registration: registration || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[420px] max-w-full border shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Complete seu cadastro</CardTitle>
        <CardDescription>
          Escolha o nível de acesso para começar a usar o sistema
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-2">
            {options.map((opt) => {
              const Icon = opt.icon;
              const active = role === opt.role;
              return (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => setRole(opt.role)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-all",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/40 hover:bg-muted/50",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{opt.title}</span>
                    <span
                      className={cn(
                        "text-xs",
                        active ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {opt.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="name" className="text-xs">
              Nome completo
            </Label>
            <Input
              id="name"
              className="h-9"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>

          {role === "professor" && (
            <div className="grid gap-1.5">
              <Label htmlFor="cro" className="text-xs">
                Número do CRO <span className="text-muted-foreground">(obrigatório)</span>
              </Label>
              <Input
                id="cro"
                className="h-9"
                value={cro}
                onChange={(e) => setCro(e.target.value)}
                placeholder="Ex.: CRO-SP 12.345"
              />
            </div>
          )}

          {role === "aluno" && (
            <div className="grid gap-1.5">
              <Label htmlFor="registration" className="text-xs">
                Matrícula <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="registration"
                className="h-9"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="Número de matrícula"
              />
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !role || !name.trim()}
          >
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <BadgeCheck className="mr-2 size-4" />
            )}
            Criar conta
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, user, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsProfile = isAuthenticated && user !== undefined && !user?.role;

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, user?.role, navigate, redirect]);

  if (needsProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <ProfileSetup onDone={() => navigate(redirect, { replace: true })} />
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "signUp" && password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (mode === "signIn") {
        await signIn("password", { flow: "signIn", email, password });
      } else {
        await signIn("password", {
          flow: "signUp",
          name,
          email,
          password,
        });
      }
      // se o usuário já tem perfil, o efeito acima redireciona;
      // se não tem, o cadastro de perfil (ProfileSetup) é exibido
      setIsLoading(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "signIn"
            ? "E-mail ou senha incorretos."
            : "Não foi possível criar a conta.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-[400px] max-w-full border shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-border">
              <Stethoscope className="size-5" />
            </div>
            <CardTitle className="text-xl">
              {mode === "signIn" ? "Acessar sistema" : "Criar conta"}
            </CardTitle>
            <CardDescription>
              {mode === "signIn"
                ? "Entre com seu e-mail e senha para acessar os prontuários"
                : "Crie sua conta com e-mail e senha"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4">
              {mode === "signUp" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-xs">
                    Nome completo
                  </Label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="name"
                      className="h-9 pl-9"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="email" className="text-xs">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    className="h-9 pl-9"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@instituicao.edu.br"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-xs">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    className="h-9 pl-9"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    disabled={isLoading}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              {mode === "signUp" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="confirm" className="text-xs">
                    Confirmar senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      className="h-9 pl-9"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      disabled={isLoading}
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {mode === "signIn" ? "Entrando…" : "Criando conta…"}
                  </>
                ) : mode === "signIn" ? (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 size-4" />
                  </>
                ) : (
                  <>
                    Criar conta
                    <BadgeCheck className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </form>
          <CardFooter className="justify-center border-t border-border/60 pt-4">
            <p className="text-center text-xs text-muted-foreground">
              {mode === "signIn" ? (
                <>
                  Ainda não tem conta?{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      setMode("signUp");
                      setError(null);
                    }}
                  >
                    Criar conta
                  </Button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      setMode("signIn");
                      setError(null);
                    }}
                  >
                    Entrar
                  </Button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
      <footer className="flex items-center justify-center gap-4 border-t border-border/60 py-4 text-xs text-muted-foreground">
        <button
          className="flex cursor-pointer items-center gap-1 hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="size-3" />
          Voltar ao início
        </button>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1">
          <UserRound className="size-3" />
          Prontuários Odontológicos
        </span>
      </footer>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
