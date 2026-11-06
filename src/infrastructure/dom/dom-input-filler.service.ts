/**
 * Interface auxiliar para extração segura de descritores de propriedade do protótipo nativo.
 */
interface InputElementPrototype {
  value?: string;
}

/**
 * Serviço de infraestrutura especializado no preenchimento de inputs com emulação
 * de digitação física e sincronização profunda de buffers de estado do GeneXus (window.gx).
 *
 * Evita o problema clássico onde o GeneXus mantém o estado anterior da tela em cache
 * e restaura o campo para vazio quando o usuário clica em qualquer ponto da página.
 */
export class DomInputFillerService {
  /**
   * Preenche o campo de input de forma reativa, combinando emulação de eventos de digitação,
   * injeção de sincronização no contexto da página (MAIN world) e proteção contra reversão de estado.
   */
  preencherInputReativo(input: HTMLInputElement, valor: string): void {
    // 1. Aplica o valor no DOM e aciona o setter nativo do protótipo
    this.aplicarValorNativo(input, valor);

    // 2. Emula a digitação física caractere por caractere para alimentar máscaras do GeneXus
    this.emularDigitacaoFisica(input, valor);

    // 3. Executa manipuladores inline presentes no elemento (oninput, onchange)
    this.executarManipuladoresInline(input);

    // 4. Dispara e propaga o evento de blur (perda de foco), momento em que o GeneXus valida e persiste no buffer
    input.dispatchEvent(new FocusEvent("blur", { bubbles: true, cancelable: true }));
    if (typeof input.onblur === "function") {
      try {
        input.onblur.call(input, new FocusEvent("blur"));
      } catch {
        // Ignora particularidades da página
      }
    }

    // 5. Instala guardião temporário contra reversão (anti-rollback) ao clicar na página
    this.instalarGuardiaoAntiRollback(input, valor);
  }

  /**
   * Atribui o valor utilizando o setter nativo de HTMLInputElement e atualiza os atributos HTML.
   */
  private aplicarValorNativo(input: HTMLInputElement, valor: string): void {
    input.focus();

    const prototype = Object.getPrototypeOf(input) as InputElementPrototype;
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    const inputDescriptor = Object.getOwnPropertyDescriptor(input, "value");

    if (prototypeDescriptor?.set) {
      prototypeDescriptor.set.call(input, valor);
    } else if (inputDescriptor?.set) {
      inputDescriptor.set.call(input, valor);
    } else {
      input.value = valor;
    }

    input.defaultValue = valor;
    input.setAttribute("value", valor);
    input.setAttribute("data-gx-modified", "1");
    input.setAttribute("data-gx-old-value", valor);
  }

  /**
   * Emula a sequência física de digitação para cada caractere, acionando eventos
   * que os ouvintes de teclado e filtros de máscara do GeneXus escutam.
   */
  private emularDigitacaoFisica(input: HTMLInputElement, valor: string): void {
    for (let i = 0; i < valor.length; i++) {
      const char = valor[i] ?? "";
      const code = char >= "0" && char <= "9" ? `Digit${char}` : `Key${char.toUpperCase()}`;
      const charCode = char.charCodeAt(0);

      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: char,
          code,
          keyCode: charCode,
          which: charCode,
          bubbles: true,
          cancelable: true
        })
      );

      input.dispatchEvent(
        new KeyboardEvent("keypress", {
          key: char,
          code,
          charCode,
          keyCode: charCode,
          which: charCode,
          bubbles: true,
          cancelable: true
        })
      );

      try {
        input.dispatchEvent(
          new InputEvent("beforeinput", {
            data: char,
            inputType: "insertText",
            bubbles: true,
            cancelable: true
          })
        );
      } catch {
        // Ignora navegadores com suporte restrito a construtor de InputEvent sintético
      }

      input.dispatchEvent(
        new InputEvent("input", {
          data: char,
          inputType: "insertText",
          bubbles: true,
          cancelable: true
        })
      );

      input.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: char,
          code,
          keyCode: charCode,
          which: charCode,
          bubbles: true,
          cancelable: true
        })
      );
    }

    // Dispara confirmação final de alteração e perda de foco
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }

  /**
   * Executa com segurança os eventos declarados inline nas tags (onchange, onblur, oninput).
   */
  private executarManipuladoresInline(input: HTMLInputElement): void {
    if (typeof input.oninput === "function") {
      try {
        input.oninput.call(input, new InputEvent("input", { bubbles: true }));
      } catch {
        // Ignora particularidades da página
      }
    }

    if (typeof input.onchange === "function") {
      try {
        input.onchange(new Event("change"));
      } catch {
        // Ignora particularidades da página
      }
    }
  }

  /**
   * Instala um guardião ativo por alguns segundos após o preenchimento.
   * Se o GeneXus tentar reverter o valor do input para vazio ao processar o evento de blur
   * ou o clique em outro ponto da tela, o guardião reatribui o valor do CEP imediatamente.
   */
  private instalarGuardiaoAntiRollback(input: HTMLInputElement, valorEsperado: string): void {
    let ativo = true;

    // Se o usuário deliberadamente digitar algo novo, desativa o guardião
    const desativarNoTeclado = (e: KeyboardEvent) => {
      if (e.isTrusted) {
        ativo = false;
        input.removeEventListener("keydown", desativarNoTeclado);
      }
    };
    input.addEventListener("keydown", desativarNoTeclado);

    const verificarERestaurar = () => {
      if (!ativo) return;

      const valorAtual = input.value.trim();
      // Se o GeneXus limpou o valor ou restaurou para vazio sem ação do usuário
      if (!valorAtual || valorAtual !== valorEsperado) {
        input.value = valorEsperado;
        input.setAttribute("value", valorEsperado);
        input.setAttribute("data-gx-modified", "1");
        input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      }
    };

    // Monitora os momentos críticos de clique na página e perda de foco
    input.addEventListener("blur", verificarERestaurar, { capture: true });
    window.addEventListener("click", verificarERestaurar, { capture: true });

    // Verificações nos ticks imediatos (50ms, 150ms, 300ms, 600ms, 1200ms)
    const timers = [50, 150, 300, 600, 1200].map((delay) =>
      setTimeout(verificarERestaurar, delay)
    );

    // Finaliza o guardião após 4 segundos para liberar recursos
    setTimeout(() => {
      ativo = false;
      input.removeEventListener("blur", verificarERestaurar, { capture: true });
      window.removeEventListener("click", verificarERestaurar, { capture: true });
      input.removeEventListener("keydown", desativarNoTeclado);
      timers.forEach(clearTimeout);
    }, 4000);
  }
}

export const domInputFillerService = new DomInputFillerService();
