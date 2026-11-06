import { platformManagerService } from "../platforms/platform-manager.service";

/**
 * Serviço de fachada para preenchimento de inputs no DOM.
 * Delega o preenchimento reativo para o adaptador de plataforma detectado.
 */
export class DomInputFillerService {
  /**
   * Preenche o campo de CEP delegando para a estratégia da plataforma correspondente.
   */
  preencherInputReativo(input: HTMLInputElement, valor: string): void {
    if (!input) return;
    const doc = input.ownerDocument ?? document;
    const adapter = platformManagerService.obterAdapter(doc);
    adapter.preencherCep(input, valor);
  }
}

export const domInputFillerService = new DomInputFillerService();
