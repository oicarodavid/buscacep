/**
 * Heurísticas de detecção em tempo de execução para plataformas baseadas em GeneXus / SpeedGov.
 */
export class SpeedGovDetector {
  /**
   * Padrões de seletores e atributos gerados nativamente pelo GeneXus e sistema SpeedGov.
   */
  private static readonly SELETORES_CARACTERISTICOS: readonly string[] = [
    // Atributos de contexto e validação do GeneXus
    "[data-gxcontext]",
    "[data-gx-context]",
    "[data-gxvalid]",
    "[data-gx-enabled-id]",
    "[data-gxhiddenonchange]",
    // Classes de formatação de layout e atributos do GeneXus
    "table[class*='gx-tab-']",
    ".ReadonlyAttribute",
    // IDs e names marcantes do SpeedGov (SAT/Tributário)
    "input#vADQPRPCEPLGR",
    "input[name='vADQPRPCEPLGR']",
    "input#BCILGRCEP",
    "input[name='BCILGRCEP']",
    "input#PRPLGRCEP",
    "input[name='PRPLGRCEP']",
    "input#LGRNOM",
    "input#vADQPRPNOMLGR",
    "input#BAINOM",
    "input#vADQPRPLGRBAI"
  ];

  /**
   * Padrões em tags de script ou links na página.
   */
  private static readonly PADROES_SCRIPTS: readonly string[] = [
    "satweb",
    "satitp",
    "com.satweb",
    "gx00",
    "gxgrs",
    "gxfw"
  ];

  /**
   * Analisa o documento para determinar se a página hospedeira é um sistema SpeedGov / GeneXus.
   */
  detectar(doc: Document): boolean {
    if (!doc) return false;

    // 1. Verifica atributos e elementos característicos no DOM
    for (const seletor of SpeedGovDetector.SELETORES_CARACTERISTICOS) {
      if (doc.querySelector(seletor)) {
        return true;
      }
    }

    // 2. Analisa tags de script e stylesheets em busca de referências da infraestrutura SpeedGov/GeneXus
    const scripts = doc.querySelectorAll<HTMLScriptElement>("script[src]");
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i]?.src?.toLowerCase() ?? "";
      for (const padrao of SpeedGovDetector.PADROES_SCRIPTS) {
        if (src.includes(padrao)) {
          return true;
        }
      }
    }

    // 3. Analisa scripts inline ou links de imagem (como prompt.png do GeneXus)
    const imagensPrompt = doc.querySelectorAll<HTMLImageElement>("img.gx-prompt, img[data-gx-attached-ctrl]");
    if (imagensPrompt.length > 0) {
      return true;
    }

    return false;
  }
}

export const speedGovDetector = new SpeedGovDetector();

