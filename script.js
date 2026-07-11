
// ==== CONFIGURAÇÃO SUPABASE ====
const SUPABASE_URL = 'https://xzzfkenqdxetkvalnoix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4yK_vp6F3Nb8cZkFuhQt3A_Fhxw6A7h';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 
let currentUser = null;
let currentEmpresa = null;
let chartGastos = null, chartCategorias = null, chartRelatorio = null;
let data = {
    motoristas: [], funcionarios: [], veiculos: [], clientes: [],
    abastecimentos: [], pneus: [], oleos: [], preventivas: [], corretivas: [], multas: [],
    bancos: [], financeiro: [], rotas: [],
    produtos: [], estoque_movimentacoes: [], agenda: [], turismo_viagens: [],
    rotas_fixas: [], financeiro_categorias: [], bomba_cargas: [],
};
 
// ==== AUTENTICAÇÃO ====
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showLoginPage(); return; }
    currentUser = session.user;
 
    const { data: perfil, error } = await sb
        .from('perfis').select('nome, empresa_id, empresas(id, nome, bomba_alerta_minimo)')
        .eq('id', currentUser.id).single();
 
    if (error || !perfil) { showLoginPage(); return; }
 
    currentEmpresa = { id: perfil.empresa_id, nome: perfil.empresas.nome, bomba_alerta_minimo: perfil.empresas.bomba_alerta_minimo };
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('empresaNome').textContent = `(${currentEmpresa.nome})`;
    await loadData();
    updateDashboard();
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
                    <button onclick="login()" style="width:100%; padding:10px; background:#0066cc; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:600; margin-bottom:10px;">Entrar</button>
                    <button onclick="toggleRegister()" style="width:100%; padding:10px; background:#666; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:600;">Criar Conta</button>
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
    else if (page === 'relatorios') setTimeout(gerarRelatorio, 100);
    else if (page === 'agenda') loadAgenda();
}
 
