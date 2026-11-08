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

  /* ---------- 2. Persistência (localStorage) ---------- */
  function carregar() {
    try {
      const dados = JSON.parse(localStorage.getItem(CHAVE));
      return Array.isArray(dados) ? dados : [];
    } catch (e) {
      return [];
    }
  }

  // Retorna true se gravou. Quem chama só troca o array em memória se der certo.
  function salvar(novaLista) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novaLista));
      return true;
    } catch (e) {
      return false;
    }
  }

  const novoId = () =>
    (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'r' + Date.now() + Math.random().toString(16).slice(2);

  /* ---------- 3. Utilitários ---------- */
  const normalizar = (t) =>
    String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const estrelas = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR');

  function el(tag, props, filhos) {
    const e = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else e.setAttribute(k, v);
    });
    (filhos || []).forEach((f) => e.appendChild(f));
    return e;
  }

  function imagem(src, alt) {
    const img = el('img', { src: src || PLACEHOLDER, alt: alt, loading: 'lazy' });
    img.addEventListener('error', () => { img.src = PLACEHOLDER; }, { once: true });
    return img;
  }

  function mostrarFeedback(texto) {
    const f = $('feedback-review');
    f.textContent = texto;
    f.hidden = false;
    clearTimeout(timerFeedback);
    timerFeedback = setTimeout(() => { f.hidden = true; }, 4500);
  }

  /* ---------- 4. Listagem: pesquisa + filtro + ordenação ---------- */
  function obterVisiveis() {
    const termo = normalizar(estado.busca);

    const filtradas = reviews.filter((r) => {
      const passaFiltro =
        estado.filtro === 'todos' ||
        (estado.filtro === 'livro' && r.tipo === 'livro') ||
        (estado.filtro === 'audiovisual' && (r.tipo === 'filme' || r.tipo === 'serie'));
      const passaBusca = !termo || normalizar(r.titulo + ' ' + r.autor).includes(termo);
      return passaFiltro && passaBusca;
    });

    const ordenadores = {
      recentes: (a, b) => b.criadoEm.localeCompare(a.criadoEm),
      antigas: (a, b) => a.criadoEm.localeCompare(b.criadoEm),
      titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' }),
      avaliacao: (a, b) => b.avaliacao - a.avaliacao || a.titulo.localeCompare(b.titulo, 'pt-BR')
    };
    return filtradas.sort(ordenadores[estado.ordem]);
  }

  function renderizar() {
    const visiveis = obterVisiveis();
    lista.innerHTML = '';

    visiveis.forEach((r) => lista.appendChild(criarCard(r)));

    const vazio = $('vazio-reviews');
    vazio.hidden = visiveis.length > 0;
    if (!visiveis.length) {
      vazio.textContent = reviews.length
        ? 'Nenhum resultado encontrado. Tente outro termo de busca ou outro filtro.'
        : 'Você ainda não tem reviews. Clique em "Nova review" para começar.';
    }

    $('resultado-reviews').textContent =
      `Exibindo ${visiveis.length} de ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`;
  }

  function criarCard(r) {
    const nota = el('data', { value: String(r.avaliacao), text: `${r.avaliacao} de 5` });
    const detalhes = [ROTULO_TIPO[r.tipo], r.ano, r.autor].filter(Boolean).join(' · ');

    const btnDetalhes = el('button', { type: 'button', class: 'btn-secundario', text: 'Detalhes' });
    const btnEditar = el('button', { type: 'button', class: 'btn-secundario', text: 'Editar' });
    const btnExcluir = el('button', { type: 'button', class: 'btn-perigo', text: 'Excluir' });
    btnDetalhes.setAttribute('aria-label', `Ver detalhes de ${r.titulo}`);
    btnEditar.setAttribute('aria-label', `Editar ${r.titulo}`);
    btnExcluir.setAttribute('aria-label', `Excluir ${r.titulo}`);

    btnDetalhes.addEventListener('click', () => abrirDetalhe(r.id));
    btnEditar.addEventListener('click', () => abrirEdicao(r.id));
    btnExcluir.addEventListener('click', () => pedirExclusao(r.id));

    const p = el('p', { text: 'Avaliação: ' });
    p.appendChild(nota);

    const card = el('article', {}, [
      imagem(r.capa, `Capa de ${r.titulo}`),
      el('h2', { text: r.titulo }),
      el('p', { text: detalhes }),
      p,
      el('div', { class: 'acoes' }, [btnDetalhes, btnEditar, btnExcluir])
    ]);
    return el('li', {}, [card]);
  }

  /* ---------- 5. Detalhes ---------- */
  function abrirDetalhe(id) {
    const r = reviews.find((x) => x.id === id);
    if (!r) return;
    idDetalhe = id;

    $('titulo-detalhe-review').textContent = r.titulo;
    const alvo = $('conteudo-detalhe-review');
    alvo.innerHTML = '';
    alvo.appendChild(imagem(r.capa, `Capa de ${r.titulo}`));

    const linhas = [
      ['Tipo', ROTULO_TIPO[r.tipo]],
      ['Autor / diretor(a)', r.autor || 'Não informado'],
      ['Ano', r.ano || 'Não informado'],
      ['Avaliação', `${estrelas(r.avaliacao)} (${r.avaliacao} de 5)`],
      ['Origem dos dados', r.fonte ? `Importado de ${r.fonte}` : 'Cadastro manual'],
      ['Registrada em', dataBR(r.criadoEm)]
    ];
    if (r.atualizadoEm !== r.criadoEm) linhas.push(['Editada em', dataBR(r.atualizadoEm)]);

    const dl = el('dl', { class: 'detalhes' });
    linhas.forEach(([t, v]) => {
      dl.appendChild(el('div', {}, [el('dt', { text: t }), el('dd', { text: String(v) })]));
    });
    alvo.appendChild(dl);
    alvo.appendChild(el('h3', { text: 'Minha crítica' }));
    alvo.appendChild(el('p', { text: r.critica || 'Sem crítica escrita.' }));

    modalDetalhe.showModal();
  }

  $('detalhe-editar').addEventListener('click', () => {
    const id = idDetalhe;
    modalDetalhe.close();
    abrirEdicao(id);
  });
  $('detalhe-excluir').addEventListener('click', () => {
    const id = idDetalhe;
    modalDetalhe.close();
    pedirExclusao(id);
  });

  /* ---------- 6. Cadastro e edição (formulário) ---------- */
  function mostrarPrevia(src) {
    $('previa-capa').src = src || '';
    $('area-previa').hidden = !src;
  }

  function limparFormulario() {
    form.reset();
    $('review-id').value = '';
    $('capa-url').value = '';
    $('fonte').value = '';
    $('resultados-api').innerHTML = '';
    $('status-api').hidden = true;
    $('erro-review').hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
    if (urlPreviaArquivo) { URL.revokeObjectURL(urlPreviaArquivo); urlPreviaArquivo = null; }
    mostrarPrevia('');
    $('titulo-modal-review').textContent = 'Adicione uma nova review';
    $('btn-salvar-review').textContent = 'Adicionar review';
  }

  function abrirEdicao(id) {
    const r = reviews.find((x) => x.id === id);
    if (!r) return;
    limparFormulario();
    $('review-id').value = r.id;
    $('tipo-review').value = r.tipo;
    $('titulo').value = r.titulo;
    $('autor').value = r.autor || '';
    $('ano').value = r.ano || '';
    $('avaliacao').value = r.avaliacao;
    $('critica').value = r.critica || '';
    $('capa-url').value = r.capa || '';
    $('fonte').value = r.fonte || '';
    mostrarPrevia(r.capa);
    $('titulo-modal-review').textContent = 'Editar review';
    $('btn-salvar-review').textContent = 'Salvar alterações';
    modalForm.showModal();
  }

  // Ao fechar o modal (X, Esc ou após salvar) o formulário volta ao modo "novo"
  modalForm.addEventListener('close', limparFormulario);

  function erroForm(campo, mensagem) {
    const caixa = $('erro-review');
    caixa.textContent = mensagem;
    caixa.hidden = false;
    if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
  }

  function validar() {
    form.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
    $('erro-review').hidden = true;

    const tipo = $('tipo-review');
    const titulo = $('titulo');
    const nota = $('avaliacao');
    const ano = $('ano');

    if (!tipo.value) return erroForm(tipo, 'Selecione o tipo da review.'), false;
    if (!titulo.value.trim()) return erroForm(titulo, 'Informe o título.'), false;

    const n = Number(nota.value);
    if (nota.value === '' || !Number.isInteger(n) || n < 0 || n > 5) {
      return erroForm(nota, 'A avaliação deve ser um número inteiro de 0 a 5.'), false;
    }
    if (ano.value !== '') {
      const a = Number(ano.value);
      if (!Number.isInteger(a) || a < 1000 || a > 2100) {
        return erroForm(ano, 'Informe um ano válido (entre 1000 e 2100).'), false;
      }
    }
    const arq = $('capa-review').files[0];
    if (arq && !arq.type.startsWith('image/')) {
      return erroForm($('capa-review'), 'O arquivo da capa precisa ser uma imagem.'), false;
    }
    return true;
  }

  // Reduz a imagem enviada para não estourar a cota do localStorage
  function arquivoParaDataUrl(arquivo) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, 480 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
      img.src = url;
    });
  }

  $('capa-review').addEventListener('change', (e) => {
    if (urlPreviaArquivo) URL.revokeObjectURL(urlPreviaArquivo);
    const arq = e.target.files[0];
    if (arq && arq.type.startsWith('image/')) {
      urlPreviaArquivo = URL.createObjectURL(arq);
      mostrarPrevia(urlPreviaArquivo);
    } else {
      urlPreviaArquivo = null;
      mostrarPrevia($('capa-url').value);
    }
  });

  $('remover-capa').addEventListener('click', () => {
    $('capa-review').value = '';
    $('capa-url').value = '';
    if (urlPreviaArquivo) { URL.revokeObjectURL(urlPreviaArquivo); urlPreviaArquivo = null; }
    mostrarPrevia('');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validar()) return;

    let capa = $('capa-url').value;
    const arquivo = $('capa-review').files[0];
    if (arquivo) {
      try { capa = await arquivoParaDataUrl(arquivo); }
      catch (err) { return erroForm($('capa-review'), 'Não foi possível ler essa imagem.'); }
    }

    const agora = new Date().toISOString();
    const id = $('review-id').value;
    const dados = {
      tipo: $('tipo-review').value,
      titulo: $('titulo').value.trim(),
      autor: $('autor').value.trim(),
      ano: $('ano').value ? Number($('ano').value) : null,
      avaliacao: Number($('avaliacao').value),
      critica: $('critica').value.trim(),
      capa: capa,
      fonte: $('fonte').value
    };

    let proxima;
    if (id) {
      proxima = reviews.map((r) => (r.id === id ? Object.assign({}, r, dados, { atualizadoEm: agora }) : r));
    } else {
      proxima = reviews.concat([Object.assign({ id: novoId(), criadoEm: agora, atualizadoEm: agora }, dados)]);
    }

    if (!salvar(proxima)) {
      return erroForm(null, 'Não foi possível salvar: o armazenamento do navegador está cheio. Tente uma capa menor.');
    }
    reviews = proxima;
    modalForm.close();
    renderizar();
    mostrarFeedback(id ? `Review de "${dados.titulo}" atualizada.` : `Review de "${dados.titulo}" adicionada.`);
  });

  /* ---------- 7. Exclusão ---------- */
  function pedirExclusao(id) {
    const r = reviews.find((x) => x.id === id);
    if (!r) return;
    idParaExcluir = id;
    $('texto-excluir-review').textContent = `Tem certeza que quer excluir a review de "${r.titulo}"? Essa ação não pode ser desfeita.`;
    modalExcluir.showModal();
  }

  $('confirmar-excluir-review').addEventListener('click', () => {
    const r = reviews.find((x) => x.id === idParaExcluir);
    const proxima = reviews.filter((x) => x.id !== idParaExcluir);
    if (!salvar(proxima)) {
      modalExcluir.close();
      mostrarFeedback('Não foi possível excluir agora. Tente novamente.');
      return;
    }
    reviews = proxima;
    idParaExcluir = null;
    modalExcluir.close();
    renderizar();
    mostrarFeedback(r ? `Review de "${r.titulo}" excluída.` : 'Review excluída.');
  });

  /* ---------- 8. Pesquisa, filtro e ordenação (eventos) ---------- */
  $('busca-reviews').addEventListener('input', (e) => {
    estado.busca = e.target.value;
    renderizar();
  });

  $('ordem-reviews').addEventListener('change', (e) => {
    estado.ordem = e.target.value;
    renderizar();
  });

  document.querySelector('.filtros').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-filtro]');
    if (!b) return;
    estado.filtro = b.dataset.filtro;
    renderizar();
  });

  /* ---------- 9. Consumo de APIs públicas ---------- */
  // Livros: Open Library · Séries: TVmaze · Filmes: iTunes Search. Nenhuma exige chave.
  async function pegarJson(url) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), 9000);
    try {
      const resp = await fetch(url, { signal: controle.signal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return await resp.json();
    } finally {
      clearTimeout(timer);
    }
  }

  const https = (u) => (u ? u.replace(/^http:/, 'https:') : '');
  const textoPuro = (html) => new DOMParser().parseFromString(html || '', 'text/html').body.textContent.trim();
  const anoDe = (data) => (data ? Number(String(data).slice(0, 4)) || null : null);

  const FONTES = {
    livro: {
      nome: 'Open Library',
      async buscar(q) {
        const d = await pegarJson('https://openlibrary.org/search.json?limit=8&fields=title,author_name,first_publish_year,cover_i&q=' + encodeURIComponent(q));
        return (d.docs || []).map((x) => ({
          titulo: x.title,
          autor: (x.author_name || [])[0] || '',
          ano: x.first_publish_year || null,
          capa: x.cover_i ? `https://covers.openlibrary.org/b/id/${x.cover_i}-M.jpg` : ''
        }));
      }
    },
    serie: {
      nome: 'TVmaze',
      async buscar(q) {
        const d = await pegarJson('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(q));
        return d.slice(0, 8).map((x) => ({
          titulo: x.show.name,
          autor: (x.show.network && x.show.network.name) || (x.show.webChannel && x.show.webChannel.name) || '',
          ano: anoDe(x.show.premiered),
          capa: x.show.image ? https(x.show.image.medium) : ''
        }));
      }
    },
    filme: {
      nome: 'iTunes Search',
      async buscar(q) {
        const d = await pegarJson('https://itunes.apple.com/search?media=movie&entity=movie&limit=8&country=BR&term=' + encodeURIComponent(q));
        return (d.results || []).map((x) => ({
          titulo: x.trackName,
          autor: x.artistName || '',
          ano: anoDe(x.releaseDate),
          capa: https((x.artworkUrl100 || '').replace('100x100', '300x300'))
        }));
      }
    }
  };

  function statusApi(texto, tipo) {
    const s = $('status-api');
    s.textContent = texto;
    s.hidden = !texto;
    s.className = 'mensagem ' + (tipo === 'erro' ? 'mensagem-erro' : 'mensagem-info');
  }

  async function executarBusca() {
    const tipo = $('tipo-review').value;
    const termo = $('busca-api').value.trim();
    const saida = $('resultados-api');
    saida.innerHTML = '';

    if (!tipo) return statusApi('Escolha o tipo da review antes de buscar.', 'erro');
    if (termo.length < 2) return statusApi('Digite pelo menos 2 letras para buscar.', 'erro');

    const fonte = FONTES[tipo];
    statusApi(`Buscando em ${fonte.nome}...`);
    $('btn-busca-api').disabled = true;

    try {
      const itens = (await fonte.buscar(termo)).filter((i) => i.titulo);
      if (!itens.length) {
        statusApi('Nada encontrado. Tente outro termo ou preencha manualmente.');
      } else {
        statusApi(`${itens.length} resultado(s) em ${fonte.nome}. Escolha um para preencher o formulário.`);
        itens.forEach((item) => saida.appendChild(criarResultado(item, fonte.nome)));
      }
    } catch (err) {
      statusApi('Não foi possível consultar a base agora. Você pode preencher os dados manualmente.', 'erro');
    } finally {
      $('btn-busca-api').disabled = false;
    }
  }

  function criarResultado(item, nomeFonte) {
    const btn = el('button', { type: 'button', class: 'btn-secundario item-api' }, [
      imagem(item.capa, ''),
      el('span', {}, [
        el('strong', { text: item.titulo }),
        el('small', { text: [item.autor, item.ano].filter(Boolean).join(' · ') || 'Sem detalhes' })
      ])
    ]);
    btn.addEventListener('click', () => {
      $('titulo').value = item.titulo;
      $('autor').value = item.autor || '';
      $('ano').value = item.ano || '';
      $('capa-url').value = item.capa || '';
      $('fonte').value = nomeFonte;
      $('capa-review').value = '';
      mostrarPrevia(item.capa);
      $('resultados-api').innerHTML = '';
      statusApi(`Dados de "${item.titulo}" preenchidos. Agora é só dar sua nota e sua crítica.`);
      $('avaliacao').focus();
    });
    return el('li', {}, [btn]);
  }

  $('btn-busca-api').addEventListener('click', executarBusca);
  $('busca-api').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); executarBusca(); }
  });

  /* ---------- 10. Início ---------- */
  renderizar();
})();
