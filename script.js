// ==== CONFIGURAÇÃO SUPABASE ====
const SUPABASE_URL = 'https://xzzfkenqdxetkvalnoix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4yK_vp6F3Nb8cZkFuhQt3A_Fhxw6A7h';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentEmpresa = null;
let currentUserRole = 'admin';
let chartGastos = null, chartCategorias = null, chartRelatorio = null;
let editContext = null; // { type: 'motorista', id: '...' } quando editando, null quando adicionando
let data = {
    motoristas: [], funcionarios: [], veiculos: [], clientes: [],
    abastecimentos: [], pneus: [], oleos: [], preventivas: [], corretivas: [], multas: [],
    bancos: [], financeiro: [], rotas: [],
    produtos: [], estoque_movimentacoes: [], agenda: [], turismo_viagens: [],
    rotas_fixas: [], financeiro_categorias: [], bomba_cargas: [], contas_pagar: [], contas_receber: [],
};

// ==== AUTENTICAÇÃO ====
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showLoginPage(); return; }
    currentUser = session.user;

    const { data: perfil, error } = await sb
        .from('perfis').select('nome, empresa_id, role, empresas(id, nome, bomba_alerta_minimo)')
        .eq('id', currentUser.id).single();

    if (error || !perfil) { showLoginPage(); return; }

    currentEmpresa = { id: perfil.empresa_id, nome: perfil.empresas.nome, bomba_alerta_minimo: perfil.empresas.bomba_alerta_minimo };
    currentUserRole = perfil.role || 'admin';
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('empresaNome').textContent = `(${currentEmpresa.nome})`;
    aplicarPermissoes();
    await loadData();
    updateDashboard();
}

function aplicarPermissoes() {
    if (currentUserRole === 'admin') return;
    // operador não vê Financeiro, Bancos nem Relatórios no menu
    ['financeiro', 'bancos', 'relatorios'].forEach(page => {
        const item = [...document.querySelectorAll('.menu-item')].find(el => el.getAttribute('onclick') === `showPage('${page}')`);
        if (item) item.style.display = 'none';
    });
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
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    event.target.classList.add('active');

    if (page === 'aniversarios') loadAniversarios();
    else if (page === 'dashboard') setTimeout(criarGraficos, 100);
    else if (page === 'desempenho') loadDesempenho();
    else if (page === 'relatorios') setTimeout(() => { gerarRelatorio(); gerarRelatorioTurismo(); }, 100);
    else if (page === 'agenda') loadAgenda();
}

