import type { ResultadoCompatibilidade } from "../types/score-relevancia.types";

/**
 * Remove acentos e converte para minúsculas para comparações textuais seguras.
 */
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Analisa o texto de complemento oficial dos Correios (ex: "de 976/977 a 1378/1379", "de 3000 ao fim", "lado ímpar", "até 999")
 * e calcula com alta precisão matemática a compatibilidade do número predial do imóvel.
 */
export function avaliarCompatibilidadeNumero(
  complementoBruto: string,
  numeroImovelStr: string
): ResultadoCompatibilidade {
  const numeroLimpo = numeroImovelStr.replace(/\D/g, "");
  if (!numeroLimpo) {
    return { compativel: false, temFaixaRestritiva: false, score: 0, motivo: "" };
  }

  const num = parseInt(numeroLimpo, 10);
  if (Number.isNaN(num)) {
    return { compativel: false, temFaixaRestritiva: false, score: 0, motivo: "" };
  }

  const comp = normalizarTexto(complementoBruto || "");
  if (!comp) {
    // Quando não há complemento, o CEP atende qualquer numeração da rua sem restrições
    return {
      compativel: true,
      temFaixaRestritiva: false,
      score: 10,
      motivo: "Atende toda a extensão"
    };
  }

  const ehPar = num % 2 === 0;

  // 1. Detecta restrições explícitas de paridade textual
  const exigePar =
    comp.includes("lado par") ||
    comp.includes("somente par") ||
    comp.includes("numeros pares") ||
    comp.includes("pares");

  const exigeImpar =
    comp.includes("lado impar") ||
    comp.includes("somente impar") ||
    comp.includes("numeros impares") ||
    comp.includes("impares");

  // CASO 1: Faixa dupla com barras par/ímpar no início e fim: "de 976/977 a 1378/1379"
  const matchDuploIntervalo = comp.match(
    /de\s+(\d+)\s*\/\s*(\d+)\s+a\s+(\d+)\s*\/\s*(\d+)/
  );
  if (matchDuploIntervalo) {
    const n1 = parseInt(matchDuploIntervalo[1] ?? "0", 10);
    const n2 = parseInt(matchDuploIntervalo[2] ?? "0", 10);
    const n3 = parseInt(matchDuploIntervalo[3] ?? "0", 10);
    const n4 = parseInt(matchDuploIntervalo[4] ?? "0", 10);

    const inicios = [n1, n2];
    const fins = [n3, n4];

    const inicioPar = Math.min(...inicios.filter((n) => n % 2 === 0));
    const fimPar = Math.max(...fins.filter((n) => n % 2 === 0));
    const inicioImpar = Math.min(...inicios.filter((n) => n % 2 !== 0));
    const fimImpar = Math.max(...fins.filter((n) => n % 2 !== 0));

    if (ehPar) {
      if (num >= inicioPar && num <= fimPar) {
        return {
          compativel: true,
          temFaixaRestritiva: true,
          score: 200,
          motivo: `Número ${num} dentro da faixa par (${inicioPar} a ${fimPar})`
        };
      }
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: `Número ${num} fora da faixa par (${inicioPar} a ${fimPar})`
      };
    } else {
      if (num >= inicioImpar && num <= fimImpar) {
        return {
          compativel: true,
          temFaixaRestritiva: true,
          score: 200,
          motivo: `Número ${num} dentro da faixa ímpar (${inicioImpar} a ${fimImpar})`
        };
      }
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: `Número ${num} fora da faixa ímpar (${inicioImpar} a ${fimImpar})`
      };
    }
  }

  // CASO 2: Faixa dupla com barras "de X/Y ao fim" / "de X/Y em diante"
  const matchDuploAoFim = comp.match(
    /de\s+(\d+)\s*\/\s*(\d+)\s+(?:ao\s+fim|ao\s+final|em\s+diante|a\s+seguir)/
  );
  if (matchDuploAoFim) {
    const n1 = parseInt(matchDuploAoFim[1] ?? "0", 10);
    const n2 = parseInt(matchDuploAoFim[2] ?? "0", 10);
    const inicios = [n1, n2];
    const inicioPar = Math.min(...inicios.filter((n) => n % 2 === 0));
    const inicioImpar = Math.min(...inicios.filter((n) => n % 2 !== 0));

    if (ehPar) {
      if (num >= inicioPar) {
        return {
          compativel: true,
          temFaixaRestritiva: true,
          score: 200,
          motivo: `Número ${num} dentro da faixa par (de ${inicioPar} ao fim)`
        };
      }
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: `Número ${num} menor que o início da faixa par (${inicioPar})`
      };
    } else {
      if (num >= inicioImpar) {
        return {
          compativel: true,
          temFaixaRestritiva: true,
          score: 200,
          motivo: `Número ${num} dentro da faixa ímpar (de ${inicioImpar} ao fim)`
        };
      }
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: `Número ${num} menor que o início da faixa ímpar (${inicioImpar})`
      };
    }
  }

  // CASO 3: Faixa dupla com barras "até X/Y"
  const matchDuploAte = comp.match(/ate\s+(\d+)\s*\/\s*(\d+)/);
  if (matchDuploAte) {
    const n1 = parseInt(matchDuploAte[1] ?? "0", 10);
    const n2 = parseInt(matchDuploAte[2] ?? "0", 10);
    const fins = [n1, n2];
    const fimPar = Math.max(...fins.filter((n) => n % 2 === 0));
    const fimImpar = Math.max(...fins.filter((n) => n % 2 !== 0));

    if (ehPar) {
      if (num <= fimPar) {
        return {
          compativel: true,
          temFaixaRestritiva: true,
          score: 200,
          motivo: `Número ${num} dentro da faixa par (até ${fimPar})`
        };
      }
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: `Número ${num} maior que o fim da faixa par (${fimPar})`
      };
    } else {
      if (num <= fimImpar) {
        return {
          compativel: true,
          temFaixaRestritiva: true,
          score: 200,
          motivo: `Número ${num} dentro da faixa ímpar (até ${fimImpar})`
        };
      }
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: `Número ${num} maior que o fim da faixa ímpar (${fimImpar})`
      };
    }
  }

  // CASO 4: Faixa simples "de X a Y"
  const matchSimplesIntervalo = comp.match(/de\s+(\d+)\s+a\s+(\d+)/);
  if (matchSimplesIntervalo) {
    const inicio = parseInt(matchSimplesIntervalo[1] ?? "0", 10);
    const fim = parseInt(matchSimplesIntervalo[2] ?? "0", 10);

    if (exigePar && !ehPar) {
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: "Exige numeração par"
      };
    }
    if (exigeImpar && ehPar) {
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: "Exige numeração ímpar"
      };
    }

    if (num >= inicio && num <= fim) {
      return {
        compativel: true,
        temFaixaRestritiva: true,
        score: 200,
        motivo: `Número ${num} dentro da faixa (${inicio} a ${fim})`
      };
    }
    return {
      compativel: false,
      temFaixaRestritiva: true,
      score: -500,
      motivo: `Número ${num} fora da faixa (${inicio} a ${fim})`
    };
  }

  // CASO 5: Faixa simples "de X ao fim" / "de X em diante"
  const matchSimplesAoFim = comp.match(
    /(?:de|a\s+partir\s+de)\s+(\d+)\s*(?:ao\s+fim|ao\s+final|em\s+diante|a\s+seguir)?/
  );
  if (matchSimplesAoFim && (comp.includes("fim") || comp.includes("diante") || comp.includes("partir"))) {
    const inicio = parseInt(matchSimplesAoFim[1] ?? "0", 10);

    if (exigePar && !ehPar) {
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: "Exige numeração par"
      };
    }
    if (exigeImpar && ehPar) {
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: "Exige numeração ímpar"
      };
    }

    if (num >= inicio) {
      return {
        compativel: true,
        temFaixaRestritiva: true,
        score: 200,
        motivo: `Número ${num} compatível (de ${inicio} em diante)`
      };
    }
    return {
      compativel: false,
      temFaixaRestritiva: true,
      score: -500,
      motivo: `Número ${num} menor que ${inicio}`
    };
  }

  // CASO 6: Faixa simples "até Y" / "ate Y"
  const matchSimplesAte = comp.match(/ate\s+(\d+)/);
  if (matchSimplesAte) {
    const fim = parseInt(matchSimplesAte[1] ?? "0", 10);

    if (exigePar && !ehPar) {
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: "Exige numeração par"
      };
    }
    if (exigeImpar && ehPar) {
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: "Exige numeração ímpar"
      };
    }

    if (num <= fim) {
      return {
        compativel: true,
        temFaixaRestritiva: true,
        score: 200,
        motivo: `Número ${num} compatível (até ${fim})`
      };
    }
    return {
      compativel: false,
      temFaixaRestritiva: true,
      score: -500,
      motivo: `Número ${num} maior que ${fim}`
    };
  }

  // CASO 7: Apenas paridade sem número limite
  if (exigePar || exigeImpar) {
    if (exigePar && !ehPar) {
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: "Exige numeração par"
      };
    }
    if (exigeImpar && ehPar) {
      return {
        compativel: false,
        temFaixaRestritiva: true,
        score: -500,
        motivo: "Exige numeração ímpar"
      };
    }
    return {
      compativel: true,
      temFaixaRestritiva: true,
      score: 100,
      motivo: ehPar ? "Lado par compatível" : "Lado ímpar compatível"
    };
  }

  // Complemento não contém regras de numeração (ex: "Centro", "Bloco A", etc.)
  return {
    compativel: true,
    temFaixaRestritiva: false,
    score: 10,
    motivo: "Sem restrição numérica"
  };
}
