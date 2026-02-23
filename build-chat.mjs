import { build } from "esbuild";

async function run() {
  try {
    await build({
      entryPoints: ["src/chat-inteligencia/main.jsx"],
      bundle: true,
      outfile: "public/chat-inteligencia.bundle.js",
      platform: "browser",
      format: "esm",
      sourcemap: true,
      jsx: "automatic",
      target: ["es2017"],
      loader: {
        ".woff": "dataurl",
        ".woff2": "dataurl",
        ".ttf": "dataurl",
      },
    });
    // eslint-disable-next-line no-console
    console.log("✅ Bundle de chat gerado em public/chat-inteligencia.bundle.js");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ Erro ao gerar bundle de chat:", error);
    process.exit(1);
  }
}

run();

