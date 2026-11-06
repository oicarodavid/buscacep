import type { DadosEnderecoExtraidos } from "../../../core/domain/ports/platform-adapter.port";

/**
 * Padrões de identificadores de campos de CEP em páginas e formulários web gerais.
 */
export const PADROES_CEP_GENERIC: readonly string[] = [
  "cep",
  "postal-code",
  "postalcode",
  "zipcode",
  "zip-code",
  "codigo-postal",
  "codigopostal"
];

/**
 * Scanner de formulários padrão da Web para páginas convencionais (e-commerces, sistemas SaaS e portais web).
 */
export class GenericScanner {
  /**
   * Localiza um input ou select por atributos padrão HTML (id, name, autocomplete, placeholder, aria-label).
   */
  encontrarCampo(
    padroes: readonly string[],
    contexto: ParentNode = document
  ): HTMLInputElement | HTMLSelectElement | null {
    for (const padrao of padroes) {
      // 1. Busca exata por ID, Name ou Autocomplete
      const seletorExato = [
        `input#${padrao}`,
        `input[name="${padrao}"]`,
        `input[autocomplete="${padrao}"]`,
        `select#${padrao}`,
        `select[name="${padrao}"]`,
        `select[autocomplete="${padrao}"]`
      ].join(", ");

      const elementoExato = contexto.querySelector<
        HTMLInputElement | HTMLSelectElement
      >(seletorExato);
      if (elementoExato) return elementoExato;

      // 2. Busca aproximada case-insensitive
      const seletorAproximado = [
        `input[name*="${padrao}" i]`,
        `input[id*="${padrao}" i]`,
        `input[placeholder*="${padrao}" i]`,
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
   * Localiza o campo de CEP no formulário genérico.
   */
  encontrarCampoCep(contexto: ParentNode = document): HTMLInputElement | null {
    return this.encontrarCampo(PADROES_CEP_GENERIC, contexto) as HTMLInputElement | null;
  }

  /**
   * Extrai com segurança o valor em texto de um input ou elemento select para browser e testes.
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
   * Extrai todos os campos relevantes de endereço presentes no formulário genérico da página.
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
    const escopo: ParentNode = campoCep?.closest("form, fieldset, table") ?? ctx;

    const obterTexto = (padroes: readonly string[]): string => {
      const campo = this.encontrarCampo(padroes, escopo);
      if (campo) {
        const val = this.obterValorTexto(campo);
        if (val) return val;
      }

      if (docGlobal && escopo !== docGlobal && ctx === docGlobal) {
        const campoDoc = this.encontrarCampo(padroes, docGlobal);
        return this.obterValorTexto(campoDoc);
      }

      return "";
    };

    const logradouro = obterTexto([
      "logradouro",
      "rua",
      "endereco",
      "address-line1",
      "street",
      "address"
    ]);

    const numero = obterTexto([
      "numero",
      "num",
      "number",
      "house-number"
    ]);

    const bairro = obterTexto([
      "bairro",
      "neighborhood",
      "distrito",
      "address-level3"
    ]);

    const complemento = obterTexto([
      "complemento",
      "compl",
      "address-line2"
    ]);

    const cidade = obterTexto([
      "cidade",
      "municipio",
      "city",
      "address-level2",
      "localidade"
    ]);

    const uf = obterTexto([
      "uf",
      "estado",
      "state",
      "address-level1",
      "provincia"
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

export const genericScanner = new GenericScanner();
