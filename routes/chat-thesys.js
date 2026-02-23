const express = require("express");

const router = express.Router();

const THESYS_API_KEY = process.env.THESYS_API_KEY;
const THESYS_BASE_URL =
  process.env.THESYS_BASE_URL || "https://api.thesys.dev/v1/embed";
// Usando modelo verificado (Claude Sonnet 4) -ignora .env se for o antigo 'c1-chat'
const THESYS_MODEL = (process.env.THESYS_MODEL && process.env.THESYS_MODEL !== "c1-chat")
  ? process.env.THESYS_MODEL
  : "c1/anthropic/claude-sonnet-4/v-20250617";

if (!THESYS_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️ Variável de ambiente THESYS_API_KEY não definida. A rota de chat com Thesys não funcionará até que a chave seja configurada."
  );
} else {
  // eslint-disable-next-line no-console
  console.log(`🔌 Rota de chat inicializada com o modelo: ${THESYS_MODEL}`);
}

router.post("/", async (req, res) => {
  if (!THESYS_API_KEY) {
    return res.status(500).json({
      error:
        "THESYS_API_KEY não configurada no servidor. Configure a chave de API do Thesys para habilitar o chat.",
    });
  }

  const { prompt, history = [] } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Campo 'prompt' é obrigatório e deve ser uma string.",
    });
  }

  const systemMessage = {
    role: "system",
    content:
      "Você é um assistente de análise eleitoral especializado na base de dados deste sistema." +
      " A base contém tabelas de votos, candidatos, municípios, eleições e dados demográficos agregados." +
      " Ajude o usuário a explorar padrões eleitorais, comparar eleições, analisar desempenho de candidatos" +
      " e sugerir visualizações como tabelas, gráficos e mapas." +
      " Formate sempre a resposta usando recursos de Generative UI do C1, como tabelas, cartões e gráficos adequados ao contexto.",
  };

  const conversationMessages = [
    systemMessage,
    ...history
      .filter(
        (m) =>
          m &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const apiResponse = await fetch(`${THESYS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${THESYS_API_KEY}`,
      },
      body: JSON.stringify({
        model: THESYS_MODEL,
        messages: conversationMessages,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = { message: errorText };
      }

      // eslint-disable-next-line no-console
      console.error("❌ Erro ao chamar Thesys C1:", {
        status: apiResponse.status,
        url: apiResponse.url,
        error: errorJson
      });

      return res.status(502).json({
        error: "Falha ao comunicar com o serviço Thesys C1.",
        details: errorJson,
        status: apiResponse.status,
      });
    }

    const data = await apiResponse.json();
    const c1Response =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.message?.c1_response ||
      "";

    if (!c1Response) {
      // eslint-disable-next-line no-console
      console.warn("Resposta do Thesys C1 sem conteúdo utilizável:", data);
    }

    return res.json({
      c1Response,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Erro inesperado na rota de chat Thesys:", error);
    return res.status(500).json({
      error: "Erro interno ao processar a requisição de chat.",
    });
  }
});

module.exports = router;

