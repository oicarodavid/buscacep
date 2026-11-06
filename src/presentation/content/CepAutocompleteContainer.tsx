import React from "react";
import { useCepAutocomplete } from "./hooks/useCepAutocomplete";
import { CepTriggerButton } from "./components/CepTriggerButton";
import { CepStatusToast } from "./components/CepStatusAlert";
import { CepResultsModal } from "./components/CepResultsModal";

/**
 * Container desacoplado para a montagem da interface de preenchimento automático no Content Script.
 */
export const CepAutocompleteContainer: React.FC = () => {
  const {
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
  } = useCepAutocomplete();

  return (
    <div className="inline-flex items-center align-middle relative font-sans text-xs px-1">
      <CepTriggerButton
        carregando={carregando}
        onBuscar={() => void handleBuscarCep()}
      />

      {/* Alerta flutuante restrito a erros impeditivos (ex: campo de CEP não encontrado) */}
      <CepStatusToast
        mensagem={mensagemStatus}
        onFechar={handleFecharStatus}
      />

      {/* Modal de seleção ou exibição de avisos e orientações */}
      {exibirModal && (
        <CepResultsModal
          resultados={resultados}
          mensagemAviso={mensagemModal}
          containerRef={containerModalRef}
          primeiroBotaoRef={primeiroBotaoRef}
          botaoAvisoRef={botaoAvisoRef}
          onConfirmar={handleConfirmarPreenchimento}
          onFechar={handleFecharModal}
        />
      )}
    </div>
  );
};

