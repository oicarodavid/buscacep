import React from "react";
import { ArrowClockwise } from "@phosphor-icons/react";

export interface PopupHeaderProps {
  readonly onLimpar?: () => void;
}

/**
 * Cabeçalho do Popup com identidade visual inspirada nas referências modernas:
 * cantos arredondados, sem bordas pesadas e tipografia nítida.
 */
export const PopupHeader: React.FC<PopupHeaderProps> = ({ onLimpar }) => {
  return (
    <header className="flex items-center justify-between mb-3 px-0.5">
      <div className="flex items-center gap-2.5">
        <div>
          <h1 className="m-0 text-lg text-foreground leading-tight">
            ID.Busca CEP
          </h1>
          <p className="m-0 text-[11px] text-zinc-400 font-medium">
            Busca rápida
          </p>
        </div>
      </div>

      {onLimpar && (
        <button
          type="button"
          onClick={onLimpar}
          title="Limpar formulário"
          aria-label="Limpar formulário"
          className="w-8 h-8 rounded-full bg-white hover:bg-zinc-100 active:scale-95 text-zinc-500 flex items-center justify-center shadow-xs transition-all cursor-pointer border-0"
        >
          <ArrowClockwise size={15} weight="bold" />
        </button>
      )}
    </header>
  );
};
