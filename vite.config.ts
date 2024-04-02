import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import monacoEditorPluginModule from 'vite-plugin-monaco-editor';

const isObjectWithDefaultFunction = (module: unknown): module is { default: typeof monacoEditorPluginModule } => (
  module != null &&
  typeof module === 'object' &&
  'default' in module &&
  typeof module.default === 'function'
)

const monacoEditorPlugin = isObjectWithDefaultFunction(monacoEditorPluginModule)
  ? monacoEditorPluginModule.default
  : monacoEditorPluginModule

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), monacoEditorPlugin({ languageWorkers: ['typescript'] })],
  server: {
    host: "0.0.0.0",
    port: 1001,
    proxy: {
      '/api': {
        target: "http://127.0.0.1:8080"
      },
      '/ws': {
        target: 'ws://127.0.0.1:8080',
        ws: true,
      },
    }
  }
})