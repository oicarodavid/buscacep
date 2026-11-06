/**
 * Dados de formulário de endereço extraídos do DOM da página hospedeira.
 */
export interface DadosEnderecoExtraidos {
  readonly campoCep: HTMLInputElement | null;
  readonly logradouro: string;
  readonly numero: string;
  readonly cidade: string;
  readonly uf: string;
  readonly bairro: string;
  readonly complemento?: string;
}

/**
 * Contrato universal para adaptadores de plataforma.
 * Cada plataforma suportada (ex: SpeedGov/GeneXus, e-commerces, formulários web genéricos)
 * implementa esta interface com suas heurísticas e estratégias especializadas.
 */
export interface IPlatformAdapter {
  /**
   * Identificador único da plataforma (ex: "speedgov", "generic").
   */
  readonly id: string;

  /**
   * Nome legível da plataforma para exibição e depuração.
   */
  readonly nome: string;

  /**
   * Determina se o documento HTML atual pertence a esta plataforma.
   */
  detectar(doc: Document): boolean;

  /**
   * Localiza o elemento input do CEP dentro do contexto fornecido.
   */
  encontrarCampoCep(contexto?: ParentNode): HTMLInputElement | null;

  /**
   * Extrai os dados do formulário de endereço da página para a busca do CEP.
   */
  extrairDadosEndereco(contexto?: ParentNode): DadosEnderecoExtraidos;

  /**
   * Preenche o campo de CEP de forma reativa e persistente na plataforma.
   */
  preencherCep(campoCep: HTMLInputElement, cep: string): void;
}

