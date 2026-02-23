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

const db = require("../config/database");

router.post("/", async (req, res) => {
  if (!THESYS_API_KEY) {
    return res.status(500).json({
      error: "THESYS_API_KEY não configurada.",
    });
  }

  const { prompt, history = [] } = req.body || {};

  // Nova estratégia: A IA recebe o esquema e retorna a SQL.
  // Neste primeiro passo, vamos dar à IA informações precisas sobre a estrutura.
  const systemMessage = {
    role: "system",
    content: `Você é um analista de dados especialista em SQL para o sistema de dados do TSE de Santa Catarina (SC).
Sua tarefa é responder perguntas do usuário SEMPRE consultando a base de dados via queries precisas.

### ESTRUTURA DO BANCO (PostgreSQL):
- eleicoes (id, ano, tipo, descricao, turno)
- candidatos (id, numero, nome, cargo, partido, eleicao_id)
- municipios (id, codigo, nome, sigla_uf)
- votos (id, eleicao_id, municipio_id, candidato_id, zona, secao, quantidade_votos)
- perfil_eleitor_secao (cd_municipio, ano_eleicao, ds_genero, ds_faixa_etaria, ds_grau_escolaridade, qt_eleitores_perfil)

### REGRAS DE OURO:
1. MARCOS LUIZ VIEIRA em 2022 é do PSDB (id_candidato você deve buscar).
2. Use INNER JOINs para ligar votos a candidatos e municípios.
3. Se o usuário perguntar por "Marcos Vieira", busque por 'MARCOS LUIZ VIEIRA' (ILIKE).
4. O estado é APENAS Santa Catarina (SC).
5. Se não tiver certeza, primeiro faça uma query para listar candidatos/eleições disponíveis.

IMPORTANTE: Seus dados externos estão desatualizados. A ÚNICA verdade está no banco de dados local.`,
  };

  try {
    // 1. Enviar para a IA para obter a intenção e possivelmente a necessidade de dados
    const initialMessages = [systemMessage, ...history.map(m => ({ role: m.role, content: m.content })), { role: "user", content: prompt }];

    // Para simplificar e garantir precisão total, vamos interceptar perguntas comuns e rodar SQL
    // Mas para manter a flexibilidade da GenUI, usamos o GenUI SDK do Thesys
    // Vamos adicionar os resultados de queries reais ao contexto antes de enviar para a IA final

    let contextData = "";

    // Busca básica de contexto para o Marcos Vieira se mencionado (exemplo de otimização)
    if (prompt.toLowerCase().includes("marcos vieira") || prompt.toLowerCase().includes("marcos luiz vieira")) {
      const candData = await db.query("SELECT * FROM candidatos WHERE nome ILIKE '%MARCOS LUIZ VIEIRA%' AND partido = 'PSDB' LIMIT 1");
      if (candData.rows.length > 0) {
        const c = candData.rows[0];
        const votos = await db.query("SELECT SUM(quantidade_votos) as total FROM votos WHERE candidato_id = $1", [c.id]);
        const cityVotos = await db.query(`
          SELECT m.nome, SUM(v.quantidade_votos) as votos 
          FROM votos v JOIN municipios m ON v.municipio_id = m.id 
          WHERE v.candidato_id = $1 
          GROUP BY m.nome ORDER BY votos DESC LIMIT 5`, [c.id]);

        contextData = `\n[DADOS REAIS DO BANCO]: Candidato ${c.nome} (Número ${c.numero}, Partido ${c.partido}). Votos Totais em 2022: ${votos.rows[0].total}. Top Municípios: ${cityVotos.rows.map(r => `${r.nome}: ${r.votos}`).join(", ")}.`;
      }
    }

    const conversationMessages = [
      systemMessage,
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt + (contextData ? "\n\nUse estes dados reais para responder: " + contextData : "") }
    ];

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
      return res.status(502).json({ error: "Erro no serviço de IA", details: errorText });
    }

    const data = await apiResponse.json();
    const c1Response = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.c1_response || "";

    return res.json({ c1Response });
  } catch (error) {
    console.error("Erro no chat:", error);
    return res.status(500).json({ error: "Erro interno." });
  }
});

module.exports = router;

