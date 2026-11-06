import { defineContentScript } from "wxt/utils/define-content-script";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import React from "react";
import ReactDOM from "react-dom/client";
import { CepAutocompleteContainer } from "../../src/presentation/content/CepAutocompleteContainer";
import {
  domFormScannerService,
  PADROES_SELECAO_CEP
} from "../../src/infrastructure/dom/dom-form-scanner.service";
import "./style.css";

/**
 * Ponto de entrada do Content Script da extensão.
 * Injeta a interface de busca de CEP ao lado do campo identificado no formulário
 * utilizando Shadow DOM para isolar completamente o Tailwind v4 e HeroUI da página hospedeira.
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  cssInjectionMode: "ui",

  main(ctx) {
    let montado = false;

    const tentarMontarUi = async (): Promise<boolean> => {
      if (montado) return true;

      const campoCep = domFormScannerService.encontrarCampoFormulario(PADROES_SELECAO_CEP);
      if (!campoCep) {
        return false;
      }

      montado = true;

      const ui = await createShadowRootUi(ctx, {
        name: "buscacep-autocomplete-ui",
        position: "inline",
        anchor: campoCep,
        append: (anchor, uiRoot) => {
          // Garante inserção preferencialmente logo após o input, no mesmo container inline
          anchor.insertAdjacentElement("afterend", uiRoot);
        },
        onMount: (container) => {
          const root = ReactDOM.createRoot(container);
          root.render(
            <React.StrictMode>
              <CepAutocompleteContainer />
            </React.StrictMode>
          );
          return root;
        },
        onRemove: (root) => {
          root?.unmount();
        }
      });

      // Estilização do shadowHost e container isolado para forçar layout inline ao lado do input com espaçamento lateral padrão
      ui.shadowHost.style.setProperty("display", "inline-flex", "important");
      ui.shadowHost.style.setProperty("vertical-align", "middle", "important");
      ui.shadowHost.style.setProperty("position", "relative", "important");
      ui.shadowHost.style.setProperty("margin-left", "8px", "important");
      ui.shadowHost.style.setProperty("margin-right", "8px", "important");
      ui.shadowHost.style.setProperty("z-index", "2147483640", "important");
      ui.shadowHost.style.setProperty("float", "none", "important");
      ui.shadowHost.style.setProperty("clear", "none", "important");

      // O container interno criado pelo @webext-core/isolated-element (filho direto do shadow root)
      if (ui.uiContainer) {
        ui.uiContainer.style.setProperty("display", "inline-flex", "important");
        ui.uiContainer.style.setProperty("align-items", "center", "important");
        ui.uiContainer.style.setProperty("vertical-align", "middle", "important");
      }

      ui.mount();
      return true;
    };

    // 1. Tenta montar imediatamente se o campo já estiver presente no DOM
    tentarMontarUi().then((sucesso) => {
      if (sucesso) return;

      // 2. Se o campo for carregado dinamicamente (SPAs, GeneXus), monitora com MutationObserver
      const observer = new MutationObserver(() => {
        tentarMontarUi().then((montou) => {
          if (montou) {
            observer.disconnect();
          }
        });
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });

      ctx.onInvalidated(() => {
        observer.disconnect();
      });
    });
  }
});
