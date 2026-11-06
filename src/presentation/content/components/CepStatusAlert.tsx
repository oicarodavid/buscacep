import React from "react";
import { CloseButton } from "@heroui/react";
import { Info, CheckCircle } from "@phosphor-icons/react";

export interface CepStatusToastProps {
  readonly mensagem: string | null;
  readonly onFechar?: () => void;
}

/**
 * Componente visual declarativo para feedback e notificações estilo Toast do HeroUI.
 * Posicionado com position: fixed no canto inferior direito da tela, estilizado com as classes
 * oficiais do Toast do HeroUI (bg-surface, shadow-overlay, border-border, animação de entrada fluida),
 * garantindo compatibilidade total com o Shadow DOM sem depender dos portals nativos do react-aria.
 */
export const CepStatusToast: React.FC<CepStatusToastProps> = ({ mensagem, onFechar }) => {
  if (!mensagem) return null;

  const ehSucesso =
    mensagem.toLowerCase().includes("sucesso") ||
    mensagem.toLowerCase().includes("inserido");

  return (
    <aside
      aria-label="Notificações"
      className="fixed bottom-5 right-5 z-[2147483647] pointer-events-none select-none"
    >
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-start gap-3 p-3.5 min-w-[300px] max-w-[420px] rounded-xl border bg-surface text-foreground shadow-overlay animate-in fade-in slide-in-from-bottom-3 duration-250 ${
          ehSucesso ? "border-success/40 bg-surface" : "border-border bg-surface"
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {ehSucesso ? (
            <CheckCircle size={20} weight="fill" className="text-success" />
          ) : (
            <Info size={20} weight="bold" className="text-accent" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1 text-left">
          <div className="text-xs font-semibold text-foreground leading-tight">
            {ehSucesso ? "Sucesso" : "Aviso"}
          </div>
          <div className="text-xs text-muted mt-1 leading-snug break-words">
            {mensagem}
          </div>
        </div>

        {onFechar && (
          <CloseButton
            onPress={onFechar}
            onPointerUp={(e) => {
              if (e.button === 0) onFechar();
            }}
            aria-label="Fechar notificação"
            className="cursor-pointer text-muted hover:text-foreground shrink-0 -mr-1 -mt-1 ml-auto"
          />
        )}
      </div>
    </aside>
  );
};




