const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Carregar mapeamento de fotos
let mapeamentoFotos = [];
try {
  const mapeamentoFile = path.join(__dirname, '..', 'mapeamento-fotos-candidatos.json');
  if (fs.existsSync(mapeamentoFile)) {
    mapeamentoFotos = JSON.parse(fs.readFileSync(mapeamentoFile, 'utf8'));
    console.log(`📸 Mapeamento de fotos carregado: ${mapeamentoFotos.length} candidatos`);
  }
} catch (error) {
  console.error('❌ Erro ao carregar mapeamento de fotos:', error.message);
}

// Rota para buscar foto de um candidato
router.get('/:candidato_id', (req, res) => {
  try {
    const candidatoId = parseInt(req.params.candidato_id);
    
    const foto = mapeamentoFotos.find(f => f.candidato_id === candidatoId);
    
    if (foto) {
      res.json({
        success: true,
        candidato_id: candidatoId,
        nome: foto.nome,
        foto_url: foto.foto_url,
        foto_arquivo: foto.foto_arquivo
      });
    } else {
      res.json({
        success: false,
        message: 'Foto não encontrada para este candidato',
        candidato_id: candidatoId
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar foto do candidato:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Rota para listar todas as fotos (para debug)
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      total: mapeamentoFotos.length,
      fotos: mapeamentoFotos.slice(0, 10) // Primeiras 10 para não sobrecarregar
    });
  } catch (error) {
    console.error('❌ Erro ao listar fotos:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
