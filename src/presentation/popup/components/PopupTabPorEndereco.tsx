import React from "react";
import { MagnifyingGlass, Copy, Check, MapPin } from "@phosphor-icons/react";
import { Input, Button, Card, Chip, Spinner, Label } from "@heroui/react";
import type { Endereco } from "../../../core/domain/entities/endereco.entity";

export interface PopupTabPorEnderecoProps {
  readonly logradouro: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly carregando: boolean;
  readonly resultados: readonly Endereco[];
  readonly textoCopiado: string | null;
  readonly onLogradouroChange: (valor: string) => void;
  readonly onBairroChange: (valor: string) => void;
  readonly onCidadeChange: (valor: string) => void;
  readonly onUfChange: (valor: string) => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly onCopiar: (texto: string) => void;
}

/**
 * Aba 'Por Endereço': construída com componentes oficiais do HeroUI (Card, Input, Label, Button, Chip).
 */
export const PopupTabPorEndereco: React.FC<PopupTabPorEnderecoProps> = ({
  logradouro,
  bairro,
  cidade,
  uf,
  carregando,
  resultados,
  textoCopiado,
  onLogradouroChange,
  onBairroChange,
  onCidadeChange,
  onUfChange,
  onSubmit,
  onCopiar
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Formulário HeroUI de busca por endereço */}
      <Card variant="secondary" className="p-3.5 rounded-2xl border-0 shadow-none">
        <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
          <div>
            <Label htmlFor="input-logradouro" className="text-[10px] font-semibold text-muted tracking-wider block mb-1">
              Logradouro
            </Label>
            <Input
              id="input-logradouro"
              aria-label="Logradouro"
              placeholder="Ex: Paulista ou Rua Frei Cassiano"
              value={logradouro}
              onChange={(e) => onLogradouroChange(e.target.value)}
              variant="primary"
              className="w-full text-xs rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="input-bairro" className="text-[10px] font-semibold text-muted tracking-wider block mb-1">
              Bairro
            </Label>
            <Input
              id="input-bairro"
              aria-label="Bairro"
              placeholder="Ex: Centro ou Bela Vista"
              value={bairro}
              onChange={(e) => onBairroChange(e.target.value)}
              variant="primary"
              className="w-full text-xs rounded-xl"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="input-cidade" className="text-[10px] font-semibold text-muted tracking-wider block mb-1">
                Cidade
              </Label>
              <Input
                id="input-cidade"
                aria-label="Cidade"
                placeholder="Ex: Itapipoca"
                value={cidade}
                onChange={(e) => onCidadeChange(e.target.value)}
                variant="primary"
                className="w-full text-xs rounded-xl"
              />
            </div>

            <div className="w-16">
              <Label htmlFor="input-uf" className="text-[10px] font-semibold text-muted tracking-wider block mb-1 text-center">
                UF
              </Label>
              <Input
                id="input-uf"
                aria-label="UF"
                placeholder="CE"
                maxLength={2}
                value={uf}
                onChange={(e) => onUfChange(e.target.value.toUpperCase())}
                variant="primary"
                className="w-full text-xs text-center uppercase font-bold rounded-xl"
              />
            </div>
          </div>

          <Button
            type="submit"
            isDisabled={carregando || logradouro.trim().length < 3 || !cidade.trim() || !uf.trim()}
            variant="primary"
            className="w-full mt-1 font-semibold text-xs py-2.5 rounded-xl transition-all shadow-surface cursor-pointer flex items-center justify-center gap-2"
          >
            {carregando ? (
              <Spinner size="sm" color="current" />
            ) : (
              <MagnifyingGlass size={15} weight="bold" />
            )}
            <span>{carregando ? "Pesquisando..." : "Pesquisar CEP"}</span>
          </Button>
        </form>
      </Card>

      {/* Lista de Resultados de CEP do HeroUI */}
      {resultados.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-0.5">
          <div className="text-[11px] font-semibold text-muted px-1 text-left">
            {resultados.length} {resultados.length === 1 ? "CEP encontrado" : "CEPs encontrados"}:
          </div>

          {resultados.map((item) => {
            const cepFoiCopiado = textoCopiado === item.cep;

            return (
              <Card
                key={item.cep}
                className="p-3 rounded-2xl border-0 shadow-surface flex flex-row items-center justify-between gap-2.5 transition-all hover:bg-surface-secondary" 
                variant="secondary"
              >
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-accent text-xs flex items-center gap-1">
                      <MapPin size={13} weight="fill" />
                      {item.cep}
                    </span>
                    <Chip size="sm" variant="soft" color="accent" className="text-[10px] px-1 py-0">
                      <Chip.Label>{item.uf}</Chip.Label>
                    </Chip>
                  </div>

                  <div className="text-[11px] font-medium text-foreground truncate mt-0.5">
                    {item.logradouro}
                  </div>

                  <div className="text-[10px] text-muted truncate">
                    {item.bairro} — {item.localidade}/{item.uf}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onPress={() => onCopiar(item.cep)}
                  aria-label="Copiar CEP"
                  className="shrink-0 h-8 w-8 p-0 rounded-xl text-muted hover:text-accent cursor-pointer flex items-center justify-center"
                >
                  {cepFoiCopiado ? (
                    <Check size={14} weight="bold" className="text-success" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
