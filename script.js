// ==== CONFIGURAÇÃO SUPABASE ====
const SUPABASE_URL = 'https://xzzfkenqdxetkvalnoix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4yK_vp6F3Nb8cZkFuhQt3A_Fhxw6A7h';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentEmpresa = null;
let currentUserRole = 'admin';
let saldoAutomatico = false; // true quando o gatilho de saldo do banco (seguranca_banco.sql) está ativo
let chartGastos = null, chartCategorias = null, chartRelatorio = null;
let editContext = null; // { type: 'motorista', id: '...' } quando editando, null quando adicionando
let data = {
    motoristas: [], funcionarios: [], veiculos: [], clientes: [],
    abastecimentos: [], pneus: [], oleos: [], preventivas: [], corretivas: [], multas: [],
    bancos: [], financeiro: [], rotas: [],
    produtos: [], estoque_movimentacoes: [], agenda: [], turismo_viagens: [], escala_rotas: [],
    rotas_fixas: [], financeiro_categorias: [], bomba_cargas: [], contas_pagar: [], contas_receber: [], galao_oleo_cargas: [],
};


// ==== UI HELPERS (avisos, confirmações e escolhas dentro do próprio sistema) ====
(function injetarEstilosUI() {
    if (document.getElementById('ui-extra-css')) return;
    const css = `
    .ui-toast-box { position: fixed; top: 16px; right: 16px; z-index: 100000; display: flex; flex-direction: column; gap: 8px; max-width: min(380px, calc(100vw - 32px)); }
    .ui-toast { padding: 12px 14px; border-radius: 8px; color: #fff; font-size: 14px; line-height: 1.35; box-shadow: 0 4px 14px rgba(0,0,0,.25); cursor: pointer; animation: ui-in .18s ease; }
    .ui-toast.erro { background: #c62828; } .ui-toast.aviso { background: #ef6c00; }
    .ui-toast.ok { background: #2e7d32; } .ui-toast.info { background: #0066cc; }
    @keyframes ui-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
    .ui-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 100001; padding: 16px; }
    .ui-dialog { background: #fff; border-radius: 12px; padding: 22px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,.3); max-height: 90vh; overflow-y: auto; }
    .ui-dialog.largo { max-width: 760px; }
    .ui-dialog h3 { margin: 0 0 10px; font-size: 17px; color: #222; }
    .ui-dialog p { margin: 0 0 14px; color: #444; white-space: pre-line; font-size: 14px; line-height: 1.45; }
    .ui-dialog input[type=text], .ui-dialog select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; margin-bottom: 14px; box-sizing: border-box; }
    .ui-dialog .ui-btns { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
    .ui-dialog button { padding: 9px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; }
    .ui-btn-ok { background: #0066cc; color: #fff; } .ui-btn-cancel { background: #e0e0e0; color: #333; } .ui-btn-danger { background: #c62828; color: #fff; }
    .campo-invalido { border-color: #c62828 !important; box-shadow: 0 0 0 2px rgba(198,40,40,.15); }
    `;
    const st = document.createElement('style'); st.id = 'ui-extra-css'; st.textContent = css; document.head.appendChild(st);
})();

function toast(msg, tipo = 'info', ms = 5000) {
    let box = document.getElementById('ui-toast-box');
    if (!box) { box = document.createElement('div'); box.id = 'ui-toast-box'; box.className = 'ui-toast-box'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'ui-toast ' + tipo; el.textContent = msg; el.setAttribute('role', 'alert');
    el.onclick = () => el.remove();
    box.appendChild(el);
    setTimeout(() => el.remove(), ms);
}
function avisar(msg) { toast(msg, 'aviso', 6500); }

// Diálogo genérico: devolve uma Promise com o valor escolhido (ou null se cancelar)
function _dialogo({ titulo = '', texto = '', campo = null, opcoes = null, okLabel = 'OK', cancelLabel = 'Cancelar', perigo = false, semCancelar = false }) {
    return new Promise(resolve => {
        const anterior = document.activeElement;
        const ov = document.createElement('div'); ov.className = 'ui-overlay';
        const box = document.createElement('div'); box.className = 'ui-dialog'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
        const h = document.createElement('h3'); h.textContent = titulo; if (titulo) box.appendChild(h);
        const p = document.createElement('p'); p.textContent = texto; box.appendChild(p);
        let entrada = null;
        if (campo !== null) { entrada = document.createElement('input'); entrada.type = 'text'; entrada.value = campo; box.appendChild(entrada); }
        if (opcoes) {
            entrada = document.createElement('select');
            opcoes.forEach(o => { const op = document.createElement('option'); op.value = o.valor; op.textContent = o.rotulo; entrada.appendChild(op); });
            box.appendChild(entrada);
        }
        const btns = document.createElement('div'); btns.className = 'ui-btns';
        const fechar = (valor) => { document.removeEventListener('keydown', teclas, true); ov.remove(); if (anterior && anterior.focus) try { anterior.focus(); } catch (e) {} resolve(valor); };
        if (!semCancelar) {
            const bc = document.createElement('button'); bc.type = 'button'; bc.className = 'ui-btn-cancel'; bc.textContent = cancelLabel;
            bc.onclick = () => fechar(null); btns.appendChild(bc);
        }
        const bo = document.createElement('button'); bo.type = 'button'; bo.className = perigo ? 'ui-btn-danger' : 'ui-btn-ok'; bo.textContent = okLabel;
        bo.onclick = () => fechar(entrada ? entrada.value : true); btns.appendChild(bo);
        box.appendChild(btns); ov.appendChild(box); document.body.appendChild(ov);
        function teclas(e) {
            if (e.key === 'Escape') { e.stopPropagation(); fechar(null); }
            else if (e.key === 'Enter' && (!entrada || document.activeElement === entrada || entrada.tagName === 'SELECT')) { e.preventDefault(); bo.click(); }
        }
        document.addEventListener('keydown', teclas, true);
        (entrada || bo).focus(); if (entrada && entrada.select) entrada.select();
    });
}
async function confirmar(texto, { titulo = 'Confirmar', okLabel = 'Confirmar', perigo = false } = {}) {
    const r = await _dialogo({ titulo, texto, okLabel, perigo });
    return r === true;
}
async function perguntar(texto, valorPadrao = '', titulo = 'Informe') {
    const r = await _dialogo({ titulo, texto, campo: valorPadrao, okLabel: 'OK' });
    return r === null ? null : String(r).trim() || null;
}
async function escolherBanco(titulo, texto) {
    if (!data.bancos.length) { avisar('Cadastre um banco primeiro.'); return null; }
    const opcoes = data.bancos.map(b => ({ valor: b.id, rotulo: `${b.nome} — saldo R$ ${Number(b.saldo || 0).toFixed(2)}` }));
    const id = await _dialogo({ titulo, texto, opcoes, okLabel: 'Confirmar' });
    return id ? data.bancos.find(b => String(b.id) === String(id)) || null : null;
}

// Mensagens de erro em português claro (em vez do texto técnico do banco)
function mensagemErroAmigavel(error) {
    const msg = String(error?.message || error || '');
    const code = String(error?.code || '');
    if (!navigator.onLine || /Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sem conexão com a internet. Verifique a rede e tente de novo.';
    if (/JWT expired|Invalid Refresh Token|not authenticated/i.test(msg)) return 'Sua sessão expirou. Saia e entre novamente.';
    if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Você não tem permissão para fazer essa ação. Fale com o administrador.';
    if (code === '23505' || /duplicate key/i.test(msg)) return 'Já existe um registro com esses dados.';
    if (code === '23503' || /foreign key/i.test(msg)) return 'Não é possível concluir: esse registro está ligado a outros dados do sistema.';
    if (code === '23502' || /null value in column/i.test(msg)) { const c = msg.match(/column "([^"]+)"/)?.[1]; return `Falta preencher um campo obrigatório${c ? ' (' + c + ')' : ''}.`; }
    if (code === '22P02' || /invalid input syntax/i.test(msg)) return 'Algum campo foi preenchido com um valor inválido. Confira os dados e tente de novo.';
    if (code === '22003' || /numeric field overflow|out of range/i.test(msg)) return 'Um dos valores digitados é grande demais.';
    if (code === 'PGRST204' || code === '42703' || /Could not find the '.*' column|column .* does not exist/i.test(msg)) {
        const c = msg.match(/'([^']+)' column/)?.[1] || msg.match(/column "?([A-Za-z0-9_]+)"?/)?.[1];
        return `O banco de dados ainda não tem a coluna${c ? ' "' + c + '"' : ''}. Rode o arquivo alteracoes_banco.sql no Supabase (SQL Editor) e tente de novo.`;
    }
    if (code === '42P01' || /relation .* does not exist|Could not find the table/i.test(msg)) return 'Falta criar uma tabela no banco de dados. Rode o arquivo seguranca_banco.sql no Supabase (SQL Editor).';
    return 'Não foi possível concluir a ação. ' + (msg ? '(' + msg + ')' : 'Tente novamente.');
}
function alertErro(error) { console.error(error); toast(mensagemErroAmigavel(error), 'erro', 9000); }

// ==== VALIDAÇÕES E MÁSCARAS ====
function somenteDigitos(s) { return String(s || '').replace(/\D/g, ''); }
function validarCPF(valor) {
    const d = somenteDigitos(valor);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    for (let t = 9; t < 11; t++) {
        let soma = 0; for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
        const dig = ((soma * 10) % 11) % 10; if (dig !== Number(d[t])) return false;
    }
    return true;
}
function validarCNPJ(valor) {
    const d = somenteDigitos(valor);
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const calc = (base) => { let soma = 0, peso = base.length - 7; for (let i = 0; i < base.length; i++) { soma += Number(base[i]) * peso--; if (peso < 2) peso = 9; } const r = soma % 11; return r < 2 ? 0 : 11 - r; };
    return calc(d.slice(0, 12)) === Number(d[12]) && calc(d.slice(0, 13)) === Number(d[13]);
}
function validarCpfCnpj(valor) { const d = somenteDigitos(valor); return d.length === 11 ? validarCPF(d) : d.length === 14 ? validarCNPJ(d) : false; }
function validarPlaca(valor) { const p = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return /^[A-Z]{3}\d{4}$/.test(p) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(p); }
function validarTelefone(valor) { const n = somenteDigitos(valor).length; return n === 10 || n === 11; }

function marcarCampoInvalido(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('campo-invalido'); el.focus(); el.addEventListener('input', () => el.classList.remove('campo-invalido'), { once: true }); }
    avisar(msg);
    return false;
}
// Validação "suave": avisa e deixa o usuário decidir se salva mesmo assim (dados antigos/atípicos)
async function validarOuConfirmar(ok, id, msg) {
    if (ok) return true;
    const el = document.getElementById(id); if (el) el.classList.add('campo-invalido');
    return await confirmar(msg + '\n\nSalvar mesmo assim?', { titulo: 'Confira o dado', okLabel: 'Salvar mesmo assim' });
}

function mascaraCPF(v) { const d = somenteDigitos(v).slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function mascaraCpfCnpj(v) {
    const d = somenteDigitos(v).slice(0, 14);
    if (d.length <= 11) return mascaraCPF(d);
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
function mascaraTelefone(v) {
    const d = somenteDigitos(v).slice(0, 11);
    if (d.length <= 2) return d ? '(' + d : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function mascaraCEP(v) { const d = somenteDigitos(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; }
function mascaraPlaca(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8); }
const MASCARAS_CAMPOS = {
    motoristaCPF: mascaraCPF, funcionarioCPF: mascaraCPF, clienteCPF: mascaraCpfCnpj,
    motoristaTelefone: mascaraTelefone, funcionarioTelefone: mascaraTelefone, clienteTelefone: mascaraTelefone,
    clienteCep: mascaraCEP, veiculoPlaca: mascaraPlaca
};
['input', 'focusin'].forEach(evento => document.addEventListener(evento, e => {
    const fn = MASCARAS_CAMPOS[e.target && e.target.id];
    if (fn) { const novo = fn(e.target.value); if (novo !== e.target.value) e.target.value = novo; }
}));

// Data de hoje no fuso local (toISOString usa UTC e vira "amanhã" à noite no Brasil)
function hojeISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// ==== PERMISSÕES POR PERFIL ====
// admin: tudo | financeiro: parte financeira + consulta | operacional: dia a dia da frota
const PERMISSOES_PAGINAS = {
    admin: null,
    financeiro: ['dashboard', 'agenda', 'controle', 'turismo', 'clientes', 'financeiro', 'bancos', 'multas', 'desempenho', 'relatorios', 'dre', 'aniversarios'],
    operacional: ['dashboard', 'agenda', 'controle', 'rotas', 'turismo', 'clientes', 'veiculos', 'estoque', 'manutencoes', 'multas', 'aniversarios']
};
function paginaPermitida(pagina) {
    if (pagina === 'configuracoes') return currentUserRole === 'admin';
    const lista = PERMISSOES_PAGINAS[currentUserRole];
    return !lista || lista.includes(pagina);
}

// ==== ANEXOS: botão 📎 nas tabelas (a janela em si fica em modulos.js) ====
const ANEXO_TITULOS = {
    veiculos: i => i.placa, motoristas: i => i.nome, clientes: i => i.nome, funcionarios: i => i.nome,
    financeiro: i => i.descricao || i.motivo, turismo_viagens: i => `${i.local_saida} → ${i.local_chegada}`,
    multas: i => i.descricao, contas_pagar: i => i.fornecedor, contas_receber: i => i.descricao,
    pneus: i => `${veiculoPlaca(i.veiculo_id)} — ${formatarData(i.data)}`, oleos: i => `${veiculoPlaca(i.veiculo_id)} — ${formatarData(i.data)}`,
    preventivas: i => `${veiculoPlaca(i.veiculo_id)} — ${formatarData(i.data)}`, corretivas: i => `${veiculoPlaca(i.veiculo_id)} — ${formatarData(i.data)}`,
    abastecimentos: i => `${veiculoPlaca(i.veiculo_id)} — ${formatarData(i.data)}`
};
function btnAnexos(chave, item) {
    const titulo = (ANEXO_TITULOS[chave] ? ANEXO_TITULOS[chave](item) : '') || chave;
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<button class="btn-small" style="background:#607d8b;" title="Anexos (notas, comprovantes, documentos)" data-ent="${chave}" data-id="${item.id}" data-titulo="${esc(titulo)}" onclick="abrirAnexosBtn(this)">📎</button>`;
}
function abrirAnexosBtn(el) {
    if (typeof abrirAnexos === 'function') abrirAnexos(el.dataset.ent, el.dataset.id, el.dataset.titulo);
    else avisar('O módulo de anexos não foi carregado (confira se o arquivo modulos.js está na pasta).');
}

// ==== AUTENTICAÇÃO ====
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showLoginPage(); return; }
    currentUser = session.user;

    const { data: perfil, error } = await sb
        .from('perfis').select('nome, empresa_id, role, empresas(id, nome, bomba_alerta_minimo, galao_oleo_alerta_minimo)')
        .eq('id', currentUser.id).single();

    if (error || !perfil) { showLoginPage(); return; }

    currentEmpresa = { id: perfil.empresa_id, nome: perfil.empresas.nome, bomba_alerta_minimo: perfil.empresas.bomba_alerta_minimo, galao_oleo_alerta_minimo: perfil.empresas.galao_oleo_alerta_minimo };
    currentUserRole = perfil.role || 'admin';
    if (currentUserRole === 'operador') currentUserRole = 'operacional';
    try { const { data: sa, error: saErr } = await sb.rpc('saldo_automatico'); saldoAutomatico = !saErr && sa === true; } catch (e) { saldoAutomatico = false; }
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('empresaNome').textContent = `(${currentEmpresa.nome})`;
    aplicarPermissoes();
    await loadData();
    updateDashboard();
    window.__appPronto = true;
    if (typeof iniciarModulos === 'function') iniciarModulos();
}

function aplicarPermissoes() {
    // esconde do menu o que o perfil não pode usar (a trava de verdade fica nas regras do banco: seguranca_banco.sql)
    document.querySelectorAll('.menu-item').forEach(item => {
        const m = (item.getAttribute('onclick') || '').match(/showPage\('(\w+)'\)/);
        if (m && !paginaPermitida(m[1])) item.style.display = 'none';
    });
    if (currentUserRole !== 'admin' && currentUserRole !== 'financeiro') {
        // quem não vê funcionários/financeiro receberia contagens e totais parciais: esconde esses cartões
        ['countFuncionarios', 'totalGasto'].forEach(id => { const card = document.getElementById(id)?.closest('.card'); if (card) card.style.display = 'none'; });
    }
}

function showLoginPage() {
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); width: 100%; max-width: 400px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #0066cc 0%, #00a3e0 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: white; font-size: 32px; font-weight: bold;">G</div>
                    <h1 style="margin: 15px 0 5px 0; color: #333;">Gestronix</h1>
                    <p style="margin: 0; color: #666; font-size: 13px;">Gestão que conecta. Resultados que movem.</p>
                </div>
                <div id="loginForm">
                    <div id="loginMsg" style="display:none; margin-bottom: 15px; padding: 10px; border-radius: 5px; font-size: 13px;"></div>
                    <div style="margin-bottom: 15px;"><label style="display:block; margin-bottom:5px; color:#555; font-weight:500;">Email</label><input type="email" id="loginEmail" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;"></div>
                    <div style="margin-bottom: 20px;"><label style="display:block; margin-bottom:5px; color:#555; font-weight:500;">Senha</label><input type="password" id="loginPassword" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;"></div>
                    <button onclick="login()" style="width:100%; padding:10px; background:#0066cc; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:600;">Entrar</button>
                    <p style="text-align:center; font-size:12px; color:#999; margin-top:15px;">Acesso apenas para usuários autorizados. Fale com o administrador do sistema.</p>
                </div>
                <div id="registerForm" style="display:none;">
                    <div id="registerMsg" style="display:none; margin-bottom: 15px; padding: 10px; border-radius: 5px; font-size: 13px;"></div>
                    <div style="margin-bottom: 15px;"><label style="display:block; margin-bottom:5px; color:#555; font-weight:500;">Email</label><input type="email" id="registerEmail" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;"></div>
                    <div style="margin-bottom: 15px;"><label style="display:block; margin-bottom:5px; color:#555; font-weight:500;">Senha</label><input type="password" id="registerPassword" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;"></div>
                    <div style="margin-bottom: 15px;"><label style="display:block; margin-bottom:5px; color:#555; font-weight:500;">Confirmar Senha</label><input type="password" id="registerPasswordConfirm" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;"></div>
                    <div style="margin-bottom: 15px;"><label style="display:block; margin-bottom:5px; color:#555; font-weight:500;">Nome da Empresa</label><input type="text" id="registerEmpresa" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;"></div>
                    <button onclick="register()" style="width:100%; padding:10px; background:#0066cc; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:600; margin-bottom:10px;">Criar Conta</button>
                    <button onclick="toggleRegister()" style="width:100%; padding:10px; background:#666; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:600;">Voltar</button>
                </div>
            </div>
        </div>
    `;
}

function toggleRegister() {
    document.getElementById('loginForm').style.display = document.getElementById('loginForm').style.display === 'none' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = document.getElementById('registerForm').style.display === 'none' ? 'block' : 'none';
}

function showMsg(elId, text, isError) {
    const el = document.getElementById(elId);
    el.style.display = 'block';
    el.style.background = isError ? '#fdecea' : '#e6f4ea';
    el.style.color = isError ? '#c0392b' : '#1e7e34';
    el.textContent = text;
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { showMsg('loginMsg', 'Preencha todos os campos', true); return; }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { showMsg('loginMsg', 'Email ou senha incorretos', true); return; }
    location.reload();
}

async function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const empresaNome = document.getElementById('registerEmpresa').value;
    if (!email || !password || !passwordConfirm || !empresaNome) { showMsg('registerMsg', 'Preencha todos os campos', true); return; }
    if (password.length < 6) { showMsg('registerMsg', 'Senha deve ter no mínimo 6 caracteres', true); return; }
    if (password !== passwordConfirm) { showMsg('registerMsg', 'Senhas não conferem', true); return; }
    const { data: signUpData, error } = await sb.auth.signUp({ email, password, options: { data: { empresa_nome: empresaNome, nome: email } } });
    if (error) { showMsg('registerMsg', error.message, true); return; }
    if (signUpData.session) { location.reload(); }
    else { showMsg('registerMsg', 'Conta criada! Verifique seu email para confirmar antes de entrar.', false); }
}

async function logout() { await sb.auth.signOut(); location.reload(); }

// ==== NAVEGAÇÃO ====
function showPage(page) {
    if (!paginaPermitida(page)) { avisar('Você não tem acesso a essa área.'); return; }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    event.target.classList.add('active');

    if (page === 'aniversarios') loadAniversarios();
    else if (page === 'dashboard') setTimeout(criarGraficos, 100);
    else if (page === 'desempenho') loadDesempenho();
    else if (page === 'relatorios') setTimeout(() => { gerarRelatorio(); gerarRelatorioTurismo(); }, 100);
    else if (page === 'agenda') loadAgenda();
    else if (page === 'controle') loadControleRotas();
    else if (page === 'dre' && typeof gerarDRE === 'function') gerarDRE();
    else if (page === 'configuracoes' && typeof abrirConfiguracoes === 'function') abrirConfiguracoes();
}

function switchTab(tab) {
    const parent = document.getElementById(tab).parentElement;
    parent.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    if (tab === 'bomba') loadBomba();
    if (tab === 'galaoOleo') loadGalaoOleo();
    if (tab === 'mediasManutencao') gerarRelatorioMedias();
    if (tab === 'custosVeiculos') gerarCustosVeiculos();
    if (tab === 'cfgUsuarios' && typeof carregarUsuarios === 'function') carregarUsuarios();
    if (tab === 'cfgAuditoria' && typeof carregarAuditoria === 'function') carregarAuditoria();
    if (tab === 'cfgBackup' && typeof atualizarPreviewLogo === 'function') atualizarPreviewLogo();
}

// ==== EXPORTAR EXCEL ====
const EXPORT_CONFIG = {
    motoristas: { titulo: 'Motoristas', campos: [
        ['nome','Nome'], ['cpf','CPF'], ['telefone','Telefone'], ['endereco','Endereço'],
        ['data_nascimento','Data Nascimento'], ['cnh_validade','Validade CNH'], ['salario','Salário']
    ]},
    funcionarios: { titulo: 'Funcionarios', campos: [
        ['nome','Nome'], ['funcao','Função'], ['cpf','CPF'], ['telefone','Telefone'], ['endereco','Endereço'],
        ['data_nascimento','Data Nascimento'], ['status','Status'], ['salario','Salário'],
        ['data_admissao','Data Admissão'], ['data_demissao','Data Demissão'],
        ['experiencia_inicio','Início Experiência'], ['experiencia_fim','Fim Experiência']
    ]},
    veiculos: { titulo: 'Veiculos', campos: [
        ['placa','Placa'], ['marca','Marca'], ['modelo','Modelo'], ['ano','Ano'], ['chassi','Chassi'], ['renavam','Renavam'], ['numero_bancos','Número de Bancos'],
        ['km_atual','KM Atual'], ['valor','Valor do Veículo'], ['tanque_litros','Tamanho do Tanque (L)'],
        [item => { const c = combustivelEstimadoTanque(item.id); return c ? c.litros.toFixed(0) + ' L (' + c.percentual.toFixed(0) + '%)' : ''; }, 'Combustível Estimado'],
        ['csv_validade','Validade CSV'], ['tacografo_validade','Validade Tacógrafo'], ['apolice_validade','Validade Apólice'], ['crlv_ano','Ano CRLV']
    ]},
    clientes: { titulo: 'Clientes', campos: [
        ['nome','Nome'], ['cpf_cnpj','CPF/CNPJ'], ['telefone','Telefone'], ['rua','Rua'], ['numero','Número'],
        ['bairro','Bairro'], ['cidade','Cidade'], ['uf','UF'], ['cep','CEP'], ['data_nascimento','Data Nascimento']
    ]},
    abastecimentos: { titulo: 'Abastecimentos', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['fonte','Fonte'], ['data','Data'], ['km','KM'], ['litros','Litros'],
        ['valor_litro','Valor/L'], ['valor_total','Valor Total'], ['kml','KM/L']
    ]},
    pneus: { titulo: 'Pneus', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['data','Data'], ['tipo','Tipo'], ['oficina','Oficina'],
        ['quantidade','Quantidade'], ['valor_unitario','Valor Unitário'], ['valor','Valor Total'],
        ['km_atual','KM da Troca'], ['km_proxima','KM Próxima Troca']
    ]},
    oleos: { titulo: 'Oleos', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['fonte','Fonte'], ['data','Data'], ['tipo','Tipo'], ['lugar','Lugar'], ['litragem','Litragem'],
        ['km_atual','KM da Troca'], ['km_proxima','KM Próxima Troca'], ['valor','Valor']
    ]},
    preventivas: { titulo: 'Preventivas', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['data','Data'], ['descricao','Descrição'],
        ['km_atual','KM Atual'], ['km_proxima','KM Próxima Troca'], ['valor','Valor']
    ]},
    corretivas: { titulo: 'Corretivas', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['data','Data'], ['descricao','Descrição'], ['oficina','Oficina'],
        ['km_atual','KM da Troca'], ['km_proxima','KM Próxima Troca'], ['valor','Valor']
    ]},
    multas: { titulo: 'Multas', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['data','Data'], ['descricao','Descrição'], ['valor','Valor']
    ]},
    bancos: { titulo: 'Bancos', campos: [['nome','Nome'],['agencia','Agência'],['conta','Conta'],['saldo','Saldo']] },
    financeiro: { titulo: 'Financeiro', campos: [
        [item => (data.bancos.find(b => b.id === item.banco_id)?.nome || 'N/A'), 'Banco'], ['data','Data'],
        ['tipo','Tipo'], ['motivo','Motivo'], ['descricao','Descrição'], ['valor','Valor']
    ]},
    rotas: { titulo: 'Rotas', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], [item => motoristaNome(item.motorista_id), 'Motorista'],
        ['local_saida','Local Saída'], ['destino','Destino'],
        [item => (data.rotas_fixas.find(rf => rf.id === item.rota_fixa_id)?.nome || ''), 'Rota Fixa'],
        ['data_inicio','Data Início'], ['data_fim','Data Fim'], [item => kmPercorrido(item), 'KM Percorrido']
    ]},
    produtos: { titulo: 'Produtos', campos: [
        ['nome','Nome'], ['categoria','Categoria'], ['quantidade','Qtd. Atual'], ['quantidade_minima','Qtd. Mínima'],
        ['unidade','Unidade'], ['valor_unitario','Valor Unitário']
    ]},
    estoque_movimentacoes: { titulo: 'Movimentacoes', campos: [
        [item => (data.produtos.find(p => p.id === item.produto_id)?.nome || 'N/A'), 'Produto'],
        ['tipo','Tipo'], ['quantidade','Quantidade'], ['motivo','Motivo'], ['data','Data']
    ]},
    agenda: { titulo: 'Agenda', campos: [
        ['titulo','Título'], ['descricao','Descrição'], ['data','Data'], ['hora','Hora'], ['categoria','Categoria']
    ]},
    turismo_viagens: { titulo: 'Turismo', campos: [
        ['data','Data'], ['horario','Horário'], ['local_saida','Local Saída'], ['local_chegada','Local Chegada'],
        [item => motoristaNome(item.motorista_id), 'Motorista'],
        [item => (data.clientes.find(c => c.id === item.cliente_id)?.nome || 'N/A'), 'Cliente'],
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['km','KM'],
        ['valor_viagem','Valor Viagem'], ['nota_fiscal_valor','Valor Nota Fiscal'], ['imposto_percentual','Imposto (%)'],
        [item => (Number(item.nota_fiscal_valor||0) * Number(item.imposto_percentual||0) / 100).toFixed(2), 'Imposto (R$)'],
        ['valor_pedagio','Pedágio'], ['combustivel_litros','Litros Combustível'],
        ['combustivel_valor_litro','Valor por Litro'], ['combustivel_valor','Valor Combustível'], ['valor_diaria','Diária Motorista'], ['adiantamento','Valor Pago pro Motorista'],
        ['outros_descricao','Outros (descrição)'], ['outros_valor','Outros (valor)'],
        ['depreciacao','Depreciação'],
        [item => (item.acerto_motorista_pago ? 'Pago' : 'Pendente'), 'Acerto Motorista']
    ]},
    bomba_cargas: { titulo: 'Bomba_Combustivel', campos: [
        ['data','Data'], ['litros','Litros'], ['valor_total','Valor Total'], ['fornecedor','Fornecedor']
    ]},
    galao_oleo_cargas: { titulo: 'Galao_Oleo', campos: [
        ['data','Data'], ['tipo_oleo','Tipo de Óleo'], ['litros','Litros'], ['valor_total','Valor Total'], ['fornecedor','Fornecedor']
    ]},
    contas_pagar: { titulo: 'Contas_a_Pagar', campos: [
        ['fornecedor','Fornecedor'], ['descricao','Descrição'], ['valor','Valor'], ['data_vencimento','Vencimento'],
        ['status','Status'], ['data_pagamento','Data Pagamento']
    ]},
    contas_receber: { titulo: 'Contas_a_Receber', campos: [
        [item => (data.clientes.find(c => c.id === item.cliente_id)?.nome || '-'), 'Cliente'],
        ['descricao','Descrição'], ['valor','Valor'], ['data_vencimento','Vencimento'],
        ['status','Status'], ['data_recebimento','Data Recebimento']
    ]},
};

