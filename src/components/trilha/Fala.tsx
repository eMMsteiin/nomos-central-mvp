import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Balão de conversa: "nomos" faz a pergunta guia; "voce" mostra o que a pessoa respondeu. */
export function Fala({ autor, children }: { autor: "nomos" | "voce"; children: ReactNode }) {
  return (
    <div className={cn("flex", autor === "voce" && "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
          autor === "nomos" ? "bg-muted text-foreground" : "bg-accent text-accent-foreground"
        )}
      >
        {children}
      </div>
    </div>
  );
}
