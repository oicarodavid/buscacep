interface InputElementPrototype {
  value?: string;
}

/**
 * Preenchedor de campos para formulários web gerais (HTML5 padrão, React, Vue, Angular, etc.).
 */
export class GenericFiller {
  /**
   * Preenche o campo de CEP disparando eventos nativos do DOM.
   */
  preencherCep(input: HTMLInputElement, valor: string): void {
    if (!input) return;

    input.focus();

    // 1. Aplica o valor respeitando protótipos de React/Vue
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

    // 2. Dispara eventos fundamentais com bolha
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));

    // 3. Perda de foco limpa
    input.dispatchEvent(new FocusEvent("blur", { bubbles: true, cancelable: true }));
  }
}

export const genericFiller = new GenericFiller();

