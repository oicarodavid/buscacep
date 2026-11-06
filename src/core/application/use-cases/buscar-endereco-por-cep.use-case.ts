import type { ICepRepository } from "../ports/cep-repository.port";
import type { Endereco } from "../../domain/entities/endereco.entity";

/**
 * Caso de uso responsável por consultar o endereço completo a partir de um código CEP.
 */
export class BuscarEnderecoPorCepUseCase {
  constructor(private readonly cepRepository: ICepRepository) {}

  async execute(cep: string): Promise<Endereco | null> {
    const cepLimpo = (cep || "").replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      return null;
    }

    return this.cepRepository.buscarPorCep(cepLimpo);
  }
}

