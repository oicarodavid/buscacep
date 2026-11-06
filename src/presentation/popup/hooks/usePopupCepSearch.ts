import { useState, useCallback } from "react";
import type { Endereco } from "../../../core/domain/entities/endereco.entity";
import { browserMessagingClient } from "../../../infrastructure/messaging/browser-messaging.client";

export interface UsePopupCepSearchReturn {
  readonly abaAtiva: "cep" | "endereco";
  readonly cepInput: string;
  readonly logradouro: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly enderecoPorCep: Endereco | null;
  readonly resultadosEndereco: readonly Endereco[];
  readonly carregando: boolean;
  readonly mensagemErro: string | null;
  readonly textoCopiado: string | null;
  readonly setAbaAtiva: (aba: "cep" | "endereco") => void;
  readonly setCepInput: (valor: string) => void;
  readonly setLogradouro: (valor: string) => void;
  readonly setBairro: (valor: string) => void;
  readonly setCidade: (valor: string) => void;
  readonly setUf: (valor: string) => void;
  readonly handleBuscarPorCep: (e: React.FormEvent) => Promise<void>;
  readonly handleBuscarPorEndereco: (e: React.FormEvent) => Promise<void>;
  readonly handleCopiar: (texto: string) => void;
  readonly handleLimpar: () => void;
}

/**
 * Hook com lógica de estado e consultas para as abas 'Por CEP' e 'Por Endereço' no Popup.
 */
export function usePopupCepSearch(): UsePopupCepSearchReturn {
  const [abaAtiva, setAbaAtiva] = useState<"cep" | "endereco">("cep");

  // Estado da aba "Por CEP"
  const [cepInput, setCepInput] = useState<string>("");
  const [enderecoPorCep, setEnderecoPorCep] = useState<Endereco | null>(null);

  // Estado da aba "Por Endereço"
  const [logradouro, setLogradouro] = useState<string>("");
  const [bairro, setBairro] = useState<string>("");
  const [cidade, setCidade] = useState<string>("");
  const [uf, setUf] = useState<string>("CE");
  const [resultadosEndereco, setResultadosEndereco] = useState<Endereco[]>([]);

  // Estados compartilhados de feedback
  const [carregando, setCarregando] = useState<boolean>(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [textoCopiado, setTextoCopiado] = useState<string | null>(null);

  const formatarCepEntrada = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "").slice(0, 8);
    if (apenasNumeros.length > 5) {
      return `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5)}`;
    }
    return apenasNumeros;
  };

  const handleSetCepInput = (valor: string) => {
    setCepInput(formatarCepEntrada(valor));
    setMensagemErro(null);
  };

  // Busca endereço a partir do código CEP
  const handleBuscarPorCep = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setMensagemErro(null);
      setEnderecoPorCep(null);

      const cepLimpo = cepInput.replace(/\D/g, "");
      if (cepLimpo.length !== 8) {
        setMensagemErro("Informe um CEP válido com 8 dígitos.");
        return;
      }

      setCarregando(true);
      try {
        const resultado = await browserMessagingClient.consultarCepDireto(cepLimpo);
        if (resultado) {
          setEnderecoPorCep(resultado);
        } else {
          setMensagemErro("CEP não localizado na base dos Correios.");
        }
      } catch {
        setMensagemErro("Falha ao comunicar com o serviço de CEP.");
      } finally {
        setCarregando(false);
      }
    },
    [cepInput]
  );

  // Busca lista de CEPs a partir dos dados do endereço
  const handleBuscarPorEndereco = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setMensagemErro(null);
      setResultadosEndereco([]);

      if (!logradouro.trim() || logradouro.trim().length < 3) {
        setMensagemErro("Informe o Logradouro com no mínimo 3 caracteres.");
        return;
      }
      if (!cidade.trim()) {
        setMensagemErro("Informe a Cidade para a consulta.");
        return;
      }
      if (!uf.trim() || uf.trim().length !== 2) {
        setMensagemErro("Informe a sigla da UF com 2 letras.");
        return;
      }

      setCarregando(true);
      try {
        const lista = await browserMessagingClient.buscarCep({
          logradouro: logradouro.trim(),
          cidade: cidade.trim(),
          uf: uf.trim(),
          bairro: bairro.trim() || undefined
        });

        if (lista && lista.length > 0) {
          setResultadosEndereco(lista);
        } else {
          setMensagemErro("Nenhum CEP encontrado para os termos informados.");
        }
      } catch {
        setMensagemErro("Erro ao consultar os dados de endereço.");
      } finally {
        setCarregando(false);
      }
    },
    [logradouro, cidade, uf, bairro]
  );

  const handleCopiar = useCallback((texto: string) => {
    void navigator.clipboard.writeText(texto).then(() => {
      setTextoCopiado(texto);
      setTimeout(() => setTextoCopiado(null), 2500);
    });
  }, []);

  const handleLimpar = useCallback(() => {
    setCepInput("");
    setEnderecoPorCep(null);
    setLogradouro("");
    setBairro("");
    setCidade("");
    setResultadosEndereco([]);
    setMensagemErro(null);
  }, []);

  return {
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
    setCepInput: handleSetCepInput,
    setLogradouro,
    setBairro,
    setCidade,
    setUf,
    handleBuscarPorCep,
    handleBuscarPorEndereco,
    handleCopiar,
    handleLimpar
  };
}
