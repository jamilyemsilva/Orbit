# Orbit (Jpyter)

Web site de um blog individual com conteúdos do meu gosto pessoal: reviews, músicas, estudos, anotações e mais.

## Etapa 3 — Reviews (aplicação interativa)
Entidade principal: **review** de livro, filme ou série (`reviews.html` + `js/reviews.js`).

- Cadastrar, listar, ver detalhes, editar e excluir reviews, com validação e feedback
- Pesquisa por título/autor, filtro por tipo e ordenação (recentes, antigas, A–Z, nota)
- Persistência com `localStorage` (chave `orbit.reviews.v1`)
- APIs públicas sem chave: Open Library (livros), TVmaze (séries) e iTunes Search (filmes) para preencher o cadastro
