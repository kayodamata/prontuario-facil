import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ROLE_LABELS, type Role } from "@/convex/shared";
import { Loader2, LockKeyhole, Plus, Search, Trash2, Users } from "lucide-react";

const ROLES_ORDER: Role[] = ["admin", "professor", "aluno", "recepcao"];

function RoleBadge({ role }: { role: Role }) {
  const variant =
    role === "admin"
      ? "default"
      : role === "professor"
        ? "outline"
        : "secondary";
  return (
    <Badge variant={variant} className="text-[10px]">
      {ROLE_LABELS[role]}
    </Badge>
  );
}

export function UsersAdmin() {
  const { user: me } = useAuth();
  const users = useQuery(api.users.adminListUsers);
  const removeUser = useMutation(api.users.adminRemoveUser);
  const setRole = useMutation(api.users.adminSetRole);
  const resetPassword = useAction(api.users.adminResetPassword);
  const createUser = useAction(api.users.adminCreateUser);

  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    let rows = users ?? [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [users, query]);

  const handleRemove = async (userId: string) => {
    setBusy(true);
    try {
      await removeUser({ userId: userId as any });
      toast.success("Usuário removido.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover usuário.");
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  const handleReset = async (userId: string) => {
    setBusy(true);
    try {
      await resetPassword({ userId: userId as any, newPassword: resetPw });
      toast.success("Senha redefinida.");
      setResetPw("");
      setResetFor(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erro ao redefinir a senha.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight">Administração</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie usuários e níveis de acesso do sistema de prontuários
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Novo usuário
        </Button>
      </header>

      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="h-9 pl-9 text-sm"
          placeholder="Buscar por nome ou e-mail…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!users ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
          <Users className="size-6 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum usuário encontrado.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/70">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">E-mail</th>
                <th className="px-4 py-3 font-medium">Nível de acesso</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Registro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u._id}
                  className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
                        {(u.name ?? "U").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {u.name}
                          {u._id === me?._id && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground">
                              (você)
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground md:hidden">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={u.role} />
                      <Select
                        value={u.role}
                        onValueChange={async (role) => {
                          try {
                            await setRole({
                              userId: u._id as any,
                              role: role as Role,
                            });
                            toast.success("Nível de acesso atualizado.");
                          } catch (e) {
                            toast.error(
                              e instanceof Error ? e.message : "Erro ao atualizar.",
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-36 border-0 bg-transparent px-1 text-xs text-muted-foreground hover:bg-muted">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES_ORDER.map((r) => (
                            <SelectItem key={r} value={r} disabled={u._id === me?._id && r !== u.role}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {u.role === "professor"
                      ? u.cro || "—"
                      : u.role === "aluno"
                        ? u.registration || "—"
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Redefinir senha"
                        onClick={() => setResetFor(u._id)}
                      >
                        <LockKeyhole className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        title="Remover usuário"
                        disabled={u._id === me?._id}
                        onClick={() => setRemoving(u._id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={async (data) => {
          await createUser(data);
          toast.success("Usuário criado com sucesso.");
        }}
      />

      <AlertDialog open={removing !== null} onOpenChange={(v) => !v && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será removido permanentemente, junto com sessões,
              vínculos de pacientes, planejamentos e agenda. Os prontuários
              clínicos são mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (removing) handleRemove(removing);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resetFor !== null} onOpenChange={(v) => !v && setResetFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para este usuário. Mínimo de 8 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="pw" className="text-xs">
              Nova senha
            </Label>
            <Input
              id="pw"
              type="password"
              className="h-9"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              placeholder="Nova senha"
              minLength={8}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetFor(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              disabled={busy || resetPw.length < 8}
              onClick={() => resetFor && handleReset(resetFor)}
            >
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Salvar nova senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface NewUserData {
  name: string;
  email: string;
  password: string;
  role: Role;
  cro?: string;
  registration?: string;
}

function NewUserDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: NewUserData) => Promise<void>;
}) {
  const [form, setForm] = useState<NewUserData>({
    name: "",
    email: "",
    password: "",
    role: "aluno",
  });
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof NewUserData>(k: K, val: NewUserData[K]) =>
    setForm((f) => ({ ...f, [k]: val }));

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) return setError("Informe o nome completo.");
    if (!form.email.includes("@")) return setError("Informe um e-mail válido.");
    if (form.password.length < 8)
      return setError("A senha deve ter no mínimo 8 caracteres.");
    if (form.password !== confirm)
      return setError("As senhas não coincidem.");
    if (form.role === "professor" && !form.cro?.trim())
      return setError("Professor(a) precisa do número do CRO.");
    setSaving(true);
    try {
      await onCreate(form);
      setForm({ name: "", email: "", password: "", role: "aluno" });
      setConfirm("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar usuário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Crie uma conta com e-mail e senha. O usuário entra direto com o
            nível de acesso escolhido.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">
              Nome completo <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-9 text-xs"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nome do usuário"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">
              E-mail <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-9 text-xs"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="nome@instituicao.edu.br"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">
                Senha <span className="text-destructive">*</span>
              </Label>
              <Input
                className="h-9 text-xs"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Mín. 8 caracteres"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Confirmar senha</Label>
              <Input
                className="h-9 text-xs"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Nível de acesso</Label>
            <Select
              value={form.role}
              onValueChange={(v) => set("role", v as Role)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES_ORDER.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.role === "professor" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Número do CRO</Label>
              <Input
                className="h-9 text-xs"
                value={form.cro ?? ""}
                onChange={(e) => set("cro", e.target.value)}
                placeholder="Ex.: CRO-SP 12.345"
              />
            </div>
          )}
          {form.role === "aluno" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Matrícula</Label>
              <Input
                className="h-9 text-xs"
                value={form.registration ?? ""}
                onChange={(e) => set("registration", e.target.value)}
                placeholder="Número de matrícula"
              />
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Criar usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
