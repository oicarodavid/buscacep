import React from "react";
import { MagnifyingGlass, Check, Copy, MapPin } from "@phosphor-icons/react";
import { Input, Button, Card, Chip, Spinner, Label } from "@heroui/react";
import type { Endereco } from "../../../core/domain/entities/endereco.entity";

export interface PopupTabPorCepProps {
  readonly cepInput: string;
  readonly carregando: boolean;
  readonly endereco: Endereco | null;
  readonly textoCopiado: string | null;
  readonly onCepChange: (valor: string) => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly onCopiar: (texto: string) => void;
}

/**
 * Aba 'Por CEP': construída com componentes oficiais do HeroUI (Card, Input, Label, Button, Chip).
 */
export const PopupTabPorCep: React.FC<PopupTabPorCepProps> = ({
  cepInput,
  carregando,
  endereco,
  textoCopiado,
  onCepChange,
  onSubmit,
  onCopiar
}) => {
  const formatarEnderecoCompleto = (item: Endereco) => {
    const partes = [
      item.logradouro,
      item.bairro,
      `${item.localidade}/${item.uf}`,
      item.cep
    ].filter(Boolean);
    return partes.join(", ");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Card do HeroUI com formulário de consulta por CEP */}
      <Card variant="secondary" className="p-3.5 rounded-2xl border-0 shadow-none">
        <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
          <Label htmlFor="input-cep" className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
            CEP
          </Label>

          <Input
            id="input-cep"
            aria-label="Código Postal (CEP)"
            placeholder="00000-000"
            value={cepInput}
            onChange={(e) => onCepChange(e.target.value)}
            maxLength={9}
            variant="primary"
            className="w-full text-sm font-semibold rounded-xl"
          />

          <Button
            type="submit"
            isDisabled={carregando || cepInput.replace(/\D/g, "").length !== 8}
            variant="primary"
            className="w-full mt-1 font-semibold text-xs py-2.5 rounded-xl transition-all shadow-surface cursor-pointer flex items-center justify-center gap-2"
          >
            {carregando ? (
              <Spinner size="sm" color="current" />
            ) : (
              <MagnifyingGlass size={15} weight="bold" />
            )}
            <span>{carregando ? "Consultando..." : "Consultar Endereço"}</span>
          </Button>
        </form>
      </Card>

      {/* Card do HeroUI exibindo o endereço retornado */}
      {endereco && (
        <Card className="p-4 rounded-2xl border-0 shadow-surface animate-in fade-in slide-in-from-bottom-2 duration-200" variant="secondary">
          <Card.Content className="p-0 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-separator">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <MapPin size={15} weight="fill" />
                <span>{endereco.cep}</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onPress={() => onCopiar(formatarEnderecoCompleto(endereco))}
                className="h-7 px-2 text-[11px] font-medium rounded-lg text-muted hover:text-foreground cursor-pointer flex items-center gap-1"
              >
                {textoCopiado ? (
                  <>
                    <Check size={13} weight="bold" className="text-success" />
                    <span className="text-success font-semibold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col gap-1 text-left pt-0.5">
              <div className="text-sm text-foreground leading-tight">
                {endereco.logradouro || "Logradouro não informado"}
              </div>

              <div className="text-xs text-muted font-medium">
                {endereco.bairro ? `${endereco.bairro} — ` : ""}
                {endereco.localidade}/{endereco.uf}
              </div>

              {endereco.complemento && (
                <div className="text-[11px] text-muted italic mt-0.5">
                  Faixa: {endereco.complemento}
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-1 pt-1">
                <Chip size="sm" variant="soft" color="accent" className="text-[10px] px-1.5 py-0">
                  <Chip.Label>DDD {endereco.ddd}</Chip.Label>
                </Chip>
                {endereco.ibge && (
                  <Chip size="sm" variant="soft" className="text-[10px] px-1.5 py-0">
                    <Chip.Label>IBGE {endereco.ibge}</Chip.Label>
                  </Chip>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};
