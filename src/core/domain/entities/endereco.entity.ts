/**
 * Entidade de endereço com dados do ViaCEP e enriquecida com pontuação de relevância.
 */
export interface Endereco {
  readonly cep: string;
  readonly logradouro: string;
  readonly complemento: string;
  readonly bairro: string;
  readonly localidade: string;
  readonly uf: string;
  readonly ibge: string;
  readonly gia: string;
  readonly ddd: string;
  readonly siafi: string;
  readonly scoreRelevancia?: number;
  readonly destaqueMotivo?: string;
}

/**
 * Tabela de correspondência entre nomes de estados brasileiros e suas siglas de duas letras (UF).
 */
const TABELA_ESTADOS_SIGLAS: Readonly<Record<string, string>> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amapá: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  ceará: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  "espírito santo": "ES",
  goias: "GO",
  goiás: "GO",
  maranhao: "MA",
  maranhão: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  pará: "PA",
  paraiba: "PB",
  paraíba: "PB",
  parana: "PR",
  paraná: "PR",
  pernambuco: "PE",
  piaui: "PI",
  piauí: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  rondônia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  "são paulo": "SP",
  sergipe: "SE",
  tocantins: "TO"
};

/**
 * Normaliza o valor de estado/UF para uma sigla válida de 2 letras maiúsculas.
 */
export function normalizarUf(valorBruto: string): string {
  const limpo = valorBruto.trim().toLowerCase();
  if (limpo.length === 2) {
    return limpo.toUpperCase();
  }
  return TABELA_ESTADOS_SIGLAS[limpo] || valorBruto.trim().toUpperCase();
}

/**
 * Extrai variações do termo de logradouro removendo prefixos usuais (Av., Rua, etc.)
 * para otimizar o índice de retorno na base do ViaCEP/Correios.
 */
export function extrairTermosBuscaLogradouro(logradouro: string): string[] {
  const limpo = logradouro.trim();
  const semPrefixo = limpo
    .replace(
      /^(rua|r\.|avenida|av\.|alameda|al\.|travessa|trv\.|rodovia|rod\.|praca|praça|pça\.)\s+/i,
      ""
    )
    .trim();

  if (
    semPrefixo.length >= 3 &&
    semPrefixo.toLowerCase() !== limpo.toLowerCase()
  ) {
    return [limpo, semPrefixo];
  }

  return [limpo];
}

/**
 * Valida a presença e consistência dos atributos necessários para a consulta de CEP
 * e retorna uma mensagem descritiva detalhando com exatidão quais campos estão ausentes.
 */
export function validarCamposEnderecoParaConsulta(
  logradouro: string,
  cidade: string,
  uf: string
): string | null {
  const faltantes: string[] = [];

  const logradouroLimpo = (logradouro || "").trim();
  const cidadeLimpa = (cidade || "").trim();
  const ufNormalizada = normalizarUf(uf || "");

  if (!logradouroLimpo) {
    faltantes.push("Logradouro");
  } else if (logradouroLimpo.length < 3) {
    faltantes.push("Logradouro (mínimo de 3 caracteres)");
  }

  if (!cidadeLimpa) {
    faltantes.push("Cidade");
  }

  if (!ufNormalizada || ufNormalizada.length !== 2) {
    faltantes.push("UF (Estado)");
  }

  if (faltantes.length === 0) {
    return null;
  }

  if (faltantes.length === 1) {
    return `Preencha o campo ${faltantes[0]} no formulário para consultar o CEP.`;
  }

  if (faltantes.length === 2) {
    return `Preencha os campos ${faltantes[0]} e ${faltantes[1]} no formulário para consultar o CEP.`;
  }

  const ultimo = faltantes.pop();
  return `Preencha os campos ${faltantes.join(", ")} e ${ultimo} no formulário para consultar o CEP.`;
}

