import type { Endereco } from "../../domain/entities/endereco.entity";

/**
 * Porta de repositório para acesso a dados de endereço e CEP.
 */
export interface ICepRepository {
  buscarPorEndereco(
    uf: string,
    cidade: string,
    logradouro: string
  ): Promise<Endereco[]>;
  buscarPorCep(cep: string): Promise<Endereco | null>;
}

