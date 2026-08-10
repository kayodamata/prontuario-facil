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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  GraduationCap,
  Loader2,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation } from "convex/react";
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

function ProfileSetup({ onDone }: { onDone: () => void }) {
  const completeProfile = useMutation(api.users.completeProfile);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [cro, setCro] = useState("");
  const [registration, setRegistration] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {ROLE_OPTIONS.map((opt) => {
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
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
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

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Falha ao enviar o código. Tente novamente.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect, { replace: true });
    } catch (error) {
      setError("O código informado está incorreto.");
      setIsLoading(false);
      setOtp("");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-[400px] max-w-full border shadow-sm">
          {step === "signIn" ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-border">
                  <Stethoscope className="size-5" />
                </div>
                <CardTitle className="text-xl">Acessar sistema</CardTitle>
                <CardDescription>
                  Entre com seu e-mail institucional para acessar os prontuários
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleEmailSubmit}>
                <CardContent>
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        name="email"
                        placeholder="nome@instituicao.edu.br"
                        type="email"
                        className="h-9 pl-9"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon"
                      className="size-9"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRight className="size-4" />
                      )}
                    </Button>
                  </div>
                  {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Receberá um código de verificação por e-mail. Se ainda não tem
                    conta, ela será criada no primeiro acesso.
                  </p>
                </CardContent>
              </form>
            </>
          ) : (
            <>
              <CardHeader className="text-center mt-2">
                <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
                <CardDescription>
                  Enviamos um código para{" "}
                  <span className="font-medium text-foreground">{step.email}</span>
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleOtpSubmit}>
                <CardContent className="flex flex-col gap-4">
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          (e.target as HTMLElement).closest("form")?.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && (
                    <p className="text-center text-xs text-destructive">{error}</p>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    Não recebeu o código?{" "}
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => setStep("signIn")}
                    >
                      Tentar novamente
                    </Button>
                  </p>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Verificando…
                      </>
                    ) : (
                      <>
                        Entrar
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </form>
            </>
          )}
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
