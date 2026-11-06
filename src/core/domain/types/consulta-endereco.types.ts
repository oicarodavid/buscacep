/**
 * Parâmetros de entrada para a consulta de CEP a partir de dados de endereço.
 */
export interface ConsultaEnderecoParams {
  readonly uf: string;
  readonly cidade: string;
  readonly logradouro: string;
  readonly bairro?: string;
  readonly numero?: string;
}