function switchTab(tab) {
    const parent = document.getElementById(tab).parentElement;
    parent.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    if (tab === 'bomba') loadBomba();
    if (tab === 'mediasManutencao') gerarRelatorioMedias();
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
        ['placa','Placa'], ['marca','Marca'], ['modelo','Modelo'], ['ano','Ano'], ['chassi','Chassi'], ['renavam','Renavam'],
        ['km_atual','KM Atual'], ['csv_validade','Validade CSV'], ['tacografo_validade','Validade Tacógrafo'], ['apolice_validade','Validade Apólice'], ['crlv_ano','Ano CRLV']
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
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['data','Data'], ['tipo','Tipo'], ['lugar','Lugar'], ['litragem','Litragem'],
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
        ['valor_viagem','Valor Viagem'], ['valor_pedagio','Pedágio'], ['combustivel_litros','Litros Combustível'],
        ['combustivel_valor','Valor Combustível'], ['valor_diaria','Diária Motorista'], ['adiantamento','Adiantamento'],
        ['outros_descricao','Outros (descrição)'], ['outros_valor','Outros (valor)'],
        [item => (item.km ? (custoPorKmVeiculo(item.veiculo_id) * Number(item.km)).toFixed(2) : ''), 'Gasto do Veículo'],
        [item => (item.acerto_motorista_pago ? 'Pago' : 'Pendente'), 'Acerto Motorista']
    ]},
    bomba_cargas: { titulo: 'Bomba_Combustivel', campos: [
        ['data','Data'], ['litros','Litros'], ['valor_total','Valor Total'], ['fornecedor','Fornecedor']
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
    if (linhas.length === 0) { alert('Não há dados para exportar nessa seção ainda.'); return; }
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.titulo.substring(0, 31));
    XLSX.writeFile(wb, `${config.titulo}_${new Date().toISOString().slice(0,10)}.xlsx`);
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
function alertErro(error) { alert('Erro: ' + (error?.message || 'algo deu errado. Tente novamente.')); }

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

function nivelBomba() {
    const totalCarregado = data.bomba_cargas.reduce((s,c) => s + Number(c.litros), 0);
    const totalDispensado = data.abastecimentos.filter(a => a.fonte === 'bomba').reduce((s,a) => s + Number(a.litros), 0);
    const gastoTotal = data.bomba_cargas.reduce((s,c) => s + Number(c.valor_total), 0);
    return { atual: totalCarregado - totalDispensado, totalCarregado, totalDispensado, gastoTotal };
}

// abre modal para EDITAR um item já existente (busca na lista e reaproveita o form de adicionar)
function editarItem(arrayKey, id, modalType) {
    const item = data[arrayKey].find(x => x.id === id);
    if (!item) { alert('Item não encontrado'); return; }
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
            <div class="form-group"><label>KM Atual</label><input type="number" id="veiculoKmAtual" value="${v(item,'km_atual',0)}"></div>
            <p style="font-size:12px; color:#666; margin: 5px 0 10px;">Os campos abaixo são opcionais:</p>
            <div class="form-row">
                <div class="form-group"><label>Validade do CSV</label><input type="date" id="veiculoCsvValidade" value="${v(item,'csv_validade')}"></div>
                <div class="form-group"><label>Validade do Tacógrafo</label><input type="date" id="veiculoTacografoValidade" value="${v(item,'tacografo_validade')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Validade da Apólice</label><input type="date" id="veiculoApoliceValidade" value="${v(item,'apolice_validade')}"></div>
                <div class="form-group"><label>Ano do CRLV</label><input type="number" id="veiculoCrlvAno" value="${v(item,'crlv_ano')}" placeholder="2026"></div>
            </div>
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
        posRender = () => { document.getElementById('oleoVeiculo').value = v(item,'veiculo_id'); };
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
                <div class="form-group"><label>Motivo</label><select id="financeiroMotivo" onchange="tratarNovaCategoria()">${catOpts}<option value="__nova__">+ Nova categoria...</option></select></div>
            </div>
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
        const motoristasOptions = data.motoristas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        const rotasFixasOptions = data.rotas_fixas.map(rf => `<option value="${rf.id}">${rf.nome}</option>`).join('');
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
    } else if (type === 'viagem') {
        modalTitle.textContent = item ? 'Editar Viagem de Turismo' : 'Adicionar Viagem de Turismo';
        const veiculosOptions = data.veiculos.map(vv => `<option value="${vv.id}">${vv.placa}</option>`).join('');
        const motoristasOptions = data.motoristas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        const clientesOptions = data.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
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
            <div class="form-group"><label>Valor do Pedágio</label><input type="number" id="viagemPedagio" step="0.01" value="${v(item,'valor_pedagio')}"></div>
            <div class="form-row">
                <div class="form-group"><label>Valor da Diária do Motorista</label><input type="number" id="viagemDiaria" step="0.01" value="${v(item,'valor_diaria')}"></div>
                <div class="form-group"><label>Adiantamento já dado ao Motorista</label><input type="number" id="viagemAdiantamento" step="0.01" value="${v(item,'adiantamento',0)}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Litros de Combustível</label><input type="number" id="viagemCombustivelLitros" step="0.01" value="${v(item,'combustivel_litros')}"></div>
                <div class="form-group"><label>Valor do Combustível</label><input type="number" id="viagemCombustivelValor" step="0.01" value="${v(item,'combustivel_valor')}"></div>
            </div>
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

async function tratarNovaCategoria() {
    const sel = document.getElementById('financeiroMotivo');
    if (sel.value !== '__nova__') return;
    const novaCategoria = prompt('Digite o nome da nova categoria:');
    if (!novaCategoria) { sel.value = data.financeiro_categorias[0]?.nome || ''; return; }
    const { error } = await sb.from('financeiro_categorias').insert({ empresa_id: currentEmpresa.id, nome: novaCategoria });
    if (error) { alertErro(error); sel.value = data.financeiro_categorias[0]?.nome || ''; return; }
    data.financeiro_categorias.push({ nome: novaCategoria });
    const opt = document.createElement('option');
    opt.value = novaCategoria;
    opt.textContent = novaCategoria;
    sel.insertBefore(opt, sel.querySelector('option[value="__nova__"]'));
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
    if (!veiculoId || !km) { alert('Selecione o veículo e informe o KM'); return; }
    const custoKm = custoPorKmVeiculo(veiculoId);
    const veiculo = data.veiculos.find(vv => vv.id === veiculoId);
    if (custoKm === 0) {
        document.getElementById('simResultado').innerHTML = `<div class="sim-result"><h3>Sem dados suficientes</h3><p>Esse veículo ainda não tem rotas + gastos registrados para calcular um custo/km histórico.</p></div>`;
        return;
    }
    const despesaEstimada = custoKm * km;
    document.getElementById('simResultado').innerHTML = `
        <div class="sim-result">
            <h3>Estimativa para ${veiculo.placa}</h3>
            <p><strong>Custo histórico por KM:</strong> R$ ${custoKm.toFixed(2)}/km</p>
            <p><strong>KM da viagem:</strong> ${km} km</p>
            <p style="font-size:20px; margin-top:10px;"><strong>Despesa estimada:</strong> R$ ${despesaEstimada.toFixed(2)}</p>
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
    if (!nome || !cpf || !telefone || !endereco || !data_nascimento) { alert('Preencha todos os campos obrigatórios'); return; }
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
    if (!nome || !cpf || !telefone || !endereco || !data_nascimento) { alert('Preencha todos os campos obrigatórios'); return; }

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
    const csv_validade = document.getElementById('veiculoCsvValidade').value || null;
    const tacografo_validade = document.getElementById('veiculoTacografoValidade').value || null;
    const apolice_validade = document.getElementById('veiculoApoliceValidade').value || null;
    const crlv_ano = document.getElementById('veiculoCrlvAno').value || null;
    if (!placa || !marca || !modelo || !ano) { alert('Preencha placa, marca, modelo e ano'); return; }
    const payload = { placa, marca, modelo, ano: parseInt(ano), chassi, renavam, km_atual, csv_validade, tacografo_validade, apolice_validade, crlv_ano: crlv_ano ? parseInt(crlv_ano) : null };
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
    const data_nascimento = document.getElementById('clienteDataNasc').value;
    if (!nome || !cpf_cnpj || !telefone || !rua || !data_nascimento) { alert('Preencha ao menos nome, CPF/CNPJ, telefone, rua e nascimento'); return; }
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
    if (!veiculo_id || !data_abast || !km || !litros || !valor_litro) { alert('Preencha todos os campos'); return; }

    if (fonte === 'bomba' && !isEdit) {
        const nivel = nivelBomba();
        if (litros > nivel.atual) {
            if (!confirm(`A bomba só tem ${nivel.atual.toFixed(0)} L disponíveis. Isso vai deixar o nível negativo. Continuar mesmo assim?`)) return;
        }
    }

    let kml = 0;
    const anteriores = data.abastecimentos.filter(a => a.veiculo_id === veiculo_id && a.id !== editContext?.id).sort((a,b) => new Date(b.data) - new Date(a.data));
    if (anteriores.length > 0) { const diff = km - anteriores[0].km; kml = diff > 0 ? diff / litros : 0; }

    const payload = { veiculo_id, fonte, data: data_abast, km, litros, valor_litro, valor_total, kml };
    const { error } = isEdit
        ? await sb.from('abastecimentos').update(payload).eq('id', editContext.id)
        : await sb.from('abastecimentos').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); await recalcularKmVeiculo(veiculo_id); await loadData(); updateDashboard();
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
    if (!veiculo_id || !data_pneu || !km_atual) { alert('Preencha ao menos veículo, data e KM da troca'); return; }
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
    const data_oleo = document.getElementById('oleoData').value;
    const tipo = document.getElementById('oleoTipo').value;
    const lugar = document.getElementById('oleoLugar').value;
    const litragem = parseFloat(document.getElementById('oleoLitragem').value) || null;
    const km_atual = parseFloat(document.getElementById('oleoKMAtual').value);
    const valor = parseFloat(document.getElementById('oleoValor').value);
    const km_proxima = parseFloat(document.getElementById('oleoKMProxima').value);
    if (!veiculo_id || !data_oleo || !tipo || !km_atual || !valor || !km_proxima) { alert('Preencha todos os campos obrigatórios'); return; }
    const payload = { veiculo_id, data: data_oleo, tipo, lugar, litragem, km_atual, valor, km_proxima };
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
    if (!veiculo_id || !data_prev || !descricao || !km_atual || !km_proxima || !valor) { alert('Preencha todos os campos'); return; }
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
    if (!veiculo_id || !data_cor || !descricao || !valor) { alert('Preencha veículo, data, descrição e valor'); return; }
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
    if (!data_carga || !litros || !valor_total) { alert('Preencha data, litros e valor total'); return; }
    const payload = { data: data_carga, litros, valor_total, fornecedor };
    const { error } = isEdit
        ? await sb.from('bomba_cargas').update(payload).eq('id', editContext.id)
        : await sb.from('bomba_cargas').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); loadBomba(); updateDashboard();
}

async function salvarAlertaBomba() {
    const valor = parseFloat(document.getElementById('alertaBombaValor').value);
    if (isNaN(valor)) { alert('Informe um número válido'); return; }
    const { error } = await sb.from('empresas').update({ bomba_alerta_minimo: valor }).eq('id', currentEmpresa.id);
    if (error) { alertErro(error); return; }
    currentEmpresa.bomba_alerta_minimo = valor;
    closeModal(); loadBomba();
}

async function addContaPagar() {
    const isEdit = editContext && editContext.type === 'contaPagar';
    const fornecedor = document.getElementById('contaPagarFornecedor').value;
    const descricao = document.getElementById('contaPagarDescricao').value;
    const valor = parseFloat(document.getElementById('contaPagarValor').value);
    const data_vencimento = document.getElementById('contaPagarVencimento').value;
    if (!fornecedor || !valor || !data_vencimento) { alert('Preencha fornecedor, valor e data de vencimento'); return; }
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
    if (data.bancos.length === 0) { alert('Cadastre um banco primeiro pra poder marcar como pago.'); return; }
    const nomesBancos = data.bancos.map((b,i) => `${i+1} - ${b.nome}`).join('\n');
    const escolha = prompt(`Marcar "${conta.fornecedor}" (R$ ${Number(conta.valor).toFixed(2)}) como pago. De qual banco vai sair?\n${nomesBancos}`);
    const idx = parseInt(escolha) - 1;
    if (!data.bancos[idx]) return;
    const banco = data.bancos[idx];

    const categoria = data.financeiro_categorias.find(c => c.nome === 'Outro')?.nome || data.financeiro_categorias[0]?.nome || 'Outro';
    await sb.from('financeiro').insert({
        empresa_id: currentEmpresa.id, banco_id: banco.id, data: new Date().toISOString().slice(0,10), tipo: 'saida',
        motivo: categoria, descricao: `Conta paga - ${conta.fornecedor}${conta.descricao ? ' - ' + conta.descricao : ''}`, valor: Number(conta.valor)
    });
    await sb.from('bancos').update({ saldo: Number(banco.saldo) - Number(conta.valor) }).eq('id', banco.id);
    await sb.from('contas_pagar').update({ status: 'pago', data_pagamento: new Date().toISOString().slice(0,10), banco_id: banco.id }).eq('id', id);

    await loadData(); updateDashboard();
}

async function addContaReceber() {
    const isEdit = editContext && editContext.type === 'contaReceber';
    const cliente_id = document.getElementById('contaReceberCliente').value || null;
    const descricao = document.getElementById('contaReceberDescricao').value;
    const valor = parseFloat(document.getElementById('contaReceberValor').value);
    const data_vencimento = document.getElementById('contaReceberVencimento').value;
    if (!valor || !data_vencimento) { alert('Preencha valor e data de vencimento'); return; }
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
    if (data.bancos.length === 0) { alert('Cadastre um banco primeiro pra poder marcar como recebido.'); return; }
    const nomesBancos = data.bancos.map((b,i) => `${i+1} - ${b.nome}`).join('\n');
    const nomeCliente = data.clientes.find(c => c.id === conta.cliente_id)?.nome || 'Cliente';
    const escolha = prompt(`Marcar recebimento de "${nomeCliente}" (R$ ${Number(conta.valor).toFixed(2)}) como recebido. Em qual banco entrou?\n${nomesBancos}`);
    const idx = parseInt(escolha) - 1;
    if (!data.bancos[idx]) return;
    const banco = data.bancos[idx];

    const categoria = data.financeiro_categorias.find(c => c.nome === 'Outro')?.nome || data.financeiro_categorias[0]?.nome || 'Outro';
    await sb.from('financeiro').insert({
        empresa_id: currentEmpresa.id, banco_id: banco.id, data: new Date().toISOString().slice(0,10), tipo: 'entrada',
        motivo: categoria, descricao: `Recebimento - ${nomeCliente}${conta.descricao ? ' - ' + conta.descricao : ''}`, valor: Number(conta.valor)
    });
    await sb.from('bancos').update({ saldo: Number(banco.saldo) + Number(conta.valor) }).eq('id', banco.id);
    await sb.from('contas_receber').update({ status: 'recebido', data_recebimento: new Date().toISOString().slice(0,10), banco_id: banco.id }).eq('id', id);

    await loadData(); updateDashboard();
}

async function addMulta() {
    const isEdit = editContext && editContext.type === 'multa';
    const veiculo_id = document.getElementById('multaVeiculo').value;
    const data_multa = document.getElementById('multaData').value;
    const descricao = document.getElementById('multaDescricao').value;
    const valor = parseFloat(document.getElementById('multaValor').value);
    if (!veiculo_id || !data_multa || !descricao || !valor) { alert('Preencha todos os campos'); return; }
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
    if (!nome || !agencia || !conta || (isNaN(saldo))) { alert('Preencha todos os campos'); return; }
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
    const descricao = document.getElementById('financeiroDescricao').value;
    const valor = parseFloat(document.getElementById('financeiroValor').value);

    if (motivo === '__nova__') {
        const novaCategoria = prompt('Nome da nova categoria:');
        if (!novaCategoria) return;
        const { error: errCat } = await sb.from('financeiro_categorias').insert({ empresa_id: currentEmpresa.id, nome: novaCategoria });
        if (errCat) { alertErro(errCat); return; }
        motivo = novaCategoria;
    }
    if (!data_fin || !banco_id || !tipo || !motivo || !valor) { alert('Preencha todos os campos obrigatórios'); return; }

    // se estiver editando, primeiro desfaz o efeito do lançamento antigo no saldo do banco antigo
    if (isEdit) {
        const antigo = data.financeiro.find(f => f.id === editContext.id);
        if (antigo) {
            const bancoAntigo = data.bancos.find(b => b.id === antigo.banco_id);
            if (bancoAntigo) {
                const saldoRevertido = antigo.tipo === 'entrada' ? bancoAntigo.saldo - Number(antigo.valor) : bancoAntigo.saldo + Number(antigo.valor);
                await sb.from('bancos').update({ saldo: saldoRevertido }).eq('id', bancoAntigo.id);
            }
        }
    }

    const payload = { banco_id, data: data_fin, tipo, motivo, descricao, valor };
    const { error } = isEdit
        ? await sb.from('financeiro').update(payload).eq('id', editContext.id)
        : await sb.from('financeiro').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }

    // aplica o novo efeito no saldo do banco (atual, já refletindo a reversão se foi edição)
    const { data: bancoAtualizado } = await sb.from('bancos').select('*').eq('id', banco_id).single();
    if (bancoAtualizado) {
        const novoSaldo = tipo === 'entrada' ? Number(bancoAtualizado.saldo) + valor : Number(bancoAtualizado.saldo) - valor;
        await sb.from('bancos').update({ saldo: novoSaldo }).eq('id', banco_id);
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
    if (!veiculo_id || !motorista_id || !local_saida || !destino || !data_inicio || !data_fim || !hora_inicio || !hora_fim || !km_inicio || !km_fim) { alert('Preencha todos os campos'); return; }
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
    if (!nome) { alert('Informe o nome da rota fixa'); return; }
    const payload = { nome, local_saida, local_chegada };
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
    if (!nome) { alert('Informe o nome do produto'); return; }
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
    if (!produto_id || !quantidade || !data_mov) { alert('Preencha todos os campos'); return; }
    const produto = data.produtos.find(p => p.id === produto_id);
    if (tipo === 'saida' && produto && quantidade > produto.quantidade) {
        if (!confirm(`Isso vai deixar o estoque negativo (${produto.quantidade} disponível). Continuar?`)) return;
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
    if (!titulo || !data_evento) { alert('Preencha ao menos título e data'); return; }
    const payload = { titulo, descricao, data: data_evento, hora, categoria };
    const { error } = isEdit
        ? await sb.from('agenda').update(payload).eq('id', editContext.id)
        : await sb.from('agenda').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); loadAgenda();
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
    const valor_pedagio = parseFloat(document.getElementById('viagemPedagio').value) || 0;
    const valor_diaria = parseFloat(document.getElementById('viagemDiaria').value) || 0;
    const adiantamento = parseFloat(document.getElementById('viagemAdiantamento').value) || 0;
    const combustivel_litros = parseFloat(document.getElementById('viagemCombustivelLitros').value) || 0;
    const combustivel_valor = parseFloat(document.getElementById('viagemCombustivelValor').value) || 0;
    const outros_descricao = document.getElementById('viagemOutrosDescricao').value;
    const outros_valor = parseFloat(document.getElementById('viagemOutrosValor').value) || 0;
    const acerto_motorista_pago = document.getElementById('viagemAcerto').value === 'true';
    if (!local_saida || !local_chegada || !data_viagem) { alert('Preencha ao menos saída, chegada e data'); return; }
    const payload = {
        local_saida, local_chegada, motorista_id, cliente_id, veiculo_id, km, data: data_viagem, horario,
        valor_viagem, valor_pedagio, valor_diaria, adiantamento, combustivel_litros, combustivel_valor, outros_descricao, outros_valor,
        valor_motorista: valor_diaria, acerto_motorista_pago,
        acerto_data: acerto_motorista_pago ? new Date().toISOString().slice(0,10) : null
    };
    const { error } = isEdit
        ? await sb.from('turismo_viagens').update(payload).eq('id', editContext.id)
        : await sb.from('turismo_viagens').insert({ empresa_id: currentEmpresa.id, ...payload });
    if (error) { alertErro(error); return; }

    // se marcou (ou já estava) como pago e sobra valor líquido (diária - adiantamento), oferece lançar no financeiro
    const jaEraPago = isEdit ? data.turismo_viagens.find(vg => vg.id === editContext.id)?.acerto_motorista_pago : false;
    const valorLiquido = valor_diaria - adiantamento;
    if (acerto_motorista_pago && !jaEraPago && valorLiquido > 0 && data.bancos.length > 0) {
        const nomesBancos = data.bancos.map((b,i) => `${i+1} - ${b.nome}`).join('\n');
        const escolha = prompt(`Lançar R$ ${valorLiquido.toFixed(2)} de comissão do motorista no Financeiro (diária R$ ${valor_diaria.toFixed(2)} - adiantamento já pago R$ ${adiantamento.toFixed(2)})?\nDigite o número do banco pra confirmar, ou cancele pra não lançar:\n${nomesBancos}`);
        const idx = parseInt(escolha) - 1;
        if (data.bancos[idx]) {
            const banco = data.bancos[idx];
            const categoriaComissao = data.financeiro_categorias.find(c => c.nome === 'Salário')?.nome || data.financeiro_categorias[0]?.nome || 'Outro';
            await sb.from('financeiro').insert({
                empresa_id: currentEmpresa.id, banco_id: banco.id, data: data_viagem, tipo: 'saida',
                motivo: categoriaComissao, descricao: `Comissão/diária (líquido) - ${motoristaNome(motorista_id)} - viagem ${local_saida} → ${local_chegada}`, valor: valorLiquido
            });
            await sb.from('bancos').update({ saldo: Number(banco.saldo) - valorLiquido }).eq('id', banco.id);
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
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('motoristas','${m.id}','motorista')">Editar</button>
            <button class="btn-small" onclick="deleteItem('motoristas', '${m.id}')">Deletar</button>
        </td></tr>`;
    document.getElementById('funcMotoristasTable').innerHTML = data.motoristas.map(linhaMotorista).join('');
}

function loadFuncionarios() {
    const linha = (f, cols) => `<tr><td>${f.nome}</td><td>${f.funcao||'-'}</td>${cols}
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('funcionarios','${f.id}','funcionario')">Editar</button>
            <button class="btn-small" onclick="deleteItem('funcionarios', '${f.id}')">Deletar</button>
        </td></tr>`;
    document.getElementById('funcAtivosTable').innerHTML = data.funcionarios.filter(f => f.status === 'ativo').map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.telefone}</td><td>${f.data_admissao ? formatarData(f.data_admissao) : '-'}</td><td>${f.salario ? 'R$ ' + Number(f.salario).toFixed(2) : '-'}</td>`)).join('');
    document.getElementById('funcDemitidosTable').innerHTML = data.funcionarios.filter(f => f.status === 'demitido').map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.data_admissao ? formatarData(f.data_admissao) : '-'}</td><td>${f.data_demissao ? formatarData(f.data_demissao) : '-'}</td>`)).join('');
    document.getElementById('funcExperienciaTable').innerHTML = data.funcionarios.filter(f => f.status === 'experiencia').map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.experiencia_inicio ? formatarData(f.experiencia_inicio) : '-'}</td><td>${f.experiencia_fim ? formatarData(f.experiencia_fim) : '-'}</td>`)).join('');
}

function loadVeiculos() {
    document.getElementById('veiculosTable').innerHTML = data.veiculos.map(vv => `
        <tr><td>${vv.placa}</td><td>${vv.marca}</td><td>${vv.modelo}</td><td>${vv.ano}</td><td>${vv.chassi||'-'}</td><td>${vv.renavam||'-'}</td>
        <td>${Number(vv.km_atual||0).toLocaleString('pt-BR')} km</td>
        <td>${vv.csv_validade ? formatarData(vv.csv_validade) : '-'}</td>
        <td>${vv.tacografo_validade ? formatarData(vv.tacografo_validade) : '-'}</td>
        <td>${vv.apolice_validade ? formatarData(vv.apolice_validade) : '-'}</td>
        <td>${vv.crlv_ano || '-'}</td>
        <td>
            <button class="btn-small" style="background:#764ba2;" onclick="verHistoricoVeiculo('${vv.id}')">Histórico</button>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('veiculos','${vv.id}','veiculo')">Editar</button>
            <button class="btn-small" onclick="deleteItem('veiculos', '${vv.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadClientes() {
    document.getElementById('clientesTable').innerHTML = data.clientes.map(c => `
        <tr><td>${c.nome}</td><td>${c.cpf_cnpj}</td><td>${c.telefone}</td>
        <td>${c.rua||''}${c.numero ? ', '+c.numero : ''}${c.bairro ? ' - '+c.bairro : ''}</td>
        <td>${c.cidade||''}${c.uf ? '/'+c.uf : ''}</td><td>${c.cep||'-'}</td>
        <td>${c.data_nascimento ? formatarData(c.data_nascimento) : ''}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('clientes','${c.id}','cliente')">Editar</button>
            <button class="btn-small" onclick="deleteItem('clientes', '${c.id}')">Deletar</button>
        </td></tr>`).join('');
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
    lista = filtrarPorData(lista, 'data', dataInicio, dataFim);
    document.getElementById('abastecimentosTable').innerHTML = lista.map(a => `
        <tr><td>${veiculoPlaca(a.veiculo_id)}</td><td>${a.fonte === 'bomba' ? '🛢️ Bomba' : '⛽ Posto'}</td><td>${formatarData(a.data)}</td>
        <td>${a.km}</td><td>${Number(a.litros).toFixed(2)}</td><td>R$ ${Number(a.valor_litro).toFixed(2)}</td>
        <td>R$ ${Number(a.valor_total).toFixed(2)}</td><td>${Number(a.kml).toFixed(2)} km/l</td>
        <td>
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
    lista = filtrarPorData(lista, 'data', dataInicio, dataFim);
    document.getElementById('neusTable').innerHTML = lista.map(p => `
        <tr><td>${veiculoPlaca(p.veiculo_id)}</td><td>${formatarData(p.data)}</td>
        <td>${p.tipo||'-'}</td><td>${p.oficina||'-'}</td><td>${p.quantidade||1}</td>
        <td>R$ ${Number(p.valor_unitario||0).toFixed(2)}</td><td>R$ ${Number(p.valor||0).toFixed(2)}</td>
        <td>${p.km_atual} km</td><td>${veiculoKmAtual(p.veiculo_id).toLocaleString('pt-BR')} km</td><td>${p.km_proxima||'-'} km</td>
        <td>
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
    lista = filtrarPorData(lista, 'data', dataInicio, dataFim);
    document.getElementById('oleosTable').innerHTML = lista.map(o => {
        const kmFaltando = o.km_proxima - veiculoKmAtual(o.veiculo_id);
        const cls = kmFaltando <= 5000 ? 'style="background:#fff3cd;"' : '';
        return `<tr ${cls}><td>${veiculoPlaca(o.veiculo_id)}</td><td>${formatarData(o.data)}</td>
        <td>${o.tipo}</td><td>${o.lugar||'-'}</td><td>${o.litragem||'-'}</td>
        <td>${o.km_atual} km</td><td>${veiculoKmAtual(o.veiculo_id).toLocaleString('pt-BR')} km</td><td>${o.km_proxima} km</td>
        <td>R$ ${Number(o.valor).toFixed(2)}</td>
        <td>
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
    lista = filtrarPorData(lista, 'data', dataInicio, dataFim);
    document.getElementById('preventivaTable').innerHTML = lista.map(p => {
        const kmFaltando = p.km_proxima - (p.km_atual || 0);
        const cls = kmFaltando <= 5000 ? 'style="background:#fff3cd;"' : '';
        return `<tr ${cls}><td>${veiculoPlaca(p.veiculo_id)}</td><td>${formatarData(p.data)}</td>
        <td>${p.descricao}</td><td>${p.km_atual} km</td><td>${p.km_proxima} km</td><td>${kmFaltando} km</td>
        <td>R$ ${Number(p.valor).toFixed(2)}</td>
        <td>
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
    lista = filtrarPorData(lista, 'data', dataInicio, dataFim);
    document.getElementById('corretivaTable').innerHTML = lista.map(c => `
        <tr><td>${veiculoPlaca(c.veiculo_id)}</td><td>${formatarData(c.data)}</td>
        <td>${c.descricao}</td><td>${c.oficina||'-'}</td><td>${c.km_atual||'-'}</td>
        <td>${veiculoKmAtual(c.veiculo_id).toLocaleString('pt-BR')} km</td><td>${c.km_proxima||'-'}</td>
        <td>R$ ${Number(c.valor).toFixed(2)}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('corretivas','${c.id}','corretiva')">Editar</button>
            <button class="btn-small" onclick="deleteItem('corretivas', '${c.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadContasPagar() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    document.getElementById('contasPagarTable').innerHTML = data.contas_pagar.map(c => {
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
                <button class="btn-small" style="background:#0066cc;" onclick="editarItem('contas_pagar','${c.id}','contaPagar')">Editar</button>
                <button class="btn-small" onclick="deleteItem('contas_pagar', '${c.id}')">Deletar</button>
            </td></tr>`;
    }).join('');
}

function loadContasReceber() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    document.getElementById('contasReceberTable').innerHTML = data.contas_receber.map(c => {
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

function loadMultas() {
    document.getElementById('multasTable').innerHTML = data.multas.map(m => `
        <tr><td>${veiculoPlaca(m.veiculo_id)}</td><td>${formatarData(m.data)}</td>
        <td>${m.descricao}</td><td>R$ ${Number(m.valor).toFixed(2)}</td>
        <td>
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
}

function loadFinanceiro() {
    document.getElementById('financeiroTable').innerHTML = data.financeiro.map(f => `
        <tr><td>${formatarData(f.data)}</td><td>${data.bancos.find(b=>b.id===f.banco_id)?.nome || 'N/A'}</td>
        <td>${f.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td><td>${f.motivo}</td><td>${f.descricao||''}</td>
        <td>R$ ${Number(f.valor).toFixed(2)}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('financeiro','${f.id}','financeiro')">Editar</button>
            <button class="btn-small" onclick="deleteItem('financeiro', '${f.id}')">Deletar</button>
        </td></tr>`).join('');
}

function loadRotas() {
    preencherFiltrosRotas();
    filtrarRotas();
}

function preencherFiltrosRotas() {
    const selFixa = document.getElementById('filtroRotasFixa');
    const selMotorista = document.getElementById('filtroRotasMotorista');
    if (!selFixa || !selMotorista) return;
    const atualFixa = selFixa.value, atualMotorista = selMotorista.value;
    selFixa.innerHTML = '<option value="">Todas</option>' + data.rotas_fixas.map(rf => `<option value="${rf.id}">${rf.nome}</option>`).join('');
    selMotorista.innerHTML = '<option value="">Todos</option>' + data.motoristas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
    selFixa.value = atualFixa;
    selMotorista.value = atualMotorista;
}

function filtrarRotas() {
    const rotaFixaId = document.getElementById('filtroRotasFixa')?.value || '';
    const motoristaId = document.getElementById('filtroRotasMotorista')?.value || '';
    let filtrado = data.rotas;
    if (rotaFixaId) filtrado = filtrado.filter(r => r.rota_fixa_id === rotaFixaId);
    if (motoristaId) filtrado = filtrado.filter(r => r.motorista_id === motoristaId);

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
        </td></tr>`).join('');
}

function limparFiltrosRotas() {
    document.getElementById('filtroRotasFixa').value = '';
    document.getElementById('filtroRotasMotorista').value = '';
    filtrarRotas();
}

function loadProdutos() {
    document.getElementById('produtosTable').innerHTML = data.produtos.map(p => {
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
    if (dataInicio) filtrado = filtrado.filter(vv => new Date(vv.data) >= new Date(dataInicio));
    if (dataFim) filtrado = filtrado.filter(vv => new Date(vv.data) <= new Date(dataFim));
    if (clienteId) filtrado = filtrado.filter(vv => vv.cliente_id === clienteId);
    document.getElementById('turismoTable').innerHTML = filtrado.map(vg => {
        const gastoVeiculo = vg.km ? custoPorKmVeiculo(vg.veiculo_id) * Number(vg.km) : 0;
        return `<tr><td>${formatarData(vg.data)}</td><td>${vg.local_saida}</td><td>${vg.local_chegada}</td>
        <td>${motoristaNome(vg.motorista_id)}</td><td>${data.clientes.find(c=>c.id===vg.cliente_id)?.nome || 'N/A'}</td>
        <td>${veiculoPlaca(vg.veiculo_id)}</td><td>R$ ${Number(vg.valor_viagem).toFixed(2)}</td>
        <td>R$ ${Number(vg.valor_pedagio||0).toFixed(2)}</td>
        <td>${vg.combustivel_litros ? Number(vg.combustivel_litros).toFixed(1)+'L / ' : ''}R$ ${Number(vg.combustivel_valor||0).toFixed(2)}</td>
        <td>R$ ${Number(vg.valor_diaria||0).toFixed(2)}</td>
        <td>R$ ${Number(vg.adiantamento||0).toFixed(2)}</td>
        <td>${vg.outros_descricao ? vg.outros_descricao+': R$ '+Number(vg.outros_valor||0).toFixed(2) : '-'}</td>
        <td>${vg.km ? `R$ ${gastoVeiculo.toFixed(2)} <span style="font-size:11px; color:#666;">(${vg.km} km)</span>` : '-'}</td>
        <td><span class="badge ${vg.acerto_motorista_pago ? 'badge-pago' : 'badge-pendente'}">${vg.acerto_motorista_pago ? 'Pago' : 'Pendente'}</span></td>
        <td>
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
    let htmlVeiculos = '<h3>🚗 Desempenho dos Veículos</h3>';
    htmlVeiculos += data.veiculos.map(vv => {
        const rotasVeiculo = data.rotas.filter(r => r.veiculo_id === vv.id);
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
        const rotasMotorista = data.rotas.filter(r => r.motorista_id === m.id);
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
            const rotasVeiculo = data.rotas.filter(r => r.veiculo_id === vv.id);
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

    document.getElementById('desempenhoRotaFixa').innerHTML = '<h3>📌 Desempenho das Rotas Fixas</h3>' + renderRotasFixasPerformance();
}

function renderRotasFixasPerformance() {
    return data.rotas_fixas.map(rf => {
        const instancias = data.rotas.filter(r => r.rota_fixa_id === rf.id);
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
    document.getElementById('modalBody').innerHTML = `
        <p style="margin-bottom:10px; color:#666;">KM atual: <strong>${Number(vv.km_atual||0).toLocaleString('pt-BR')} km</strong> • Gasto total registrado: <strong>R$ ${gastoTotal.toFixed(2)}</strong> • ${eventos.length} eventos</p>
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

function carregarProximasManutencoes() {
    const itens = [];
    data.pneus.forEach(p => { if (p.km_proxima) itens.push({ tipo: 'Pneu', veiculo: veiculoPlaca(p.veiculo_id), kmFaltando: p.km_proxima - veiculoKmAtual(p.veiculo_id) }); });
    data.oleos.forEach(o => { if (o.km_proxima) itens.push({ tipo: 'Óleo', veiculo: veiculoPlaca(o.veiculo_id), kmFaltando: o.km_proxima - veiculoKmAtual(o.veiculo_id) }); });
    data.preventivas.forEach(p => { if (p.km_proxima) itens.push({ tipo: 'Preventiva', veiculo: veiculoPlaca(p.veiculo_id), kmFaltando: p.km_proxima - veiculoKmAtual(p.veiculo_id) }); });
    itens.sort((a,b) => a.kmFaltando - b.kmFaltando);

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
    if (!confirm('Tem certeza que deseja deletar?')) return;

    // Se for um lançamento financeiro, reverte o efeito dele no saldo do banco antes de apagar
    if (type === 'financeiro') {
        const lancamento = data.financeiro.find(f => f.id === id);
        if (lancamento && lancamento.banco_id) {
            const banco = data.bancos.find(b => b.id === lancamento.banco_id);
            if (banco) {
                const saldoRevertido = lancamento.tipo === 'entrada'
                    ? Number(banco.saldo) - Number(lancamento.valor)
                    : Number(banco.saldo) + Number(lancamento.valor);
                await sb.from('bancos').update({ saldo: saldoRevertido }).eq('id', banco.id);
            }
        }
    }

    // Guarda o veículo afetado (se for um tipo que impacta o KM) pra recalcular depois de apagar
    const tiposComKm = ['rotas', 'abastecimentos', 'pneus', 'oleos', 'preventivas', 'corretivas'];
    let veiculoAfetado = null;
    if (tiposComKm.includes(type)) {
        const registro = data[type].find(x => x.id === id);
        veiculoAfetado = registro?.veiculo_id || null;
    }

    const { error } = await sb.from(type).delete().eq('id', id);
    if (error) { alertErro(error); return; }
    await loadData();
    if (veiculoAfetado) { await recalcularKmVeiculo(veiculoAfetado); await loadData(); }
    updateDashboard();
    if (type === 'agenda') loadAgenda();
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
    let filtrado = data.financeiro;
    if (dataInicio) filtrado = filtrado.filter(f => new Date(f.data) >= new Date(dataInicio));
    if (dataFim) filtrado = filtrado.filter(f => new Date(f.data) <= new Date(dataFim));
    if (tipo) filtrado = filtrado.filter(f => f.tipo === tipo);
    if (motivo) filtrado = filtrado.filter(f => f.motivo === motivo);
    document.getElementById('financeiroTable').innerHTML = filtrado.map(f => `
        <tr><td>${formatarData(f.data)}</td><td>${data.bancos.find(b=>b.id===f.banco_id)?.nome || 'N/A'}</td>
        <td>${f.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td><td>${f.motivo}</td><td>${f.descricao||''}</td>
        <td>R$ ${Number(f.valor).toFixed(2)}</td>
        <td>
            <button class="btn-small" style="background:#0066cc;" onclick="editarItem('financeiro','${f.id}','financeiro')">Editar</button>
            <button class="btn-small" onclick="deleteItem('financeiro', '${f.id}')">Deletar</button>
        </td></tr>`).join('');
}

function limparFiltros() {
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroMotivo').value = '';
    loadFinanceiro();
}

function preencherFiltroMotivo() {
    const sel = document.getElementById('filtroMotivo');
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todos</option>' + data.financeiro_categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    sel.value = atual;
}

function gerarRelatorio() {
    const periodo = document.getElementById('filtroRelatorio').value;
    const hoje = new Date();
    let dataInicio, dataFim;
    if (periodo === 'mes') { dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1); dataFim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0); }
    else if (periodo === 'trimestre') { const t = Math.floor(hoje.getMonth()/3); dataInicio = new Date(hoje.getFullYear(), t*3, 1); dataFim = new Date(hoje.getFullYear(), t*3+3, 0); }
    else if (periodo === 'semestre') { const s = Math.floor(hoje.getMonth()/6); dataInicio = new Date(hoje.getFullYear(), s*6, 1); dataFim = new Date(hoje.getFullYear(), s*6+6, 0); }
    else { dataInicio = new Date(hoje.getFullYear(), 0, 1); dataFim = new Date(hoje.getFullYear(), 11, 31); }

    let totalEntrada = 0, totalSaida = 0;
    data.financeiro.forEach(f => {
        const dataF = new Date(f.data);
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
                const dataF = new Date(f.data);
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

function gerarRelatorioRotas() {
    document.getElementById('rotasFixasRelatorio').innerHTML = renderRotasFixasPerformance();
    const filtroRota = document.getElementById('filtroRotaRelatorio')?.value || '';
    let rotasFiltradas = data.rotas;
    if (filtroRota) rotasFiltradas = rotasFiltradas.filter(r => r.id === filtroRota);
    document.getElementById('rotasGastoTable').innerHTML = rotasFiltradas.map(r => {
        const g = gastoRotaDetalhado(r);
        const kmP = kmPercorrido(r);
        const custoPorKm = kmP > 0 ? (g.total/kmP).toFixed(2) : 0;
        const rotaFixa = data.rotas_fixas.find(rf => rf.id === r.rota_fixa_id)?.nome || '-';
        return `<tr><td>${veiculoPlaca(r.veiculo_id)}</td><td>${motoristaNome(r.motorista_id)}</td><td>${rotaFixa}</td><td>${r.local_saida}</td><td>${r.destino}</td>
        <td>${formatarData(r.data_inicio)}</td><td>${tempoTotal(r)}</td><td>${kmP} km</td>
        <td>R$ ${g.combustivel.toFixed(2)}</td><td>R$ ${g.manutencao.toFixed(2)}</td><td>R$ ${g.multas.toFixed(2)}</td>
        <td><strong>R$ ${g.total.toFixed(2)}</strong></td><td>R$ ${custoPorKm}/km</td></tr>`;
    }).join('');
}

function gerarRelatorioTurismo() {
    const totalViagens = data.turismo_viagens.length;
    const totalFaturado = data.turismo_viagens.reduce((s,vg) => s + Number(vg.valor_viagem||0), 0);
    const totalPedagio = data.turismo_viagens.reduce((s,vg) => s + Number(vg.valor_pedagio||0), 0);
    const totalCombustivel = data.turismo_viagens.reduce((s,vg) => s + Number(vg.combustivel_valor||0), 0);
    const totalDiarias = data.turismo_viagens.reduce((s,vg) => s + Number(vg.valor_diaria||0), 0);
    const totalOutros = data.turismo_viagens.reduce((s,vg) => s + Number(vg.outros_valor||0), 0);
    const totalGastoVeiculo = data.turismo_viagens.reduce((s,vg) => s + (vg.km ? custoPorKmVeiculo(vg.veiculo_id) * Number(vg.km) : 0), 0);
    const totalCustos = totalPedagio + totalCombustivel + totalDiarias + totalOutros + totalGastoVeiculo;
    const totalPendente = data.turismo_viagens.filter(vg => !vg.acerto_motorista_pago).length;

    document.getElementById('resumoTurismoRelatorio').innerHTML = `
        <div class="card"><h3>Viagens</h3><div class="number">${totalViagens}</div></div>
        <div class="card"><h3>Faturado</h3><div class="number">R$ ${totalFaturado.toFixed(2)}</div></div>
        <div class="card"><h3>Gasto do Veículo</h3><div class="number">R$ ${totalGastoVeiculo.toFixed(2)}</div></div>
        <div class="card"><h3>Custos Totais</h3><div class="number">R$ ${totalCustos.toFixed(2)}</div></div>
        <div class="card"><h3>Lucro Estimado</h3><div class="number">R$ ${(totalFaturado-totalCustos).toFixed(2)}</div></div>
        <div class="card"><h3>Acertos Pendentes</h3><div class="number">${totalPendente}</div></div>
    `;

    document.getElementById('turismoRelatorioTable').innerHTML = data.turismo_viagens.map(vg => {
        const gastoVeiculo = vg.km ? custoPorKmVeiculo(vg.veiculo_id) * Number(vg.km) : 0;
        const totalViagem = Number(vg.valor_pedagio||0) + Number(vg.combustivel_valor||0) + Number(vg.valor_diaria||0) + Number(vg.outros_valor||0) + gastoVeiculo;
        return `<tr><td>${formatarData(vg.data)}</td><td>${vg.local_saida}</td><td>${vg.local_chegada}</td>
        <td>${motoristaNome(vg.motorista_id)}</td><td>${data.clientes.find(c=>c.id===vg.cliente_id)?.nome || 'N/A'}</td><td>${veiculoPlaca(vg.veiculo_id)}</td>
        <td>${vg.km || '-'} km</td><td>R$ ${Number(vg.valor_viagem||0).toFixed(2)}</td><td>R$ ${Number(vg.valor_pedagio||0).toFixed(2)}</td>
        <td>${vg.combustivel_litros ? Number(vg.combustivel_litros).toFixed(1)+'L / ' : ''}R$ ${Number(vg.combustivel_valor||0).toFixed(2)}</td>
        <td>R$ ${Number(vg.valor_diaria||0).toFixed(2)}</td><td>${vg.outros_descricao ? vg.outros_descricao+': R$ '+Number(vg.outros_valor||0).toFixed(2) : '-'}</td>
        <td>R$ ${gastoVeiculo.toFixed(2)}</td>
        <td><strong>R$ ${totalViagem.toFixed(2)}</strong></td>
        <td><span class="badge ${vg.acerto_motorista_pago ? 'badge-pago' : 'badge-pendente'}">${vg.acerto_motorista_pago ? 'Pago' : 'Pendente'}</span></td></tr>`;
    }).join('');
}

function preencherFiltroRotas() {
    const sel = document.getElementById('filtroRotaRelatorio');
    if (sel && data.rotas.length > 0) {
        sel.innerHTML = '<option value="">Todas as Rotas</option>' + data.rotas.map(r =>
            `<option value="${r.id}">${veiculoPlaca(r.veiculo_id)} - ${motoristaNome(r.motorista_id)} (${r.local_saida} → ${r.destino})</option>`).join('');
    }
}

function calcularValorTotal() {
    const litros = parseFloat(document.getElementById('abastecimentoLitros').value) || 0;
    const valorL = parseFloat(document.getElementById('abastecimentoValorL').value) || 0;
    document.getElementById('abastecimentoValorTotal').value = (litros * valorL).toFixed(2);
}

// ==== CARREGAR DADOS ====
async function loadData() {
    const empresaId = currentEmpresa.id;
    const tabelas = ['motoristas','funcionarios','veiculos','clientes','abastecimentos','pneus','oleos',
                      'preventivas','corretivas','multas','bancos','financeiro','rotas','produtos','estoque_movimentacoes',
                      'agenda','turismo_viagens','rotas_fixas','financeiro_categorias','bomba_cargas','contas_pagar','contas_receber'];

    const resultados = await Promise.all(tabelas.map(t => sb.from(t).select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })));
    resultados.forEach((res, i) => {
        if (res.error) { console.error(`Erro ao carregar ${tabelas[i]}:`, res.error); data[tabelas[i]] = []; }
        else { data[tabelas[i]] = res.data; }
    });

    loadMotoristas(); loadFuncionarios(); loadVeiculos(); loadClientes();
    loadAbastecimentos(); loadPneus(); loadOleos(); loadPreventivas(); loadCorretivas(); loadMultas();
    loadBancos(); loadFinanceiro(); loadRotas();
    loadProdutos(); loadMovimentacoes();
    loadContasPagar();
    loadContasReceber();
    loadBomba();
    preencherFiltroClientesTurismo(); filtrarTurismo();
    preencherFiltroRotas(); gerarRelatorioRotas();
    preencherFiltroMotivo();
}

// ==== INICIAR ====
checkAuth();