function exportarExcel(tipo) {
    const config = EXPORT_CONFIG[tipo];
    const linhas = data[tipo].map(item => {
        const linha = {};
        config.campos.forEach(([campo, label]) => { linha[label] = typeof campo === 'function' ? campo(item) : item[campo]; });
        return linha;
    });
    if (linhas.length === 0) { avisar('Não há dados para exportar nessa seção ainda.'); return; }
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.titulo.substring(0, 31));
    XLSX.writeFile(wb, `${config.titulo}_${hojeISO()}.xlsx`);
}

// ==== HELPERS ====
function formatarData(dataStr) {
    if (!dataStr) return '';
    // evita o bug de fuso horário: trata "AAAA-MM-DD" como texto puro, não como Date UTC
    const soData = String(dataStr).slice(0, 10);
    const [ano, mes, dia] = soData.split('-');
    if (!ano || !mes || !dia) return '';
    return `${dia}/${mes}/${ano}`;
}
function parseDataLocal(dataStr) {
    if (!dataStr) return null;
    const soData = String(dataStr).slice(0, 10);
    const [ano, mes, dia] = soData.split('-').map(Number);
    if (!ano || !mes || !dia) return null;
    return new Date(ano, mes - 1, dia);
}
function veiculoPlaca(id) { return data.veiculos.find(v => v.id === id)?.placa || 'N/A'; }
function veiculoKmAtual(id) { return Number(data.veiculos.find(v => v.id === id)?.km_atual || 0); }

// Estima quanto combustível ainda tem no tanque, considerando que cada abastecimento enche o tanque
// (premissa padrão em frotas: o motorista sempre completa o tanque ao abastecer) e descontando o
// consumo estimado desde o último abastecimento, com base na média de km/l do próprio veículo.
function combustivelEstimadoTanque(veiculoId) {
    const vv = data.veiculos.find(x => x.id === veiculoId);
    if (!vv || !vv.tanque_litros) return null; // sem tamanho de tanque cadastrado

    const abastecimentosVeiculo = data.abastecimentos
        .filter(a => a.veiculo_id === veiculoId)
        .map(a => ({ ...a, _dataParsed: parseDataLocal(a.data) }))
        .sort((a, b) => (b._dataParsed - a._dataParsed) || (Number(b.km) - Number(a.km)));

    if (abastecimentosVeiculo.length === 0) return null; // sem histórico de abastecimento ainda

    const ultimo = abastecimentosVeiculo[0];
    const kmAtual = Number(vv.km_atual || ultimo.km);
    const kmRodadoDesdeAbastecimento = Math.max(0, kmAtual - Number(ultimo.km));

    // Média de km/l: usa a do próprio último abastecimento se fizer sentido, senão a média geral do veículo
    const comMedia = abastecimentosVeiculo.filter(a => Number(a.kml) > 0);
    let mediaKmL = Number(ultimo.kml) > 0 ? Number(ultimo.kml) : 0;
    if (!mediaKmL && comMedia.length > 0) mediaKmL = comMedia.reduce((s,a) => s + Number(a.kml), 0) / comMedia.length;

    const tanque = Number(vv.tanque_litros);
    const consumoEstimado = mediaKmL > 0 ? kmRodadoDesdeAbastecimento / mediaKmL : 0;
    const nivelEstimado = Math.max(0, Math.min(tanque, tanque - consumoEstimado));

    return { litros: nivelEstimado, tanque, percentual: (nivelEstimado / tanque) * 100, semMediaConfiavel: mediaKmL === 0 };
}

function motoristaNome(id) { return data.motoristas.find(m => m.id === id)?.nome || 'N/A'; }
function kmPercorrido(r) { return (r.km_fim || 0) - (r.km_inicio || 0); }
function tempoTotal(r) {
    if (!r.data_inicio || !r.hora_inicio || !r.data_fim || !r.hora_fim) return '';
    const inicio = new Date(`${r.data_inicio}T${r.hora_inicio}`);
    const fim = new Date(`${r.data_fim}T${r.hora_fim}`);
    const tempoMs = fim - inicio;
    const horas = Math.floor(tempoMs / (1000*60*60));
    const minutos = Math.floor((tempoMs % (1000*60*60)) / (1000*60));
    return `${horas}h ${minutos}m`;
}
function mesesOperacaoVeiculo(veiculoId) {
    const datasRotas = data.rotas.filter(r => r.veiculo_id === veiculoId && r.data_inicio).map(r => parseDataLocal(r.data_inicio));
    if (datasRotas.length === 0) return 1;
    const min = new Date(Math.min(...datasRotas));
    const max = new Date(Math.max(...datasRotas));
    const meses = (max.getFullYear() - min.getFullYear()) * 12 + (max.getMonth() - min.getMonth()) + 1;
    return Math.max(1, meses);
}

function custoPorKmVeiculo(veiculoId) {
    const rotasVeiculo = data.rotas.filter(r => r.veiculo_id === veiculoId);
    const kmTotal = rotasVeiculo.reduce((s, r) => s + kmPercorrido(r), 0);
    let gastos = 0;
    gastos += data.abastecimentos.filter(a => a.veiculo_id === veiculoId).reduce((s,a) => s + Number(a.valor_total), 0);
    gastos += data.pneus.filter(p => p.veiculo_id === veiculoId).reduce((s,p) => s + Number(p.valor||0), 0);
    gastos += data.oleos.filter(o => o.veiculo_id === veiculoId).reduce((s,o) => s + Number(o.valor||0), 0);
    gastos += data.preventivas.filter(p => p.veiculo_id === veiculoId).reduce((s,p) => s + Number(p.valor||0), 0);
    gastos += data.corretivas.filter(c => c.veiculo_id === veiculoId).reduce((s,c) => s + Number(c.valor||0), 0);
    gastos += data.multas.filter(m => m.veiculo_id === veiculoId).reduce((s,m) => s + Number(m.valor||0), 0);
    // seguro e CSV são anuais: dividimos por 12 e multiplicamos pelos meses de operação do veículo
    const veiculo = data.veiculos.find(vv => vv.id === veiculoId);
    if (veiculo) {
        const meses = mesesOperacaoVeiculo(veiculoId);
        gastos += ((Number(veiculo.apolice_valor||0) + Number(veiculo.csv_valor||0)) / 12) * meses;
    }
    return kmTotal > 0 ? gastos / kmTotal : 0;
}
function gastoRotaDetalhado(r) {
    const dataRota = new Date(r.data_inicio).toDateString();
    let combustivel = 0, manutencao = 0, multas = 0;
    data.abastecimentos.forEach(a => { if (a.veiculo_id===r.veiculo_id && new Date(a.data).toDateString()===dataRota) combustivel += Number(a.valor_total); });
    data.pneus.forEach(p => { if (p.veiculo_id===r.veiculo_id && new Date(p.data).toDateString()===dataRota) manutencao += Number(p.valor||0); });
    data.oleos.forEach(o => { if (o.veiculo_id===r.veiculo_id && new Date(o.data).toDateString()===dataRota) manutencao += Number(o.valor||0); });
    data.preventivas.forEach(p => { if (p.veiculo_id===r.veiculo_id && new Date(p.data).toDateString()===dataRota) manutencao += Number(p.valor||0); });
    data.corretivas.forEach(c => { if (c.veiculo_id===r.veiculo_id && new Date(c.data).toDateString()===dataRota) manutencao += Number(c.valor||0); });
    data.multas.forEach(m => { if (m.veiculo_id===r.veiculo_id && new Date(m.data).toDateString()===dataRota) multas += Number(m.valor||0); });
    return { combustivel, manutencao, multas, total: combustivel + manutencao + multas };
}

async function recalcularKmVeiculo(veiculoId) {
    if (!veiculoId) return;
    let maiorKm = 0;
    data.rotas.forEach(r => { if (r.veiculo_id === veiculoId && r.km_fim > maiorKm) maiorKm = Number(r.km_fim); });
    data.abastecimentos.forEach(a => { if (a.veiculo_id === veiculoId && a.km > maiorKm) maiorKm = Number(a.km); });
    data.pneus.forEach(p => { if (p.veiculo_id === veiculoId && p.km_atual > maiorKm) maiorKm = Number(p.km_atual); });
    data.oleos.forEach(o => { if (o.veiculo_id === veiculoId && o.km_atual > maiorKm) maiorKm = Number(o.km_atual); });
    data.preventivas.forEach(p => { if (p.veiculo_id === veiculoId && p.km_atual > maiorKm) maiorKm = Number(p.km_atual); });
    data.corretivas.forEach(c => { if (c.veiculo_id === veiculoId && c.km_atual > maiorKm) maiorKm = Number(c.km_atual); });
    await sb.from('veiculos').update({ km_atual: maiorKm }).eq('id', veiculoId);
}

async function recalcularMediaKmLVeiculo(veiculoId) {
    if (!veiculoId) return;
    const doVeiculo = data.abastecimentos
        .filter(a => a.veiculo_id === veiculoId)
        .map(a => ({ ...a, _dataParsed: parseDataLocal(a.data) }))
        .sort((a, b) => (a._dataParsed - b._dataParsed) || (Number(a.km) - Number(b.km)));

    const atualizacoes = [];
    for (let i = 0; i < doVeiculo.length; i++) {
        const atual = doVeiculo[i];
        let kmlCorreto = 0;
        if (i > 0) {
            const diff = Number(atual.km) - Number(doVeiculo[i - 1].km);
            kmlCorreto = diff > 0 ? diff / Number(atual.litros) : 0;
        }
        if (Number(atual.kml || 0).toFixed(4) !== kmlCorreto.toFixed(4)) {
            atualizacoes.push({ id: atual.id, kml: kmlCorreto });
        }
    }
    for (const upd of atualizacoes) {
        await sb.from('abastecimentos').update({ kml: upd.kml }).eq('id', upd.id);
    }
}

function nivelBomba() {
    const totalCarregado = data.bomba_cargas.reduce((s,c) => s + Number(c.litros), 0);
    const totalDispensado = data.abastecimentos.filter(a => a.fonte === 'bomba').reduce((s,a) => s + Number(a.litros), 0);
    const gastoTotal = data.bomba_cargas.reduce((s,c) => s + Number(c.valor_total), 0);
    return { atual: totalCarregado - totalDispensado, totalCarregado, totalDispensado, gastoTotal };
}

function nivelGalaoOleo() {
    const totalCarregado = data.galao_oleo_cargas.reduce((s,c) => s + Number(c.litros), 0);
    const totalDispensado = data.oleos.filter(o => o.fonte === 'galao').reduce((s,o) => s + Number(o.litragem||0), 0);
    const gastoTotal = data.galao_oleo_cargas.reduce((s,c) => s + Number(c.valor_total), 0);
    return { atual: totalCarregado - totalDispensado, totalCarregado, totalDispensado, gastoTotal };
}

// abre modal para EDITAR um item já existente (busca na lista e reaproveita o form de adicionar)
function editarItem(arrayKey, id, modalType) {
    const item = data[arrayKey].find(x => x.id === id);
    if (!item) { avisar('Item não encontrado'); return; }
    openAddModal(modalType, item);
}

function v(item, campo, fallback = '') { return item && item[campo] != null ? item[campo] : fallback; }

