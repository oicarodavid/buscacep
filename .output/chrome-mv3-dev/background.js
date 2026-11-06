var background = (function() {
	// node_modules/wxt/dist/utils/define-background.mjs
	function defineBackground(arg) {
		if (arg == null || typeof arg === "function") return { main: arg };
		return arg;
	}
	// src/infrastructure/api/viacep-http.repository.ts
	/**
	* Adaptador HTTP para consumo da API pública do ViaCEP.
	*/
	var ViaCepHttpRepository = class {
		async buscarPorEndereco(uf, cidade, logradouro) {
			try {
				const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`;
				const resposta = await fetch(url);
				if (!resposta.ok) return [];
				const dados = await resposta.json();
				if (Array.isArray(dados)) return dados;
				return [];
			} catch {
				return [];
			}
		}
		async buscarPorCep(cep) {
			try {
				const cepLimpo = cep.replace(/\D/g, "");
				if (cepLimpo.length !== 8) return null;
				const url = `https://viacep.com.br/ws/${encodeURIComponent(cepLimpo)}/json/`;
				const resposta = await fetch(url);
				if (!resposta.ok) return null;
				const dados = await resposta.json();
				if (!dados || typeof dados !== "object" || "erro" in dados) return null;
				return dados;
			} catch {
				return null;
			}
		}
	};
	// src/core/domain/entities/endereco.entity.ts
	/**
	* Tabela de correspondência entre nomes de estados brasileiros e suas siglas de duas letras (UF).
	*/
	var TABELA_ESTADOS_SIGLAS = {
		acre: "AC",
		alagoas: "AL",
		amapa: "AP",
		amapá: "AP",
		amazonas: "AM",
		bahia: "BA",
		ceara: "CE",
		ceará: "CE",
		"distrito federal": "DF",
		"espirito santo": "ES",
		"espírito santo": "ES",
		goias: "GO",
		goiás: "GO",
		maranhao: "MA",
		maranhão: "MA",
		"mato grosso": "MT",
		"mato grosso do sul": "MS",
		"minas gerais": "MG",
		para: "PA",
		pará: "PA",
		paraiba: "PB",
		paraíba: "PB",
		parana: "PR",
		paraná: "PR",
		pernambuco: "PE",
		piaui: "PI",
		piauí: "PI",
		"rio de janeiro": "RJ",
		"rio grande do norte": "RN",
		"rio grande do sul": "RS",
		rondonia: "RO",
		rondônia: "RO",
		roraima: "RR",
		"santa catarina": "SC",
		"sao paulo": "SP",
		"são paulo": "SP",
		sergipe: "SE",
		tocantins: "TO"
	};
	/**
	* Normaliza o valor de estado/UF para uma sigla válida de 2 letras maiúsculas.
	*/
	function normalizarUf(valorBruto) {
		const limpo = valorBruto.trim().toLowerCase();
		if (limpo.length === 2) return limpo.toUpperCase();
		return TABELA_ESTADOS_SIGLAS[limpo] || valorBruto.trim().toUpperCase();
	}
	/**
	* Extrai variações do termo de logradouro removendo prefixos usuais (Av., Rua, etc.)
	* para otimizar o índice de retorno na base do ViaCEP/Correios.
	*/
	function extrairTermosBuscaLogradouro(logradouro) {
		const limpo = logradouro.trim();
		const semPrefixo = limpo.replace(/^(rua|r\.|avenida|av\.|alameda|al\.|travessa|trv\.|rodovia|rod\.|praca|praça|pça\.)\s+/i, "").trim();
		if (semPrefixo.length >= 3 && semPrefixo.toLowerCase() !== limpo.toLowerCase()) return [limpo, semPrefixo];
		return [limpo];
	}
	// src/core/domain/entities/faixa-numero.entity.ts
	/**
	* Remove acentos e converte para minúsculas para comparações textuais seguras.
	*/
	function normalizarTexto(texto) {
		return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
	}
	/**
	* Analisa o texto de complemento oficial dos Correios (ex: "de 976/977 a 1378/1379", "de 3000 ao fim", "lado ímpar", "até 999")
	* e calcula com alta precisão matemática a compatibilidade do número predial do imóvel.
	*/
	function avaliarCompatibilidadeNumero(complementoBruto, numeroImovelStr) {
		const numeroLimpo = numeroImovelStr.replace(/\D/g, "");
		if (!numeroLimpo) return {
			compativel: false,
			temFaixaRestritiva: false,
			score: 0,
			motivo: ""
		};
		const num = parseInt(numeroLimpo, 10);
		if (Number.isNaN(num)) return {
			compativel: false,
			temFaixaRestritiva: false,
			score: 0,
			motivo: ""
		};
		const comp = normalizarTexto(complementoBruto || "");
		if (!comp) return {
			compativel: true,
			temFaixaRestritiva: false,
			score: 10,
			motivo: "Atende toda a extensão"
		};
		const ehPar = num % 2 === 0;
		const exigePar = comp.includes("lado par") || comp.includes("somente par") || comp.includes("numeros pares") || comp.includes("pares");
		const exigeImpar = comp.includes("lado impar") || comp.includes("somente impar") || comp.includes("numeros impares") || comp.includes("impares");
		const matchDuploIntervalo = comp.match(/de\s+(\d+)\s*\/\s*(\d+)\s+a\s+(\d+)\s*\/\s*(\d+)/);
		if (matchDuploIntervalo) {
			const n1 = parseInt(matchDuploIntervalo[1] ?? "0", 10);
			const n2 = parseInt(matchDuploIntervalo[2] ?? "0", 10);
			const n3 = parseInt(matchDuploIntervalo[3] ?? "0", 10);
			const n4 = parseInt(matchDuploIntervalo[4] ?? "0", 10);
			const inicios = [n1, n2];
			const fins = [n3, n4];
			const inicioPar = Math.min(...inicios.filter((n) => n % 2 === 0));
			const fimPar = Math.max(...fins.filter((n) => n % 2 === 0));
			const inicioImpar = Math.min(...inicios.filter((n) => n % 2 !== 0));
			const fimImpar = Math.max(...fins.filter((n) => n % 2 !== 0));
			if (ehPar) {
				if (num >= inicioPar && num <= fimPar) return {
					compativel: true,
					temFaixaRestritiva: true,
					score: 200,
					motivo: `Número ${num} dentro da faixa par (${inicioPar} a ${fimPar})`
				};
				return {
					compativel: false,
					temFaixaRestritiva: true,
					score: -500,
					motivo: `Número ${num} fora da faixa par (${inicioPar} a ${fimPar})`
				};
			} else {
				if (num >= inicioImpar && num <= fimImpar) return {
					compativel: true,
					temFaixaRestritiva: true,
					score: 200,
					motivo: `Número ${num} dentro da faixa ímpar (${inicioImpar} a ${fimImpar})`
				};
				return {
					compativel: false,
					temFaixaRestritiva: true,
					score: -500,
					motivo: `Número ${num} fora da faixa ímpar (${inicioImpar} a ${fimImpar})`
				};
			}
		}
		const matchDuploAoFim = comp.match(/de\s+(\d+)\s*\/\s*(\d+)\s+(?:ao\s+fim|ao\s+final|em\s+diante|a\s+seguir)/);
		if (matchDuploAoFim) {
			const inicios = [parseInt(matchDuploAoFim[1] ?? "0", 10), parseInt(matchDuploAoFim[2] ?? "0", 10)];
			const inicioPar = Math.min(...inicios.filter((n) => n % 2 === 0));
			const inicioImpar = Math.min(...inicios.filter((n) => n % 2 !== 0));
			if (ehPar) {
				if (num >= inicioPar) return {
					compativel: true,
					temFaixaRestritiva: true,
					score: 200,
					motivo: `Número ${num} dentro da faixa par (de ${inicioPar} ao fim)`
				};
				return {
					compativel: false,
					temFaixaRestritiva: true,
					score: -500,
					motivo: `Número ${num} menor que o início da faixa par (${inicioPar})`
				};
			} else {
				if (num >= inicioImpar) return {
					compativel: true,
					temFaixaRestritiva: true,
					score: 200,
					motivo: `Número ${num} dentro da faixa ímpar (de ${inicioImpar} ao fim)`
				};
				return {
					compativel: false,
					temFaixaRestritiva: true,
					score: -500,
					motivo: `Número ${num} menor que o início da faixa ímpar (${inicioImpar})`
				};
			}
		}
		const matchDuploAte = comp.match(/ate\s+(\d+)\s*\/\s*(\d+)/);
		if (matchDuploAte) {
			const fins = [parseInt(matchDuploAte[1] ?? "0", 10), parseInt(matchDuploAte[2] ?? "0", 10)];
			const fimPar = Math.max(...fins.filter((n) => n % 2 === 0));
			const fimImpar = Math.max(...fins.filter((n) => n % 2 !== 0));
			if (ehPar) {
				if (num <= fimPar) return {
					compativel: true,
					temFaixaRestritiva: true,
					score: 200,
					motivo: `Número ${num} dentro da faixa par (até ${fimPar})`
				};
				return {
					compativel: false,
					temFaixaRestritiva: true,
					score: -500,
					motivo: `Número ${num} maior que o fim da faixa par (${fimPar})`
				};
			} else {
				if (num <= fimImpar) return {
					compativel: true,
					temFaixaRestritiva: true,
					score: 200,
					motivo: `Número ${num} dentro da faixa ímpar (até ${fimImpar})`
				};
				return {
					compativel: false,
					temFaixaRestritiva: true,
					score: -500,
					motivo: `Número ${num} maior que o fim da faixa ímpar (${fimImpar})`
				};
			}
		}
		const matchSimplesIntervalo = comp.match(/de\s+(\d+)\s+a\s+(\d+)/);
		if (matchSimplesIntervalo) {
			const inicio = parseInt(matchSimplesIntervalo[1] ?? "0", 10);
			const fim = parseInt(matchSimplesIntervalo[2] ?? "0", 10);
			if (exigePar && !ehPar) return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: "Exige numeração par"
			};
			if (exigeImpar && ehPar) return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: "Exige numeração ímpar"
			};
			if (num >= inicio && num <= fim) return {
				compativel: true,
				temFaixaRestritiva: true,
				score: 200,
				motivo: `Número ${num} dentro da faixa (${inicio} a ${fim})`
			};
			return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: `Número ${num} fora da faixa (${inicio} a ${fim})`
			};
		}
		const matchSimplesAoFim = comp.match(/(?:de|a\s+partir\s+de)\s+(\d+)\s*(?:ao\s+fim|ao\s+final|em\s+diante|a\s+seguir)?/);
		if (matchSimplesAoFim && (comp.includes("fim") || comp.includes("diante") || comp.includes("partir"))) {
			const inicio = parseInt(matchSimplesAoFim[1] ?? "0", 10);
			if (exigePar && !ehPar) return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: "Exige numeração par"
			};
			if (exigeImpar && ehPar) return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: "Exige numeração ímpar"
			};
			if (num >= inicio) return {
				compativel: true,
				temFaixaRestritiva: true,
				score: 200,
				motivo: `Número ${num} compatível (de ${inicio} em diante)`
			};
			return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: `Número ${num} menor que ${inicio}`
			};
		}
		const matchSimplesAte = comp.match(/ate\s+(\d+)/);
		if (matchSimplesAte) {
			const fim = parseInt(matchSimplesAte[1] ?? "0", 10);
			if (exigePar && !ehPar) return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: "Exige numeração par"
			};
			if (exigeImpar && ehPar) return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: "Exige numeração ímpar"
			};
			if (num <= fim) return {
				compativel: true,
				temFaixaRestritiva: true,
				score: 200,
				motivo: `Número ${num} compatível (até ${fim})`
			};
			return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: `Número ${num} maior que ${fim}`
			};
		}
		if (exigePar || exigeImpar) {
			if (exigePar && !ehPar) return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: "Exige numeração par"
			};
			if (exigeImpar && ehPar) return {
				compativel: false,
				temFaixaRestritiva: true,
				score: -500,
				motivo: "Exige numeração ímpar"
			};
			return {
				compativel: true,
				temFaixaRestritiva: true,
				score: 100,
				motivo: ehPar ? "Lado par compatível" : "Lado ímpar compatível"
			};
		}
		return {
			compativel: true,
			temFaixaRestritiva: false,
			score: 10,
			motivo: "Sem restrição numérica"
		};
	}
	// src/core/application/use-cases/buscar-cep-por-endereco.use-case.ts
	/**
	* Caso de uso responsável por consultar CEPs a partir de dados parciais de endereço,
	* aplicando normalizações e ordenando pelo grau de relevância.
	*/
	var BuscarCepPorEnderecoUseCase = class {
		cepRepository;
		constructor(cepRepository) {
			this.cepRepository = cepRepository;
		}
		async execute(params) {
			const uf = normalizarUf(params.uf || "");
			const cidadeLimpa = (params.cidade || "").trim();
			const logradouroLimpo = (params.logradouro || "").trim();
			if (!uf || uf.length !== 2 || !cidadeLimpa || !logradouroLimpo || logradouroLimpo.length < 3) return [];
			const termos = extrairTermosBuscaLogradouro(logradouroLimpo);
			let resultados = [];
			for (const termo of termos) {
				resultados = await this.cepRepository.buscarPorEndereco(uf, cidadeLimpa, termo);
				if (resultados.length > 0) break;
			}
			const bairroNormalizado = (params.bairro || "").trim().toLowerCase();
			const numeroNormalizado = (params.numero || "").trim();
			const resultadosEnriquecidos = resultados.map((item) => {
				let score = 0;
				const motivos = [];
				const bairroItem = (item.bairro || "").trim().toLowerCase();
				const temBairroExato = bairroNormalizado && bairroItem === bairroNormalizado;
				const temBairroSimilar = bairroNormalizado && !temBairroExato && (bairroItem.includes(bairroNormalizado) || bairroNormalizado.includes(bairroItem));
				if (numeroNormalizado) {
					const avaliacao = avaliarCompatibilidadeNumero(item.complemento, numeroNormalizado);
					if (avaliacao.temFaixaRestritiva) {
						if (!avaliacao.compativel) {
							score = 0;
							motivos.push(avaliacao.motivo);
						} else {
							score = avaliacao.score;
							motivos.push(avaliacao.motivo);
							if (temBairroExato) {
								score += 100;
								motivos.push("Bairro exato");
							} else if (temBairroSimilar) {
								score += 50;
								motivos.push("Bairro similar");
							}
						}
					} else {
						score = 30;
						if (temBairroExato) {
							score += 120;
							motivos.push("Bairro exato");
						} else if (temBairroSimilar) {
							score += 80;
							motivos.push("Bairro similar");
						}
					}
				} else if (temBairroExato) {
					score += 120;
					motivos.push("Bairro exato");
				} else if (temBairroSimilar) {
					score += 80;
					motivos.push("Bairro similar");
				}
				return {
					...item,
					scoreRelevancia: score,
					destaqueMotivo: motivos.join(" • ")
				};
			});
			resultadosEnriquecidos.sort((a, b) => (b.scoreRelevancia ?? 0) - (a.scoreRelevancia ?? 0));
			return resultadosEnriquecidos;
		}
	};
	// src/core/application/use-cases/buscar-endereco-por-cep.use-case.ts
	/**
	* Caso de uso responsável por consultar o endereço completo a partir de um código CEP.
	*/
	var BuscarEnderecoPorCepUseCase = class {
		cepRepository;
		constructor(cepRepository) {
			this.cepRepository = cepRepository;
		}
		async execute(cep) {
			const cepLimpo = (cep || "").replace(/\D/g, "");
			if (cepLimpo.length !== 8) return null;
			return this.cepRepository.buscarPorCep(cepLimpo);
		}
	};
	// node_modules/wxt/dist/browser.mjs
	/**
	* Contains the `browser` export which you should use to access the extension
	* APIs in your project:
	*
	* ```ts
	* import { browser } from 'wxt/browser';
	*
	* browser.runtime.onInstalled.addListener(() => {
	*   // ...
	* });
	* ```
	*
	* @module wxt/browser
	*/
	var browser = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
	// src/infrastructure/messaging/background-message-dispatcher.ts
	/**
	* Registra o despachador de mensagens de segundo plano da extensão.
	*/
	function registrarBackgroundMessageDispatcher(buscarCepUseCase, buscarEnderecoPorCepUseCase) {
		browser.runtime.onMessage.addListener((mensagem, _sender, sendResponse) => {
			const msg = mensagem;
			if (!msg || typeof msg !== "object") return;
			if (msg.type === "BUSCAR_CEP") return buscarCepUseCase.execute(msg.payload).then((dados) => {
				const resposta = {
					sucesso: true,
					dados
				};
				try {
					sendResponse(resposta);
				} catch {}
				return resposta;
			}).catch((err) => {
				const resposta = {
					sucesso: false,
					dados: [],
					erro: err instanceof Error ? err.message : "Erro desconhecido na busca de CEP"
				};
				try {
					sendResponse(resposta);
				} catch {}
				return resposta;
			});
			if (msg.type === "CONSULTAR_CEP_DIRETO") return buscarEnderecoPorCepUseCase.execute(msg.payload.cep).then((endereco) => {
				const resposta = {
					sucesso: true,
					endereco
				};
				try {
					sendResponse(resposta);
				} catch {}
				return resposta;
			}).catch((err) => {
				const resposta = {
					sucesso: false,
					endereco: null,
					erro: err instanceof Error ? err.message : "Erro ao consultar o CEP informado"
				};
				try {
					sendResponse(resposta);
				} catch {}
				return resposta;
			});
		});
	}
	// entrypoints/background.ts
	/**
	* Ponto de entrada do Service Worker de segundo plano da extensão.
	*/
	var background_default = defineBackground(() => {
		const viaCepRepository = new ViaCepHttpRepository();
		registrarBackgroundMessageDispatcher(new BuscarCepPorEnderecoUseCase(viaCepRepository), new BuscarEnderecoPorCepUseCase(viaCepRepository));
	});
	// node_modules/@webext-core/match-patterns/dist/index.mjs
	/**
	* Class for parsing and performing operations on match patterns.
	*
	* @example
	*   const pattern = new MatchPattern('*://google.com/*');
	*
	*   pattern.includes('https://google.com'); // true
	*   pattern.includes('http://youtube.com/watch?v=123'); // false
	*/
	var MatchPattern = class MatchPattern {
		static {
			this.PROTOCOLS = [
				"http",
				"https",
				"file",
				"ftp",
				"urn",
				"ws",
				"wss"
			];
		}
		/**
		* Parse a match pattern string. If it is invalid, the constructor will throw an
		* `InvalidMatchPattern` error.
		*
		* @param matchPattern The match pattern to parse.
		*/
		constructor(matchPattern) {
			if (matchPattern === "<all_urls>") {
				this.isAllUrls = true;
				this.protocolMatches = [...MatchPattern.PROTOCOLS];
				this.hostnameMatch = "*";
				this.pathnameMatch = "*";
			} else {
				const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
				if (groups == null) throw new InvalidMatchPattern(matchPattern, "Incorrect format");
				const [_, protocol, hostname, pathname] = groups;
				validateProtocol(matchPattern, protocol);
				validateHostname(matchPattern, hostname);
				this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
				this.hostnameMatch = hostname;
				this.pathnameMatch = pathname;
			}
		}
		/** Check if a URL is included in a pattern. */
		includes(url) {
			const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
			if (this.isAllUrls) return !this.isUnknownProtocol(u);
			return !!this.protocolMatches.find((protocol) => {
				if (protocol === "http") return this.isHttpMatch(u);
				if (protocol === "https") return this.isHttpsMatch(u);
				if (protocol === "file") return this.isFileMatch(u);
				if (protocol === "ftp") return this.isFtpMatch(u);
				if (protocol === "urn") return this.isUrnMatch(u);
			});
		}
		isHttpMatch(url) {
			return url.protocol === "http:" && this.isHostPathMatch(url);
		}
		isHttpsMatch(url) {
			return url.protocol === "https:" && this.isHostPathMatch(url);
		}
		isHostPathMatch(url) {
			if (!this.hostnameMatch || !this.pathnameMatch) return false;
			const hostnameMatchRegexs = [this.convertPatternToRegex(this.hostnameMatch), this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))];
			const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
			return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
		}
		isUnknownProtocol(url) {
			return !this.protocolMatches.includes(url.protocol.slice(0, -1));
		}
		isPathMatch(url) {
			if (!this.pathnameMatch) return false;
			return this.convertPatternToRegex(this.pathnameMatch).test(url.pathname);
		}
		isFileMatch(url) {
			return url.protocol === "file:" && this.isPathMatch(url);
		}
		isFtpMatch(_url) {
			throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
		}
		isUrnMatch(_url) {
			throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
		}
		convertPatternToRegex(pattern) {
			const starsReplaced = this.escapeForRegex(pattern).replace(/\\\*/g, ".*");
			return RegExp(`^${starsReplaced}$`);
		}
		escapeForRegex(string) {
			return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
	};
	var InvalidMatchPattern = class extends Error {
		constructor(matchPattern, reason) {
			super(`Invalid match pattern "${matchPattern}": ${reason}`);
		}
	};
	function validateProtocol(matchPattern, protocol) {
		if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*") throw new InvalidMatchPattern(matchPattern, `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`);
	}
	function validateHostname(matchPattern, hostname) {
		if (hostname.includes(":")) throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
		if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*.")) throw new InvalidMatchPattern(matchPattern, `If using a wildcard (*), it must go at the start of the hostname`);
	}
	// \0virtual:wxt-background-entrypoint?D:/Projetos/buscacep-wxt/entrypoints/background.ts
	function print(method, ...args) {
		if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
		else method("[wxt]", ...args);
	}
	/** Wrapper around `console` with a "[wxt]" prefix */
	var logger = {
		debug: (...args) => print(console.debug, ...args),
		log: (...args) => print(console.log, ...args),
		warn: (...args) => print(console.warn, ...args),
		error: (...args) => print(console.error, ...args)
	};
	var ws;
	/** Connect to the websocket and listen for messages. */
	function getDevServerWebSocket() {
		if (ws == null) {
			const serverUrl = "ws://localhost:3000";
			logger.debug("Connecting to dev server @", serverUrl);
			ws = new WebSocket(serverUrl, "vite-hmr");
			ws.addWxtEventListener = ws.addEventListener.bind(ws);
			ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({
				type: "custom",
				event,
				payload
			}));
			ws.addEventListener("open", () => {
				logger.debug("Connected to dev server");
			});
			ws.addEventListener("close", () => {
				logger.debug("Disconnected from dev server");
			});
			ws.addEventListener("error", (event) => {
				logger.error("Failed to connect to dev server", event);
			});
			ws.addEventListener("message", (e) => {
				try {
					const message = JSON.parse(e.data);
					if (message.type === "custom") ws?.dispatchEvent(new CustomEvent(message.event, { detail: message.data }));
				} catch (err) {
					logger.error("Failed to handle message", err);
				}
			});
		}
		return ws;
	}
	/** https://developer.chrome.com/blog/longer-esw-lifetimes/ */
	function keepServiceWorkerAlive() {
		setInterval(async () => {
			await browser.runtime.getPlatformInfo();
		}, 5e3);
	}
	function reloadContentScript(payload) {
		if (browser.runtime.getManifest().manifest_version == 2) reloadContentScriptMv2(payload);
		else reloadContentScriptMv3(payload);
	}
	async function reloadContentScriptMv3({ registration, contentScript }) {
		if (registration === "runtime") await reloadRuntimeContentScriptMv3(contentScript);
		else await reloadManifestContentScriptMv3(contentScript);
	}
	/**
	* Reloads of one script run one after another. Two reloads that overlap can
	* both read an empty registration list and both register, and the second
	* registration throws "Duplicate script ID".
	*/
	var manifestReloads = /* @__PURE__ */ new Map();
	async function reloadManifestContentScriptMv3(contentScript) {
		const id = `wxt:${contentScript.js[0]}`;
		const reload = (manifestReloads.get(id) ?? Promise.resolve()).then(() => reloadManifestContentScriptNow(id, contentScript));
		manifestReloads.set(id, reload.catch(() => {}));
		return reload;
	}
	async function reloadManifestContentScriptNow(id, contentScript) {
		logger.log("Reloading content script:", contentScript);
		const registered = await browser.scripting.getRegisteredContentScripts();
		logger.debug("Existing scripts:", registered);
		const existing = registered.find((cs) => cs.id === id);
		if (existing) {
			logger.debug("Updating content script", existing);
			await browser.scripting.updateContentScripts([{
				...contentScript,
				id,
				css: contentScript.css ?? []
			}]);
		} else {
			logger.debug("Registering new content script...");
			await browser.scripting.registerContentScripts([{
				...contentScript,
				id,
				css: contentScript.css ?? []
			}]);
		}
		await reloadTabsForContentScript(contentScript);
	}
	async function reloadRuntimeContentScriptMv3(contentScript) {
		logger.log("Reloading content script:", contentScript);
		const registered = await browser.scripting.getRegisteredContentScripts();
		logger.debug("Existing scripts:", registered);
		const matches = registered.filter((cs) => {
			const hasJs = contentScript.js?.find((js) => cs.js?.includes(js));
			const hasCss = contentScript.css?.find((css) => cs.css?.includes(css));
			return hasJs || hasCss;
		});
		if (matches.length === 0) {
			logger.log("Content script is not registered yet, nothing to reload", contentScript);
			return;
		}
		await browser.scripting.updateContentScripts(matches);
		await reloadTabsForContentScript(contentScript);
	}
	async function reloadTabsForContentScript(contentScript) {
		const allTabs = await browser.tabs.query({});
		const matchPatterns = contentScript.matches.map((match) => new MatchPattern(match));
		const matchingTabs = allTabs.filter((tab) => {
			const url = tab.url;
			if (!url) return false;
			return !!matchPatterns.find((pattern) => pattern.includes(url));
		});
		await Promise.all(matchingTabs.map(async (tab) => {
			try {
				await browser.tabs.reload(tab.id);
			} catch (err) {
				logger.warn("Failed to reload tab:", err);
			}
		}));
	}
	async function reloadContentScriptMv2(_payload) {
		throw Error("TODO: reloadContentScriptMv2");
	}
	try {
		const ws = getDevServerWebSocket();
		ws.addWxtEventListener("wxt:reload-extension", () => {
			browser.runtime.reload();
		});
		ws.addWxtEventListener("wxt:reload-content-script", (event) => {
			reloadContentScript(event.detail);
		});
		ws.addEventListener("open", () => ws.sendCustom("wxt:background-initialized"));
		keepServiceWorkerAlive();
	} catch (err) {
		logger.error("Failed to setup web socket connection with dev server", err);
	}
	browser.commands.onCommand.addListener((command) => {
		if (command === "wxt:reload-extension") browser.runtime.reload();
	});
	var result;
	try {
		result = background_default.main();
		if (result instanceof Promise) console.warn("The background's main() function return a promise, but it must be synchronous");
	} catch (err) {
		logger.error("The background crashed on startup!");
		throw err;
	}
	return result;
})();

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsIm5hbWVzIjpbImJyb3dzZXIiLCJiYWNrZ3JvdW5kX2VudHJ5cG9pbnRfZGVmYXVsdCJdLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9kZWZpbmUtYmFja2dyb3VuZC5tanMiLCIuLi8uLi9zcmMvaW5mcmFzdHJ1Y3R1cmUvYXBpL3ZpYWNlcC1odHRwLnJlcG9zaXRvcnkudHMiLCIuLi8uLi9zcmMvY29yZS9kb21haW4vZW50aXRpZXMvZW5kZXJlY28uZW50aXR5LnRzIiwiLi4vLi4vc3JjL2NvcmUvZG9tYWluL2VudGl0aWVzL2ZhaXhhLW51bWVyby5lbnRpdHkudHMiLCIuLi8uLi9zcmMvY29yZS9hcHBsaWNhdGlvbi91c2UtY2FzZXMvYnVzY2FyLWNlcC1wb3ItZW5kZXJlY28udXNlLWNhc2UudHMiLCIuLi8uLi9zcmMvY29yZS9hcHBsaWNhdGlvbi91c2UtY2FzZXMvYnVzY2FyLWVuZGVyZWNvLXBvci1jZXAudXNlLWNhc2UudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vc3JjL2NvcmUvYXBwbGljYXRpb24vcG9ydHMvbWVzc2FnaW5nLnBvcnQudHMiLCIuLi8uLi9zcmMvaW5mcmFzdHJ1Y3R1cmUvbWVzc2FnaW5nL2JhY2tncm91bmQtbWVzc2FnZS1kaXNwYXRjaGVyLnRzIiwiLi4vLi4vZW50cnlwb2ludHMvYmFja2dyb3VuZC50cyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvZGlzdC9pbmRleC5tanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtYmFja2dyb3VuZC50c1xuZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcblx0aWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG5cdHJldHVybiBhcmc7XG59XG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGRlZmluZUJhY2tncm91bmQgfTtcbiIsImltcG9ydCB0eXBlIHsgSUNlcFJlcG9zaXRvcnkgfSBmcm9tIFwiLi4vLi4vY29yZS9hcHBsaWNhdGlvbi9wb3J0cy9jZXAtcmVwb3NpdG9yeS5wb3J0XCI7XG5pbXBvcnQgdHlwZSB7IEVuZGVyZWNvIH0gZnJvbSBcIi4uLy4uL2NvcmUvZG9tYWluL2VudGl0aWVzL2VuZGVyZWNvLmVudGl0eVwiO1xuXG4vKipcbiAqIEFkYXB0YWRvciBIVFRQIHBhcmEgY29uc3VtbyBkYSBBUEkgcMO6YmxpY2EgZG8gVmlhQ0VQLlxuICovXG5leHBvcnQgY2xhc3MgVmlhQ2VwSHR0cFJlcG9zaXRvcnkgaW1wbGVtZW50cyBJQ2VwUmVwb3NpdG9yeSB7XG4gIGFzeW5jIGJ1c2NhclBvckVuZGVyZWNvKFxuICAgIHVmOiBzdHJpbmcsXG4gICAgY2lkYWRlOiBzdHJpbmcsXG4gICAgbG9ncmFkb3Vybzogc3RyaW5nXG4gICk6IFByb21pc2U8RW5kZXJlY29bXT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB1cmwgPSBgaHR0cHM6Ly92aWFjZXAuY29tLmJyL3dzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHVmKX0vJHtlbmNvZGVVUklDb21wb25lbnQoY2lkYWRlKX0vJHtlbmNvZGVVUklDb21wb25lbnQobG9ncmFkb3Vybyl9L2pzb24vYDtcbiAgICAgIGNvbnN0IHJlc3Bvc3RhID0gYXdhaXQgZmV0Y2godXJsKTtcblxuICAgICAgaWYgKCFyZXNwb3N0YS5vaykge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhZG9zOiB1bmtub3duID0gYXdhaXQgcmVzcG9zdGEuanNvbigpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGFkb3MpKSB7XG4gICAgICAgIHJldHVybiBkYWRvcyBhcyBFbmRlcmVjb1tdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW107XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgYnVzY2FyUG9yQ2VwKGNlcDogc3RyaW5nKTogUHJvbWlzZTxFbmRlcmVjbyB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY2VwTGltcG8gPSBjZXAucmVwbGFjZSgvXFxEL2csIFwiXCIpO1xuICAgICAgaWYgKGNlcExpbXBvLmxlbmd0aCAhPT0gOCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdXJsID0gYGh0dHBzOi8vdmlhY2VwLmNvbS5ici93cy8ke2VuY29kZVVSSUNvbXBvbmVudChjZXBMaW1wbyl9L2pzb24vYDtcbiAgICAgIGNvbnN0IHJlc3Bvc3RhID0gYXdhaXQgZmV0Y2godXJsKTtcblxuICAgICAgaWYgKCFyZXNwb3N0YS5vaykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGFkb3M6IHVua25vd24gPSBhd2FpdCByZXNwb3N0YS5qc29uKCk7XG4gICAgICBpZiAoIWRhZG9zIHx8IHR5cGVvZiBkYWRvcyAhPT0gXCJvYmplY3RcIiB8fCBcImVycm9cIiBpbiAoZGFkb3MgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGFkb3MgYXMgRW5kZXJlY287XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuIiwiLyoqXG4gKiBFbnRpZGFkZSBkZSBlbmRlcmXDp28gY29tIGRhZG9zIGRvIFZpYUNFUCBlIGVucmlxdWVjaWRhIGNvbSBwb250dWHDp8OjbyBkZSByZWxldsOibmNpYS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbmRlcmVjbyB7XG4gIHJlYWRvbmx5IGNlcDogc3RyaW5nO1xuICByZWFkb25seSBsb2dyYWRvdXJvOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGNvbXBsZW1lbnRvOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGJhaXJybzogc3RyaW5nO1xuICByZWFkb25seSBsb2NhbGlkYWRlOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHVmOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGliZ2U6IHN0cmluZztcbiAgcmVhZG9ubHkgZ2lhOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGRkZDogc3RyaW5nO1xuICByZWFkb25seSBzaWFmaTogc3RyaW5nO1xuICByZWFkb25seSBzY29yZVJlbGV2YW5jaWE/OiBudW1iZXI7XG4gIHJlYWRvbmx5IGRlc3RhcXVlTW90aXZvPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFRhYmVsYSBkZSBjb3JyZXNwb25kw6puY2lhIGVudHJlIG5vbWVzIGRlIGVzdGFkb3MgYnJhc2lsZWlyb3MgZSBzdWFzIHNpZ2xhcyBkZSBkdWFzIGxldHJhcyAoVUYpLlxuICovXG5jb25zdCBUQUJFTEFfRVNUQURPU19TSUdMQVM6IFJlYWRvbmx5PFJlY29yZDxzdHJpbmcsIHN0cmluZz4+ID0ge1xuICBhY3JlOiBcIkFDXCIsXG4gIGFsYWdvYXM6IFwiQUxcIixcbiAgYW1hcGE6IFwiQVBcIixcbiAgYW1hcMOhOiBcIkFQXCIsXG4gIGFtYXpvbmFzOiBcIkFNXCIsXG4gIGJhaGlhOiBcIkJBXCIsXG4gIGNlYXJhOiBcIkNFXCIsXG4gIGNlYXLDoTogXCJDRVwiLFxuICBcImRpc3RyaXRvIGZlZGVyYWxcIjogXCJERlwiLFxuICBcImVzcGlyaXRvIHNhbnRvXCI6IFwiRVNcIixcbiAgXCJlc3DDrXJpdG8gc2FudG9cIjogXCJFU1wiLFxuICBnb2lhczogXCJHT1wiLFxuICBnb2nDoXM6IFwiR09cIixcbiAgbWFyYW5oYW86IFwiTUFcIixcbiAgbWFyYW5ow6NvOiBcIk1BXCIsXG4gIFwibWF0byBncm9zc29cIjogXCJNVFwiLFxuICBcIm1hdG8gZ3Jvc3NvIGRvIHN1bFwiOiBcIk1TXCIsXG4gIFwibWluYXMgZ2VyYWlzXCI6IFwiTUdcIixcbiAgcGFyYTogXCJQQVwiLFxuICBwYXLDoTogXCJQQVwiLFxuICBwYXJhaWJhOiBcIlBCXCIsXG4gIHBhcmHDrWJhOiBcIlBCXCIsXG4gIHBhcmFuYTogXCJQUlwiLFxuICBwYXJhbsOhOiBcIlBSXCIsXG4gIHBlcm5hbWJ1Y286IFwiUEVcIixcbiAgcGlhdWk6IFwiUElcIixcbiAgcGlhdcOtOiBcIlBJXCIsXG4gIFwicmlvIGRlIGphbmVpcm9cIjogXCJSSlwiLFxuICBcInJpbyBncmFuZGUgZG8gbm9ydGVcIjogXCJSTlwiLFxuICBcInJpbyBncmFuZGUgZG8gc3VsXCI6IFwiUlNcIixcbiAgcm9uZG9uaWE6IFwiUk9cIixcbiAgcm9uZMO0bmlhOiBcIlJPXCIsXG4gIHJvcmFpbWE6IFwiUlJcIixcbiAgXCJzYW50YSBjYXRhcmluYVwiOiBcIlNDXCIsXG4gIFwic2FvIHBhdWxvXCI6IFwiU1BcIixcbiAgXCJzw6NvIHBhdWxvXCI6IFwiU1BcIixcbiAgc2VyZ2lwZTogXCJTRVwiLFxuICB0b2NhbnRpbnM6IFwiVE9cIlxufTtcblxuLyoqXG4gKiBOb3JtYWxpemEgbyB2YWxvciBkZSBlc3RhZG8vVUYgcGFyYSB1bWEgc2lnbGEgdsOhbGlkYSBkZSAyIGxldHJhcyBtYWnDunNjdWxhcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6YXJVZih2YWxvckJydXRvOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW1wbyA9IHZhbG9yQnJ1dG8udHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChsaW1wby5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gbGltcG8udG9VcHBlckNhc2UoKTtcbiAgfVxuICByZXR1cm4gVEFCRUxBX0VTVEFET1NfU0lHTEFTW2xpbXBvXSB8fCB2YWxvckJydXRvLnRyaW0oKS50b1VwcGVyQ2FzZSgpO1xufVxuXG4vKipcbiAqIEV4dHJhaSB2YXJpYcOnw7VlcyBkbyB0ZXJtbyBkZSBsb2dyYWRvdXJvIHJlbW92ZW5kbyBwcmVmaXhvcyB1c3VhaXMgKEF2LiwgUnVhLCBldGMuKVxuICogcGFyYSBvdGltaXphciBvIMOtbmRpY2UgZGUgcmV0b3JubyBuYSBiYXNlIGRvIFZpYUNFUC9Db3JyZWlvcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhaXJUZXJtb3NCdXNjYUxvZ3JhZG91cm8obG9ncmFkb3Vybzogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCBsaW1wbyA9IGxvZ3JhZG91cm8udHJpbSgpO1xuICBjb25zdCBzZW1QcmVmaXhvID0gbGltcG9cbiAgICAucmVwbGFjZShcbiAgICAgIC9eKHJ1YXxyXFwufGF2ZW5pZGF8YXZcXC58YWxhbWVkYXxhbFxcLnx0cmF2ZXNzYXx0cnZcXC58cm9kb3ZpYXxyb2RcXC58cHJhY2F8cHJhw6dhfHDDp2FcXC4pXFxzKy9pLFxuICAgICAgXCJcIlxuICAgIClcbiAgICAudHJpbSgpO1xuXG4gIGlmIChcbiAgICBzZW1QcmVmaXhvLmxlbmd0aCA+PSAzICYmXG4gICAgc2VtUHJlZml4by50b0xvd2VyQ2FzZSgpICE9PSBsaW1wby50b0xvd2VyQ2FzZSgpXG4gICkge1xuICAgIHJldHVybiBbbGltcG8sIHNlbVByZWZpeG9dO1xuICB9XG5cbiAgcmV0dXJuIFtsaW1wb107XG59XG5cbi8qKlxuICogVmFsaWRhIGEgcHJlc2Vuw6dhIGUgY29uc2lzdMOqbmNpYSBkb3MgYXRyaWJ1dG9zIG5lY2Vzc8OhcmlvcyBwYXJhIGEgY29uc3VsdGEgZGUgQ0VQXG4gKiBlIHJldG9ybmEgdW1hIG1lbnNhZ2VtIGRlc2NyaXRpdmEgZGV0YWxoYW5kbyBjb20gZXhhdGlkw6NvIHF1YWlzIGNhbXBvcyBlc3TDo28gYXVzZW50ZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGFyQ2FtcG9zRW5kZXJlY29QYXJhQ29uc3VsdGEoXG4gIGxvZ3JhZG91cm86IHN0cmluZyxcbiAgY2lkYWRlOiBzdHJpbmcsXG4gIHVmOiBzdHJpbmdcbik6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBmYWx0YW50ZXM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgbG9ncmFkb3Vyb0xpbXBvID0gKGxvZ3JhZG91cm8gfHwgXCJcIikudHJpbSgpO1xuICBjb25zdCBjaWRhZGVMaW1wYSA9IChjaWRhZGUgfHwgXCJcIikudHJpbSgpO1xuICBjb25zdCB1Zk5vcm1hbGl6YWRhID0gbm9ybWFsaXphclVmKHVmIHx8IFwiXCIpO1xuXG4gIGlmICghbG9ncmFkb3Vyb0xpbXBvKSB7XG4gICAgZmFsdGFudGVzLnB1c2goXCJMb2dyYWRvdXJvXCIpO1xuICB9IGVsc2UgaWYgKGxvZ3JhZG91cm9MaW1wby5sZW5ndGggPCAzKSB7XG4gICAgZmFsdGFudGVzLnB1c2goXCJMb2dyYWRvdXJvIChtw61uaW1vIGRlIDMgY2FyYWN0ZXJlcylcIik7XG4gIH1cblxuICBpZiAoIWNpZGFkZUxpbXBhKSB7XG4gICAgZmFsdGFudGVzLnB1c2goXCJDaWRhZGVcIik7XG4gIH1cblxuICBpZiAoIXVmTm9ybWFsaXphZGEgfHwgdWZOb3JtYWxpemFkYS5sZW5ndGggIT09IDIpIHtcbiAgICBmYWx0YW50ZXMucHVzaChcIlVGIChFc3RhZG8pXCIpO1xuICB9XG5cbiAgaWYgKGZhbHRhbnRlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmIChmYWx0YW50ZXMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGBQcmVlbmNoYSBvIGNhbXBvICR7ZmFsdGFudGVzWzBdfSBubyBmb3JtdWzDoXJpbyBwYXJhIGNvbnN1bHRhciBvIENFUC5gO1xuICB9XG5cbiAgaWYgKGZhbHRhbnRlcy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gYFByZWVuY2hhIG9zIGNhbXBvcyAke2ZhbHRhbnRlc1swXX0gZSAke2ZhbHRhbnRlc1sxXX0gbm8gZm9ybXVsw6FyaW8gcGFyYSBjb25zdWx0YXIgbyBDRVAuYDtcbiAgfVxuXG4gIGNvbnN0IHVsdGltbyA9IGZhbHRhbnRlcy5wb3AoKTtcbiAgcmV0dXJuIGBQcmVlbmNoYSBvcyBjYW1wb3MgJHtmYWx0YW50ZXMuam9pbihcIiwgXCIpfSBlICR7dWx0aW1vfSBubyBmb3JtdWzDoXJpbyBwYXJhIGNvbnN1bHRhciBvIENFUC5gO1xufVxuXG4iLCJpbXBvcnQgdHlwZSB7IFJlc3VsdGFkb0NvbXBhdGliaWxpZGFkZSB9IGZyb20gXCIuLi90eXBlcy9zY29yZS1yZWxldmFuY2lhLnR5cGVzXCI7XG5cbi8qKlxuICogUmVtb3ZlIGFjZW50b3MgZSBjb252ZXJ0ZSBwYXJhIG1pbsO6c2N1bGFzIHBhcmEgY29tcGFyYcOnw7VlcyB0ZXh0dWFpcyBzZWd1cmFzLlxuICovXG5mdW5jdGlvbiBub3JtYWxpemFyVGV4dG8odGV4dG86IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0b1xuICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgLm5vcm1hbGl6ZShcIk5GRFwiKVxuICAgIC5yZXBsYWNlKC9bXFx1MDMwMC1cXHUwMzZmXS9nLCBcIlwiKVxuICAgIC50cmltKCk7XG59XG5cbi8qKlxuICogQW5hbGlzYSBvIHRleHRvIGRlIGNvbXBsZW1lbnRvIG9maWNpYWwgZG9zIENvcnJlaW9zIChleDogXCJkZSA5NzYvOTc3IGEgMTM3OC8xMzc5XCIsIFwiZGUgMzAwMCBhbyBmaW1cIiwgXCJsYWRvIMOtbXBhclwiLCBcImF0w6kgOTk5XCIpXG4gKiBlIGNhbGN1bGEgY29tIGFsdGEgcHJlY2lzw6NvIG1hdGVtw6F0aWNhIGEgY29tcGF0aWJpbGlkYWRlIGRvIG7Dum1lcm8gcHJlZGlhbCBkbyBpbcOzdmVsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXZhbGlhckNvbXBhdGliaWxpZGFkZU51bWVybyhcbiAgY29tcGxlbWVudG9CcnV0bzogc3RyaW5nLFxuICBudW1lcm9JbW92ZWxTdHI6IHN0cmluZ1xuKTogUmVzdWx0YWRvQ29tcGF0aWJpbGlkYWRlIHtcbiAgY29uc3QgbnVtZXJvTGltcG8gPSBudW1lcm9JbW92ZWxTdHIucmVwbGFjZSgvXFxEL2csIFwiXCIpO1xuICBpZiAoIW51bWVyb0xpbXBvKSB7XG4gICAgcmV0dXJuIHsgY29tcGF0aXZlbDogZmFsc2UsIHRlbUZhaXhhUmVzdHJpdGl2YTogZmFsc2UsIHNjb3JlOiAwLCBtb3Rpdm86IFwiXCIgfTtcbiAgfVxuXG4gIGNvbnN0IG51bSA9IHBhcnNlSW50KG51bWVyb0xpbXBvLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4obnVtKSkge1xuICAgIHJldHVybiB7IGNvbXBhdGl2ZWw6IGZhbHNlLCB0ZW1GYWl4YVJlc3RyaXRpdmE6IGZhbHNlLCBzY29yZTogMCwgbW90aXZvOiBcIlwiIH07XG4gIH1cblxuICBjb25zdCBjb21wID0gbm9ybWFsaXphclRleHRvKGNvbXBsZW1lbnRvQnJ1dG8gfHwgXCJcIik7XG4gIGlmICghY29tcCkge1xuICAgIC8vIFF1YW5kbyBuw6NvIGjDoSBjb21wbGVtZW50bywgbyBDRVAgYXRlbmRlIHF1YWxxdWVyIG51bWVyYcOnw6NvIGRhIHJ1YSBzZW0gcmVzdHJpw6fDtWVzXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbXBhdGl2ZWw6IHRydWUsXG4gICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IGZhbHNlLFxuICAgICAgc2NvcmU6IDEwLFxuICAgICAgbW90aXZvOiBcIkF0ZW5kZSB0b2RhIGEgZXh0ZW5zw6NvXCJcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgZWhQYXIgPSBudW0gJSAyID09PSAwO1xuXG4gIC8vIDEuIERldGVjdGEgcmVzdHJpw6fDtWVzIGV4cGzDrWNpdGFzIGRlIHBhcmlkYWRlIHRleHR1YWxcbiAgY29uc3QgZXhpZ2VQYXIgPVxuICAgIGNvbXAuaW5jbHVkZXMoXCJsYWRvIHBhclwiKSB8fFxuICAgIGNvbXAuaW5jbHVkZXMoXCJzb21lbnRlIHBhclwiKSB8fFxuICAgIGNvbXAuaW5jbHVkZXMoXCJudW1lcm9zIHBhcmVzXCIpIHx8XG4gICAgY29tcC5pbmNsdWRlcyhcInBhcmVzXCIpO1xuXG4gIGNvbnN0IGV4aWdlSW1wYXIgPVxuICAgIGNvbXAuaW5jbHVkZXMoXCJsYWRvIGltcGFyXCIpIHx8XG4gICAgY29tcC5pbmNsdWRlcyhcInNvbWVudGUgaW1wYXJcIikgfHxcbiAgICBjb21wLmluY2x1ZGVzKFwibnVtZXJvcyBpbXBhcmVzXCIpIHx8XG4gICAgY29tcC5pbmNsdWRlcyhcImltcGFyZXNcIik7XG5cbiAgLy8gQ0FTTyAxOiBGYWl4YSBkdXBsYSBjb20gYmFycmFzIHBhci/DrW1wYXIgbm8gaW7DrWNpbyBlIGZpbTogXCJkZSA5NzYvOTc3IGEgMTM3OC8xMzc5XCJcbiAgY29uc3QgbWF0Y2hEdXBsb0ludGVydmFsbyA9IGNvbXAubWF0Y2goXG4gICAgL2RlXFxzKyhcXGQrKVxccypcXC9cXHMqKFxcZCspXFxzK2FcXHMrKFxcZCspXFxzKlxcL1xccyooXFxkKykvXG4gICk7XG4gIGlmIChtYXRjaER1cGxvSW50ZXJ2YWxvKSB7XG4gICAgY29uc3QgbjEgPSBwYXJzZUludChtYXRjaER1cGxvSW50ZXJ2YWxvWzFdID8/IFwiMFwiLCAxMCk7XG4gICAgY29uc3QgbjIgPSBwYXJzZUludChtYXRjaER1cGxvSW50ZXJ2YWxvWzJdID8/IFwiMFwiLCAxMCk7XG4gICAgY29uc3QgbjMgPSBwYXJzZUludChtYXRjaER1cGxvSW50ZXJ2YWxvWzNdID8/IFwiMFwiLCAxMCk7XG4gICAgY29uc3QgbjQgPSBwYXJzZUludChtYXRjaER1cGxvSW50ZXJ2YWxvWzRdID8/IFwiMFwiLCAxMCk7XG5cbiAgICBjb25zdCBpbmljaW9zID0gW24xLCBuMl07XG4gICAgY29uc3QgZmlucyA9IFtuMywgbjRdO1xuXG4gICAgY29uc3QgaW5pY2lvUGFyID0gTWF0aC5taW4oLi4uaW5pY2lvcy5maWx0ZXIoKG4pID0+IG4gJSAyID09PSAwKSk7XG4gICAgY29uc3QgZmltUGFyID0gTWF0aC5tYXgoLi4uZmlucy5maWx0ZXIoKG4pID0+IG4gJSAyID09PSAwKSk7XG4gICAgY29uc3QgaW5pY2lvSW1wYXIgPSBNYXRoLm1pbiguLi5pbmljaW9zLmZpbHRlcigobikgPT4gbiAlIDIgIT09IDApKTtcbiAgICBjb25zdCBmaW1JbXBhciA9IE1hdGgubWF4KC4uLmZpbnMuZmlsdGVyKChuKSA9PiBuICUgMiAhPT0gMCkpO1xuXG4gICAgaWYgKGVoUGFyKSB7XG4gICAgICBpZiAobnVtID49IGluaWNpb1BhciAmJiBudW0gPD0gZmltUGFyKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29tcGF0aXZlbDogdHJ1ZSxcbiAgICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgICAgc2NvcmU6IDIwMCxcbiAgICAgICAgICBtb3Rpdm86IGBOw7ptZXJvICR7bnVtfSBkZW50cm8gZGEgZmFpeGEgcGFyICgke2luaWNpb1Bhcn0gYSAke2ZpbVBhcn0pYFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29tcGF0aXZlbDogZmFsc2UsXG4gICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgc2NvcmU6IC01MDAsXG4gICAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IGZvcmEgZGEgZmFpeGEgcGFyICgke2luaWNpb1Bhcn0gYSAke2ZpbVBhcn0pYFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG51bSA+PSBpbmljaW9JbXBhciAmJiBudW0gPD0gZmltSW1wYXIpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjb21wYXRpdmVsOiB0cnVlLFxuICAgICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgICBzY29yZTogMjAwLFxuICAgICAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IGRlbnRybyBkYSBmYWl4YSDDrW1wYXIgKCR7aW5pY2lvSW1wYXJ9IGEgJHtmaW1JbXBhcn0pYFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29tcGF0aXZlbDogZmFsc2UsXG4gICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgc2NvcmU6IC01MDAsXG4gICAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IGZvcmEgZGEgZmFpeGEgw61tcGFyICgke2luaWNpb0ltcGFyfSBhICR7ZmltSW1wYXJ9KWBcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gQ0FTTyAyOiBGYWl4YSBkdXBsYSBjb20gYmFycmFzIFwiZGUgWC9ZIGFvIGZpbVwiIC8gXCJkZSBYL1kgZW0gZGlhbnRlXCJcbiAgY29uc3QgbWF0Y2hEdXBsb0FvRmltID0gY29tcC5tYXRjaChcbiAgICAvZGVcXHMrKFxcZCspXFxzKlxcL1xccyooXFxkKylcXHMrKD86YW9cXHMrZmltfGFvXFxzK2ZpbmFsfGVtXFxzK2RpYW50ZXxhXFxzK3NlZ3VpcikvXG4gICk7XG4gIGlmIChtYXRjaER1cGxvQW9GaW0pIHtcbiAgICBjb25zdCBuMSA9IHBhcnNlSW50KG1hdGNoRHVwbG9Bb0ZpbVsxXSA/PyBcIjBcIiwgMTApO1xuICAgIGNvbnN0IG4yID0gcGFyc2VJbnQobWF0Y2hEdXBsb0FvRmltWzJdID8/IFwiMFwiLCAxMCk7XG4gICAgY29uc3QgaW5pY2lvcyA9IFtuMSwgbjJdO1xuICAgIGNvbnN0IGluaWNpb1BhciA9IE1hdGgubWluKC4uLmluaWNpb3MuZmlsdGVyKChuKSA9PiBuICUgMiA9PT0gMCkpO1xuICAgIGNvbnN0IGluaWNpb0ltcGFyID0gTWF0aC5taW4oLi4uaW5pY2lvcy5maWx0ZXIoKG4pID0+IG4gJSAyICE9PSAwKSk7XG5cbiAgICBpZiAoZWhQYXIpIHtcbiAgICAgIGlmIChudW0gPj0gaW5pY2lvUGFyKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29tcGF0aXZlbDogdHJ1ZSxcbiAgICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgICAgc2NvcmU6IDIwMCxcbiAgICAgICAgICBtb3Rpdm86IGBOw7ptZXJvICR7bnVtfSBkZW50cm8gZGEgZmFpeGEgcGFyIChkZSAke2luaWNpb1Bhcn0gYW8gZmltKWBcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBhdGl2ZWw6IGZhbHNlLFxuICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgIHNjb3JlOiAtNTAwLFxuICAgICAgICBtb3Rpdm86IGBOw7ptZXJvICR7bnVtfSBtZW5vciBxdWUgbyBpbsOtY2lvIGRhIGZhaXhhIHBhciAoJHtpbmljaW9QYXJ9KWBcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChudW0gPj0gaW5pY2lvSW1wYXIpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjb21wYXRpdmVsOiB0cnVlLFxuICAgICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgICBzY29yZTogMjAwLFxuICAgICAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IGRlbnRybyBkYSBmYWl4YSDDrW1wYXIgKGRlICR7aW5pY2lvSW1wYXJ9IGFvIGZpbSlgXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb21wYXRpdmVsOiBmYWxzZSxcbiAgICAgICAgdGVtRmFpeGFSZXN0cml0aXZhOiB0cnVlLFxuICAgICAgICBzY29yZTogLTUwMCxcbiAgICAgICAgbW90aXZvOiBgTsO6bWVybyAke251bX0gbWVub3IgcXVlIG8gaW7DrWNpbyBkYSBmYWl4YSDDrW1wYXIgKCR7aW5pY2lvSW1wYXJ9KWBcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gQ0FTTyAzOiBGYWl4YSBkdXBsYSBjb20gYmFycmFzIFwiYXTDqSBYL1lcIlxuICBjb25zdCBtYXRjaER1cGxvQXRlID0gY29tcC5tYXRjaCgvYXRlXFxzKyhcXGQrKVxccypcXC9cXHMqKFxcZCspLyk7XG4gIGlmIChtYXRjaER1cGxvQXRlKSB7XG4gICAgY29uc3QgbjEgPSBwYXJzZUludChtYXRjaER1cGxvQXRlWzFdID8/IFwiMFwiLCAxMCk7XG4gICAgY29uc3QgbjIgPSBwYXJzZUludChtYXRjaER1cGxvQXRlWzJdID8/IFwiMFwiLCAxMCk7XG4gICAgY29uc3QgZmlucyA9IFtuMSwgbjJdO1xuICAgIGNvbnN0IGZpbVBhciA9IE1hdGgubWF4KC4uLmZpbnMuZmlsdGVyKChuKSA9PiBuICUgMiA9PT0gMCkpO1xuICAgIGNvbnN0IGZpbUltcGFyID0gTWF0aC5tYXgoLi4uZmlucy5maWx0ZXIoKG4pID0+IG4gJSAyICE9PSAwKSk7XG5cbiAgICBpZiAoZWhQYXIpIHtcbiAgICAgIGlmIChudW0gPD0gZmltUGFyKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29tcGF0aXZlbDogdHJ1ZSxcbiAgICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgICAgc2NvcmU6IDIwMCxcbiAgICAgICAgICBtb3Rpdm86IGBOw7ptZXJvICR7bnVtfSBkZW50cm8gZGEgZmFpeGEgcGFyIChhdMOpICR7ZmltUGFyfSlgXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb21wYXRpdmVsOiBmYWxzZSxcbiAgICAgICAgdGVtRmFpeGFSZXN0cml0aXZhOiB0cnVlLFxuICAgICAgICBzY29yZTogLTUwMCxcbiAgICAgICAgbW90aXZvOiBgTsO6bWVybyAke251bX0gbWFpb3IgcXVlIG8gZmltIGRhIGZhaXhhIHBhciAoJHtmaW1QYXJ9KWBcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChudW0gPD0gZmltSW1wYXIpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjb21wYXRpdmVsOiB0cnVlLFxuICAgICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgICBzY29yZTogMjAwLFxuICAgICAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IGRlbnRybyBkYSBmYWl4YSDDrW1wYXIgKGF0w6kgJHtmaW1JbXBhcn0pYFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29tcGF0aXZlbDogZmFsc2UsXG4gICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgc2NvcmU6IC01MDAsXG4gICAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IG1haW9yIHF1ZSBvIGZpbSBkYSBmYWl4YSDDrW1wYXIgKCR7ZmltSW1wYXJ9KWBcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gQ0FTTyA0OiBGYWl4YSBzaW1wbGVzIFwiZGUgWCBhIFlcIlxuICBjb25zdCBtYXRjaFNpbXBsZXNJbnRlcnZhbG8gPSBjb21wLm1hdGNoKC9kZVxccysoXFxkKylcXHMrYVxccysoXFxkKykvKTtcbiAgaWYgKG1hdGNoU2ltcGxlc0ludGVydmFsbykge1xuICAgIGNvbnN0IGluaWNpbyA9IHBhcnNlSW50KG1hdGNoU2ltcGxlc0ludGVydmFsb1sxXSA/PyBcIjBcIiwgMTApO1xuICAgIGNvbnN0IGZpbSA9IHBhcnNlSW50KG1hdGNoU2ltcGxlc0ludGVydmFsb1syXSA/PyBcIjBcIiwgMTApO1xuXG4gICAgaWYgKGV4aWdlUGFyICYmICFlaFBhcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29tcGF0aXZlbDogZmFsc2UsXG4gICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgc2NvcmU6IC01MDAsXG4gICAgICAgIG1vdGl2bzogXCJFeGlnZSBudW1lcmHDp8OjbyBwYXJcIlxuICAgICAgfTtcbiAgICB9XG4gICAgaWYgKGV4aWdlSW1wYXIgJiYgZWhQYXIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBhdGl2ZWw6IGZhbHNlLFxuICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgIHNjb3JlOiAtNTAwLFxuICAgICAgICBtb3Rpdm86IFwiRXhpZ2UgbnVtZXJhw6fDo28gw61tcGFyXCJcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKG51bSA+PSBpbmljaW8gJiYgbnVtIDw9IGZpbSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29tcGF0aXZlbDogdHJ1ZSxcbiAgICAgICAgdGVtRmFpeGFSZXN0cml0aXZhOiB0cnVlLFxuICAgICAgICBzY29yZTogMjAwLFxuICAgICAgICBtb3Rpdm86IGBOw7ptZXJvICR7bnVtfSBkZW50cm8gZGEgZmFpeGEgKCR7aW5pY2lvfSBhICR7ZmltfSlgXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGF0aXZlbDogZmFsc2UsXG4gICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICBzY29yZTogLTUwMCxcbiAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IGZvcmEgZGEgZmFpeGEgKCR7aW5pY2lvfSBhICR7ZmltfSlgXG4gICAgfTtcbiAgfVxuXG4gIC8vIENBU08gNTogRmFpeGEgc2ltcGxlcyBcImRlIFggYW8gZmltXCIgLyBcImRlIFggZW0gZGlhbnRlXCJcbiAgY29uc3QgbWF0Y2hTaW1wbGVzQW9GaW0gPSBjb21wLm1hdGNoKFxuICAgIC8oPzpkZXxhXFxzK3BhcnRpclxccytkZSlcXHMrKFxcZCspXFxzKig/OmFvXFxzK2ZpbXxhb1xccytmaW5hbHxlbVxccytkaWFudGV8YVxccytzZWd1aXIpPy9cbiAgKTtcbiAgaWYgKG1hdGNoU2ltcGxlc0FvRmltICYmIChjb21wLmluY2x1ZGVzKFwiZmltXCIpIHx8IGNvbXAuaW5jbHVkZXMoXCJkaWFudGVcIikgfHwgY29tcC5pbmNsdWRlcyhcInBhcnRpclwiKSkpIHtcbiAgICBjb25zdCBpbmljaW8gPSBwYXJzZUludChtYXRjaFNpbXBsZXNBb0ZpbVsxXSA/PyBcIjBcIiwgMTApO1xuXG4gICAgaWYgKGV4aWdlUGFyICYmICFlaFBhcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29tcGF0aXZlbDogZmFsc2UsXG4gICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgc2NvcmU6IC01MDAsXG4gICAgICAgIG1vdGl2bzogXCJFeGlnZSBudW1lcmHDp8OjbyBwYXJcIlxuICAgICAgfTtcbiAgICB9XG4gICAgaWYgKGV4aWdlSW1wYXIgJiYgZWhQYXIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBhdGl2ZWw6IGZhbHNlLFxuICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgIHNjb3JlOiAtNTAwLFxuICAgICAgICBtb3Rpdm86IFwiRXhpZ2UgbnVtZXJhw6fDo28gw61tcGFyXCJcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKG51bSA+PSBpbmljaW8pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBhdGl2ZWw6IHRydWUsXG4gICAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgICAgc2NvcmU6IDIwMCxcbiAgICAgICAgbW90aXZvOiBgTsO6bWVybyAke251bX0gY29tcGF0w612ZWwgKGRlICR7aW5pY2lvfSBlbSBkaWFudGUpYFxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbXBhdGl2ZWw6IGZhbHNlLFxuICAgICAgdGVtRmFpeGFSZXN0cml0aXZhOiB0cnVlLFxuICAgICAgc2NvcmU6IC01MDAsXG4gICAgICBtb3Rpdm86IGBOw7ptZXJvICR7bnVtfSBtZW5vciBxdWUgJHtpbmljaW99YFxuICAgIH07XG4gIH1cblxuICAvLyBDQVNPIDY6IEZhaXhhIHNpbXBsZXMgXCJhdMOpIFlcIiAvIFwiYXRlIFlcIlxuICBjb25zdCBtYXRjaFNpbXBsZXNBdGUgPSBjb21wLm1hdGNoKC9hdGVcXHMrKFxcZCspLyk7XG4gIGlmIChtYXRjaFNpbXBsZXNBdGUpIHtcbiAgICBjb25zdCBmaW0gPSBwYXJzZUludChtYXRjaFNpbXBsZXNBdGVbMV0gPz8gXCIwXCIsIDEwKTtcblxuICAgIGlmIChleGlnZVBhciAmJiAhZWhQYXIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBhdGl2ZWw6IGZhbHNlLFxuICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgIHNjb3JlOiAtNTAwLFxuICAgICAgICBtb3Rpdm86IFwiRXhpZ2UgbnVtZXJhw6fDo28gcGFyXCJcbiAgICAgIH07XG4gICAgfVxuICAgIGlmIChleGlnZUltcGFyICYmIGVoUGFyKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb21wYXRpdmVsOiBmYWxzZSxcbiAgICAgICAgdGVtRmFpeGFSZXN0cml0aXZhOiB0cnVlLFxuICAgICAgICBzY29yZTogLTUwMCxcbiAgICAgICAgbW90aXZvOiBcIkV4aWdlIG51bWVyYcOnw6NvIMOtbXBhclwiXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChudW0gPD0gZmltKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb21wYXRpdmVsOiB0cnVlLFxuICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgIHNjb3JlOiAyMDAsXG4gICAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IGNvbXBhdMOtdmVsIChhdMOpICR7ZmltfSlgXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGF0aXZlbDogZmFsc2UsXG4gICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICBzY29yZTogLTUwMCxcbiAgICAgIG1vdGl2bzogYE7Dum1lcm8gJHtudW19IG1haW9yIHF1ZSAke2ZpbX1gXG4gICAgfTtcbiAgfVxuXG4gIC8vIENBU08gNzogQXBlbmFzIHBhcmlkYWRlIHNlbSBuw7ptZXJvIGxpbWl0ZVxuICBpZiAoZXhpZ2VQYXIgfHwgZXhpZ2VJbXBhcikge1xuICAgIGlmIChleGlnZVBhciAmJiAhZWhQYXIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBhdGl2ZWw6IGZhbHNlLFxuICAgICAgICB0ZW1GYWl4YVJlc3RyaXRpdmE6IHRydWUsXG4gICAgICAgIHNjb3JlOiAtNTAwLFxuICAgICAgICBtb3Rpdm86IFwiRXhpZ2UgbnVtZXJhw6fDo28gcGFyXCJcbiAgICAgIH07XG4gICAgfVxuICAgIGlmIChleGlnZUltcGFyICYmIGVoUGFyKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb21wYXRpdmVsOiBmYWxzZSxcbiAgICAgICAgdGVtRmFpeGFSZXN0cml0aXZhOiB0cnVlLFxuICAgICAgICBzY29yZTogLTUwMCxcbiAgICAgICAgbW90aXZvOiBcIkV4aWdlIG51bWVyYcOnw6NvIMOtbXBhclwiXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGF0aXZlbDogdHJ1ZSxcbiAgICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogdHJ1ZSxcbiAgICAgIHNjb3JlOiAxMDAsXG4gICAgICBtb3Rpdm86IGVoUGFyID8gXCJMYWRvIHBhciBjb21wYXTDrXZlbFwiIDogXCJMYWRvIMOtbXBhciBjb21wYXTDrXZlbFwiXG4gICAgfTtcbiAgfVxuXG4gIC8vIENvbXBsZW1lbnRvIG7Do28gY29udMOpbSByZWdyYXMgZGUgbnVtZXJhw6fDo28gKGV4OiBcIkNlbnRyb1wiLCBcIkJsb2NvIEFcIiwgZXRjLilcbiAgcmV0dXJuIHtcbiAgICBjb21wYXRpdmVsOiB0cnVlLFxuICAgIHRlbUZhaXhhUmVzdHJpdGl2YTogZmFsc2UsXG4gICAgc2NvcmU6IDEwLFxuICAgIG1vdGl2bzogXCJTZW0gcmVzdHJpw6fDo28gbnVtw6lyaWNhXCJcbiAgfTtcbn1cbiIsImltcG9ydCB0eXBlIHsgSUNlcFJlcG9zaXRvcnkgfSBmcm9tIFwiLi4vcG9ydHMvY2VwLXJlcG9zaXRvcnkucG9ydFwiO1xuaW1wb3J0IHR5cGUgeyBDb25zdWx0YUVuZGVyZWNvUGFyYW1zIH0gZnJvbSBcIi4uLy4uL2RvbWFpbi90eXBlcy9jb25zdWx0YS1lbmRlcmVjby50eXBlc1wiO1xuaW1wb3J0IHtcbiAgdHlwZSBFbmRlcmVjbyxcbiAgbm9ybWFsaXphclVmLFxuICBleHRyYWlyVGVybW9zQnVzY2FMb2dyYWRvdXJvXG59IGZyb20gXCIuLi8uLi9kb21haW4vZW50aXRpZXMvZW5kZXJlY28uZW50aXR5XCI7XG5pbXBvcnQgeyBhdmFsaWFyQ29tcGF0aWJpbGlkYWRlTnVtZXJvIH0gZnJvbSBcIi4uLy4uL2RvbWFpbi9lbnRpdGllcy9mYWl4YS1udW1lcm8uZW50aXR5XCI7XG5cbi8qKlxuICogQ2FzbyBkZSB1c28gcmVzcG9uc8OhdmVsIHBvciBjb25zdWx0YXIgQ0VQcyBhIHBhcnRpciBkZSBkYWRvcyBwYXJjaWFpcyBkZSBlbmRlcmXDp28sXG4gKiBhcGxpY2FuZG8gbm9ybWFsaXphw6fDtWVzIGUgb3JkZW5hbmRvIHBlbG8gZ3JhdSBkZSByZWxldsOibmNpYS5cbiAqL1xuZXhwb3J0IGNsYXNzIEJ1c2NhckNlcFBvckVuZGVyZWNvVXNlQ2FzZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY2VwUmVwb3NpdG9yeTogSUNlcFJlcG9zaXRvcnkpIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShwYXJhbXM6IENvbnN1bHRhRW5kZXJlY29QYXJhbXMpOiBQcm9taXNlPEVuZGVyZWNvW10+IHtcbiAgICBjb25zdCB1ZiA9IG5vcm1hbGl6YXJVZihwYXJhbXMudWYgfHwgXCJcIik7XG4gICAgY29uc3QgY2lkYWRlTGltcGEgPSAocGFyYW1zLmNpZGFkZSB8fCBcIlwiKS50cmltKCk7XG4gICAgY29uc3QgbG9ncmFkb3Vyb0xpbXBvID0gKHBhcmFtcy5sb2dyYWRvdXJvIHx8IFwiXCIpLnRyaW0oKTtcblxuICAgIGlmIChcbiAgICAgICF1ZiB8fFxuICAgICAgdWYubGVuZ3RoICE9PSAyIHx8XG4gICAgICAhY2lkYWRlTGltcGEgfHxcbiAgICAgICFsb2dyYWRvdXJvTGltcG8gfHxcbiAgICAgIGxvZ3JhZG91cm9MaW1wby5sZW5ndGggPCAzXG4gICAgKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgdGVybW9zID0gZXh0cmFpclRlcm1vc0J1c2NhTG9ncmFkb3Vybyhsb2dyYWRvdXJvTGltcG8pO1xuICAgIGxldCByZXN1bHRhZG9zOiBFbmRlcmVjb1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHRlcm1vIG9mIHRlcm1vcykge1xuICAgICAgcmVzdWx0YWRvcyA9IGF3YWl0IHRoaXMuY2VwUmVwb3NpdG9yeS5idXNjYXJQb3JFbmRlcmVjbyhcbiAgICAgICAgdWYsXG4gICAgICAgIGNpZGFkZUxpbXBhLFxuICAgICAgICB0ZXJtb1xuICAgICAgKTtcbiAgICAgIGlmIChyZXN1bHRhZG9zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYmFpcnJvTm9ybWFsaXphZG8gPSAocGFyYW1zLmJhaXJybyB8fCBcIlwiKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCBudW1lcm9Ob3JtYWxpemFkbyA9IChwYXJhbXMubnVtZXJvIHx8IFwiXCIpLnRyaW0oKTtcblxuICAgIGNvbnN0IHJlc3VsdGFkb3NFbnJpcXVlY2lkb3M6IEVuZGVyZWNvW10gPSByZXN1bHRhZG9zLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgbGV0IHNjb3JlID0gMDtcbiAgICAgIGNvbnN0IG1vdGl2b3M6IHN0cmluZ1tdID0gW107XG5cbiAgICAgIGNvbnN0IGJhaXJyb0l0ZW0gPSAoaXRlbS5iYWlycm8gfHwgXCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBjb25zdCB0ZW1CYWlycm9FeGF0byA9IGJhaXJyb05vcm1hbGl6YWRvICYmIGJhaXJyb0l0ZW0gPT09IGJhaXJyb05vcm1hbGl6YWRvO1xuICAgICAgY29uc3QgdGVtQmFpcnJvU2ltaWxhciA9XG4gICAgICAgIGJhaXJyb05vcm1hbGl6YWRvICYmXG4gICAgICAgICF0ZW1CYWlycm9FeGF0byAmJlxuICAgICAgICAoYmFpcnJvSXRlbS5pbmNsdWRlcyhiYWlycm9Ob3JtYWxpemFkbykgfHxcbiAgICAgICAgICBiYWlycm9Ob3JtYWxpemFkby5pbmNsdWRlcyhiYWlycm9JdGVtKSk7XG5cbiAgICAgIGlmIChudW1lcm9Ob3JtYWxpemFkbykge1xuICAgICAgICBjb25zdCBhdmFsaWFjYW8gPSBhdmFsaWFyQ29tcGF0aWJpbGlkYWRlTnVtZXJvKFxuICAgICAgICAgIGl0ZW0uY29tcGxlbWVudG8sXG4gICAgICAgICAgbnVtZXJvTm9ybWFsaXphZG9cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoYXZhbGlhY2FvLnRlbUZhaXhhUmVzdHJpdGl2YSkge1xuICAgICAgICAgIGlmICghYXZhbGlhY2FvLmNvbXBhdGl2ZWwpIHtcbiAgICAgICAgICAgIC8vIFNlIG8gQ0VQIHRlbSBmYWl4YSByZXN0cml0aXZhIGUgbyBuw7ptZXJvIGluZm9ybWFkbyBlc3TDoSBGT1JBIGRlbGEsXG4gICAgICAgICAgICAvLyBkZXNxdWFsaWZpY2EgbyBDRVAgY2F0ZWdvcmljYW1lbnRlIHBhcmEgcXVlIG7Do28gc2VqYSByZWNvbWVuZGFkbyBwb3IgZW5nYW5vXG4gICAgICAgICAgICBzY29yZSA9IDA7XG4gICAgICAgICAgICBtb3Rpdm9zLnB1c2goYXZhbGlhY2FvLm1vdGl2byk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE7Dum1lcm8gZXN0w6EgZGVudHJvIGRhIGZhaXhhIGRlc3RlIENFUCBzZWNjaW9uYWRvXG4gICAgICAgICAgICBzY29yZSA9IGF2YWxpYWNhby5zY29yZTsgLy8gMjAwIHBvbnRvc1xuICAgICAgICAgICAgbW90aXZvcy5wdXNoKGF2YWxpYWNhby5tb3Rpdm8pO1xuXG4gICAgICAgICAgICAvLyBCw7RudXMgYWRpY2lvbmFsIGNhc28gbyBiYWlycm8gdGFtYsOpbSBjb2luY2lkYSBwZXJmZWl0YW1lbnRlXG4gICAgICAgICAgICBpZiAodGVtQmFpcnJvRXhhdG8pIHtcbiAgICAgICAgICAgICAgc2NvcmUgKz0gMTAwO1xuICAgICAgICAgICAgICBtb3Rpdm9zLnB1c2goXCJCYWlycm8gZXhhdG9cIik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRlbUJhaXJyb1NpbWlsYXIpIHtcbiAgICAgICAgICAgICAgc2NvcmUgKz0gNTA7XG4gICAgICAgICAgICAgIG1vdGl2b3MucHVzaChcIkJhaXJybyBzaW1pbGFyXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBDRVAgYXRlbmRlIGEgcnVhIGludGVpcmEgc2VtIHNlY2Npb25hbWVudG8gbnVtw6lyaWNvIHJlc3RyaXRpdm9cbiAgICAgICAgICBzY29yZSA9IDMwO1xuICAgICAgICAgIGlmICh0ZW1CYWlycm9FeGF0bykge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTIwO1xuICAgICAgICAgICAgbW90aXZvcy5wdXNoKFwiQmFpcnJvIGV4YXRvXCIpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGVtQmFpcnJvU2ltaWxhcikge1xuICAgICAgICAgICAgc2NvcmUgKz0gODA7XG4gICAgICAgICAgICBtb3Rpdm9zLnB1c2goXCJCYWlycm8gc2ltaWxhclwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFVzdcOhcmlvIG7Do28gcHJlZW5jaGV1IG7Dum1lcm8gcHJlZGlhbDogZGVzZW1wYXRlIHByaW5jaXBhbCDDqSBwZWxhIGNvcnJlc3BvbmTDqm5jaWEgZGUgQmFpcnJvXG4gICAgICAgIGlmICh0ZW1CYWlycm9FeGF0bykge1xuICAgICAgICAgIHNjb3JlICs9IDEyMDtcbiAgICAgICAgICBtb3Rpdm9zLnB1c2goXCJCYWlycm8gZXhhdG9cIik7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtQmFpcnJvU2ltaWxhcikge1xuICAgICAgICAgIHNjb3JlICs9IDgwO1xuICAgICAgICAgIG1vdGl2b3MucHVzaChcIkJhaXJybyBzaW1pbGFyXCIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLml0ZW0sXG4gICAgICAgIHNjb3JlUmVsZXZhbmNpYTogc2NvcmUsXG4gICAgICAgIGRlc3RhcXVlTW90aXZvOiBtb3Rpdm9zLmpvaW4oXCIg4oCiIFwiKVxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIC8vIE9yZGVuYcOnw6NvIGRlY3Jlc2NlbnRlIHBvciBzY29yZSBkZSByZWxldsOibmNpYVxuICAgIHJlc3VsdGFkb3NFbnJpcXVlY2lkb3Muc29ydChcbiAgICAgIChhLCBiKSA9PiAoYi5zY29yZVJlbGV2YW5jaWEgPz8gMCkgLSAoYS5zY29yZVJlbGV2YW5jaWEgPz8gMClcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3VsdGFkb3NFbnJpcXVlY2lkb3M7XG4gIH1cbn1cblxuIiwiaW1wb3J0IHR5cGUgeyBJQ2VwUmVwb3NpdG9yeSB9IGZyb20gXCIuLi9wb3J0cy9jZXAtcmVwb3NpdG9yeS5wb3J0XCI7XG5pbXBvcnQgdHlwZSB7IEVuZGVyZWNvIH0gZnJvbSBcIi4uLy4uL2RvbWFpbi9lbnRpdGllcy9lbmRlcmVjby5lbnRpdHlcIjtcblxuLyoqXG4gKiBDYXNvIGRlIHVzbyByZXNwb25zw6F2ZWwgcG9yIGNvbnN1bHRhciBvIGVuZGVyZcOnbyBjb21wbGV0byBhIHBhcnRpciBkZSB1bSBjw7NkaWdvIENFUC5cbiAqL1xuZXhwb3J0IGNsYXNzIEJ1c2NhckVuZGVyZWNvUG9yQ2VwVXNlQ2FzZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY2VwUmVwb3NpdG9yeTogSUNlcFJlcG9zaXRvcnkpIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShjZXA6IHN0cmluZyk6IFByb21pc2U8RW5kZXJlY28gfCBudWxsPiB7XG4gICAgY29uc3QgY2VwTGltcG8gPSAoY2VwIHx8IFwiXCIpLnJlcGxhY2UoL1xcRC9nLCBcIlwiKTtcbiAgICBpZiAoY2VwTGltcG8ubGVuZ3RoICE9PSA4KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jZXBSZXBvc2l0b3J5LmJ1c2NhclBvckNlcChjZXBMaW1wbyk7XG4gIH1cbn1cblxuIiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBicm93c2VyJDEgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuLy8jcmVnaW9uIHNyYy9icm93c2VyLnRzXG4vKipcbiogQ29udGFpbnMgdGhlIGBicm93c2VyYCBleHBvcnQgd2hpY2ggeW91IHNob3VsZCB1c2UgdG8gYWNjZXNzIHRoZSBleHRlbnNpb25cbiogQVBJcyBpbiB5b3VyIHByb2plY3Q6XG4qXG4qIGBgYHRzXG4qIGltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICd3eHQvYnJvd3Nlcic7XG4qXG4qIGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4qICAgLy8gLi4uXG4qIH0pO1xuKiBgYGBcbipcbiogQG1vZHVsZSB3eHQvYnJvd3NlclxuKi9cbmNvbnN0IGJyb3dzZXIgPSBicm93c2VyJDE7XG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGJyb3dzZXIgfTtcbiIsImltcG9ydCB0eXBlIHsgQ29uc3VsdGFFbmRlcmVjb1BhcmFtcyB9IGZyb20gXCIuLi8uLi9kb21haW4vdHlwZXMvY29uc3VsdGEtZW5kZXJlY28udHlwZXNcIjtcbmltcG9ydCB0eXBlIHsgRW5kZXJlY28gfSBmcm9tIFwiLi4vLi4vZG9tYWluL2VudGl0aWVzL2VuZGVyZWNvLmVudGl0eVwiO1xuXG4vKipcbiAqIFRpcG9zIGRlIG1lbnNhZ2VucyBzdXBvcnRhZGFzIHBlbG8gc2lzdGVtYSBkZSBtZW5zYWdlcmlhIGRhIGV4dGVuc8Ojby5cbiAqL1xuZXhwb3J0IGNvbnN0IFRJUE9fTUVOU0FHRU1fQlVTQ0FSX0NFUCA9IFwiQlVTQ0FSX0NFUFwiIGFzIGNvbnN0O1xuZXhwb3J0IGNvbnN0IFRJUE9fTUVOU0FHRU1fQ09OU1VMVEFSX0NFUF9ESVJFVE8gPSBcIkNPTlNVTFRBUl9DRVBfRElSRVRPXCIgYXMgY29uc3Q7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVzY2FyQ2VwUmVxdWVzdE1lc3NhZ2Uge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgVElQT19NRU5TQUdFTV9CVVNDQVJfQ0VQO1xuICByZWFkb25seSBwYXlsb2FkOiBDb25zdWx0YUVuZGVyZWNvUGFyYW1zO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnN1bHRhckNlcERpcmV0b1JlcXVlc3RNZXNzYWdlIHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIFRJUE9fTUVOU0FHRU1fQ09OU1VMVEFSX0NFUF9ESVJFVE87XG4gIHJlYWRvbmx5IHBheWxvYWQ6IHsgcmVhZG9ubHkgY2VwOiBzdHJpbmcgfTtcbn1cblxuZXhwb3J0IHR5cGUgRXh0ZW5zaW9uUmVxdWVzdE1lc3NhZ2UgPVxuICB8IEJ1c2NhckNlcFJlcXVlc3RNZXNzYWdlXG4gIHwgQ29uc3VsdGFyQ2VwRGlyZXRvUmVxdWVzdE1lc3NhZ2U7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVzY2FyQ2VwUmVzcG9uc2VNZXNzYWdlIHtcbiAgcmVhZG9ubHkgc3VjZXNzbzogYm9vbGVhbjtcbiAgcmVhZG9ubHkgZGFkb3M6IEVuZGVyZWNvW107XG4gIHJlYWRvbmx5IGVycm8/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uc3VsdGFyQ2VwRGlyZXRvUmVzcG9uc2VNZXNzYWdlIHtcbiAgcmVhZG9ubHkgc3VjZXNzbzogYm9vbGVhbjtcbiAgcmVhZG9ubHkgZW5kZXJlY286IEVuZGVyZWNvIHwgbnVsbDtcbiAgcmVhZG9ubHkgZXJybz86IHN0cmluZztcbn1cblxuIiwiaW1wb3J0IHR5cGUgeyBCdXNjYXJDZXBQb3JFbmRlcmVjb1VzZUNhc2UgfSBmcm9tIFwiLi4vLi4vY29yZS9hcHBsaWNhdGlvbi91c2UtY2FzZXMvYnVzY2FyLWNlcC1wb3ItZW5kZXJlY28udXNlLWNhc2VcIjtcbmltcG9ydCB0eXBlIHsgQnVzY2FyRW5kZXJlY29Qb3JDZXBVc2VDYXNlIH0gZnJvbSBcIi4uLy4uL2NvcmUvYXBwbGljYXRpb24vdXNlLWNhc2VzL2J1c2Nhci1lbmRlcmVjby1wb3ItY2VwLnVzZS1jYXNlXCI7XG5pbXBvcnQge1xuICBUSVBPX01FTlNBR0VNX0JVU0NBUl9DRVAsXG4gIFRJUE9fTUVOU0FHRU1fQ09OU1VMVEFSX0NFUF9ESVJFVE8sXG4gIHR5cGUgRXh0ZW5zaW9uUmVxdWVzdE1lc3NhZ2UsXG4gIHR5cGUgQnVzY2FyQ2VwUmVzcG9uc2VNZXNzYWdlLFxuICB0eXBlIENvbnN1bHRhckNlcERpcmV0b1Jlc3BvbnNlTWVzc2FnZVxufSBmcm9tIFwiLi4vLi4vY29yZS9hcHBsaWNhdGlvbi9wb3J0cy9tZXNzYWdpbmcucG9ydFwiO1xuXG4vKipcbiAqIFJlZ2lzdHJhIG8gZGVzcGFjaGFkb3IgZGUgbWVuc2FnZW5zIGRlIHNlZ3VuZG8gcGxhbm8gZGEgZXh0ZW5zw6NvLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0cmFyQmFja2dyb3VuZE1lc3NhZ2VEaXNwYXRjaGVyKFxuICBidXNjYXJDZXBVc2VDYXNlOiBCdXNjYXJDZXBQb3JFbmRlcmVjb1VzZUNhc2UsXG4gIGJ1c2NhckVuZGVyZWNvUG9yQ2VwVXNlQ2FzZTogQnVzY2FyRW5kZXJlY29Qb3JDZXBVc2VDYXNlXG4pOiB2b2lkIHtcbiAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihcbiAgICAoXG4gICAgICBtZW5zYWdlbTogdW5rbm93bixcbiAgICAgIF9zZW5kZXI6IHVua25vd24sXG4gICAgICBzZW5kUmVzcG9uc2U6IChcbiAgICAgICAgcmVzcG9uc2U6IEJ1c2NhckNlcFJlc3BvbnNlTWVzc2FnZSB8IENvbnN1bHRhckNlcERpcmV0b1Jlc3BvbnNlTWVzc2FnZVxuICAgICAgKSA9PiB2b2lkXG4gICAgKSA9PiB7XG4gICAgICBjb25zdCBtc2cgPSBtZW5zYWdlbSBhcyBFeHRlbnNpb25SZXF1ZXN0TWVzc2FnZSB8IHVuZGVmaW5lZDtcblxuICAgICAgaWYgKCFtc2cgfHwgdHlwZW9mIG1zZyAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICAvLyAxLiBNZW5zYWdlbSBwYXJhIGJ1c2NhciBsaXN0YSBkZSBDRVBzIGEgcGFydGlyIGRlIGVuZGVyZcOnb1xuICAgICAgaWYgKG1zZy50eXBlID09PSBUSVBPX01FTlNBR0VNX0JVU0NBUl9DRVApIHtcbiAgICAgICAgcmV0dXJuIGJ1c2NhckNlcFVzZUNhc2VcbiAgICAgICAgICAuZXhlY3V0ZShtc2cucGF5bG9hZClcbiAgICAgICAgICAudGhlbigoZGFkb3MpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3Bvc3RhOiBCdXNjYXJDZXBSZXNwb25zZU1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgIHN1Y2Vzc286IHRydWUsXG4gICAgICAgICAgICAgIGRhZG9zXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHJlc3Bvc3RhKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAvLyBJZ25vcmEgc2UgbyBjYW5hbCBqw6EgdGl2ZXIgc2lkbyByZXNvbHZpZG8gdmlhIFByb21pc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXNwb3N0YTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZW5zYWdlbUVycm8gPVxuICAgICAgICAgICAgICBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogXCJFcnJvIGRlc2NvbmhlY2lkbyBuYSBidXNjYSBkZSBDRVBcIjtcbiAgICAgICAgICAgIGNvbnN0IHJlc3Bvc3RhOiBCdXNjYXJDZXBSZXNwb25zZU1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgIHN1Y2Vzc286IGZhbHNlLFxuICAgICAgICAgICAgICBkYWRvczogW10sXG4gICAgICAgICAgICAgIGVycm86IG1lbnNhZ2VtRXJyb1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXNwb3N0YSk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgLy8gSWdub3JhIHNlIG8gY2FuYWwgasOhIHRpdmVyIHNpZG8gcmVzb2x2aWRvIHZpYSBQcm9taXNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9zdGE7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIDIuIE1lbnNhZ2VtIHBhcmEgY29uc3VsdGFyIGVuZGVyZcOnbyBjb21wbGV0byBkaXJldGFtZW50ZSBwZWxvIENFUFxuICAgICAgaWYgKG1zZy50eXBlID09PSBUSVBPX01FTlNBR0VNX0NPTlNVTFRBUl9DRVBfRElSRVRPKSB7XG4gICAgICAgIHJldHVybiBidXNjYXJFbmRlcmVjb1BvckNlcFVzZUNhc2VcbiAgICAgICAgICAuZXhlY3V0ZShtc2cucGF5bG9hZC5jZXApXG4gICAgICAgICAgLnRoZW4oKGVuZGVyZWNvKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXNwb3N0YTogQ29uc3VsdGFyQ2VwRGlyZXRvUmVzcG9uc2VNZXNzYWdlID0ge1xuICAgICAgICAgICAgICBzdWNlc3NvOiB0cnVlLFxuICAgICAgICAgICAgICBlbmRlcmVjb1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXNwb3N0YSk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgLy8gSWdub3JhIHNlIG8gY2FuYWwgasOhIHRpdmVyIHNpZG8gcmVzb2x2aWRvIHZpYSBQcm9taXNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9zdGE7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWVuc2FnZW1FcnJvID1cbiAgICAgICAgICAgICAgZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6IFwiRXJybyBhbyBjb25zdWx0YXIgbyBDRVAgaW5mb3JtYWRvXCI7XG4gICAgICAgICAgICBjb25zdCByZXNwb3N0YTogQ29uc3VsdGFyQ2VwRGlyZXRvUmVzcG9uc2VNZXNzYWdlID0ge1xuICAgICAgICAgICAgICBzdWNlc3NvOiBmYWxzZSxcbiAgICAgICAgICAgICAgZW5kZXJlY286IG51bGwsXG4gICAgICAgICAgICAgIGVycm86IG1lbnNhZ2VtRXJyb1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXNwb3N0YSk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgLy8gSWdub3JhIHNlIG8gY2FuYWwgasOhIHRpdmVyIHNpZG8gcmVzb2x2aWRvIHZpYSBQcm9taXNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9zdGE7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICApO1xufVxuXG4iLCJpbXBvcnQgeyBkZWZpbmVCYWNrZ3JvdW5kIH0gZnJvbSBcInd4dC91dGlscy9kZWZpbmUtYmFja2dyb3VuZFwiO1xuaW1wb3J0IHsgVmlhQ2VwSHR0cFJlcG9zaXRvcnkgfSBmcm9tIFwiLi4vc3JjL2luZnJhc3RydWN0dXJlL2FwaS92aWFjZXAtaHR0cC5yZXBvc2l0b3J5XCI7XG5pbXBvcnQgeyBCdXNjYXJDZXBQb3JFbmRlcmVjb1VzZUNhc2UgfSBmcm9tIFwiLi4vc3JjL2NvcmUvYXBwbGljYXRpb24vdXNlLWNhc2VzL2J1c2Nhci1jZXAtcG9yLWVuZGVyZWNvLnVzZS1jYXNlXCI7XG5pbXBvcnQgeyBCdXNjYXJFbmRlcmVjb1BvckNlcFVzZUNhc2UgfSBmcm9tIFwiLi4vc3JjL2NvcmUvYXBwbGljYXRpb24vdXNlLWNhc2VzL2J1c2Nhci1lbmRlcmVjby1wb3ItY2VwLnVzZS1jYXNlXCI7XG5pbXBvcnQgeyByZWdpc3RyYXJCYWNrZ3JvdW5kTWVzc2FnZURpc3BhdGNoZXIgfSBmcm9tIFwiLi4vc3JjL2luZnJhc3RydWN0dXJlL21lc3NhZ2luZy9iYWNrZ3JvdW5kLW1lc3NhZ2UtZGlzcGF0Y2hlclwiO1xuXG4vKipcbiAqIFBvbnRvIGRlIGVudHJhZGEgZG8gU2VydmljZSBXb3JrZXIgZGUgc2VndW5kbyBwbGFubyBkYSBleHRlbnPDo28uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICBjb25zdCB2aWFDZXBSZXBvc2l0b3J5ID0gbmV3IFZpYUNlcEh0dHBSZXBvc2l0b3J5KCk7XG4gIGNvbnN0IGJ1c2NhckNlcFVzZUNhc2UgPSBuZXcgQnVzY2FyQ2VwUG9yRW5kZXJlY29Vc2VDYXNlKHZpYUNlcFJlcG9zaXRvcnkpO1xuICBjb25zdCBidXNjYXJFbmRlcmVjb1BvckNlcFVzZUNhc2UgPSBuZXcgQnVzY2FyRW5kZXJlY29Qb3JDZXBVc2VDYXNlKHZpYUNlcFJlcG9zaXRvcnkpO1xuXG4gIHJlZ2lzdHJhckJhY2tncm91bmRNZXNzYWdlRGlzcGF0Y2hlcihidXNjYXJDZXBVc2VDYXNlLCBidXNjYXJFbmRlcmVjb1BvckNlcFVzZUNhc2UpO1xufSk7XG4iLCIvLyNyZWdpb24gc3JjL2luZGV4LnRzXG4vKipcbiogQ2xhc3MgZm9yIHBhcnNpbmcgYW5kIHBlcmZvcm1pbmcgb3BlcmF0aW9ucyBvbiBtYXRjaCBwYXR0ZXJucy5cbipcbiogQGV4YW1wbGVcbiogICBjb25zdCBwYXR0ZXJuID0gbmV3IE1hdGNoUGF0dGVybignKjovL2dvb2dsZS5jb20vKicpO1xuKlxuKiAgIHBhdHRlcm4uaW5jbHVkZXMoJ2h0dHBzOi8vZ29vZ2xlLmNvbScpOyAvLyB0cnVlXG4qICAgcGF0dGVybi5pbmNsdWRlcygnaHR0cDovL3lvdXR1YmUuY29tL3dhdGNoP3Y9MTIzJyk7IC8vIGZhbHNlXG4qL1xudmFyIE1hdGNoUGF0dGVybiA9IGNsYXNzIE1hdGNoUGF0dGVybiB7XG5cdHN0YXRpYyB7XG5cdFx0dGhpcy5QUk9UT0NPTFMgPSBbXG5cdFx0XHRcImh0dHBcIixcblx0XHRcdFwiaHR0cHNcIixcblx0XHRcdFwiZmlsZVwiLFxuXHRcdFx0XCJmdHBcIixcblx0XHRcdFwidXJuXCIsXG5cdFx0XHRcIndzXCIsXG5cdFx0XHRcIndzc1wiXG5cdFx0XTtcblx0fVxuXHQvKipcblx0KiBQYXJzZSBhIG1hdGNoIHBhdHRlcm4gc3RyaW5nLiBJZiBpdCBpcyBpbnZhbGlkLCB0aGUgY29uc3RydWN0b3Igd2lsbCB0aHJvdyBhblxuXHQqIGBJbnZhbGlkTWF0Y2hQYXR0ZXJuYCBlcnJvci5cblx0KlxuXHQqIEBwYXJhbSBtYXRjaFBhdHRlcm4gVGhlIG1hdGNoIHBhdHRlcm4gdG8gcGFyc2UuXG5cdCovXG5cdGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuXHRcdGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG5cdFx0XHR0aGlzLmlzQWxsVXJscyA9IHRydWU7XG5cdFx0XHR0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcblx0XHRcdHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuXHRcdFx0dGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuXHRcdFx0aWYgKGdyb3VwcyA9PSBudWxsKSB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcblx0XHRcdGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3Vwcztcblx0XHRcdHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG5cdFx0XHR2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuXHRcdFx0dGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuXHRcdFx0dGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG5cdFx0XHR0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcblx0XHR9XG5cdH1cblx0LyoqIENoZWNrIGlmIGEgVVJMIGlzIGluY2x1ZGVkIGluIGEgcGF0dGVybi4gKi9cblx0aW5jbHVkZXModXJsKSB7XG5cdFx0Y29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuXHRcdGlmICh0aGlzLmlzQWxsVXJscykgcmV0dXJuICF0aGlzLmlzVW5rbm93blByb3RvY29sKHUpO1xuXHRcdHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG5cdFx0XHRpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKSByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcblx0XHRcdGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKSByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG5cdFx0XHRpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKSByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcblx0XHRcdGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIikgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcblx0XHRcdGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIikgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcblx0XHR9KTtcblx0fVxuXHRpc0h0dHBNYXRjaCh1cmwpIHtcblx0XHRyZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcblx0fVxuXHRpc0h0dHBzTWF0Y2godXJsKSB7XG5cdFx0cmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuXHR9XG5cdGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcblx0XHRpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKSByZXR1cm4gZmFsc2U7XG5cdFx0Y29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFt0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLCB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKV07XG5cdFx0Y29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcblx0XHRyZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG5cdH1cblx0aXNVbmtub3duUHJvdG9jb2wodXJsKSB7XG5cdFx0cmV0dXJuICF0aGlzLnByb3RvY29sTWF0Y2hlcy5pbmNsdWRlcyh1cmwucHJvdG9jb2wuc2xpY2UoMCwgLTEpKTtcblx0fVxuXHRpc1BhdGhNYXRjaCh1cmwpIHtcblx0XHRpZiAoIXRoaXMucGF0aG5hbWVNYXRjaCkgcmV0dXJuIGZhbHNlO1xuXHRcdHJldHVybiB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpLnRlc3QodXJsLnBhdGhuYW1lKTtcblx0fVxuXHRpc0ZpbGVNYXRjaCh1cmwpIHtcblx0XHRyZXR1cm4gdXJsLnByb3RvY29sID09PSBcImZpbGU6XCIgJiYgdGhpcy5pc1BhdGhNYXRjaCh1cmwpO1xuXHR9XG5cdGlzRnRwTWF0Y2goX3VybCkge1xuXHRcdHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuXHR9XG5cdGlzVXJuTWF0Y2goX3VybCkge1xuXHRcdHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuXHR9XG5cdGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG5cdFx0Y29uc3Qgc3RhcnNSZXBsYWNlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybikucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuXHRcdHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuXHR9XG5cdGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuXHR9XG59O1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcblx0Y29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcblx0XHRzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuXHR9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG5cdGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKSB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYCk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcblx0aWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSkgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG5cdGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKSB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYCk7XG59XG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IEludmFsaWRNYXRjaFBhdHRlcm4sIE1hdGNoUGF0dGVybiB9O1xuIl0sImlnbm9yZUxpc3QiOlswLDYsNywxMV0sIm1hcHBpbmdzIjoiOztDQUNBLFNBQVMsaUJBQWlCLEtBQUs7RUFDOUIsSUFBSSxPQUFPLFFBQVEsT0FBTyxRQUFRLFlBQVksT0FBTyxFQUFFLE1BQU0sSUFBSTtFQUNqRSxPQUFPO0NBQ1I7Ozs7O0NDRUEsSUFBYSx1QkFBYixNQUE0RDtFQUMxRCxNQUFNLGtCQUNKLElBQ0EsUUFDQSxZQUNxQjtHQUNyQixJQUFJO0lBQ0YsTUFBTSxNQUFNLDRCQUE0QixtQkFBbUIsRUFBRSxFQUFFLEdBQUcsbUJBQW1CLE1BQU0sRUFBRSxH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