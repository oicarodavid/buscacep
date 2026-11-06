/**
 * Resultado da análise de compatibilidade de um número predial
 * em relação às faixas de seccionamento dos Correios/ViaCEP.
 */
export interface ResultadoCompatibilidade {
  readonly compativel: boolean;
  readonly temFaixaRestritiva: boolean;
  readonly score: number;
  readonly motivo: string;
}

