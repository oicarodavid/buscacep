/**
 * Dados de formulário de endereço extraídos do DOM da página hospedeira.
 */
export interface DadosEnderecoExtraidos {
  readonly campoCep: HTMLInputElement | null;
  readonly logradouro: string;
  readonly numero: string;
  readonly cidade: string;
  readonly uf: string;
  readonly bairro: string;
}

/**
 * Padrões de identificadores de campos de CEP no DOM.
 * Inclui padrões GeneXus (BCILGRCEP, PRPLGRCEP, LGRCEP) e padrões web gerais.
 */
export const PADROES_SELECAO_CEP: readonly string[] = [
  "BCILGRCEP",
  "PRPLGRCEP",
  "LGRCEP",
  "cep",
  "postal-code",
  "zipcode",
  "codigo-postal"
];

/**
 * Serviço de infraestrutura para varredura e localização de elementos de formulário
 * no DOM, com suporte especializado para sistemas GeneXus (prefixos BCILGR*, PRPLGR*, LGR*, BAI*) e formulários web gerais.
 */
export class DomFormScannerService {
  /**
   * Localiza um elemento de entrada no DOM a partir de uma lista de padrões de busca.
   */
  encontrarCampoFormulario(
    padroes: readonly string[],
    contexto: ParentNode = document
  ): HTMLInputElement | HTMLSelectElement | null {
    for (const padrao of padroes) {
      // 1. Busca exata por ID ou Name
      const seletorExato = [
        `input#${padrao}`,
        `input[name="${padrao}"]`,
        `select#${padrao}`,
        `select[name="${padrao}"]`
      ].join(", ");

      const elementoExato = contexto.querySelector<
        HTMLInputElement | HTMLSelectElement
      >(seletorExato);
      if (elementoExato) return elementoExato;

      // 2. Busca aproximada (case-insensitive) por atributos comuns
      const seletorAproximado = [
        `input[name*="${padrao}" i]`,
        `input[id*="${padrao}" i]`,
        `input[placeholder*="${padrao}" i]`,
        `input[autocomplete*="${padrao}" i]`,
        `input[aria-label*="${padrao}" i]`,
        `select[name*="${padrao}" i]`,
        `select[id*="${padrao}" i]`
      ].join(", ");

      const elementoAproximado = contexto.querySelector<
        HTMLInputElement | HTMLSelectElement
      >(seletorAproximado);
      if (elementoAproximado) return elementoAproximado;
    }

    return null;
  }

  /**
   * Extrai com segurança o valor em texto de um input ou elemento select.
   */
  obterValorTexto(elemento: HTMLInputElement | HTMLSelectElement | null): string {
    if (!elemento) return "";

    if (elemento instanceof HTMLSelectElement) {
      const opcao = elemento.options[elemento.selectedIndex];
      return (opcao?.value || opcao?.text || "").trim();
    }

    return elemento.value.trim();
  }

  /**
   * Extrai com segurança o valor em texto buscando primeiro em inputs/selects e,
   * em caso de campos readonly ou ocultos do GeneXus, em elementos <span> associados.
   */
  obterValorTextoOuSpan(
    padroes: readonly string[],
    contexto: ParentNode = document
  ): string {
    // 1. Tenta campo de entrada tradicional (input ou select)
    const campo = this.encontrarCampoFormulario(padroes, contexto);
    const valorCampo = this.obterValorTexto(campo);
    if (valorCampo) {
      return valorCampo;
    }

    // 2. Fallback para spans do GeneXus (ex: span_LGRNOM, span_BAINOM, ReadonlyAttribute)
    for (const padrao of padroes) {
      const seletoresSpan = [
        `span#span_${padrao}`,
        `span[data-name="span_${padrao}"]`,
        `span[data-gx-enabled-id="${padrao}"]`,
        `span#${padrao}`,
        `span[id*="${padrao}" i]`
      ].join(", ");

      const spanElemento = contexto.querySelector<HTMLElement>(seletoresSpan);
      if (spanElemento) {
        const texto = spanElemento.textContent?.trim();
        if (texto) {
          return texto;
        }
      }
    }

    return "";
  }

  /**
   * Extrai todos os campos relevantes de endereço presentes na página no escopo do CEP.
   */
  extrairDadosEndereco(): DadosEnderecoExtraidos {
    const campoCep = this.encontrarCampoFormulario(
      PADROES_SELECAO_CEP
    ) as HTMLInputElement | null;
    const escopo: ParentNode = campoCep?.closest("table, form") ?? document;

    const obterTexto = (padroes: readonly string[]): string => {
      // 1. Tenta obter no escopo mais próximo (tabela ou form)
      const valorEscopo = this.obterValorTextoOuSpan(padroes, escopo);
      if (valorEscopo) return valorEscopo;

      // 2. Se não encontrou no escopo local, faz fallback para o document inteiro (ex: Cidade/UF em outro container)
      if (escopo !== document) {
        return this.obterValorTextoOuSpan(padroes, document);
      }

      return "";
    };

    // Padrões de Logradouro: LGRNOM (novo GeneXus), PRPLGRNOM, logradouro, rua, etc.
    const logradouro = obterTexto([
      "LGRNOM",
      "PRPLGRNOM",
      "logradouro",
      "rua",
      "street",
      "endereco",
      "address"
    ]);

    // Padrões de Número: BCILGRNUM (novo GeneXus), LGRNUM, PRPLGRNUM, numero, etc.
    const numero = obterTexto([
      "BCILGRNUM",
      "LGRNUM",
      "PRPLGRNUM",
      "numero",
      "number",
      "num"
    ]);

    // Padrões de Bairro: BAINOM (novo GeneXus), PRPBAINOM, PRPLGRBAI, bairro, etc.
    const bairro = obterTexto([
      "BAINOM",
      "PRPBAINOM",
      "PRPLGRBAI",
      "bairro",
      "neighborhood",
      "distrito"
    ]);

    // Padrões de Cidade: MUNNOM, CIDNOM, PRPLGRCID, LGRCID, cidade, etc.
    const cidade = obterTexto([
      "MUNNOM",
      "CIDNOM",
      "PRPLGRCID",
      "LGRCID",
      "cidade",
      "municipio",
      "city",
      "localidade"
    ]);

    // Padrões de UF: UFCOD, UFSIGLA, PRPLGRUF, LGRUF, uf, estado, etc.
    const uf = obterTexto([
      "UFCOD",
      "UFSIGLA",
      "PRPLGRUF",
      "LGRUF",
      "uf",
      "estado",
      "state",
      "provincia"
    ]);

    return {
      campoCep,
      logradouro,
      numero,
      cidade,
      uf,
      bairro
    };
  }
}

export const domFormScannerService = new DomFormScannerService();

