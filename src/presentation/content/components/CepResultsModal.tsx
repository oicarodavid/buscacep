import React from "react";
import { Check, WarningCircle } from "@phosphor-icons/react";
import { Card, Button, CloseButton, Kbd } from "@heroui/react";
import type { Endereco } from "../../../core/domain/entities/endereco.entity";

export interface CepResultsModalProps {
  readonly resultados: readonly Endereco[];
  readonly mensagemAviso?: string | null;
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly primeiroBotaoRef: React.RefObject<HTMLButtonElement | null>;
  readonly botaoAvisoRef?: React.RefObject<HTMLButtonElement | null>;
  readonly onConfirmar: (cep: string) => void;
  readonly onFechar: () => void;
}

/**
 * Componente visual puramente declarativo para a exibição dos resultados ou avisos de busca de CEP.
 * Utiliza o HeroUI Card como overlay flutuante com Buttons oficiais do HeroUI, operando 100% no Shadow DOM.
 */
export const CepResultsModal: React.FC<CepResultsModalProps> = ({
  resultados,
  mensagemAviso,
  containerRef,
  primeiroBotaoRef,
  botaoAvisoRef,
  onConfirmar,
  onFechar
}) => {
  const temResultados = resultados.length > 0;
  const temItemRecomendado =
    temResultados && (resultados[0]?.scoreRelevancia ?? 0) > 50;

  return (
    <Card
      ref={containerRef}
      className="absolute top-full left-0 mt-1 z-[2147483647] w-[370px] bg-surface text-foreground border-border shadow-overlay p-3 text-xs font-sans animate-in fade-in duration-150"
    >
      <Card.Header className="p-0 pb-2 flex flex-row items-center justify-between w-full border-b border-separator">
        <Card.Title className="text-sm font-semibold">
          {temResultados ? "Selecione o CEP" : "Busca de CEP"}
        </Card.Title>
        <CloseButton
          onPress={onFechar}
          onPointerUp={(e) => {
            if (e.button === 0) onFechar();
          }}
          aria-label="Fechar"
          className="text-muted hover:text-foreground cursor-pointer shrink-0 ml-auto"
        />
      </Card.Header>

      <Card.Content className="p-0 pt-2">
        {temResultados ? (
          <>
            {temItemRecomendado && (
              <p className="text-muted text-xs mb-2 m-0">
                Pressione Enter para adicionar o CEP recomendado.
              </p>
            )}

            <div className="max-h-60 overflow-y-auto space-y-1.5 pt-1">
              {resultados.map((item, index) => {
                const ehMaisProvavel =
                  index === 0 && (item.scoreRelevancia ?? 0) > 50;

                return (
                  <Card
                    key={item.cep}
                    variant={ehMaisProvavel ? "secondary" : "default"}
                    className={`p-2.5 transition-colors border shadow-surface ${
                      ehMaisProvavel
                        ? "border-l-4 border-l-success border-t-0 border-r-0 border-b-0 bg-surface-secondary"
                        : "border-0 bg-surface hover:bg-surface-secondary"
                    }`}
                  >
                    <Card.Content className="cep-item-content p-0 gap-3">
                      {/* Informações de endereço empilhadas uma abaixo da outra e alinhadas à esquerda */}
                      <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                        {/* 1ª Linha: CEP */}
                        <div className="font-bold text-accent text-sm leading-tight text-left">
                          {item.cep}
                        </div>

                        {/* 2ª Linha: Logradouro */}
                        <div className="text-xs text-foreground font-medium truncate mt-0.5 leading-tight text-left w-full">
                          {item.logradouro}
                        </div>

                        {/* 3ª Linha: Complemento (caso tenha) */}
                        {item.complemento && (
                          <div className="text-[11px] text-muted italic mt-0.5 leading-tight text-left w-full">
                            Faixa: {item.complemento}
                          </div>
                        )}

                        {/* 4ª Linha: Cidade e Estado */}
                        <div className="text-[11px] text-muted mt-0.5 leading-tight text-left w-full">
                          {item.bairro} - {item.localidade}/{item.uf}
                        </div>
                      </div>

                      {/* Botão de Inserir justificado à direita */}
                      <Button
                        ref={index === 0 ? primeiroBotaoRef : null}
                        type="button"
                        variant={ehMaisProvavel ? "primary" : "secondary"}
                        size="sm"
                        onPress={() => onConfirmar(item.cep)}
                        onPointerUp={(e) => {
                          if (e.button === 0) onConfirmar(item.cep);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onConfirmar(item.cep);
                          }
                        }}
                        className="shrink-0 text-xs font-semibold px-2.5 py-1.5 shadow-surface cursor-pointer self-center inline-flex items-center gap-1.5"
                      >
                        <Check size={12} weight="bold" />
                        <span>Inserir</span>
                        {ehMaisProvavel && (
                          <Kbd variant="light" className="pl-0.5 text-sm py-0 px-1 border-0 bg-white/20 text-white">
                            <Kbd.Abbr keyValue="enter" />
                          </Kbd>
                        )}
                      </Button>
                    </Card.Content>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          /* Estado informativo/aviso quando não há resultados ou dados incompletos */
          <div className="flex flex-col items-center text-center p-3 gap-3">
            <div className="p-2 rounded-full bg-surface-secondary text-warning">
              <WarningCircle size={26} weight="fill" />
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed m-0 px-1">
              {mensagemAviso ?? "Nenhum CEP encontrado para os termos informados."}
            </p>
            <Button
              ref={botaoAvisoRef}
              type="button"
              variant="secondary"
              size="sm"
              onPress={onFechar}
              onPointerUp={(e) => {
                if (e.button === 0) onFechar();
              }}
              className="mt-1 text-xs font-medium px-4 py-1.5 shadow-surface cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Entendi</span>
              <Kbd variant="light" className="text-xs py-0 px-1 border-0 bg-muted/20 text-foreground">
                <Kbd.Abbr keyValue="enter" />
              </Kbd>
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

