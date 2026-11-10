/* ===== Help Tech Express - lógica compartilhada ===== */
(function () {
  'use strict';

  const { draft, tickets, toast, today } = window.HT;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function cancelFlow() {
    if (confirm('Deseja cancelar o novo chamado? Os dados preenchidos serão perdidos.')) {
      draft.clear();
      location.href = 'index.html';
    }
  }

  /* ---------- Validação ---------- */
  function setError(input, ok) {
    const f = input.closest('.field');
    if (f) f.classList.toggle('invalid', !ok);
    return ok;
  }
  function validate(rules) {
    let firstBad = null;
    rules.forEach(([el, test]) => {
      const ok = setError(el, test(el.value.trim()));
      if (!ok && !firstBad) firstBad = el;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  function bindLive(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => el.closest('.field').classList.remove('invalid'));
    return el;
  }

  /* ---------- Máscara de telefone ---------- */
  function maskPhone(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  /* ---------- Páginas ---------- */
  const pages = {};

  pages.index = function () { /* página estática */ };

  pages.dados = function () {
    const nome = bindLive('nome'), email = bindLive('email'), tel = bindLive('telefone');
    const d = draft.get();
    nome.value = d.nome || ''; email.value = d.email || ''; tel.value = d.telefone || '';
    tel.addEventListener('input', () => { tel.value = maskPhone(tel.value); });
    $('#btn-cancelar').addEventListener('click', cancelFlow);
    $('#btn-confirmar').addEventListener('click', () => {
      const ok = validate([
        [nome, v => v.length >= 3],
        [email, v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)],
        [tel, v => v.replace(/\D/g, '').length >= 10]
      ]);
      if (!ok) return;
      draft.set({ nome: nome.value.trim(), email: email.value.trim(), telefone: tel.value.trim() });
      location.href = 'equipamentos.html';
    });
  };

  pages.equipamentos = function () {
    const tipo = bindLive('tipo'), marca = bindLive('marca'), conector = bindLive('conector');
    const d = draft.get();
    tipo.value = d.tipo || ''; marca.value = d.marca || ''; conector.value = d.conector || '';
    $('#btn-cancelar').addEventListener('click', cancelFlow);
    $('#btn-confirmar').addEventListener('click', () => {
      const ok = validate([[tipo, v => v.length >= 2], [marca, v => v.length >= 2]]);
      if (!ok) return;
      draft.set({ tipo: tipo.value.trim(), marca: marca.value.trim(), conector: conector.value.trim() });
      location.href = 'servicos.html';
    });
  };

  pages.servicos = function () {
    const COMPONENTES = ['Memória RAM', 'SSD', 'HD', 'Placa de vídeo', 'Fonte', 'Placa-mãe', 'Processador', 'Cooler', 'Bateria'];
    const d = draft.get();
    let componentes = Array.isArray(d.componentes) ? d.componentes.slice() : [];
    const chosen = new Set(d.servicos || []);
    $$('input[data-servico]').forEach(cb => {
      cb.checked = chosen.has(cb.dataset.servico);
    });

    const input = $('#comp-input'), list = $('#comp-list'), chips = $('#chips');
    function renderChips() {
      chips.innerHTML = '';
      componentes.forEach(c => {
        const el = document.createElement('span');
        el.className = 'chip';
        el.textContent = c;
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-label', 'Remover ' + c); b.textContent = '×';
        b.addEventListener('click', () => { componentes = componentes.filter(x => x !== c); renderChips(); });
        el.appendChild(b);
        chips.appendChild(el);
      });
    }
    function renderList() {
      const q = input.value.trim().toLowerCase();
      list.innerHTML = '';
      COMPONENTES.filter(c => !componentes.includes(c) && c.toLowerCase().includes(q)).slice(0, 3).forEach(c => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = c;
        b.addEventListener('click', () => { componentes.push(c); input.value = ''; renderChips(); renderList(); });
        li.appendChild(b); list.appendChild(li);
      });
    }
    input.addEventListener('input', renderList);
    renderChips(); renderList();

    $('#btn-cancelar').addEventListener('click', cancelFlow);
    $('#btn-confirmar').addEventListener('click', () => {
      const servicos = $$('input[data-servico]:checked').map(cb => cb.dataset.servico);
      if (!servicos.length && !componentes.length) {
        toast('Selecione ao menos um serviço, componente ou periférico.');
        return;
      }
      draft.set({ servicos, componentes });
      location.href = 'descricao.html';
    });
  };

  pages.descricao = function () {
    const desc = bindLive('descricao');
    desc.value = draft.get().descricao || '';
    $('#btn-cancelar').addEventListener('click', cancelFlow);
    $('#btn-confirmar').addEventListener('click', () => {
      if (!validate([[desc, v => v.length >= 10]])) return;
      draft.set({ descricao: desc.value.trim() });
      location.href = 'confirmacao.html';
    });
  };

  pages.confirmacao = function () {
    const d = draft.get();
    if (!d.nome) { location.replace('novo-chamado.html'); return; }
    const itens = (d.servicos || []).concat(d.componentes || []);
    $('#c-nome').value = d.nome;
    $('#c-email').value = d.email;
    $('#c-tel').value = d.telefone;
    $('#c-prob').value = [d.tipo + ' ' + d.marca + (d.conector ? ' (' + d.conector + ')' : ''), itens.join(', '), d.descricao].filter(Boolean).join(' | ');
    $('#btn-cancelar').addEventListener('click', cancelFlow);
    $('#btn-confirmar').addEventListener('click', () => {
      const list = tickets.get();
      let id;
      do { id = '#' + String(Math.floor(Math.random() * 99) + 1).padStart(2, '0'); } while (list.some(t => t.id === id));
      const date = today();
      list.push({
        id, date, dono: 'luiz', status: 'Em análise', tecnico: '', orcamento: 0,
        desc: (itens[0] || 'Atendimento') + ' - ' + d.tipo,
        info: d.descricao,
        extra: { cliente: d.nome, email: d.email, telefone: d.telefone, equipamento: d.tipo + ' ' + d.marca, servicos: itens.join(', ') },
        historico: [{ data: date, texto: 'Chamado aberto pelo cliente' }]
      });
      tickets.set(list);
      draft.clear();
      sessionStorage.setItem('ht_flash', 'Chamado ' + id + ' aberto com sucesso!');
      location.href = 'meus-chamados.html';
    });
  };

  pages.chamados = function () {
    const body = $('#tbody'), searchEl = $('#busca');
    let filter = 'Todos';
    const list = tickets.get().filter(t => t.dono === 'luiz');
    const statusClass = { 'Concluído': 's-pronto', 'Em análise': 's-analise', 'Em manutenção': 's-manut' };
    const statusLabel = { 'Concluído': 'Pronto' };

    function counts() {
      const c = { 'Todos': list.length, 'Em análise': 0, 'Em manutenção': 0, 'Concluído': 0 };
      list.forEach(t => { if (c[t.status] !== undefined) c[t.status]++; });
      return c;
    }
    function renderFilters() {
      const c = counts();
      $$('.filter').forEach(b => {
        const f = b.dataset.f;
        b.textContent = (f === 'Concluído' ? 'Concluídos' : f) + ' (' + c[f] + ')';
        b.classList.toggle('active', f === filter);
        b.setAttribute('aria-pressed', f === filter);
      });
    }
    function renderTable() {
      const q = (searchEl.value || '').trim().toLowerCase();
      const rows = list.filter(t => (filter === 'Todos' || t.status === filter) &&
        (!q || (t.desc + ' ' + t.id + ' ' + t.status).toLowerCase().includes(q)));
      body.innerHTML = '';
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="5" class="empty">Nenhum chamado encontrado.</td></tr>';
        return;
      }
      rows.forEach(t => {
        const tr = document.createElement('tr');
        const cells = [
          ['c-id', t.id], ['c-desc', t.desc], ['c-date', t.date],
          ['c-status ' + statusClass[t.status], statusLabel[t.status] || t.status]
        ];
        cells.forEach(([cls, txt]) => { const td = document.createElement('td'); td.className = cls; td.textContent = txt; tr.appendChild(td); });
        const act = document.createElement('td'); act.className = 'c-act';
        const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Ver';
        b.setAttribute('aria-label', 'Ver chamado ' + t.id);
        b.addEventListener('click', () => openModal(t));
        act.appendChild(b); tr.appendChild(act);
        body.appendChild(tr);
      });
    }
    $$('.filter').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; renderFilters(); renderTable(); }));
    searchEl.addEventListener('input', renderTable);
    renderFilters(); renderTable();

    /* Modal "Ver" */
    const modal = $('#modal');
    function openModal(t) {
      const x = t.extra || {};
      $('#m-title').textContent = 'Chamado ' + t.id;
      const rows = [['Descrição', t.desc], ['Data', t.date], ['Status', statusLabel[t.status] || t.status],
      ['Cliente', x.cliente], ['Equipamento', x.equipamento], ['Serviços', x.servicos], ['Detalhes', t.info], ['Técnico responsável', t.tecnico],
      ['Orçamento', t.orcamento ? 'R$ ' + Number(t.orcamento).toFixed(2).replace('.', ',') : ''],
      ['Andamento', (t.historico || []).map(h => h.data + ' - ' + h.texto).join('\n')]]
        .filter(r => r[1]);
      const dl = $('#m-dl'); dl.innerHTML = '';
      rows.forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v; dd.style.whiteSpace = 'pre-line';
        dl.appendChild(dt); dl.appendChild(dd);
      });
      modal.classList.add('open');
      $('#m-close').focus();
    }
    const close = () => modal.classList.remove('open');
    $('#m-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    const flash = sessionStorage.getItem('ht_flash');
    if (flash) { sessionStorage.removeItem('ht_flash'); toast(flash); }
  };

  /* ---------- Início ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const fn = pages[document.body.dataset.page];
    if (fn) fn();
    const settings = $('.settings');
    if (settings) settings.addEventListener('click', () => toast('Configurações em breve.'));
  });
})();
