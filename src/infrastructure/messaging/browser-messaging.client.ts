import {
  TIPO_MENSAGEM_BUSCAR_CEP,
  TIPO_MENSAGEM_CONSULTAR_CEP_DIRETO,
  type BuscarCepRequestMessage,
  type BuscarCepResponseMessage,
  type ConsultarCepDiretoRequestMessage,
  type ConsultarCepDiretoResponseMessage
} from "../../core/application/ports/messaging.port";
import type { ConsultaEnderecoParams } from "../../core/domain/types/consulta-endereco.types";
import type { Endereco } from "../../core/domain/entities/endereco.entity";

/**
 * Cliente de mensageria para comunicação entre a interface (Popup / Content Script)
 * e o Service Worker de segundo plano da extensão.
 */
export class BrowserMessagingClient {
  async buscarCep(params: ConsultaEnderecoParams): Promise<Endereco[]> {
    const mensagem: BuscarCepRequestMessage = {
      type: TIPO_MENSAGEM_BUSCAR_CEP,
      payload: params
    };

    const resposta = (await browser.runtime.sendMessage(
      mensagem
    )) as BuscarCepResponseMessage | undefined;

    if (!resposta || !resposta.sucesso) {
      throw new Error(resposta?.erro || "Falha ao obter resposta do serviço de busca de CEP.");
    }

    return resposta.dados;
  }

  async consultarCepDireto(cep: string): Promise<Endereco | null> {
    const mensagem: ConsultarCepDiretoRequestMessage = {
      type: TIPO_MENSAGEM_CONSULTAR_CEP_DIRETO,
      payload: { cep }
    };

    const resposta = (await browser.runtime.sendMessage(
      mensagem
    )) as ConsultarCepDiretoResponseMessage | undefined;

    if (!resposta || !resposta.sucesso) {
      throw new Error(resposta?.erro || "Falha ao consultar o CEP informado.");
    }

    return resposta.endereco;
  }
}

export const browserMessagingClient = new BrowserMessagingClient();

