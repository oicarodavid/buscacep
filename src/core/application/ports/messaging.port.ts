import type { ConsultaEnderecoParams } from "../../domain/types/consulta-endereco.types";
import type { Endereco } from "../../domain/entities/endereco.entity";

/**
 * Tipos de mensagens suportadas pelo sistema de mensageria da extensão.
 */
export const TIPO_MENSAGEM_BUSCAR_CEP = "BUSCAR_CEP" as const;
export const TIPO_MENSAGEM_CONSULTAR_CEP_DIRETO = "CONSULTAR_CEP_DIRETO" as const;

export interface BuscarCepRequestMessage {
  readonly type: typeof TIPO_MENSAGEM_BUSCAR_CEP;
  readonly payload: ConsultaEnderecoParams;
}

export interface ConsultarCepDiretoRequestMessage {
  readonly type: typeof TIPO_MENSAGEM_CONSULTAR_CEP_DIRETO;
  readonly payload: { readonly cep: string };
}

export type ExtensionRequestMessage =
  | BuscarCepRequestMessage
  | ConsultarCepDiretoRequestMessage;

export interface BuscarCepResponseMessage {
  readonly sucesso: boolean;
  readonly dados: Endereco[];
  readonly erro?: string;
}

export interface ConsultarCepDiretoResponseMessage {
  readonly sucesso: boolean;
  readonly endereco: Endereco | null;
  readonly erro?: string;
}

