// Senha de acesso definida para a cozinha
const SENHA_COZINHA_CORRETA = "cozinha123";

/* --- CONTROLE DE SESSÃO E LOGIN --- */

function verificarSessaoCozinha() {
  const logado = localStorage.getItem('cozinha_logada');
  const modalLogin = document.getElementById('modal-login-cozinha');
  const conteudoCozinha = document.getElementById('conteudo-cozinha');

  if (logado === 'true') {
    if (modalLogin) modalLogin.classList.add('hidden');
    if (conteudoCozinha) conteudoCozinha.classList.remove('hidden');
    carregarPedidosCozinha();
  } else {
    if (modalLogin) modalLogin.classList.remove('hidden');
    if (conteudoCozinha) conteudoCozinha.classList.add('hidden');
  }
}

function realizarLoginCozinha(event) {
  event.preventDefault();
  const senhaInput = document.getElementById('senha-cozinha-input').value;
  const msgErro = document.getElementById('msg-erro-login-cozinha');

  if (senhaInput === SENHA_COZINHA_CORRETA) {
    localStorage.setItem('cozinha_logada', 'true');
    if (msgErro) msgErro.classList.add('hidden');
    verificarSessaoCozinha();
  } else {
    if (msgErro) msgErro.classList.remove('hidden');
  }
}

function logoutCozinha() {
  localStorage.removeItem('cozinha_logada');
  verificarSessaoCozinha();
}

/* --- CARREGAMENTO DE COMANDAS --- */

async function carregarPedidosCozinha() {
  const container = document.getElementById('lista-pedidos-kds') || document.getElementById('lista-comandas');

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      // 1. Checa status da assinatura do restaurante
      const { data: restaurante, error: erroStatus } = await supabaseClient
        .from('restaurantes')
        .select('status_assinatura')
        .limit(1)
        .single();

      if (!erroStatus && restaurante?.status_assinatura === 'suspenso') {
        document.body.innerHTML = `
          <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#18181b; color:#fff; font-family:sans-serif; text-align:center; padding:20px;">
            <div>
              <h1 style="color:#ef4444; font-size:2rem; margin-bottom:10px;">Sistema Suspenso ⚠️</h1>
              <p style="color:#a1a1aa;">A mensalidade do seu painel está pendente.</p>
              <p style="color:#71717a; font-size:0.9rem; margin-top:5px;">Entre em contato com o suporte para regularizar o acesso.</p>
            </div>
          </div>
        `;
        return;
      }

      // 2. Carrega pedidos 'pendente' e 'em_preparo'
      const { data: pedidos, error: erroPedidos } = await supabaseClient
        .from('pedidos')
        .select('*')
        .in('status', ['pendente', 'em_preparo'])
        .order('id', { ascending: false });

      if (erroPedidos) {
        console.error("Erro no Supabase ao buscar pedidos:", erroPedidos.message);
        return;
      }

      // Atualiza o contador de pendentes e em preparo no topo
      const contadorEl = document.getElementById('kds-count-pendentes') || 
                         document.getElementById('qtd-pendentes') || 
                         document.getElementById('contador-pedidos');

      if (contadorEl) {
        contadorEl.innerText = pedidos ? pedidos.length : 0;
      }

      if (container) {
        if (!pedidos || pedidos.length === 0) {
          container.innerHTML = `
            <div class="col-span-full text-center py-20 text-zinc-500 font-bold text-sm">
              Nenhum pedido pendente ou em preparo na cozinha.
            </div>
          `;
          return;
        }

        container.innerHTML = pedidos.map(pedido => {
          const tempo = calcularTempoEspera(pedido.created_at);
          const emPreparo = pedido.status === 'em_preparo';
          
          let itens = [];
          try {
            itens = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : (pedido.itens || []);
          } catch(e) {
            itens = [];
          }

          return `
            <div class="bg-zinc-900 border ${emPreparo ? 'border-orange-500/50 shadow-orange-950/20' : 'border-zinc-800'} rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all">
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                  <div>
                    <span class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pedido #${pedido.id ? pedido.id.toString().slice(0, 5) : '---'}</span>
                    <h3 class="text-lg font-bold text-white mt-0.5">${pedido.cliente || 'Cliente'}</h3>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <span class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${emPreparo ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                      ${emPreparo ? '🔥 EM PREPARO' : '⏳ PENDENTE'}
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${tempo.classe}">${tempo.texto}</span>
                  </div>
                </div>

                <div class="space-y-2 mb-4">
                  ${itens.map(item => `
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-zinc-200 font-semibold">
                        <strong class="text-brand-500 mr-1.5">${item.qtd || 1}x</strong> ${item.nome || item.produto || 'Item'}
                      </span>
                    </div>
                  `).join('')}
                </div>

                ${pedido.obs ? `
                  <div class="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 mb-4">
                    <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">Observação:</span>
                    <p class="text-xs text-zinc-300 italic">${pedido.obs}</p>
                  </div>
                ` : ''}
              </div>

              <div class="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                <button onclick="imprimirComanda('${pedido.id}')" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs px-3 py-2.5 rounded-xl transition-colors flex items-center gap-1.5">
                  🖨️
                </button>

                ${!emPreparo ? `
                  <button onclick="iniciarPreparo('${pedido.id}')" class="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex-1 shadow-lg shadow-orange-600/20">
                    🔥 Iniciar Preparo
                  </button>
                ` : `
                  <button onclick="concluirPedido('${pedido.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex-1 shadow-lg shadow-emerald-600/20">
                    ✓ Finalizar Pedido
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      }

    } catch (err) {
      console.error("Erro de execução na cozinha:", err);
    }
  }
}

