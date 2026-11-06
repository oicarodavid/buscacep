import type {
  IPlatformAdapter,
  DadosEnderecoExtraidos
} from "../../../core/domain/ports/platform-adapter.port";
import { genericScanner } from "./generic-scanner";
import { genericFiller } from "./generic-filler";

/**
 * Adaptador de plataforma genérico para a Web convencional.
 * Atua como fallback universal para páginas e e-commerces que seguem a semântica padrão HTML.
 */
export class GenericWebPlatformAdapter implements IPlatformAdapter {
  readonly id = "generic";
  readonly nome = "Web Convencional";

  detectar(_doc: Document): boolean {
    // Como estratégia de fallback, sempre pode operar em qualquer página web
    return true;
  }

  encontrarCampoCep(contexto: ParentNode = document): HTMLInputElement | null {
    return genericScanner.encontrarCampoCep(contexto);
  }

  extrairDadosEndereco(contexto: ParentNode = document): DadosEnderecoExtraidos {
    return genericScanner.extrairDadosEndereco(contexto);
  }

  preencherCep(campoCep: HTMLInputElement, cep: string): void {
    genericFiller.preencherCep(campoCep, cep);
  }
}

export const genericWebPlatformAdapter = new GenericWebPlatformAdapter();

