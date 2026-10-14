import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Fala } from "@/components/trilha/Fala";
import { DiaExperimento, useTrilha } from "@/hooks/useTrilha";
import { Ciclo, EXPERIMENTOS_EXEMPLO, PERGUNTAS_EXEMPLO } from "@/types/trilha";
import { cn } from "@/lib/utils";

const DIAS: { value: DiaExperimento; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "amanha", label: "Amanhã" },
  { value: "semana", label: "Esta semana" },
];

const Chip = ({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-muted",
      active && "bg-accent text-accent-foreground"
    )}
  >
    {children}
  </button>
);

function PassoPergunta({ onSubmit, pending }: { onSubmit: (q: string) => void; pending: boolean }) {
  const [question, setQuestion] = useState("");
  return (
    <div className="space-y-3">
      <Fala autor="nomos">
        Qual dúvida ou curiosidade você quer explorar agora? Pode ser sobre o que estuda, sobre uma
        área ou sobre o seu futuro.
      </Fala>
      <div className="flex flex-wrap gap-2">
        {PERGUNTAS_EXEMPLO.map((p) => (
          <Chip key={p} onClick={() => setQuestion(p)}>{p}</Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Escreva sua pergunta"
          onKeyDown={(e) => e.key === "Enter" && question.trim() && onSubmit(question)}
        />
        <Button onClick={() => onSubmit(question)} disabled={!question.trim() || pending}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

function PassoExperimento({
  ciclo,
  onSubmit,
  pending,
}: {
  ciclo: Ciclo;
  onSubmit: (experimento: string, dia: DiaExperimento) => void;
  pending: boolean;
}) {
  const [experimento, setExperimento] = useState("");
  const [dia, setDia] = useState<DiaExperimento>("semana");
  return (
    <div className="space-y-3">
      <Fala autor="voce">{ciclo.question}</Fala>
      <Fala autor="nomos">
        Que pequeno experimento te ajudaria a testar isso? Algo que caiba na sua semana, sem
        precisar decidir nada definitivo.
      </Fala>
      <div className="flex flex-wrap gap-2">
        {EXPERIMENTOS_EXEMPLO.map((e) => (
          <Chip key={e} onClick={() => setExperimento(e)}>{e}</Chip>
        ))}
      </div>
      <Input value={experimento} onChange={(e) => setExperimento(e.target.value)} placeholder="Descreva o seu experimento" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Quando?</span>
        {DIAS.map((d) => (
          <Chip key={d.value} active={dia === d.value} onClick={() => setDia(d.value)}>{d.label}</Chip>
        ))}
      </div>
      <Button onClick={() => onSubmit(experimento, dia)} disabled={!experimento.trim() || pending}>
        Adicionar à minha semana
      </Button>
    </div>
  );
}

function PassoExecutando({
  ciclo,
  onReflect,
  onDelete,
}: {
  ciclo: Ciclo;
  onReflect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <Fala autor="voce">{ciclo.question}</Fala>
      <Fala autor="voce">{ciclo.experiment}</Fala>
      <Fala autor="nomos">
        Combinado! Ele já está nas suas tarefas.
        {ciclo.taskId && (
          <>
            {" "}
            <Link to={`/tarefa/${ciclo.taskId}`} className="underline underline-offset-4">Ver tarefa</Link>.
          </>
        )}{" "}
        Quando fizer, volte aqui para refletir. Se mudar de ideia, tudo bem — mudar de interesse também é
        aprender.
      </Fala>
      <div className="flex gap-2">
        <Button onClick={onReflect}>Já fiz, quero refletir</Button>
        <Button variant="ghost" onClick={onDelete}>Desistir deste ciclo</Button>
      </div>
    </div>
  );
}

function PassoReflexao({
  ciclo,
  onSubmit,
  pending,
}: {
  ciclo: Ciclo;
  onSubmit: (reflection: string, clarity: number | null) => void;
  pending: boolean;
}) {
  const [reflection, setReflection] = useState("");
  const [clarity, setClarity] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <Fala autor="voce">{ciclo.question}</Fala>
      <Fala autor="voce">{ciclo.experiment}</Fala>
      <Fala autor="nomos">
        O que te surpreendeu, interessou ou cansou nesse experimento? E isso abre alguma pergunta nova?
      </Fala>
      <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Escreva com suas palavras (opcional)" rows={4} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">O quanto isso trouxe mais clareza?</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} active={clarity === n} onClick={() => setClarity(clarity === n ? null : n)}>{n}</Chip>
        ))}
      </div>
      <Button onClick={() => onSubmit(reflection, clarity)} disabled={pending}>Concluir ciclo</Button>
    </div>
  );
}

export default function MinhaTrilha() {
  const { ciclos, tableMissing, isLoading, error, criar, escolherExperimento, irParaReflexao, concluir, apagar } = useTrilha();

  const ativo = ciclos.find((c) => c.status !== "concluido");
  const concluidos = ciclos.filter((c) => c.status === "concluido");

  const falhou = () => toast.error("Não foi possível salvar. Tente de novo.");

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-base font-medium">Minha Trilha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Uma pergunta, um pequeno experimento, uma reflexão — no seu ritmo. Nada aqui é obrigatório e
            só você vê o que escreve.
          </p>
        </div>

        {tableMissing && (
          <p className="text-sm text-muted-foreground">
            A Trilha ainda não está disponível: falta aplicar a atualização do banco de dados
            (migration <code>trilha_ciclos</code>).
          </p>
        )}
        {error && !tableMissing && (
          <p className="text-sm text-muted-foreground">Não foi possível carregar a Trilha agora.</p>
        )}

        {!tableMissing && !isLoading && !error && (
          <>
            {!ativo && (
              <PassoPergunta pending={criar.isPending} onSubmit={(q) => criar.mutate(q, { onError: falhou })} />
            )}
            {ativo?.status === "experimento" && (
              <PassoExperimento
                ciclo={ativo}
                pending={escolherExperimento.isPending}
                onSubmit={(experimento, dia) =>
                  escolherExperimento.mutate({ ciclo: ativo, experimento, dia }, { onError: falhou })
                }
              />
            )}
            {ativo?.status === "executando" && (
              <PassoExecutando
                ciclo={ativo}
                onReflect={() => irParaReflexao.mutate(ativo.id, { onError: falhou })}
                onDelete={() => apagar.mutate(ativo.id, { onError: falhou })}
              />
            )}
            {ativo?.status === "reflexao" && (
              <PassoReflexao
                ciclo={ativo}
                pending={concluir.isPending}
                onSubmit={(reflection, clarity) =>
                  concluir.mutate(
                    { cicloId: ativo.id, reflection, clarity },
                    { onSuccess: () => toast.success("Ciclo concluído. Quer explorar outra pergunta?"), onError: falhou }
                  )
                }
              />
            )}

            {concluidos.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium">
                  Ciclos concluídos <span className="text-muted-foreground font-normal">({concluidos.length})</span>
                </h2>
                <ul className="space-y-2">
                  {concluidos.map((c) => (
                    <li key={c.id} className="group rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">{c.question}</p>
                          {c.experiment && <p className="text-muted-foreground">{c.experiment}</p>}
                          {c.reflection && <p className="text-muted-foreground italic">“{c.reflection}”</p>}
                          {c.clarity && <p className="text-xs text-muted-foreground">Clareza: {c.clarity}/5</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label="Apagar este ciclo"
                          onClick={() => apagar.mutate(c.id, { onError: falhou })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
