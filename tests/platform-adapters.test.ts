import { describe, it, expect } from "bun:test";
import { PlatformManagerService } from "../src/infrastructure/platforms/platform-manager.service";
import { SpeedGovPlatformAdapter } from "../src/infrastructure/platforms/speedgov/speedgov.adapter";
import { GenericWebPlatformAdapter } from "../src/infrastructure/platforms/generic/generic.adapter";
import { SpeedGovDetector } from "../src/infrastructure/platforms/speedgov/speedgov-detector";
import { SpeedGovScanner } from "../src/infrastructure/platforms/speedgov/speedgov-scanner";
import { GenericScanner } from "../src/infrastructure/platforms/generic/generic-scanner";

/**
 * Mock simples e tipado de nó DOM para testes unitários em ambiente Bun.
 */
class MockElement {
  id: string = "";
  name: string = "";
  value: string = "";
  tagName: string = "DIV";
  className: string = "";
  textContent: string = "";
  attributes: Record<string, string> = {};
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  ownerDocument: any = null;

  constructor(tag: string = "DIV", attrs: Record<string, string> = {}) {
    this.tagName = tag.toUpperCase();
    this.attributes = { ...attrs };
    if (attrs.id) this.id = attrs.id;
    if (attrs.name) this.name = attrs.name;
    if (attrs.value) this.value = attrs.value;
    if (attrs.class) this.className = attrs.class;
    if (attrs.textContent) this.textContent = attrs.textContent;
  }

  appendChild(child: MockElement) {
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
    if (name === "value") this.value = val;
  }