function switchTab(tab) {
    const parent = document.getElementById(tab).parentElement;
    parent.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    if (tab === 'bomba') loadBomba();
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
        ['km_atual','KM Atual'], ['tacografo_validade','Validade Tacógrafo'], ['apolice_validade','Validade Apólice'], ['crlv_ano','Ano CRLV']
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
        ['km_atual','KM Atual'], ['km_proxima','KM Próxima Troca']
    ]},
    oleos: { titulo: 'Oleos', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['data','Data'], ['tipo','Tipo'], ['lugar','Lugar'], ['litragem','Litragem'],
        ['km_atual','KM Atual'], ['km_proxima','KM Próxima Troca'], ['valor','Valor']
    ]},
    preventivas: { titulo: 'Preventivas', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['data','Data'], ['descricao','Descrição'],
        ['km_atual','KM Atual'], ['km_proxima','KM Próxima Troca'], ['valor','Valor']
    ]},
    corretivas: { titulo: 'Corretivas', campos: [
        [item => veiculoPlaca(item.veiculo_id), 'Veículo'], ['data','Data'], ['descricao','Descrição'], ['oficina','Oficina'],
        ['km_atual','KM Atual'], ['valor','Valor']
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
        ['combustivel_valor','Valor Combustível'], ['valor_diaria','Diária Motorista'],
        ['outros_descricao','Outros (descrição)'], ['outros_valor','Outros (valor)'],
        [item => (item.acerto_motorista_pago ? 'Pago' : 'Pendente'), 'Acerto Motorista']
    ]},
    bomba_cargas: { titulo: 'Bomba_Combustivel', campos: [
        ['data','Data'], ['litros','Litros'], ['valor_total','Valor Total'], ['fornecedor','Fornecedor']
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
function veiculoPlaca(id) { return data.veiculos.find(v => v.id === id)?.placa || 'N/A'; }
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
function gastoRotaInstancia(r) {
    const dataRota = new Date(r.data_inicio).toDateString();
    let gasto = 0;
    data.abastecimentos.forEach(a => { if (a.veiculo_id===r.veiculo_id && new Date(a.data).toDateString()===dataRota) gasto += Number(a.valor_total); });
    data.pneus.forEach(p => { if (p.veiculo_id===r.veiculo_id && new Date(p.data).toDateString()===dataRota) gasto += Number(p.valor||0); });
    data.oleos.forEach(o => { if (o.veiculo_id===r.veiculo_id && new Date(o.data).toDateString()===dataRota) gasto += Number(o.valor||0); });
    data.preventivas.forEach(p => { if (p.veiculo_id===r.veiculo_id && new Date(p.data).toDateString()===dataRota) gasto += Number(p.valor||0); });
    data.corretivas.forEach(c => { if (c.veiculo_id===r.veiculo_id && new Date(c.data).toDateString()===dataRota) gasto += Number(c.valor||0); });
    return gasto;
}
function alertErro(error) { alert('Erro: ' + (error?.message || 'algo deu errado. Tente novamente.')); }
 
async function atualizarKmVeiculo(veiculoId, novoKm) {
    if (!veiculoId || !novoKm) return;
    const veiculo = data.veiculos.find(v => v.id === veiculoId);
    if (veiculo && novoKm > Number(veiculo.km_atual || 0)) {
        await sb.from('veiculos').update({ km_atual: novoKm }).eq('id', veiculoId);
    }
}
 
function nivelBomba() {
    const totalCarregado = data.bomba_cargas.reduce((s,c) => s + Number(c.litros), 0);
    const totalDispensado = data.abastecimentos.filter(a => a.fonte === 'bomba').reduce((s,a) => s + Number(a.litros), 0);
    const gastoTotal = data.bomba_cargas.reduce((s,c) => s + Number(c.valor_total), 0);
    return { atual: totalCarregado - totalDispensado, totalCarregado, totalDispensado, gastoTotal };
}
 
// ==== MODAL ====
function openAddModal(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    let html = '';
 
    if (type === 'motorista') {
        modalTitle.textContent = 'Adicionar Motorista';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="motoristaNome"></div>
            <div class="form-row">
                <div class="form-group"><label>CPF</label><input type="text" id="motoristaCPF"></div>
                <div class="form-group"><label>Telefone</label><input type="text" id="motoristaTelefone"></div>
            </div>
            <div class="form-group"><label>Endereço</label><input type="text" id="motoristaEndereco"></div>
            <div class="form-row">
                <div class="form-group"><label>Data de Nascimento</label><input type="date" id="motoristaDataNasc"></div>
                <div class="form-group"><label>Validade da CNH</label><input type="date" id="motoristaCnhValidade"></div>
            </div>
            <div class="form-group"><label>Salário</label><input type="number" id="motoristaSalario" step="0.01"></div>
            <button onclick="addMotorista()">Adicionar</button>
        `;
    } else if (type === 'funcionario') {
        modalTitle.textContent = 'Adicionar Funcionário';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="funcionarioNome"></div>
            <div class="form-row">
                <div class="form-group"><label>Função</label><input type="text" id="funcionarioFuncao" placeholder="Ex: Auxiliar, Mecânico, Administrativo"></div>
                <div class="form-group"><label>Salário</label><input type="number" id="funcionarioSalario" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>CPF</label><input type="text" id="funcionarioCPF"></div>
                <div class="form-group"><label>Telefone</label><input type="text" id="funcionarioTelefone"></div>
            </div>
            <div class="form-group"><label>Endereço</label><input type="text" id="funcionarioEndereco"></div>
            <div class="form-group"><label>Data de Nascimento</label><input type="date" id="funcionarioDataNasc"></div>
            <div class="form-group">
                <label>Status</label>
                <select id="funcionarioStatus" onchange="atualizarCamposFuncionario()">
                    <option value="ativo">Ativo</option><option value="experiencia">Contrato de Experiência</option><option value="demitido">Demitido</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data de Admissão</label><input type="date" id="funcionarioAdmissao"></div>
                <div class="form-group" id="grupoDemissao" style="display:none;"><label>Data de Demissão</label><input type="date" id="funcionarioDemissao"></div>
            </div>
            <div class="form-row" id="grupoExperiencia" style="display:none;">
                <div class="form-group"><label>Início da Experiência</label><input type="date" id="funcionarioExpInicio"></div>
                <div class="form-group"><label>Fim da Experiência</label><input type="date" id="funcionarioExpFim"></div>
            </div>
            <button onclick="addFuncionario()">Adicionar</button>
        `;
    } else if (type === 'veiculo') {
        modalTitle.textContent = 'Adicionar Veículo';
        html = `
            <div class="form-row">
                <div class="form-group"><label>Placa</label><input type="text" id="veiculoPlaca"></div>
                <div class="form-group"><label>Marca</label><input type="text" id="veiculoMarca"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Modelo</label><input type="text" id="veiculoModelo"></div>
                <div class="form-group"><label>Ano</label><input type="number" id="veiculoAno"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Chassi</label><input type="text" id="veiculoChassi"></div>
                <div class="form-group"><label>Renavam</label><input type="text" id="veiculoRenavam"></div>
            </div>
            <div class="form-group"><label>KM Atual</label><input type="number" id="veiculoKmAtual" value="0"></div>
            <p style="font-size:12px; color:#666; margin: 5px 0 10px;">Os campos abaixo são opcionais:</p>
            <div class="form-row">
                <div class="form-group"><label>Validade do Tacógrafo</label><input type="date" id="veiculoTacografoValidade"></div>
                <div class="form-group"><label>Validade da Apólice</label><input type="date" id="veiculoApoliceValidade"></div>
            </div>
            <div class="form-group"><label>Ano do CRLV</label><input type="number" id="veiculoCrlvAno" placeholder="2026"></div>
            <button onclick="addVeiculo()">Adicionar</button>
        `;
    } else if (type === 'cliente') {
        modalTitle.textContent = 'Adicionar Cliente';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="clienteNome"></div>
            <div class="form-row">
                <div class="form-group"><label>CPF/CNPJ</label><input type="text" id="clienteCPF"></div>
                <div class="form-group"><label>Telefone</label><input type="text" id="clienteTelefone"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Rua</label><input type="text" id="clienteRua"></div>
                <div class="form-group"><label>Número</label><input type="text" id="clienteNumero"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Bairro</label><input type="text" id="clienteBairro"></div>
                <div class="form-group"><label>CEP</label><input type="text" id="clienteCep"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Cidade</label><input type="text" id="clienteCidade"></div>
                <div class="form-group"><label>UF</label><input type="text" id="clienteUf" maxlength="2" placeholder="Ex: SP"></div>
            </div>
            <div class="form-group"><label>Data de Nascimento</label><input type="date" id="clienteDataNasc"></div>
            <button onclick="addCliente()">Adicionar</button>
        `;
    } else if (type === 'abastecimento') {
        modalTitle.textContent = 'Adicionar Abastecimento';
        const opts = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="abastecimentoVeiculo">${opts}</select></div>
            <div class="form-group">
                <label>Fonte do Combustível</label>
                <select id="abastecimentoFonte"><option value="posto">Posto Externo</option><option value="bomba">Bomba Própria (nível atual: ${nivelBomba().atual.toFixed(0)} L)</option></select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="abastecimentoData"></div>
                <div class="form-group"><label>KM</label><input type="number" id="abastecimentoKM"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Litros</label><input type="number" id="abastecimentoLitros" step="0.01"></div>
                <div class="form-group"><label>Valor/L</label><input type="number" id="abastecimentoValorL" step="0.01" onchange="calcularValorTotal()"></div>
            </div>
            <div class="form-group"><label>Valor Total</label><input type="number" id="abastecimentoValorTotal" step="0.01" readonly></div>
            <button onclick="addAbastecimento()">Adicionar</button>
        `;
    } else if (type === 'pneu') {
        modalTitle.textContent = 'Adicionar Pneu';
        const opts = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="pneuVeiculo" onchange="autoPreencherKm('pneu')">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="pneuData"></div>
                <div class="form-group"><label>Tipo</label><select id="pneuTipo"><option value="Alinhamento">Alinhamento</option><option value="Troca de Pneus">Troca de Pneus</option><option value="Balanceamento">Balanceamento</option></select></div>
            </div>
            <div class="form-group"><label>Oficina</label><input type="text" id="pneuOficina"></div>
            <div class="form-row">
                <div class="form-group"><label>Quantidade de Pneus</label><input type="number" id="pneuQuantidade" value="1" onchange="calcularValorTotalPneu()"></div>
                <div class="form-group"><label>Valor Unitário</label><input type="number" id="pneuValorUnitario" step="0.01" onchange="calcularValorTotalPneu()"></div>
            </div>
            <div class="form-group"><label>Valor Total</label><input type="number" id="pneuValor" step="0.01" readonly></div>
            <div class="form-row">
                <div class="form-group"><label>KM Atual</label><input type="number" id="pneuKMAtual"></div>
                <div class="form-group"><label>KM Próxima Troca</label><input type="number" id="pneuKMProxima"></div>
            </div>
            <button onclick="addPneu()">Adicionar</button>
        `;
    } else if (type === 'oleo') {
        modalTitle.textContent = 'Adicionar Óleo';
        const opts = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="oleoVeiculo" onchange="autoPreencherKm('oleo')">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="oleoData"></div>
                <div class="form-group"><label>Tipo</label><input type="text" id="oleoTipo" placeholder="Ex: 5W30"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Lugar</label><input type="text" id="oleoLugar" placeholder="Oficina/local"></div>
                <div class="form-group"><label>Litragem</label><input type="number" id="oleoLitragem" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>KM Atual</label><input type="number" id="oleoKMAtual"></div>
                <div class="form-group"><label>KM Próxima Troca</label><input type="number" id="oleoKMProxima"></div>
            </div>
            <div class="form-group"><label>Valor</label><input type="number" id="oleoValor" step="0.01"></div>
            <button onclick="addOleo()">Adicionar</button>
        `;
    } else if (type === 'preventiva') {
        modalTitle.textContent = 'Adicionar Manutenção Preventiva';
        const opts = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="preventivaVeiculo" onchange="autoPreencherKm('preventiva')">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="preventivaData"></div>
                <div class="form-group"><label>Descrição</label><input type="text" id="preventivaDescricao"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>KM Atual</label><input type="number" id="preventivaKMAtual"></div>
                <div class="form-group"><label>KM Próxima Troca</label><input type="number" id="preventivaKMProxima"></div>
            </div>
            <div class="form-group"><label>Valor</label><input type="number" id="preventivaValor" step="0.01"></div>
            <button onclick="addPreventiva()">Adicionar</button>
        `;
    } else if (type === 'corretiva') {
        modalTitle.textContent = 'Adicionar Manutenção Corretiva';
        const opts = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="corretivaVeiculo" onchange="autoPreencherKm('corretiva')">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="corretivaData"></div>
                <div class="form-group"><label>Descrição do Problema</label><input type="text" id="corretivaDescricao"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Oficina</label><input type="text" id="corretivaOficina"></div>
                <div class="form-group"><label>KM Atual</label><input type="number" id="corretivaKMAtual"></div>
            </div>
            <div class="form-group"><label>Valor</label><input type="number" id="corretivaValor" step="0.01"></div>
            <button onclick="addCorretiva()">Adicionar</button>
        `;
    } else if (type === 'cargaBomba') {
        modalTitle.textContent = 'Registrar Carga na Bomba';
        html = `
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="cargaBombaData"></div>
                <div class="form-group"><label>Litros</label><input type="number" id="cargaBombaLitros" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Valor Total</label><input type="number" id="cargaBombaValor" step="0.01"></div>
                <div class="form-group"><label>Fornecedor</label><input type="text" id="cargaBombaFornecedor"></div>
            </div>
            <button onclick="addCargaBomba()">Registrar</button>
        `;
    } else if (type === 'alertaBomba') {
        modalTitle.textContent = 'Configurar Alerta Mínimo da Bomba';
        html = `
            <div class="form-group"><label>Alertar quando o nível estiver abaixo de (litros)</label><input type="number" id="alertaBombaValor" value="${currentEmpresa.bomba_alerta_minimo}"></div>
            <button onclick="salvarAlertaBomba()">Salvar</button>
        `;
    } else if (type === 'multa') {
        modalTitle.textContent = 'Adicionar Multa';
        const opts = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="multaVeiculo">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="multaData"></div>
                <div class="form-group"><label>Descrição</label><input type="text" id="multaDescricao"></div>
            </div>
            <div class="form-group"><label>Valor</label><input type="number" id="multaValor" step="0.01"></div>
            <button onclick="addMulta()">Adicionar</button>
        `;
    } else if (type === 'banco') {
        modalTitle.textContent = 'Adicionar Banco';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="bancoNome"></div>
            <div class="form-row">
                <div class="form-group"><label>Agência</label><input type="text" id="bancoAgencia"></div>
                <div class="form-group"><label>Conta</label><input type="text" id="bancoConta"></div>
            </div>
            <div class="form-group"><label>Saldo</label><input type="number" id="bancoSaldo" step="0.01"></div>
            <button onclick="addBanco()">Adicionar</button>
        `;
    } else if (type === 'financeiro') {
        modalTitle.textContent = 'Adicionar Lançamento Financeiro';
        const opts = data.bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        const catOpts = data.financeiro_categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        html = `
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="financeiroData"></div>
                <div class="form-group"><label>Banco</label><select id="financeiroBanco">${opts}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Tipo</label><select id="financeiroTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
                <div class="form-group"><label>Motivo</label><select id="financeiroMotivo">${catOpts}<option value="__nova__">+ Nova categoria...</option></select></div>
            </div>
            <div class="form-group"><label>Descrição</label><textarea id="financeiroDescricao"></textarea></div>
            <div class="form-group"><label>Valor</label><input type="number" id="financeiroValor" step="0.01"></div>
            <button onclick="addFinanceiro()">Adicionar</button>
        `;
    } else if (type === 'rota') {
        modalTitle.textContent = 'Adicionar Rota';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        const motoristasOptions = data.motoristas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        const rotasFixasOptions = data.rotas_fixas.map(rf => `<option value="${rf.id}">${rf.nome}</option>`).join('');
        html = `
            <div class="form-row">
                <div class="form-group"><label>Veículo</label><select id="rotaVeiculo">${veiculosOptions}</select></div>
                <div class="form-group"><label>Motorista</label><select id="rotaMotorista">${motoristasOptions}</select></div>
            </div>
            <div class="form-group"><label>Rota Fixa (opcional)</label><select id="rotaFixaId"><option value="">Nenhuma / rota avulsa</option>${rotasFixasOptions}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Local Saída</label><input type="text" id="rotaLocalSaida"></div>
                <div class="form-group"><label>Destino</label><input type="text" id="rotaDestino"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data Início</label><input type="date" id="rotaDataInicio"></div>
                <div class="form-group"><label>Data Fim</label><input type="date" id="rotaDataFim"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Hora Início</label><input type="time" id="rotaHoraInicio"></div>
                <div class="form-group"><label>Hora Fim</label><input type="time" id="rotaHoraFim"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>KM Início</label><input type="number" id="rotaKMInicio"></div>
                <div class="form-group"><label>KM Fim</label><input type="number" id="rotaKMFim"></div>
            </div>
            <button onclick="addRota()">Adicionar</button>
        `;
    } else if (type === 'rotaFixa') {
        modalTitle.textContent = 'Nova Rota Fixa';
        html = `
            <div class="form-group"><label>Nome da Rota</label><input type="text" id="rotaFixaNome" placeholder="Ex: Rota Centro-Bairro"></div>
            <div class="form-row">
                <div class="form-group"><label>Local de Saída</label><input type="text" id="rotaFixaSaida"></div>
                <div class="form-group"><label>Local de Chegada</label><input type="text" id="rotaFixaChegada"></div>
            </div>
            <button onclick="addRotaFixa()">Adicionar</button>
        `;
    } else if (type === 'produto') {
        modalTitle.textContent = 'Adicionar Produto';
        html = `
            <div class="form-group"><label>Nome</label><input type="text" id="produtoNome"></div>
            <div class="form-row">
                <div class="form-group"><label>Categoria</label><input type="text" id="produtoCategoria"></div>
                <div class="form-group"><label>Unidade</label><input type="text" id="produtoUnidade" value="un"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Quantidade Inicial</label><input type="number" id="produtoQuantidade" step="0.01" value="0"></div>
                <div class="form-group"><label>Quantidade Mínima (alerta)</label><input type="number" id="produtoQuantidadeMinima" step="0.01" value="0"></div>
            </div>
            <div class="form-group"><label>Valor Unitário</label><input type="number" id="produtoValorUnitario" step="0.01" value="0"></div>
            <button onclick="addProduto()">Adicionar</button>
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
        modalTitle.textContent = 'Adicionar Compromisso';
        html = `
            <div class="form-group"><label>Título</label><input type="text" id="agendaTitulo"></div>
            <div class="form-group"><label>Descrição</label><textarea id="agendaDescricao"></textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="agendaData"></div>
                <div class="form-group"><label>Hora</label><input type="time" id="agendaHora"></div>
            </div>
            <div class="form-group"><label>Categoria</label><input type="text" id="agendaCategoria"></div>
            <button onclick="addAgenda()">Adicionar</button>
        `;
    } else if (type === 'viagem') {
        modalTitle.textContent = 'Adicionar Viagem de Turismo';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        const motoristasOptions = data.motoristas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        const clientesOptions = data.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        html = `
            <div class="form-row">
                <div class="form-group"><label>Local de Saída</label><input type="text" id="viagemLocalSaida"></div>
                <div class="form-group"><label>Local de Chegada</label><input type="text" id="viagemLocalChegada"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Motorista</label><select id="viagemMotorista">${motoristasOptions}</select></div>
                <div class="form-group"><label>Cliente</label><select id="viagemCliente">${clientesOptions}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Veículo</label><select id="viagemVeiculo">${veiculosOptions}</select></div>
                <div class="form-group"><label>KM da Viagem</label><input type="number" id="viagemKM"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Data</label><input type="date" id="viagemData"></div>
                <div class="form-group"><label>Horário</label><input type="time" id="viagemHorario"></div>
            </div>
            <div class="form-group"><label>Valor da Viagem</label><input type="number" id="viagemValor" step="0.01"></div>
            <div class="form-row">
                <div class="form-group"><label>Valor do Pedágio</label><input type="number" id="viagemPedagio" step="0.01"></div>
                <div class="form-group"><label>Valor da Diária do Motorista</label><input type="number" id="viagemDiaria" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Litros de Combustível</label><input type="number" id="viagemCombustivelLitros" step="0.01"></div>
                <div class="form-group"><label>Valor do Combustível</label><input type="number" id="viagemCombustivelValor" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Outros (descrição)</label><input type="text" id="viagemOutrosDescricao" placeholder="Ex: estacionamento"></div>
                <div class="form-group"><label>Outros (valor)</label><input type="number" id="viagemOutrosValor" step="0.01"></div>
            </div>
            <div class="form-group"><label>Acerto do Motorista</label><select id="viagemAcerto"><option value="false">Pendente</option><option value="true">Pago</option></select></div>
            <button onclick="addViagem()">Adicionar</button>
        `;
    } else if (type === 'simularViagem') {
        modalTitle.textContent = '🧮 Simular Viagem';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa} - ${v.marca} ${v.modelo}</option>`).join('');
        html = `
            <div class="form-group"><label>Veículo</label><select id="simVeiculo">${veiculosOptions}</select></div>
            <div class="form-group"><label>KM previstos para a viagem</label><input type="number" id="simKM"></div>
            <button onclick="simularViagem()">Calcular</button>
            <div id="simResultado"></div>
        `;
    }
 
    modalBody.innerHTML = html;
    modal.classList.add('active');
}
 
function closeModal() { document.getElementById('modal').classList.remove('active'); }
 
function atualizarCamposFuncionario() {
    const status = document.getElementById('funcionarioStatus').value;
    document.getElementById('grupoDemissao').style.display = status === 'demitido' ? 'block' : 'none';
    document.getElementById('grupoExperiencia').style.display = status === 'experiencia' ? 'flex' : 'none';
}
 
function autoPreencherKm(prefixo) {
    const veiculoId = document.getElementById(`${prefixo}Veiculo`).value;
    const veiculo = data.veiculos.find(v => v.id === veiculoId);
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
    const veiculo = data.veiculos.find(v => v.id === veiculoId);
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
 
// ==== ADICIONAR ITENS ====
async function addMotorista() {
    const nome = document.getElementById('motoristaNome').value;
    const cpf = document.getElementById('motoristaCPF').value;
    const telefone = document.getElementById('motoristaTelefone').value;
    const endereco = document.getElementById('motoristaEndereco').value;
    const data_nascimento = document.getElementById('motoristaDataNasc').value;
    const cnh_validade = document.getElementById('motoristaCnhValidade').value || null;
    const salario = parseFloat(document.getElementById('motoristaSalario').value) || null;
    if (!nome || !cpf || !telefone || !endereco || !data_nascimento) { alert('Preencha todos os campos obrigatórios'); return; }
    const { error } = await sb.from('motoristas').insert({ empresa_id: currentEmpresa.id, nome, cpf, telefone, endereco, data_nascimento, cnh_validade, salario });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}
 
async function addFuncionario() {
    const nome = document.getElementById('funcionarioNome').value;
    const funcao = document.getElementById('funcionarioFuncao').value;
    const salario = parseFloat(document.getElementById('funcionarioSalario').value) || null;
    const cpf = document.getElementById('funcionarioCPF').value;
    const telefone = document.getElementById('funcionarioTelefone').value;
    const endereco = document.getElementById('funcionarioEndereco').value;
    const data_nascimento = document.getElementById('funcionarioDataNasc').value;
    const status = document.getElementById('funcionarioStatus').value;
    const data_admissao = document.getElementById('funcionarioAdmissao').value || null;
    const data_demissao = document.getElementById('funcionarioDemissao')?.value || null;
    const experiencia_inicio = document.getElementById('funcionarioExpInicio')?.value || null;
    const experiencia_fim = document.getElementById('funcionarioExpFim')?.value || null;
    if (!nome || !cpf || !telefone || !endereco || !data_nascimento) { alert('Preencha todos os campos obrigatórios'); return; }
    const { error } = await sb.from('funcionarios').insert({ empresa_id: currentEmpresa.id, nome, funcao, salario, cpf, telefone, endereco, data_nascimento, status, data_admissao, data_demissao, experiencia_inicio, experiencia_fim });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}
 
async function addVeiculo() {
    const placa = document.getElementById('veiculoPlaca').value;
    const marca = document.getElementById('veiculoMarca').value;
    const modelo = document.getElementById('veiculoModelo').value;
    const ano = document.getElementById('veiculoAno').value;
    const chassi = document.getElementById('veiculoChassi').value;
    const renavam = document.getElementById('veiculoRenavam').value;
    const km_atual = parseFloat(document.getElementById('veiculoKmAtual').value) || 0;
    const tacografo_validade = document.getElementById('veiculoTacografoValidade').value || null;
    const apolice_validade = document.getElementById('veiculoApoliceValidade').value || null;
    const crlv_ano = document.getElementById('veiculoCrlvAno').value || null;
    if (!placa || !marca || !modelo || !ano) { alert('Preencha placa, marca, modelo e ano'); return; }
    const { error } = await sb.from('veiculos').insert({
        empresa_id: currentEmpresa.id, placa, marca, modelo, ano: parseInt(ano), chassi, renavam, km_atual,
        tacografo_validade, apolice_validade, crlv_ano: crlv_ano ? parseInt(crlv_ano) : null
    });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}
 
async function addCliente() {
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
    const { error } = await sb.from('clientes').insert({ empresa_id: currentEmpresa.id, nome, cpf_cnpj, telefone, rua, numero, bairro, cidade, uf, cep, data_nascimento });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}
 
async function addAbastecimento() {
    const veiculo_id = document.getElementById('abastecimentoVeiculo').value;
    const fonte = document.getElementById('abastecimentoFonte').value;
    const data_abast = document.getElementById('abastecimentoData').value;
    const km = parseFloat(document.getElementById('abastecimentoKM').value);
    const litros = parseFloat(document.getElementById('abastecimentoLitros').value);
    const valor_litro = parseFloat(document.getElementById('abastecimentoValorL').value);
    const valor_total = parseFloat(document.getElementById('abastecimentoValorTotal').value);
    if (!veiculo_id || !data_abast || !km || !litros || !valor_litro) { alert('Preencha todos os campos'); return; }
 
    if (fonte === 'bomba') {
        const nivel = nivelBomba();
        if (litros > nivel.atual) {
            if (!confirm(`A bomba só tem ${nivel.atual.toFixed(0)} L disponíveis. Isso vai deixar o nível negativo. Continuar mesmo assim?`)) return;
        }
    }
 
    const anteriores = data.abastecimentos.filter(a => a.veiculo_id === veiculo_id).sort((a,b) => new Date(b.data) - new Date(a.data));
    let kml = 0;
    if (anteriores.length > 0) { const diff = km - anteriores[0].km; kml = diff > 0 ? diff / litros : 0; }
    const { error } = await sb.from('abastecimentos').insert({ empresa_id: currentEmpresa.id, veiculo_id, fonte, data: data_abast, km, litros, valor_litro, valor_total, kml });
    if (error) { alertErro(error); return; }
    await atualizarKmVeiculo(veiculo_id, km);
    closeModal(); await loadData(); updateDashboard();
}
 
async function addPneu() {
    const veiculo_id = document.getElementById('pneuVeiculo').value;
    const data_pneu = document.getElementById('pneuData').value;
    const tipo = document.getElementById('pneuTipo').value;
    const oficina = document.getElementById('pneuOficina').value;
    const quantidade = parseInt(document.getElementById('pneuQuantidade').value) || 1;
    const valor_unitario = parseFloat(document.getElementById('pneuValorUnitario').value) || 0;
    const valor = parseFloat(document.getElementById('pneuValor').value) || 0;
    const km_atual = parseFloat(document.getElementById('pneuKMAtual').value);
    const km_proxima = parseFloat(document.getElementById('pneuKMProxima').value);
    if (!veiculo_id || !data_pneu || !km_atual) { alert('Preencha ao menos veículo, data e KM atual'); return; }
    const { error } = await sb.from('pneus').insert({ empresa_id: currentEmpresa.id, veiculo_id, data: data_pneu, tipo, oficina, quantidade, valor_unitario, valor, km_atual, km_proxima });
    if (error) { alertErro(error); return; }
    await atualizarKmVeiculo(veiculo_id, km_atual);
    closeModal(); await loadData(); updateDashboard();
}
 
async function addOleo() {
    const veiculo_id = document.getElementById('oleoVeiculo').value;
    const data_oleo = document.getElementById('oleoData').value;
    const tipo = document.getElementById('oleoTipo').value;
    const lugar = document.getElementById('oleoLugar').value;
    const litragem = parseFloat(document.getElementById('oleoLitragem').value) || null;
    const km_atual = parseFloat(document.getElementById('oleoKMAtual').value);
    const valor = parseFloat(document.getElementById('oleoValor').value);
    const km_proxima = parseFloat(document.getElementById('oleoKMProxima').value);
    if (!veiculo_id || !data_oleo || !tipo || !km_atual || !valor || !km_proxima) { alert('Preencha todos os campos obrigatórios'); return; }
    const { error } = await sb.from('oleos').insert({ empresa_id: currentEmpresa.id, veiculo_id, data: data_oleo, tipo, lugar, litragem, km_atual, valor, km_proxima });
    if (error) { alertErro(error); return; }
    await atualizarKmVeiculo(veiculo_id, km_atual);
    closeModal(); await loadData(); updateDashboard();
}
 
async function addPreventiva() {
    const veiculo_id = document.getElementById('preventivaVeiculo').value;
    const data_prev = document.getElementById('preventivaData').value;
    const descricao = document.getElementById('preventivaDescricao').value;
    const km_atual = parseFloat(document.getElementById('preventivaKMAtual').value);
    const km_proxima = parseFloat(document.getElementById('preventivaKMProxima').value);
    const valor = parseFloat(document.getElementById('preventivaValor').value);
    if (!veiculo_id || !data_prev || !descricao || !km_atual || !km_proxima || !valor) { alert('Preencha todos os campos'); return; }
    const { error } = await sb.from('preventivas').insert({ empresa_id: currentEmpresa.id, veiculo_id, data: data_prev, descricao, km_atual, km_proxima, valor });
    if (error) { alertErro(error); return; }
    await atualizarKmVeiculo(veiculo_id, km_atual);
    closeModal(); await loadData(); updateDashboard();
}
 
async function addCorretiva() {
    const veiculo_id = document.getElementById('corretivaVeiculo').value;
    const data_cor = document.getElementById('corretivaData').value;
    const descricao = document.getElementById('corretivaDescricao').value;
    const oficina = document.getElementById('corretivaOficina').value;
    const km_atual = parseFloat(document.getElementById('corretivaKMAtual').value) || null;
    const valor = parseFloat(document.getElementById('corretivaValor').value);
    if (!veiculo_id || !data_cor || !descricao || !valor) { alert('Preencha veículo, data, descrição e valor'); return; }
    const { error } = await sb.from('corretivas').insert({ empresa_id: currentEmpresa.id, veiculo_id, data: data_cor, descricao, oficina, km_atual, valor });
    if (error) { alertErro(error); return; }
    if (km_atual) await atualizarKmVeiculo(veiculo_id, km_atual);
    closeModal(); await loadData(); updateDashboard();
}
 
async function addCargaBomba() {
    const data_carga = document.getElementById('cargaBombaData').value;
    const litros = parseFloat(document.getElementById('cargaBombaLitros').value);
    const valor_total = parseFloat(document.getElementById('cargaBombaValor').value);
    const fornecedor = document.getElementById('cargaBombaFornecedor').value;
    if (!data_carga || !litros || !valor_total) { alert('Preencha data, litros e valor total'); return; }
    const { error } = await sb.from('bomba_cargas').insert({ empresa_id: currentEmpresa.id, data: data_carga, litros, valor_total, fornecedor });
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
 
async function addMulta() {
    const veiculo_id = document.getElementById('multaVeiculo').value;
    const data_multa = document.getElementById('multaData').value;
    const descricao = document.getElementById('multaDescricao').value;
    const valor = parseFloat(document.getElementById('multaValor').value);
    if (!veiculo_id || !data_multa || !descricao || !valor) { alert('Preencha todos os campos'); return; }
    const { error } = await sb.from('multas').insert({ empresa_id: currentEmpresa.id, veiculo_id, data: data_multa, descricao, valor });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}
 
async function addBanco() {
    const nome = document.getElementById('bancoNome').value;
    const agencia = document.getElementById('bancoAgencia').value;
    const conta = document.getElementById('bancoConta').value;
    const saldo = parseFloat(document.getElementById('bancoSaldo').value);
    if (!nome || !agencia || !conta || !saldo) { alert('Preencha todos os campos'); return; }
    const { error } = await sb.from('bancos').insert({ empresa_id: currentEmpresa.id, nome, agencia, conta, saldo });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); updateDashboard();
}
 
async function addFinanceiro() {
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
    const { error } = await sb.from('financeiro').insert({ empresa_id: currentEmpresa.id, banco_id, data: data_fin, tipo, motivo, descricao, valor });
    if (error) { alertErro(error); return; }
 
    const banco = data.bancos.find(b => b.id === banco_id);
    if (banco) {
        const novoSaldo = tipo === 'entrada' ? banco.saldo + valor : banco.saldo - valor;
        await sb.from('bancos').update({ saldo: novoSaldo }).eq('id', banco_id);
    }
    closeModal(); await loadData(); updateDashboard();
}
 
async function addRota() {
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
    const { error } = await sb.from('rotas').insert({ empresa_id: currentEmpresa.id, veiculo_id, motorista_id, rota_fixa_id, local_saida, destino, data_inicio, data_fim, hora_inicio, hora_fim, km_inicio, km_fim });
    if (error) { alertErro(error); return; }
    await atualizarKmVeiculo(veiculo_id, km_fim);
    closeModal(); await loadData(); updateDashboard();
}
 
async function addRotaFixa() {
    const nome = document.getElementById('rotaFixaNome').value;
    const local_saida = document.getElementById('rotaFixaSaida').value;
    const local_chegada = document.getElementById('rotaFixaChegada').value;
    if (!nome) { alert('Informe o nome da rota fixa'); return; }
    const { error } = await sb.from('rotas_fixas').insert({ empresa_id: currentEmpresa.id, nome, local_saida, local_chegada });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData();
}
 
async function addProduto() {
    const nome = document.getElementById('produtoNome').value;
    const categoria = document.getElementById('produtoCategoria').value;
    const unidade = document.getElementById('produtoUnidade').value || 'un';
    const quantidade = parseFloat(document.getElementById('produtoQuantidade').value) || 0;
    const quantidade_minima = parseFloat(document.getElementById('produtoQuantidadeMinima').value) || 0;
    const valor_unitario = parseFloat(document.getElementById('produtoValorUnitario').value) || 0;
    if (!nome) { alert('Informe o nome do produto'); return; }
    const { error } = await sb.from('produtos').insert({ empresa_id: currentEmpresa.id, nome, categoria, unidade, quantidade, quantidade_minima, valor_unitario });
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
    const titulo = document.getElementById('agendaTitulo').value;
    const descricao = document.getElementById('agendaDescricao').value;
    const data_evento = document.getElementById('agendaData').value;
    const hora = document.getElementById('agendaHora').value || null;
    const categoria = document.getElementById('agendaCategoria').value;
    if (!titulo || !data_evento) { alert('Preencha ao menos título e data'); return; }
    const { error } = await sb.from('agenda').insert({ empresa_id: currentEmpresa.id, titulo, descricao, data: data_evento, hora, categoria });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); loadAgenda();
}
 
async function addViagem() {
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
    const combustivel_litros = parseFloat(document.getElementById('viagemCombustivelLitros').value) || 0;
    const combustivel_valor = parseFloat(document.getElementById('viagemCombustivelValor').value) || 0;
    const outros_descricao = document.getElementById('viagemOutrosDescricao').value;
    const outros_valor = parseFloat(document.getElementById('viagemOutrosValor').value) || 0;
    const acerto_motorista_pago = document.getElementById('viagemAcerto').value === 'true';
 
    if (!local_saida || !local_chegada || !data_viagem) { alert('Preencha ao menos saída, chegada e data'); return; }
 
    const { error } = await sb.from('turismo_viagens').insert({
        empresa_id: currentEmpresa.id, local_saida, local_chegada, motorista_id, cliente_id, veiculo_id,
        km, data: data_viagem, horario, valor_viagem, valor_pedagio, valor_diaria,
        combustivel_litros, combustivel_valor, outros_descricao, outros_valor,
        valor_motorista: valor_diaria, acerto_motorista_pago,
        acerto_data: acerto_motorista_pago ? new Date().toISOString().slice(0,10) : null
    });
    if (error) { alertErro(error); return; }
    closeModal(); await loadData(); filtrarTurismo();
}
 
// ==== RENDERIZAÇÃO ====
function loadMotoristas() {
    document.getElementById('motoristasTable').innerHTML = data.motoristas.map(m => `
        <tr><td>${m.nome}</td><td>${m.cpf}</td><td>${m.telefone}</td><td>${m.endereco}</td>
        <td>${m.data_nascimento ? new Date(m.data_nascimento).toLocaleDateString('pt-BR') : ''}</td>
        <td>${m.cnh_validade ? new Date(m.cnh_validade).toLocaleDateString('pt-BR') : '-'}</td>
        <td>${m.salario ? 'R$ ' + Number(m.salario).toFixed(2) : '-'}</td>
        <td><button class="btn-small" onclick="deleteItem('motoristas', '${m.id}')">Deletar</button></td></tr>`).join('');
 
    document.getElementById('funcMotoristasTable').innerHTML = data.motoristas.map(m => `
        <tr><td>${m.nome}</td><td>${m.cpf}</td><td>${m.telefone}</td>
        <td>${m.salario ? 'R$ ' + Number(m.salario).toFixed(2) : '-'}</td>
        <td>${m.cnh_validade ? new Date(m.cnh_validade).toLocaleDateString('pt-BR') : '-'}</td></tr>`).join('');
}
 
function loadFuncionarios() {
    const linha = (f, cols) => `<tr><td>${f.nome}</td><td>${f.funcao||'-'}</td>${cols}<td><button class="btn-small" onclick="deleteItem('funcionarios', '${f.id}')">Deletar</button></td></tr>`;
    document.getElementById('funcAtivosTable').innerHTML = data.funcionarios.filter(f => f.status === 'ativo').map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.telefone}</td><td>${f.data_admissao ? new Date(f.data_admissao).toLocaleDateString('pt-BR') : '-'}</td><td>${f.salario ? 'R$ ' + Number(f.salario).toFixed(2) : '-'}</td>`)).join('');
    document.getElementById('funcDemitidosTable').innerHTML = data.funcionarios.filter(f => f.status === 'demitido').map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.data_admissao ? new Date(f.data_admissao).toLocaleDateString('pt-BR') : '-'}</td><td>${f.data_demissao ? new Date(f.data_demissao).toLocaleDateString('pt-BR') : '-'}</td>`)).join('');
    document.getElementById('funcExperienciaTable').innerHTML = data.funcionarios.filter(f => f.status === 'experiencia').map(f =>
        linha(f, `<td>${f.cpf}</td><td>${f.experiencia_inicio ? new Date(f.experiencia_inicio).toLocaleDateString('pt-BR') : '-'}</td><td>${f.experiencia_fim ? new Date(f.experiencia_fim).toLocaleDateString('pt-BR') : '-'}</td>`)).join('');
}
 
