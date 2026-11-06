interface InputElementPrototype {
  value?: string;
}

/**
 * Preenchedor reativo especializado para SpeedGov / GeneXus.
 * Emula digitação física caractere a caractere para satisfazer máscaras do GeneXus,
 * dispara handlers inline e instala guardião ativo anti-rollback para impedir
 * que o cache de buffer do GeneXus reverta o valor após a perda de foco ou clique na tela.
 */
export class SpeedGovFiller {
  /**
   * Preenche o campo de CEP no SpeedGov.
   */
  preencherCep(input: HTMLInputElement, valor: string): void {
    if (!input) return;

    // 1. Aplica o valor no protótipo nativo e atualiza atributos do GeneXus
    this.aplicarValorNativo(input, valor);

    // 2. Emula a digitação física caractere por caractere para máscaras
    this.emularDigitacaoFisica(input, valor);

    // 3. Executa manipuladores inline presentes no elemento (oninput, onchange)
    this.executarManipuladoresInline(input);

    // 4. Dispara e propaga o evento de blur para forçar a persistência do GeneXus
    input.dispatchEvent(new FocusEvent("blur", { bubbles: true, cancelable: true }));
    if (typeof input.onblur === "function") {
      try {
        input.onblur.call(input, new FocusEvent("blur"));
      } catch {
        // Ignora particularidades da página
      }
    }

    // 5. Instala guardião temporário contra reversão (anti-rollback)
    this.instalarGuardiaoAntiRollback(input, valor);
  }

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

    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }

  private executarManipuladoresInline(input: HTMLInputElement): void {
    if (typeof input.oninput === "function") {
      try {
        input.oninput.call(input, new InputEvent("input", { bubbles: true }));
      } catch {
        // Ignora
      }
    }

    if (typeof input.onchange === "function") {
      try {
        input.onchange(new Event("change"));
      } catch {
        // Ignora
      }
    }
  }

  private instalarGuardiaoAntiRollback(input: HTMLInputElement, valorEsperado: string): void {
    let ativo = true;

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
      if (!valorAtual || valorAtual !== valorEsperado) {
        input.value = valorEsperado;
        input.setAttribute("value", valorEsperado);
        input.setAttribute("data-gx-modified", "1");
        input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      }
    };

    input.addEventListener("blur", verificarERestaurar, { capture: true });
    window.addEventListener("click", verificarERestaurar, { capture: true });

    const timers = [50, 150, 300, 600, 1200].map((delay) =>
      setTimeout(verificarERestaurar, delay)
    );

    setTimeout(() => {
      ativo = false;
      input.removeEventListener("blur", verificarERestaurar, { capture: true });
      window.removeEventListener("click", verificarERestaurar, { capture: true });
      input.removeEventListener("keydown", desativarNoTeclado);
      timers.forEach(clearTimeout);
    }, 4000);
  }
}

export const speedGovFiller = new SpeedGovFiller();

