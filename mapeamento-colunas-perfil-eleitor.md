# Mapeamento de Colunas - Perfil do Eleitor

## Colunas do CSV (perfil_eleitor_secao_2018_SC.csv)

1. DT_GERACAO
2. HH_GERACAO
3. ANO_ELEICAO
4. SG_UF
5. CD_MUNICIPIO
6. NM_MUNICIPIO
7. NR_ZONA
8. NR_SECAO
9. NR_LOCAL_VOTACAO
10. NM_LOCAL_VOTACAO
11. CD_GENERO
12. DS_GENERO
13. CD_ESTADO_CIVIL
14. DS_ESTADO_CIVIL
15. CD_FAIXA_ETARIA
16. DS_FAIXA_ETARIA
17. CD_GRAU_ESCOLARIDADE
18. DS_GRAU_ESCOLARIDADE
19. CD_RACA_COR
20. DS_RACA_COR
21. CD_IDENTIDADE_GENERO
22. DS_IDENTIDADE_GENERO
23. CD_QUILOMBOLA
24. DS_QUILOMBOLA
25. CD_INTERPRETE_LIBRAS
26. DS_INTERPRETE_LIBRAS
27. TP_OBRIGATORIEDADE_VOTO
28. QT_ELEITORES_PERFIL
29. QT_ELEITORES_BIOMETRIA
30. QT_ELEITORES_DEFICIENCIA
31. QT_ELEITORES_INC_NM_SOCIAL

**Total: 31 colunas no CSV**

## Colunas da Tabela (perfil_eleitor_secao)

1. id (integer) - AUTO INCREMENT
2. dt_geracao (date)
3. hh_geracao (time without time zone)
4. ano_eleicao (integer)
5. sg_uf (character varying)
6. cd_municipio (integer)
7. nm_municipio (character varying)
8. nr_zona (integer)
9. nr_secao (integer)
10. nr_local_votacao (integer)
11. nm_local_votacao (character varying)
12. cd_genero (integer)
13. ds_genero (character varying)
14. cd_estado_civil (integer)
15. ds_estado_civil (character varying)
16. cd_faixa_etaria (integer)
17. ds_faixa_etaria (character varying)
18. cd_grau_escolaridade (integer)
19. ds_grau_escolaridade (character varying)
20. cd_raca_cor (integer)
21. ds_raca_cor (character varying)
22. cd_identidade_genero (integer)
23. ds_identidade_genero (character varying)
24. cd_quilombola (integer)
25. ds_quilombola (character varying)
26. cd_interprete_libras (integer)
27. ds_interprete_libras (character varying)
28. tp_obrigatoriedade_voto (character varying)
29. qt_eleitores_perfil (integer)
30. qt_eleitores_biometria (integer)
31. qt_eleitores_deficiencia (integer)
32. qt_eleitores_inc_nm_social (integer)
33. created_at (timestamp without time zone) - AUTO TIMESTAMP
34. municipio_id (integer) - FOREIGN KEY
35. eleicao_id (integer) - FOREIGN KEY

**Total: 35 colunas na tabela (incluindo id, created_at, municipio_id, eleicao_id)**

## Mapeamento Direto

| CSV Column | Database Column | Type | Notes |
|------------|-----------------|------|-------|
| DT_GERACAO | dt_geracao | date | Converter DD/MM/YYYY para YYYY-MM-DD |
| HH_GERACAO | hh_geracao | time | Manter formato HH:MM:SS |
| ANO_ELEICAO | ano_eleicao | integer | Converter string para integer |
| SG_UF | sg_uf | varchar | Manter como string |
| CD_MUNICIPIO | cd_municipio | integer | Converter string para integer |
| NM_MUNICIPIO | nm_municipio | varchar | Manter como string |
| NR_ZONA | nr_zona | integer | Converter string para integer |
| NR_SECAO | nr_secao | integer | Converter string para integer |
| NR_LOCAL_VOTACAO | nr_local_votacao | integer | Converter string para integer |
| NM_LOCAL_VOTACAO | nm_local_votacao | varchar | Manter como string |
| CD_GENERO | cd_genero | integer | Converter string para integer |
| DS_GENERO | ds_genero | varchar | Manter como string |
| CD_ESTADO_CIVIL | cd_estado_civil | integer | Converter string para integer |
| DS_ESTADO_CIVIL | ds_estado_civil | varchar | Manter como string |
| CD_FAIXA_ETARIA | cd_faixa_etaria | integer | Converter string para integer |
| DS_FAIXA_ETARIA | ds_faixa_etaria | varchar | Manter como string |
| CD_GRAU_ESCOLARIDADE | cd_grau_escolaridade | integer | Converter string para integer |
| DS_GRAU_ESCOLARIDADE | ds_grau_escolaridade | varchar | Manter como string |
| CD_RACA_COR | cd_raca_cor | integer | Converter string para integer |
| DS_RACA_COR | ds_raca_cor | varchar | Manter como string |
| CD_IDENTIDADE_GENERO | cd_identidade_genero | integer | Converter string para integer |
| DS_IDENTIDADE_GENERO | ds_identidade_genero | varchar | Manter como string |
| CD_QUILOMBOLA | cd_quilombola | integer | Converter string para integer |
| DS_QUILOMBOLA | ds_quilombola | varchar | Manter como string |
| CD_INTERPRETE_LIBRAS | cd_interprete_libras | integer | Converter string para integer |
| DS_INTERPRETE_LIBRAS | ds_interprete_libras | varchar | Manter como string |
| TP_OBRIGATORIEDADE_VOTO | tp_obrigatoriedade_voto | varchar | Manter como string |
| QT_ELEITORES_PERFIL | qt_eleitores_perfil | integer | Converter string para integer |
| QT_ELEITORES_BIOMETRIA | qt_eleitores_biometria | integer | Converter string para integer |
| QT_ELEITORES_DEFICIENCIA | qt_eleitores_deficiencia | integer | Converter string para integer |
| QT_ELEITORES_INC_NM_SOCIAL | qt_eleitores_inc_nm_social | integer | Converter string para integer |

## Colunas Adicionais na Tabela

| Database Column | Type | Source | Notes |
|-----------------|------|--------|-------|
| id | integer | AUTO INCREMENT | Chave primária |
| created_at | timestamp | AUTO TIMESTAMP | Data/hora de criação |
| municipio_id | integer | FOREIGN KEY | ID do município (buscar na tabela municipios) |
| eleicao_id | integer | FOREIGN KEY | ID da eleição (buscar na tabela eleicoes) |

## Problema Identificado

**O erro "INSERT tem mais colunas alvo do que expressões" ocorre porque:**

1. **CSV tem 31 colunas**
2. **Tabela tem 35 colunas** (incluindo id, created_at, municipio_id, eleicao_id)
3. **INSERT está tentando inserir em 32 colunas** (excluindo id e created_at)
4. **Mas está fornecendo apenas 31 valores** (do CSV)

## Solução

Para o INSERT funcionar, precisamos fornecer valores para **32 colunas**:
- 31 colunas do CSV (convertidas)
- 1 coluna municipio_id (calculada)
- 1 coluna eleicao_id (calculada)

**Excluir do INSERT:**
- id (AUTO INCREMENT)
- created_at (AUTO TIMESTAMP)
