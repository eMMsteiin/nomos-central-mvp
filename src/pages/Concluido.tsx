import { PostItOverlay } from "@/components/PostItOverlay";

const Concluido = () => {
  return (
    <div className="px-6 py-8 relative">
      <PostItOverlay tab="concluido" />
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold mb-6">Concluído</h2>
        <p className="text-muted-foreground text-sm">
          Suas tarefas concluídas aparecerão aqui.
        </p>
      </div>
    </div>
  );
};

export default Concluido;
