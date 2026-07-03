import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// Build riêng phần thư viện (src/lib) — độc lập với app demo.
// Chạy: pnpm build:lib
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.lib.json",
      include: ["src/lib"],
      // Xuất .d.ts theo cây thư mục lib (index.d.ts + extension.d.ts).
      outDirs: "dist",
    }),
  ],
  // Không copy thư mục public/ (favicon, icons…) vào dist khi build lib.
  publicDir: false,
  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
    minify: true, // esbuild — output lib nhẹ nhất; đọc code thì lên GitHub.
    lib: {
      // Một entry duy nhất: index.ts export cả extension three lẫn gltf-transform.
      entry: resolve(import.meta.dirname, "src/lib/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      // Peer dep do người dùng cung cấp, không bundle vào lib:
      //   three (+ three/examples/...) và @gltf-transform/*.
      external: [/^three($|\/)/, /^@gltf-transform\//],
    },
  },
});
