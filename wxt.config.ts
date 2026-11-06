import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "ID.Busca CEP",
    description: "Extensão para detecção e preenchimento automático de CEP por endereço.",
    version: "1.0.0",
    host_permissions: [
      "https://viacep.com.br/*"
    ],
    permissions: [
      "activeTab"
    ],
    icons: {
      16: "icon.png",
      32: "icon.png",
      48: "icon.png",
      128: "icon.png"
    },
    action: {
      default_title: "ID.Busca CEP",
      default_popup: "popup.html",
      default_icon: "icon.png"
    }
  }
});
