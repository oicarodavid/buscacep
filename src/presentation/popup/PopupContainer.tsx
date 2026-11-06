import React from "react";
import { Tabs, Alert } from "@heroui/react";
import { WarningCircle } from "@phosphor-icons/react";
import { usePopupCepSearch } from "./hooks/usePopupCepSearch";
import { PopupHeader } from "./components/PopupHeader";
import { PopupFooter } from "./components/PopupFooter";
import { PopupTabPorCep } from "./components/PopupTabPorCep";
import { PopupTabPorEndereco } from "./components/PopupTabPorEndereco";

/**
 * Container principal do Popup construído com abas e componentes HeroUI:
 * Tabs, Alert, Input, Button e Chip.
 */
export const PopupContainer: React.FC = () => {
  const {
    abaAtiva,
    cepInput,
    logradouro,
    bairro,
    cidade,
    uf,
    enderecoPorCep,
    resultadosEndereco,
    carregando,
    mensagemErro,
    textoCopiado,
    setAbaAtiva,
    setCepInput,
    setLogradouro,
    setBairro,
    setCidade,
    setUf,
    handleBuscarPorCep,
    handleBuscarPorEndereco,
    handleCopiar,
    handleLimpar
  } = usePopupCepSearch();

  return (
    <div className="w-[360px] p-4 bg-surface text-foreground font-sans text-xs select-none box-border border-0 border-none rounded-3xl">
      {/* 1. Cabeçalho com o título Busca CEP */}
      <PopupHeader onLimpar={handleLimpar} />

      {/* 3. Abas do HeroUI Tabs com indicador deslizante animado */}
      <Tabs
        selectedKey={abaAtiva}
        onSelectionChange={(chave) => setAbaAtiva(chave as "cep" | "endereco")}
        className="w-full"
      >
        <Tabs.ListContainer className="mb-3">
          <Tabs.List aria-label="Modo de consulta" className="w-full flex">
            <Tabs.Tab
              id="cep"
              className="flex-1 py-2 px-3 text-xs font-semibold text-center cursor-pointer border-0 outline-none"
            >
              Por CEP
              <Tabs.Indicator />
            </Tabs.Tab>

            <Tabs.Tab
              id="endereco"
              className="flex-1 py-2 px-3 text-xs font-semibold text-center cursor-pointer border-0 outline-none"
            >
              Por Endereço
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* Feedback de erro com Alert do HeroUI */}
        {mensagemErro && (
          <Alert status="danger" className="mb-3 p-2.5 rounded-xl text-xs font-medium border-0 shadow-none animate-in fade-in duration-200">
            <Alert.Indicator>
              <WarningCircle size={16} weight="fill" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title className="text-xs">{mensagemErro}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}

        {/* Aba 1: Por CEP */}
        <Tabs.Panel id="cep" className="w-full p-0 outline-none animate-in fade-in duration-200">
          <PopupTabPorCep
            cepInput={cepInput}
            carregando={carregando}
            endereco={enderecoPorCep}
            textoCopiado={textoCopiado}
            onCepChange={setCepInput}
            onSubmit={(e) => void handleBuscarPorCep(e)}
            onCopiar={handleCopiar}
          />
        </Tabs.Panel>

        {/* Aba 2: Por Endereço */}
        <Tabs.Panel id="endereco" className="w-full p-0 outline-none animate-in fade-in duration-200">
          <PopupTabPorEndereco
            logradouro={logradouro}
            bairro={bairro}
            cidade={cidade}
            uf={uf}
            carregando={carregando}
            resultados={resultadosEndereco}
            textoCopiado={textoCopiado}
            onLogradouroChange={setLogradouro}
            onBairroChange={setBairro}
            onCidadeChange={setCidade}
            onUfChange={setUf}
            onSubmit={(e) => void handleBuscarPorEndereco(e)}
            onCopiar={handleCopiar}
          />
        </Tabs.Panel>
      </Tabs>

      <PopupFooter />

    </div>
  );
};
