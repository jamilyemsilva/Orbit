document.querySelectorAll('.menu-toggle').forEach(function (btn) {
  btn.addEventListener('click', function () {
    btn.setAttribute('aria-expanded', btn.getAttribute('aria-expanded') !== 'true');
  });
});
document.querySelectorAll('[data-abrir-modal]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var m = document.getElementById(btn.dataset.abrirModal);
    if (m && m.showModal) m.showModal();
  });
});
document.querySelectorAll('[data-fechar-modal]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var m = document.getElementById(btn.dataset.fecharModal);
    if (m) m.close();
  });
});
document.querySelectorAll('.filtros').forEach(function (grupo) {
  grupo.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    grupo.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
  });
});
