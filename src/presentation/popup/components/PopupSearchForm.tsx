import React from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input, Button, Spinner } from "@heroui/react";

export interface PopupSearchFormProps {
  readonly logradouro: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly carregando: boolean;
  readonly onLogradouroChange: (valor: string) => void;
  readonly onBairroChange: (valor: string) => void;
  readonly onCidadeChange: (valor: string) => void;
  readonly onUfChange: (valor: string) => void;
  readonly onSubmit: (e: React.FormEvent) => void;
}

/**
 * Componente visual puramente declarativo para o formulário de consulta rápida do Popup
 * utilizando Input, Button e Spinner do HeroUI.
 */
export const PopupSearchForm: React.FC<PopupSearchFormProps> = ({
  logradouro,
  bairro,
  cidade,
  uf,
  carregando,
  onLogradouroChange,
  onBairroChange,
  onCidadeChange,
  onUfChange,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <Input
        placeholder="Logradouro (ex: Paulista ou Av. Paulista)"
        value={logradouro}
        onChange={(e) => onLogradouroChange(e.target.value)}
        fullWidth
        className="w-full text-xs"
      />

      <Input
        placeholder="Bairro (opcional, ex: Bela Vista)"
        value={bairro}
        onChange={(e) => onBairroChange(e.target.value)}
        fullWidth
        className="w-full text-xs"
      />

      <div className="flex gap-2">
        <Input
          placeholder="Cidade (ex: São Paulo)"
          value={cidade}
          onChange={(e) => onCidadeChange(e.target.value)}
          className="flex-1 text-xs"
        />
        <Input
          placeholder="UF"
          maxLength={2}
          value={uf}
          onChange={(e) => onUfChange(e.target.value.toUpperCase())}
          className="w-14 text-xs text-center uppercase font-semibold"
        />
      </div>

      <Button
        type="submit"
        isDisabled={carregando}
        variant="primary"
        className="w-full mt-1 flex items-center justify-center gap-1.5 font-semibold text-xs py-2 shadow-surface cursor-pointer"
      >
        {carregando ? (
          <Spinner size="sm" color="current" className="shrink-0" />
        ) : (
          <MagnifyingGlass size={14} weight="bold" />
        )}
        <span>{carregando ? "Consultando..." : "Consultar CEP"}</span>
      </Button>
    </form>
  );
};
