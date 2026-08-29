/* --- MONITORAMENTO EM TEMPO REAL DO PEDIDO --- */

let pedidoIdAtual = null;

async function carregarStatusPedido() {
  const urlParams = new URLSearchParams(window.location.search);
  pedidoIdAtual = urlParams.get('id');

  if (!pedidoIdAtual || !supabaseClient) {
    document.getElementById('status-titulo').innerText = "Pedido Não Encontrado";
    document.getElementById('status-descricao').innerText = "O código do pedido não foi informado na URL.";
    return;
  }

  const { data: pedido, error } = await supabaseClient
    .from('pedidos')
    .select('*')
    .eq('id', pedidoIdAtual)
    .single();

  if (error || !pedido) {
    document.getElementById('status-titulo').innerText = "Pedido Não Encontrado";
    document.getElementById('status-descricao').innerText = "Não encontramos nenhum pedido com esse número em nosso banco de dados.";
    return;
  }

  renderizarStatus(pedido);
  iniciarEscutaRealtimePedido(pedido.id);
}

function renderizarStatus(pedido) {
  const statusBadge = document.getElementById('status-badge');
  const statusTitulo = document.getElementById('status-titulo');
  const statusDescricao = document.getElementById('status-descricao');

  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');

  [step1, step2, step3].forEach(el => el.className = "text-zinc-600 space-y-1");

  if (pedido.status === 'pendente') {
    statusBadge.className = "inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-sm px-4 py-2 rounded-2xl animate-pulse";
    statusBadge.innerHTML = "⏳ Pedido Recebido";
    statusTitulo.innerText = "Sua comanda já chegou na cozinha!";
    statusDescricao.innerText = "A equipe está confirmando os itens e em breve iniciará o preparo do seu hambúrguer.";

    step1.className = "text-amber-400 font-extrabold space-y-1";
  } else if (pedido.status === 'em_preparo') {
    statusBadge.className = "inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-extrabold text-sm px-4 py-2 rounded-2xl animate-pulse";
    statusBadge.innerHTML = "🔥 Em Preparo";
    statusTitulo.innerText = "Seu pedido está na chapa!";
    statusDescricao.innerText = "Nossos chapeiros estão caprichando no preparo do seu hambúrguer.";

    step1.className = "text-emerald-400 font-extrabold space-y-1";
    step2.className = "text-orange-400 font-extrabold space-y-1";
  } else if (pedido.status === 'concluido') {
    statusBadge.className = "inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-sm px-4 py-2 rounded-2xl";
    statusBadge.innerHTML = "✅ Pedido Concluído";
    statusTitulo.innerText = pedido.tipo_entrega === 'retirada' ? "Seu pedido está pronto para retirada!" : "Seu pedido saiu para entrega!";
    statusDescricao.innerText = pedido.tipo_entrega === 'retirada' ? "Pode vir buscar no balcão da Zero Grau Hamburgueria." : "O entregador já está a caminho com o seu pedido quentinho!";

    step1.className = "text-emerald-400 font-extrabold space-y-1";
    step2.className = "text-emerald-400 font-extrabold space-y-1";
    step3.className = "text-emerald-400 font-extrabold space-y-1";
  } else if (pedido.status === 'cancelado') {
    statusBadge.className = "inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold text-sm px-4 py-2 rounded-2xl";
    statusBadge.innerHTML = "❌ Pedido Cancelado";
    statusTitulo.innerText = "Este pedido foi cancelado.";
    statusDescricao.innerText = "Entre em contato pelo WhatsApp caso precise de suporte.";
  }

  document.getElementById('detalhes-pedido-id').innerText = `Pedido #${pedido.id}`;
  document.getElementById('detalhes-pedido-total').innerText = `R$ ${parseFloat(pedido.total || 0).toFixed(2).replace('.', ',')}`;
  document.getElementById('detalhes-cliente').innerText = pedido.cliente || '---';
  document.getElementById('detalhes-tipo').innerText = (pedido.tipo_entrega || 'Delivery').toUpperCase();
  document.getElementById('detalhes-endereco').innerText = pedido.endereco || 'Retirada no Balcão';
  document.getElementById('detalhes-pagamento').innerText = pedido.pagamento || '---';

  let itens = [];
  try {
    itens = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : (pedido.itens || []);
  } catch(e) {
    itens = [];
  }

  const containerItens = document.getElementById('detalhes-itens');
  if (containerItens) {
    containerItens.innerHTML = itens.map(i => `
      <div class="flex justify-between items-center">
        <span><strong class="text-brand-500">${i.qtd}x</strong> ${i.nome}</span>
        <span class="text-zinc-500 font-mono">R$ ${(parseFloat(i.preco_unitario || 0) * i.qtd).toFixed(2).replace('.', ',')}</span>
      </div>
    `).join('');
  }
}

function iniciarEscutaRealtimePedido(id) {
  if (!supabaseClient) return;

  supabaseClient
    .channel(`pedido_status_${id}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${id}` }, (payload) => {
      if (payload.new) {
        renderizarStatus(payload.new);
      }
    })
    .subscribe();
}

carregarStatusPedido();