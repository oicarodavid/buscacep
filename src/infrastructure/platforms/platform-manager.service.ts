import type { IPlatformAdapter } from "../../core/domain/ports/platform-adapter.port";
import { speedGovPlatformAdapter } from "./speedgov/speedgov.adapter";
import { genericWebPlatformAdapter } from "./generic/generic.adapter";

/**
 * Gerenciador de plataformas e ponto único de resolução da estratégia em tempo de execução.
 * Avalia o DOM da página hospedeira e seleciona o adaptador especializado correspondente.
 */
export class PlatformManagerService {
  private readonly adaptersEspecializados: IPlatformAdapter[] = [];
  private readonly adapterFallback: IPlatformAdapter;

  constructor(
    adaptersEspecializados: IPlatformAdapter[] = [speedGovPlatformAdapter],
    adapterFallback: IPlatformAdapter = genericWebPlatformAdapter
  ) {
    this.adaptersEspecializados = [...adaptersEspecializados];
    this.adapterFallback = adapterFallback;
  }

  /**
   * Registra um novo adaptador especializado na fila de prioridades.
   */
  registrarAdapter(adapter: IPlatformAdapter): void {
    this.adaptersEspecializados.unshift(adapter);
  }

  /**
   * Avalia a página hospedeira e retorna o adaptador ideal para o contexto atual.
   */
  obterAdapter(doc: Document = document): IPlatformAdapter {
    if (doc) {
      for (const adapter of this.adaptersEspecializados) {
        if (adapter.detectar(doc)) {
          return adapter;
        }
      }
    }

    return this.adapterFallback;
  }

  /**
   * Retorna a lista de todas as plataformas suportadas no sistema.
   */
  listarPlataformasSuportadas(): readonly { id: string; nome: string }[] {
    return [
      ...this.adaptersEspecializados.map((a) => ({ id: a.id, nome: a.nome })),
      { id: this.adapterFallback.id, nome: this.adapterFallback.nome }
    ];
  }
}

export const platformManagerService = new PlatformManagerService();