function loadVeiculos() {
    document.getElementById('veiculosTable').innerHTML = data.veiculos.map(v => `
        <tr><td>${v.placa}</td><td>${v.marca}</td><td>${v.modelo}</td><td>${v.ano}</td><td>${v.chassi||'-'}</td><td>${v.renavam||'-'}</td>
        <td>${Number(v.km_atual||0).toLocaleString('pt-BR')} km</td>
        <td>${v.tacografo_validade ? new Date(v.tacografo_validade).toLocaleDateString('pt-BR') : '-'}</td>
        <td>${v.apolice_validade ? new Date(v.apolice_validade).toLocaleDateString('pt-BR') : '-'}</td>
        <td>${v.crlv_ano || '-'}</td>
        <td><button class="btn-small" onclick="deleteItem('veiculos', '${v.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadClientes() {
    document.getElementById('clientesTable').innerHTML = data.clientes.map(c => `
        <tr><td>${c.nome}</td><td>${c.cpf_cnpj}</td><td>${c.telefone}</td>
        <td>${c.rua||''}${c.numero ? ', '+c.numero : ''}${c.bairro ? ' - '+c.bairro : ''}</td>
        <td>${c.cidade||''}${c.uf ? '/'+c.uf : ''}</td><td>${c.cep||'-'}</td>
        <td>${c.data_nascimento ? new Date(c.data_nascimento).toLocaleDateString('pt-BR') : ''}</td>
        <td><button class="btn-small" onclick="deleteItem('clientes', '${c.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadAbastecimentos() {
    document.getElementById('abastecimentosTable').innerHTML = data.abastecimentos.map(a => `
        <tr><td>${veiculoPlaca(a.veiculo_id)}</td><td>${a.fonte === 'bomba' ? '🛢️ Bomba' : '⛽ Posto'}</td><td>${new Date(a.data).toLocaleDateString('pt-BR')}</td>
        <td>${a.km}</td><td>${Number(a.litros).toFixed(2)}</td><td>R$ ${Number(a.valor_litro).toFixed(2)}</td>
        <td>R$ ${Number(a.valor_total).toFixed(2)}</td><td>${Number(a.kml).toFixed(2)} km/l</td>
        <td><button class="btn-small" onclick="deleteItem('abastecimentos', '${a.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadPneus() {
    document.getElementById('neusTable').innerHTML = data.pneus.map(p => `
        <tr><td>${veiculoPlaca(p.veiculo_id)}</td><td>${new Date(p.data).toLocaleDateString('pt-BR')}</td>
        <td>${p.tipo||'-'}</td><td>${p.oficina||'-'}</td><td>${p.quantidade||1}</td>
        <td>R$ ${Number(p.valor_unitario||0).toFixed(2)}</td><td>R$ ${Number(p.valor||0).toFixed(2)}</td>
        <td>${p.km_atual} km</td><td>${p.km_proxima||'-'} km</td>
        <td><button class="btn-small" onclick="deleteItem('pneus', '${p.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadOleos() {
    document.getElementById('oleosTable').innerHTML = data.oleos.map(o => {
        const kmFaltando = o.km_proxima - (o.km_atual || 0);
        const cls = kmFaltando <= 5000 ? 'style="background:#fff3cd;"' : '';
        return `<tr ${cls}><td>${veiculoPlaca(o.veiculo_id)}</td><td>${new Date(o.data).toLocaleDateString('pt-BR')}</td>
        <td>${o.tipo}</td><td>${o.lugar||'-'}</td><td>${o.litragem||'-'}</td>
        <td>${o.km_atual} km</td><td>${o.km_proxima} km</td>
        <td>R$ ${Number(o.valor).toFixed(2)}</td><td><button class="btn-small" onclick="deleteItem('oleos', '${o.id}')">Deletar</button></td></tr>`;
    }).join('');
}
 
function loadPreventivas() {
    document.getElementById('preventivaTable').innerHTML = data.preventivas.map(p => {
        const kmFaltando = p.km_proxima - (p.km_atual || 0);
        const cls = kmFaltando <= 5000 ? 'style="background:#fff3cd;"' : '';
        return `<tr ${cls}><td>${veiculoPlaca(p.veiculo_id)}</td><td>${new Date(p.data).toLocaleDateString('pt-BR')}</td>
        <td>${p.descricao}</td><td>${p.km_atual} km</td><td>${p.km_proxima} km</td><td>${kmFaltando} km</td>
        <td>R$ ${Number(p.valor).toFixed(2)}</td><td><button class="btn-small" onclick="deleteItem('preventivas', '${p.id}')">Deletar</button></td></tr>`;
    }).join('');
}
 
function loadCorretivas() {
    document.getElementById('corretivaTable').innerHTML = data.corretivas.map(c => `
        <tr><td>${veiculoPlaca(c.veiculo_id)}</td><td>${new Date(c.data).toLocaleDateString('pt-BR')}</td>
        <td>${c.descricao}</td><td>${c.oficina||'-'}</td><td>${c.km_atual||'-'}</td>
        <td>R$ ${Number(c.valor).toFixed(2)}</td><td><button class="btn-small" onclick="deleteItem('corretivas', '${c.id}')">Deletar</button></td></tr>`).join('');
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
        <tr><td>${new Date(c.data).toLocaleDateString('pt-BR')}</td><td>${Number(c.litros).toFixed(0)} L</td>
        <td>R$ ${Number(c.valor_total).toFixed(2)}</td><td>${c.fornecedor||'-'}</td>
        <td><button class="btn-small" onclick="deleteItem('bomba_cargas', '${c.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadMultas() {
    document.getElementById('multasTable').innerHTML = data.multas.map(m => `
        <tr><td>${veiculoPlaca(m.veiculo_id)}</td><td>${new Date(m.data).toLocaleDateString('pt-BR')}</td>
        <td>${m.descricao}</td><td>R$ ${Number(m.valor).toFixed(2)}</td>
        <td><button class="btn-small" onclick="deleteItem('multas', '${m.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadBancos() {
    document.getElementById('bancosTable').innerHTML = data.bancos.map(b => `
        <tr><td>${b.nome}</td><td>${b.agencia}</td><td>${b.conta}</td><td>R$ ${Number(b.saldo).toFixed(2)}</td>
        <td><button class="btn-small" onclick="deleteItem('bancos', '${b.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadFinanceiro() {
    document.getElementById('financeiroTable').innerHTML = data.financeiro.map(f => `
        <tr><td>${new Date(f.data).toLocaleDateString('pt-BR')}</td><td>${data.bancos.find(b=>b.id===f.banco_id)?.nome || 'N/A'}</td>
        <td>${f.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td><td>${f.motivo}</td><td>${f.descricao||''}</td>
        <td>R$ ${Number(f.valor).toFixed(2)}</td><td><button class="btn-small" onclick="deleteItem('financeiro', '${f.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadRotas() {
    document.getElementById('rotasTable').innerHTML = data.rotas.map(r => `
        <tr><td>${veiculoPlaca(r.veiculo_id)}</td><td>${motoristaNome(r.motorista_id)}</td>
        <td>${r.local_saida}</td><td>${r.destino}</td>
        <td>${data.rotas_fixas.find(rf=>rf.id===r.rota_fixa_id)?.nome || '-'}</td>
        <td>${r.data_inicio ? new Date(r.data_inicio).toLocaleDateString('pt-BR') : ''}</td>
        <td>${r.data_fim ? new Date(r.data_fim).toLocaleDateString('pt-BR') : ''}</td>
        <td>${kmPercorrido(r)} km</td><td>${tempoTotal(r)}</td>
        <td><button class="btn-small" onclick="deleteItem('rotas', '${r.id}')">Deletar</button></td></tr>`).join('');
}
 
function loadProdutos() {
    document.getElementById('produtosTable').innerHTML = data.produtos.map(p => {
        const baixo = Number(p.quantidade) <= Number(p.quantidade_minima);
        return `<tr class="${baixo ? 'estoque-baixo' : ''}">
            <td>${p.nome}</td><td>${p.categoria || '-'}</td><td>${p.quantidade}${baixo ? ' ⚠️' : ''}</td>
            <td>${p.quantidade_minima}</td><td>${p.unidade}</td><td>R$ ${Number(p.valor_unitario).toFixed(2)}</td>
            <td><button class="btn-small" onclick="deleteItem('produtos', '${p.id}')">Deletar</button></td></tr>`;
    }).join('');
}
 
function loadMovimentacoes() {
    document.getElementById('movimentacoesTable').innerHTML = data.estoque_movimentacoes.map(m => {
        const produto = data.produtos.find(p => p.id === m.produto_id);
        return `<tr><td>${produto ? produto.nome : 'N/A'}</td><td>${m.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td>
        <td>${m.quantidade}</td><td>${m.motivo || ''}</td><td>${new Date(m.data).toLocaleDateString('pt-BR')}</td>
        <td><button class="btn-small" onclick="deleteItem('estoque_movimentacoes', '${m.id}')">Deletar</button></td></tr>`;
    }).join('');
}
 
function loadAgenda() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const ordenados = [...data.agenda].sort((a,b) => new Date(a.data + 'T' + (a.hora||'00:00')) - new Date(b.data + 'T' + (b.hora||'00:00')));
    document.getElementById('agendaContent').innerHTML = ordenados.map(a => {
        const dataEvento = new Date(a.data);
        const isPast = dataEvento < hoje;
        return `<div class="birthday-item ${!isPast && dataEvento.toDateString() === hoje.toDateString() ? 'today' : ''}" style="${isPast ? 'opacity:0.5;' : ''}">
            <div class="birthday-info"><h4>${a.titulo} ${a.categoria ? `<span style="font-size:11px; color:#666;">(${a.categoria})</span>` : ''}</h4>
            <p>${dataEvento.toLocaleDateString('pt-BR')} ${a.hora ? 'às ' + a.hora.slice(0,5) : ''} ${a.descricao ? '• ' + a.descricao : ''}</p></div>
            <button class="btn-small" onclick="deleteItem('agenda', '${a.id}')">Deletar</button></div>`;
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
    if (dataInicio) filtrado = filtrado.filter(v => new Date(v.data) >= new Date(dataInicio));
    if (dataFim) filtrado = filtrado.filter(v => new Date(v.data) <= new Date(dataFim));
    if (clienteId) filtrado = filtrado.filter(v => v.cliente_id === clienteId);
    document.getElementById('turismoTable').innerHTML = filtrado.map(v => `
        <tr><td>${new Date(v.data).toLocaleDateString('pt-BR')}</td><td>${v.local_saida}</td><td>${v.local_chegada}</td>
        <td>${motoristaNome(v.motorista_id)}</td><td>${data.clientes.find(c=>c.id===v.cliente_id)?.nome || 'N/A'}</td>
        <td>${veiculoPlaca(v.veiculo_id)}</td><td>R$ ${Number(v.valor_viagem).toFixed(2)}</td>
        <td>R$ ${Number(v.valor_pedagio||0).toFixed(2)}</td>
        <td>${v.combustivel_litros ? Number(v.combustivel_litros).toFixed(1)+'L / ' : ''}R$ ${Number(v.combustivel_valor||0).toFixed(2)}</td>
        <td>R$ ${Number(v.valor_diaria||0).toFixed(2)}</td>
        <td>${v.outros_descricao ? v.outros_descricao+': R$ '+Number(v.outros_valor||0).toFixed(2) : '-'}</td>
        <td><span class="badge ${v.acerto_motorista_pago ? 'badge-pago' : 'badge-pendente'}">${v.acerto_motorista_pago ? 'Pago' : 'Pendente'}</span></td>
        <td><button class="btn-small" onclick="deleteItem('turismo_viagens', '${v.id}')">Deletar</button></td></tr>`).join('');
}
 
function limparFiltrosTurismo() {
    document.getElementById('filtroTurismoDataInicio').value = '';
    document.getElementById('filtroTurismoDataFim').value = '';
    document.getElementById('filtroTurismoCliente').value = '';
    filtrarTurismo();
}
 
function loadDesempenho() {
    let htmlVeiculos = '<h3>🚗 Desempenho dos Veículos</h3>';
    htmlVeiculos += data.veiculos.map(v => {
        const rotasVeiculo = data.rotas.filter(r => r.veiculo_id === v.id);
        const kmTotal = rotasVeiculo.reduce((s, r) => s + kmPercorrido(r), 0);
        const custoKm = custoPorKmVeiculo(v.id);
        const gastos = custoKm * kmTotal;
        return `<div class="performance-card">
            <h4>🚗 ${v.placa} - ${v.marca} ${v.modelo} (${v.ano})</h4>
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
        data.veiculos.map(v => {
            const rotasVeiculo = data.rotas.filter(r => r.veiculo_id === v.id);
            const motoristasIds = [...new Set(rotasVeiculo.map(r => r.motorista_id))];
            const linhasMotoristas = motoristasIds.map(mid => {
                const rotasDoMotorista = rotasVeiculo.filter(r => r.motorista_id === mid);
                const kmTotalM = rotasDoMotorista.reduce((s,r) => s + kmPercorrido(r), 0);
                const kmMedioRota = rotasDoMotorista.length > 0 ? (kmTotalM / rotasDoMotorista.length).toFixed(1) : 0;
                return `<tr><td>${motoristaNome(mid)}</td><td>${rotasDoMotorista.length}</td><td>${kmTotalM} km</td><td>${kmMedioRota} km/rota</td></tr>`;
            }).join('') || '<tr><td colspan="4" style="color:#666;">Nenhuma rota registrada com esse veículo ainda.</td></tr>';
            return `<div class="performance-card clickable-card" onclick="toggleSubList('sub_${v.id}')">
                <h4>🚗 ${v.placa} - ${v.marca} ${v.modelo}</h4>
                <p style="font-size:12px; color:#666;">${motoristasIds.length} motorista(s) já dirigiram este veículo — clique para ver</p>
                <div id="sub_${v.id}" class="sub-list"><table><thead><tr><th>Motorista</th><th>Rotas</th><th>KM Total</th><th>KM Médio/Rota</th></tr></thead>
                <tbody>${linhasMotoristas}</tbody></table></div>
            </div>`;
        }).join('');
 
    document.getElementById('desempenhoRotaFixa').innerHTML = '<h3>📌 Desempenho das Rotas Fixas</h3>' +
        (data.rotas_fixas.map(rf => {
            const instancias = data.rotas.filter(r => r.rota_fixa_id === rf.id);
            const kmTotal = instancias.reduce((s,r) => s + kmPercorrido(r), 0);
            const gastoTotal = instancias.reduce((s,r) => s + gastoRotaInstancia(r), 0);
            const custoPorKm = kmTotal > 0 ? (gastoTotal / kmTotal).toFixed(2) : 0;
            return `<div class="performance-card">
                <h4>📌 ${rf.nome}</h4>
                <p style="font-size:12px; color:#666;">${rf.local_saida || ''} → ${rf.local_chegada || ''}</p>
                <div class="performance-stats">
                    <div class="stat"><div class="stat-value">${instancias.length}</div><div class="stat-label">Vezes Realizada</div></div>
                    <div class="stat"><div class="stat-value">${kmTotal}</div><div class="stat-label">KM Total</div></div>
                    <div class="stat"><div class="stat-value">R$ ${gastoTotal.toFixed(2)}</div><div class="stat-label">Gasto Total</div></div>
                    <div class="stat"><div class="stat-value">R$ ${custoPorKm}</div><div class="stat-label">Custo/KM</div></div>
                </div></div>`;
        }).join('') || '<p style="color:#666;">Nenhuma rota fixa cadastrada. Vá em Rotas → "Nova Rota Fixa" para criar.</p>');
}
 
function toggleSubList(id) { document.getElementById(id).classList.toggle('open'); }
 
function loadAniversarios() {
    const hoje = new Date();
    const pessoas = [
        ...data.motoristas.map(m => ({ ...m, tipo: 'Motorista' })),
        ...data.funcionarios.map(f => ({ ...f, tipo: 'Funcionário' })),
        ...data.clientes.map(c => ({ ...c, tipo: 'Cliente' }))
    ];
    const aniversarios = pessoas.filter(p => p.data_nascimento).map(p => {
        const dataNasc = new Date(p.data_nascimento);
        const aniversarioEsteAno = new Date(hoje.getFullYear(), dataNasc.getMonth(), dataNasc.getDate());
        if (aniversarioEsteAno < hoje) aniversarioEsteAno.setFullYear(hoje.getFullYear() + 1);
        const diasFaltando = Math.ceil((aniversarioEsteAno - hoje) / (1000*60*60*24));
        const idade = hoje.getFullYear() - dataNasc.getFullYear();
        return { ...p, diasFaltando, idade };
    }).sort((a,b) => a.diasFaltando - b.diasFaltando);
    document.getElementById('aniversariosContent').innerHTML = aniversarios.map(p => `
        <div class="birthday-item ${p.diasFaltando === 0 ? 'today' : ''}">
            <div class="birthday-info"><h4>${p.nome}</h4><p>${p.tipo} • ${new Date(p.data_nascimento).toLocaleDateString('pt-BR')} • Em ${p.diasFaltando} dias</p></div>
            <div class="birthday-age">${p.idade} anos</div></div>`).join('');
}
 
async function deleteItem(type, id) {
    if (!confirm('Tem certeza que deseja deletar?')) return;
    const { error } = await sb.from(type).delete().eq('id', id);
    if (error) { alertErro(error); return; }
    await loadData();
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
    document.getElementById('nivelBombaDash').textContent = nivelBomba().atual.toFixed(0);
    document.getElementById('totalGasto').textContent = 'R$ ' + calcularTotalGasto().toFixed(2);
    carregarTopGastos();
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
        <div class="gasto-item"><div class="gasto-info"><h4>${g.descricao}</h4><p>${new Date(g.data).toLocaleDateString('pt-BR')} • ${g.tipo}</p></div>
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
        <tr><td>${new Date(f.data).toLocaleDateString('pt-BR')}</td><td>${data.bancos.find(b=>b.id===f.banco_id)?.nome || 'N/A'}</td>
        <td>${f.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td><td>${f.motivo}</td><td>${f.descricao||''}</td>
        <td>R$ ${Number(f.valor).toFixed(2)}</td><td><button class="btn-small" onclick="deleteItem('financeiro', '${f.id}')">Deletar</button></td></tr>`).join('');
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
    const filtroRota = document.getElementById('filtroRotaRelatorio')?.value || '';
    let rotasFiltradas = data.rotas;
    if (filtroRota) rotasFiltradas = rotasFiltradas.filter(r => r.id === filtroRota);
    document.getElementById('rotasGastoTable').innerHTML = rotasFiltradas.map(r => {
        const gastoRota = gastoRotaInstancia(r);
        const kmP = kmPercorrido(r);
        const custoPorKm = kmP > 0 ? (gastoRota/kmP).toFixed(2) : 0;
        return `<tr><td>${veiculoPlaca(r.veiculo_id)}</td><td>${motoristaNome(r.motorista_id)}</td><td>${r.local_saida}</td><td>${r.destino}</td>
        <td>${new Date(r.data_inicio).toLocaleDateString('pt-BR')}</td><td>${kmP} km</td><td>R$ ${gastoRota.toFixed(2)}</td><td>R$ ${custoPorKm}/km</td></tr>`;
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
                      'agenda','turismo_viagens','rotas_fixas','financeiro_categorias','bomba_cargas'];
 
    const resultados = await Promise.all(tabelas.map(t => sb.from(t).select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })));
    resultados.forEach((res, i) => {
        if (res.error) { console.error(`Erro ao carregar ${tabelas[i]}:`, res.error); data[tabelas[i]] = []; }
        else { data[tabelas[i]] = res.data; }
    });
 
    loadMotoristas(); loadFuncionarios(); loadVeiculos(); loadClientes();
    loadAbastecimentos(); loadPneus(); loadOleos(); loadPreventivas(); loadCorretivas(); loadMultas();
    loadBancos(); loadFinanceiro(); loadRotas();
    loadProdutos(); loadMovimentacoes();
    loadBomba();
    preencherFiltroClientesTurismo(); filtrarTurismo();
    preencherFiltroRotas(); gerarRelatorioRotas();
    preencherFiltroMotivo();
}
 
// ==== INICIAR ====
checkAuth();