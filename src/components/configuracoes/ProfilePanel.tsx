import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Profile, useProfile } from "@/hooks/useProfile";

/** Perfil opcional: nada aqui é exigido para usar a plataforma nem é compartilhado. */
export default function ProfilePanel() {
  const { profile, tableMissing, isLoading, save } = useProfile();
  const [form, setForm] = useState<Profile>(profile);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const set = (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    try {
      await save.mutateAsync(form);
      toast.success("Perfil salvo");
    } catch {
      toast.error("Não foi possível salvar o perfil");
    }
  };

  if (tableMissing) {
    return (
      <p className="text-sm text-muted-foreground">
        O perfil ainda não está disponível: falta aplicar a atualização do banco de dados
        (migration <code>profiles</code>).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Como você quer ser chamado(a)</Label>
        <Input id="profile-name" value={form.displayName} onChange={set("displayName")} placeholder="Seu nome" className="max-w-sm" disabled={isLoading} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-institution">Instituição</Label>
        <Input id="profile-institution" value={form.institution} onChange={set("institution")} placeholder="Ex.: sua universidade" className="max-w-sm" disabled={isLoading} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-course">Curso</Label>
        <Input id="profile-course" value={form.course} onChange={set("course")} placeholder="Ex.: Economia" className="max-w-sm" disabled={isLoading} />
      </div>
      <p className="text-xs text-muted-foreground max-w-md">
        Tudo opcional. Só você vê essas informações; elas não são compartilhadas com outras
        pessoas nem usadas sem o seu consentimento.
      </p>
      <Button size="sm" onClick={handleSave} disabled={isLoading || save.isPending}>
        {save.isPending ? "Salvando..." : "Salvar perfil"}
      </Button>
    </div>
  );
}