/* --- ALTERAÇÕES DE STATUS DO PEDIDO --- */

async function iniciarPreparo(id) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    const { error } = await supabaseClient
      .from('pedidos')
      .update({ status: 'em_preparo' })
      .eq('id', id);

    if (!error) {
      carregarPedidosCozinha();
    } else {
      console.error("Erro ao iniciar preparo:", error.message);
    }
  }
}

async function concluirPedido(id) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    const { error } = await supabaseClient
      .from('pedidos')
      .update({ status: 'concluido' })
      .eq('id', id);

    if (!error) {
      carregarPedidosCozinha();
    } else {
      console.error("Erro ao concluir pedido:", error.message);
    }
  }
}

/* --- IMPRESSÃO TÉRMICA --- */

async function imprimirComanda(id) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

  const { data: pedido, error } = await supabaseClient
    .from('pedidos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !pedido) {
    alert("Erro ao buscar detalhes do pedido para impressão.");
    return;
  }

  let itens = [];
  try {
    itens = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : (pedido.itens || []);
  } catch(e) {
    itens = [];
  }

  const dataFormatada = new Date(pedido.created_at).toLocaleString('pt-BR');

  let cupomHTML = `
    <div style="font-family: monospace; font-size: 12px; width: 100%; color: #000;">
      <h2 style="text-align: center; margin: 0; font-size: 16px; font-weight: bold;">ZERO GRAU</h2>
      <p style="text-align: center; margin: 2px 0 8px 0;">--------------------------------</p>
      <p style="margin: 2px 0;"><b>PEDIDO: #${pedido.id ? pedido.id.toString().slice(0, 5) : '---'}</b></p>
      <p style="margin: 2px 0;">Data: ${dataFormatada}</p>
      <p style="margin: 2px 0;">Cliente: <b>${pedido.cliente || 'Cliente'}</b></p>
      <p style="margin: 2px 0;">Tipo: <b>${(pedido.tipo_entrega || 'Delivery').toUpperCase()}</b></p>
      ${pedido.endereco ? `<p style="margin: 2px 0;">Endereço: ${pedido.endereco}</p>` : ''}
      <p style="margin: 2px 0;">Pagamento: ${pedido.pagamento || 'Não informado'}</p>
      <p style="text-align: center; margin: 6px 0;">--------------------------------</p>
      <p style="margin: 4px 0;"><b>ITENS DO PEDIDO:</b></p>
  `;

  itens.forEach(item => {
    cupomHTML += `<p style="margin: 4px 0; font-size: 13px;"><b>${item.qtd || 1}x</b> ${item.nome || item.produto}</p>`;
  });

  if (pedido.obs) {
    cupomHTML += `
      <p style="text-align: center; margin: 6px 0;">--------------------------------</p>
      <p style="margin: 2px 0;"><b>OBSERVAÇÃO:</b></p>
      <p style="margin: 2px 0; font-style: italic;">${pedido.obs}</p>
    `;
  }

  cupomHTML += `
      <p style="text-align: center; margin: 6px 0;">--------------------------------</p>
      <h3 style="margin: 6px 0; font-size: 14px;">TOTAL: R$ ${parseFloat(pedido.total || 0).toFixed(2).replace('.', ',')}</h3>
      <p style="text-align: center; margin-top: 12px;">================================</p>
    </div>
  `;

  const areaImpressao = document.getElementById('comanda-impressao');
  if (areaImpressao) {
    areaImpressao.innerHTML = cupomHTML;
    areaImpressao.classList.remove('hidden');
    window.print();
    areaImpressao.classList.add('hidden');
  }
}

/* --- CALCULA TEMPO DE ESPERA --- */

function calcularTempoEspera(dataString) {
  if (!dataString) return { texto: "Recente", classe: "bg-zinc-800 text-zinc-300" };

  const dataCriacao = new Date(dataString);
  const agora = new Date();
  const diffMinutos = Math.floor((agora - dataCriacao) / 60000);

  if (diffMinutos < 1) return { texto: "Agora mesmo", classe: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
  if (diffMinutos < 15) return { texto: `${diffMinutos} min atrás`, classe: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
  if (diffMinutos < 30) return { texto: `${diffMinutos} min atrás`, classe: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };

  return { texto: `⚠️ ${diffMinutos} min atrás`, classe: "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" };
}

// Inicializa verificação de sessão e atualiza a cada 5 segundos
verificarSessaoCozinha();
setInterval(() => {
  if (localStorage.getItem('cozinha_logada') === 'true') {
    carregarPedidosCozinha();
  }
}, 5000);