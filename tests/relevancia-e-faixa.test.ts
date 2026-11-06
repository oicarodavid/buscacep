import { describe, it, expect } from "bun:test";
import { avaliarCompatibilidadeNumero } from "../src/core/domain/entities/faixa-numero.entity";
import { validarCamposEnderecoParaConsulta } from "../src/core/domain/entities/endereco.entity";
import { BuscarCepPorEnderecoUseCase } from "../src/core/application/use-cases/buscar-cep-por-endereco.use-case";
import type { ICepRepository } from "../src/core/application/ports/cep-repository.port";
import type { Endereco } from "../src/core/domain/entities/endereco.entity";

describe("avaliarCompatibilidadeNumero - Seccionamentos dos Correios", () => {
  it("deve desqualificar o CEP 62508-060 para o número 1258 (faixa 1380/1381 a 1495/1496)", () => {
    const res = avaliarCompatibilidadeNumero(
      "de 1380/1381 a 1495/1496",
      "1258"
    );
    expect(res.compativel).toBe(false);
    expect(res.temFaixaRestritiva).toBe(true);
    expect(res.score).toBeLessThan(0);
  });

  it("deve qualificar com alta pontuação o CEP 62508-205 para o número 1258 (faixa 976/977 a 1378/1379)", () => {
    const res = avaliarCompatibilidadeNumero(
      "de 976/977 a 1378/1379",
      "1258"
    );
    expect(res.compativel).toBe(true);
    expect(res.temFaixaRestritiva).toBe(true);
    expect(res.score).toBe(200);
  });

  it("deve reconhecer números ímpares dentro da faixa ímpar", () => {
    const res = avaliarCompatibilidadeNumero(
      "de 976/977 a 1378/1379",
      "977"
    );
    expect(res.compativel).toBe(true);
    expect(res.score).toBe(200);
  });

  it("deve rejeitar número ímpar fora da faixa ímpar", () => {
    const res = avaliarCompatibilidadeNumero(
      "de 976/977 a 1378/1379",
      "1401"
    );
    expect(res.compativel).toBe(false);
    expect(res.score).toBeLessThan(0);
  });

  it("deve avaliar corretamente 'de X/Y ao fim'", () => {
    const resDentro = avaliarCompatibilidadeNumero("de 1380/1381 ao fim", "1500");
    expect(resDentro.compativel).toBe(true);
    expect(resDentro.score).toBe(200);

    const resFora = avaliarCompatibilidadeNumero("de 1380/1381 ao fim", "1200");
    expect(resFora.compativel).toBe(false);
  });

  it("deve avaliar corretamente 'até X/Y'", () => {
    const resDentro = avaliarCompatibilidadeNumero("até 974/975", "500");
    expect(resDentro.compativel).toBe(true);

    const resFora = avaliarCompatibilidadeNumero("até 974/975", "1000");
    expect(resFora.compativel).toBe(false);
  });

  it("deve avaliar corretamente 'de 100 a 500 - lado par'", () => {
    const resParDentro = avaliarCompatibilidadeNumero("de 100 a 500 - lado par", "250");
    expect(resParDentro.compativel).toBe(true);

    const resImpar = avaliarCompatibilidadeNumero("de 100 a 500 - lado par", "251");
    expect(resImpar.compativel).toBe(false);

    const resFora = avaliarCompatibilidadeNumero("de 100 a 500 - lado par", "600");
    expect(resFora.compativel).toBe(false);
  });

  it("deve considerar compatível quando não há restrição de faixa no complemento", () => {
    const res = avaliarCompatibilidadeNumero("", "1258");
    expect(res.compativel).toBe(true);
    expect(res.temFaixaRestritiva).toBe(false);
    expect(res.score).toBe(10);
  });
});

describe("BuscarCepPorEnderecoUseCase - Simulação Real do Caso Usuário", () => {
  it("deve ordenar em 1º lugar o CEP 62508-205 para Rua Frei Cassiano, 1258 com bairro Coqueiro", async () => {
    const fakeRepo: ICepRepository = {
      buscarPorCep: async () => null,
      buscarPorEndereco: async () => [
        {
          cep: "62508-060",
          logradouro: "Rua Frei Cassiano",
          complemento: "de 1380/1381 a 1495/1496",
          bairro: "Coqueiro",
          localidade: "Itapipoca",
          uf: "CE",
          ibge: "",
          gia: "",
          ddd: "88",
          siafi: ""
        },
        {
          cep: "62508-205",
          logradouro: "Rua Frei Cassiano",
          complemento: "de 976/977 a 1378/1379",
          bairro: "São Sebastião",
          localidade: "Itapipoca",
          uf: "CE",
          ibge: "",
          gia: "",
          ddd: "88",
          siafi: ""
        }
      ]
    };

    const useCase = new BuscarCepPorEnderecoUseCase(fakeRepo);
    const resultados = await useCase.execute({
      uf: "CE",
      cidade: "Itapipoca",
      logradouro: "Rua Frei Cassiano",
      numero: "1258",
      bairro: "Coqueiro"
    });

    expect(resultados).toHaveLength(2);
    // O 1º colocado DEVE ser o 62508-205 com score 200 (> 50)
    expect(resultados[0]?.cep).toBe("62508-205");
    expect(resultados[0]?.scoreRelevancia).toBe(200);

    // O 62508-060 DEVE ter score 0 (fora da faixa numérica) e não ser recomendado
    expect(resultados[1]?.cep).toBe("62508-060");
    expect(resultados[1]?.scoreRelevancia).toBe(0);
  });
});

describe("validarCamposEnderecoParaConsulta - Feedback discriminado", () => {
  it("informa apenas UF quando somente ela faltar", () => {
    const msg = validarCamposEnderecoParaConsulta("Rua Frei Cassiano", "Itapipoca", "");
    expect(msg).toBe("Preencha o campo UF (Estado) no formulário para consultar o CEP.");
  });

  it("informa apenas Cidade quando somente ela faltar", () => {
    const msg = validarCamposEnderecoParaConsulta("Rua Frei Cassiano", "", "CE");
    expect(msg).toBe("Preencha o campo Cidade no formulário para consultar o CEP.");
  });

  it("informa apenas Logradouro quando somente ele faltar", () => {
    const msg = validarCamposEnderecoParaConsulta("", "Itapipoca", "CE");
    expect(msg).toBe("Preencha o campo Logradouro no formulário para consultar o CEP.");
  });

  it("informa Logradouro com mínimo de 3 caracteres quando tiver menos", () => {
    const msg = validarCamposEnderecoParaConsulta("Av", "Itapipoca", "CE");
    expect(msg).toBe("Preencha o campo Logradouro (mínimo de 3 caracteres) no formulário para consultar o CEP.");
  });

  it("informa Cidade e UF quando ambos faltarem", () => {
    const msg = validarCamposEnderecoParaConsulta("Rua Frei Cassiano", "", "");
    expect(msg).toBe("Preencha os campos Cidade e UF (Estado) no formulário para consultar o CEP.");
  });

  it("informa todos os campos quando nenhum estiver preenchido", () => {
    const msg = validarCamposEnderecoParaConsulta("", "", "");
    expect(msg).toBe("Preencha os campos Logradouro, Cidade e UF (Estado) no formulário para consultar o CEP.");
  });

  it("retorna null quando todos os campos obrigatórios estiverem válidos", () => {
    const msg = validarCamposEnderecoParaConsulta("Rua Frei Cassiano", "Itapipoca", "CE");
    expect(msg).toBeNull();
  });
});
