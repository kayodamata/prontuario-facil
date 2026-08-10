import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/convex/shared";
import {
  CalendarDays,
  ClipboardCheck,
  LogOut,
  PenLine,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Agenda } from "./Agenda";
import { PatientsList } from "./PatientsList";
import { PlansView } from "./PlansView";
import { PlanMineView } from "./PlanMineView";
import { UsersAdmin } from "./UsersAdmin";
import type { Role } from "@/convex/shared";

const NAV: Record<Role, { id: string; label: string; icon: typeof Users }[]> = {
  recepcao: [
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "pacientes", label: "Pacientes", icon: Users },
  ],
  professor: [
    { id: "planejamentos", label: "Planejamentos", icon: ClipboardCheck },
    { id: "pacientes", label: "Pacientes", icon: Users },
  ],
  aluno: [
    { id: "pacientes", label: "Meus pacientes", icon: Users },
    { id: "planejamento", label: "Planejamento diário", icon: PenLine },
  ],
  admin: [
    { id: "usuarios", label: "Administração", icon: UserCog },
    { id: "pacientes", label: "Pacientes", icon: Users },
  ],
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string | null>(null);

  const role = (user?.role ?? "recepcao") as Role;
  const items = NAV[role];
  const active = tab ?? items[0].id;

  const pendingCount = useQuery(api.plans.countPending) ?? 0;

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-border/70 bg-card">
        <div className="flex items-center gap-2 px-5 py-5">
          <Stethoscope className="size-5" />
          <span className="text-sm font-semibold tracking-tight">
            Clínica<span className="text-muted-foreground"> · Prontuários</span>
          </span>
        </div>
        <Separator />
        <nav className="flex flex-col gap-1 p-3">
          <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {ROLE_LABELS[role]}
          </p>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                active === item.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2.5">
                <item.icon className="size-4" />
                {item.label}
              </span>
              {item.id === "planejamentos" && pendingCount > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "px-1.5 text-[10px]",
                    active === item.id
                      ? "border-background/40 text-background"
                      : "text-foreground",
                  )}
                >
                  {pendingCount}
                </Badge>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-border/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
              {(user.name ?? "U").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleSignOut}
          >
            <LogOut className="mr-1.5 size-3.5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="ml-56 flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl">
          {active === "agenda" && <Agenda />}
          {active === "pacientes" && <PatientsList />}
          {active === "planejamentos" && <PlansView />}
          {active === "planejamento" && <PlanMineView />}
          {active === "usuarios" && <UsersAdmin />}
        </div>
      </main>
    </div>
  );
}
