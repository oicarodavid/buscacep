import type { BuscarCepPorEnderecoUseCase } from "../../core/application/use-cases/buscar-cep-por-endereco.use-case";
import type { BuscarEnderecoPorCepUseCase } from "../../core/application/use-cases/buscar-endereco-por-cep.use-case";
import {
  TIPO_MENSAGEM_BUSCAR_CEP,
  TIPO_MENSAGEM_CONSULTAR_CEP_DIRETO,
  type ExtensionRequestMessage,
  type BuscarCepResponseMessage,
  type ConsultarCepDiretoResponseMessage
} from "../../core/application/ports/messaging.port";

/**
 * Registra o despachador de mensagens de segundo plano da extensão.
 */
export function registrarBackgroundMessageDispatcher(
  buscarCepUseCase: BuscarCepPorEnderecoUseCase,
  buscarEnderecoPorCepUseCase: BuscarEnderecoPorCepUseCase
): void {
  browser.runtime.onMessage.addListener(
    (
      mensagem: unknown,
      _sender: unknown,
      sendResponse: (
        response: BuscarCepResponseMessage | ConsultarCepDiretoResponseMessage
      ) => void
    ) => {
      const msg = mensagem as ExtensionRequestMessage | undefined;

      if (!msg || typeof msg !== "object") {
        return undefined;
      }

      // 1. Mensagem para buscar lista de CEPs a partir de endereço
      if (msg.type === TIPO_MENSAGEM_BUSCAR_CEP) {
        return buscarCepUseCase
          .execute(msg.payload)
          .then((dados) => {
            const resposta: BuscarCepResponseMessage = {
              sucesso: true,
              dados
            };
            try {
              sendResponse(resposta);
            } catch {
              // Ignora se o canal já tiver sido resolvido via Promise
            }
            return resposta;
          })
          .catch((err: unknown) => {
            const mensagemErro =
              err instanceof Error ? err.message : "Erro desconhecido na busca de CEP";
            const resposta: BuscarCepResponseMessage = {
              sucesso: false,
              dados: [],
              erro: mensagemErro
            };
            try {
              sendResponse(resposta);
            } catch {
              // Ignora se o canal já tiver sido resolvido via Promise
            }
            return resposta;
          });
      }

      // 2. Mensagem para consultar endereço completo diretamente pelo CEP
      if (msg.type === TIPO_MENSAGEM_CONSULTAR_CEP_DIRETO) {
        return buscarEnderecoPorCepUseCase
          .execute(msg.payload.cep)
          .then((endereco) => {
            const resposta: ConsultarCepDiretoResponseMessage = {
              sucesso: true,
              endereco
            };
            try {
              sendResponse(resposta);
            } catch {
              // Ignora se o canal já tiver sido resolvido via Promise
            }
            return resposta;
          })
          .catch((err: unknown) => {
            const mensagemErro =
              err instanceof Error ? err.message : "Erro ao consultar o CEP informado";
            const resposta: ConsultarCepDiretoResponseMessage = {
              sucesso: false,
              endereco: null,
              erro: mensagemErro
            };
            try {
              sendResponse(resposta);
            } catch {
              // Ignora se o canal já tiver sido resolvido via Promise
            }
            return resposta;
          });
      }

      return undefined;
    }
  );
}

