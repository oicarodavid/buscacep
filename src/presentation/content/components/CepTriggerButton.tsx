import React from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button, Spinner, Kbd } from "@heroui/react";

export interface CepTriggerButtonProps {
  readonly carregando: boolean;
  readonly onBuscar: () => void;
}

/**
 * Componente visual puramente declarativo para o botão de disparo de busca de CEP no formulário.
 * Utiliza o componente oficial Button, Spinner e Kbd do HeroUI com suporte a interação segura no Shadow DOM.
 */
export const CepTriggerButton: React.FC<CepTriggerButtonProps> = ({
  carregando,
  onBuscar
}) => {
  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      isDisabled={carregando}
      onPress={onBuscar}
      onPointerUp={(e) => {
        if (!carregando && e.button === 0) {
          onBuscar();
        }
      }}
      aria-label="Buscar CEP (Atalho: Alt + C)"
      className="inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1.5 shadow-surface cursor-pointer select-none"
    >
      {carregando ? (
        <Spinner size="sm" color="current" className="shrink-0" />
      ) : (
        <MagnifyingGlass size={14} weight="bold" className="shrink-0" />
      )}
      <span>{carregando ? "Buscando CEP..." : "Buscar CEP"}</span>
      {!carregando && (
        <Kbd variant="light" className="ml-0.5 text-[10px] py-0 px-1 border-0 bg-white/20 text-white">
          <Kbd.Abbr keyValue="alt" />
          <Kbd.Content>C</Kbd.Content>
        </Kbd>
      )}
    </Button>
  );
};

