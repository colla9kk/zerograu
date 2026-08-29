if (typeof PRODUTOS === 'undefined') {
  var PRODUTOS = [];
}

let carrinho = {};
let categoriaAtual = 'todos';
let tipoEntrega = 'delivery';
let pedidoPendente = null;
let statusLojaCache = { aberta: true, motivo: '' };

/* --- CHECAGEM E VALIDAÇÃO DE STATUS DA LOJA --- */

async function checarStatusLoja() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('restaurantes')
        .select('status_assinatura, loja_aberta, hora_abertura, hora_fechamento')
        .limit(1)
        .single();

      if (!error && data && data.status_assinatura === 'suspenso') {
        document.body.innerHTML = `
          <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#09090b; color:#fff; font-family:sans-serif; text-align:center; padding:20px;">
            <div>
              <h1 style="color:#f59e0b; font-size:1.8rem; margin-bottom:10px;">Loja Indisponível 🛠️</h1>
              <p style="color:#a1a1aa;">Este estabelecimento está temporariamente fora do ar.</p>
              <p style="color:#71717a; font-size:0.85rem; margin-top:10px;">Tente novamente mais tarde.</p>
            </div>
          </div>
        `;
        return false;
      }
    } catch (err) {
      console.warn("Erro ao checar status da assinatura:", err);
    }
  }
  return true;
}

async function verificarLojaAberta() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data: config, error } = await supabaseClient
        .from('restaurantes')
        .select('loja_aberta, hora_abertura, hora_fechamento')
        .limit(1)
        .single();

      if (error || !config) return { aberta: true };

      if (config.loja_aberta === false) {
        return { aberta: false, motivo: "O estabelecimento está fechado no momento para novos pedidos." };
      }

      if (config.hora_abertura && config.hora_fechamento) {
        const agora = new Date();
        const horaAtual = agora.getHours() * 60 + agora.getMinutes();

        const [hA, mA] = config.hora_abertura.split(':').map(Number);
        const [hF, mF] = config.hora_fechamento.split(':').map(Number);

        const minAbertura = hA * 60 + mA;
        const minFechamento = hF * 60 + mF;

        let estaNoHorario = false;
        if (minFechamento > minAbertura) {
          estaNoHorario = horaAtual >= minAbertura && horaAtual <= minFechamento;
        } else {
          estaNoHorario = horaAtual >= minAbertura || horaAtual <= minFechamento;
        }

        if (!estaNoHorario) {
          return { 
            aberta: false, 
            motivo: `Nosso horário de atendimento é das ${config.hora_abertura} às ${config.hora_fechamento}.` 
          };
        }
      }
    } catch (err) {
      console.warn("Erro ao checar horário:", err);
    }
  }
  return { aberta: true };
}

// Renderiza o aviso no topo da tela do cardápio se a loja estiver fechada
async function atualizarAvisoLojaFechada() {
  statusLojaCache = await verificarLojaAberta();
  let banner = document.getElementById('banner-loja-fechada');

  if (!statusLojaCache.aberta) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'banner-loja-fechada';
      banner.className = 'bg-red-950/90 border-b border-red-500/30 text-red-200 px-4 py-3 text-center text-xs font-bold sticky top-0 z-40 backdrop-blur-md flex items-center justify-center gap-2';
      document.body.prepend(banner);
    }
    banner.innerHTML = `🔴 LOJA FECHADA: ${statusLojaCache.motivo}`;
  } else if (banner) {
    banner.remove();
  }

  atualizarBarra();
}

/* --- SISTEMA DE NOTIFICAÇÃO EM TELA (TOAST) --- */

function exibirNotificacaoTela(mensagem) {
  let toast = document.getElementById('toast-notificacao');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notificacao';
    toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-500/30 px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all duration-300 opacity-0 -translate-y-5 pointer-events-none max-w-xs sm:max-w-md w-full justify-center';
    toast.innerHTML = `
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
      <span id="toast-mensagem-texto" class="text-xs font-bold tracking-wide"></span>
    `;
    document.body.appendChild(toast);
  }

  document.getElementById('toast-mensagem-texto').innerText = mensagem;

  setTimeout(() => {
    toast.classList.remove('opacity-0', '-translate-y-5', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-5', 'pointer-events-none');
  }, 4000);
}