  closest(selector: string): MockElement | null {
    let curr: MockElement | null = this;
    while (curr) {
      if (curr.matchesSelector(selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  querySelector<T = MockElement>(selector: string): T | null {
    const list = this.querySelectorAll<T>(selector);
    return list[0] ?? null;
  }

  querySelectorAll<T = MockElement>(selector: string): T[] {
    const parts = selector.split(",").map((s) => s.trim());
    const matches: MockElement[] = [];

    const traverse = (node: MockElement) => {
      for (const part of parts) {
        if (node.matchesSelector(part)) {
          matches.push(node);
          break;
        }
      }
      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const child of this.children) {
      traverse(child);
    }

    return matches as unknown as T[];
  }

  private matchesSelector(sel: string): boolean {
    const tagMatch = sel.match(/^[a-z0-9]+/i);
    if (tagMatch) {
      const requiredTag = tagMatch[0].toUpperCase();
      if (this.tagName !== requiredTag) return false;
    }

    // Verifica seletores de atributos: [attr], [attr="val"], [attr*="val" i]
    const attrMatch = sel.match(/\[([a-zA-Z0-9_\-]+)([*=]?=)?"?([^"\]]*)"?\s*i?\]/i);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const op = attrMatch[2];
      const attrVal = attrMatch[3];

      if (attrName && !(attrName in this.attributes)) {
        // Se for name ou id, eles também estão nas propriedades name e id
        if (attrName === "name" && this.name) {
          // Permite checagem via this.name
        } else if (attrName === "id" && this.id) {
          // Permite checagem via this.id
        } else {
          return false;
        }
      }

      if (op === "=" && attrVal) {
        const valAtual = this.attributes[attrName ?? ""] ?? (attrName === "name" ? this.name : attrName === "id" ? this.id : "");
        if (valAtual !== attrVal) return false;
      } else if (op === "*=" && attrVal) {
        const valAtual = this.attributes[attrName ?? ""] ?? (attrName === "name" ? this.name : attrName === "id" ? this.id : "");
        if (!valAtual.toLowerCase().includes(attrVal.toLowerCase())) return false;
      }
    }

    // Se o seletor exigia um ID com # e o elemento não tem ID correspondente
    if (sel.includes("#")) {
      const idMatch = sel.match(/#([a-zA-Z0-9_\-]+)/);
      if (idMatch && this.id !== idMatch[1]) return false;
    }

    // Se o seletor exigia uma classe com . e o elemento não possui
    if (sel.includes(".")) {
      const classMatch = sel.match(/\.([a-zA-Z0-9_\-]+)/);
      const classe = classMatch?.[1];
      if (classe && !this.className.includes(classe)) return false;
    }

    return true;
  }
}

describe("Arquitetura Multi-Plataforma - Detector e Adaptadores", () => {
  it("SpeedGovDetector deve identificar página GeneXus com atributos característicos", () => {
    const detector = new SpeedGovDetector();
    const doc = new MockElement("HTML") as unknown as Document;
    const body = new MockElement("BODY");
    const tabelaGx = new MockElement("TABLE", { "data-gx-context": "true", class: "gx-tab-spacing-fix-0" });
    body.appendChild(tabelaGx);
    (doc as unknown as MockElement).appendChild(body);

    expect(detector.detectar(doc)).toBe(true);
  });

  it("SpeedGovDetector deve rejeitar página web convencional sem GeneXus", () => {
    const detector = new SpeedGovDetector();
    const doc = new MockElement("HTML") as unknown as Document;
    const body = new MockElement("BODY");
    const formNormal = new MockElement("FORM", { id: "checkout-form" });
    formNormal.appendChild(new MockElement("INPUT", { name: "cep", id: "cep" }));
    body.appendChild(formNormal);
    (doc as unknown as MockElement).appendChild(body);

    expect(detector.detectar(doc)).toBe(false);
  });

  it("PlatformManagerService deve selecionar SpeedGov quando detectado e Generic como fallback", () => {
    const speedGovAdapter = new SpeedGovPlatformAdapter();
    const genericAdapter = new GenericWebPlatformAdapter();
    const manager = new PlatformManagerService([speedGovAdapter], genericAdapter);

    // 1. Cenário SpeedGov
    const docSpeedGov = new MockElement("HTML") as unknown as Document;
    const bodySpeedGov = new MockElement("BODY");
    bodySpeedGov.appendChild(new MockElement("INPUT", { id: "vADQPRPCEPLGR", name: "vADQPRPCEPLGR" }));
    (docSpeedGov as unknown as MockElement).appendChild(bodySpeedGov);

    const adapterDetectado = manager.obterAdapter(docSpeedGov);
    expect(adapterDetectado.id).toBe("speedgov");
    expect(adapterDetectado.nome).toBe("SpeedGov / GeneXus");

    // 2. Cenário Web Geral
    const docWeb = new MockElement("HTML") as unknown as Document;
    const bodyWeb = new MockElement("BODY");
    bodyWeb.appendChild(new MockElement("INPUT", { id: "cep", name: "cep" }));
    (docWeb as unknown as MockElement).appendChild(bodyWeb);

    const adapterFallback = manager.obterAdapter(docWeb);
    expect(adapterFallback.id).toBe("generic");
    expect(adapterFallback.nome).toBe("Web Convencional");
  });

  it("SpeedGovScanner deve extrair com precisão os dados do formulário TABLE5 (vADQPRP*)", () => {
    const scanner = new SpeedGovScanner();
    const doc = new MockElement("HTML");
    const table5 = new MockElement("TABLE", { id: "TABLE5" });

    table5.appendChild(new MockElement("INPUT", { id: "vADQPRPLGRTIP", name: "vADQPRPLGRTIP", value: "AV" }));
    table5.appendChild(new MockElement("INPUT", { id: "vADQPRPNOMLGR", name: "vADQPRPNOMLGR", value: "MONSENHOR TABOSA" }));
    table5.appendChild(new MockElement("INPUT", { id: "vADQPRPNUMLGR", name: "vADQPRPNUMLGR", value: "2190" }));
    table5.appendChild(new MockElement("INPUT", { id: "vADQPRPLGRBAI", name: "vADQPRPLGRBAI", value: "COQUEIRO" }));
    table5.appendChild(new MockElement("INPUT", { id: "vADQPRPCIDLGR", name: "vADQPRPCIDLGR", value: "ITAPIPOCA" }));
    table5.appendChild(new MockElement("INPUT", { id: "vADQPRPLGRUF", name: "vADQPRPLGRUF", value: "CE" }));
    table5.appendChild(new MockElement("INPUT", { id: "vADQPRPCEPLGR", name: "vADQPRPCEPLGR", value: "62508018" }));

    doc.appendChild(table5);

    const dados = scanner.extrairDadosEndereco(doc as unknown as ParentNode);
    expect(dados.logradouro).toBe("MONSENHOR TABOSA");
    expect(dados.numero).toBe("2190");
    expect(dados.bairro).toBe("COQUEIRO");
    expect(dados.cidade).toBe("ITAPIPOCA");
    expect(dados.uf).toBe("CE");
    expect(dados.campoCep).not.toBeNull();
  });

  it("SpeedGovScanner deve extrair com precisão os dados da TABLE15 e ler spans quando presentes", () => {
    const scanner = new SpeedGovScanner();
    const doc = new MockElement("HTML");
    const table15 = new MockElement("TABLE", { id: "TABLE15" });

    // Inputs com valor ou spans associados
    table15.appendChild(new MockElement("INPUT", { id: "LGRNOM", name: "LGRNOM", value: "JOSE AIRTON TEIXEIRA" }));
    table15.appendChild(new MockElement("INPUT", { id: "BCILGRNUM", name: "BCILGRNUM", value: "222" }));
    table15.appendChild(new MockElement("INPUT", { id: "BAINOM", name: "BAINOM", value: "COQUEIRO" }));
    table15.appendChild(new MockElement("INPUT", { id: "BCILGRCEP", name: "BCILGRCEP", value: "" }));

    doc.appendChild(table15);

    const dados = scanner.extrairDadosEndereco(doc as unknown as ParentNode);
    expect(dados.logradouro).toBe("JOSE AIRTON TEIXEIRA");
    expect(dados.numero).toBe("222");
    expect(dados.bairro).toBe("COQUEIRO");
    expect(dados.campoCep).not.toBeNull();
  });

  it("GenericScanner deve extrair dados de formulário web comum (e-commerce)", () => {
    const scanner = new GenericScanner();
    const doc = new MockElement("HTML");
    const form = new MockElement("FORM", { id: "form-entrega" });

    form.appendChild(new MockElement("INPUT", { name: "cep", id: "cep", value: "01310-100" }));
    form.appendChild(new MockElement("INPUT", { name: "rua", id: "rua", value: "Avenida Paulista" }));
    form.appendChild(new MockElement("INPUT", { name: "numero", id: "numero", value: "1000" }));
    form.appendChild(new MockElement("INPUT", { name: "bairro", id: "bairro", value: "Bela Vista" }));
    form.appendChild(new MockElement("INPUT", { name: "cidade", id: "cidade", value: "São Paulo" }));
    form.appendChild(new MockElement("INPUT", { name: "uf", id: "uf", value: "SP" }));

    doc.appendChild(form);

    const dados = scanner.extrairDadosEndereco(doc as unknown as ParentNode);
    expect(dados.logradouro).toBe("Avenida Paulista");
    expect(dados.numero).toBe("1000");
    expect(dados.bairro).toBe("Bela Vista");
    expect(dados.cidade).toBe("São Paulo");
    expect(dados.uf).toBe("SP");
    expect(dados.campoCep).not.toBeNull();
  });
});
