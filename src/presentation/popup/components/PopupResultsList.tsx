import React from "react";
import { Card, Chip } from "@heroui/react";
import { MapPin } from "@phosphor-icons/react";
import type { Endereco } from "../../../core/domain/entities/endereco.entity";

export interface PopupResultsListProps {
  readonly resultados: readonly Endereco[];
}

/**
 * Componente visual puramente declarativo para listagem de CEPs encontrados no Popup
 * utilizando Cards e Chips do HeroUI com tokens de tema semânticos.
 */
export const PopupResultsList: React.FC<PopupResultsListProps> = ({ resultados }) => {
  if (resultados.length === 0) return null;

  return (
    <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1.5 pt-1">
      {resultados.slice(0, 5).map((item) => (
        <Card
          key={item.cep}
          variant="secondary"
          className="p-2 border border-border hover:border-focus transition-colors bg-surface shadow-surface"
        >
          <Card.Content className="p-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1 font-bold text-accent text-xs">
                <MapPin size={13} weight="fill" />
                <span>{item.cep}</span>
              </div>
              <Chip size="sm" variant="soft" color="accent" className="text-[10px] py-0 px-1.5 h-4">
                <Chip.Label>{item.uf}</Chip.Label>
              </Chip>
            </div>
            <div className="text-[11px] text-foreground font-medium">
              {item.logradouro} - {item.bairro}
            </div>
            <div className="text-[10px] text-muted">
              {item.localidade}/{item.uf}
            </div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
};
