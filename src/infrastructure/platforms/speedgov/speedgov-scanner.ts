import type { DadosEnderecoExtraidos } from "../../../core/domain/ports/platform-adapter.port";

/**
 * Padrões de campos de CEP no ecossistema SpeedGov / GeneXus.
 */
export const PADROES_CEP_SPEEDGOV: readonly string[] = [
  "vADQPRPCEPLGR",
  "ADQPRPCEPLGR",
  "PRPCEPLGR",
  "CEPLGR",
  "BCILGRCEP",
  "PRPLGRCEP",
  "LGRCEP"
];

/**
 * Scanner de formulários especializado para o sistema SpeedGov (GeneXus).
 */
export class SpeedGovScanner {
  /**
   * Localiza um input ou select no contexto a partir de uma lista de padrões.
   */
  encontrarCampo(
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

      // 2. Busca aproximada case-insensitive
      const seletorAproximado = [
        `input[name*="${padrao}" i]`,
        `input[id*="${padrao}" i]`,
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
   * Localiza o campo de CEP na tela do SpeedGov.
   */
  encontrarCampoCep(contexto: ParentNode = document): HTMLInputElement | null {
    return this.encontrarCampo(PADROES_CEP_SPEEDGOV, contexto) as HTMLInputElement | null;
  }

  /**
   * Extrai o valor textual de um input ou elemento select com segurança para browser e testes.
   */
  obterValorTexto(elemento: HTMLInputElement | HTMLSelectElement | null): string {
    if (!elemento) return "";

    if (
      elemento.tagName === "SELECT" ||
      (typeof HTMLSelectElement !== "undefined" && elemento instanceof HTMLSelectElement)
    ) {
      const select = elemento as HTMLSelectElement;
      const opcao = select.options?.[select.selectedIndex];
      return (opcao?.value || opcao?.text || "").trim();
    }

    return (elemento.value ?? "").trim();
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
    const campo = this.encontrarCampo(padroes, contexto);
    const valorCampo = this.obterValorTexto(campo);
    if (valorCampo) {
      return valorCampo;
    }

    // 2. Fallback para spans gerados pelo GeneXus (ReadonlyAttribute)
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
   * Extrai todos os campos relevantes de endereço do SpeedGov.
   */
  extrairDadosEndereco(contexto?: ParentNode): DadosEnderecoExtraidos {
    const docGlobal = typeof document !== "undefined" ? document : null;
    const ctx = contexto ?? (docGlobal as unknown as ParentNode);
    if (!ctx) {
      return {
        campoCep: null,
        logradouro: "",
        numero: "",
        cidade: "",
        uf: "",
        bairro: ""
      };
    }

    const campoCep = this.encontrarCampoCep(ctx);
    const escopo: ParentNode = campoCep?.closest("table, form") ?? ctx;

    const obterTexto = (padroes: readonly string[]): string => {
      // 1. Busca no escopo mais próximo (ex: TABLE5 ou TABLE15)
      const valorEscopo = this.obterValorTextoOuSpan(padroes, escopo);
      if (valorEscopo) return valorEscopo;

      // 2. Fallback para o documento global (caso Cidade/UF estejam em cabeçalho ou tabela superior)
      if (docGlobal && escopo !== docGlobal && ctx === docGlobal) {
        return this.obterValorTextoOuSpan(padroes, docGlobal);
      }

      return "";
    };

    const logradouro = obterTexto([
      "vADQPRPNOMLGR",
      "ADQPRPNOMLGR",
      "PRPNOMLGR",
      "NOMLGR",
      "LGRNOM",
      "PRPLGRNOM",
      "logradouro",
      "rua",
      "endereco"
    ]);

    const numero = obterTexto([
      "vADQPRPNUMLGR",
      "ADQPRPNUMLGR",
      "PRPNUMLGR",
      "NUMLGR",
      "BCILGRNUM",
      "LGRNUM",
      "PRPLGRNUM",
      "numero",
      "num"
    ]);

    const bairro = obterTexto([
      "vADQPRPLGRBAI",
      "ADQPRPLGRBAI",
      "PRPLGRBAI",
      "LGRBAI",
      "BAINOM",
      "PRPBAINOM",
      "bairro"
    ]);

    const complemento = obterTexto([
      "vADQPRPCOMPLGR",
      "ADQPRPCOMPLGR",
      "PRPCOMPLGR",
      "COMPLGR",
      "BCILGRCOMP",
      "BCICOMPLEMAUX",
      "PRPLGRCOMP",
      "complemento"
    ]);

    const cidade = obterTexto([
      "vADQPRPCIDLGR",
      "ADQPRPCIDLGR",
      "PRPCIDLGR",
      "CIDLGR",
      "MUNNOM",
      "CIDNOM",
      "PRPLGRCID",
      "LGRCID",
      "cidade",
      "municipio"
    ]);

    const uf = obterTexto([
      "vADQPRPLGRUF",
      "ADQPRPLGRUF",
      "PRPLGRUF",
      "LGRUF",
      "UFCOD",
      "UFSIGLA",
      "uf",
      "estado"
    ]);

    return {
      campoCep,
      logradouro,
      numero,
      cidade,
      uf,
      bairro,
      complemento
    };
  }
}

export const speedGovScanner = new SpeedGovScanner();
