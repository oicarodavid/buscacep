import { defineBackground } from "wxt/utils/define-background";
import { ViaCepHttpRepository } from "../src/infrastructure/api/viacep-http.repository";
import { BuscarCepPorEnderecoUseCase } from "../src/core/application/use-cases/buscar-cep-por-endereco.use-case";
import { BuscarEnderecoPorCepUseCase } from "../src/core/application/use-cases/buscar-endereco-por-cep.use-case";
import { registrarBackgroundMessageDispatcher } from "../src/infrastructure/messaging/background-message-dispatcher";

/**
 * Ponto de entrada do Service Worker de segundo plano da extensão.
 */
export default defineBackground(() => {
  const viaCepRepository = new ViaCepHttpRepository();
  const buscarCepUseCase = new BuscarCepPorEnderecoUseCase(viaCepRepository);
  const buscarEnderecoPorCepUseCase = new BuscarEnderecoPorCepUseCase(viaCepRepository);

  registrarBackgroundMessageDispatcher(buscarCepUseCase, buscarEnderecoPorCepUseCase);
});
