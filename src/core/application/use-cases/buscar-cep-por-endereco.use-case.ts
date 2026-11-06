import type { ICepRepository } from "../ports/cep-repository.port";
import type { ConsultaEnderecoParams } from "../../domain/types/consulta-endereco.types";
import {
  type Endereco,
  normalizarUf,
  extrairTermosBuscaLogradouro
} from "../../domain/entities/endereco.entity";
import { avaliarCompatibilidadeNumero } from "../../domain/entities/faixa-numero.entity";

/**
 * Caso de uso responsável por consultar CEPs a partir de dados parciais de endereço,
 * aplicando normalizações e ordenando pelo grau de relevância.
 */
export class BuscarCepPorEnderecoUseCase {
  constructor(private readonly cepRepository: ICepRepository) {}

  async execute(params: ConsultaEnderecoParams): Promise<Endereco[]> {
    const uf = normalizarUf(params.uf || "");
    const cidadeLimpa = (params.cidade || "").trim();
    const logradouroLimpo = (params.logradouro || "").trim();

    if (
      !uf ||
      uf.length !== 2 ||
      !cidadeLimpa ||
      !logradouroLimpo ||
      logradouroLimpo.length < 3
    ) {
      return [];
    }

    const termos = extrairTermosBuscaLogradouro(logradouroLimpo);
    let resultados: Endereco[] = [];

    for (const termo of termos) {
      resultados = await this.cepRepository.buscarPorEndereco(
        uf,
        cidadeLimpa,
        termo
      );
      if (resultados.length > 0) {
        break;
      }
    }

    const bairroNormalizado = (params.bairro || "").trim().toLowerCase();
    const numeroNormalizado = (params.numero || "").trim();

    const resultadosEnriquecidos: Endereco[] = resultados.map((item) => {
      let score = 0;
      const motivos: string[] = [];

      const bairroItem = (item.bairro || "").trim().toLowerCase();
      const temBairroExato = bairroNormalizado && bairroItem === bairroNormalizado;
      const temBairroSimilar =
        bairroNormalizado &&
        !temBairroExato &&
        (bairroItem.includes(bairroNormalizado) ||
          bairroNormalizado.includes(bairroItem));

      if (numeroNormalizado) {
        const avaliacao = avaliarCompatibilidadeNumero(
          item.complemento,
          numeroNormalizado
        );

        if (avaliacao.temFaixaRestritiva) {
          if (!avaliacao.compativel) {
            // Se o CEP tem faixa restritiva e o número informado está FORA dela,
            // desqualifica o CEP categoricamente para que não seja recomendado por engano
            score = 0;
            motivos.push(avaliacao.motivo);
          } else {
            // Número está dentro da faixa deste CEP seccionado
            score = avaliacao.score; // 200 pontos
            motivos.push(avaliacao.motivo);

            // Bônus adicional caso o bairro também coincida perfeitamente
            if (temBairroExato) {
              score += 100;
              motivos.push("Bairro exato");
            } else if (temBairroSimilar) {
              score += 50;
              motivos.push("Bairro similar");
            }
          }
        } else {
          // CEP atende a rua inteira sem seccionamento numérico restritivo
          score = 30;
          if (temBairroExato) {
            score += 120;
            motivos.push("Bairro exato");
          } else if (temBairroSimilar) {
            score += 80;
            motivos.push("Bairro similar");
          }
        }
      } else {
        // Usuário não preencheu número predial: desempate principal é pela correspondência de Bairro
        if (temBairroExato) {
          score += 120;
          motivos.push("Bairro exato");
        } else if (temBairroSimilar) {
          score += 80;
          motivos.push("Bairro similar");
        }
      }

      return {
        ...item,
        scoreRelevancia: score,
        destaqueMotivo: motivos.join(" • ")
      };
    });

    // Ordenação decrescente por score de relevância
    resultadosEnriquecidos.sort(
      (a, b) => (b.scoreRelevancia ?? 0) - (a.scoreRelevancia ?? 0)
    );

    return resultadosEnriquecidos;
  }
}