// ==== MODAL ====
function openAddModal(type, item = null) {
    editContext = item ? { type, id: item.id } : null;
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const acaoLabel = item ? 'Salvar Alterações' : 'Adicionar';
    let html = '';
    let posRender = null; // função executada depois do innerHTML, pra marcar selects

    if (type === 'motorista') {
        modalTitle.textContent = item ? 'Editar Motorista' : 'Adicionar Motorista';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="motoristaNome" value="${v(item,'nome')}"></div>
            <div class="form-row">
                <div class="form-group"><label>CPF</label><input type="text" id="motoristaCPF" value="${v(item,'cpf')}"></div>
                <div class="form-group"><label>Telefone</label><input type="text" id="motoristaTelefone" value="${v(item,'telefone')}"></div>
            </div>
            <div class="form-group"><label>Endereço</label><input type="text" id="motoristaEndereco" value="${v(item,'endereco')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Data de Nascimento</label><input type="date" id="motoristaDataNasc" value="${v(item,'data_nascimento')}"></div>
                <div class="form-group"><label>Validade da CNH</label><input type="date" id="motoristaCnhValidade" value="${v(item,'cnh_validade')}"></div>
            </div>
            <div class="form-group"><label>Salário</label><input type="number" id="motoristaSalario" step="0.01" value="${v(item,'salario')}"></div>
            <button onclick="addMotorista()">${acaoLabel}</button>
        `;
    } else if (type === 'funcionario') {
        modalTitle.textContent = item ? 'Editar Funcionário' : 'Adicionar Funcionário';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="funcionarioNome" value="${v(item,'nome')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Função</label><input type="text" id="funcionarioFuncao" value="${v(item,'funcao')}" placeholder="Ex: Auxiliar, Mecânico, Administrativo"></div>
                <div class="form-group"><label>Salário</label><input type="number" id="funcionarioSalario" step="0.01" value="${v(item,'salario')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>CPF</label><input type="text" id="funcionarioCPF" value="${v(item,'cpf')}"></div>
                <div class="form-group"><label>Telefone</label><input type="text" id="funcionarioTelefone" value="${v(item,'telefone')}"></div>
            </div>
            <div class="form-group"><label>Endereço</label><input type="text" id="funcionarioEndereco" value="${v(item,'endereco')}"></div>
            <div class="form-group"><label>Data de Nascimento</label><input type="date" id="funcionarioDataNasc" value="${v(item,'data_nascimento')}"></div>
            <div class="form-group">
                <label>Status</label>
                <select id="funcionarioStatus" onchange="atualizarCamposFuncionario()">
                    <option value="ativo">Ativo</option><option value="experiencia">Contrato de Experiência</option><option value="demitido">Demitido</option>
                </select>
                <p style="font-size:11px; color:#666; margin-top:4px;">Dica: se preencher a "Data de Demissão" abaixo, o status muda pra Demitido automaticamente ao salvar.</p>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data de Admissão</label><input type="date" id="funcionarioAdmissao" value="${v(item,'data_admissao')}"></div>
                <div class="form-group" id="grupoDemissao"><label>Data de Demissão</label><input type="date" id="funcionarioDemissao" value="${v(item,'data_demissao')}"></div>
            </div>
            <div class="form-row" id="grupoExperiencia">
                <div class="form-group"><label>Início da Experiência</label><input type="date" id="funcionarioExpInicio" value="${v(item,'experiencia_inicio')}"></div>
                <div class="form-group"><label>Fim da Experiência</label><input type="date" id="funcionarioExpFim" value="${v(item,'experiencia_fim')}"></div>
            </div>
            <button onclick="addFuncionario()">${acaoLabel}</button>
        `;
        posRender = () => { document.getElementById('funcionarioStatus').value = v(item,'status','ativo'); atualizarCamposFuncionario(); };
    } else if (type === 'veiculo') {
        modalTitle.textContent = item ? 'Editar Veículo' : 'Adicionar Veículo';
        html = `
            <div class="form-row">
                <div class="form-group"><label>Placa</label><input type="text" id="veiculoPlaca" value="${v(item,'placa')}"></div>
                <div class="form-group"><label>Marca</label><input type="text" id="veiculoMarca" value="${v(item,'marca')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Modelo</label><input type="text" id="veiculoModelo" value="${v(item,'modelo')}"></div>
                <div class="form-group"><label>Ano</label><input type="number" id="veiculoAno" value="${v(item,'ano')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Chassi</label><input type="text" id="veiculoChassi" value="${v(item,'chassi')}"></div>
                <div class="form-group"><label>Renavam</label><input type="text" id="veiculoRenavam" value="${v(item,'renavam')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>KM Atual</label><input type="number" id="veiculoKmAtual" value="${v(item,'km_atual',0)}"></div>
                <div class="form-group"><label>Número de Bancos (assentos)</label><input type="number" id="veiculoNumeroBancos" value="${v(item,'numero_bancos')}" placeholder="Ex: 44"></div>
            </div>
            <div class="form-group"><label>Valor do Veículo</label><input type="number" id="veiculoValor" step="0.01" value="${v(item,'valor')}" placeholder="Valor de compra/mercado"></div>
            <div class="form-group"><label>Tamanho do Tanque (Litros)</label><input type="number" id="veiculoTanqueLitros" step="0.1" value="${v(item,'tanque_litros')}" placeholder="Ex: 300"></div>
            <p style="font-size:12px; color:#666; margin: 5px 0 10px;">Os campos abaixo são opcionais:</p>
            <div class="form-row">
                <div class="form-group"><label>Validade do CSV</label><input type="date" id="veiculoCsvValidade" value="${v(item,'csv_validade')}"></div>
                <div class="form-group"><label>Valor do CSV (anual)</label><input type="number" id="veiculoCsvValor" step="0.01" value="${v(item,'csv_valor')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Validade do Tacógrafo</label><input type="date" id="veiculoTacografoValidade" value="${v(item,'tacografo_validade')}"></div>
                <div class="form-group"><label>Ano do CRLV</label><input type="number" id="veiculoCrlvAno" value="${v(item,'crlv_ano')}" placeholder="2026"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Validade da Apólice</label><input type="date" id="veiculoApoliceValidade" value="${v(item,'apolice_validade')}"></div>
                <div class="form-group"><label>Valor da Apólice/Seguro (anual)</label><input type="number" id="veiculoApoliceValor" step="0.01" value="${v(item,'apolice_valor')}"></div>
            </div>
            <p style="font-size:11px; color:#666; margin: -5px 0 10px;">Esses valores anuais são divididos por 12 automaticamente ao calcular o custo/km real do veículo.</p>
            <button onclick="addVeiculo()">${acaoLabel}</button>
        `;
    } else if (type === 'cliente') {
        modalTitle.textContent = item ? 'Editar Cliente' : 'Adicionar Cliente';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="clienteNome" value="${v(item,'nome')}"></div>
            <div class="form-row">
                <div class="form-group"><label>CPF/CNPJ</label><input type="text" id="clienteCPF" value="${v(item,'cpf_cnpj')}"></div>
                <div class="form-group"><label>Telefone</label><input type="text" id="clienteTelefone" value="${v(item,'telefone')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Rua</label><input type="text" id="clienteRua" value="${v(item,'rua')}"></div>
                <div class="form-group"><label>Número</label><input type="text" id="clienteNumero" value="${v(item,'numero')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Bairro</label><input type="text" id="clienteBairro" value="${v(item,'bairro')}"></div>
                <div class="form-group"><label>CEP</label><input type="text" id="clienteCep" value="${v(item,'cep')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Cidade</label><input type="text" id="clienteCidade" value="${v(item,'cidade')}"></div>
                <div class="form-group"><label>UF</label><input type="text" id="clienteUf" maxlength="2" value="${v(item,'uf')}" placeholder="Ex: SP"></div>
            </div>
            <div class="form-group"><label>Data de Nascimento</label><input type="date" id="clienteDataNasc" value="${v(item,'data_nascimento')}"></div>
            <button onclick="addCliente()">${acaoLabel}</button>
        `;
    } else if (type === 'abastecimento') {
        modalTitle.textContent = item ? 'Editar Abastecimento' : 'Adicionar Abastecimento';
        const opts = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="abastecimentoVeiculo">${opts}</select></div>
            <div class="form-group">
                <label>Fonte do Combustível</label>
                <select id="abastecimentoFonte"><option value="posto">Posto Externo</option><option value="bomba">Bomba Própria (nível atual: ${nivelBomba().atual.toFixed(0)} L)</option></select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="abastecimentoData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>KM</label><input type="number" id="abastecimentoKM" value="${v(item,'km')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Litros</label><input type="number" id="abastecimentoLitros" step="0.01" value="${v(item,'litros')}"></div>
                <div class="form-group"><label>Valor/L</label><input type="number" id="abastecimentoValorL" step="0.01" value="${v(item,'valor_litro')}" onchange="calcularValorTotal()"></div>
            </div>
            <div class="form-group"><label>Valor Total</label><input type="number" id="abastecimentoValorTotal" step="0.01" value="${v(item,'valor_total')}" readonly></div>
            <button onclick="addAbastecimento()">${acaoLabel}</button>
        `;
        posRender = () => {
            document.getElementById('abastecimentoVeiculo').value = v(item,'veiculo_id');
            document.getElementById('abastecimentoFonte').value = v(item,'fonte','posto');
        };
    } else if (type === 'pneu') {
        modalTitle.textContent = item ? 'Editar Pneu' : 'Adicionar Pneu';
        const opts = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="pneuVeiculo" onchange="autoPreencherKm('pneu')">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="pneuData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Tipo</label><select id="pneuTipo"><option value="Alinhamento">Alinhamento</option><option value="Troca de Pneus">Troca de Pneus</option><option value="Balanceamento">Balanceamento</option></select></div>
            </div>
            <div class="form-group"><label>Oficina</label><input type="text" id="pneuOficina" value="${v(item,'oficina')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Quantidade de Pneus</label><input type="number" id="pneuQuantidade" value="${v(item,'quantidade',1)}" onchange="calcularValorTotalPneu()"></div>
                <div class="form-group"><label>Valor Unitário</label><input type="number" id="pneuValorUnitario" step="0.01" value="${v(item,'valor_unitario')}" onchange="calcularValorTotalPneu()"></div>
            </div>
            <div class="form-group"><label>Valor Total</label><input type="number" id="pneuValor" step="0.01" value="${v(item,'valor')}" readonly></div>
            <div class="form-row">
                <div class="form-group"><label>KM da Troca</label><input type="number" id="pneuKMAtual" value="${v(item,'km_atual')}"></div>
                <div class="form-group"><label>KM Próxima Troca</label><input type="number" id="pneuKMProxima" value="${v(item,'km_proxima')}"></div>
            </div>
            <button onclick="addPneu()">${acaoLabel}</button>
        `;
        posRender = () => { document.getElementById('pneuVeiculo').value = v(item,'veiculo_id'); document.getElementById('pneuTipo').value = v(item,'tipo','Alinhamento'); };
    } else if (type === 'oleo') {
        modalTitle.textContent = item ? 'Editar Óleo' : 'Adicionar Óleo';
        const opts = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="oleoVeiculo" onchange="autoPreencherKm('oleo')">${opts}</select></div>
            <div class="form-group">
                <label>Fonte do Óleo</label>
                <select id="oleoFonte"><option value="comprado">Comprado na hora</option><option value="galao">Galão Próprio (nível atual: ${nivelGalaoOleo().atual.toFixed(1)} L)</option></select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="oleoData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Tipo</label><input type="text" id="oleoTipo" value="${v(item,'tipo')}" placeholder="Ex: 5W30"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Lugar</label><input type="text" id="oleoLugar" value="${v(item,'lugar')}" placeholder="Oficina/local"></div>
                <div class="form-group"><label>Litragem</label><input type="number" id="oleoLitragem" step="0.01" value="${v(item,'litragem')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>KM da Troca</label><input type="number" id="oleoKMAtual" value="${v(item,'km_atual')}"></div>
                <div class="form-group"><label>KM Próxima Troca</label><input type="number" id="oleoKMProxima" value="${v(item,'km_proxima')}"></div>
            </div>
            <div class="form-group"><label>Valor</label><input type="number" id="oleoValor" step="0.01" value="${v(item,'valor')}"></div>
            <button onclick="addOleo()">${acaoLabel}</button>
        `;
        posRender = () => { document.getElementById('oleoVeiculo').value = v(item,'veiculo_id'); document.getElementById('oleoFonte').value = v(item,'fonte','comprado'); };
    } else if (type === 'preventiva') {
        modalTitle.textContent = item ? 'Editar Manutenção Preventiva' : 'Adicionar Manutenção Preventiva';
        const opts = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="preventivaVeiculo" onchange="autoPreencherKm('preventiva')">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="preventivaData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Descrição</label><input type="text" id="preventivaDescricao" value="${v(item,'descricao')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>KM Atual</label><input type="number" id="preventivaKMAtual" value="${v(item,'km_atual')}"></div>
                <div class="form-group"><label>KM Próxima Troca</label><input type="number" id="preventivaKMProxima" value="${v(item,'km_proxima')}"></div>
            </div>
            <div class="form-group"><label>Valor</label><input type="number" id="preventivaValor" step="0.01" value="${v(item,'valor')}"></div>
            <button onclick="addPreventiva()">${acaoLabel}</button>
        `;
        posRender = () => { document.getElementById('preventivaVeiculo').value = v(item,'veiculo_id'); };
    } else if (type === 'corretiva') {
        modalTitle.textContent = item ? 'Editar Manutenção Corretiva' : 'Adicionar Manutenção Corretiva';
        const opts = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="corretivaVeiculo" onchange="autoPreencherKm('corretiva')">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="corretivaData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Descrição do Problema</label><input type="text" id="corretivaDescricao" value="${v(item,'descricao')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Oficina</label><input type="text" id="corretivaOficina" value="${v(item,'oficina')}"></div>
                <div class="form-group"><label>KM da Troca</label><input type="number" id="corretivaKMAtual" value="${v(item,'km_atual')}"></div>
            </div>
            <div class="form-group"><label>KM Próxima Troca (se aplicável)</label><input type="number" id="corretivaKMProxima" value="${v(item,'km_proxima')}"></div>
            <div class="form-group"><label>Valor</label><input type="number" id="corretivaValor" step="0.01" value="${v(item,'valor')}"></div>
            <button onclick="addCorretiva()">${acaoLabel}</button>
        `;
        posRender = () => { document.getElementById('corretivaVeiculo').value = v(item,'veiculo_id'); };
    } else if (type === 'cargaBomba') {
        modalTitle.textContent = item ? 'Editar Carga na Bomba' : 'Registrar Carga na Bomba';
        html = `
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="cargaBombaData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Litros</label><input type="number" id="cargaBombaLitros" step="0.01" value="${v(item,'litros')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Valor Total</label><input type="number" id="cargaBombaValor" step="0.01" value="${v(item,'valor_total')}"></div>
                <div class="form-group"><label>Fornecedor</label><input type="text" id="cargaBombaFornecedor" value="${v(item,'fornecedor')}"></div>
            </div>
            <button onclick="addCargaBomba()">${acaoLabel}</button>
        `;
    } else if (type === 'alertaBomba') {
        modalTitle.textContent = 'Configurar Alerta Mínimo da Bomba';
        html = `
            <div class="form-group"><label>Alertar quando o nível estiver abaixo de (litros)</label><input type="number" id="alertaBombaValor" value="${currentEmpresa.bomba_alerta_minimo}"></div>
            <button onclick="salvarAlertaBomba()">Salvar</button>
        `;
    } else if (type === 'cargaGalaoOleo') {
        modalTitle.textContent = item ? 'Editar Carga no Galão de Óleo' : 'Registrar Carga no Galão de Óleo';
        html = `
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="cargaGalaoData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Tipo de Óleo</label><input type="text" id="cargaGalaoTipo" value="${v(item,'tipo_oleo')}" placeholder="Ex: 5W30"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Litros</label><input type="number" id="cargaGalaoLitros" step="0.01" value="${v(item,'litros')}"></div>
                <div class="form-group"><label>Valor Total</label><input type="number" id="cargaGalaoValor" step="0.01" value="${v(item,'valor_total')}"></div>
            </div>
            <div class="form-group"><label>Fornecedor</label><input type="text" id="cargaGalaoFornecedor" value="${v(item,'fornecedor')}"></div>
            <button onclick="addCargaGalaoOleo()">${acaoLabel}</button>
        `;
    } else if (type === 'alertaGalaoOleo') {
        modalTitle.textContent = 'Configurar Alerta Mínimo do Galão de Óleo';
        html = `
            <div class="form-group"><label>Alertar quando o nível estiver abaixo de (litros)</label><input type="number" id="alertaGalaoValor" value="${currentEmpresa.galao_oleo_alerta_minimo}"></div>
            <button onclick="salvarAlertaGalaoOleo()">Salvar</button>
        `;
    } else if (type === 'contaPagar') {
        modalTitle.textContent = item ? 'Editar Conta a Pagar' : 'Adicionar Conta a Pagar';
        html = `
            <div class="form-group"><label>Fornecedor</label><input type="text" id="contaPagarFornecedor" value="${v(item,'fornecedor')}"></div>
            <div class="form-group"><label>Descrição</label><input type="text" id="contaPagarDescricao" value="${v(item,'descricao')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Valor</label><input type="number" id="contaPagarValor" step="0.01" value="${v(item,'valor')}"></div>
                <div class="form-group"><label>Data de Vencimento</label><input type="date" id="contaPagarVencimento" value="${v(item,'data_vencimento')}"></div>
            </div>
            <button onclick="addContaPagar()">${acaoLabel}</button>
        `;
    } else if (type === 'contaReceber') {
        modalTitle.textContent = item ? 'Editar Conta a Receber' : 'Adicionar Conta a Receber';
        const clientesOptions = data.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        html = `
            <div class="form-group"><label>Cliente</label><select id="contaReceberCliente">${clientesOptions}</select></div>
            <div class="form-group"><label>Descrição</label><input type="text" id="contaReceberDescricao" value="${v(item,'descricao')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Valor</label><input type="number" id="contaReceberValor" step="0.01" value="${v(item,'valor')}"></div>
                <div class="form-group"><label>Data de Vencimento</label><input type="date" id="contaReceberVencimento" value="${v(item,'data_vencimento')}"></div>
            </div>
            <button onclick="addContaReceber()">${acaoLabel}</button>
        `;
        posRender = () => { document.getElementById('contaReceberCliente').value = v(item,'cliente_id'); };
    } else if (type === 'multa') {
        modalTitle.textContent = item ? 'Editar Multa' : 'Adicionar Multa';
        const opts = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="multaVeiculo">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="multaData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Descrição</label><input type="text" id="multaDescricao" value="${v(item,'descricao')}"></div>
            </div>
            <div class="form-group"><label>Valor</label><input type="number" id="multaValor" step="0.01" value="${v(item,'valor')}"></div>
            <button onclick="addMulta()">${acaoLabel}</button>
        `;
        posRender = () => { document.getElementById('multaVeiculo').value = v(item,'veiculo_id'); };
    } else if (type === 'banco') {
        modalTitle.textContent = item ? 'Editar Banco' : 'Adicionar Banco';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="bancoNome" value="${v(item,'nome')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Agência</label><input type="text" id="bancoAgencia" value="${v(item,'agencia')}"></div>
                <div class="form-group"><label>Conta</label><input type="text" id="bancoConta" value="${v(item,'conta')}"></div>
            </div>
            <div class="form-group"><label>Saldo</label><input type="number" id="bancoSaldo" step="0.01" value="${v(item,'saldo')}"></div>
            <button onclick="addBanco()">${acaoLabel}</button>
        `;
    } else if (type === 'financeiro') {
        modalTitle.textContent = item ? 'Editar Lançamento Financeiro' : 'Adicionar Lançamento Financeiro';
        const opts = data.bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        const catOpts = data.financeiro_categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        html = `
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="financeiroData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Banco</label><select id="financeiroBanco">${opts}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Tipo</label><select id="financeiroTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
                <div class="form-group">
                    <label>Motivo</label>
                    <select id="financeiroMotivo" onchange="tratarNovaCategoria()">${catOpts}<option value="__nova__">+ Nova categoria...</option></select>
                    <button type="button" onclick="gerenciarCategorias()" style="margin-top:5px; background:#ff6b6b; font-size:11px; padding:4px 8px;">🗑️ Gerenciar Categorias</button>
                </div>
            </div>
            <div class="form-group"><label>Responsável</label><input type="text" id="financeiroResponsavel" value="${v(item,'responsavel')}" placeholder="Quem é o responsável por esse lançamento"></div>
            <div class="form-group"><label>Descrição</label><textarea id="financeiroDescricao">${v(item,'descricao')}</textarea></div>
            <div class="form-group"><label>Valor</label><input type="number" id="financeiroValor" step="0.01" value="${v(item,'valor')}"></div>
            <button onclick="addFinanceiro()">${acaoLabel}</button>
        `;
        posRender = () => {
            document.getElementById('financeiroBanco').value = v(item,'banco_id');
            document.getElementById('financeiroTipo').value = v(item,'tipo','entrada');
            document.getElementById('financeiroMotivo').value = v(item,'motivo');
        };
    } else if (type === 'rota') {
        modalTitle.textContent = item ? 'Editar Rota' : 'Adicionar Rota';
        const veiculosOptions = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        const motoristasOptions = [...data.motoristas].sort((a,b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' })).map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        const rotasFixasOptions = [...data.rotas_fixas].sort((a,b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' })).map(rf => `<option value="${rf.id}">${rf.nome}</option>`).join('');
        html = `
            <div class="form-row">
                <div class="form-group"><label>Veículo</label><select id="rotaVeiculo">${veiculosOptions}</select></div>
                <div class="form-group"><label>Motorista</label><select id="rotaMotorista">${motoristasOptions}</select></div>
            </div>
            <div class="form-group"><label>Rota Fixa (opcional)</label><select id="rotaFixaId"><option value="">Nenhuma / rota avulsa</option>${rotasFixasOptions}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Local Saída</label><input type="text" id="rotaLocalSaida" value="${v(item,'local_saida')}"></div>
                <div class="form-group"><label>Destino</label><input type="text" id="rotaDestino" value="${v(item,'destino')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data Início</label><input type="date" id="rotaDataInicio" value="${v(item,'data_inicio')}"></div>
                <div class="form-group"><label>Data Fim</label><input type="date" id="rotaDataFim" value="${v(item,'data_fim')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Hora Início</label><input type="time" id="rotaHoraInicio" value="${v(item,'hora_inicio')}"></div>
                <div class="form-group"><label>Hora Fim</label><input type="time" id="rotaHoraFim" value="${v(item,'hora_fim')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>KM Início</label><input type="number" id="rotaKMInicio" value="${v(item,'km_inicio')}"></div>
                <div class="form-group"><label>KM Fim</label><input type="number" id="rotaKMFim" value="${v(item,'km_fim')}"></div>
            </div>
            <button onclick="addRota()">${acaoLabel}</button>
        `;
        posRender = () => {
            document.getElementById('rotaVeiculo').value = v(item,'veiculo_id');
            document.getElementById('rotaMotorista').value = v(item,'motorista_id');
            document.getElementById('rotaFixaId').value = v(item,'rota_fixa_id','');
        };
    } else if (type === 'rotaFixa') {
        modalTitle.textContent = item ? 'Editar Rota Fixa' : 'Nova Rota Fixa';
        html = `
            <div class="form-group"><label>Nome da Rota</label><input type="text" id="rotaFixaNome" value="${v(item,'nome')}" placeholder="Ex: Rota Centro-Bairro"></div>
            <div class="form-row">
                <div class="form-group"><label>Local de Saída</label><input type="text" id="rotaFixaSaida" value="${v(item,'local_saida')}"></div>
                <div class="form-group"><label>Local de Chegada</label><input type="text" id="rotaFixaChegada" value="${v(item,'local_chegada')}"></div>
            </div>
            <p style="font-size:12px; color:#666; margin: 5px 0 10px;">Custo de mão de obra <strong>mensal</strong> dessa rota fixa (recalculado todo mês — some tudo que gasta com motorista/funcionários nela por mês, não por viagem individual):</p>
            <div class="form-row">
                <div class="form-group"><label>Valor Mensal do Motorista</label><input type="number" id="rotaFixaValorMotorista" step="0.01" value="${v(item,'valor_motorista',0)}"></div>
                <div class="form-group"><label>Valor Mensal de Demais Funcionários</label><input type="number" id="rotaFixaValorFuncionarios" step="0.01" value="${v(item,'valor_funcionarios',0)}"></div>
            </div>
            <div class="form-group"><label>Valor Mensal de Outros</label><input type="number" id="rotaFixaOutrosValor" step="0.01" value="${v(item,'outros_valor',0)}"></div>
            <p style="font-size:12px; color:#666; margin: 15px 0 10px;">Faturamento <strong>mensal</strong> dessa rota fixa (pra calcular o saldo final descontando despesas de funcionários, veículo e imposto):</p>
            <div class="form-group"><label>Valor Mensal da Rota</label><input type="number" id="rotaFixaValor" step="0.01" value="${v(item,'valor_rota_fixa',0)}"></div>
            <div class="form-row">
                <div class="form-group"><label>Valor da Nota Fiscal (mensal)</label><input type="number" id="rotaFixaNotaFiscal" step="0.01" value="${v(item,'nota_fiscal_valor',0)}"></div>
                <div class="form-group"><label>Imposto sobre a Nota (%)</label><input type="number" id="rotaFixaImposto" step="0.01" value="${v(item,'imposto_percentual',0)}"></div>
            </div>
            <button onclick="addRotaFixa()">${acaoLabel}</button>
        `;
    } else if (type === 'produto') {
        modalTitle.textContent = item ? 'Editar Produto' : 'Adicionar Produto';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="produtoNome" value="${v(item,'nome')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Categoria</label><input type="text" id="produtoCategoria" value="${v(item,'categoria')}"></div>
                <div class="form-group"><label>Unidade</label><input type="text" id="produtoUnidade" value="${v(item,'unidade','un')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Quantidade${item ? ' Atual' : ' Inicial'}</label><input type="number" id="produtoQuantidade" step="0.01" value="${v(item,'quantidade',0)}"></div>
                <div class="form-group"><label>Quantidade Mínima (alerta)</label><input type="number" id="produtoQuantidadeMinima" step="0.01" value="${v(item,'quantidade_minima',0)}"></div>
            </div>
            <div class="form-group"><label>Valor Unitário</label><input type="number" id="produtoValorUnitario" step="0.01" value="${v(item,'valor_unitario',0)}"></div>
            <button onclick="addProduto()">${acaoLabel}</button>
        `;
    } else if (type === 'movimentacao') {
        modalTitle.textContent = 'Registrar Movimentação de Estoque';
        const opts = data.produtos.map(p => `<option value="${p.id}">${p.nome} (atual: ${p.quantidade} ${p.unidade})</option>`).join('');
        html = `
            <div class="form-group"><label>Produto</label><select id="movProduto">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Tipo</label><select id="movTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
                <div class="form-group"><label>Quantidade</label><input type="number" id="movQuantidade" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="movData"></div>
                <div class="form-group"><label>Motivo</label><input type="text" id="movMotivo"></div>
            </div>
            <button onclick="addMovimentacao()">Registrar</button>
        `;
    } else if (type === 'agenda') {
        modalTitle.textContent = item ? 'Editar Compromisso' : 'Adicionar Compromisso';
        html = `
            <div class="form-group"><label>Título</label><input type="text" id="agendaTitulo" value="${v(item,'titulo')}"></div>
            <div class="form-group"><label>Descrição</label><textarea id="agendaDescricao">${v(item,'descricao')}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="agendaData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Hora</label><input type="time" id="agendaHora" value="${v(item,'hora')}"></div>
            </div>
            <div class="form-group"><label>Categoria</label><input type="text" id="agendaCategoria" value="${v(item,'categoria')}"></div>
            <button onclick="addAgenda()">${acaoLabel}</button>
        `;
    } else if (type === 'escala') {
        modalTitle.textContent = item ? 'Editar Rota Programada' : 'Programar Rota';
        html = htmlModalEscala(item);
        posRender = () => { document.getElementById('escalaVeiculo').value = v(item,'veiculo_id', data.veiculos[0]?.id || ''); document.getElementById('escalaMotorista').value = v(item,'motorista_id'); document.getElementById('escalaRotaFixa').value = v(item,'rota_fixa_id'); };
    } else if (type === 'viagem') {
        modalTitle.textContent = item ? 'Editar Viagem de Turismo' : 'Adicionar Viagem de Turismo';
        const veiculosOptions = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        const motoristasOptions = [...data.motoristas].sort((a,b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' })).map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        const clientesOptions = [...data.clientes].sort((a,b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' })).map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        html = `
            <div class="form-row">
                <div class="form-group"><label>Local de Saída</label><input type="text" id="viagemLocalSaida" value="${v(item,'local_saida')}"></div>
                <div class="form-group"><label>Local de Chegada</label><input type="text" id="viagemLocalChegada" value="${v(item,'local_chegada')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Motorista</label><select id="viagemMotorista">${motoristasOptions}</select></div>
                <div class="form-group"><label>Cliente</label><select id="viagemCliente">${clientesOptions}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Veículo</label><select id="viagemVeiculo">${veiculosOptions}</select></div>
                <div class="form-group"><label>KM da Viagem</label><input type="number" id="viagemKM" value="${v(item,'km')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="viagemData" value="${v(item,'data')}"></div>
                <div class="form-group"><label>Horário</label><input type="time" id="viagemHorario" value="${v(item,'horario')}"></div>
            </div>
            <div class="form-group"><label>Valor da Viagem</label><input type="number" id="viagemValor" step="0.01" value="${v(item,'valor_viagem')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Valor da Nota Fiscal</label><input type="number" id="viagemNotaFiscal" step="0.01" value="${v(item,'nota_fiscal_valor')}"></div>
                <div class="form-group"><label>Imposto sobre a Nota (%)</label><input type="number" id="viagemImposto" step="0.01" value="${v(item,'imposto_percentual')}"></div>
            </div>
            <p style="font-size:11px; color:#666; margin: -5px 0 10px;">O valor do imposto (Nota Fiscal × % de Imposto) é descontado do Valor da Viagem pra calcular o Valor Líquido.</p>
            <div class="form-group"><label>Depreciação do Veículo</label><input type="number" id="viagemDepreciacao" step="0.01" value="${v(item,'depreciacao',0)}" placeholder="Informe o valor de depreciação dessa viagem"></div>
            <div class="form-group"><label>Valor do Pedágio</label><input type="number" id="viagemPedagio" step="0.01" value="${v(item,'valor_pedagio')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Valor da Diária do Motorista</label><input type="number" id="viagemDiaria" step="0.01" value="${v(item,'valor_diaria')}"></div>
                <div class="form-group"><label>Valor Pago pro Motorista</label><input type="number" id="viagemAdiantamento" step="0.01" value="${v(item,'adiantamento',0)}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Litros de Combustível</label><input type="number" id="viagemCombustivelLitros" step="0.01" value="${v(item,'combustivel_litros')}" oninput="calcularValorCombustivel()"></div>
                <div class="form-group"><label>Valor por Litro</label><input type="number" id="viagemCombustivelValorLitro" step="0.01" value="${v(item,'combustivel_valor_litro')}" oninput="calcularValorCombustivel()"></div>
            </div>
            <p style="font-size:11px; color:#666; margin: -5px 0 10px;">Valor do combustível (calculado automaticamente): <strong id="viagemCombustivelValorCalculado">R$ ${Number(v(item,'combustivel_valor',0)).toFixed(2)}</strong></p>
            <div class="form-row">
                <div class="form-group"><label>Outros (descrição)</label><input type="text" id="viagemOutrosDescricao" value="${v(item,'outros_descricao')}" placeholder="Ex: estacionamento"></div>
                <div class="form-group"><label>Outros (valor)</label><input type="number" id="viagemOutrosValor" step="0.01" value="${v(item,'outros_valor')}"></div>
            </div>
            <div class="form-group"><label>Acerto do Motorista</label><select id="viagemAcerto"><option value="false">Pendente</option><option value="true">Pago</option></select></div>
            <button onclick="addViagem()">${acaoLabel}</button>
        `;
        posRender = () => {
            document.getElementById('viagemMotorista').value = v(item,'motorista_id');
            document.getElementById('viagemCliente').value = v(item,'cliente_id');
            document.getElementById('viagemVeiculo').value = v(item,'veiculo_id');
            document.getElementById('viagemAcerto').value = item ? String(!!item.acerto_motorista_pago) : 'false';
        };
    } else if (type === 'simularViagem') {
        modalTitle.textContent = '🧮 Simular Viagem';
        const veiculosOptions = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa} - ${vv.marca} ${vv.modelo}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="simVeiculo">${veiculosOptions}</select></div>
            <div class="form-group"><label>KM previstos para a viagem</label><input type="number" id="simKM"></div>
            <div class="form-row">
                <div class="form-group"><label>Valor a Pagar ao Motorista</label><input type="number" id="simValorMotorista" step="0.01" value="0"></div>
                <div class="form-group"><label>Adiantamento de Viagem</label><input type="number" id="simAdiantamento" step="0.01" value="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Valor da Nota Fiscal</label><input type="number" id="simNotaFiscal" step="0.01" value="0"></div>
                <div class="form-group"><label>Imposto sobre a Nota (%)</label><input type="number" id="simImposto" step="0.01" value="0"></div>
            </div>
            <div class="form-group"><label>Margem de Lucro Desejada (%)</label><input type="number" id="simMargem" value="20"></div>
            <button onclick="simularViagem()">Calcular</button>
            <div id="simResultado"></div>
        `;
    }

    modalBody.innerHTML = html;
    if (posRender) posRender();
    if (type === 'pneu') calcularValorTotalPneu();
    modal.classList.add('active');
}

function closeModal() { document.getElementById('modal').classList.remove('active'); editContext = null; }

function atualizarCamposFuncionario() {
    const status = document.getElementById('funcionarioStatus').value;
    document.getElementById('grupoDemissao').style.display = status === 'demitido' ? 'block' : 'none';
    document.getElementById('grupoExperiencia').style.display = status === 'experiencia' ? 'flex' : 'none';
}

function gerenciarCategorias() {
    document.getElementById('modalTitle').textContent = '🗑️ Gerenciar Categorias';
    document.getElementById('modalBody').innerHTML = `
        <p style="font-size:12px; color:#666; margin-bottom:10px;">Excluir uma categoria não apaga os lançamentos que já usam ela — só remove da lista de opções pra novos lançamentos.</p>
        <div id="listaCategoriasGerenciar"></div>
        <button onclick="openAddModal('financeiro', editContext ? data.financeiro.find(f=>f.id===editContext.id) : null)" style="margin-top:15px;">Voltar</button>
    `;
    document.getElementById('modal').classList.add('active');
    renderListaCategoriasGerenciar();
}

function renderListaCategoriasGerenciar() {
    document.getElementById('listaCategoriasGerenciar').innerHTML = data.financeiro_categorias.map(c => `
        <div class="gasto-item">
            <div class="gasto-info"><h4>${c.nome}</h4></div>
            <button class="btn-small" onclick="excluirCategoriaFinanceira('${c.id}')">Excluir</button>
        </div>`).join('') || '<p style="color:#666;">Nenhuma categoria cadastrada.</p>';
}

async function excluirCategoriaFinanceira(id) {
    if (!(await confirmar('Excluir essa categoria da lista? Lançamentos que já usam ela continuam normais.', { titulo: 'Excluir categoria', okLabel: 'Excluir', perigo: true }))) return;
    const { error } = await sb.from('financeiro_categorias').delete().eq('id', id);
    if (error) { alertErro(error); return; }
    data.financeiro_categorias = data.financeiro_categorias.filter(c => c.id !== id);
    renderListaCategoriasGerenciar();
    preencherFiltroMotivo();
}

async function tratarNovaCategoria() {
    const sel = document.getElementById('financeiroMotivo');
    if (sel.value !== '__nova__') return;
    const novaCategoria = await perguntar('Digite o nome da nova categoria:', '', 'Nova categoria');
    if (!novaCategoria) { sel.value = data.financeiro_categorias[0]?.nome || ''; return; }
    const { error } = await sb.from('financeiro_categorias').insert({ empresa_id: currentEmpresa.id, nome: novaCategoria });
    if (error) { alertErro(error); sel.value = data.financeiro_categorias[0]?.nome || ''; return; }
    data.financeiro_categorias.push({ nome: novaCategoria });
    data.financeiro_categorias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const catOpts = data.financeiro_categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    sel.innerHTML = catOpts + '<option value="__nova__">+ Nova categoria...</option>';
    sel.value = novaCategoria;
    preencherFiltroMotivo();
}

function autoPreencherKm(prefixo) {
    const veiculoId = document.getElementById(`${prefixo}Veiculo`).value;
    const veiculo = data.veiculos.find(vv => vv.id === veiculoId);
    if (veiculo) document.getElementById(`${prefixo}KMAtual`).value = veiculo.km_atual || 0;
}

function calcularValorTotalPneu() {
    const qtd = parseFloat(document.getElementById('pneuQuantidade').value) || 0;
    const valorUnit = parseFloat(document.getElementById('pneuValorUnitario').value) || 0;
    document.getElementById('pneuValor').value = (qtd * valorUnit).toFixed(2);
}

function simularViagem() {
    const veiculoId = document.getElementById('simVeiculo').value;
    const km = parseFloat(document.getElementById('simKM').value);
    const valorMotorista = parseFloat(document.getElementById('simValorMotorista').value) || 0;
    const adiantamento = parseFloat(document.getElementById('simAdiantamento').value) || 0;
    const notaFiscal = parseFloat(document.getElementById('simNotaFiscal').value) || 0;
    const impostoPercentual = parseFloat(document.getElementById('simImposto').value) || 0;
    const margem = parseFloat(document.getElementById('simMargem').value) || 0;
    if (!veiculoId || !km) { avisar('Selecione o veículo e informe o KM'); return; }
    const custoKm = custoPorKmVeiculo(veiculoId);
    const veiculo = data.veiculos.find(vv => vv.id === veiculoId);
    if (custoKm === 0) {
        document.getElementById('simResultado').innerHTML = `<div class="sim-result"><h3>Sem dados suficientes</h3><p>Esse veículo ainda não tem rotas + gastos registrados para calcular um custo/km histórico.</p></div>`;
        return;
    }
    const despesaVeiculo = custoKm * km;
    const impostoValor = notaFiscal * impostoPercentual / 100;
    const custoTotal = despesaVeiculo + valorMotorista + adiantamento + impostoValor;
    const valorSugerido = custoTotal * (1 + margem / 100);
    const lucroEstimado = valorSugerido - custoTotal;

    document.getElementById('simResultado').innerHTML = `
        <div class="sim-result">
            <h3>Estimativa para ${veiculo.placa}</h3>
            <p><strong>Custo histórico por KM:</strong> R$ ${custoKm.toFixed(2)}/km</p>
            <p><strong>KM da viagem:</strong> ${km} km</p>
            <p><strong>Despesa do veículo (combustível/manutenção):</strong> R$ ${despesaVeiculo.toFixed(2)}</p>
            <p><strong>Valor ao motorista:</strong> R$ ${valorMotorista.toFixed(2)}</p>
            <p><strong>Adiantamento de viagem:</strong> R$ ${adiantamento.toFixed(2)}</p>
            <p><strong>Nota Fiscal:</strong> R$ ${notaFiscal.toFixed(2)} — <strong>Imposto (${impostoPercentual}%):</strong> R$ ${impostoValor.toFixed(2)}</p>
            <p style="font-size:16px; margin-top:8px;"><strong>Custo Total:</strong> R$ ${custoTotal.toFixed(2)}</p>
            <p style="font-size:22px; margin-top:10px; color:#0066cc;"><strong>Valor Sugerido (com ${margem}% de margem):</strong> R$ ${valorSugerido.toFixed(2)}</p>
            <p style="font-size:14px; color:#4caf50;"><strong>Lucro estimado:</strong> R$ ${lucroEstimado.toFixed(2)}</p>
        </div>`;
}

