import type { DadosEnderecoExtraidos } from "../../core/domain/ports/platform-adapter.port";
import { platformManagerService } from "../platforms/platform-manager.service";
import { PADROES_CEP_SPEEDGOV } from "../platforms/speedgov/speedgov-scanner";
import { PADROES_CEP_GENERIC } from "../platforms/generic/generic-scanner";

export type { DadosEnderecoExtraidos };

/**
 * Padrões unificados de seleção de CEP para retrocompatibilidade.
 */
export const PADROES_SELECAO_CEP: readonly string[] = [
  ...PADROES_CEP_SPEEDGOV,
  ...PADROES_CEP_GENERIC
];

/**
 * Serviço de fachada do scanner DOM que delega para a plataforma ativa em tempo de execução.
 */
export class DomFormScannerService {
  /**
   * Localiza o campo de formulário ou campo de CEP no documento ou contexto.
   */
  encontrarCampoFormulario(
    padroes: readonly string[] = PADROES_SELECAO_CEP,
    contexto: ParentNode = document
  ): HTMLInputElement | HTMLSelectElement | null {
    const doc = contexto instanceof Document ? contexto : document;
    const adapter = platformManagerService.obterAdapter(doc);

    // 1. Tenta localizar campo de CEP pelo adapter especializado da plataforma
    const campoCep = adapter.encontrarCampoCep(contexto);
    if (campoCep) return campoCep;

    // 2. Fallback por padrões diretos
    for (const padrao of padroes) {
      const el = contexto.querySelector<HTMLInputElement | HTMLSelectElement>(
        `input#${padrao}, input[name="${padrao}"], select#${padrao}, select[name="${padrao}"]`
      );
      if (el) return el;
    }

    return null;
  }

  /**
   * Extrai com segurança o valor em texto de um input ou elemento select.
   */
  obterValorTexto(elemento: HTMLInputElement | HTMLSelectElement | null): string {
    if (!elemento) return "";

    if (
      elemento.tagName === "SELECT" ||
      (typeof HTMLSelectElement !== "undefined" && elemento instanceof HTMLSelectElement)
    ) {
      const select = elemento as HTMLSelectElement;
      const opcao = select.options?.[select.selectedIndex];
      return (opcao?.value || opcao?.text || "").trim();
    }

    return (elemento.value ?? "").trim();
  }

  /**
   * Extrai os dados do endereço utilizando o adaptador da plataforma ativa.
   */
  extrairDadosEndereco(contexto: ParentNode = document): DadosEnderecoExtraidos {
    const doc = contexto instanceof Document ? contexto : document;
    const adapter = platformManagerService.obterAdapter(doc);
    return adapter.extrairDadosEndereco(contexto);
  }
}

export const domFormScannerService = new DomFormScannerService();
