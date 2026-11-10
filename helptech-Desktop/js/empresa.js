/* ===== Help Tech Express - área da empresa ===== */
(function () {
  'use strict';
  const { STATUS, STATUS_LABEL, STATUS_CLASS, tickets, toast, today } = window.HT;
  const $ = (s, r) => (r || document).querySelector(s);

  const USERS = { 'tecnico@helptech.com': { senha: '123456', nome: 'Carlos' }, 'ana@helptech.com': { senha: '123456', nome: 'Ana' } };
  const TECNICOS = ['Carlos', 'Ana'];
  const auth = {
    get() { try { return JSON.parse(sessionStorage.getItem('ht_empresa')); } catch (e) { return null; } },
    set(u) { try { sessionStorage.setItem('ht_empresa', JSON.stringify(u)); } catch (e) { } },
    out() { try { sessionStorage.removeItem('ht_empresa'); } catch (e) { } }
  };

  /* helper seguro: nunca injeta HTML vindo do usuário */
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    [].concat(kids || []).forEach(c => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }
  const money = v => v ? 'R$ ' + Number(v).toFixed(2).replace('.', ',') : '-';
  const label = s => STATUS_LABEL[s] || s;
  const link = id => 'empresa-chamado.html?id=' + encodeURIComponent(id);

  function addHistory(t, texto) { t.historico.push({ data: today(), texto }); }
  function changeStatus(id, status, who) {
    tickets.update(id, t => { if (t.status !== status) { addHistory(t, 'Status alterado para "' + label(status) + '" por ' + who); t.status = status; } });
  }
  function assume(id, who) {
    tickets.update(id, t => { t.tecnico = who; addHistory(t, who + ' assumiu o atendimento'); if (t.status === 'Em análise') { /* continua em análise até o técnico mudar */ } });
  }

  const pages = {};

  /* ---------- Login ---------- */
  pages['e-login'] = function () {
    if (auth.get()) { location.replace('empresa-painel.html'); return; }
    const form = $('#login-form'), err = $('#login-err');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const u = USERS[$('#l-email').value.trim().toLowerCase()];
      if (!u || u.senha !== $('#l-senha').value) { err.textContent = 'E-mail ou senha incorretos.'; err.style.display = 'block'; return; }
      auth.set({ nome: u.nome });
      location.href = 'empresa-painel.html';
    });
  };

  /* ---------- Painel ---------- */
  pages['e-painel'] = function (me) {
    $('#ola').textContent = 'Olá, ' + me.nome + '!';
    const list = tickets.get();
    const count = s => list.filter(t => t.status === s).length;
    const stats = [['Total', list.length, ''], ['Em análise', count('Em análise'), 's-a'], ['Em manutenção', count('Em manutenção'), 's-m'],
    ['Concluídos', count('Concluído'), 's-c'], ['Sem técnico', list.filter(t => !t.tecnico && t.status !== 'Concluído').length, 's-n']];
    const st = $('#stats');
    stats.forEach(([n, v, c]) => st.appendChild(el('div', { class: 'stat ' + c }, [el('b', { text: String(v) }), el('span', { text: n })])));

    const colors = { 'Em análise': '#ff8d28', 'Em manutenção': '#0a84ff', 'Concluído': '#34c759' };
    const bars = $('#bars');
    STATUS.forEach(s => {
      const pct = list.length ? Math.round(count(s) / list.length * 100) : 0;
      bars.appendChild(el('div', { class: 'bar-row' }, [el('span', { text: label(s) }),
      el('div', { class: 'bar' }, el('i', { style: 'width:' + pct + '%;background:' + colors[s] })), el('b', { text: String(count(s)) })]));
    });

    function ticketLi(t, withAssume) {
      const acts = [el('a', { class: 'mini gray', href: link(t.id), text: 'Abrir' })];
      if (withAssume) acts.unshift(el('button', { class: 'mini', type: 'button', text: 'Assumir', onclick: () => { assume(t.id, me.nome); toast('Você assumiu o chamado ' + t.id); render(); } }));
      return el('li', {}, [el('div', { class: 'info' }, [el('strong', { text: t.id + ' - ' + t.desc }),
      el('small', { text: (t.extra.cliente || 'Cliente') + ' - ' + t.date })]), ...acts]);
    }
    function render() {
      const all = tickets.get();
      const fila = all.filter(t => !t.tecnico && t.status !== 'Concluído');
      const meus = all.filter(t => t.tecnico === me.nome && t.status !== 'Concluído');
      const q = $('#fila'), m = $('#meus');
      q.innerHTML = ''; m.innerHTML = '';
      fila.forEach(t => q.appendChild(ticketLi(t, true)));
      meus.forEach(t => m.appendChild(ticketLi(t, false)));
      if (!fila.length) q.appendChild(el('li', { class: 'muted', text: 'Nenhum chamado aguardando técnico.' }));
      if (!meus.length) m.appendChild(el('li', { class: 'muted', text: 'Você não tem atendimentos em aberto.' }));
    }
    render();
  };

  /* ---------- Lista de chamados ---------- */
  pages['e-chamados'] = function (me) {
    const body = $('#tbody'), fs = $('#f-status'), ft = $('#f-tec'), fq = $('#f-q');
    let view = [];
    function render() {
      const q = fq.value.trim().toLowerCase();
      view = tickets.get().filter(t =>
        (!fs.value || t.status === fs.value) &&
        (!ft.value || (ft.value === '__none' ? !t.tecnico : t.tecnico === ft.value)) &&
        (!q || [t.id, t.desc, t.extra.cliente, t.extra.equipamento].join(' ').toLowerCase().includes(q)));
      body.innerHTML = '';
      if (!view.length) { body.appendChild(el('tr', {}, el('td', { colspan: '7', class: 'empty', text: 'Nenhum chamado encontrado.' }))); return; }
      view.forEach(t => {
        const sel = el('select', {
          'aria-label': 'Status do chamado ' + t.id, onchange: e => {
            changeStatus(t.id, e.target.value, me.nome);
            if (!t.tecnico) tickets.update(t.id, x => { if (!x.tecnico) { x.tecnico = me.nome; addHistory(x, me.nome + ' assumiu o atendimento'); } });
            toast('Status do ' + t.id + ' atualizado'); render();
          }
        }, STATUS.map(s => { const o = el('option', { value: s, text: label(s) }); if (s === t.status) o.selected = true; return o; }));
        body.appendChild(el('tr', {}, [
          el('td', { class: 'c-id', text: t.id }),
          el('td', { class: 'c-cli', text: (t.extra.cliente || '-') + ' - ' + t.desc }),
          el('td', { class: 'c-date', text: t.date }),
          el('td', { class: 'c-tec', text: t.tecnico || 'Sem técnico' }),
          el('td', { class: 'c-st ' + STATUS_CLASS[t.status] }, sel),
          el('td', { class: 'c-date', text: money(t.orcamento) }),
          el('td', { class: 'c-act' }, el('a', { href: link(t.id), text: 'Abrir' }))
        ]));
      });
    }
    [fs, ft].forEach(x => x.addEventListener('change', render));
    fq.addEventListener('input', render);
    $('#btn-csv').addEventListener('click', () => {
      const rows = [['ID', 'Cliente', 'Descrição', 'Data', 'Técnico', 'Status', 'Orçamento']]
        .concat(view.map(t => [t.id, t.extra.cliente || '', t.desc, t.date, t.tecnico, label(t.status), t.orcamento || 0]));
      const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n');
      const a = el('a', { href: URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })), download: 'chamados.csv' });
      document.body.appendChild(a); a.click(); a.remove();
    });
    render();
  };

  /* ---------- Detalhe do chamado ---------- */
  pages['e-chamado'] = function (me) {
    const id = new URLSearchParams(location.search).get('id');
    const t = tickets.get().find(x => x.id === id);
    if (!t) { $('#detail').replaceChildren(el('p', { class: 'muted', text: 'Chamado não encontrado.' })); return; }
    $('#titulo').textContent = 'Chamado ' + t.id;
    const x = t.extra;
    const dl = (rows) => el('dl', {}, rows.filter(r => r[1]).flatMap(([k, v]) => [el('dt', { text: k }), el('dd', {}, typeof v === 'string' ? v : v)]));
    $('#b-cliente').appendChild(dl([['Nome', x.cliente || '-'],
    ['E-mail', x.email ? el('a', { href: 'mailto:' + x.email, text: x.email }) : ''],
    ['Telefone', x.telefone ? el('a', { href: 'tel:' + x.telefone.replace(/\D/g, ''), text: x.telefone }) : '']]));
    $('#b-problema').appendChild(dl([['Equipamento', x.equipamento], ['Serviços solicitados', x.servicos], ['Descrição do cliente', t.info], ['Aberto em', t.date]]));

    const form = $('#mgmt');
    const selS = $('#m-status'), selT = $('#m-tec'), orc = $('#m-orc'), note = $('#m-note');
    STATUS.forEach(s => { const o = el('option', { value: s, text: label(s) }); selS.appendChild(o); });
    [['', 'Sem técnico']].concat(TECNICOS.map(n => [n, n])).forEach(([v, l]) => selT.appendChild(el('option', { value: v, text: l })));
    selS.value = t.status; selT.value = t.tecnico || ''; orc.value = t.orcamento || '';

    function renderTimeline() {
      const cur = tickets.get().find(z => z.id === id);
      const ul = $('#timeline'); ul.innerHTML = '';
      cur.historico.slice().reverse().forEach(h => ul.appendChild(el('li', {}, [h.texto, el('small', { text: h.data })])));
    }
    $('#btn-assumir').addEventListener('click', () => { selT.value = me.nome; toast('Clique em Salvar para confirmar.'); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const valor = parseFloat(String(orc.value).replace(',', '.'));
      if (orc.value && (isNaN(valor) || valor < 0)) { toast('Informe um valor de orçamento válido.'); orc.focus(); return; }
      tickets.update(id, c => {
        if (selT.value !== c.tecnico) { c.tecnico = selT.value; addHistory(c, selT.value ? selT.value + ' assumiu o atendimento' : 'Chamado devolvido para a fila'); }
        if (selS.value !== c.status) { addHistory(c, 'Status alterado para "' + label(selS.value) + '" por ' + me.nome); c.status = selS.value; }
        const novo = orc.value ? valor : 0;
        if (novo !== c.orcamento) { addHistory(c, 'Orçamento definido: ' + money(novo)); c.orcamento = novo; }
        if (note.value.trim()) addHistory(c, me.nome + ': ' + note.value.trim());
      });
      note.value = '';
      renderTimeline();
      toast('Chamado atualizado! O cliente já vê o andamento.');
    });
    renderTimeline();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    const fn = pages[page];
    if (page !== 'e-login') {
      const me = auth.get();
      if (!me) { location.replace('empresa-login.html'); return; }
      const who = $('#who'); if (who) who.textContent = me.nome;
      const out = $('#sair'); if (out) out.addEventListener('click', () => { auth.out(); location.href = 'empresa-login.html'; });
      if (fn) fn(me);
    } else if (fn) fn();
  });
})();
