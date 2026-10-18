# Administração completa da plataforma

## Resultado
- Remover do cabeçalho, menus e mensagens públicas qualquer menção a “Painel de dono”. O acesso continuará exclusivamente pelo endereço `/admin`.
- Renomear a tela restrita para “Administração” e manter a validação exclusiva da conta proprietária.
- Tornar Anúncios, Vendedores e Pedidos gerenciáveis, com ações para inserir, editar e excluir.

## Anúncios
- Criar um formulário completo com vendedor, título, subtítulo, descrição, categoria, local, endereço, datas, situação, destaque, slug e imagem.
- Permitir cadastrar e editar tipos de ingresso, descrição, preço, taxa, quantidade e ordem de exibição.
- Reaproveitar o envio seguro de imagens e mostrar a recomendação de formato, dimensões e limite do arquivo junto ao campo.
- Permitir edição e exclusão com confirmação; quando houver vendas vinculadas, impedir uma exclusão destrutiva e informar o motivo.

## Vendedores e pedidos
- Vendedores: cadastrar, editar nome, identificador público, biografia, imagem e vínculo opcional com usuário; excluir somente quando não houver anúncios dependentes.
- Pedidos: cadastrar, editar comprador, valores, moeda, provedor, referências e situações de pagamento/reembolso; excluir com confirmação explícita.
- Atualizar listas, totais, busca e paginação imediatamente após cada operação.

## Segurança e validação
- Toda leitura e alteração continuará validando no servidor se a pessoa autenticada tem papel de administradora antes de qualquer acesso amplo.
- Operações administrativas usarão acesso privilegiado somente depois dessa validação, sem ampliar as permissões de vendedores comuns.
- Validar campos e valores no servidor e adicionar testes para acesso administrativo e regras destrutivas importantes.

## Verificação e publicação
- Testar a conta proprietária no fluxo completo de criação, edição e exclusão, além de confirmar que uma conta comum permanece bloqueada.
- Conferir o painel em computador e celular, revisar erros e publicar no domínio principal.