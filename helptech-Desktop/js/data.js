/* ===== Help Tech Express - dados compartilhados (cliente + empresa) =====
   Tudo fica no navegador (localStorage/sessionStorage). Sem back-end. */
(function () {
  'use strict';

  const STATUS = ['Em análise', 'Em manutenção', 'Concluído'];
  const STATUS_LABEL = { 'Concluído': 'Pronto' };          // como o cliente enxerga
  const STATUS_CLASS = { 'Concluído': 's-pronto', 'Em análise': 's-analise', 'Em manutenção': 's-manut' };

  const draft = {
    get() { try { return JSON.parse(sessionStorage.getItem('ht_draft')) || {}; } catch (e) { return {}; } },
    set(patch) { try { sessionStorage.setItem('ht_draft', JSON.stringify(Object.assign(draft.get(), patch))); } catch (e) { } },
    clear() { try { sessionStorage.removeItem('ht_draft'); } catch (e) { } }
  };

  function seed() {
    return [
      {
        id: '#27', desc: 'Formatação de notebook', date: '12/04/2026', status: 'Concluído', tecnico: 'Carlos', dono: 'luiz',
        info: 'Notebook lento, precisa formatar e reinstalar o sistema.', orcamento: 120,
        extra: { cliente: 'Luiz Silva', email: 'luiz@email.com', telefone: '(27) 99885-4785', equipamento: 'Notebook Dell', servicos: 'Manutenção' },
        historico: [{ data: '12/04/2026', texto: 'Chamado aberto pelo cliente' }, { data: '13/04/2026', texto: 'Formatação concluída e backup devolvido' }]
      },
      {
        id: '#58', desc: 'Instalação de impressora', date: '11/09/2026', status: 'Em análise', tecnico: '', dono: 'luiz',
        info: 'Impressora de rede não é reconhecida no computador.', orcamento: 0,
        extra: { cliente: 'Luiz Silva', email: 'luiz@email.com', telefone: '(27) 99885-4785', equipamento: 'Impressora HP', servicos: 'Atualização' },
        historico: [{ data: '11/09/2026', texto: 'Chamado aberto pelo cliente' }]
      },
      {
        id: '#09', desc: 'Remoção de vírus', date: '09/09/2026', status: 'Em manutenção', tecnico: 'Carlos', dono: 'luiz',
        info: 'Computador abre anúncios sozinho e está muito lento.', orcamento: 80,
        extra: { cliente: 'Luiz Silva', email: 'luiz@email.com', telefone: '(27) 99885-4785', equipamento: 'Computador Positivo', servicos: 'Manutenção' },
        historico: [{ data: '09/09/2026', texto: 'Chamado aberto pelo cliente' }, { data: '10/09/2026', texto: 'Equipamento recebido, varredura em andamento' }]
      },
      {
        id: '#64', desc: 'Upgrade de Memória RAM', date: '20/06/2026', status: 'Concluído', tecnico: 'Ana', dono: 'luiz',
        info: 'Aumentar de 8GB para 16GB de RAM.', orcamento: 250,
        extra: { cliente: 'Luiz Silva', email: 'luiz@email.com', telefone: '(27) 99885-4785', equipamento: 'Notebook Acer', servicos: 'Melhorias, Memória RAM' },
        historico: [{ data: '20/06/2026', texto: 'Chamado aberto pelo cliente' }, { data: '22/06/2026', texto: 'Upgrade realizado e testado' }]
      },
      {
        id: '#31', desc: 'Troca de tela de celular', date: '05/11/2026', status: 'Em análise', tecnico: '', dono: 'marina',
        info: 'Tela trincada após queda, touch funcionando parcialmente.', orcamento: 0,
        extra: { cliente: 'Marina Souza', email: 'marina@email.com', telefone: '(27) 99771-2200', equipamento: 'Celular Motorola', servicos: 'Reforma, Telas' },
        historico: [{ data: '05/11/2026', texto: 'Chamado aberto pelo cliente' }]
      },
      {
        id: '#72', desc: 'Computador não liga', date: '07/11/2026', status: 'Em manutenção', tecnico: 'Ana', dono: 'pedro',
        info: 'Ao apertar o botão, o computador faz um bip e desliga.', orcamento: 180,
        extra: { cliente: 'Pedro Alves', email: 'pedro@email.com', telefone: '(27) 98812-3344', equipamento: 'Computador Positivo', servicos: 'Manutenção, Fonte' },
        historico: [{ data: '07/11/2026', texto: 'Chamado aberto pelo cliente' }, { data: '08/11/2026', texto: 'Fonte com defeito, aguardando peça nova' }]
      }
    ];
  }

  const tickets = {
    get() {
      let list = null;
      try { list = JSON.parse(localStorage.getItem('ht_tickets')); } catch (e) { }
      if (!Array.isArray(list)) list = seed();
      return list.map(t => Object.assign({ tecnico: '', orcamento: 0, historico: [], extra: {}, dono: 'luiz' }, t));
    },
    set(list) { try { localStorage.setItem('ht_tickets', JSON.stringify(list)); } catch (e) { } },
    update(id, fn) {
      const list = tickets.get();
      const t = list.find(x => x.id === id);
      if (t) { fn(t); tickets.set(list); }
      return t;
    }
  };

  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };

  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  window.HT = { STATUS, STATUS_LABEL, STATUS_CLASS, draft, tickets, today, toast };
})();
