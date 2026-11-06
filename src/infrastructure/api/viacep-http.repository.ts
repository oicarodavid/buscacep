import type { ICepRepository } from "../../core/application/ports/cep-repository.port";
import type { Endereco } from "../../core/domain/entities/endereco.entity";

/**
 * Adaptador HTTP para consumo da API pública do ViaCEP.
 */
export class ViaCepHttpRepository implements ICepRepository {
  async buscarPorEndereco(
    uf: string,
    cidade: string,
    logradouro: string
  ): Promise<Endereco[]> {
    try {
      const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`;
      const resposta = await fetch(url);

      if (!resposta.ok) {
        return [];
      }

      const dados: unknown = await resposta.json();
      if (Array.isArray(dados)) {
        return dados as Endereco[];
      }

      return [];
    } catch {
      return [];
    }
  }

  async buscarPorCep(cep: string): Promise<Endereco | null> {
    try {
      const cepLimpo = cep.replace(/\D/g, "");
      if (cepLimpo.length !== 8) {
        return null;
      }

      const url = `https://viacep.com.br/ws/${encodeURIComponent(cepLimpo)}/json/`;
      const resposta = await fetch(url);

      if (!resposta.ok) {
        return null;
      }

      const dados: unknown = await resposta.json();
      if (!dados || typeof dados !== "object" || "erro" in (dados as Record<string, unknown>)) {
        return null;
      }

      return dados as Endereco;
    } catch {
      return null;
    }
  }
}

