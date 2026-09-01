const SENHA_ADMIN_CORRETA = "admin123";

/* --- AUTENTICAÇÃO DO ADMIN --- */

function verificarSessaoAdmin() {
  const logado = localStorage.getItem('admin_logado');
  const modalLogin = document.getElementById('modal-login-admin');
  const conteudoAdmin = document.getElementById('conteudo-admin');

  if (logado === 'true') {
    if (modalLogin) modalLogin.classList.add('hidden');
    if (conteudoAdmin) conteudoAdmin.classList.remove('hidden');
    carregarDadosAdmin();
  } else {
    if (modalLogin) modalLogin.classList.remove('hidden');
    if (conteudoAdmin) conteudoAdmin.classList.add('hidden');
  }
}

function realizarLoginAdmin(event) {
  event.preventDefault();
  const senhaInput = document.getElementById('senha-admin-input').value;
  const msgErro = document.getElementById('msg-erro-login');

  if (senhaInput === SENHA_ADMIN_CORRETA) {
    localStorage.setItem('admin_logado', 'true');
    if (msgErro) msgErro.classList.add('hidden');
    verificarSessaoAdmin();
  } else {
    if (msgErro) msgErro.classList.remove('hidden');
  }
}

function logoutAdmin() {
  localStorage.removeItem('admin_logado');
  verificarSessaoAdmin();
}

/* --- CARREGAMENTO DE DADOS E RELATÓRIOS --- */

async function carregarDadosAdmin() {
  await carregarStatusHorariosLoja();
  await carregarRelatorioVendas();
  await carregarListaProdutosAdmin();
}

async function carregarStatusHorariosLoja() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from('restaurantes').select('*').limit(1).single();
    if (!error && data) {
      const btnToggle = document.getElementById('admin-btn-toggle-loja');
      if (btnToggle) {
        if (data.loja_aberta) {
          btnToggle.className = "bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition";
          btnToggle.innerText = "🟢 Loja ABERTA (Clique p/ Fechar)";
          btnToggle.onclick = () => alternarStatusLoja(false);
        } else {
          btnToggle.className = "bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition";
          btnToggle.innerText = "🔴 Loja FECHADA (Clique p/ Abrir)";
          btnToggle.onclick = () => alternarStatusLoja(true);
        }
      }
      if (document.getElementById('admin-hora-abertura')) document.getElementById('admin-hora-abertura').value = data.hora_abertura || '';
      if (document.getElementById('admin-hora-fechamento')) document.getElementById('admin-hora-fechamento').value = data.hora_fechamento || '';
    }
  } catch (err) {
    console.warn("Erro ao buscar restaurantes:", err);
  }
}

async function alternarStatusLoja(novoStatus) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from('restaurantes').update({ loja_aberta: novoStatus }).neq('id', 0);
  if (error) {
    alert("Erro ao alterar status no Supabase: " + error.message);
  } else {
    carregarStatusHorariosLoja();
  }
}

async function salvarHorariosAtendimento(e) {
  e.preventDefault();
  if (!supabaseClient) return;
  const hA = document.getElementById('admin-hora-abertura').value;
  const hF = document.getElementById('admin-hora-fechamento').value;

  const { error } = await supabaseClient.from('restaurantes').update({ hora_abertura: hA, hora_fechamento: hF }).neq('id', 0);
  if (error) {
    alert("Erro ao salvar horários: " + error.message);
  } else {
    alert("Horários salvos com sucesso!");
  }
}

/* --- CADASTRO DE PRODUTO (FIX: APENAS COLUNA 'DESCRICAO') --- */

async function salvarProduto(e) {
  e.preventDefault();
  if (!supabaseClient) {
    alert("Erro de conexão com o banco de dados.");
    return;
  }

  const btnSalvar = document.getElementById('btn-salvar');
  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando produto...";
  }

  try {
    const nome = document.getElementById('p-nome').value;
    const cat = document.getElementById('p-cat').value;
    const preco = parseFloat(document.getElementById('p-preco').value.replace(',', '.'));
    const badge = document.getElementById('p-badge')?.value || '';
    const desc = document.getElementById('p-desc')?.value || '';
    const fileInput = document.getElementById('p-imagem-file');

    let imagemUrl = '';

    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('produtos').upload(fileName, file);

      if (uploadError) {
        console.warn("Erro ao subir imagem:", uploadError.message);
      } else if (uploadData) {
        const { data: publicUrlData } = supabaseClient.storage.from('produtos').getPublicUrl(fileName);
        imagemUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabaseClient.from('produtos').insert([{
      nome: nome,
      cat: cat,
      preco: preco,
      badge: badge,
      descricao: desc,
      imagem: imagemUrl,
      ativo: true
    }]);

    if (error) {
      console.error("❌ Erro do Supabase:", error);
      alert(`⚠️ Erro do Banco de Dados:\n\n${error.message}`);
    } else {
      document.getElementById('form-add-produto').reset();
      await carregarListaProdutosAdmin();
      alert("✅ Produto cadastrado com sucesso!");
    }

  } catch (err) {
    console.error("Erro no script:", err);
    alert("Erro inesperado ao cadastrar produto.");
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar Produto no Cardápio";
    }
  }
}

async function carregarListaProdutosAdmin() {
  const container = document.getElementById('lista-admin-produtos');
  if (!container || !supabaseClient) return;

  container.innerHTML = `<p class="text-xs text-zinc-500">Carregando produtos...</p>`;

  const { data: produtos, error } = await supabaseClient.from('produtos').select('*').order('id', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="text-xs text-red-400">Erro ao listar produtos: ${error.message}</p>`;
    return;
  }

  if (!produtos || produtos.length === 0) {
    container.innerHTML = `<p class="text-xs text-zinc-500">Nenhum produto cadastrado no momento.</p>`;
    return;
  }

  container.innerHTML = produtos.map(p => `
    <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 overflow-hidden">
        ${p.imagem ? `<img src="${p.imagem}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0">` : `<div class="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center text-lg flex-shrink-0">🍔</div>`}
        <div class="truncate">
          <h4 class="font-bold text-white text-sm truncate">${p.nome}</h4>
          <p class="text-xs text-brand-500 font-extrabold">R$ ${parseFloat(p.preco || 0).toFixed(2).replace('.', ',')} - <span class="text-zinc-500 font-normal uppercase">${p.cat || 'geral'}</span></p>
        </div>
      </div>
      <button onclick="deletarProduto(${p.id})" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/20 transition flex-shrink-0">
        Excluir
      </button>
    </div>
  `).join('');
}

async function deletarProduto(id) {
  if (confirm("Deseja realmente excluir este produto?")) {
    const { error } = await supabaseClient.from('produtos').delete().eq('id', id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
    } else {
      carregarListaProdutosAdmin();
    }
  }
}

async function carregarRelatorioVendas() {
  const container = document.getElementById('relatorio-vendas-container');
  if (!container || !supabaseClient) return;

  const { data: pedidos } = await supabaseClient.from('pedidos').select('*');
  const totalPedidos = pedidos ? pedidos.length : 0;
  const faturamento = pedidos ? pedidos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0) : 0;

  container.innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <span class="text-xs font-bold text-zinc-500 uppercase block mb-1">Total de Pedidos</span>
        <span class="text-2xl font-black text-white">${totalPedidos}</span>
      </div>
      <div class="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <span class="text-xs font-bold text-zinc-500 uppercase block mb-1">Faturamento Total</span>
        <span class="text-2xl font-black text-emerald-400 font-mono">R$ ${faturamento.toFixed(2).replace('.', ',')}</span>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  verificarSessaoAdmin();
});