/* --- GESTÃO DE PRODUTOS --- */

async function carregarProdutosAdmin() {
  const container = document.getElementById('lista-admin-produtos');
  if (!container) return;

  if (!supabaseClient) {
    container.innerHTML = `<p class="text-xs text-red-400 font-bold">⚠️ Conexão não configurada no js/config.js</p>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from('produtos')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="text-xs text-red-400 font-bold">Erro ao buscar dados: ${error.message}</p>`;
    return;
  }

  if (!data || !data.length) {
    container.innerHTML = `<p class="text-xs text-zinc-500">Nenhum produto cadastrado ainda.</p>`;
    return;
  }

  container.innerHTML = data.map(p => `
    <div class="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-1">
        ${p.imagem ? `<img src="${p.imagem}" class="w-12 h-12 rounded-lg object-cover border border-zinc-800">` : `<div class="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center text-xs text-zinc-600 font-bold">Sem Foto</div>`}
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-white text-sm">${p.nome}</span>
            ${p.badge ? `<span class="bg-zinc-800 text-brand-500 text-[10px] font-bold px-2 py-0.5 rounded">${p.badge}</span>` : ''}
            <span class="text-[10px] text-zinc-500 uppercase font-semibold">(${p.cat})</span>
          </div>
          <p class="text-xs text-zinc-400 mt-0.5">${p.descricao || 'Sem descrição'}</p>
          <span class="text-sm font-black text-brand-500 mt-1 block">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      <button onclick="deletarProduto(${p.id})" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold px-3 py-2 rounded-xl transition">
        Excluir
      </button>
    </div>
  `).join('');
}

async function salvarProduto(e) {
  e.preventDefault();

  if (!supabaseClient) {
    alert('Configure o Supabase no js/config.js primeiro!');
    return;
  }

  const btnSalvar = document.getElementById('btn-salvar');
  if (btnSalvar) {
    btnSalvar.innerText = 'Enviando imagem e salvando...';
    btnSalvar.disabled = true;
  }

  try {
    const nome = document.getElementById('p-nome').value;
    const cat = document.getElementById('p-cat').value;
    const precoRaw = document.getElementById('p-preco').value.replace(',', '.');
    const preco = parseFloat(precoRaw);
    const badge = document.getElementById('p-badge').value;
    const descricao = document.getElementById('p-desc').value;
    const fileInput = document.getElementById('p-imagem-file');

    let imagemUrl = null;

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('produtos')
        .upload(fileName, file);

      if (uploadError) {
        alert('Erro ao fazer upload da imagem: ' + uploadError.message);
        if (btnSalvar) {
          btnSalvar.innerText = 'Salvar Produto no Cardápio';
          btnSalvar.disabled = false;
        }
        return;
      }

      const { data: urlData } = supabaseClient
        .storage
        .from('produtos')
        .getPublicUrl(fileName);

      imagemUrl = urlData.publicUrl;
    }

    const { error } = await supabaseClient
      .from('produtos')
      .insert([{ nome, cat, preco, badge, imagem: imagemUrl, descricao, ativo: true }]);

    if (!error) {
      document.getElementById('form-add-produto').reset();
      carregarProdutosAdmin();
    } else {
      alert('Erro ao salvar produto: ' + error.message);
    }
  } catch (err) {
    alert('Erro: ' + err.message);
  } finally {
    if (btnSalvar) {
      btnSalvar.innerText = 'Salvar Produto no Cardápio';
      btnSalvar.disabled = false;
    }
  }
}

async function deletarProduto(id) {
  if (confirm('Deseja realmente remover este item do cardápio?')) {
    await supabaseClient.from('produtos').delete().eq('id', id);
    carregarProdutosAdmin();
  }
}

/* --- MÓDULO DE RELATÓRIO DE VENDAS --- */

async function carregarRelatorioVendas() {
  const container = document.getElementById('relatorio-vendas-container');
  if (!container || !supabaseClient) return;

  const { data: pedidos, error } = await supabaseClient
    .from('pedidos')
    .select('*');

  if (error || !pedidos) {
    container.innerHTML = `<p class="text-xs text-red-400">Erro ao carregar relatório: ${error?.message}</p>`;
    return;
  }

  let totalFaturado = 0;
  let concluidosQtd = 0;
  let pendentesQtd = 0;

  pedidos.forEach(p => {
    totalFaturado += parseFloat(p.total || 0);
    if (p.status === 'concluido') concluidosQtd++;
    else pendentesQtd++;
  });

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <span class="text-xs font-bold text-zinc-500 uppercase">Faturamento Total</span>
        <h3 class="text-xl font-black text-emerald-400 mt-1">R$ ${totalFaturado.toFixed(2).replace('.', ',')}</h3>
      </div>
      <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <span class="text-xs font-bold text-zinc-500 uppercase">Pedidos Finalizados</span>
        <h3 class="text-xl font-black text-white mt-1">${concluidosQtd}</h3>
      </div>
      <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <span class="text-xs font-bold text-zinc-500 uppercase">Pedidos Pendentes</span>
        <h3 class="text-xl font-black text-amber-400 mt-1">${pendentesQtd}</h3>
      </div>
    </div>
  `;
}

/* --- CONTROLE DE HORÁRIO E STATUS DA LOJA --- */

async function carregarStatusLojaAdmin() {
  if (!supabaseClient) return;

  const { data: config } = await supabaseClient
    .from('restaurantes')
    .select('loja_aberta, hora_abertura, hora_fechamento')
    .limit(1)
    .single();

  if (config) {
    const inputAbertura = document.getElementById('admin-hora-abertura');
    const inputFechamento = document.getElementById('admin-hora-fechamento');
    const btnToggle = document.getElementById('admin-btn-toggle-loja');

    if (inputAbertura) inputAbertura.value = config.hora_abertura || '18:00';
    if (inputFechamento) inputFechamento.value = config.hora_fechamento || '23:59';

    if (btnToggle) {
      btnToggle.innerText = config.loja_aberta ? "🟢 Loja ABERTA (Clique p/ Fechar)" : "🔴 Loja FECHADA (Clique p/ Abrir)";
      btnToggle.className = config.loja_aberta 
        ? "bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
        : "bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition";
      btnToggle.onclick = () => alternarStatusLoja(!config.loja_aberta);
    }
  }
}

async function alternarStatusLoja(novoStatus) {
  if (!supabaseClient) return;

  const { data: rest } = await supabaseClient.from('restaurantes').select('id').limit(1).single();
  if (rest) {
    await supabaseClient
      .from('restaurantes')
      .update({ loja_aberta: novoStatus })
      .eq('id', rest.id);
  }

  carregarStatusLojaAdmin();
}

async function salvarHorariosAtendimento(e) {
  if (e) e.preventDefault();
  if (!supabaseClient) return;

  const hAbertura = document.getElementById('admin-hora-abertura').value;
  const hFechamento = document.getElementById('admin-hora-fechamento').value;

  const { data: rest } = await supabaseClient.from('restaurantes').select('id').limit(1).single();
  if (rest) {
    await supabaseClient
      .from('restaurantes')
      .update({ hora_abertura: hAbertura, hora_fechamento: hFechamento })
      .eq('id', rest.id);
    alert("Horários atualizados com sucesso!");
  }

  carregarStatusLojaAdmin();
}

// Inicialização
carregarProdutosAdmin();
carregarRelatorioVendas();
carregarStatusLojaAdmin();