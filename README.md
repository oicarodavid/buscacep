# Busca CEP Automático - Extensão WXT (Manifest V3)

Extensão para o Google Chrome construída com o framework **WXT**, **Vite**, **React**, **Tailwind CSS v4**, **HeroUI v3**, **Phosphor Icons** e gerenciada via **Bun**.

Ela detecta automaticamente formulários de endereço em páginas da web (com suporte nativo a sistemas corporativos **GeneXus / SAT** e formulários padrão da web), busca o CEP correspondente a partir do logradouro, cidade e estado preenchidos, ranqueia por relevância de bairro e faixa numérica, e preenche o campo de CEP após a confirmação do usuário.

---

## 🏛️ Arquitetura (Clean Architecture)

O projeto segue estritamente a separação de responsabilidades em camadas e **zero lógica em componentes visuais**:

```
src/
├── core/
│   ├── domain/               # Entidades e Regras de Negócio Puras
│   │   ├── entities/         # Endereco, normalização de UF/logradouro, faixa de números
│   │   └── types/            # Tipos e contratos de domínio
│   └── application/          # Casos de Uso e Portas
│       ├── ports/            # Interfaces de repositório e mensageria
│       └── use-cases/        # BuscarCepPorEnderecoUseCase
├── infrastructure/           # Adaptadores Externos
│   ├── api/                  # ViaCepHttpRepository
│   ├── dom/                  # DomFormScannerService e DomInputFillerService (GeneXus buffers)
│   └── messaging/            # Despachador do Background e Cliente de Mensageria
└── presentation/             # Interface do Usuário (Hooks + Componentes Declarativos Puros)
    ├── content/              # Content Script (useCepAutocomplete + botões/modais com Shadow DOM)
    └── popup/                # Popup da extensão (usePopupCepSearch + formulário de consulta)
```

---

## 🚀 Como Executar e Compilar com Bun

### 1. Instalar dependências
```bash
bun install
```

### 2. Verificar Tipagem e Lint
```bash
# Verificação estrita do TypeScript
bun run compile

# Linting com auto-correção
bun run lint
```

### 3. Gerar Bundle de Produção
```bash
bun run build
```

O bundle final será gerado no diretório:
```
.output/chrome-mv3/
```

### 4. Modo de Desenvolvimento (Hot Reload)
```bash
bun run dev
```

---

## 📦 Como Carregar e Testar no Google Chrome

1. Abra o Google Chrome e acesse `chrome://extensions/`.
2. Ative o **"Modo do desenvolvedor"** no canto superior direito.
3. Clique em **"Carregar sem compactação"**.
4. Selecione a pasta:
   ```
   d:\Projetos\buscacep-wxt\.output\chrome-mv3
   ```
5. Abra o arquivo `test-page.html` (presente na raiz do projeto) no navegador.
6. Observe o botão **"Buscar CEP (Alt+C)"** injetado ao lado do campo de CEP.
7. Pressione **Alt + C** ou clique no botão.
8. Selecione o CEP desejado ou pressione Enter no item "★ Mais Provável" para preencher automaticamente.

---

## 👤 Autor

Desenvolvido por **Icaro David**.
