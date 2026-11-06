import { useState, useEffect, useRef, useCallback } from "react";
import {
  type Endereco,
  validarCamposEnderecoParaConsulta
} from "../../../core/domain/entities/endereco.entity";
import { browserMessagingClient } from "../../../infrastructure/messaging/browser-messaging.client";
import {
  domFormScannerService,
  PADROES_SELECAO_CEP
} from "../../../infrastructure/dom/dom-form-scanner.service";
import { domInputFillerService } from "../../../infrastructure/dom/dom-input-filler.service";

/**
 * Retorno estruturado do hook useCepAutocomplete para desacoplamento total da UI.
 */
export interface UseCepAutocompleteReturn {
  readonly carregando: boolean;
  readonly mensagemStatus: string | null;
  readonly mensagemModal: string | null;
  readonly resultados: readonly Endereco[];
  readonly exibirModal: boolean;
  readonly containerModalRef: React.RefObject<HTMLDivElement | null>;
  readonly primeiroBotaoRef: React.RefObject<HTMLButtonElement | null>;
  readonly botaoAvisoRef: React.RefObject<HTMLButtonElement | null>;
  readonly handleBuscarCep: () => Promise<void>;
  readonly handleConfirmarPreenchimento: (cepEscolhido: string) => void;
  readonly handleFecharModal: () => void;
  readonly handleFecharStatus: () => void;
}

/**
 * Hook com toda a lógica de estado, mensageria, eventos e atalhos para o Content Script.
 */
export function useCepAutocomplete(): UseCepAutocompleteReturn {
  const [carregando, setCarregando] = useState<boolean>(false);
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);
  const [mensagemModal, setMensagemModal] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Endereco[]>([]);
  const [exibirModal, setExibirModal] = useState<boolean>(false);

  const containerModalRef = useRef<HTMLDivElement | null>(null);
  const primeiroBotaoRef = useRef<HTMLButtonElement | null>(null);
  const botaoAvisoRef = useRef<HTMLButtonElement | null>(null);
  const timeoutMensagemRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const definirMensagemComAutoDismiss = useCallback((msg: string | null) => {
    if (timeoutMensagemRef.current) {
      clearTimeout(timeoutMensagemRef.current);
      timeoutMensagemRef.current = null;
    }
    setMensagemStatus(msg);
    if (msg) {
      timeoutMensagemRef.current = setTimeout(() => {
        setMensagemStatus(null);
      }, 5000);
    }
  }, []);

  const handleBuscarCep = useCallback(async () => {
    definirMensagemComAutoDismiss(null);
    const { logradouro, cidade, uf, bairro, numero, campoCep } =
      domFormScannerService.extrairDadosEndereco();

    // Se o campo de CEP nem sequer existir no formulário, exibe o alerta flutuante de erro
    if (!campoCep) {
      definirMensagemComAutoDismiss("Campo de CEP não identificado na página.");
      return;
    }

    // Validação precisa de atributos necessários para a busca com feedback descritivo
    const erroCampos = validarCamposEnderecoParaConsulta(logradouro, cidade, uf);
    if (erroCampos) {
      setResultados([]);
      setMensagemModal(erroCampos);
      setExibirModal(true);
      return;
    }

    setCarregando(true);
    try {
      const listaCeps = await browserMessagingClient.buscarCep({
        uf,
        cidade,
        logradouro,
        bairro,
        numero
      });

      if (listaCeps && listaCeps.length > 0) {
        setResultados(listaCeps);
        setMensagemModal(null);
        setExibirModal(true);
      } else {
        setResultados([]);
        setMensagemModal("Nenhum CEP encontrado para os termos informados.");
        setExibirModal(true);
      }
    } catch {
      setResultados([]);
      setMensagemModal("Falha na comunicação com o serviço de busca de CEP.");
      setExibirModal(true);
    } finally {
      setCarregando(false);
    }
  }, [definirMensagemComAutoDismiss]);

  const handleConfirmarPreenchimento = useCallback((cepEscolhido: string) => {
    const campoCep = domFormScannerService.encontrarCampoFormulario(
      PADROES_SELECAO_CEP
    ) as HTMLInputElement | null;

    if (campoCep) {
      const cepApenasNumeros = cepEscolhido.replace(/\D/g, "");
      domInputFillerService.preencherInputReativo(campoCep, cepApenasNumeros);
      setExibirModal(false);
      setResultados([]);
      setMensagemModal(null);
      // Não exibe toast de sucesso conforme especificado: o próprio preenchimento no campo já confirma a ação
    }
  }, []);

  const handleFecharModal = useCallback(() => {
    setExibirModal(false);
    setMensagemModal(null);
  }, []);

  const handleFecharStatus = useCallback(() => {
    if (timeoutMensagemRef.current) {
      clearTimeout(timeoutMensagemRef.current);
      timeoutMensagemRef.current = null;
    }
    setMensagemStatus(null);
  }, []);

  // Foca no primeiro botão (do item mais recomendado) ou no botão de confirmação de aviso
  useEffect(() => {
    if (exibirModal) {
      const timer = setTimeout(() => {
        if (resultados.length > 0) {
          primeiroBotaoRef.current?.focus();
        } else if (mensagemModal) {
          botaoAvisoRef.current?.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [exibirModal, resultados, mensagemModal]);

  // Listener para atalhos do teclado (Alt + C, Enter e Escape) com captura resiliente
  useEffect(() => {
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      // 1. Se o modal estiver aberto e pressionar Escape, fecha e não propaga para a página
      if (e.key === "Escape" && exibirModal) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleFecharModal();
        return;
      }

      // 2. Se o modal estiver aberto e pressionar Enter
      if (e.key === "Enter" && exibirModal) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (resultados.length > 0) {
          const primeiroItem = resultados[0];
          const ehRecomendado = (primeiroItem?.scoreRelevancia ?? 0) > 50;
          if (ehRecomendado && primeiroItem?.cep) {
            handleConfirmarPreenchimento(primeiroItem.cep);
          }
        } else {
          // Se for aviso/estado vazio, o Enter fecha o modal
          handleFecharModal();
        }
        return;
      }

      // 3. Atalho global Alt + C para disparar busca
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        void handleBuscarCep();
      }
    };

    // Usa capture: true no window para garantir precedência sobre formulários e submissões nativas
    window.addEventListener("keydown", handleKeyDownCapture, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDownCapture, { capture: true });
    };
  }, [exibirModal, resultados, handleBuscarCep, handleFecharModal, handleConfirmarPreenchimento]);

  // Fecha o modal ao clicar fora dele
  useEffect(() => {
    if (!exibirModal) return;

    const handleClickOutside = (e: MouseEvent) => {
      const path = e.composedPath();
      if (containerModalRef.current && !path.includes(containerModalRef.current)) {
        handleFecharModal();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exibirModal, handleFecharModal]);

  return {
    carregando,
    mensagemStatus,
    mensagemModal,
    resultados,
    exibirModal,
    containerModalRef,
    primeiroBotaoRef,
    botaoAvisoRef,
    handleBuscarCep,
    handleConfirmarPreenchimento,
    handleFecharModal,
    handleFecharStatus
  };
}
