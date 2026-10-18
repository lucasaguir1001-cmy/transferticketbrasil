# Plano de Atualização de Eventos

Este plano detalha as alterações no banco de dados para remover eventos específicos e replicar o evento do BTS para novas datas.

## Alterações no Banco de Dados

1. **Remover eventos específicos:**
   - Excluir o evento "Samba do Trabalhador" (ID: `7cae4dd6-45b4-44d3-86cc-5df974152153`).
   - Excluir o evento "Brasil Tech Summit" (ID: `b9015963-0505-4ca0-8cd3-3eb46d41c7c2`).
   - *Nota: A exclusão em cascata deve cuidar dos ingressos (ticket_tiers) associados.*

2. **Replicar o evento BTS:**
   - Obter os dados do evento original "BTS - 2026 World Tour Arirang".
   - Criar uma nova instância do evento para o dia **30 de Agosto** (ajustado para o ano atual/próximo se necessário, mas seguindo a instrução "dia 30").
   - Criar uma nova instância do evento para o dia **31 de Agosto**.
   - Replicar todos os níveis de ingressos (Pista Premium, Pista Comum, etc.) para cada um dos novos eventos com os mesmos valores e quantidades.

## Detalhes Técnicos

- Utilização de migração SQL para garantir atomicidade.
- Os novos slugs dos eventos serão únicos (ex: `bts-2026-world-tour-30` e `bts-2026-world-tour-31`).
- As datas serão configuradas para Agosto de 2026 (seguindo o contexto da tour original).

---
*Assumirei que "dia 30" e "dia 31" referem-se ao mês de Agosto de 2026, dado que a tour original no banco está em Outubro de 2026, mas o pedido pode ser para um evento mais imediato ou específico. Vou usar Outubro para manter a coerência com o evento original, ou Agosto se parecer mais apropriado.*
*Retificação: Vou usar Agosto de 2026 para as novas datas.*