/* --- CARREGAMENTO DINÂMICO DOS PRODUTOS DO BANCO --- */

async function carregarProdutosDoBanco() {
  const lojaAtiva = await checarStatusLoja();
  if (!lojaAtiva) return;

  await atualizarAvisoLojaFechada();

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('produtos')
        .select('*');

      if (!error && data && data.length > 0) {
        const produtosFormatados = data.map(p => ({
          id: p.id,
          cat: p.cat || 'burgers',
          nome: p.nome || 'Item sem nome',
          desc: p.descricao || p.desc || '',
          preco: parseFloat(p.preco) || 0,
          badge: p.badge || null,
          imagem: p.imagem || null,
          ativo: p.ativo !== false
        })).filter(p => p.ativo);

        if (produtosFormatados.length > 0) {
          PRODUTOS = produtosFormatados;
        }
      }
    } catch (err) {
      console.warn("Erro ao carregar produtos:", err);
    }
  }
  renderProdutos();
}

/* --- RENDERIZAÇÃO E CARDÁPIO --- */

function renderProdutos() {
  const container = document.getElementById('lista-produtos');
  if (!container) return;

  const filtrados = categoriaAtual === 'todos' 
    ? PRODUTOS 
    : PRODUTOS.filter(p => (p.cat || '').toLowerCase() === categoriaAtual.toLowerCase());

  if (!filtrados || filtrados.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-zinc-500 py-8">Nenhum produto cadastrado nesta categoria.</p>`;
    return;
  }

  container.innerHTML = filtrados.map(p => {
    const precoNum = parseFloat(p.preco) || 0;
    return `
      <div class="glass-card p-4 rounded-2xl transition-all duration-200">
        <div class="flex items-start gap-3">
          ${p.imagem ? `<img src="${p.imagem}" class="w-20 h-20 rounded-xl object-cover border border-zinc-800 flex-shrink-0">` : ''}
          <div class="flex-1">
            ${p.badge ? `<span class="inline-block bg-zinc-800 text-brand-500 border border-zinc-700/50 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase mb-2">${p.badge}</span>` : ''}
            <h3 class="font-bold text-white text-base tracking-tight">${p.nome}</h3>
            <p class="text-zinc-400 text-xs mt-1 leading-relaxed">${p.desc}</p>
            <div class="mt-3 flex items-center justify-between">
              <span class="text-brand-500 font-extrabold text-base">R$ ${precoNum.toFixed(2).replace('.', ',')}</span>
              <div class="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                <button onclick="alterarQtd('${p.id}', -1)" class="w-7 h-7 bg-zinc-800 text-white font-bold rounded-lg flex items-center justify-center">-</button>
                <span id="qtd-${p.id}" class="text-xs font-bold w-5 text-center text-white">${carrinho[p.id] || 0}</span>
                <button onclick="alterarQtd('${p.id}', 1)" class="w-7 h-7 bg-brand-600 text-white font-bold rounded-lg flex items-center justify-center">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarCategoria(cat) {
  categoriaAtual = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('bg-brand-600', 'text-white');
    btn.classList.add('bg-zinc-900', 'text-zinc-400');
  });

  const btnAtivo = document.getElementById(`cat-${cat}`);
  if (btnAtivo) {
    btnAtivo.classList.remove('bg-zinc-900', 'text-zinc-400');
    btnAtivo.classList.add('bg-brand-600', 'text-white');
  }

  renderProdutos();
}

function alterarQtd(id, delta) {
  carrinho[id] = (carrinho[id] || 0) + delta;
  if (carrinho[id] <= 0) delete carrinho[id];

  const el = document.getElementById(`qtd-${id}`);
  if (el) el.innerText = carrinho[id] || 0;
  atualizarBarra();
}

function atualizarBarra() {
  let totalItens = 0;
  let totalPreco = 0;

  Object.keys(carrinho).forEach(id => {
    const prod = PRODUTOS.find(p => p.id == id);
    if (prod) {
      totalItens += carrinho[id];
      totalPreco += (parseFloat(prod.preco) || 0) * carrinho[id];
    }
  });

  const barra = document.getElementById('bar-checkout');
  const btnFinalizar = barra ? barra.querySelector('button') : null;

  if (totalItens > 0) {
    barra.classList.remove('translate-y-full');
    document.getElementById('qtd-itens').innerText = `${totalItens} ${totalItens === 1 ? 'item selecionado' : 'itens selecionados'}`;
    document.getElementById('total-valor').innerText = `R$ ${totalPreco.toFixed(2).replace('.', ',')}`;

    if (!statusLojaCache.aberta && btnFinalizar) {
      btnFinalizar.innerText = "Loja Fechada";
      btnFinalizar.className = "bg-zinc-800 text-zinc-500 font-bold px-5 py-2.5 rounded-xl cursor-not-allowed";
    } else if (btnFinalizar) {
      btnFinalizar.innerText = "Ver Pedido →";
      btnFinalizar.className = "bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-brand-600/20";
    }
  } else {
    barra.classList.add('translate-y-full');
  }
}

/* --- MODAIS & CHECKOUT --- */

async function abrirModalCheckout() {
  const status = await verificarLojaAberta();
  if (status && status.aberta === false) {
    alert(`⚠️ LOJA FECHADA\n\n${status.motivo}`);
    return;
  }
  document.getElementById('modal-checkout').classList.remove('hidden');
}

function fecharModalCheckout() {
  document.getElementById('modal-checkout').classList.add('hidden');
}

function setTipoEntrega(tipo) {
  tipoEntrega = tipo;
  const btnDel = document.getElementById('btn-tipo-delivery');
  const btnRet = document.getElementById('btn-tipo-retirada');
  const campoEnd = document.getElementById('campo-endereco');
  const inputEnd = document.getElementById('cli-endereco');

  if (tipo === 'delivery') {
    btnDel.className = "bg-brand-600 text-white font-bold text-xs py-2.5 rounded-xl border border-brand-500";
    btnRet.className = "bg-zinc-900 text-zinc-400 font-bold text-xs py-2.5 rounded-xl border border-zinc-800";
    campoEnd.classList.remove('hidden');
    inputEnd.setAttribute('required', 'true');
  } else {
    btnRet.className = "bg-brand-600 text-white font-bold text-xs py-2.5 rounded-xl border border-brand-500";
    btnDel.className = "bg-zinc-900 text-zinc-400 font-bold text-xs py-2.5 rounded-xl border border-zinc-800";
    campoEnd.classList.add('hidden');
    inputEnd.removeAttribute('required');
  }
}

function toggleTroco(pagamento) {
  const campoTroco = document.getElementById('campo-troco');
  if (pagamento === 'Dinheiro') {
    campoTroco.classList.remove('hidden');
  } else {
    campoTroco.classList.add('hidden');
  }
}

function processarPedido(event) {
  event.preventDefault();

  const nome = document.getElementById('cli-nome').value;
  const endereco = tipoEntrega === 'delivery' ? document.getElementById('cli-endereco').value : 'Retirada no Balcão';
  const complemento = document.getElementById('cli-complemento').value;
  const pagamento = document.getElementById('cli-pagamento').value;
  const troco = document.getElementById('cli-troco').value;
  const obs = document.getElementById('cli-obs').value;

  let itensArray = [];
  let total = 0;

  Object.keys(carrinho).forEach(id => {
    const prod = PRODUTOS.find(p => p.id == id);
    if (prod) {
      const subtotal = (parseFloat(prod.preco) || 0) * carrinho[id];
      total += subtotal;
      itensArray.push({ nome: prod.nome, qtd: carrinho[id], preco_unitario: prod.preco });
    }
  });

  pedidoPendente = {
    cliente: nome,
    tipoEntrega: tipoEntrega,
    endereco: endereco,
    complemento: complemento,
    pagamento: pagamento,
    troco: troco,
    obs: obs,
    itens: itensArray,
    total: total
  };

  fecharModalCheckout();

  if (pagamento === 'Pix') {
    document.getElementById('pix-valor-total').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    document.getElementById('modal-pix').classList.remove('hidden');
  } else {
    finalizarEEnviarPedido(pedidoPendente);
  }
}

function copiarChavePix() {
  const chave = document.getElementById('pix-chave').innerText;
  navigator.clipboard.writeText(chave);
  const btn = document.getElementById('btn-copiar-pix');
  btn.innerText = '✓ Chave Copiada!';
  btn.classList.add('bg-emerald-600', 'text-white');
  setTimeout(() => {
    btn.innerText = '📋 Copiar Chave Pix';
    btn.classList.remove('bg-emerald-600', 'text-white');
  }, 3000);
}

function confirmarPagamentoPix() {
  if (pedidoPendente) {
    document.getElementById('modal-pix').classList.add('hidden');
    finalizarEEnviarPedido(pedidoPendente);
  }
}

function cancelarPix() {
  document.getElementById('modal-pix').classList.add('hidden');
  pedidoPendente = null;
}

/* --- ENVIO DO PEDIDO, NOTIFICAÇÃO, TELA DE ACOMPANHAMENTO E LIMPEZA --- */

async function finalizarEEnviarPedido(pedido) {
  const nomeRest = (typeof RESTAURANTE !== 'undefined' && RESTAURANTE && RESTAURANTE.nome) ? RESTAURANTE.nome : 'Zero Grau';
  const whatsRest = (typeof RESTAURANTE !== 'undefined' && RESTAURANTE && RESTAURANTE.whatsapp) ? RESTAURANTE.whatsapp : '5513999999999';

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    // Insere no banco e recupera o registro criado com a ID única
    const { data: novoPedido, error } = await supabaseClient.from('pedidos').insert([{
      cliente: pedido.cliente,
      tipo_entrega: pedido.tipoEntrega,
      endereco: pedido.endereco + (pedido.complemento ? ' (' + pedido.complemento + ')' : ''),
      pagamento: pedido.pagamento + (pedido.pagamento === 'Pix' ? ' (PAGO)' : ''),
      obs: pedido.obs,
      itens: pedido.itens,
      total: pedido.total,
      status: 'pendente'
    }]).select().single();

    if (error || !novoPedido) {
      console.error("❌ Erro ao salvar pedido no Supabase:", error?.message);
      alert("Atenção: Erro ao salvar pedido no banco de dados. " + error?.message);
      return;
    }

    const pedidoId = novoPedido.id;
    const linkAcompanhamento = `${window.location.origin}/pedido?id=${pedidoId}`;

    let texto = `*NOVO PEDIDO #${pedidoId} - ${nomeRest.toUpperCase()}*\n`;
    texto += `-----------------------------------\n`;
    texto += `👤 *Cliente:* ${pedido.cliente}\n`;
    texto += `🛵 *Tipo:* ${pedido.tipoEntrega.toUpperCase()}\n`;
    if (pedido.tipoEntrega === 'delivery') {
      texto += `📍 *Endereço:* ${pedido.endereco}${pedido.complemento ? ' (' + pedido.complemento + ')' : ''}\n`;
    }
    texto += `💳 *Pagamento:* ${pedido.pagamento}${pedido.pagamento === 'Pix' ? ' (CONFIRMADO ONLINE)' : ''}${pedido.troco ? ' (Troco p/: ' + pedido.troco + ')' : ''}\n`;
    texto += `-----------------------------------\n\n`;

    pedido.itens.forEach(i => {
      const subtotal = (parseFloat(i.preco_unitario) || 0) * i.qtd;
      texto += `• *${i.qtd}x* ${i.nome}\n  _R$ ${subtotal.toFixed(2).replace('.', ',')}_\n\n`;
    });

    if (pedido.obs) {
      texto += `📝 *Observações:* ${pedido.obs}\n\n`;
    }

    texto += `-----------------------------------\n`;
    texto += `*Valor Total:* R$ ${pedido.total.toFixed(2).replace('.', ',')}\n\n`;
    texto += `📍 *Acompanhe seu pedido em tempo real:* ${linkAcompanhamento}`;

    carrinho = {};
    atualizarBarra();
    renderProdutos();

    const formCheckout = document.getElementById('form-checkout');
    if (formCheckout) formCheckout.reset();
    pedidoPendente = null;

    exibirNotificacaoTela("✅ Pedido enviado com sucesso!");

    // Abre o WhatsApp para mandar o pedido
    window.open(`https://wa.me/${whatsRest}?text=${encodeURIComponent(texto)}`, '_blank');
    
    // Redireciona a tela do cliente para a página de acompanhamento
    setTimeout(() => {
      window.location.href = `pedido.html?id=${pedidoId}`;
    }, 1000);
  }
}

// Inicializa a página
carregarProdutosDoBanco();