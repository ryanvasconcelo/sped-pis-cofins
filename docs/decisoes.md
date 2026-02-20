# 📝 Registro de Decisões — Automação SPED PIS/COFINS

## Formato

Cada decisão segue o formato:

- **Data**: quando foi decidido
- **Decisão**: o que foi decidido
- **Contexto**: por que precisamos decidir
- **Alternativas**: o que mais foi considerado
- **Impacto**: consequências da decisão

---

## D001 — Escopo do MVP limitado à edição manual de CSTs

- **Data:** 2026-02-19
- **Decisão:** O MVP **não** incluirá sugestão automática de CSTs. O usuário altera manualmente.
- **Contexto:** O stakeholder descreveu que atualmente consulta o e-Auditoria manualmente para decidir qual CST usar. Automatizar essa consulta adicionaria complexidade significativa ao MVP.
- **Alternativas:** (a) Integrar e-Auditoria desde o início (b) Criar base de regras interna
- **Impacto:** MVP mais simples e rápido de entregar. A inteligência será adicionada na Fase 2.

---

## D002 — Suporte a C170 e C191/C195

- **Data:** 2026-02-19
- **Decisão:** O sistema suportará **ambos os formatos** de escrituração: C170 (por nota fiscal) e C191+C195 (consolidado por produto/dia).
- **Contexto:** O stakeholder explicou que o arquivo pode vir em qualquer um dos dois formatos, dependendo do software do cliente. Nunca vêm ambos.
- **Alternativas:** Suportar apenas C170 no MVP
- **Impacto:** Maior cobertura de clientes desde o início. Lógica condicional no parser.

---

## D003 — Campos tratados como string, nunca como número

- **Data:** 2026-02-19
- **Decisão:** Todos os campos do SPED (incluindo NCM, CST, códigos) serão tratados como **strings**.
- **Contexto:** O stakeholder relatou que zeros à esquerda são perdidos quando o NCM é tratado como número no Excel. Isso causa erros no PVA.
- **Alternativas:** Converter para número e re-formatar na saída
- **Impacto:** Eliminação de bugs de formatação. Processamento como manipulação de texto.

---

## D004 — Output mantém estrutura completa do SPED original

- **Data:** 2026-02-19  
- **Decisão:** O TXT de saída preserva **100% da estrutura** do arquivo original. Apenas os campos CST (e valores recalculados) são alterados.
- **Contexto:** O PVA valida a estrutura completa do arquivo. Qualquer alteração fora do esperado causa rejeição.
- **Alternativas:** Gerar apenas os registros alterados
- **Impacto:** Garantia de compatibilidade com o PVA. Complexidade no export (preservar linhas intocadas).

---

*Novas decisões devem ser adicionadas aqui no formato acima.*
