import type {
  IPlatformAdapter,
  DadosEnderecoExtraidos
} from "../../../core/domain/ports/platform-adapter.port";
import { speedGovDetector } from "./speedgov-detector";
import { speedGovScanner } from "./speedgov-scanner";
import { speedGovFiller } from "./speedgov-filler";

/**
 * Adaptador de plataforma para sistemas SpeedGov / GeneXus.
 * Oferece 100% de suporte às particularidades do GeneXus:
 * - Padrões de variáveis (vADQPRP*, BCILGR*, PRPLGR*, LGR*)
 * - Suporte a spans ReadonlyAttribute
 * - Emulação física de eventos e proteção anti-rollback contra o buffer do GeneXus
 */
export class SpeedGovPlatformAdapter implements IPlatformAdapter {
  readonly id = "speedgov";
  readonly nome = "SpeedGov / GeneXus";

  detectar(doc: Document): boolean {
    return speedGovDetector.detectar(doc);
  }

  encontrarCampoCep(contexto: ParentNode = document): HTMLInputElement | null {
    return speedGovScanner.encontrarCampoCep(contexto);
  }

  extrairDadosEndereco(contexto: ParentNode = document): DadosEnderecoExtraidos {
    return speedGovScanner.extrairDadosEndereco(contexto);
  }

  preencherCep(campoCep: HTMLInputElement, cep: string): void {
    speedGovFiller.preencherCep(campoCep, cep);
  }
}

export const speedGovPlatformAdapter = new SpeedGovPlatformAdapter();

