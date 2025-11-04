**Resumo da Reunião**



O representante da Fundapeças apresentou o catálogo de funcionalidades desejadas para a aplicação de gestão de inventário e catálogo de peças. A conversa teve como foco compreender os diferentes tipos de utilizadores, os módulos principais do sistema e as regras de funcionamento do negócio.



Foram identificadas as seguintes áreas funcionais principais:



1\. Utilizadores, Perfis e Acesso



* Sistema hierárquico de perfis:



-- Dev: acesso total, incluindo estrutura de armazéns e permissões de sistema.



-- Admin: acesso total, exceto edição de estrutura e permissões reservadas ao Dev.



-- Funcionário de Vendas: gestão de peças, reservas e devoluções.



-- Funcionário de Armazém: gestão física de stock e movimentações.



-- Cliente (Oficina): acesso apenas ao catálogo público de peças visíveis.



* Autenticação segura, gestão de sessão e recuperação de palavra-passe.



* Controlo de ativação/desativação de contas, sem eliminação de histórico.



* Todas as ações registadas em logs detalhados.





2\. Categorias e Subcategorias



* Estrutura hierárquica de categorias (ex.: Motor, Caixa de Velocidades, Alternadores).



* Subcategorias opcionais (ex.: Peças de Motor → Bloco, Cabeça, Cárter).



* Apenas Admin/Dev podem criar, editar ou desativar categorias.



* Filtros e pesquisa por categoria/subcategoria.





3\. Fornecedores



* Registo completo de fornecedores (nome, NIF, país, contactos).



* Associação de peças a fornecedores e relatórios filtrados por origem.



* Possibilidade de desativar fornecedores mantendo o histórico.





4\. Funcionários



* Gestão de perfis internos (nome, cargo, ativo/inativo).



* Associação de todas as ações ao funcionário responsável.



* Histórico completo de atividades por funcionário.





5\. Peças



* Cada peça é um registo único com estado (novo, usado, recondicionado, avariado).



* Campos principais: referências, descrição, estado, preço, fornecedor, localização, datas.



* Nenhum registo é eliminado — o estado define a disponibilidade.



* Controlo de visibilidade por campo (referência, preço, imagem, descrição, etc.).



* Logs automáticos em todas as alterações.





6\. Referências Secundárias



* Associação de múltiplas referências OEM alternativas.



* Pesquisa universal por qualquer referência (principal ou secundária).



* Eliminação de duplicações.





7\. Especificações Técnicas



* Definição de especificações por categoria (ex.: cilindrada, combustível).



* Tipos de valor suportados: texto, número, decimal, booleano.



* Pesquisa avançada por valores técnicos e visibilidade individual.





8\. Pesquisa e Filtros



* Pesquisa avançada por referência, categoria, estado, fornecedor, preço e especificações.



* Resultados filtrados conforme o tipo de utilizador (interno ou cliente).



* Otimização da pesquisa para dispositivos móveis.





9\. Gestão de Stock e Movimentos



* Registo de todos os movimentos: entrada, reserva, preparação, envio, devolução.



* Histórico completo de ações (não apagável).



* Acompanhamento do ciclo de vida de cada peça.





10\. Reservas e Vendas



* Apenas funcionários podem criar reservas.



* Estados: pendente, em preparação, enviado, cancelado.



* Clientes apenas fazem pedidos via botão “Reservar” → WhatsApp da empresa.



* Gestão de devoluções integrada (peça volta a disponível ou marcada como avariada).





11\. Favoritos / Observados



* Clientes podem marcar peças como favoritas para consulta posterior.





12\. Gestão de Visibilidade



* Controlo individual de visibilidade de campos e imagens.



* Permissões restritas a Admin e Vendas.





13\. Imagens



* Upload múltiplo e escolha de imagem principal.



* Controlo de visibilidade individual por imagem.





14\. Relatórios e Métricas



* Relatórios de stock, entradas, saídas, peças mais movimentadas e avariadas.



* Exportação em CSV e PDF.



* Dashboard para Dono/Admin com métricas gerais.





15\. Logs e Auditoria



* Registo completo e permanente de todas as ações.



* Logs acessíveis por utilizador, tipo de ação ou período.





16\. Clientes (Oficinas)



* Contas com acesso apenas a peças disponíveis e visíveis.



* Interface simples, leve e orientada à pesquisa e favoritos.



* Pedidos de peças feitos via WhatsApp.





17\. Gestão de Armazéns



* Suporte a múltiplos armazéns, com estrutura hierárquica (Armazém → Raque → Prateleira → Palete).



* Apenas Admin/Dev pode criar ou editar armazéns.



* Funcionários podem mover peças entre localizações.



* Cada movimento é registado em log.





18\. Segurança e Controlo



* Sistema de permissões RBAC.



* Filtragem de dados sensíveis para clientes.



* Backups regulares e dados nunca eliminados fisicamente.





19\. Experiência de Utilização



* Interface intuitiva e responsiva.



* Formulários dinâmicos e pesquisa rápida.



* Painel do armazém focado em peças em preparação.



* Catálogo público simples e otimizado para mobile.





**Conclusão**



A reunião permitiu recolher uma visão detalhada do funcionamento interno da Fundapeças e definir o catálogo funcional que servirá de base ao desenvolvimento da aplicação móvel.

