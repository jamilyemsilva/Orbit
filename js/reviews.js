(function () {
  'use strict';

  /* ---------- 1. Constantes e estado ---------- */
  const CHAVE = 'orbit.reviews.v1';
  const PLACEHOLDER = 'assets/img/placeholder.svg';
  const ROTULO_TIPO = { filme: 'Filme', serie: 'Série', livro: 'Livro' };

  let reviews = carregar();
  const estado = { busca: '', filtro: 'todos', ordem: 'recentes' };
  let idParaExcluir = null;
  let idDetalhe = null;
  let urlPreviaArquivo = null;
  let timerFeedback = null;

  const $ = (id) => document.getElementById(id);
  const lista = $('lista-reviews');
  const form = $('form-review');
  const modalForm = $('modal-review');
  const modalDetalhe = $('modal-detalhe-review');
  const modalExcluir = $('modal-excluir-review');
})();
