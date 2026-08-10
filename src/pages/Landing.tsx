import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  PenLine,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router";

function ToothMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M7 3c-2.5 0-4 1.8-4 4 0 1.6.6 2.8 1.2 4.2.5 1.2.8 2.5.8 3.8v4a2 2 0 0 0 4 0v-1c0-1 .8-1.8 1.8-1.8h2.4c1 0 1.8.8 1.8 1.8v1a2 2 0 0 0 4 0v-4c0-1.3.3-2.6.8-3.8C20.4 9.8 21 8.6 21 7c0-2.2-1.5-4-4-4-.8 0-1.5.2-2.1.5A6.6 6.6 0 0 1 12 3c-.9 0-1.8.2-2.6.6A3.4 3.4 0 0 0 7 3Z" />
    </svg>
  );
}

const WORKFLOW = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Recepção",
    text: "Cadastra o paciente, faz a triagem (HOF, periodontia, endodontia…) e organiza a agenda do dia.",
  },
  {
    icon: PenLine,
    step: "02",
    title: "Aluno(a)",
    text: "Registra o planejamento diário e as alterações no prontuário. Tudo fica destacado até a autorização.",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Professor(a)",
    text: "Avalia o planejamento, corrige em cor diferenciada, autoriza as edições e assina por último.",
  },
];

const FEATURES = [
  {
    icon: Stethoscope,
    title: "Odontograma anatômico",
    text: "Dentes com anatomia real: restaurações com material e classe, coroas, onlays, inlays, implantes com parafuso e condutos obturados.",
  },
  {
    icon: FileCheck2,
    title: "Anexos com autorização",
    text: "Imagens, radiografias, PDF, Word e DICOM. O aluno anexa; apenas o professor libera para o prontuário.",
  },
  {
    icon: CalendarDays,
    title: "Planejamento diário",
    text: "O aluno envia o plano do dia, o professor corrige em cor diferenciada e devolve com parecer.",
  },
  {
    icon: GraduationCap,
    title: "Assinaturas em ordem",
    text: "Paciente, aluno e professor — nessa ordem. As alterações só são efetivadas com a assinatura do professor.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <ToothMark className="size-6" />
          <span className="text-sm font-semibold tracking-tight">
            Clínica<span className="text-muted-foreground"> · Prontuários</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#fluxo" className="transition-colors hover:text-foreground">Fluxo</a>
          <a href="#recursos" className="transition-colors hover:text-foreground">Recursos</a>
          <a href="#seguranca" className="transition-colors hover:text-foreground">Segurança</a>
        </nav>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">
            Entrar
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Clínica-escola de odontologia
          </p>
          <h1 className="mt-6 text-4xl font-light leading-tight tracking-tight md:text-6xl">
            Prontuário eletrônico
            <br />
            <span className="font-medium">para a formação clínica.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            Cadastro e triagem na recepção, planejamento diário do aluno e
            avaliação do professor — com odontograma anatômico, anexos de exames
            e assinaturas em ordem.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-56">
              <Link to="/auth">
                Criar conta e testar
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-56">
              <Link to="/auth?returnTo=/dashboard">Ver a plataforma</Link>
            </Button>
          </div>
        </div>

        {/* Tooth illustration row */}
        <div className="mt-20 flex justify-center gap-10 text-muted-foreground/50">
          <ToothMark className="size-10" />
          <ToothMark className="size-14 -rotate-6" />
          <ToothMark className="size-10 rotate-6" />
        </div>
      </section>

      <Separator />

      {/* Fluxo */}
      <section id="fluxo" className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Como funciona
        </p>
        <h2 className="mt-4 max-w-2xl text-3xl font-light tracking-tight">
          Um fluxo claro entre <span className="font-medium">recepção, aluno e professor</span>
        </h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {WORKFLOW.map((w) => (
            <div key={w.step} className="group">
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-medium tracking-widest text-muted-foreground/60">
                  {w.step}
                </span>
                <Separator className="flex-1" />
              </div>
              <w.icon className="mt-6 size-7 transition-transform duration-200 group-hover:-translate-y-0.5" />
              <h3 className="mt-4 text-lg font-medium">{w.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Recursos
        </p>
        <h2 className="mt-4 max-w-2xl text-3xl font-light tracking-tight">
          Tudo que a clínica-escola precisa, <span className="font-medium">sem excessos</span>
        </h2>
        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-background p-8 transition-colors hover:bg-muted/30">
              <f.icon className="size-6" />
              <h3 className="mt-4 text-base font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Segurança + CTA */}
      <section id="seguranca" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Níveis de acesso
            </p>
            <h2 className="mt-4 text-3xl font-light tracking-tight">
              Cada função vê <span className="font-medium">o que precisa ver</span>
            </h2>
            <ul className="mt-8 flex flex-col gap-4 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-foreground" />
                A recepção acessa o banco de pacientes e a agenda, sem dados clínicos sensíveis.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-foreground" />
                O aluno atende apenas os pacientes que lhe foram designados, com acesso a fotos e radiografias.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-foreground" />
                Edições do aluno ficam destacadas e só entram no prontuário com autorização do professor.
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-10 text-center">
            <ToothMark className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-5 text-xl font-light">Pronto para testar?</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Crie contas de recepção, professor e aluno com o mesmo e-mail e
              explore o fluxo completo.
            </p>
            <Button asChild size="lg" className="mt-8 w-full max-w-60">
              <Link to="/auth">
                Criar conta
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>Prontuários Odontológicos · Protótipo funcional</span>
          <span className="flex items-center gap-1.5">
            <Stethoscope className="size-3" />
            Clínica-escola
          </span>
        </div>
      </footer>
    </div>
  );
}