// ==== ADICIONAR / EDITAR ITENS ====
async function addMotorista() {
    const isEdit = editContext && editContext.type === 'motorista';
    const nome = document.getElementById('motoristaNome').value;
    const cpf = document.getElementById('motoristaCPF').value;
    const telefone = document.getElementById('motoristaTelefone').value;
    const endereco = document.getElementById('motoristaEndereco').value;
    const data_nascimento = document.getElementById('motoristaDataNasc').value;
    const cnh_validade = document.getElementById('motoristaCnhValidade').value || null;
    const salario = parseFloat(document.getElementById('motoristaSalario').value) || null;
    if (!nome || !cpf || !telefone || !endereco || !data_nascimento) { avisar('Preencha todos os campos obrigatórios'); return; }
    if (parseDataLocal(data_nascimento) > new Date()) return marcarCampoInvalido('motoristaDataNasc', 'A data de nascimento não pode estar no futuro.');
    if (!(await validarOuConfirmar(validarCPF(cpf), 'motoristaCPF', 'O CPF informado parece inválido.'))) return;
    if (!(await validarOuConfirmar(validarTelefone(telefone), 'motoristaTelefone', 'O telefone deve ter DDD + número (10 ou 11 dígitos).'))) return;
    const payload = { nome, cpf, telefone, endereco, data_nascimento, cnh_validade, salario };
    const { error } = isEdit
        ? await sb.from('motoristas').update(payload).eq('id', editContext.id)
        : await sb.from('motoristas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function addFuncionario() {
    const isEdit = editContext && editContext.type === 'funcionario';
    const nome = document.getElementById('funcionarioNome').value;
    const funcao = document.getElementById('funcionarioFuncao').value;
    const salario = parseFloat(document.getElementById('funcionarioSalario').value) || null;
    const cpf = document.getElementById('funcionarioCPF').value;
    const telefone = document.getElementById('funcionarioTelefone').value;
    const endereco = document.getElementById('funcionarioEndereco').value;
    const data_nascimento = document.getElementById('funcionarioDataNasc').value;
    let status = document.getElementById('funcionarioStatus').value;
    const data_admissao = document.getElementById('funcionarioAdmissao').value || null;
    const data_demissao = document.getElementById('funcionarioDemissao')?.value || null;
    const experiencia_inicio = document.getElementById('funcionarioExpInicio')?.value || null;
    const experiencia_fim = document.getElementById('funcionarioExpFim')?.value || null;
    if (!nome || !cpf || !telefone || !endereco || !data_nascimento) { avisar('Preencha todos os campos obrigatórios'); return; }
    if (parseDataLocal(data_nascimento) > new Date()) return marcarCampoInvalido('funcionarioDataNasc', 'A data de nascimento não pode estar no futuro.');
    if (data_admissao && data_demissao && parseDataLocal(data_demissao) < parseDataLocal(data_admissao)) return marcarCampoInvalido('funcionarioDemissao', 'A demissão não pode ser antes da admissão.');
    if (experiencia_inicio && experiencia_fim && parseDataLocal(experiencia_fim) < parseDataLocal(experiencia_inicio)) return marcarCampoInvalido('funcionarioExpFim', 'O fim da experiência não pode ser antes do início.');
    if (!(await validarOuConfirmar(validarCPF(cpf), 'funcionarioCPF', 'O CPF informado parece inválido.'))) return;
    if (!(await validarOuConfirmar(validarTelefone(telefone), 'funcionarioTelefone', 'O telefone deve ter DDD + número (10 ou 11 dígitos).'))) return;

    // se preencheu data de demissão, move automaticamente pra "demitido"
    if (data_demissao) status = 'demitido';

    const payload = { nome, funcao, salario, cpf, telefone, endereco, data_nascimento, status, data_admissao, data_demissao, experiencia_inicio, experiencia_fim };
    const { error } = isEdit
        ? await sb.from('funcionarios').update(payload).eq('id', editContext.id)
        : await sb.from('funcionarios').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function addVeiculo() {
    const isEdit = editContext && editContext.type === 'veiculo';
    const placa = document.getElementById('veiculoPlaca').value;
    const marca = document.getElementById('veiculoMarca').value;
    const modelo = document.getElementById('veiculoModelo').value;
    const ano = document.getElementById('veiculoAno').value;
    const chassi = document.getElementById('veiculoChassi').value;
    const renavam = document.getElementById('veiculoRenavam').value;
    const km_atual = parseFloat(document.getElementById('veiculoKmAtual').value) || 0;
    const numero_bancos = parseInt(document.getElementById('veiculoNumeroBancos').value) || null;
    const valor = parseFloat(document.getElementById('veiculoValor').value) || null;
    const tanque_litros = parseFloat(document.getElementById('veiculoTanqueLitros').value) || null;
    const csv_validade = document.getElementById('veiculoCsvValidade').value || null;
    const csv_valor = parseFloat(document.getElementById('veiculoCsvValor').value) || null;
    const tacografo_validade = document.getElementById('veiculoTacografoValidade').value || null;
    const apolice_validade = document.getElementById('veiculoApoliceValidade').value || null;
    const apolice_valor = parseFloat(document.getElementById('veiculoApoliceValor').value) || null;
    const crlv_ano = document.getElementById('veiculoCrlvAno').value || null;
    if (!placa || !marca || !modelo || !ano) { avisar('Preencha placa, marca, modelo e ano'); return; }
    const anoNum = parseInt(ano);
    if (!(anoNum >= 1950 && anoNum <= new Date().getFullYear() + 1)) return marcarCampoInvalido('veiculoAno', 'Ano do veículo inválido.');
    const placaNorm = String(placa).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (data.veiculos.some(x => x.id !== editContext?.id && String(x.placa).toUpperCase().replace(/[^A-Z0-9]/g, '') === placaNorm)) return marcarCampoInvalido('veiculoPlaca', 'Já existe um veículo com essa placa.');
    if (!(await validarOuConfirmar(validarPlaca(placa), 'veiculoPlaca', 'A placa não está no formato ABC-1234 nem ABC1D23.'))) return;
    const payload = { placa, marca, modelo, ano: parseInt(ano), chassi, renavam, km_atual, numero_bancos, valor, tanque_litros, csv_validade, csv_valor, tacografo_validade, apolice_validade, apolice_valor, crlv_ano: crlv_ano ? parseInt(crlv_ano) : null };
    const { error } = isEdit
        ? await sb.from('veiculos').update(payload).eq('id', editContext.id)
        : await sb.from('veiculos').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function addCliente() {
    const isEdit = editContext && editContext.type === 'cliente';
    const nome = document.getElementById('clienteNome').value;
    const cpf_cnpj = document.getElementById('clienteCPF').value;
    const telefone = document.getElementById('clienteTelefone').value;
    const rua = document.getElementById('clienteRua').value;
    const numero = document.getElementById('clienteNumero').value;
    const bairro = document.getElementById('clienteBairro').value;
    const cidade = document.getElementById('clienteCidade').value;
    const uf = document.getElementById('clienteUf').value;
    const cep = document.getElementById('clienteCep').value;
    const data_nascimento = document.getElementById('clienteDataNasc').value || null;
    if (!nome) return marcarCampoInvalido('clienteNome', 'Informe o nome do cliente.');
    if (cpf_cnpj && !(await validarOuConfirmar(validarCpfCnpj(cpf_cnpj), 'clienteCPF', 'O CPF/CNPJ informado parece inválido.'))) return;
    if (telefone && !(await validarOuConfirmar(validarTelefone(telefone), 'clienteTelefone', 'O telefone deve ter DDD + número (10 ou 11 dígitos).'))) return;
    if (data_nascimento && parseDataLocal(data_nascimento) > new Date()) return marcarCampoInvalido('clienteDataNasc', 'A data de nascimento não pode estar no futuro.');
    const payload = { nome, cpf_cnpj, telefone, rua, numero, bairro, cidade, uf, cep, data_nascimento };
    const { error } = isEdit
        ? await sb.from('clientes').update(payload).eq('id', editContext.id)
        : await sb.from('clientes').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function addAbastecimento() {
    const isEdit = editContext && editContext.type === 'abastecimento';
    const veiculo_id = document.getElementById('abastecimentoVeiculo').value;
    const fonte = document.getElementById('abastecimentoFonte').value;
    const data_abast = document.getElementById('abastecimentoData').value;
    const km = parseFloat(document.getElementById('abastecimentoKM').value);
    const litros = parseFloat(document.getElementById('abastecimentoLitros').value);
    const valor_litro = parseFloat(document.getElementById('abastecimentoValorL').value);
    const valor_total = parseFloat(document.getElementById('abastecimentoValorTotal').value);
    if (!veiculo_id || !data_abast || !km || !litros || !valor_litro) { avisar('Preencha todos os campos'); return; }

    if (fonte === 'bomba' && !isEdit) {
        const nivel = nivelBomba();
        if (litros > nivel.atual) {
            if (!(await confirmar(`A bomba só tem ${nivel.atual.toFixed(0)} L disponíveis. Isso vai deixar o nível negativo. Continuar mesmo assim?`, { titulo: 'Nível negativo' }))) return;
        }
    }

    let kml = 0;
    const dataAtualParsed = parseDataLocal(data_abast);
    const anteriores = data.abastecimentos
        .filter(a => a.veiculo_id === veiculo_id && a.id !== editContext?.id)
        .map(a => ({ ...a, _dataParsed: parseDataLocal(a.data) }))
        .filter(a => a._dataParsed && dataAtualParsed && (a._dataParsed < dataAtualParsed || (a._dataParsed.getTime() === dataAtualParsed.getTime() && Number(a.km) < km)))
        .sort((a, b) => b._dataParsed - a._dataParsed || Number(b.km) - Number(a.km));
    if (anteriores.length > 0) { const diff = km - anteriores[0].km; kml = diff > 0 ? diff / litros : 0; }

    const payload = { veiculo_id, fonte, data: data_abast, km, litros, valor_litro, valor_total, kml };
    const { error } = isEdit
        ? await sb.from('abastecimentos').update(payload).eq('id', editContext.id)
        : await sb.from('abastecimentos').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); await recalcularKmVeiculo(veiculo_id); await recalcularMediaKmLVeiculo(veiculo_id); await loadData(); updateDashboard();
}

async function addPneu() {
    const isEdit = editContext && editContext.type === 'pneu';
    const veiculo_id = document.getElementById('pneuVeiculo').value;
    const data_pneu = document.getElementById('pneuData').value;
    const tipo = document.getElementById('pneuTipo').value;
    const oficina = document.getElementById('pneuOficina').value;
    const quantidade = parseInt(document.getElementById('pneuQuantidade').value) || 1;
    const valor_unitario = parseFloat(document.getElementById('pneuValorUnitario').value) || 0;
    const valor = parseFloat(document.getElementById('pneuValor').value) || 0;
    const km_atual = parseFloat(document.getElementById('pneuKMAtual').value);
    const km_proxima = parseFloat(document.getElementById('pneuKMProxima').value);
    if (!veiculo_id || !data_pneu || !km_atual) { avisar('Preencha ao menos veículo, data e KM da troca'); return; }
    const payload = { veiculo_id, data: data_pneu, tipo, oficina, quantidade, valor_unitario, valor, km_atual, km_proxima };
    const { error } = isEdit
        ? await sb.from('pneus').update(payload).eq('id', editContext.id)
        : await sb.from('pneus').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); await recalcularKmVeiculo(veiculo_id); await loadData(); updateDashboard();
}

async function addOleo() {
    const isEdit = editContext && editContext.type === 'oleo';
    const veiculo_id = document.getElementById('oleoVeiculo').value;
    const fonte = document.getElementById('oleoFonte').value;
    const data_oleo = document.getElementById('oleoData').value;
    const tipo = document.getElementById('oleoTipo').value;
    const lugar = document.getElementById('oleoLugar').value;
    const litragem = parseFloat(document.getElementById('oleoLitragem').value) || null;
    const km_atual = parseFloat(document.getElementById('oleoKMAtual').value);
    const valor = parseFloat(document.getElementById('oleoValor').value);
    const km_proxima = parseFloat(document.getElementById('oleoKMProxima').value);
    if (!veiculo_id || !data_oleo || !tipo || !km_atual || !valor || !km_proxima) { avisar('Preencha todos os campos obrigatórios'); return; }

    if (fonte === 'galao' && !isEdit && litragem) {
        const nivel = nivelGalaoOleo();
        if (litragem > nivel.atual) {
            if (!(await confirmar(`O galão só tem ${nivel.atual.toFixed(1)} L disponíveis. Isso vai deixar o nível negativo. Continuar mesmo assim?`, { titulo: 'Nível negativo' }))) return;
        }
    }

    const payload = { veiculo_id, fonte, data: data_oleo, tipo, lugar, litragem, km_atual, valor, km_proxima };
    const { error } = isEdit
        ? await sb.from('oleos').update(payload).eq('id', editContext.id)
        : await sb.from('oleos').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); await recalcularKmVeiculo(veiculo_id); await loadData(); updateDashboard();
}

async function addPreventiva() {
    const isEdit = editContext && editContext.type === 'preventiva';
    const veiculo_id = document.getElementById('preventivaVeiculo').value;
    const data_prev = document.getElementById('preventivaData').value;
    const descricao = document.getElementById('preventivaDescricao').value;
    const km_atual = parseFloat(document.getElementById('preventivaKMAtual').value);
    const km_proxima = parseFloat(document.getElementById('preventivaKMProxima').value);
    const valor = parseFloat(document.getElementById('preventivaValor').value);
    if (!veiculo_id || !data_prev || !descricao || !km_atual || !km_proxima || !valor) { avisar('Preencha todos os campos'); return; }
    const payload = { veiculo_id, data: data_prev, descricao, km_atual, km_proxima, valor };
    const { error } = isEdit
        ? await sb.from('preventivas').update(payload).eq('id', editContext.id)
        : await sb.from('preventivas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); await recalcularKmVeiculo(veiculo_id); await loadData(); updateDashboard();
}

async function addCorretiva() {
    const isEdit = editContext && editContext.type === 'corretiva';
    const veiculo_id = document.getElementById('corretivaVeiculo').value;
    const data_cor = document.getElementById('corretivaData').value;
    const descricao = document.getElementById('corretivaDescricao').value;
    const oficina = document.getElementById('corretivaOficina').value;
    const km_atual = parseFloat(document.getElementById('corretivaKMAtual').value) || null;
    const km_proxima = parseFloat(document.getElementById('corretivaKMProxima').value) || null;
    const valor = parseFloat(document.getElementById('corretivaValor').value);
    if (!veiculo_id || !data_cor || !descricao || !valor) { avisar('Preencha veículo, data, descrição e valor'); return; }
    const payload = { veiculo_id, data: data_cor, descricao, oficina, km_atual, km_proxima, valor };
    const { error } = isEdit
        ? await sb.from('corretivas').update(payload).eq('id', editContext.id)
        : await sb.from('corretivas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); await recalcularKmVeiculo(veiculo_id); await loadData(); updateDashboard();
}

async function addCargaBomba() {
    const isEdit = editContext && editContext.type === 'cargaBomba';
    const data_carga = document.getElementById('cargaBombaData').value;
    const litros = parseFloat(document.getElementById('cargaBombaLitros').value);
    const valor_total = parseFloat(document.getElementById('cargaBombaValor').value);
    const fornecedor = document.getElementById('cargaBombaFornecedor').value;
    if (!data_carga || !litros || !valor_total) { avisar('Preencha data, litros e valor total'); return; }
    const payload = { data: data_carga, litros, valor_total, fornecedor };
    const { error } = isEdit
        ? await sb.from('bomba_cargas').update(payload).eq('id', editContext.id)
        : await sb.from('bomba_cargas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); loadBomba(); updateDashboard();
}

async function salvarAlertaBomba() {
    const valor = parseFloat(document.getElementById('alertaBombaValor').value);
    if (isNaN(valor)) { avisar('Informe um número válido'); return; }
    const { error } = await sb.from('empresas').update({ bomba_alerta_minimo: valor }).eq('id', currentEmpresa.id);
    if (error) { alertErro(error); return; }
    currentEmpresa.bomba_alerta_minimo = valor;
    closeModal(); loadBomba();
}

async function addCargaGalaoOleo() {
    const isEdit = editContext && editContext.type === 'cargaGalaoOleo';
    const data_carga = document.getElementById('cargaGalaoData').value;
    const tipo_oleo = document.getElementById('cargaGalaoTipo').value;
    const litros = parseFloat(document.getElementById('cargaGalaoLitros').value);
    const valor_total = parseFloat(document.getElementById('cargaGalaoValor').value);
    const fornecedor = document.getElementById('cargaGalaoFornecedor').value;
    if (!data_carga || !litros || !valor_total) { avisar('Preencha data, litros e valor total'); return; }
    const payload = { data: data_carga, tipo_oleo, litros, valor_total, fornecedor };
    const { error } = isEdit
        ? await sb.from('galao_oleo_cargas').update(payload).eq('id', editContext.id)
        : await sb.from('galao_oleo_cargas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); loadGalaoOleo(); updateDashboard();
}

async function salvarAlertaGalaoOleo() {
    const valor = parseFloat(document.getElementById('alertaGalaoValor').value);
    if (isNaN(valor)) { avisar('Informe um número válido'); return; }
    const { error } = await sb.from('empresas').update({ galao_oleo_alerta_minimo: valor }).eq('id', currentEmpresa.id);
    if (error) { alertErro(error); return; }
    currentEmpresa.galao_oleo_alerta_minimo = valor;
    closeModal(); loadGalaoOleo();
}

async function addContaPagar() {
    const isEdit = editContext && editContext.type === 'contaPagar';
    const fornecedor = document.getElementById('contaPagarFornecedor').value;
    const descricao = document.getElementById('contaPagarDescricao').value;
    const valor = parseFloat(document.getElementById('contaPagarValor').value);
    const data_vencimento = document.getElementById('contaPagarVencimento').value;
    if (!fornecedor || !valor || !data_vencimento) { avisar('Preencha fornecedor, valor e data de vencimento'); return; }
    const payload = { fornecedor, descricao, valor, data_vencimento };
    const { error } = isEdit
        ? await sb.from('contas_pagar').update(payload).eq('id', editContext.id)
        : await sb.from('contas_pagar').insert({ empresa_id: currentEmpresa.id, ...payload, status: 'pendente' });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function marcarContaPaga(id) {
    const conta = data.contas_pagar.find(c => c.id === id);
    if (!conta) return;
    if (data.bancos.length === 0) { avisar('Cadastre um banco primeiro pra poder marcar como pago.'); return; }
    const banco = await escolherBanco('Marcar como pago', `"${conta.fornecedor}" — R$ ${Number(conta.valor).toFixed(2)}\nDe qual banco vai sair o dinheiro?`);
    if (!banco) return;

    const categoria = data.financeiro_categorias.find(c => c.nome === 'Outro')?.nome || data.financeiro_categorias[0]?.nome || 'Outro';
    const { error: errFin } = await sb.from('financeiro').insert({
        empresa_id: currentEmpresa.id, banco_id: banco.id, data: hojeISO(), tipo: 'saida',
        motivo: categoria, descricao: `Conta paga - ${conta.fornecedor}${conta.descricao ? ' - ' + conta.descricao : ''}`, valor: Number(conta.valor)
    });
    if (errFin) { alertErro(errFin); return; }
    // com o gatilho do banco (seguranca_banco.sql) o saldo é ajustado lá; senão ajusta aqui
    if (!saldoAutomatico) await sb.from('bancos').update({ saldo: Number(banco.saldo) - Number(conta.valor) }).eq('id', banco.id);
    const { error: errConta } = await sb.from('contas_pagar').update({ status: 'pago', data_pagamento: hojeISO(), banco_id: banco.id }).eq('id', id);
    if (errConta) alertErro(errConta);

    await loadData(); updateDashboard();
}

async function addContaReceber() {
    const isEdit = editContext && editContext.type === 'contaReceber';
    const cliente_id = document.getElementById('contaReceberCliente').value || null;
    const descricao = document.getElementById('contaReceberDescricao').value;
    const valor = parseFloat(document.getElementById('contaReceberValor').value);
    const data_vencimento = document.getElementById('contaReceberVencimento').value;
    if (!valor || !data_vencimento) { avisar('Preencha valor e data de vencimento'); return; }
    const payload = { cliente_id, descricao, valor, data_vencimento };
    const { error } = isEdit
        ? await sb.from('contas_receber').update(payload).eq('id', editContext.id)
        : await sb.from('contas_receber').insert({ empresa_id: currentEmpresa.id, ...payload, status: 'pendente' });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function marcarContaRecebida(id) {
    const conta = data.contas_receber.find(c => c.id === id);
    if (!conta) return;
    if (data.bancos.length === 0) { avisar('Cadastre um banco primeiro pra poder marcar como recebido.'); return; }
    const nomeCliente = data.clientes.find(c => c.id === conta.cliente_id)?.nome || 'Cliente';
    const banco = await escolherBanco('Marcar como recebido', `Recebimento de "${nomeCliente}" — R$ ${Number(conta.valor).toFixed(2)}\nEm qual banco o dinheiro entrou?`);
    if (!banco) return;

    const categoria = data.financeiro_categorias.find(c => c.nome === 'Outro')?.nome || data.financeiro_categorias[0]?.nome || 'Outro';
    const { error: errFin } = await sb.from('financeiro').insert({
        empresa_id: currentEmpresa.id, banco_id: banco.id, data: hojeISO(), tipo: 'entrada',
        motivo: categoria, descricao: `Recebimento - ${nomeCliente}${conta.descricao ? ' - ' + conta.descricao : ''}`, valor: Number(conta.valor)
    });
    if (errFin) { alertErro(errFin); return; }
    if (!saldoAutomatico) await sb.from('bancos').update({ saldo: Number(banco.saldo) + Number(conta.valor) }).eq('id', banco.id);
    const { error: errConta } = await sb.from('contas_receber').update({ status: 'recebido', data_recebimento: hojeISO(), banco_id: banco.id }).eq('id', id);
    if (errConta) alertErro(errConta);

    await loadData(); updateDashboard();
}

async function addMulta() {
    const isEdit = editContext && editContext.type === 'multa';
    const veiculo_id = document.getElementById('multaVeiculo').value;
    const data_multa = document.getElementById('multaData').value;
    const descricao = document.getElementById('multaDescricao').value;
    const valor = parseFloat(document.getElementById('multaValor').value);
    if (!veiculo_id || !data_multa || !descricao || !valor) { avisar('Preencha todos os campos'); return; }
    const payload = { veiculo_id, data: data_multa, descricao, valor };
    const { error } = isEdit
        ? await sb.from('multas').update(payload).eq('id', editContext.id)
        : await sb.from('multas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function addBanco() {
    const isEdit = editContext && editContext.type === 'banco';
    const nome = document.getElementById('bancoNome').value;
    const agencia = document.getElementById('bancoAgencia').value;
    const conta = document.getElementById('bancoConta').value;
    const saldo = parseFloat(document.getElementById('bancoSaldo').value);
    if (!nome || !agencia || !conta || (isNaN(saldo))) { avisar('Preencha todos os campos'); return; }
    const payload = { nome, agencia, conta, saldo };
    const { error } = isEdit
        ? await sb.from('bancos').update(payload).eq('id', editContext.id)
        : await sb.from('bancos').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function addFinanceiro() {
    const isEdit = editContext && editContext.type === 'financeiro';
    const data_fin = document.getElementById('financeiroData').value;
    const banco_id = document.getElementById('financeiroBanco').value;
    const tipo = document.getElementById('financeiroTipo').value;
    let motivo = document.getElementById('financeiroMotivo').value;
    const responsavel = document.getElementById('financeiroResponsavel').value;
    const descricao = document.getElementById('financeiroDescricao').value;
    const valor = parseFloat(document.getElementById('financeiroValor').value);

    if (motivo === '__nova__') {
        const novaCategoria = await perguntar('Nome da nova categoria:', '', 'Nova categoria');
        if (!novaCategoria) return;
        const { error: errCat } = await sb.from('financeiro_categorias').insert({ empresa_id: currentEmpresa.id, nome: novaCategoria });
        if (errCat) { alertErro(errCat); return; }
        motivo = novaCategoria;
    }
    if (!data_fin || !banco_id || !tipo || !motivo || !valor) { avisar('Preencha todos os campos obrigatórios'); return; }

    if (valor < 0) return marcarCampoInvalido('financeiroValor', 'O valor deve ser positivo. Para uma saída, escolha o tipo "Saída".');

    const antigo = isEdit ? data.financeiro.find(f => f.id === editContext.id) : null;
    const payload = { banco_id, data: data_fin, tipo, motivo, responsavel, descricao, valor };
    const { error } = isEdit
        ? await sb.from('financeiro').update(payload).eq('id', editContext.id)
        : await sb.from('financeiro').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }

    // Com o gatilho do banco (seguranca_banco.sql) o saldo é ajustado lá, de forma atômica.
    // Sem ele, o navegador faz o ajuste: desfaz o lançamento antigo e aplica o novo.
    if (!saldoAutomatico) {
        if (antigo) {
            const { data: bAntigo } = await sb.from('bancos').select('*').eq('id', antigo.banco_id).single();
            if (bAntigo) {
                const revertido = antigo.tipo === 'entrada' ? Number(bAntigo.saldo) - Number(antigo.valor) : Number(bAntigo.saldo) + Number(antigo.valor);
                await sb.from('bancos').update({ saldo: revertido }).eq('id', bAntigo.id);
            }
        }
        const { data: bancoAtualizado } = await sb.from('bancos').select('*').eq('id', banco_id).single();
        if (bancoAtualizado) {
            const novoSaldo = tipo === 'entrada' ? Number(bancoAtualizado.saldo) + valor : Number(bancoAtualizado.saldo) - valor;
            await sb.from('bancos').update({ saldo: novoSaldo }).eq('id', banco_id);
        }
    }
    closeModal(); await loadData(); updateDashboard();
}

async function addRota() {
    const isEdit = editContext && editContext.type === 'rota';
    const veiculo_id = document.getElementById('rotaVeiculo').value;
    const motorista_id = document.getElementById('rotaMotorista').value;
    const rota_fixa_id = document.getElementById('rotaFixaId').value || null;
    const local_saida = document.getElementById('rotaLocalSaida').value;
    const destino = document.getElementById('rotaDestino').value;
    const data_inicio = document.getElementById('rotaDataInicio').value;
    const data_fim = document.getElementById('rotaDataFim').value;
    const hora_inicio = document.getElementById('rotaHoraInicio').value;
    const hora_fim = document.getElementById('rotaHoraFim').value;
    const km_inicio = parseFloat(document.getElementById('rotaKMInicio').value);
    const km_fim = parseFloat(document.getElementById('rotaKMFim').value);
    if (!veiculo_id || !motorista_id || !local_saida || !destino || !data_inicio || !data_fim || !hora_inicio || !hora_fim || !km_inicio || !km_fim) { avisar('Preencha todos os campos'); return; }
    if (km_fim <= km_inicio) return marcarCampoInvalido('rotaKMFim', 'O KM final precisa ser maior que o KM inicial.');
    if (new Date(`${data_fim}T${hora_fim}`) < new Date(`${data_inicio}T${hora_inicio}`)) return marcarCampoInvalido('rotaDataFim', 'O fim da rota não pode ser antes do início.');
    const payload = { veiculo_id, motorista_id, rota_fixa_id, local_saida, destino, data_inicio, data_fim, hora_inicio, hora_fim, km_inicio, km_fim };
    const { error } = isEdit
        ? await sb.from('rotas').update(payload).eq('id', editContext.id)
        : await sb.from('rotas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); await recalcularKmVeiculo(veiculo_id); await loadData(); updateDashboard();
}

async function addRotaFixa() {
    const isEdit = editContext && editContext.type === 'rotaFixa';
    const nome = document.getElementById('rotaFixaNome').value;
    const local_saida = document.getElementById('rotaFixaSaida').value;
    const local_chegada = document.getElementById('rotaFixaChegada').value;
    const valor_motorista = parseFloat(document.getElementById('rotaFixaValorMotorista').value) || 0;
    const valor_funcionarios = parseFloat(document.getElementById('rotaFixaValorFuncionarios').value) || 0;
    const outros_valor = parseFloat(document.getElementById('rotaFixaOutrosValor').value) || 0;
    const valor_rota_fixa = parseFloat(document.getElementById('rotaFixaValor').value) || 0;
    const nota_fiscal_valor = parseFloat(document.getElementById('rotaFixaNotaFiscal').value) || 0;
    const imposto_percentual = parseFloat(document.getElementById('rotaFixaImposto').value) || 0;
    if (!nome) { avisar('Informe o nome da rota fixa'); return; }
    const payload = { nome, local_saida, local_chegada, valor_motorista, valor_funcionarios, outros_valor, valor_rota_fixa, nota_fiscal_valor, imposto_percentual };
    const { error } = isEdit
        ? await sb.from('rotas_fixas').update(payload).eq('id', editContext.id)
        : await sb.from('rotas_fixas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData();
}

async function addProduto() {
    const isEdit = editContext && editContext.type === 'produto';
    const nome = document.getElementById('produtoNome').value;
    const categoria = document.getElementById('produtoCategoria').value;
    const unidade = document.getElementById('produtoUnidade').value || 'un';
    const quantidade = parseFloat(document.getElementById('produtoQuantidade').value) || 0;
    const quantidade_minima = parseFloat(document.getElementById('produtoQuantidadeMinima').value) || 0;
    const valor_unitario = parseFloat(document.getElementById('produtoValorUnitario').value) || 0;
    if (!nome) { avisar('Informe o nome do produto'); return; }
    const payload = { nome, categoria, unidade, quantidade, quantidade_minima, valor_unitario };
    const { error } = isEdit
        ? await sb.from('produtos').update(payload).eq('id', editContext.id)
        : await sb.from('produtos').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}

async function addMovimentacao() {
    const produto_id = document.getElementById('movProduto').value;
    const tipo = document.getElementById('movTipo').value;
    const quantidade = parseFloat(document.getElementById('movQuantidade').value);
    const data_mov = document.getElementById('movData').value;
    const motivo = document.getElementById('movMotivo').value;
    if (!produto_id || !quantidade || !data_mov) { avisar('Preencha todos os campos'); return; }
    const produto = data.produtos.find(p => p.id === produto_id);
    if (tipo === 'saida' && produto && quantidade > produto.quantidade) {
        if (!(await confirmar(`Isso vai deixar o estoque negativo (${produto.quantidade} disponível). Continuar?`, { titulo: 'Estoque negativo' }))) return;
    }
    const { error } = await sb.from('estoque_movimentacoes').insert({ empresa_id: currentEmpresa.id, produto_id, tipo, quantidade, data: data_mov, motivo });
    if (error) { alertErro(error); return; }
    if (produto) {
        const novaQtd = tipo === 'entrada' ? produto.quantidade + quantidade : produto.quantidade - quantidade;
        await sb.from('produtos').update({ quantidade: novaQtd }).eq('id', produto_id);
    }
    closeModal(); await loadData(); updateDashboard();
}

async function addAgenda() {
    const isEdit = editContext && editContext.type === 'agenda';
    const titulo = document.getElementById('agendaTitulo').value;
    const descricao = document.getElementById('agendaDescricao').value;
    const data_evento = document.getElementById('agendaData').value;
    const hora = document.getElementById('agendaHora').value || null;
    const categoria = document.getElementById('agendaCategoria').value;
    if (!titulo || !data_evento) { avisar('Preencha ao menos título e data'); return; }
    const payload = { titulo, descricao, data: data_evento, hora, categoria };
    const { error } = isEdit
        ? await sb.from('agenda').update(payload).eq('id', editContext.id)
        : await sb.from('agenda').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); loadAgenda();
}

function calcularValorCombustivel() {
    const litros = parseFloat(document.getElementById('viagemCombustivelLitros').value) || 0;
    const valorLitro = parseFloat(document.getElementById('viagemCombustivelValorLitro').value) || 0;
    const total = litros * valorLitro;
    const span = document.getElementById('viagemCombustivelValorCalculado');
    if (span) span.textContent = `R$ ${total.toFixed(2)}`;
    return total;
}

async function addViagem() {
    const isEdit = editContext && editContext.type === 'viagem';
    const local_saida = document.getElementById('viagemLocalSaida').value;
    const local_chegada = document.getElementById('viagemLocalChegada').value;
    const motorista_id = document.getElementById('viagemMotorista').value;
    const cliente_id = document.getElementById('viagemCliente').value;
    const veiculo_id = document.getElementById('viagemVeiculo').value;
    const km = parseFloat(document.getElementById('viagemKM').value) || null;
    const data_viagem = document.getElementById('viagemData').value;
    const horario = document.getElementById('viagemHorario').value || null;
    const valor_viagem = parseFloat(document.getElementById('viagemValor').value) || 0;
    const nota_fiscal_valor = parseFloat(document.getElementById('viagemNotaFiscal').value) || 0;
    const imposto_percentual = parseFloat(document.getElementById('viagemImposto').value) || 0;
    const depreciacao = parseFloat(document.getElementById('viagemDepreciacao').value) || 0;
    const valor_pedagio = parseFloat(document.getElementById('viagemPedagio').value) || 0;
    const valor_diaria = parseFloat(document.getElementById('viagemDiaria').value) || 0;
    const adiantamento = parseFloat(document.getElementById('viagemAdiantamento').value) || 0;
    const combustivel_litros = parseFloat(document.getElementById('viagemCombustivelLitros').value) || 0;
    const combustivel_valor_litro = parseFloat(document.getElementById('viagemCombustivelValorLitro').value) || 0;
    const combustivel_valor = combustivel_litros * combustivel_valor_litro;
    const outros_descricao = document.getElementById('viagemOutrosDescricao').value;
    const outros_valor = parseFloat(document.getElementById('viagemOutrosValor').value) || 0;
    const acerto_motorista_pago = document.getElementById('viagemAcerto').value === 'true';
    if (!local_saida || !local_chegada || !data_viagem) { avisar('Preencha ao menos saída, chegada e data'); return; }
    const payload = {
        local_saida, local_chegada, motorista_id, cliente_id, veiculo_id, km, data: data_viagem, horario,
        valor_viagem, nota_fiscal_valor, imposto_percentual, depreciacao,
        valor_pedagio, valor_diaria, adiantamento, combustivel_litros, combustivel_valor_litro, combustivel_valor, outros_descricao, outros_valor,
        valor_motorista: valor_diaria, acerto_motorista_pago,
        acerto_data: acerto_motorista_pago ? hojeISO() : null
    };
    const { error } = isEdit
        ? await sb.from('turismo_viagens').update(payload).eq('id', editContext.id)
        : await sb.from('turismo_viagens').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }

    // se marcou (ou já estava) como pago e sobra valor líquido (diária - adiantamento), oferece lançar no financeiro
    const jaEraPago = isEdit ? data.turismo_viagens.find(vg => vg.id === editContext.id)?.acerto_motorista_pago : false;
    const valorLiquido = valor_diaria - adiantamento;
    if (acerto_motorista_pago && !jaEraPago && valorLiquido > 0 && data.bancos.length > 0) {
        const banco = await escolherBanco('Lançar no Financeiro?', `Lançar R$ ${valorLiquido.toFixed(2)} de comissão do motorista no Financeiro\n(diária R$ ${valor_diaria.toFixed(2)} − valor já pago ao motorista R$ ${adiantamento.toFixed(2)}).\n\nEscolha o banco ou cancele para não lançar.`);
        if (banco) {
            const categoriaComissao = data.financeiro_categorias.find(c => c.nome === 'Salário')?.nome || data.financeiro_categorias[0]?.nome || 'Outro';
            const { error: errFin } = await sb.from('financeiro').insert({
                empresa_id: currentEmpresa.id, banco_id: banco.id, data: data_viagem, tipo: 'saida',
                motivo: categoriaComissao, descricao: `Comissão/diária (líquido) - ${motoristaNome(motorista_id)} - viagem ${local_saida} → ${local_chegada}`, valor: valorLiquido
            });
            if (errFin) alertErro(errFin);
            else if (!saldoAutomatico) await sb.from('bancos').update({ saldo: Number(banco.saldo) - valorLiquido }).eq('id', banco.id);
        }
    }

    closeModal(); await loadData(); filtrarTurismo();
}

// ==== RENDERIZAÇÃO ====
function filtrarPorData(lista, campoData, dataInicio, dataFim) {
    let r = lista;
    if (dataInicio) r = r.filter(x => parseDataLocal(x[campoData]) >= parseDataLocal(dataInicio));
    if (dataFim) r = r.filter(x => parseDataLocal(x[campoData]) <= parseDataLocal(dataFim));
    return r;
}

function ordenarPorData(lista, campoData) {
    return [...lista].sort((a, b) => {
        const da = a[campoData] ? parseDataLocal(a[campoData]) : null;
        const db = b[campoData] ? parseDataLocal(b[campoData]) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
    });
}

function preencherSelectVeiculo(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todos</option>' + data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
    sel.value = atual;
}

function limparFiltro(sufixo, fnFiltrar) {
    const veiculoEl = document.getElementById(`filtro${sufixo}Veiculo`);
    const inicioEl = document.getElementById(`filtro${sufixo}DataInicio`);
    const fimEl = document.getElementById(`filtro${sufixo}DataFim`);
    if (veiculoEl) veiculoEl.value = '';
    if (inicioEl) inicioEl.value = '';
    if (fimEl) fimEl.value = '';
    fnFiltrar();
}

function loadMotoristas() {
    const linhaMotorista = m => `
        <tr><td>${m.nome}</td><td>${m.cpf}</td><td>${m.telefone}</td><td>${m.endereco}</td>
        <td>${m.data_nascimento ? formatarData(m.data_nascimento) : ''}</td>
        <td>${m.cnh_validade ? formatarData(m.cnh_validade) : '-'}</td>
        <td>${m.salario ? 'R$ ' + Number(m.salario).toFixed(2) : '-'}</td>
        <td>
            ${btnAnexos('motoristas', m)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('motoristas','${m.id}','motorista')">Editar</button>
            <button class="btn-small" onclick="deleteItem('motoristas', '${m.id}')">Deletar</button>
        </td></tr>`;
    const motoristasOrdenados = [...data.motoristas].sort((a, b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' }));
    document.getElementById('funcMotoristasTable').innerHTML = motoristasOrdenados.map(linhaMotorista).join('');
}

function loadFuncionarios() {
    const linha = (f, cols) => `<tr><td>${f.nome}</td><td>${f.funcao||'-'}</td>${cols}
        <td>
            ${btnAnexos('funcionarios', f)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('funcionarios','${f.id}','funcionario')">Editar</button>
            <button class="btn-small" onclick="deleteItem('funcionarios', '${f.id}')">Deletar</button>
        </td></tr>`;
    const porNome = (a, b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' });
    document.getElementById('funcAtivosTable').innerHTML = data.funcionarios.filter(f => f.status === 'ativo').sort(porNome).map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.telefone}</td><td>${f.data_admissao ? formatarData(f.data_admissao) : '-'}</td><td>${f.salario ? 'R$ ' + Number(f.salario).toFixed(2) : '-'}</td>`)).join('');
    document.getElementById('funcDemitidosTable').innerHTML = data.funcionarios.filter(f => f.status === 'demitido').sort(porNome).map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.data_admissao ? formatarData(f.data_admissao) : '-'}</td><td>${f.data_demissao ? formatarData(f.data_demissao) : '-'}</td>`)).join('');
    document.getElementById('funcExperienciaTable').innerHTML = data.funcionarios.filter(f => f.status === 'experiencia').sort(porNome).map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.experiencia_inicio ? formatarData(f.experiencia_inicio) : '-'}</td><td>${f.experiencia_fim ? formatarData(f.experiencia_fim) : '-'}</td>`)).join('');
}

function loadVeiculos() {
    document.getElementById('veiculosTable').innerHTML = data.veiculos.map(vv => {
        const combustivel = combustivelEstimadoTanque(vv.id);
        let celulaCombustivel = '-';
        if (combustivel) {
            const cor = combustivel.percentual <= 20 ? '#e53935' : (combustivel.percentual <= 50 ? '#f9a825' : '#4caf50');
            celulaCombustivel = `<strong style="color:${cor};">${combustivel.litros.toFixed(0)} L (${combustivel.percentual.toFixed(0)}%)</strong>${combustivel.semMediaConfiavel ? ' <span style="font-size:11px; color:#666;" title="Ainda não há km/l suficiente calculado pra esse veículo">⚠️</span>' : ''}`;
        } else if (vv.tanque_litros) {
            celulaCombustivel = '<span style="font-size:12px; color:#666;">Aguardando 1º abastecimento</span>';
        }
        return `
        <tr><td>${vv.placa}</td><td>${vv.marca}</td><td>${vv.modelo}</td><td>${vv.ano}</td><td>${vv.chassi||'-'}</td><td>${vv.renavam||'-'}</td>
        <td>${vv.numero_bancos || '-'}</td>
        <td>${Number(vv.km_atual||0).toLocaleString('pt-BR')} km</td>
        <td>${vv.valor ? 'R$ ' + Number(vv.valor).toFixed(2) : '-'}</td>
        <td>${vv.tanque_litros ? Number(vv.tanque_litros).toFixed(0) + ' L' : '-'}</td>
        <td>${celulaCombustivel}</td>
        <td>${vv.csv_validade ? formatarData(vv.csv_validade) : '-'}</td>
        <td>${vv.tacografo_validade ? formatarData(vv.tacografo_validade) : '-'}</td>
        <td>${vv.apolice_validade ? formatarData(vv.apolice_validade) : '-'}</td>
        <td>${vv.crlv_ano || '-'}</td>
        <td>
            <button class="btn-small" style="background:#764ba2;" onclick="verHistoricoVeiculo('${vv.id}')">Histórico</button>
            ${btnAnexos('veiculos', vv)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('veiculos','${vv.id}','veiculo')">Editar</button>
            <button class="btn-small" onclick="deleteItem('veiculos', '${vv.id}')">Deletar</button>
        </td></tr>`;
    }).join('');
}

function loadClientes() {
    filtrarClientes();
}

function filtrarClientes() {
    const busca = (document.getElementById('filtroClienteNome')?.value || '').toLowerCase().trim();
    let filtrado = [...data.clientes].sort((a, b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' }));
    if (busca) filtrado = filtrado.filter(c => (c.nome||'').toLowerCase().includes(busca));

    document.getElementById('clientesTable').innerHTML = filtrado.map(c => `
        <tr><td>${c.nome}</td><td>${c.cpf_cnpj}</td><td>${c.telefone}</td>
        <td>${c.rua||''}${c.numero ? ', '+c.numero : ''}${c.bairro ? ' - '+c.bairro : ''}</td>
        <td>${c.cidade||''}${c.uf ? '/'+c.uf : ''}</td><td>${c.cep||'-'}</td>
        <td>${c.data_nascimento ? formatarData(c.data_nascimento) : ''}</td>
        <td>
            ${btnAnexos('clientes', c)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('clientes','${c.id}','cliente')">Editar</button>
            <button class="btn-small" onclick="deleteItem('clientes', '${c.id}')">Deletar</button>
        </td></tr>`).join('') || '<tr><td colspan="8" style="color:#666; text-align:center; padding:20px;">Nenhum cliente encontrado com esse nome.</td></tr>';
}

function limparFiltroClientes() {
    document.getElementById('filtroClienteNome').value = '';
    filtrarClientes();
}

function loadAbastecimentos() {
    preencherSelectVeiculo('filtroAbastecimentoVeiculo');
    filtrarAbastecimentos();
}
function filtrarAbastecimentos() {
    const veiculoId = document.getElementById('filtroAbastecimentoVeiculo')?.value || '';
    const dataInicio = document.getElementById('filtroAbastecimentoDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroAbastecimentoDataFim')?.value || '';
    let lista = data.abastecimentos;
    if (veiculoId) lista = lista.filter(a => a.veiculo_id === veiculoId);
    lista = ordenarPorData(filtrarPorData(lista, 'data', dataInicio, dataFim), 'data');
    document.getElementById('abastecimentosTable').innerHTML = lista.map(a => `
        <tr><td>${veiculoPlaca(a.veiculo_id)}</td><td>${a.fonte === 'bomba' ? '🛢️ Bomba' : '⛽ Posto'}</td><td>${formatarData(a.data)}</td>
        <td>${a.km}</td><td>${Number(a.litros).toFixed(2)}</td><td>R$ ${Number(a.valor_litro).toFixed(2)}</td>
        <td>R$ ${Number(a.valor_total).toFixed(2)}</td><td>${Number(a.kml).toFixed(2)} km/l</td>
        <td>
            ${btnAnexos('abastecimentos', a)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('abastecimentos','${a.id}','abastecimento')">Editar</button>
            <button class="btn-small" onclick="deleteItem('abastecimentos', '${a.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadPneus() {
    preencherSelectVeiculo('filtroPneuVeiculo');
    filtrarPneus();
}
function filtrarPneus() {
    const veiculoId = document.getElementById('filtroPneuVeiculo')?.value || '';
    const dataInicio = document.getElementById('filtroPneuDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroPneuDataFim')?.value || '';
    let lista = data.pneus;
    if (veiculoId) lista = lista.filter(p => p.veiculo_id === veiculoId);
    lista = ordenarPorData(filtrarPorData(lista, 'data', dataInicio, dataFim), 'data');
    document.getElementById('neusTable').innerHTML = lista.map(p => `
        <tr><td>${veiculoPlaca(p.veiculo_id)}</td><td>${formatarData(p.data)}</td>
        <td>${p.tipo||'-'}</td><td>${p.oficina||'-'}</td><td>${p.quantidade||1}</td>
        <td>R$ ${Number(p.valor_unitario||0).toFixed(2)}</td><td>R$ ${Number(p.valor||0).toFixed(2)}</td>
        <td>${p.km_atual} km</td><td>${veiculoKmAtual(p.veiculo_id).toLocaleString('pt-BR')} km</td><td>${p.km_proxima||'-'} km</td>
        <td>
            ${btnAnexos('pneus', p)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('pneus','${p.id}','pneu')">Editar</button>
            <button class="btn-small" onclick="deleteItem('pneus', '${p.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadOleos() {
    preencherSelectVeiculo('filtroOleoVeiculo');
    filtrarOleos();
}
function filtrarOleos() {
    const veiculoId = document.getElementById('filtroOleoVeiculo')?.value || '';
    const dataInicio = document.getElementById('filtroOleoDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroOleoDataFim')?.value || '';
    let lista = data.oleos;
    if (veiculoId) lista = lista.filter(o => o.veiculo_id === veiculoId);
    lista = ordenarPorData(filtrarPorData(lista, 'data', dataInicio, dataFim), 'data');
    document.getElementById('oleosTable').innerHTML = lista.map(o => {
        const kmFaltando = o.km_proxima - veiculoKmAtual(o.veiculo_id);
        const cls = kmFaltando <= 5000 ? 'style="background:#fff3cd;"' : '';
        return `<tr ${cls}><td>${veiculoPlaca(o.veiculo_id)}</td><td>${formatarData(o.data)}</td>
        <td>${o.tipo}</td><td>${o.lugar||'-'}</td><td>${o.litragem||'-'}</td>
        <td>${o.km_atual} km</td><td>${veiculoKmAtual(o.veiculo_id).toLocaleString('pt-BR')} km</td><td>${o.km_proxima} km</td>
        <td>R$ ${Number(o.valor).toFixed(2)}</td>
        <td>
            ${btnAnexos('oleos', o)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('oleos','${o.id}','oleo')">Editar</button>
            <button class="btn-small" onclick="deleteItem('oleos', '${o.id}')">Deletar</button>
        </td></tr>`;
    }).join('');
}

function loadPreventivas() {
    preencherSelectVeiculo('filtroPreventivaVeiculo');
    filtrarPreventivas();
}
function filtrarPreventivas() {
    const veiculoId = document.getElementById('filtroPreventivaVeiculo')?.value || '';
    const dataInicio = document.getElementById('filtroPreventivaDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroPreventivaDataFim')?.value || '';
    let lista = data.preventivas;
    if (veiculoId) lista = lista.filter(p => p.veiculo_id === veiculoId);
    lista = ordenarPorData(filtrarPorData(lista, 'data', dataInicio, dataFim), 'data');
    document.getElementById('preventivaTable').innerHTML = lista.map(p => {
        const kmFaltando = p.km_proxima - (p.km_atual || 0);
        const cls = kmFaltando <= 5000 ? 'style="background:#fff3cd;"' : '';
        return `<tr ${cls}><td>${veiculoPlaca(p.veiculo_id)}</td><td>${formatarData(p.data)}</td>
        <td>${p.descricao}</td><td>${p.km_atual} km</td><td>${p.km_proxima} km</td><td>${kmFaltando} km</td>
        <td>R$ ${Number(p.valor).toFixed(2)}</td>
        <td>
            ${btnAnexos('preventivas', p)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('preventivas','${p.id}','preventiva')">Editar</button>
            <button class="btn-small" onclick="deleteItem('preventivas', '${p.id}')">Deletar</button>
        </td></tr>`;
    }).join('');
}

function loadCorretivas() {
    preencherSelectVeiculo('filtroCorretivaVeiculo');
    filtrarCorretivas();
}
function filtrarCorretivas() {
    const veiculoId = document.getElementById('filtroCorretivaVeiculo')?.value || '';
    const dataInicio = document.getElementById('filtroCorretivaDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroCorretivaDataFim')?.value || '';
    let lista = data.corretivas;
    if (veiculoId) lista = lista.filter(c => c.veiculo_id === veiculoId);
    lista = ordenarPorData(filtrarPorData(lista, 'data', dataInicio, dataFim), 'data');
    document.getElementById('corretivaTable').innerHTML = lista.map(c => `
        <tr><td>${veiculoPlaca(c.veiculo_id)}</td><td>${formatarData(c.data)}</td>
        <td>${c.descricao}</td><td>${c.oficina||'-'}</td><td>${c.km_atual||'-'}</td>
        <td>${veiculoKmAtual(c.veiculo_id).toLocaleString('pt-BR')} km</td><td>${c.km_proxima||'-'}</td>
        <td>R$ ${Number(c.valor).toFixed(2)}</td>
        <td>
            ${btnAnexos('corretivas', c)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('corretivas','${c.id}','corretiva')">Editar</button>
            <button class="btn-small" onclick="deleteItem('corretivas', '${c.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadContasPagar() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    document.getElementById('contasPagarTable').innerHTML = ordenarPorData(data.contas_pagar, 'data_vencimento').map(c => {
        const vencimento = parseDataLocal(c.data_vencimento);
        const atrasada = c.status === 'pendente' && vencimento < hoje;
        const badge = c.status === 'pago' ? '<span class="badge badge-pago">Pago</span>'
            : atrasada ? '<span class="badge badge-pendente">Atrasado</span>'
            : '<span class="badge" style="background:#fff3cd; color:#856404;">Pendente</span>';
        return `<tr ${atrasada ? 'class="estoque-baixo"' : ''}>
            <td>${c.fornecedor}</td><td>${c.descricao||'-'}</td><td>${vencimento.toLocaleDateString('pt-BR')}</td>
            <td>R$ ${Number(c.valor).toFixed(2)}</td><td>${badge}</td>
            <td>${c.data_pagamento ? formatarData(c.data_pagamento) : '-'}</td>
            <td>
                ${c.status === 'pendente' ? `<button class="btn-small" style="background:#4caf50;" onclick="marcarContaPaga('${c.id}')">Marcar Pago</button>` : ''}
                ${btnAnexos('contas_pagar', c)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('contas_pagar','${c.id}','contaPagar')">Editar</button>
                <button class="btn-small" onclick="deleteItem('contas_pagar', '${c.id}')">Deletar</button>
            </td></tr>`;
    }).join('');
}

function loadContasReceber() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    document.getElementById('contasReceberTable').innerHTML = ordenarPorData(data.contas_receber, 'data_vencimento').map(c => {
        const vencimento = parseDataLocal(c.data_vencimento);
        const atrasada = c.status === 'pendente' && vencimento < hoje;
        const badge = c.status === 'recebido' ? '<span class="badge badge-pago">Recebido</span>'
            : atrasada ? '<span class="badge badge-pendente">Atrasado</span>'
            : '<span class="badge" style="background:#fff3cd; color:#856404;">Pendente</span>';
        const nomeCliente = data.clientes.find(cl => cl.id === c.cliente_id)?.nome || '-';
        return `<tr ${atrasada ? 'class="estoque-baixo"' : ''}>
            <td>${nomeCliente}</td><td>${c.descricao||'-'}</td><td>${formatarData(c.data_vencimento)}</td>
            <td>R$ ${Number(c.valor).toFixed(2)}</td><td>${badge}</td>
            <td>${c.data_recebimento ? formatarData(c.data_recebimento) : '-'}</td>
            <td>
                ${c.status === 'pendente' ? `<button class="btn-small" style="background:#4caf50;" onclick="marcarContaRecebida('${c.id}')">Marcar Recebido</button>` : ''}
                ${btnAnexos('contas_receber', c)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('contas_receber','${c.id}','contaReceber')">Editar</button>
                <button class="btn-small" onclick="deleteItem('contas_receber', '${c.id}')">Deletar</button>
            </td></tr>`;
    }).join('');
}

function loadBomba() {
    const nivel = nivelBomba();
    const alerta = nivel.atual <= currentEmpresa.bomba_alerta_minimo;
    document.getElementById('bombaNivelValor').textContent = `${nivel.atual.toFixed(0)} L`;
    document.getElementById('bombaNivelValor').className = 'bomba-nivel' + (alerta ? ' alerta' : '');
    document.getElementById('bombaAlertaTexto').style.display = alerta ? 'block' : 'none';
    const pct = nivel.totalCarregado > 0 ? Math.max(0, Math.min(100, (nivel.atual / nivel.totalCarregado) * 100)) : 0;
    const fill = document.getElementById('bombaBarraFill');
    fill.style.width = pct + '%';
    fill.className = 'bomba-barra-fill' + (alerta ? ' alerta' : '');
    document.getElementById('bombaTotalCarregado').textContent = `${nivel.totalCarregado.toFixed(0)} L`;
    document.getElementById('bombaTotalDispensado').textContent = `${nivel.totalDispensado.toFixed(0)} L`;
    document.getElementById('bombaGastoTotal').textContent = `R$ ${nivel.gastoTotal.toFixed(2)}`;
    document.getElementById('nivelBombaDash').textContent = nivel.atual.toFixed(0);

    document.getElementById('bombaCargasTable').innerHTML = data.bomba_cargas.map(c => `
        <tr><td>${formatarData(c.data)}</td><td>${Number(c.litros).toFixed(0)} L</td>
        <td>R$ ${Number(c.valor_total).toFixed(2)}</td><td>${c.fornecedor||'-'}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('bomba_cargas','${c.id}','cargaBomba')">Editar</button>
            <button class="btn-small" onclick="deleteItem('bomba_cargas', '${c.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadGalaoOleo() {
    const nivel = nivelGalaoOleo();
    const alerta = nivel.atual <= currentEmpresa.galao_oleo_alerta_minimo;
    document.getElementById('galaoNivelValor').textContent = `${nivel.atual.toFixed(1)} L`;
    document.getElementById('galaoNivelValor').className = 'bomba-nivel' + (alerta ? ' alerta' : '');
    document.getElementById('galaoAlertaTexto').style.display = alerta ? 'block' : 'none';
    const pct = nivel.totalCarregado > 0 ? Math.max(0, Math.min(100, (nivel.atual / nivel.totalCarregado) * 100)) : 0;
    const fill = document.getElementById('galaoBarraFill');
    fill.style.width = pct + '%';
    fill.className = 'bomba-barra-fill' + (alerta ? ' alerta' : '');
    document.getElementById('galaoTotalCarregado').textContent = `${nivel.totalCarregado.toFixed(1)} L`;
    document.getElementById('galaoTotalDispensado').textContent = `${nivel.totalDispensado.toFixed(1)} L`;
    document.getElementById('galaoGastoTotal').textContent = `R$ ${nivel.gastoTotal.toFixed(2)}`;

    document.getElementById('galaoCargasTable').innerHTML = data.galao_oleo_cargas.map(c => `
        <tr><td>${formatarData(c.data)}</td><td>${c.tipo_oleo||'-'}</td><td>${Number(c.litros).toFixed(1)} L</td>
        <td>R$ ${Number(c.valor_total).toFixed(2)}</td><td>${c.fornecedor||'-'}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('galao_oleo_cargas','${c.id}','cargaGalaoOleo')">Editar</button>
            <button class="btn-small" onclick="deleteItem('galao_oleo_cargas', '${c.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadMultas() {
    document.getElementById('multasTable').innerHTML = ordenarPorData(data.multas, 'data').map(m => `
        <tr><td>${veiculoPlaca(m.veiculo_id)}</td><td>${formatarData(m.data)}</td>
        <td>${m.descricao}</td><td>R$ ${Number(m.valor).toFixed(2)}</td>
        <td>
            ${btnAnexos('multas', m)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('multas','${m.id}','multa')">Editar</button>
            <button class="btn-small" onclick="deleteItem('multas', '${m.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadBancos() {
    document.getElementById('bancosTable').innerHTML = data.bancos.map(b => `
        <tr><td>${b.nome}</td><td>${b.agencia}</td><td>${b.conta}</td><td>R$ ${Number(b.saldo).toFixed(2)}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('bancos','${b.id}','banco')">Editar</button>
            <button class="btn-small" onclick="deleteItem('bancos', '${b.id}')">Deletar</button>
        </td></tr>`).join('');
    calcularSaldoBancosNaData();
}

function calcularSaldoBancosNaData() {
    const tbody = document.getElementById('saldoBancosDataTable');
    if (!tbody) return;
    const dataEscolhida = document.getElementById('filtroSaldoBancoData')?.value || '';
    if (!dataEscolhida) {
        tbody.innerHTML = '<tr><td colspan="3" style="color:#666; text-align:center; padding:20px;">Escolha uma data acima pra ver o saldo que cada banco tinha nela.</td></tr>';
        return;
    }
    const dataRef = parseDataLocal(dataEscolhida);
    tbody.innerHTML = data.bancos.map(b => {
        // desfaz (reverte) os lançamentos posteriores à data escolhida pra "voltar no tempo" a partir do saldo atual
        const lancamentosDepois = data.financeiro.filter(f => f.banco_id === b.id && parseDataLocal(f.data) > dataRef);
        const ajuste = lancamentosDepois.reduce((s, f) => s + (f.tipo === 'entrada' ? -Number(f.valor) : Number(f.valor)), 0);
        const saldoNaData = Number(b.saldo) + ajuste;
        return `<tr><td>${b.nome}</td><td><strong>R$ ${saldoNaData.toFixed(2)}</strong></td><td>R$ ${Number(b.saldo).toFixed(2)}</td></tr>`;
    }).join('') || '<tr><td colspan="3" style="color:#666; text-align:center; padding:20px;">Nenhum banco cadastrado ainda.</td></tr>';
}

function limparFiltroSaldoBancos() {
    document.getElementById('filtroSaldoBancoData').value = '';
    calcularSaldoBancosNaData();
}

function loadFinanceiro() {
    document.getElementById('financeiroTable').innerHTML = ordenarPorData(data.financeiro, 'data').map(f => `
        <tr><td>${formatarData(f.data)}</td><td>${data.bancos.find(b=>b.id===f.banco_id)?.nome || 'N/A'}</td>
        <td>${f.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td><td>${f.motivo}</td><td>${f.descricao||''}</td>
        <td>R$ ${Number(f.valor).toFixed(2)}</td>
        <td>
            ${btnAnexos('financeiro', f)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('financeiro','${f.id}','financeiro')">Editar</button>
            <button class="btn-small" onclick="deleteItem('financeiro', '${f.id}')">Deletar</button>
        </td></tr>`).join('');
    gerarGastosPorResponsavelEMotivo(data.financeiro);
}

function loadRotas() {
    preencherFiltrosRotas();
    filtrarRotas();
    loadRotasFixasLista();
}

function preencherFiltrosRotas() {
    const selVeiculo = document.getElementById('filtroRotasVeiculo');
    const selFixa = document.getElementById('filtroRotasFixa');
    const selMotorista = document.getElementById('filtroRotasMotorista');
    if (!selFixa || !selMotorista || !selVeiculo) return;
    const atualVeiculo = selVeiculo.value, atualFixa = selFixa.value, atualMotorista = selMotorista.value;
    selVeiculo.innerHTML = '<option value="">Todos</option>' + data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
    selFixa.innerHTML = '<option value="">Todas</option>' + data.rotas_fixas.map(rf => `<option value="${rf.id}">${rf.nome}</option>`).join('');
    selMotorista.innerHTML = '<option value="">Todos</option>' + data.motoristas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
    selVeiculo.value = atualVeiculo;
    selFixa.value = atualFixa;
    selMotorista.value = atualMotorista;
}

function filtrarRotas() {
    const veiculoId = document.getElementById('filtroRotasVeiculo')?.value || '';
    const rotaFixaId = document.getElementById('filtroRotasFixa')?.value || '';
    const motoristaId = document.getElementById('filtroRotasMotorista')?.value || '';
    const dataInicio = document.getElementById('filtroRotasDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroRotasDataFim')?.value || '';

    if (!veiculoId && !rotaFixaId && !motoristaId && !dataInicio && !dataFim) {
        document.getElementById('rotasTable').innerHTML = '<tr><td colspan="10" style="color:#666; text-align:center; padding:20px;">Use os filtros acima (veículo, rota fixa, motorista ou data) pra ver as rotas. Isso evita carregar tudo de uma vez.</td></tr>';
        return;
    }

    let filtrado = data.rotas;
    if (veiculoId) filtrado = filtrado.filter(r => r.veiculo_id === veiculoId);
    if (rotaFixaId) filtrado = filtrado.filter(r => r.rota_fixa_id === rotaFixaId);
    if (motoristaId) filtrado = filtrado.filter(r => r.motorista_id === motoristaId);
    filtrado = ordenarPorData(filtrarPorData(filtrado, 'data_inicio', dataInicio, dataFim), 'data_inicio');

    document.getElementById('rotasTable').innerHTML = filtrado.map(r => `
        <tr><td>${veiculoPlaca(r.veiculo_id)}</td><td>${motoristaNome(r.motorista_id)}</td>
        <td>${r.local_saida}</td><td>${r.destino}</td>
        <td>${data.rotas_fixas.find(rf=>rf.id===r.rota_fixa_id)?.nome || '-'}</td>
        <td>${r.data_inicio ? formatarData(r.data_inicio) : ''}</td>
        <td>${r.data_fim ? formatarData(r.data_fim) : ''}</td>
        <td>${kmPercorrido(r)} km</td><td>${tempoTotal(r)}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('rotas','${r.id}','rota')">Editar</button>
            <button class="btn-small" onclick="deleteItem('rotas', '${r.id}')">Deletar</button>
        </td></tr>`).join('') || '<tr><td colspan="10" style="color:#666; text-align:center; padding:20px;">Nenhuma rota encontrada com esses filtros.</td></tr>';
}

function limparFiltrosRotas() {
    document.getElementById('filtroRotasVeiculo').value = '';
    document.getElementById('filtroRotasFixa').value = '';
    document.getElementById('filtroRotasMotorista').value = '';
    document.getElementById('filtroRotasDataInicio').value = '';
    document.getElementById('filtroRotasDataFim').value = '';
    filtrarRotas();
}

function loadRotasFixasLista() {
    const tbody = document.getElementById('rotasFixasListaTable');
    if (!tbody) return;
    const rotasFixasOrdenadas = [...data.rotas_fixas].sort((a,b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' }));
    tbody.innerHTML = rotasFixasOrdenadas.map(rf => `
        <tr><td>${rf.nome}</td><td>${rf.local_saida||'-'}</td><td>${rf.local_chegada||'-'}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('rotas_fixas','${rf.id}','rotaFixa')">Editar</button>
            <button class="btn-small" onclick="deleteItem('rotas_fixas', '${rf.id}')">Deletar</button>
        </td></tr>`).join('') || '<tr><td colspan="4" style="color:#666;">Nenhuma rota fixa cadastrada ainda.</td></tr>';
}

function loadProdutos() {
    const produtosOrdenados = [...data.produtos].sort((a,b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity: 'base' }));
    document.getElementById('produtosTable').innerHTML = produtosOrdenados.map(p => {
        const baixo = Number(p.quantidade) <= Number(p.quantidade_minima);
        return `<tr class="${baixo ? 'estoque-baixo' : ''}">
            <td>${p.nome}</td><td>${p.categoria || '-'}</td><td>${p.quantidade}${baixo ? ' ⚠️' : ''}</td>
            <td>${p.quantidade_minima}</td><td>${p.unidade}</td><td>R$ ${Number(p.valor_unitario).toFixed(2)}</td>
            <td>
                <button class="btn-small" style="background:#0066cc;" onclick="editarItem('produtos','${p.id}','produto')">Editar</button>
                <button class="btn-small" onclick="deleteItem('produtos', '${p.id}')">Deletar</button>
            </td></tr>`;
    }).join('');
}

function loadMovimentacoes() {
    document.getElementById('movimentacoesTable').innerHTML = data.estoque_movimentacoes.map(m => {
        const produto = data.produtos.find(p => p.id === m.produto_id);
        return `<tr><td>${produto ? produto.nome : 'N/A'}</td><td>${m.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td>
        <td>${m.quantidade}</td><td>${m.motivo || ''}</td><td>${formatarData(m.data)}</td>
        <td><button class="btn-small" onclick="deleteItem('estoque_movimentacoes', '${m.id}')">Deletar</button></td></tr>`;
    }).join('');
}

function loadAgenda() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const ordenados = [...data.agenda].sort((a,b) => new Date(a.data + 'T' + (a.hora||'00:00')) - new Date(b.data + 'T' + (b.hora||'00:00')));
    document.getElementById('agendaContent').innerHTML = ordenados.map(a => {
        const dataEvento = parseDataLocal(a.data);
        const isPast = dataEvento < hoje;
        return `<div class="birthday-item ${!isPast && dataEvento.toDateString() === hoje.toDateString() ? 'today' : ''}" style="${isPast ? 'opacity:0.5;' : ''}">
            <div class="birthday-info"><h4>${a.titulo} ${a.categoria ? `<span style="font-size:11px; color:#666;">(${a.categoria})</span>` : ''}</h4>
            <p>${dataEvento.toLocaleDateString('pt-BR')} ${a.hora ? 'às ' + a.hora.slice(0,5) : ''} ${a.descricao ? '• ' + a.descricao : ''}</p></div>
            <div>
                <button class="btn-small" style="background:#0066cc;" onclick="editarItem('agenda','${a.id}','agenda')">Editar</button>
                <button class="btn-small" onclick="deleteItem('agenda', '${a.id}')">Deletar</button>
            </div></div>`;
    }).join('') || '<p style="color:#666;">Nenhum compromisso cadastrado ainda.</p>';
}

// ==== CONTROLE DE ROTAS (escala de veículos por data e horário, com bloqueio de conflitos) ====
let escalaIndisponivel = false; // true quando a tabela escala_rotas ainda não existe no banco (controle_rotas.sql)
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function escHtml(t) { return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function isoLocal(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function hhmm(t) { return String(t || '').slice(0, 5); }

// início e fim reais da programação (se a hora final for menor/igual à inicial, termina no dia seguinte)
function intervaloEscala(dataISO, horaIni, horaFim) {
    const ini = new Date(`${dataISO}T${hhmm(horaIni)}:00`);
    const fim = new Date(`${dataISO}T${hhmm(horaFim)}:00`);
    if (fim <= ini) fim.setDate(fim.getDate() + 1);
    return { ini, fim };
}
function sobrepoe(a, b) { return a.ini < b.fim && b.ini < a.fim; } // encostar (fim = início) NÃO é conflito

function descricaoEscala(e) {
    const { ini, fim } = intervaloEscala(e.data, e.hora_inicio, e.hora_fim);
    const dia = parseDataLocal(e.data).toLocaleDateString('pt-BR');
    return `"${e.nome}" em ${dia} das ${hhmm(e.hora_inicio)} às ${hhmm(e.hora_fim)}${fim.getDate() !== ini.getDate() ? ' (termina no dia seguinte)' : ''}`;
}

// devolve a lista de conflitos de uma programação nova com o que já está cadastrado
function conflitosEscala(nova, ignorarId = null) {
    const alvo = intervaloEscala(nova.data, nova.hora_inicio, nova.hora_fim);
    const achados = [];
    data.escala_rotas.forEach(e => {
        if (e.id === ignorarId) return;
        if (!sobrepoe(alvo, intervaloEscala(e.data, e.hora_inicio, e.hora_fim))) return;
        if (e.veiculo_id === nova.veiculo_id) achados.push(`🚐 O veículo ${veiculoPlaca(e.veiculo_id)} já está em ${descricaoEscala(e)}.`);
        else if (nova.motorista_id && e.motorista_id === nova.motorista_id) achados.push(`👤 O motorista ${motoristaNome(e.motorista_id)} já está em ${descricaoEscala(e)} (veículo ${veiculoPlaca(e.veiculo_id)}).`);
    });
    return achados;
}

function loadControleRotas() {
    const box = document.getElementById('controleContent');
    if (!box) return;
    if (escalaIndisponivel) {
        box.innerHTML = '<p style="color:#c62828;">O Controle de Rotas ainda não foi ativado no banco de dados. Rode o arquivo <b>controle_rotas.sql</b> no SQL Editor do Supabase e recarregue a página.</p>';
        return;
    }
    const deEl = document.getElementById('controleDe'), ateEl = document.getElementById('controleAte'), veicEl = document.getElementById('controleVeiculo');
    if (!deEl.value) deEl.value = hojeISO();
    if (!ateEl.value) { const d = new Date(); d.setDate(d.getDate() + 6); ateEl.value = isoLocal(d); }
    const atualVeic = veicEl.value;
    veicEl.innerHTML = '<option value="">Todos os veículos</option>' + [...data.veiculos].sort((a, b) => (a.placa || '').localeCompare(b.placa || '', 'pt-BR')).map(x => `<option value="${x.id}">${escHtml(x.placa)}</option>`).join('');
    veicEl.value = atualVeic;

    const lista = data.escala_rotas
        .filter(e => e.data >= deEl.value && e.data <= ateEl.value && (!veicEl.value || e.veiculo_id === veicEl.value))
        .sort((a, b) => (a.data + hhmm(a.hora_inicio)).localeCompare(b.data + hhmm(b.hora_inicio)));
    if (!lista.length) { box.innerHTML = '<p style="color:#666;">Nenhuma rota programada nesse período.</p>'; return; }

    const dias = {};
    lista.forEach(e => (dias[e.data] = dias[e.data] || []).push(e));
    box.innerHTML = Object.keys(dias).sort().map(dia => {
        const d = parseDataLocal(dia);
        const itens = dias[dia].map(e => {
            const rf = data.rotas_fixas.find(r => r.id === e.rota_fixa_id);
            return `<div class="birthday-item">
                <div class="birthday-info"><h4>${hhmm(e.hora_inicio)} → ${hhmm(e.hora_fim)} &nbsp;•&nbsp; ${escHtml(e.nome)} ${rf ? '<span style="font-size:11px;color:#666;">(rota fixa)</span>' : ''}</h4>
                <p>🚐 ${escHtml(veiculoPlaca(e.veiculo_id))} ${e.motorista_id ? '• 👤 ' + escHtml(motoristaNome(e.motorista_id)) : ''} ${e.observacao ? '• ' + escHtml(e.observacao) : ''}</p></div>
                <div>
                    <button class="btn-small" style="background:#0066cc;" onclick="editarItem('escala_rotas','${e.id}','escala')">Editar</button>
                    <button class="btn-small" onclick="deleteItem('escala_rotas','${e.id}')">Deletar</button>
                </div></div>`;
        }).join('');
        return `<h3 style="margin:18px 0 8px;">${DIAS_SEMANA[d.getDay()]}, ${d.toLocaleDateString('pt-BR')}</h3>${itens}`;
    }).join('');
}

function escalaPreencherNome() {
    const rf = data.rotas_fixas.find(r => r.id === document.getElementById('escalaRotaFixa').value);
    if (rf) document.getElementById('escalaNome').value = rf.nome;
}

function htmlModalEscala(item) {
    const veic = [...data.veiculos].sort((a, b) => (a.placa || '').localeCompare(b.placa || '', 'pt-BR')).map(x => `<option value="${x.id}">${escHtml(x.placa)} - ${escHtml(x.modelo || '')}</option>`).join('');
    const mot = '<option value="">(sem motorista definido)</option>' + [...data.motoristas].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })).map(m => `<option value="${m.id}">${escHtml(m.nome)}</option>`).join('');
    const fixas = '<option value="">(rota avulsa)</option>' + [...data.rotas_fixas].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })).map(r => `<option value="${r.id}">${escHtml(r.nome)}</option>`).join('');
    const repetir = item ? '' : `
        <div class="form-group"><label>Repetir toda semana nos dias (opcional)</label>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">${DIAS_SEMANA.map((n, i) => `<label style="font-weight:normal;"><input type="checkbox" class="escalaDia" value="${i}"> ${n}</label>`).join('')}</div></div>
        <div class="form-group"><label>Repetir até (se marcou dias)</label><input type="date" id="escalaAte"></div>`;
    return `
        <div class="form-group"><label>Rota fixa (opcional)</label><select id="escalaRotaFixa" onchange="escalaPreencherNome()">${fixas}</select></div>
        <div class="form-group"><label>Nome da rota</label><input type="text" id="escalaNome" value="${escHtml(v(item, 'nome'))}"></div>
        <div class="form-row">
            <div class="form-group"><label>Veículo</label><select id="escalaVeiculo">${veic}</select></div>
            <div class="form-group"><label>Motorista</label><select id="escalaMotorista">${mot}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Data${item ? '' : ' (primeiro dia)'}</label><input type="date" id="escalaData" value="${v(item, 'data', hojeISO())}"></div>
            <div class="form-group"><label>Saída</label><input type="time" id="escalaHoraIni" value="${hhmm(v(item, 'hora_inicio'))}"></div>
            <div class="form-group"><label>Chegada prevista</label><input type="time" id="escalaHoraFim" value="${hhmm(v(item, 'hora_fim'))}"></div>
        </div>
        ${repetir}
        <div class="form-group"><label>Observação</label><input type="text" id="escalaObs" value="${escHtml(v(item, 'observacao'))}"></div>
        <button onclick="addEscala()">${item ? 'Salvar Alterações' : 'Programar'}</button>`;
}

async function addEscala() {
    if (escalaIndisponivel) { avisar('Rode o controle_rotas.sql no Supabase antes de usar o Controle de Rotas.'); return; }
    const isEdit = editContext && editContext.type === 'escala';
    const rota_fixa_id = document.getElementById('escalaRotaFixa').value || null;
    const nome = document.getElementById('escalaNome').value.trim();
    const veiculo_id = document.getElementById('escalaVeiculo').value;
    const motorista_id = document.getElementById('escalaMotorista').value || null;
    const data_ini = document.getElementById('escalaData').value;
    const hora_inicio = document.getElementById('escalaHoraIni').value;
    const hora_fim = document.getElementById('escalaHoraFim').value;
    const observacao = document.getElementById('escalaObs').value.trim() || null;
    if (!nome) return marcarCampoInvalido('escalaNome', 'Informe o nome da rota.');
    if (!veiculo_id) { avisar('Escolha o veículo.'); return; }
    if (!data_ini || !hora_inicio || !hora_fim) { avisar('Preencha data, saída e chegada prevista.'); return; }
    if (hora_inicio === hora_fim) return marcarCampoInvalido('escalaHoraFim', 'A chegada não pode ser igual à saída.');

    // datas: uma só, ou várias se escolheu repetir por dia da semana
    let datas = [data_ini];
    const diasSel = [...document.querySelectorAll('.escalaDia:checked')].map(c => parseInt(c.value));
    if (!isEdit && diasSel.length) {
        const ate = document.getElementById('escalaAte').value;
        if (!ate || ate < data_ini) return marcarCampoInvalido('escalaAte', 'Informe a data final da repetição (depois da data inicial).');
        datas = [];
        for (let d = parseDataLocal(data_ini), limite = parseDataLocal(ate); d <= limite; d.setDate(d.getDate() + 1)) {
            if (diasSel.includes(d.getDay())) datas.push(isoLocal(d));
        }
        if (!datas.length) { avisar('Nenhuma data cai nos dias da semana marcados nesse período.'); return; }
        if (datas.length > 200) { avisar('Muitas datas de uma vez (máx. 200). Reduza o período.'); return; }
    }

    const novas = datas.map(d => ({ nome, rota_fixa_id, veiculo_id, motorista_id, data: d, hora_inicio, hora_fim, observacao }));

    // 1) conflitos com o que já existe: BLOQUEIA tudo
    const bloqueios = [];
    novas.forEach(n => conflitosEscala(n, isEdit ? editContext.id : null).forEach(msg => bloqueios.push(`${parseDataLocal(n.data).toLocaleDateString('pt-BR')}: ${msg}`)));
    if (bloqueios.length) {
        const mostrar = bloqueios.slice(0, 8).join('\n') + (bloqueios.length > 8 ? `\n... e mais ${bloqueios.length - 8} conflito(s).` : '');
        await _dialogo({ titulo: '⛔ Conflito de escala — não foi salvo', texto: mostrar + '\n\nAjuste o horário, o veículo ou o motorista e tente de novo.', okLabel: 'Entendi', semCancelar: true, perigo: true });
        return;
    }

    // 2) viagem de turismo no mesmo dia com o mesmo veículo: só avisa (a viagem não tem hora de chegada)
    const avisosTurismo = [];
    novas.forEach(n => data.turismo_viagens.filter(t => t.veiculo_id === n.veiculo_id && t.data === n.data)
        .forEach(t => avisosTurismo.push(`${parseDataLocal(n.data).toLocaleDateString('pt-BR')}: viagem de turismo ${t.local_saida} → ${t.local_chegada}${t.horario ? ' às ' + hhmm(t.horario) : ''}`)));
    if (avisosTurismo.length) {
        const ok = await confirmar(`O veículo ${veiculoPlaca(veiculo_id)} também tem turismo marcado:\n${avisosTurismo.slice(0, 6).join('\n')}\n\nSalvar mesmo assim?`, { titulo: 'Atenção: turismo no mesmo dia', okLabel: 'Salvar mesmo assim' });
        if (!ok) return;
    }

    const { error } = isEdit
        ? await sb.from('escala_rotas').update(novas[0]).eq('id', editContext.id)
        : await sb.from('escala_rotas').insert(novas.map(n => ({ empresa_id: currentEmpresa.id, ...n })));
    if (error) {
        if (error.code === '23P01') { await _dialogo({ titulo: '⛔ Conflito de escala', texto: 'O banco de dados recusou: esse veículo (ou motorista) já está em outra rota nesse horário. Atualize a página e confira a escala.', okLabel: 'Entendi', semCancelar: true, perigo: true }); await loadData(); loadControleRotas(); return; }
        alertErro(error); return;
    }
    closeModal(); await loadData(); loadControleRotas();
    toast(isEdit ? 'Rota atualizada.' : `${novas.length} rota(s) programada(s).`, 'ok');
}

function preencherFiltroClientesTurismo() {
    const sel = document.getElementById('filtroTurismoCliente');
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todos</option>' + data.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    sel.value = atual;
}

function filtrarTurismo() {
    const dataInicio = document.getElementById('filtroTurismoDataInicio').value;
    const dataFim = document.getElementById('filtroTurismoDataFim').value;
    const clienteId = document.getElementById('filtroTurismoCliente').value;
    let filtrado = data.turismo_viagens;
    if (dataInicio) filtrado = filtrado.filter(vv => parseDataLocal(vv.data) >= parseDataLocal(dataInicio));
    if (dataFim) filtrado = filtrado.filter(vv => parseDataLocal(vv.data) <= parseDataLocal(dataFim));
    if (clienteId) filtrado = filtrado.filter(vv => vv.cliente_id === clienteId);
    filtrado = ordenarPorData(filtrado, 'data');
    document.getElementById('turismoTable').innerHTML = filtrado.map(vg => {
        const impostoValor = Number(vg.nota_fiscal_valor||0) * Number(vg.imposto_percentual||0) / 100;
        const valorLiquido = Number(vg.valor_viagem||0) - impostoValor - Number(vg.adiantamento||0);
        return `<tr><td>${formatarData(vg.data)}</td><td>${vg.local_saida}</td><td>${vg.local_chegada}</td>
        <td>${motoristaNome(vg.motorista_id)}</td><td>${data.clientes.find(c=>c.id===vg.cliente_id)?.nome || 'N/A'}</td>
        <td>${veiculoPlaca(vg.veiculo_id)}</td><td>R$ ${Number(vg.valor_viagem).toFixed(2)}</td>
        <td>R$ ${Number(vg.nota_fiscal_valor||0).toFixed(2)}</td>
        <td>${Number(vg.imposto_percentual||0).toFixed(2)}% <span style="font-size:11px; color:#666;">(R$ ${impostoValor.toFixed(2)})</span></td>
        <td>R$ ${Number(vg.valor_pedagio||0).toFixed(2)}</td>
        <td>${vg.combustivel_litros ? Number(vg.combustivel_litros).toFixed(1)+'L / ' : ''}R$ ${Number(vg.combustivel_valor||0).toFixed(2)}</td>
        <td>R$ ${Number(vg.valor_diaria||0).toFixed(2)}</td>
        <td>R$ ${Number(vg.adiantamento||0).toFixed(2)}</td>
        <td>${vg.outros_descricao ? vg.outros_descricao+': R$ '+Number(vg.outros_valor||0).toFixed(2) : '-'}</td>
        <td>R$ ${Number(vg.depreciacao||0).toFixed(2)}</td>
        <td>R$ ${valorLiquido.toFixed(2)}</td>
        <td><span class="badge ${vg.acerto_motorista_pago ? 'badge-pago' : 'badge-pendente'}">${vg.acerto_motorista_pago ? 'Pago' : 'Pendente'}</span></td>
        <td>
            ${btnAnexos('turismo_viagens', vg)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('turismo_viagens','${vg.id}','viagem')">Editar</button>
            <button class="btn-small" onclick="deleteItem('turismo_viagens', '${vg.id}')">Deletar</button>
        </td></tr>`;
    }).join('');
}

function limparFiltrosTurismo() {
    document.getElementById('filtroTurismoDataInicio').value = '';
    document.getElementById('filtroTurismoDataFim').value = '';
    document.getElementById('filtroTurismoCliente').value = '';
    filtrarTurismo();
}

function loadDesempenho() {
    const dataInicio = document.getElementById('filtroDesempenhoDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroDesempenhoDataFim')?.value || '';
    const rotasFiltradas = filtrarPorData(data.rotas, 'data_inicio', dataInicio, dataFim);

    let htmlVeiculos = '<h3>🚗 Desempenho dos Veículos</h3>';
    htmlVeiculos += data.veiculos.map(vv => {
        const rotasVeiculo = rotasFiltradas.filter(r => r.veiculo_id === vv.id);
        const kmTotal = rotasVeiculo.reduce((s, r) => s + kmPercorrido(r), 0);
        const custoKm = custoPorKmVeiculo(vv.id);
        const gastos = custoKm * kmTotal;
        return `<div class="performance-card">
            <h4>🚗 ${vv.placa} - ${vv.marca} ${vv.modelo} (${vv.ano})</h4>
            <div class="performance-stats">
                <div class="stat"><div class="stat-value">${kmTotal}</div><div class="stat-label">KM Percorrido</div></div>
                <div class="stat"><div class="stat-value">${rotasVeiculo.length}</div><div class="stat-label">Rotas Realizadas</div></div>
                <div class="stat"><div class="stat-value">R$ ${gastos.toFixed(2)}</div><div class="stat-label">Gasto Total</div></div>
                <div class="stat"><div class="stat-value">R$ ${custoKm.toFixed(2)}</div><div class="stat-label">Custo/KM</div></div>
            </div></div>`;
    }).join('');
    let htmlMotoristas = '<h3 style="margin-top:30px;">👨‍✈️ Desempenho dos Motoristas</h3>';
    htmlMotoristas += data.motoristas.map(m => {
        const rotasMotorista = rotasFiltradas.filter(r => r.motorista_id === m.id);
        const kmTotal = rotasMotorista.reduce((s, r) => s + kmPercorrido(r), 0);
        let gastos = 0;
        const veiculosUsados = [...new Set(rotasMotorista.map(r => r.veiculo_id))];
        veiculosUsados.forEach(vid => { gastos += custoPorKmVeiculo(vid) * rotasMotorista.filter(r=>r.veiculo_id===vid).reduce((s,r)=>s+kmPercorrido(r),0); });
        const custoPorKm = kmTotal > 0 ? (gastos / kmTotal).toFixed(2) : 0;
        return `<div class="performance-card">
            <h4>👨‍✈️ ${m.nome}</h4>
            <div class="performance-stats">
                <div class="stat"><div class="stat-value">${kmTotal}</div><div class="stat-label">KM Percorrido</div></div>
                <div class="stat"><div class="stat-value">${rotasMotorista.length}</div><div class="stat-label">Rotas Realizadas</div></div>
                <div class="stat"><div class="stat-value">R$ ${gastos.toFixed(2)}</div><div class="stat-label">Gasto Total</div></div>
                <div class="stat"><div class="stat-value">R$ ${custoPorKm}</div><div class="stat-label">Custo/KM</div></div>
            </div></div>`;
    }).join('');
    document.getElementById('desempenhoGeral').innerHTML = htmlVeiculos + htmlMotoristas;

    document.getElementById('desempenhoConjunto').innerHTML = '<h3>🚗👨‍✈️ Clique em um veículo para ver a média de cada motorista nele</h3>' +
        data.veiculos.map(vv => {
            const rotasVeiculo = rotasFiltradas.filter(r => r.veiculo_id === vv.id);
            const motoristasIds = [...new Set(rotasVeiculo.map(r => r.motorista_id))];
            const linhasMotoristas = motoristasIds.map(mid => {
                const rotasDoMotorista = rotasVeiculo.filter(r => r.motorista_id === mid);
                const kmTotalM = rotasDoMotorista.reduce((s,r) => s + kmPercorrido(r), 0);
                const kmMedioRota = rotasDoMotorista.length > 0 ? (kmTotalM / rotasDoMotorista.length).toFixed(1) : 0;
                return `<tr><td>${motoristaNome(mid)}</td><td>${rotasDoMotorista.length}</td><td>${kmTotalM} km</td><td>${kmMedioRota} km/rota</td></tr>`;
            }).join('') || '<tr><td colspan="4" style="color:#666;">Nenhuma rota registrada com esse veículo ainda.</td></tr>';
            return `<div class="performance-card clickable-card" onclick="toggleSubList('sub_${vv.id}')">
                <h4>🚗 ${vv.placa} - ${vv.marca} ${vv.modelo}</h4>
                <p style="font-size:12px; color:#666;">${motoristasIds.length} motorista(s) já dirigiram este veículo — clique para ver</p>
                <div id="sub_${vv.id}" class="sub-list"><table><thead><tr><th>Motorista</th><th>Rotas</th><th>KM Total</th><th>KM Médio/Rota</th></tr></thead>
                <tbody>${linhasMotoristas}</tbody></table></div>
            </div>`;
        }).join('');

    document.getElementById('desempenhoRotaFixa').innerHTML = '<h3>📌 Desempenho das Rotas Fixas</h3>' + renderRotasFixasPerformance(rotasFiltradas);
}

function filtrarDesempenho() { loadDesempenho(); gerarCustosVeiculos(); }

function limparFiltrosDesempenho() {
    document.getElementById('filtroDesempenhoDataInicio').value = '';
    document.getElementById('filtroDesempenhoDataFim').value = '';
    loadDesempenho();
    gerarCustosVeiculos();
}

function renderRotasFixasPerformance(rotasBase) {
    const rotas = rotasBase || data.rotas;
    return data.rotas_fixas.map(rf => {
        const instancias = rotas.filter(r => r.rota_fixa_id === rf.id);
        const kmTotal = instancias.reduce((s,r) => s + kmPercorrido(r), 0);
        const gastoTotal = instancias.reduce((s,r) => s + custoPorKmVeiculo(r.veiculo_id) * kmPercorrido(r), 0);
        const custoPorKm = kmTotal > 0 ? (gastoTotal / kmTotal).toFixed(2) : 0;
        return `<div class="performance-card">
            <h4>📌 ${rf.nome}</h4>
            <p style="font-size:12px; color:#666;">${rf.local_saida || ''} → ${rf.local_chegada || ''}</p>
            <div class="performance-stats">
                <div class="stat"><div class="stat-value">${instancias.length}</div><div class="stat-label">Vezes Realizada</div></div>
                <div class="stat"><div class="stat-value">${kmTotal}</div><div class="stat-label">KM Total</div></div>
                <div class="stat"><div class="stat-value">R$ ${gastoTotal.toFixed(2)}</div><div class="stat-label">Gasto Estimado (por média do veículo)</div></div>
                <div class="stat"><div class="stat-value">R$ ${custoPorKm}</div><div class="stat-label">Custo/KM</div></div>
            </div></div>`;
    }).join('') || '<p style="color:#666;">Nenhuma rota fixa cadastrada. Vá em Rotas → "Nova Rota Fixa" para criar.</p>';
}

function toggleSubList(id) { document.getElementById(id).classList.toggle('open'); }

function gerarCustosVeiculos() {
    const dataInicio = document.getElementById('filtroDesempenhoDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroDesempenhoDataFim')?.value || '';
    const rotasFiltradas = filtrarPorData(data.rotas, 'data_inicio', dataInicio, dataFim);
    const abastecimentosFiltrados = filtrarPorData(data.abastecimentos, 'data', dataInicio, dataFim);
    const pneusFiltrados = filtrarPorData(data.pneus, 'data', dataInicio, dataFim);
    const oleosFiltrados = filtrarPorData(data.oleos, 'data', dataInicio, dataFim);
    const preventivasFiltradas = filtrarPorData(data.preventivas, 'data', dataInicio, dataFim);
    const corretivasFiltradas = filtrarPorData(data.corretivas, 'data', dataInicio, dataFim);
    const multasFiltradas = filtrarPorData(data.multas, 'data', dataInicio, dataFim);

    document.getElementById('custosVeiculosTable').innerHTML = data.veiculos.map(vv => {
        const kmTotal = rotasFiltradas.filter(r => r.veiculo_id === vv.id).reduce((s,r) => s + kmPercorrido(r), 0);
        const combustivel = abastecimentosFiltrados.filter(a => a.veiculo_id === vv.id).reduce((s,a) => s + Number(a.valor_total), 0);
        const pneus = pneusFiltrados.filter(p => p.veiculo_id === vv.id).reduce((s,p) => s + Number(p.valor||0), 0);
        const oleo = oleosFiltrados.filter(o => o.veiculo_id === vv.id).reduce((s,o) => s + Number(o.valor||0), 0);
        const preventiva = preventivasFiltradas.filter(p => p.veiculo_id === vv.id).reduce((s,p) => s + Number(p.valor||0), 0);
        const corretiva = corretivasFiltradas.filter(c => c.veiculo_id === vv.id).reduce((s,c) => s + Number(c.valor||0), 0);
        const multas = multasFiltradas.filter(m => m.veiculo_id === vv.id).reduce((s,m) => s + Number(m.valor||0), 0);
        const meses = mesesOperacaoVeiculo(vv.id);
        const seguroCsv = ((Number(vv.apolice_valor||0) + Number(vv.csv_valor||0)) / 12) * meses;
        const total = combustivel + pneus + oleo + preventiva + corretiva + multas + seguroCsv;
        const custoKm = kmTotal > 0 ? (total / kmTotal).toFixed(2) : '-';
        return `<tr><td>${vv.placa}</td><td>${vv.numero_bancos || '-'}</td><td>${kmTotal} km</td>
        <td>R$ ${combustivel.toFixed(2)}</td><td>R$ ${pneus.toFixed(2)}</td><td>R$ ${oleo.toFixed(2)}</td>
        <td>R$ ${preventiva.toFixed(2)}</td><td>R$ ${corretiva.toFixed(2)}</td><td>R$ ${multas.toFixed(2)}</td>
        <td>R$ ${seguroCsv.toFixed(2)}</td>
        <td><strong>R$ ${total.toFixed(2)}</strong></td><td>R$ ${custoKm}/km</td></tr>`;
    }).join('');

    gerarCustoPorRotaFixa(rotasFiltradas);
}

function mesesOperacaoRotaFixa(instancias) {
    const datasRotas = instancias.filter(r => r.data_inicio).map(r => parseDataLocal(r.data_inicio));
    if (datasRotas.length === 0) return 1;
    const min = new Date(Math.min(...datasRotas));
    const max = new Date(Math.max(...datasRotas));
    const meses = (max.getFullYear() - min.getFullYear()) * 12 + (max.getMonth() - min.getMonth()) + 1;
    return Math.max(1, meses);
}

function gerarCustoPorRotaFixa(rotasBase) {
    const rotas = rotasBase || data.rotas;
    document.getElementById('custoPorRotaFixaTable').innerHTML = data.rotas_fixas.map(rf => {
        const instancias = rotas.filter(r => r.rota_fixa_id === rf.id);
        const kmTotal = instancias.reduce((s,r) => s + kmPercorrido(r), 0);
        const custoVeiculoHistorico = instancias.reduce((s,r) => s + custoPorKmVeiculo(r.veiculo_id) * kmPercorrido(r), 0);
        const maoDeObraMensal = Number(rf.valor_motorista||0) + Number(rf.valor_funcionarios||0) + Number(rf.outros_valor||0);
        const meses = mesesOperacaoRotaFixa(instancias);
        const maoDeObraTotal = maoDeObraMensal * meses;
        const custoTotal = custoVeiculoHistorico + maoDeObraTotal;
        const custoRealPorKm = kmTotal > 0 ? custoTotal / kmTotal : 0;
        const faturamentoTotal = Number(rf.valor_rota_fixa||0) * meses;
        const impostoMensal = Number(rf.nota_fiscal_valor||0) * Number(rf.imposto_percentual||0) / 100;
        const impostoTotal = impostoMensal * meses;
        const saldoFinal = faturamentoTotal - maoDeObraTotal - custoVeiculoHistorico - impostoTotal;
        const percentualLucro = faturamentoTotal > 0 ? (saldoFinal / faturamentoTotal * 100) : 0;
        return `<tr><td>${rf.nome}</td><td>${kmTotal} km</td>
        <td>R$ ${custoVeiculoHistorico.toFixed(2)}</td><td>R$ ${maoDeObraMensal.toFixed(2)}/mês</td><td>${meses}</td>
        <td>R$ ${maoDeObraTotal.toFixed(2)}</td>
        <td><strong>R$ ${custoTotal.toFixed(2)}</strong></td><td><strong>R$ ${custoRealPorKm.toFixed(2)}/km</strong></td>
        <td>R$ ${faturamentoTotal.toFixed(2)}</td>
        <td>${Number(rf.imposto_percentual||0).toFixed(2)}% <span style="font-size:11px; color:#666;">(R$ ${impostoTotal.toFixed(2)})</span></td>
        <td><strong>R$ ${saldoFinal.toFixed(2)}</strong></td>
        <td><strong style="color:${percentualLucro >= 0 ? '#4caf50' : '#e53935'};">${percentualLucro.toFixed(1)}%</strong></td></tr>`;
    }).join('') || '<tr><td colspan="12" style="color:#666;">Nenhuma rota fixa cadastrada. Vá em Rotas → "Nova Rota Fixa" e preencha os valores mensais de mão de obra.</td></tr>';
}

function limparFiltroMedias() {
    document.getElementById('filtroMediasVeiculo').value = '';
    document.getElementById('filtroMediasDataInicio').value = '';
    document.getElementById('filtroMediasDataFim').value = '';
    gerarRelatorioMedias();
}

function gerarRelatorioMedias() {
    preencherSelectVeiculo('filtroMediasVeiculo');
    const veiculoId = document.getElementById('filtroMediasVeiculo')?.value || '';
    const dataInicio = document.getElementById('filtroMediasDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroMediasDataFim')?.value || '';

    const veiculosAlvo = veiculoId ? data.veiculos.filter(vv => vv.id === veiculoId) : data.veiculos;

    document.getElementById('relatorioMediasContent').innerHTML = veiculosAlvo.map(vv => {
        const abastecimentos = filtrarPorData(data.abastecimentos.filter(a => a.veiculo_id === vv.id), 'data', dataInicio, dataFim);
        const pneus = filtrarPorData(data.pneus.filter(p => p.veiculo_id === vv.id), 'data', dataInicio, dataFim);
        const oleos = filtrarPorData(data.oleos.filter(o => o.veiculo_id === vv.id), 'data', dataInicio, dataFim);

        if (abastecimentos.length === 0 && pneus.length === 0 && oleos.length === 0) return '';

        const mediaKmL = abastecimentos.length ? (abastecimentos.reduce((s,a) => s + Number(a.kml||0), 0) / abastecimentos.length).toFixed(2) : '-';
        const mediaGastoAbastecimento = abastecimentos.length ? (abastecimentos.reduce((s,a) => s + Number(a.valor_total||0), 0) / abastecimentos.length).toFixed(2) : '-';
        const totalGastoCombustivel = abastecimentos.reduce((s,a) => s + Number(a.valor_total||0), 0);

        const mediaGastoPneu = pneus.length ? (pneus.reduce((s,p) => s + Number(p.valor||0), 0) / pneus.length).toFixed(2) : '-';
        const totalGastoPneu = pneus.reduce((s,p) => s + Number(p.valor||0), 0);

        const mediaGastoOleo = oleos.length ? (oleos.reduce((s,o) => s + Number(o.valor||0), 0) / oleos.length).toFixed(2) : '-';
        const mediaLitragemOleo = oleos.length ? (oleos.reduce((s,o) => s + Number(o.litragem||0), 0) / oleos.length).toFixed(1) : '-';
        const totalGastoOleo = oleos.reduce((s,o) => s + Number(o.valor||0), 0);

        return `<div class="performance-card">
            <h4>🚐 ${vv.placa} - ${vv.marca} ${vv.modelo}</h4>
            <div class="performance-stats">
                <div class="stat"><div class="stat-value">${mediaKmL}</div><div class="stat-label">Média KM/L (${abastecimentos.length} abastec.)</div></div>
                <div class="stat"><div class="stat-value">R$ ${mediaGastoAbastecimento}</div><div class="stat-label">Média por Abastecimento</div></div>
                <div class="stat"><div class="stat-value">R$ ${totalGastoCombustivel.toFixed(2)}</div><div class="stat-label">Total Combustível</div></div>
            </div>
            <div class="performance-stats" style="margin-top:10px;">
                <div class="stat"><div class="stat-value">R$ ${mediaGastoPneu}</div><div class="stat-label">Média por Troca de Pneu (${pneus.length}x)</div></div>
                <div class="stat"><div class="stat-value">R$ ${totalGastoPneu.toFixed(2)}</div><div class="stat-label">Total Pneus</div></div>
                <div class="stat"><div class="stat-value">R$ ${mediaGastoOleo}</div><div class="stat-label">Média por Troca de Óleo (${oleos.length}x)</div></div>
            </div>
            <div class="performance-stats" style="margin-top:10px;">
                <div class="stat"><div class="stat-value">${mediaLitragemOleo}</div><div class="stat-label">Média Litragem de Óleo</div></div>
                <div class="stat"><div class="stat-value">R$ ${totalGastoOleo.toFixed(2)}</div><div class="stat-label">Total Óleo</div></div>
                <div class="stat"><div class="stat-value">R$ ${(totalGastoCombustivel+totalGastoPneu+totalGastoOleo).toFixed(2)}</div><div class="stat-label">Total Geral (dos 3)</div></div>
            </div>
        </div>`;
    }).join('') || '<p style="color:#666;">Nenhum dado de abastecimento, pneu ou óleo encontrado com esses filtros.</p>';
}

function verHistoricoVeiculo(veiculoId) {
    const vv = data.veiculos.find(x => x.id === veiculoId);
    if (!vv) return;

    const eventos = [];
    data.rotas.filter(r => r.veiculo_id === veiculoId).forEach(r => eventos.push({ data: r.data_inicio, tipo: '🗺️ Rota', desc: `${r.local_saida} → ${r.destino} (${motoristaNome(r.motorista_id)}) — ${kmPercorrido(r)} km`, valor: null }));
    data.abastecimentos.filter(a => a.veiculo_id === veiculoId).forEach(a => eventos.push({ data: a.data, tipo: '⛽ Abastecimento', desc: `${Number(a.litros).toFixed(1)}L (${a.fonte === 'bomba' ? 'bomba própria' : 'posto'})`, valor: Number(a.valor_total) }));
    data.pneus.filter(p => p.veiculo_id === veiculoId).forEach(p => eventos.push({ data: p.data, tipo: '🛞 Pneu', desc: `${p.tipo||''} - ${p.oficina||''}`, valor: Number(p.valor||0) }));
    data.oleos.filter(o => o.veiculo_id === veiculoId).forEach(o => eventos.push({ data: o.data, tipo: '🛢️ Óleo', desc: `${o.tipo||''} - ${o.lugar||''}`, valor: Number(o.valor||0) }));
    data.preventivas.filter(p => p.veiculo_id === veiculoId).forEach(p => eventos.push({ data: p.data, tipo: '🔧 Preventiva', desc: p.descricao||'', valor: Number(p.valor||0) }));
    data.corretivas.filter(c => c.veiculo_id === veiculoId).forEach(c => eventos.push({ data: c.data, tipo: '🛠️ Corretiva', desc: `${c.descricao||''} - ${c.oficina||''}`, valor: Number(c.valor||0) }));
    data.multas.filter(m => m.veiculo_id === veiculoId).forEach(m => eventos.push({ data: m.data, tipo: '🚨 Multa', desc: m.descricao||'', valor: Number(m.valor||0) }));
    data.turismo_viagens.filter(vg => vg.veiculo_id === veiculoId).forEach(vg => eventos.push({ data: vg.data, tipo: '🧳 Viagem', desc: `${vg.local_saida} → ${vg.local_chegada}`, valor: Number(vg.valor_viagem||0) }));

    eventos.sort((a,b) => new Date(b.data) - new Date(a.data));
    const gastoTotal = eventos.reduce((s,e) => s + (e.valor || 0), 0);

    document.getElementById('modalTitle').textContent = `📜 Histórico - ${vv.placa} (${vv.marca} ${vv.modelo})`;
    const combustivel = combustivelEstimadoTanque(veiculoId);
    const linhaCombustivel = combustivel
        ? ` • Combustível no tanque (estimado): <strong>${combustivel.litros.toFixed(0)} L de ${combustivel.tanque.toFixed(0)} L (${combustivel.percentual.toFixed(0)}%)</strong>${combustivel.semMediaConfiavel ? ' <span style="font-size:12px; color:#666;">(ainda sem km/l suficiente pra ser confiável)</span>' : ''}`
        : (vv.tanque_litros ? ' • Combustível: aguardando o 1º abastecimento cadastrado' : '');
    document.getElementById('modalBody').innerHTML = `
        <p style="margin-bottom:10px; color:#666;">KM atual: <strong>${Number(vv.km_atual||0).toLocaleString('pt-BR')} km</strong> • Gasto total registrado: <strong>R$ ${gastoTotal.toFixed(2)}</strong> • ${eventos.length} eventos${linhaCombustivel}</p>
        <div style="max-height:400px; overflow-y:auto;">
            ${eventos.map(e => `
                <div class="gasto-item">
                    <div class="gasto-info"><h4>${e.tipo}</h4><p>${formatarData(e.data)} • ${e.desc}</p></div>
                    ${e.valor != null ? `<div class="gasto-valor">R$ ${e.valor.toFixed(2)}</div>` : ''}
                </div>`).join('') || '<p style="color:#666;">Nenhum evento registrado ainda pra esse veículo.</p>'}
        </div>
        <button onclick="closeModal()" style="margin-top:15px;">Fechar</button>
    `;
    document.getElementById('modal').classList.add('active');
}

function carregarAlertasDocumentos() {
    const hoje = new Date();
    const itens = [];
    data.motoristas.forEach(m => { if (m.cnh_validade) itens.push({ nome: `CNH - ${m.nome}`, data: m.cnh_validade }); });
    data.veiculos.forEach(vv => {
        if (vv.csv_validade) itens.push({ nome: `CSV - ${vv.placa}`, data: vv.csv_validade });
        if (vv.tacografo_validade) itens.push({ nome: `Tacógrafo - ${vv.placa}`, data: vv.tacografo_validade });
        if (vv.apolice_validade) itens.push({ nome: `Apólice - ${vv.placa}`, data: vv.apolice_validade });
    });
    const comDias = itens.map(it => {
        const dataVenc = parseDataLocal(it.data);
        const dias = Math.ceil((dataVenc - hoje) / (1000*60*60*24));
        return { ...it, dias };
    }).filter(it => it.dias <= 30).sort((a,b) => a.dias - b.dias);

    document.getElementById('alertasDocumentos').innerHTML = comDias.length === 0
        ? '<p style="color:#666;">Nenhum documento vencendo nos próximos 30 dias. 👍</p>'
        : comDias.map(it => `
            <div class="gasto-item">
                <div class="gasto-info"><h4>${it.nome}</h4><p>${formatarData(it.data)}</p></div>
                <div class="gasto-valor" style="color:${it.dias < 0 ? '#ff6b6b' : '#ffc107'};">${it.dias < 0 ? `Vencido há ${Math.abs(it.dias)} dias` : `Em ${it.dias} dias`}</div>
            </div>`).join('');
}

// Considera só o registro mais recente de cada tipo por veículo (uma troca de óleo antiga não pode
// continuar aparecendo como "atrasada" depois que o óleo já foi trocado de novo).
function proximasManutencoesAtuais() {
    const grupos = {};
    const considerar = (tipo, lista) => lista.forEach(r => {
        if (!r.km_proxima) return;
        const chave = tipo + '|' + r.veiculo_id;
        const atual = grupos[chave];
        const tr = parseDataLocal(r.data)?.getTime() || 0;
        const ta = atual ? (parseDataLocal(atual.data)?.getTime() || 0) : -1;
        if (!atual || tr > ta || (tr === ta && Number(r.km_atual || 0) > Number(atual.km_atual || 0))) grupos[chave] = r;
    });
    considerar('Pneu', data.pneus); considerar('Óleo', data.oleos); considerar('Preventiva', data.preventivas);
    return Object.entries(grupos).map(([chave, r]) => ({
        tipo: chave.split('|')[0], veiculoId: r.veiculo_id, veiculo: veiculoPlaca(r.veiculo_id),
        kmFaltando: Number(r.km_proxima) - veiculoKmAtual(r.veiculo_id)
    })).sort((a, b) => a.kmFaltando - b.kmFaltando);
}

function carregarProximasManutencoes() {
    const itens = proximasManutencoesAtuais();

    document.getElementById('proximasManutencoes').innerHTML = itens.length === 0
        ? '<p style="color:#666;">Nenhuma manutenção com KM de troca registrado ainda.</p>'
        : itens.slice(0, 15).map(it => `
            <div class="gasto-item">
                <div class="gasto-info"><h4>${it.tipo} - ${it.veiculo}</h4></div>
                <div class="gasto-valor" style="color:${it.kmFaltando <= 0 ? '#ff6b6b' : it.kmFaltando <= 2000 ? '#ffc107' : '#4caf50'};">${it.kmFaltando <= 0 ? `${Math.abs(it.kmFaltando)} km atrasado` : `Faltam ${it.kmFaltando} km`}</div>
            </div>`).join('');
}

function loadAniversarios() {
    const hoje = new Date();
    const pessoas = [
        ...data.motoristas.map(m => ({ ...m, tipo: 'Motorista' })),
        ...data.funcionarios.map(f => ({ ...f, tipo: 'Funcionário' })),
        ...data.clientes.map(c => ({ ...c, tipo: 'Cliente' }))
    ];
    const aniversarios = pessoas.filter(p => p.data_nascimento).map(p => {
        const dataNasc = parseDataLocal(p.data_nascimento);
        const aniversarioEsteAno = new Date(hoje.getFullYear(), dataNasc.getMonth(), dataNasc.getDate());
        if (aniversarioEsteAno < hoje) aniversarioEsteAno.setFullYear(hoje.getFullYear() + 1);
        const diasFaltando = Math.ceil((aniversarioEsteAno - hoje) / (1000*60*60*24));
        const idade = hoje.getFullYear() - dataNasc.getFullYear();
        return { ...p, diasFaltando, idade };
    }).sort((a,b) => a.diasFaltando - b.diasFaltando);
    document.getElementById('aniversariosContent').innerHTML = aniversarios.map(p => `
        <div class="birthday-item ${p.diasFaltando === 0 ? 'today' : ''}">
            <div class="birthday-info"><h4>${p.nome}</h4><p>${p.tipo} • ${formatarData(p.data_nascimento)} • Em ${p.diasFaltando} dias</p></div>
            <div class="birthday-age">${p.idade} anos</div></div>`).join('');
}

async function deleteItem(type, id) {
    if (!(await confirmar('Tem certeza que deseja deletar? Essa ação não pode ser desfeita.', { titulo: 'Excluir registro', okLabel: 'Excluir', perigo: true }))) return;

    // Guarda o lançamento financeiro: sem o gatilho do banco, o saldo é revertido aqui (só depois de apagar com sucesso)
    const lancamentoApagado = type === 'financeiro' ? (data.financeiro.find(f => f.id === id) || null) : null;

    // Guarda o veículo afetado (se for um tipo que impacta o KM) pra recalcular depois de apagar
    const tiposComKm = ['rotas', 'abastecimentos', 'pneus', 'oleos', 'preventivas', 'corretivas'];
    let veiculoAfetado = null;
    if (tiposComKm.includes(type)) {
        const registro = data[type].find(x => x.id === id);
        veiculoAfetado = registro?.veiculo_id || null;
    }

    const { error } = await sb.from(type).delete().eq('id', id);
    if (error) { alertErro(error); return; }
    if (lancamentoApagado && lancamentoApagado.banco_id && !saldoAutomatico) {
        const { data: banco } = await sb.from('bancos').select('*').eq('id', lancamentoApagado.banco_id).single();
        if (banco) {
            const revertido = lancamentoApagado.tipo === 'entrada' ? Number(banco.saldo) - Number(lancamentoApagado.valor) : Number(banco.saldo) + Number(lancamentoApagado.valor);
            await sb.from('bancos').update({ saldo: revertido }).eq('id', banco.id);
        }
    }
    await loadData();
    if (veiculoAfetado) {
        await recalcularKmVeiculo(veiculoAfetado);
        if (type === 'abastecimentos') { await recalcularMediaKmLVeiculo(veiculoAfetado); await loadData(); }
        await loadData();
    }
    updateDashboard();
    if (type === 'agenda') loadAgenda();
    if (type === 'escala_rotas') loadControleRotas();
    if (type === 'turismo_viagens') filtrarTurismo();
    if (type === 'bomba_cargas') loadBomba();
}

function updateDashboard() {
    document.getElementById('countMotoristas').textContent = data.motoristas.length;
    document.getElementById('countFuncionarios').textContent = data.funcionarios.length;
    document.getElementById('countVeiculos').textContent = data.veiculos.length;
    document.getElementById('countClientes').textContent = data.clientes.length;
    document.getElementById('countMultas').textContent = data.multas.length;
    document.getElementById('countEstoqueBaixo').textContent = data.produtos.filter(p => Number(p.quantidade) <= Number(p.quantidade_minima)).length;
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7);
    document.getElementById('countContasPagarVencendo').textContent = data.contas_pagar.filter(c => c.status === 'pendente' && parseDataLocal(c.data_vencimento) <= em7dias).length;
    document.getElementById('nivelBombaDash').textContent = nivelBomba().atual.toFixed(0);
    document.getElementById('totalGasto').textContent = 'R$ ' + calcularTotalGasto().toFixed(2);
    carregarTopGastos();
    carregarAlertasDocumentos();
    carregarProximasManutencoes();
    if (typeof renderizarAlertas === 'function') renderizarAlertas();
}

function calcularTotalGasto() {
    let total = 0;
    total += data.abastecimentos.reduce((s,a) => s + Number(a.valor_total), 0);
    total += data.pneus.reduce((s,p) => s + Number(p.valor||0), 0);
    total += data.oleos.reduce((s,o) => s + Number(o.valor), 0);
    total += data.preventivas.reduce((s,p) => s + Number(p.valor), 0);
    total += data.corretivas.reduce((s,c) => s + Number(c.valor), 0);
    total += data.multas.reduce((s,m) => s + Number(m.valor), 0);
    total += data.financeiro.filter(f => f.tipo === 'saida').reduce((s,f) => s + Number(f.valor), 0);
    return total;
}

function carregarTopGastos() {
    const gastos = [];
    data.abastecimentos.forEach(a => gastos.push({ descricao: `Abastecimento - ${veiculoPlaca(a.veiculo_id)}`, valor: Number(a.valor_total), data: a.data, tipo: 'Abastecimento' }));
    data.pneus.forEach(p => gastos.push({ descricao: `Pneu - ${veiculoPlaca(p.veiculo_id)}`, valor: Number(p.valor||0), data: p.data, tipo: 'Pneu' }));
    data.oleos.forEach(o => gastos.push({ descricao: `Óleo - ${veiculoPlaca(o.veiculo_id)}`, valor: Number(o.valor), data: o.data, tipo: 'Óleo' }));
    data.preventivas.forEach(p => gastos.push({ descricao: `Preventiva - ${veiculoPlaca(p.veiculo_id)}`, valor: Number(p.valor), data: p.data, tipo: 'Preventiva' }));
    data.corretivas.forEach(c => gastos.push({ descricao: `Corretiva - ${veiculoPlaca(c.veiculo_id)}`, valor: Number(c.valor), data: c.data, tipo: 'Corretiva' }));
    data.multas.forEach(m => gastos.push({ descricao: `Multa - ${veiculoPlaca(m.veiculo_id)}`, valor: Number(m.valor), data: m.data, tipo: 'Multa' }));
    gastos.sort((a,b) => b.valor - a.valor);
    document.getElementById('topGastosList').innerHTML = gastos.slice(0,10).map(g => `
        <div class="gasto-item"><div class="gasto-info"><h4>${g.descricao}</h4><p>${formatarData(g.data)} • ${g.tipo}</p></div>
        <div class="gasto-valor">R$ ${g.valor.toFixed(2)}</div></div>`).join('');
}

function criarGraficos() {
    const totalAbastecimento = data.abastecimentos.reduce((s,a) => s + Number(a.valor_total), 0);
    const totalPneus = data.pneus.reduce((s,p) => s + Number(p.valor||0), 0);
    const totalOleos = data.oleos.reduce((s,o) => s + Number(o.valor), 0);
    const totalPreventiva = data.preventivas.reduce((s,p) => s + Number(p.valor), 0);
    const totalCorretiva = data.corretivas.reduce((s,c) => s + Number(c.valor), 0);
    const totalMultas = data.multas.reduce((s,m) => s + Number(m.valor), 0);

    if (chartGastos) chartGastos.destroy();
    chartGastos = new Chart(document.getElementById('chartGastos').getContext('2d'), {
        type: 'line', data: { labels: ['Abastecimentos','Pneus','Óleos','Preventivas','Corretivas','Multas'],
            datasets: [{ label: 'Gastos por Categoria', data: [totalAbastecimento,totalPneus,totalOleos,totalPreventiva,totalCorretiva,totalMultas],
                borderColor: '#0066cc', backgroundColor: 'rgba(0,102,204,0.1)', borderWidth: 2, fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    if (chartCategorias) chartCategorias.destroy();
    chartCategorias = new Chart(document.getElementById('chartCategorias').getContext('2d'), {
        type: 'doughnut', data: { labels: ['Abastecimentos','Pneus','Óleos','Preventivas','Corretivas','Multas'],
            datasets: [{ data: [totalAbastecimento,totalPneus,totalOleos,totalPreventiva,totalCorretiva,totalMultas], backgroundColor: ['#0066cc','#00a3e0','#4caf50','#ffc107','#ff9800','#ff6b6b'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function filtrarFinanceiro() {
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;
    const tipo = document.getElementById('filtroTipo').value;
    const motivo = document.getElementById('filtroMotivo').value;
    const bancoId = document.getElementById('filtroBanco').value;
    const responsavel = document.getElementById('filtroResponsavel')?.value || '';
    let filtrado = data.financeiro;
    if (dataInicio) filtrado = filtrado.filter(f => parseDataLocal(f.data) >= parseDataLocal(dataInicio));
    if (dataFim) filtrado = filtrado.filter(f => parseDataLocal(f.data) <= parseDataLocal(dataFim));
    if (tipo) filtrado = filtrado.filter(f => f.tipo === tipo);
    if (motivo) filtrado = filtrado.filter(f => f.motivo === motivo);
    if (bancoId) filtrado = filtrado.filter(f => f.banco_id === bancoId);
    if (responsavel) filtrado = filtrado.filter(f => f.responsavel === responsavel);
    filtrado = ordenarPorData(filtrado, 'data');
    document.getElementById('financeiroTable').innerHTML = filtrado.map(f => `
        <tr><td>${formatarData(f.data)}</td><td>${data.bancos.find(b=>b.id===f.banco_id)?.nome || 'N/A'}</td>
        <td>${f.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td><td>${f.motivo}</td><td>${f.responsavel||'-'}</td><td>${f.descricao||''}</td>
        <td>R$ ${Number(f.valor).toFixed(2)}</td>
        <td>
            ${btnAnexos('financeiro', f)}
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('financeiro','${f.id}','financeiro')">Editar</button>
            <button class="btn-small" onclick="deleteItem('financeiro', '${f.id}')">Deletar</button>
        </td></tr>`).join('');

    gerarGastosPorResponsavelEMotivo(filtrado);
}

function gerarGastosPorResponsavelEMotivo(lista) {
    const saidas = lista.filter(f => f.tipo === 'saida');

    const porResponsavel = {};
    saidas.forEach(f => {
        const chave = f.responsavel || 'Sem responsável';
        if (!porResponsavel[chave]) porResponsavel[chave] = { total: 0, qtd: 0 };
        porResponsavel[chave].total += Number(f.valor || 0);
        porResponsavel[chave].qtd += 1;
    });
    const listaResponsavel = Object.entries(porResponsavel).sort((a,b) => b[1].total - a[1].total);
    document.getElementById('gastosPorResponsavelTable').innerHTML = listaResponsavel.map(([nome, info]) => `
        <tr><td>${nome}</td><td>${info.qtd}</td><td><strong>R$ ${info.total.toFixed(2)}</strong></td></tr>
    `).join('') || '<tr><td colspan="3" style="color:#666; text-align:center; padding:20px;">Nenhuma saída encontrada com esses filtros.</td></tr>';

    const porMotivo = {};
    saidas.forEach(f => {
        const chave = f.motivo || 'Sem motivo';
        if (!porMotivo[chave]) porMotivo[chave] = { total: 0, qtd: 0 };
        porMotivo[chave].total += Number(f.valor || 0);
        porMotivo[chave].qtd += 1;
    });
    const listaMotivo = Object.entries(porMotivo).sort((a,b) => b[1].total - a[1].total);
    document.getElementById('gastosPorMotivoTable').innerHTML = listaMotivo.map(([nome, info]) => `
        <tr><td>${nome}</td><td>${info.qtd}</td><td><strong>R$ ${info.total.toFixed(2)}</strong></td></tr>
    `).join('') || '<tr><td colspan="3" style="color:#666; text-align:center; padding:20px;">Nenhuma saída encontrada com esses filtros.</td></tr>';
}

function limparFiltros() {
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroMotivo').value = '';
    document.getElementById('filtroBanco').value = '';
    document.getElementById('filtroResponsavel').value = '';
    filtrarFinanceiro();
}

function preencherFiltroMotivo() {
    const sel = document.getElementById('filtroMotivo');
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todos</option>' + data.financeiro_categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    sel.value = atual;

    const selBanco = document.getElementById('filtroBanco');
    if (selBanco) {
        const atualBanco = selBanco.value;
        selBanco.innerHTML = '<option value="">Todos</option>' + data.bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        selBanco.value = atualBanco;
    }

    const selResp = document.getElementById('filtroResponsavel');
    if (selResp) {
        const atualResp = selResp.value;
        const responsaveis = [...new Set(data.financeiro.map(f => f.responsavel).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
        selResp.innerHTML = '<option value="">Todos</option>' + responsaveis.map(r => `<option value="${r}">${r}</option>`).join('');
        selResp.value = atualResp;
    }
}

function gerarRelatorio() {
    const dataInicioCustom = document.getElementById('filtroRelatorioDataInicio')?.value || '';
    const dataFimCustom = document.getElementById('filtroRelatorioDataFim')?.value || '';
    const hoje = new Date();
    let dataInicio, dataFim;
    if (dataInicioCustom || dataFimCustom) {
        dataInicio = dataInicioCustom ? parseDataLocal(dataInicioCustom) : new Date(2000,0,1);
        dataFim = dataFimCustom ? parseDataLocal(dataFimCustom) : new Date(hoje.getFullYear()+1,0,1);
    } else {
        const periodo = document.getElementById('filtroRelatorio').value;
        if (periodo === 'mes') { dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1); dataFim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0); }
        else if (periodo === 'trimestre') { const t = Math.floor(hoje.getMonth()/3); dataInicio = new Date(hoje.getFullYear(), t*3, 1); dataFim = new Date(hoje.getFullYear(), t*3+3, 0); }
        else if (periodo === 'semestre') { const s = Math.floor(hoje.getMonth()/6); dataInicio = new Date(hoje.getFullYear(), s*6, 1); dataFim = new Date(hoje.getFullYear(), s*6+6, 0); }
        else { dataInicio = new Date(hoje.getFullYear(), 0, 1); dataFim = new Date(hoje.getFullYear(), 11, 31); }
    }

    let totalEntrada = 0, totalSaida = 0;
    data.financeiro.forEach(f => {
        const dataF = parseDataLocal(f.data);
        if (dataF >= dataInicio && dataF <= dataFim) { if (f.tipo === 'entrada') totalEntrada += Number(f.valor); else totalSaida += Number(f.valor); }
    });
    const saldo = totalEntrada - totalSaida;
    document.getElementById('resumoFinanceiro').innerHTML = `
        <div class="gasto-item"><div class="gasto-info"><h4>Total de Entradas</h4><p>Receitas do período</p></div><div class="gasto-valor" style="color:#4caf50;">R$ ${totalEntrada.toFixed(2)}</div></div>
        <div class="gasto-item"><div class="gasto-info"><h4>Total de Saídas</h4><p>Despesas do período</p></div><div class="gasto-valor" style="color:#ff6b6b;">R$ ${totalSaida.toFixed(2)}</div></div>
        <div class="gasto-item"><div class="gasto-info"><h4>Saldo</h4><p>Resultado do período</p></div><div class="gasto-valor" style="color:${saldo>=0?'#4caf50':'#ff6b6b'};">R$ ${saldo.toFixed(2)}</div></div>`;

    const meses = [], entradas = [], saidas = [];
    for (let i=0;i<12;i++) {
        const mes = new Date(hoje.getFullYear(), i, 1);
        if (mes >= dataInicio && mes <= dataFim) {
            meses.push(mes.toLocaleDateString('pt-BR',{month:'short'}));
            let entrada=0, saida=0;
            data.financeiro.forEach(f => {
                const dataF = parseDataLocal(f.data);
                if (dataF.getMonth()===i && dataF.getFullYear()===hoje.getFullYear()) { if (f.tipo==='entrada') entrada+=Number(f.valor); else saida+=Number(f.valor); }
            });
            entradas.push(entrada); saidas.push(saida);
        }
    }

    if (chartRelatorio) chartRelatorio.destroy();
    chartRelatorio = new Chart(document.getElementById('chartRelatorio').getContext('2d'), {
        type: 'bar', data: { labels: meses, datasets: [{ label:'Entradas', data: entradas, backgroundColor:'#4caf50' }, { label:'Saídas', data: saidas, backgroundColor:'#ff6b6b' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function limparFiltrosRelatorio() {
    document.getElementById('filtroRelatorioDataInicio').value = '';
    document.getElementById('filtroRelatorioDataFim').value = '';
    gerarRelatorio();
    gerarRelatorioTurismo();
}

function gerarRelatorioTurismo() {
    const dataInicio = document.getElementById('filtroRelatorioDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroRelatorioDataFim')?.value || '';
    const viagens = ordenarPorData(filtrarPorData(data.turismo_viagens, 'data', dataInicio, dataFim), 'data');

    const totalViagens = viagens.length;
    const totalFaturado = viagens.reduce((s,vg) => s + Number(vg.valor_viagem||0), 0);
    const totalNotaFiscal = viagens.reduce((s,vg) => s + Number(vg.nota_fiscal_valor||0), 0);
    const totalImposto = viagens.reduce((s,vg) => s + (Number(vg.nota_fiscal_valor||0) * Number(vg.imposto_percentual||0) / 100), 0);
    const totalPedagio = viagens.reduce((s,vg) => s + Number(vg.valor_pedagio||0), 0);
    const totalCombustivel = viagens.reduce((s,vg) => s + Number(vg.combustivel_valor||0), 0);
    const totalDiarias = viagens.reduce((s,vg) => s + Number(vg.valor_diaria||0), 0);
    const totalOutros = viagens.reduce((s,vg) => s + Number(vg.outros_valor||0), 0);
    const totalDepreciacao = viagens.reduce((s,vg) => s + Number(vg.depreciacao||0), 0);
    const totalAdiantamento = viagens.reduce((s,vg) => s + Number(vg.adiantamento||0), 0);
    const totalCustos = totalPedagio + totalCombustivel + totalDiarias + totalOutros + totalDepreciacao + totalImposto + totalAdiantamento;
    const totalPendente = viagens.filter(vg => !vg.acerto_motorista_pago).length;
    const margemLucroTotal = totalFaturado > 0 ? ((totalFaturado - totalCustos) / totalFaturado * 100) : 0;

    document.getElementById('resumoTurismoRelatorio').innerHTML = `
        <div class="card"><h3>Viagens</h3><div class="number">${totalViagens}</div></div>
        <div class="card"><h3>Faturado</h3><div class="number">R$ ${totalFaturado.toFixed(2)}</div></div>
        <div class="card"><h3>Nota Fiscal</h3><div class="number">R$ ${totalNotaFiscal.toFixed(2)}</div></div>
        <div class="card"><h3>Imposto</h3><div class="number">R$ ${totalImposto.toFixed(2)}</div></div>
        <div class="card"><h3>Depreciação</h3><div class="number">R$ ${totalDepreciacao.toFixed(2)}</div></div>
        <div class="card"><h3>Valor Pago aos Motoristas</h3><div class="number">R$ ${totalAdiantamento.toFixed(2)}</div></div>
        <div class="card"><h3>Custos Totais</h3><div class="number">R$ ${totalCustos.toFixed(2)}</div></div>
        <div class="card"><h3>Saldo da Viagem (total)</h3><div class="number">R$ ${(totalFaturado-totalCustos).toFixed(2)}</div></div>
        <div class="card"><h3>Margem de Lucro</h3><div class="number">${margemLucroTotal.toFixed(1)}%</div></div>
        <div class="card"><h3>Acertos Pendentes</h3><div class="number">${totalPendente}</div></div>
    `;

    document.getElementById('turismoRelatorioTable').innerHTML = viagens.map(vg => {
        const impostoValor = Number(vg.nota_fiscal_valor||0) * Number(vg.imposto_percentual||0) / 100;
        const depreciacao = Number(vg.depreciacao||0);
        const adiantamento = Number(vg.adiantamento||0);
        const totalViagem = Number(vg.valor_pedagio||0) + Number(vg.combustivel_valor||0) + Number(vg.valor_diaria||0) + Number(vg.outros_valor||0) + depreciacao + impostoValor + adiantamento;
        const saldoViagem = Number(vg.valor_viagem||0) - totalViagem;
        const percentualLucro = Number(vg.valor_viagem||0) > 0 ? (saldoViagem / Number(vg.valor_viagem) * 100) : 0;
        return `<tr><td>${formatarData(vg.data)}</td><td>${vg.local_saida}</td><td>${vg.local_chegada}</td>
        <td>${motoristaNome(vg.motorista_id)}</td><td>${data.clientes.find(c=>c.id===vg.cliente_id)?.nome || 'N/A'}</td><td>${veiculoPlaca(vg.veiculo_id)}</td>
        <td>${vg.km || '-'} km</td><td>R$ ${Number(vg.valor_viagem||0).toFixed(2)}</td>
        <td>R$ ${Number(vg.nota_fiscal_valor||0).toFixed(2)}</td>
        <td>${Number(vg.imposto_percentual||0).toFixed(2)}% <span style="font-size:11px; color:#666;">(R$ ${impostoValor.toFixed(2)})</span></td>
        <td>R$ ${Number(vg.valor_pedagio||0).toFixed(2)}</td>
        <td>${vg.combustivel_litros ? Number(vg.combustivel_litros).toFixed(1)+'L / ' : ''}R$ ${Number(vg.combustivel_valor||0).toFixed(2)}</td>
        <td>R$ ${Number(vg.valor_diaria||0).toFixed(2)}</td>
        <td>R$ ${adiantamento.toFixed(2)}</td>
        <td>${vg.outros_descricao ? vg.outros_descricao+': R$ '+Number(vg.outros_valor||0).toFixed(2) : '-'}</td>
        <td>R$ ${depreciacao.toFixed(2)}</td>
        <td><strong>R$ ${totalViagem.toFixed(2)}</strong></td>
        <td><strong>R$ ${saldoViagem.toFixed(2)}</strong></td>
        <td><strong style="color:${percentualLucro >= 0 ? '#4caf50' : '#e53935'};">${percentualLucro.toFixed(1)}%</strong></td>
        <td><span class="badge ${vg.acerto_motorista_pago ? 'badge-pago' : 'badge-pendente'}">${vg.acerto_motorista_pago ? 'Pago' : 'Pendente'}</span></td></tr>`;
    }).join('');
}

function calcularValorTotal() {
    const litros = parseFloat(document.getElementById('abastecimentoLitros').value) || 0;
    const valorL = parseFloat(document.getElementById('abastecimentoValorL').value) || 0;
    document.getElementById('abastecimentoValorTotal').value = (litros * valorL).toFixed(2);
}

// ==== CARREGAR DADOS ====
// O Supabase devolve no máximo 1000 linhas por consulta: busca em páginas pra nunca cortar dados
async function buscarTodos(tabela, empresaId) {
    const PAGINA = 1000;
    let todos = [];
    for (let inicio = 0; ; inicio += PAGINA) {
        const { data: lote, error } = await sb.from(tabela).select('*').eq('empresa_id', empresaId)
            .order('created_at', { ascending: false }).order('id', { ascending: true }).range(inicio, inicio + PAGINA - 1);
        if (error) return { error };
        todos = todos.concat(lote);
        if (lote.length < PAGINA) break;
    }
    return { data: todos };
}

async function loadData() {
    const empresaId = currentEmpresa.id;
    const tabelas = ['motoristas','funcionarios','veiculos','clientes','abastecimentos','pneus','oleos',
                      'preventivas','corretivas','multas','bancos','financeiro','rotas','produtos','estoque_movimentacoes',
                      'agenda','turismo_viagens','rotas_fixas','financeiro_categorias','bomba_cargas','contas_pagar','contas_receber','galao_oleo_cargas','escala_rotas'];

    const resultados = await Promise.all(tabelas.map(t => buscarTodos(t, empresaId)));
    const falhas = [];
    resultados.forEach((res, i) => {
        if (res.error) { console.error(`Erro ao carregar ${tabelas[i]}:`, res.error); data[tabelas[i]] = []; falhas.push(tabelas[i]); }
        else { data[tabelas[i]] = res.data; }
    });
    escalaIndisponivel = falhas.includes('escala_rotas'); // tabela opcional: só existe depois do controle_rotas.sql
    if (escalaIndisponivel) falhas.splice(falhas.indexOf('escala_rotas'), 1);
    if (falhas.length) toast(`Não consegui carregar: ${falhas.join(', ')}. Atualize a página; se continuar, fale com o administrador.`, 'erro', 9000);
    data.financeiro_categorias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    loadMotoristas(); loadFuncionarios(); loadVeiculos(); loadClientes();
    loadAbastecimentos(); loadPneus(); loadOleos(); loadPreventivas(); loadCorretivas(); loadMultas();
    loadBancos(); loadFinanceiro(); loadRotas();
    loadProdutos(); loadMovimentacoes();
    loadContasPagar();
    loadContasReceber();
    loadBomba();
    loadGalaoOleo();
    preencherFiltroClientesTurismo(); filtrarTurismo();
    preencherFiltroMotivo();
}

// ==== INICIAR ====
checkAuth();