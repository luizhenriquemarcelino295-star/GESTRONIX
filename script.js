let currentUser = null;
let currentEmpresa = null;
let chartGastos = null;
let chartCategorias = null;
let chartRelatorio = null;
let data = {
    motoristas: [],
    funcionarios: [],
    veiculos: [],
    clientes: [],
    abastecimentos: [],
    pneus: [],
    oleos: [],
    preventivas: [],
    multas: [],
    bancos: [],
    financeiro: [],
    rotas: [],
};
 
// AUTENTICAÇÃO COM ISOLAMENTO DE EMPRESA
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (!user) {
        showLoginPage();
    } else {
        currentUser = JSON.parse(user);
        currentEmpresa = JSON.parse(localStorage.getItem(`empresa_${currentUser.id}`));
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('empresaNome').textContent = `(${currentEmpresa.nome})`;
        loadData();
        updateDashboard();
    }
}
 
function showLoginPage() {
    const loginHTML = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); width: 100%; max-width: 400px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #0066cc 0%, #00a3e0 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: white; font-size: 32px; font-weight: bold;">G</div>
                    <h1 style="margin: 15px 0 5px 0; color: #333;">Gestronix</h1>
                    <p style="margin: 0; color: #666; font-size: 13px;">Gestão que conecta. Resultados que movem.</p>
                </div>
                <div id="loginForm">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">Email</label>
                        <input type="email" id="loginEmail" placeholder="seu@email.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">Senha</label>
                        <input type="password" id="loginPassword" placeholder="Mínimo 4 caracteres" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    <button onclick="login()" style="width: 100%; padding: 10px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; margin-bottom: 10px;">Entrar</button>
                    <button onclick="toggleRegister()" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">Criar Conta</button>
                </div>
                <div id="registerForm" style="display: none;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">Email</label>
                        <input type="email" id="registerEmail" placeholder="seu@email.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">Senha</label>
                        <input type="password" id="registerPassword" placeholder="Mínimo 4 caracteres" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">Confirmar Senha</label>
                        <input type="password" id="registerPasswordConfirm" placeholder="Confirme a senha" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">Nome da Empresa</label>
                        <input type="text" id="registerEmpresa" placeholder="Sua Transportadora" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                    </div>
                    <button onclick="register()" style="width: 100%; padding: 10px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; margin-bottom: 10px;">Criar Conta</button>
                    <button onclick="toggleRegister()" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">Voltar</button>
                </div>
            </div>
        </div>
    `;
    document.body.innerHTML = loginHTML;
}
 
function toggleRegister() {
    document.getElementById('loginForm').style.display = document.getElementById('loginForm').style.display === 'none' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = document.getElementById('registerForm').style.display === 'none' ? 'block' : 'none';
}
 
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
 
    if (!email || !password) {
        alert('Preencha todos os campos');
        return;
    }
 
    if (password.length < 4) {
        alert('Senha deve ter no mínimo 4 caracteres');
        return;
    }
 
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
 
    if (!user) {
        alert('Email ou senha incorretos');
        return;
    }
 
    localStorage.setItem('currentUser', JSON.stringify({email: user.email, id: user.id}));
    location.reload();
}
 
function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const empresaNome = document.getElementById('registerEmpresa').value;
 
    if (!email || !password || !passwordConfirm || !empresaNome) {
        alert('Preencha todos os campos');
        return;
    }
 
    if (password.length < 4) {
        alert('Senha deve ter no mínimo 4 caracteres');
        return;
    }
 
    if (password !== passwordConfirm) {
        alert('Senhas não conferem');
        return;
    }
 
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.email === email)) {
        alert('Email já cadastrado');
        return;
    }
 
    const userId = Date.now();
    users.push({
        id: userId,
        email: email,
        password: password
    });
 
    // Salvar dados da empresa isolados por usuário
    const empresaData = {
        id: userId,
        nome: empresaNome,
        criadoEm: new Date().toISOString()
    };
 
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify({email: email, id: userId}));
    localStorage.setItem(`empresa_${userId}`, JSON.stringify(empresaData));
    localStorage.setItem(`data_${userId}`, JSON.stringify({
        motoristas: [],
        funcionarios: [],
        veiculos: [],
        clientes: [],
        abastecimentos: [],
        pneus: [],
        oleos: [],
        preventivas: [],
        multas: [],
        bancos: [],
        financeiro: [],
        rotas: [],
    }));
    location.reload();
}
 
function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}
 
// PÁGINAS
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
 
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    event.target.classList.add('active');
 
    if (page === 'aniversarios') {
        loadAniversarios();
    } else if (page === 'dashboard') {
        setTimeout(() => {
            criarGraficos();
        }, 100);
    } else if (page === 'desempenho') {
        loadDesempenho();
    } else if (page === 'relatorios') {
        setTimeout(() => {
            gerarRelatorio();
        }, 100);
    }
}
 
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
 
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
}
 
// MODAL
function openAddModal(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
 
    let html = '';
 
    if (type === 'motorista') {
        modalTitle.textContent = 'Adicionar Motorista';
        html = `
            <div class="form-group">
                <label>Nome</label>
                <input type="text" id="motoristaNome" placeholder="Nome completo">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>CPF</label>
                    <input type="text" id="motoristaCPF" placeholder="000.000.000-00">
                </div>
                <div class="form-group">
                    <label>Telefone</label>
                    <input type="text" id="motoristaTelefone" placeholder="(00) 00000-0000">
                </div>
            </div>
            <div class="form-group">
                <label>Endereço</label>
                <input type="text" id="motoristaEndereco" placeholder="Rua, número, complemento">
            </div>
            <div class="form-group">
                <label>Data de Nascimento</label>
                <input type="date" id="motoristaDataNasc">
            </div>
            <button onclick="addMotorista()">Adicionar</button>
        `;
    } else if (type === 'funcionario') {
        modalTitle.textContent = 'Adicionar Funcionário';
        html = `
            <div class="form-group">
                <label>Nome</label>
                <input type="text" id="funcionarioNome" placeholder="Nome completo">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>CPF</label>
                    <input type="text" id="funcionarioCPF" placeholder="000.000.000-00">
                </div>
                <div class="form-group">
                    <label>Telefone</label>
                    <input type="text" id="funcionarioTelefone" placeholder="(00) 00000-0000">
                </div>
            </div>
            <div class="form-group">
                <label>Endereço</label>
                <input type="text" id="funcionarioEndereco" placeholder="Rua, número, complemento">
            </div>
            <div class="form-group">
                <label>Data de Nascimento</label>
                <input type="date" id="funcionarioDataNasc">
            </div>
            <button onclick="addFuncionario()">Adicionar</button>
        `;
    } else if (type === 'veiculo') {
        modalTitle.textContent = 'Adicionar Veículo';
        html = `
            <div class="form-row">
                <div class="form-group">
                    <label>Placa</label>
                    <input type="text" id="veiculoPlaca" placeholder="ABC-1234">
                </div>
                <div class="form-group">
                    <label>Marca</label>
                    <input type="text" id="veiculoMarca" placeholder="Marca">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Modelo</label>
                    <input type="text" id="veiculoModelo" placeholder="Modelo">
                </div>
                <div class="form-group">
                    <label>Ano</label>
                    <input type="number" id="veiculoAno" placeholder="2024">
                </div>
            </div>
            <button onclick="addVeiculo()">Adicionar</button>
        `;
    } else if (type === 'cliente') {
        modalTitle.textContent = 'Adicionar Cliente';
        html = `
            <div class="form-group">
                <label>Nome</label>
                <input type="text" id="clienteNome" placeholder="Nome completo">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>CPF/CNPJ</label>
                    <input type="text" id="clienteCPF" placeholder="000.000.000-00">
                </div>
                <div class="form-group">
                    <label>Telefone</label>
                    <input type="text" id="clienteTelefone" placeholder="(00) 00000-0000">
                </div>
            </div>
            <div class="form-group">
                <label>Endereço</label>
                <input type="text" id="clienteEndereco" placeholder="Rua, número, complemento">
            </div>
            <div class="form-group">
                <label>Data de Nascimento</label>
                <input type="date" id="clienteDataNasc">
            </div>
            <button onclick="addCliente()">Adicionar</button>
        `;
    } else if (type === 'abastecimento') {
        modalTitle.textContent = 'Adicionar Abastecimento';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group">
                <label>Veículo</label>
                <select id="abastecimentoVeiculo">${veiculosOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="abastecimentoData">
                </div>
                <div class="form-group">
                    <label>KM</label>
                    <input type="number" id="abastecimentoKM" placeholder="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Litros</label>
                    <input type="number" id="abastecimentoLitros" placeholder="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Valor/L</label>
                    <input type="number" id="abastecimentoValorL" placeholder="0" step="0.01" onchange="calcularValorTotal()">
                </div>
            </div>
            <div class="form-group">
                <label>Valor Total</label>
                <input type="number" id="abastecimentoValorTotal" placeholder="0" step="0.01" readonly>
            </div>
            <button onclick="addAbastecimento()">Adicionar</button>
        `;
    } else if (type === 'pneu') {
        modalTitle.textContent = 'Adicionar Pneu';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group">
                <label>Veículo</label>
                <select id="pneuVeiculo">${veiculosOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="pneuData">
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <input type="text" id="pneuDescricao" placeholder="Descrição">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>KM Atual</label>
                    <input type="number" id="pneuKMAtual" placeholder="0">
                </div>
                <div class="form-group">
                    <label>KM Próxima Troca</label>
                    <input type="number" id="pneuKMProxima" placeholder="0">
                </div>
            </div>
            <div class="form-group">
                <label>Valor</label>
                <input type="number" id="pneuValor" placeholder="0" step="0.01">
            </div>
            <button onclick="addPneu()">Adicionar</button>
        `;
    } else if (type === 'oleo') {
        modalTitle.textContent = 'Adicionar Óleo';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group">
                <label>Veículo</label>
                <select id="oleoVeiculo">${veiculosOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="oleoData">
                </div>
                <div class="form-group">
                    <label>Tipo</label>
                    <input type="text" id="oleoTipo" placeholder="Ex: 5W30">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>KM Atual</label>
                    <input type="number" id="oleoKMAtual" placeholder="0">
                </div>
                <div class="form-group">
                    <label>KM Próxima Troca</label>
                    <input type="number" id="oleoKMProxima" placeholder="0">
                </div>
            </div>
            <div class="form-group">
                <label>Valor</label>
                <input type="number" id="oleoValor" placeholder="0" step="0.01">
            </div>
            <button onclick="addOleo()">Adicionar</button>
        `;
    } else if (type === 'preventiva') {
        modalTitle.textContent = 'Adicionar Manutenção Preventiva';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group">
                <label>Veículo</label>
                <select id="preventivaVeiculo">${veiculosOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="preventivaData">
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <input type="text" id="preventivaDescricao" placeholder="Descrição">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>KM Atual</label>
                    <input type="number" id="preventivaKMAtual" placeholder="0">
                </div>
                <div class="form-group">
                    <label>KM Próxima Troca</label>
                    <input type="number" id="preventivaKMProxima" placeholder="0">
                </div>
            </div>
            <div class="form-group">
                <label>Valor</label>
                <input type="number" id="preventivaValor" placeholder="0" step="0.01">
            </div>
            <button onclick="addPreventiva()">Adicionar</button>
        `;
    } else if (type === 'multa') {
        modalTitle.textContent = 'Adicionar Multa';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        html = `
            <div class="form-group">
                <label>Veículo</label>
                <select id="multaVeiculo">${veiculosOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="multaData">
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <input type="text" id="multaDescricao" placeholder="Descrição">
                </div>
            </div>
            <div class="form-group">
                <label>Valor</label>
                <input type="number" id="multaValor" placeholder="0" step="0.01">
            </div>
            <button onclick="addMulta()">Adicionar</button>
        `;
    } else if (type === 'banco') {
        modalTitle.textContent = 'Adicionar Banco';
        html = `
            <div class="form-group">
                <label>Nome</label>
                <input type="text" id="bancoNome" placeholder="Nome do Banco">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Agência</label>
                    <input type="text" id="bancoAgencia" placeholder="0000">
                </div>
                <div class="form-group">
                    <label>Conta</label>
                    <input type="text" id="bancoConta" placeholder="000000-0">
                </div>
            </div>
            <div class="form-group">
                <label>Saldo</label>
                <input type="number" id="bancoSaldo" placeholder="0" step="0.01">
            </div>
            <button onclick="addBanco()">Adicionar</button>
        `;
    } else if (type === 'financeiro') {
        modalTitle.textContent = 'Adicionar Lançamento Financeiro';
        const bancosOptions = data.bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        html = `
            <div class="form-row">
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" id="financeiroData">
                </div>
                <div class="form-group">
                    <label>Banco</label>
                    <select id="financeiroBanco">${bancosOptions}</select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="financeiroTipo">
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Motivo</label>
                    <select id="financeiroMotivo">
                        <option value="Abastecimento">Abastecimento</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Multa">Multa</option>
                        <option value="Salário">Salário</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Descrição</label>
                <textarea id="financeiroDescricao" placeholder="Descrição"></textarea>
            </div>
            <div class="form-group">
                <label>Valor</label>
                <input type="number" id="financeiroValor" placeholder="0" step="0.01">
            </div>
            <button onclick="addFinanceiro()">Adicionar</button>
        `;
    } else if (type === 'rota') {
        modalTitle.textContent = 'Adicionar Rota';
        const veiculosOptions = data.veiculos.map(v => `<option value="${v.id}">${v.placa}</option>`).join('');
        const motoristasOptions = data.motoristas.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
        html = `
            <div class="form-row">
                <div class="form-group">
                    <label>Veículo</label>
                    <select id="rotaVeiculo">${veiculosOptions}</select>
                </div>
                <div class="form-group">
                    <label>Motorista</label>
                    <select id="rotaMotorista">${motoristasOptions}</select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Local Saída</label>
                    <input type="text" id="rotaLocalSaida" placeholder="Local de saída">
                </div>
                <div class="form-group">
                    <label>Destino</label>
                    <input type="text" id="rotaDestino" placeholder="Destino">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Data Início</label>
                    <input type="date" id="rotaDataInicio">
                </div>
                <div class="form-group">
                    <label>Data Fim</label>
                    <input type="date" id="rotaDataFim">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Hora Início</label>
                    <input type="time" id="rotaHoraInicio">
                </div>
                <div class="form-group">
                    <label>Hora Fim</label>
                    <input type="time" id="rotaHoraFim">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>KM Início</label>
                    <input type="number" id="rotaKMInicio" placeholder="0">
                </div>
                <div class="form-group">
                    <label>KM Fim</label>
                    <input type="number" id="rotaKMFim" placeholder="0">
                </div>
            </div>
            <button onclick="addRota()">Adicionar</button>
        `;
    }
 
    modalBody.innerHTML = html;
    modal.classList.add('active');
}
 
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}
 
// ADICIONAR ITENS (COM ISOLAMENTO DE EMPRESA)
function addMotorista() {
    const nome = document.getElementById('motoristaNome').value;
    const cpf = document.getElementById('motoristaCPF').value;
    const telefone = document.getElementById('motoristaTelefone').value;
    const endereco = document.getElementById('motoristaEndereco').value;
    const dataNasc = document.getElementById('motoristaDataNasc').value;
 
    if (!nome || !cpf || !telefone || !endereco || !dataNasc) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.motoristas.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        nome, cpf, telefone, endereco, dataNasc
    });
 
    saveData();
    closeModal();
    loadMotoristas();
    updateDashboard();
}
 
function addFuncionario() {
    const nome = document.getElementById('funcionarioNome').value;
    const cpf = document.getElementById('funcionarioCPF').value;
    const telefone = document.getElementById('funcionarioTelefone').value;
    const endereco = document.getElementById('funcionarioEndereco').value;
    const dataNasc = document.getElementById('funcionarioDataNasc').value;
 
    if (!nome || !cpf || !telefone || !endereco || !dataNasc) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.funcionarios.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        nome, cpf, telefone, endereco, dataNasc
    });
 
    saveData();
    closeModal();
    loadFuncionarios();
    updateDashboard();
}
 
function addVeiculo() {
    const placa = document.getElementById('veiculoPlaca').value;
    const marca = document.getElementById('veiculoMarca').value;
    const modelo = document.getElementById('veiculoModelo').value;
    const ano = document.getElementById('veiculoAno').value;
 
    if (!placa || !marca || !modelo || !ano) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.veiculos.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        placa, marca, modelo, ano
    });
 
    saveData();
    closeModal();
    loadVeiculos();
    updateDashboard();
}
 
function addCliente() {
    const nome = document.getElementById('clienteNome').value;
    const cpf = document.getElementById('clienteCPF').value;
    const telefone = document.getElementById('clienteTelefone').value;
    const endereco = document.getElementById('clienteEndereco').value;
    const dataNasc = document.getElementById('clienteDataNasc').value;
 
    if (!nome || !cpf || !telefone || !endereco || !dataNasc) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.clientes.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        nome, cpf, telefone, endereco, dataNasc
    });
 
    saveData();
    closeModal();
    loadClientes();
    updateDashboard();
}
 
function addAbastecimento() {
    const veiculo = document.getElementById('abastecimentoVeiculo').value;
    const data_abast = document.getElementById('abastecimentoData').value;
    const km = parseFloat(document.getElementById('abastecimentoKM').value);
    const litros = parseFloat(document.getElementById('abastecimentoLitros').value);
    const valorL = parseFloat(document.getElementById('abastecimentoValorL').value);
    const valorTotal = parseFloat(document.getElementById('abastecimentoValorTotal').value);
 
    if (!veiculo || !data_abast || !km || !litros || !valorL) {
        alert('Preencha todos os campos');
        return;
    }
 
    const abastecimentosVeiculo = data.abastecimentos
        .filter(a => a.veiculo == veiculo && a.empresaId === currentEmpresa.id)
        .sort((a, b) => new Date(b.data) - new Date(a.data));
 
    let kml = 0;
    if (abastecimentosVeiculo.length > 0) {
        const ultimoAbastecimento = abastecimentosVeiculo[0];
        const kmDiferenca = km - ultimoAbastecimento.km;
        kml = kmDiferenca > 0 ? kmDiferenca / litros : 0;
    } else {
        kml = 0;
    }
 
    data.abastecimentos.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        veiculo, data: data_abast, km, litros, valorL, valorTotal, kml
    });
 
    saveData();
    closeModal();
    loadAbastecimentos();
    updateDashboard();
}
 
function addPneu() {
    const veiculo = document.getElementById('pneuVeiculo').value;
    const data_pneu = document.getElementById('pneuData').value;
    const descricao = document.getElementById('pneuDescricao').value;
    const kmAtual = parseFloat(document.getElementById('pneuKMAtual').value);
    const valor = parseFloat(document.getElementById('pneuValor').value);
    const kmProxima = parseFloat(document.getElementById('pneuKMProxima').value);
 
    if (!veiculo || !data_pneu || !descricao || !kmAtual || !valor || !kmProxima) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.pneus.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        veiculo, data: data_pneu, descricao, kmAtual, valor, kmProxima
    });
 
    saveData();
    closeModal();
    loadPneus();
    updateDashboard();
}
 
function addOleo() {
    const veiculo = document.getElementById('oleoVeiculo').value;
    const data_oleo = document.getElementById('oleoData').value;
    const tipo = document.getElementById('oleoTipo').value;
    const kmAtual = parseFloat(document.getElementById('oleoKMAtual').value);
    const valor = parseFloat(document.getElementById('oleoValor').value);
    const kmProxima = parseFloat(document.getElementById('oleoKMProxima').value);
 
    if (!veiculo || !data_oleo || !tipo || !kmAtual || !valor || !kmProxima) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.oleos.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        veiculo, data: data_oleo, tipo, kmAtual, valor, kmProxima
    });
 
    saveData();
    closeModal();
    loadOleos();
    updateDashboard();
}
 
function addPreventiva() {
    const veiculo = document.getElementById('preventivaVeiculo').value;
    const data_prev = document.getElementById('preventivaData').value;
    const descricao = document.getElementById('preventivaDescricao').value;
    const kmAtual = parseFloat(document.getElementById('preventivaKMAtual').value);
    const kmProxima = parseFloat(document.getElementById('preventivaKMProxima').value);
    const valor = parseFloat(document.getElementById('preventivaValor').value);
 
    if (!veiculo || !data_prev || !descricao || !kmAtual || !kmProxima || !valor) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.preventivas.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        veiculo, data: data_prev, descricao, kmAtual, kmProxima, valor
    });
 
    saveData();
    closeModal();
    loadPreventivas();
    updateDashboard();
}
 
function addMulta() {
    const veiculo = document.getElementById('multaVeiculo').value;
    const data_multa = document.getElementById('multaData').value;
    const descricao = document.getElementById('multaDescricao').value;
    const valor = parseFloat(document.getElementById('multaValor').value);
 
    if (!veiculo || !data_multa || !descricao || !valor) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.multas.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        veiculo, data: data_multa, descricao, valor
    });
 
    saveData();
    closeModal();
    loadMultas();
    updateDashboard();
}
 
function addBanco() {
    const nome = document.getElementById('bancoNome').value;
    const agencia = document.getElementById('bancoAgencia').value;
    const conta = document.getElementById('bancoConta').value;
    const saldo = parseFloat(document.getElementById('bancoSaldo').value);
 
    if (!nome || !agencia || !conta || !saldo) {
        alert('Preencha todos os campos');
        return;
    }
 
    data.bancos.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        nome, agencia, conta, saldo
    });
 
    saveData();
    closeModal();
    loadBancos();
    updateDashboard();
}
 
function addFinanceiro() {
    const data_fin = document.getElementById('financeiroData').value;
    const banco = document.getElementById('financeiroBanco').value;
    const tipo = document.getElementById('financeiroTipo').value;
    const motivo = document.getElementById('financeiroMotivo').value;
    const descricao = document.getElementById('financeiroDescricao').value;
    const valor = parseFloat(document.getElementById('financeiroValor').value);
 
    if (!data_fin || !banco || !tipo || !motivo || !valor) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }
 
    const bancoObj = data.bancos.find(b => b.id == banco && b.empresaId === currentEmpresa.id);
    if (bancoObj) {
        if (tipo === 'entrada') {
            bancoObj.saldo += valor;
        } else {
            bancoObj.saldo -= valor;
        }
    }
 
    data.financeiro.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        data: data_fin, banco, tipo, motivo, descricao, valor
    });
 
    saveData();
    closeModal();
    loadFinanceiro();
    loadBancos();
    updateDashboard();
}
 
function addRota() {
    const veiculo = document.getElementById('rotaVeiculo').value;
    const motorista = document.getElementById('rotaMotorista').value;
    const localSaida = document.getElementById('rotaLocalSaida').value;
    const destino = document.getElementById('rotaDestino').value;
    const dataInicio = document.getElementById('rotaDataInicio').value;
    const dataFim = document.getElementById('rotaDataFim').value;
    const horaInicio = document.getElementById('rotaHoraInicio').value;
    const horaFim = document.getElementById('rotaHoraFim').value;
    const kmInicio = parseFloat(document.getElementById('rotaKMInicio').value);
    const kmFim = parseFloat(document.getElementById('rotaKMFim').value);
 
    if (!veiculo || !motorista || !localSaida || !destino || !dataInicio || !dataFim || !horaInicio || !horaFim || !kmInicio || !kmFim) {
        alert('Preencha todos os campos');
        return;
    }
 
    const kmPercorrido = kmFim - kmInicio;
    
    const inicio = new Date(`${dataInicio}T${horaInicio}`);
    const fim = new Date(`${dataFim}T${horaFim}`);
    const tempoMs = fim - inicio;
    const horas = Math.floor(tempoMs / (1000 * 60 * 60));
    const minutos = Math.floor((tempoMs % (1000 * 60 * 60)) / (1000 * 60));
    const tempoTotal = `${horas}h ${minutos}m`;
 
    data.rotas.push({
        id: Date.now(),
        empresaId: currentEmpresa.id,
        veiculo, motorista, localSaida, destino, dataInicio, dataFim, horaInicio, horaFim, kmInicio, kmFim, kmPercorrido, tempoTotal
    });
 
    saveData();
    closeModal();
    loadRotas();
    updateDashboard();
}
 
// CARREGAR DADOS (FILTRADO POR EMPRESA)
function loadMotoristas() {
    const table = document.getElementById('motoristasTable');
    table.innerHTML = data.motoristas
        .filter(m => m.empresaId === currentEmpresa.id)
        .map(m => `
        <tr>
            <td>${m.nome}</td>
            <td>${m.cpf}</td>
            <td>${m.telefone}</td>
            <td>${m.endereco}</td>
            <td>${new Date(m.dataNasc).toLocaleDateString('pt-BR')}</td>
            <td><button class="btn-small" onclick="deleteItem('motoristas', ${m.id})">Deletar</button></td>
        </tr>
    `).join('');
}
 
function loadFuncionarios() {
    const table = document.getElementById('funcionariosTable');
    table.innerHTML = data.funcionarios
        .filter(f => f.empresaId === currentEmpresa.id)
        .map(f => `
        <tr>
            <td>${f.nome}</td>
            <td>${f.cpf}</td>
            <td>${f.telefone}</td>
            <td>${f.endereco}</td>
            <td>${new Date(f.dataNasc).toLocaleDateString('pt-BR')}</td>
            <td><button class="btn-small" onclick="deleteItem('funcionarios', ${f.id})">Deletar</button></td>
        </tr>
    `).join('');
}
 
function loadVeiculos() {
    const table = document.getElementById('veiculosTable');
    table.innerHTML = data.veiculos
        .filter(v => v.empresaId === currentEmpresa.id)
        .map(v => `
        <tr>
            <td>${v.placa}</td>
            <td>${v.marca}</td>
            <td>${v.modelo}</td>
            <td>${v.ano}</td>
            <td><button class="btn-small" onclick="deleteItem('veiculos', ${v.id})">Deletar</button></td>
        </tr>
    `).join('');
}
 
function loadClientes() {
    const table = document.getElementById('clientesTable');
    table.innerHTML = data.clientes
        .filter(c => c.empresaId === currentEmpresa.id)
        .map(c => `
        <tr>
            <td>${c.nome}</td>
            <td>${c.cpf}</td>
            <td>${c.telefone}</td>
            <td>${c.endereco}</td>
            <td>${new Date(c.dataNasc).toLocaleDateString('pt-BR')}</td>
            <td><button class="btn-small" onclick="deleteItem('clientes', ${c.id})">Deletar</button></td>
        </tr>
    `).join('');
}
 
function loadAbastecimentos() {
    const table = document.getElementById('abastecimentosTable');
    table.innerHTML = data.abastecimentos
        .filter(a => a.empresaId === currentEmpresa.id)
        .map(a => {
        const veiculo = data.veiculos.find(v => v.id == a.veiculo);
        return `
            <tr>
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${new Date(a.data).toLocaleDateString('pt-BR')}</td>
                <td>${a.km}</td>
                <td>${a.litros.toFixed(2)}</td>
                <td>R$ ${a.valorL.toFixed(2)}</td>
                <td>R$ ${a.valorTotal.toFixed(2)}</td>
                <td>${a.kml.toFixed(2)} km/l</td>
                <td><button class="btn-small" onclick="deleteItem('abastecimentos', ${a.id})">Deletar</button></td>
            </tr>
        `;
    }).join('');
}
 
function loadPneus() {
    const table = document.getElementById('neusTable');
    table.innerHTML = data.pneus
        .filter(p => p.empresaId === currentEmpresa.id)
        .map(p => {
        const veiculo = data.veiculos.find(v => v.id == p.veiculo);
        const kmFaltando = p.kmProxima - (p.kmAtual || 0);
        const statusAlerta = kmFaltando <= 5000 ? 'background: #fff3cd;' : '';
        return `
            <tr style="${statusAlerta}">
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${new Date(p.data).toLocaleDateString('pt-BR')}</td>
                <td>${p.descricao}</td>
                <td>${p.kmAtual} km</td>
                <td>${p.kmProxima} km</td>
                <td>${kmFaltando} km</td>
                <td>R$ ${p.valor.toFixed(2)}</td>
                <td><button class="btn-small" onclick="deleteItem('pneus', ${p.id})">Deletar</button></td>
            </tr>
        `;
    }).join('');
}
 
function loadOleos() {
    const table = document.getElementById('oleosTable');
    table.innerHTML = data.oleos
        .filter(o => o.empresaId === currentEmpresa.id)
        .map(o => {
        const veiculo = data.veiculos.find(v => v.id == o.veiculo);
        const kmFaltando = o.kmProxima - (o.kmAtual || 0);
        const statusAlerta = kmFaltando <= 5000 ? 'background: #fff3cd;' : '';
        return `
            <tr style="${statusAlerta}">
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${new Date(o.data).toLocaleDateString('pt-BR')}</td>
                <td>${o.tipo}</td>
                <td>${o.kmAtual} km</td>
                <td>${o.kmProxima} km</td>
                <td>${kmFaltando} km</td>
                <td>R$ ${o.valor.toFixed(2)}</td>
                <td><button class="btn-small" onclick="deleteItem('oleos', ${o.id})">Deletar</button></td>
            </tr>
        `;
    }).join('');
}
 
function loadPreventivas() {
    const table = document.getElementById('preventivaTable');
    table.innerHTML = data.preventivas
        .filter(p => p.empresaId === currentEmpresa.id)
        .map(p => {
        const veiculo = data.veiculos.find(v => v.id == p.veiculo);
        const kmFaltando = p.kmProxima - (p.kmAtual || 0);
        const statusAlerta = kmFaltando <= 5000 ? 'background: #fff3cd;' : '';
        return `
            <tr style="${statusAlerta}">
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${new Date(p.data).toLocaleDateString('pt-BR')}</td>
                <td>${p.descricao}</td>
                <td>${p.kmAtual} km</td>
                <td>${p.kmProxima} km</td>
                <td>${kmFaltando} km</td>
                <td>R$ ${p.valor.toFixed(2)}</td>
                <td><button class="btn-small" onclick="deleteItem('preventivas', ${p.id})">Deletar</button></td>
            </tr>
        `;
    }).join('');
}
 
function loadMultas() {
    const table = document.getElementById('multasTable');
    table.innerHTML = data.multas
        .filter(m => m.empresaId === currentEmpresa.id)
        .map(m => {
        const veiculo = data.veiculos.find(v => v.id == m.veiculo);
        return `
            <tr>
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${new Date(m.data).toLocaleDateString('pt-BR')}</td>
                <td>${m.descricao}</td>
                <td>R$ ${m.valor.toFixed(2)}</td>
                <td><button class="btn-small" onclick="deleteItem('multas', ${m.id})">Deletar</button></td>
            </tr>
        `;
    }).join('');
}
 
function loadBancos() {
    const table = document.getElementById('bancosTable');
    table.innerHTML = data.bancos
        .filter(b => b.empresaId === currentEmpresa.id)
        .map(b => `
        <tr>
            <td>${b.nome}</td>
            <td>${b.agencia}</td>
            <td>${b.conta}</td>
            <td>R$ ${b.saldo.toFixed(2)}</td>
            <td><button class="btn-small" onclick="deleteItem('bancos', ${b.id})">Deletar</button></td>
        </tr>
    `).join('');
}
 
function loadFinanceiro() {
    const table = document.getElementById('financeiroTable');
    table.innerHTML = data.financeiro
        .filter(f => f.empresaId === currentEmpresa.id)
        .map(f => {
        const banco = data.bancos.find(b => b.id == f.banco);
        return `
            <tr>
                <td>${new Date(f.data).toLocaleDateString('pt-BR')}</td>
                <td>${banco ? banco.nome : 'N/A'}</td>
                <td>${f.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td>
                <td>${f.motivo}</td>
                <td>${f.descricao}</td>
                <td>R$ ${f.valor.toFixed(2)}</td>
                <td><button class="btn-small" onclick="deleteItem('financeiro', ${f.id})">Deletar</button></td>
            </tr>
        `;
    }).join('');
}
 
function loadRotas() {
    const table = document.getElementById('rotasTable');
    table.innerHTML = data.rotas
        .filter(r => r.empresaId === currentEmpresa.id)
        .map(r => {
        const veiculo = data.veiculos.find(v => v.id == r.veiculo);
        const motorista = data.motoristas.find(m => m.id == r.motorista);
        return `
            <tr>
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${motorista ? motorista.nome : 'N/A'}</td>
                <td>${r.localSaida}</td>
                <td>${r.destino}</td>
                <td>${new Date(r.dataInicio).toLocaleDateString('pt-BR')}</td>
                <td>${new Date(r.dataFim).toLocaleDateString('pt-BR')}</td>
                <td>${r.kmPercorrido} km</td>
                <td>${r.tempoTotal}</td>
                <td><button class="btn-small" onclick="deleteItem('rotas', ${r.id})">Deletar</button></td>
            </tr>
        `;
    }).join('');
}
 
function loadDesempenho() {
    const content = document.getElementById('desempenhoContent');
    
    let htmlVeiculos = '<h3>🚗 Desempenho dos Veículos</h3>';
    const veiculosDesempenho = data.veiculos
        .filter(v => v.empresaId === currentEmpresa.id)
        .map(v => {
        const rotasVeiculo = data.rotas.filter(r => r.veiculo == v.id && r.empresaId === currentEmpresa.id);
        const kmTotal = rotasVeiculo.reduce((sum, r) => sum + r.kmPercorrido, 0);
        
        let gastosVeiculo = 0;
        gastosVeiculo += data.abastecimentos.filter(a => a.veiculo == v.id && a.empresaId === currentEmpresa.id).reduce((sum, a) => sum + a.valorTotal, 0);
        gastosVeiculo += data.pneus.filter(p => p.veiculo == v.id && p.empresaId === currentEmpresa.id).reduce((sum, p) => sum + p.valor, 0);
        gastosVeiculo += data.oleos.filter(o => o.veiculo == v.id && o.empresaId === currentEmpresa.id).reduce((sum, o) => sum + o.valor, 0);
        gastosVeiculo += data.preventivas.filter(p => p.veiculo == v.id && p.empresaId === currentEmpresa.id).reduce((sum, p) => sum + p.valor, 0);
        gastosVeiculo += data.multas.filter(m => m.veiculo == v.id && m.empresaId === currentEmpresa.id).reduce((sum, m) => sum + m.valor, 0);
        
        const custoPorKm = kmTotal > 0 ? (gastosVeiculo / kmTotal).toFixed(2) : 0;
        
        return `
            <div class="performance-card">
                <h4>🚗 ${v.placa} - ${v.marca} ${v.modelo} (${v.ano})</h4>
                <div class="performance-stats">
                    <div class="stat">
                        <div class="stat-value">${kmTotal}</div>
                        <div class="stat-label">KM Percorrido</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${rotasVeiculo.length}</div>
                        <div class="stat-label">Rotas Realizadas</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">R$ ${gastosVeiculo.toFixed(2)}</div>
                        <div class="stat-label">Gasto Total</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">R$ ${custoPorKm}</div>
                        <div class="stat-label">Custo/KM</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    htmlVeiculos += veiculosDesempenho;
 
    let htmlMotoristas = '<h3 style="margin-top: 30px;">👨‍✈️ Desempenho dos Motoristas</h3>';
    const motoristasDesempenho = data.motoristas
        .filter(m => m.empresaId === currentEmpresa.id)
        .map(m => {
        const rotasMotorista = data.rotas.filter(r => r.motorista == m.id && r.empresaId === currentEmpresa.id);
        const kmTotal = rotasMotorista.reduce((sum, r) => sum + r.kmPercorrido, 0);
        
        let gastosMotorista = 0;
        rotasMotorista.forEach(r => {
            gastosMotorista += data.abastecimentos.filter(a => a.veiculo == r.veiculo && a.empresaId === currentEmpresa.id).reduce((sum, a) => sum + a.valorTotal, 0);
            gastosMotorista += data.pneus.filter(p => p.veiculo == r.veiculo && p.empresaId === currentEmpresa.id).reduce((sum, p) => sum + p.valor, 0);
            gastosMotorista += data.oleos.filter(o => o.veiculo == r.veiculo && o.empresaId === currentEmpresa.id).reduce((sum, o) => sum + o.valor, 0);
            gastosMotorista += data.preventivas.filter(p => p.veiculo == r.veiculo && p.empresaId === currentEmpresa.id).reduce((sum, p) => sum + p.valor, 0);
            gastosMotorista += data.multas.filter(m => m.veiculo == r.veiculo && m.empresaId === currentEmpresa.id).reduce((sum, m) => sum + m.valor, 0);
        });
        
        const custoPorKm = kmTotal > 0 ? (gastosMotorista / kmTotal).toFixed(2) : 0;
        
        return `
            <div class="performance-card">
                <h4>👨‍✈️ ${m.nome}</h4>
                <div class="performance-stats">
                    <div class="stat">
                        <div class="stat-value">${kmTotal}</div>
                        <div class="stat-label">KM Percorrido</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${rotasMotorista.length}</div>
                        <div class="stat-label">Rotas Realizadas</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">R$ ${gastosMotorista.toFixed(2)}</div>
                        <div class="stat-label">Gasto Total</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">R$ ${custoPorKm}</div>
                        <div class="stat-label">Custo/KM</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    htmlMotoristas += motoristasDesempenho;
 
    content.innerHTML = htmlVeiculos + htmlMotoristas;
}
 
function loadAniversarios() {
    const hoje = new Date();
    const motoristas = data.motoristas.filter(m => m.empresaId === currentEmpresa.id);
    const funcionarios = data.funcionarios.filter(f => f.empresaId === currentEmpresa.id);
    const clientes = data.clientes.filter(c => c.empresaId === currentEmpresa.id);
 
    const pessoas = [
        ...motoristas.map(m => ({ ...m, tipo: 'Motorista' })),
        ...funcionarios.map(f => ({ ...f, tipo: 'Funcionário' })),
        ...clientes.map(c => ({ ...c, tipo: 'Cliente' }))
    ];
 
    const aniversarios = pessoas.map(p => {
        const dataNasc = new Date(p.dataNasc);
        const aniversarioEsteAno = new Date(hoje.getFullYear(), dataNasc.getMonth(), dataNasc.getDate());
        
        if (aniversarioEsteAno < hoje) {
            aniversarioEsteAno.setFullYear(hoje.getFullYear() + 1);
        }
 
        const diasFaltando = Math.ceil((aniversarioEsteAno - hoje) / (1000 * 60 * 60 * 24));
        const idade = hoje.getFullYear() - dataNasc.getFullYear();
 
        return {
            ...p,
            diasFaltando,
            idade,
            aniversarioEsteAno
        };
    }).sort((a, b) => a.diasFaltando - b.diasFaltando);
 
    const html = aniversarios.map(p => {
        const nasc_str = new Date(p.dataNasc).toLocaleDateString('pt-BR');
        const isToday = p.diasFaltando === 0;
        return `
            <div class="birthday-item ${isToday ? 'today' : ''}">
                <div class="birthday-info">
                    <h4>${p.nome}</h4>
                    <p>${p.tipo} • ${nasc_str} • Em ${p.diasFaltando} dias</p>
                </div>
                <div class="birthday-age">${p.idade} anos</div>
            </div>
        `;
    }).join('');
 
    document.getElementById('aniversariosContent').innerHTML = html;
}
 
function deleteItem(type, id) {
    if (confirm('Tem certeza que deseja deletar?')) {
        data[type] = data[type].filter(item => item.id !== id);
        saveData();
        
        if (type === 'motoristas') loadMotoristas();
        else if (type === 'funcionarios') loadFuncionarios();
        else if (type === 'veiculos') loadVeiculos();
        else if (type === 'clientes') loadClientes();
        else if (type === 'abastecimentos') loadAbastecimentos();
        else if (type === 'pneus') loadPneus();
        else if (type === 'oleos') loadOleos();
        else if (type === 'preventivas') loadPreventivas();
        else if (type === 'multas') loadMultas();
        else if (type === 'bancos') loadBancos();
        else if (type === 'financeiro') loadFinanceiro();
        else if (type === 'rotas') loadRotas();
        
        updateDashboard();
    }
}
 
function updateDashboard() {
    const motoristas = data.motoristas.filter(m => m.empresaId === currentEmpresa.id);
    const funcionarios = data.funcionarios.filter(f => f.empresaId === currentEmpresa.id);
    const veiculos = data.veiculos.filter(v => v.empresaId === currentEmpresa.id);
    const clientes = data.clientes.filter(c => c.empresaId === currentEmpresa.id);
    const multas = data.multas.filter(m => m.empresaId === currentEmpresa.id);
 
    document.getElementById('countMotoristas').textContent = motoristas.length;
    document.getElementById('countFuncionarios').textContent = funcionarios.length;
    document.getElementById('countVeiculos').textContent = veiculos.length;
    document.getElementById('countClientes').textContent = clientes.length;
    document.getElementById('countMultas').textContent = multas.length;
 
    const totalGasto = calcularTotalGasto();
    document.getElementById('totalGasto').textContent = 'R$ ' + totalGasto.toFixed(2);
 
    carregarTopGastos();
}
 
function calcularTotalGasto() {
    let total = 0;
    total += data.abastecimentos.filter(a => a.empresaId === currentEmpresa.id).reduce((sum, a) => sum + a.valorTotal, 0);
    total += data.pneus.filter(p => p.empresaId === currentEmpresa.id).reduce((sum, p) => sum + p.valor, 0);
    total += data.oleos.filter(o => o.empresaId === currentEmpresa.id).reduce((sum, o) => sum + o.valor, 0);
    total += data.preventivas.filter(p => p.empresaId === currentEmpresa.id).reduce((sum, p) => sum + p.valor, 0);
    total += data.multas.filter(m => m.empresaId === currentEmpresa.id).reduce((sum, m) => sum + m.valor, 0);
    total += data.financeiro.filter(f => f.tipo === 'saida' && f.empresaId === currentEmpresa.id).reduce((sum, f) => sum + f.valor, 0);
    return total;
}
 
function carregarTopGastos() {
    const gastos = [];
 
    data.abastecimentos.filter(a => a.empresaId === currentEmpresa.id).forEach(a => {
        const veiculo = data.veiculos.find(v => v.id == a.veiculo);
        gastos.push({
            descricao: `Abastecimento - ${veiculo ? veiculo.placa : 'N/A'}`,
            valor: a.valorTotal,
            data: a.data,
            tipo: 'Abastecimento'
        });
    });
 
    data.pneus.filter(p => p.empresaId === currentEmpresa.id).forEach(p => {
        const veiculo = data.veiculos.find(v => v.id == p.veiculo);
        gastos.push({
            descricao: `Pneu - ${veiculo ? veiculo.placa : 'N/A'}`,
            valor: p.valor,
            data: p.data,
            tipo: 'Pneu'
        });
    });
 
    data.oleos.filter(o => o.empresaId === currentEmpresa.id).forEach(o => {
        const veiculo = data.veiculos.find(v => v.id == o.veiculo);
        gastos.push({
            descricao: `Óleo - ${veiculo ? veiculo.placa : 'N/A'}`,
            valor: o.valor,
            data: o.data,
            tipo: 'Óleo'
        });
    });
 
    data.preventivas.filter(p => p.empresaId === currentEmpresa.id).forEach(p => {
        const veiculo = data.veiculos.find(v => v.id == p.veiculo);
        gastos.push({
            descricao: `Preventiva - ${veiculo ? veiculo.placa : 'N/A'}`,
            valor: p.valor,
            data: p.data,
            tipo: 'Preventiva'
        });
    });
 
    data.multas.filter(m => m.empresaId === currentEmpresa.id).forEach(m => {
        const veiculo = data.veiculos.find(v => v.id == m.veiculo);
        gastos.push({
            descricao: `Multa - ${veiculo ? veiculo.placa : 'N/A'}`,
            valor: m.valor,
            data: m.data,
            tipo: 'Multa'
        });
    });
 
    gastos.sort((a, b) => b.valor - a.valor);
    const top10 = gastos.slice(0, 10);
 
    const html = top10.map(g => `
        <div class="gasto-item">
            <div class="gasto-info">
                <h4>${g.descricao}</h4>
                <p>${new Date(g.data).toLocaleDateString('pt-BR')} • ${g.tipo}</p>
            </div>
            <div class="gasto-valor">R$ ${g.valor.toFixed(2)}</div>
        </div>
    `).join('');
 
    document.getElementById('topGastosList').innerHTML = html;
}
 
function criarGraficos() {
    const abastecimentos = data.abastecimentos.filter(a => a.empresaId === currentEmpresa.id);
    const pneus = data.pneus.filter(p => p.empresaId === currentEmpresa.id);
    const oleos = data.oleos.filter(o => o.empresaId === currentEmpresa.id);
    const preventivas = data.preventivas.filter(p => p.empresaId === currentEmpresa.id);
    const multas = data.multas.filter(m => m.empresaId === currentEmpresa.id);
    const financeiro = data.financeiro.filter(f => f.empresaId === currentEmpresa.id);
 
    const totalAbastecimento = abastecimentos.reduce((sum, a) => sum + a.valorTotal, 0);
    const totalPneus = pneus.reduce((sum, p) => sum + p.valor, 0);
    const totalOleos = oleos.reduce((sum, o) => sum + o.valor, 0);
    const totalPreventiva = preventivas.reduce((sum, p) => sum + p.valor, 0);
    const totalMultas = multas.reduce((sum, m) => sum + m.valor, 0);
 
    if (chartGastos) chartGastos.destroy();
    const ctxGastos = document.getElementById('chartGastos').getContext('2d');
    chartGastos = new Chart(ctxGastos, {
        type: 'line',
        data: {
            labels: ['Abastecimentos', 'Pneus', 'Óleos', 'Preventivas', 'Multas'],
            datasets: [{
                label: 'Gastos por Categoria',
                data: [totalAbastecimento, totalPneus, totalOleos, totalPreventiva, totalMultas],
                borderColor: '#0066cc',
                backgroundColor: 'rgba(0, 102, 204, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
 
    if (chartCategorias) chartCategorias.destroy();
    const ctxCategorias = document.getElementById('chartCategorias').getContext('2d');
    chartCategorias = new Chart(ctxCategorias, {
        type: 'doughnut',
        data: {
            labels: ['Abastecimentos', 'Pneus', 'Óleos', 'Preventivas', 'Multas'],
            datasets: [{
                data: [totalAbastecimento, totalPneus, totalOleos, totalPreventiva, totalMultas],
                backgroundColor: [
                    '#0066cc',
                    '#00a3e0',
                    '#4caf50',
                    '#ffc107',
                    '#ff6b6b'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}
 
function filtrarFinanceiro() {
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;
    const tipo = document.getElementById('filtroTipo').value;
    const motivo = document.getElementById('filtroMotivo').value;
 
    let financeiroFiltrado = data.financeiro.filter(f => f.empresaId === currentEmpresa.id);
 
    if (dataInicio) {
        financeiroFiltrado = financeiroFiltrado.filter(f => new Date(f.data) >= new Date(dataInicio));
    }
 
    if (dataFim) {
        financeiroFiltrado = financeiroFiltrado.filter(f => new Date(f.data) <= new Date(dataFim));
    }
 
    if (tipo) {
        financeiroFiltrado = financeiroFiltrado.filter(f => f.tipo === tipo);
    }
 
    if (motivo) {
        financeiroFiltrado = financeiroFiltrado.filter(f => f.motivo === motivo);
    }
 
    const table = document.getElementById('financeiroTable');
    table.innerHTML = financeiroFiltrado.map(f => {
        const banco = data.bancos.find(b => b.id == f.banco);
        return `
            <tr>
                <td>${new Date(f.data).toLocaleDateString('pt-BR')}</td>
                <td>${banco ? banco.nome : 'N/A'}</td>
                <td>${f.tipo === 'entrada' ? '✓ Entrada' : '✗ Saída'}</td>
                <td>${f.motivo}</td>
                <td>${f.descricao}</td>
                <td>R$ ${f.valor.toFixed(2)}</td>
                <td><button class="btn-small" onclick="deleteItem('financeiro', ${f.id})">Deletar</button></td>
            </tr>
        `;
    }).join('');
}
 
function limparFiltros() {
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroMotivo').value = '';
    loadFinanceiro();
}
 
function gerarRelatorio() {
    const periodo = document.getElementById('filtroRelatorio').value;
    const hoje = new Date();
    let dataInicio, dataFim;
 
    if (periodo === 'mes') {
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    } else if (periodo === 'trimestre') {
        const trimestre = Math.floor(hoje.getMonth() / 3);
        dataInicio = new Date(hoje.getFullYear(), trimestre * 3, 1);
        dataFim = new Date(hoje.getFullYear(), trimestre * 3 + 3, 0);
    } else if (periodo === 'semestre') {
        const semestre = Math.floor(hoje.getMonth() / 6);
        dataInicio = new Date(hoje.getFullYear(), semestre * 6, 1);
        dataFim = new Date(hoje.getFullYear(), semestre * 6 + 6, 0);
    } else {
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        dataFim = new Date(hoje.getFullYear(), 11, 31);
    }
 
    let totalEntrada = 0;
    let totalSaida = 0;
 
    data.financeiro.filter(f => f.empresaId === currentEmpresa.id).forEach(f => {
        const dataF = new Date(f.data);
        if (dataF >= dataInicio && dataF <= dataFim) {
            if (f.tipo === 'entrada') {
                totalEntrada += f.valor;
            } else {
                totalSaida += f.valor;
            }
        }
    });
 
    const saldo = totalEntrada - totalSaida;
 
    const resumoHTML = `
        <div class="gasto-item">
            <div class="gasto-info">
                <h4>Total de Entradas</h4>
                <p>Receitas do período</p>
            </div>
            <div class="gasto-valor" style="color: #4caf50;">R$ ${totalEntrada.toFixed(2)}</div>
        </div>
        <div class="gasto-item">
            <div class="gasto-info">
                <h4>Total de Saídas</h4>
                <p>Despesas do período</p>
            </div>
            <div class="gasto-valor" style="color: #ff6b6b;">R$ ${totalSaida.toFixed(2)}</div>
        </div>
        <div class="gasto-item">
            <div class="gasto-info">
                <h4>Saldo</h4>
                <p>Resultado do período</p>
            </div>
            <div class="gasto-valor" style="color: ${saldo >= 0 ? '#4caf50' : '#ff6b6b'};">R$ ${saldo.toFixed(2)}</div>
        </div>
    `;
 
    document.getElementById('resumoFinanceiro').innerHTML = resumoHTML;
 
    const meses = [];
    const entradas = [];
    const saidas = [];
 
    for (let i = 0; i < 12; i++) {
        const mes = new Date(hoje.getFullYear(), i, 1);
        if (mes >= dataInicio && mes <= dataFim) {
            meses.push(mes.toLocaleDateString('pt-BR', { month: 'short' }));
            
            let entrada = 0;
            let saida = 0;
 
            data.financeiro.filter(f => f.empresaId === currentEmpresa.id).forEach(f => {
                const dataF = new Date(f.data);
                if (dataF.getMonth() === i && dataF.getFullYear() === hoje.getFullYear()) {
                    if (f.tipo === 'entrada') {
                        entrada += f.valor;
                    } else {
                        saida += f.valor;
                    }
                }
            });
 
            entradas.push(entrada);
            saidas.push(saida);
        }
    }
 
    if (chartRelatorio) chartRelatorio.destroy();
    const ctxRelatorio = document.getElementById('chartRelatorio').getContext('2d');
    chartRelatorio = new Chart(ctxRelatorio, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Entradas',
                    data: entradas,
                    backgroundColor: '#4caf50'
                },
                {
                    label: 'Saídas',
                    data: saidas,
                    backgroundColor: '#ff6b6b'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
 
function gerarRelatorioRotas() {
    const filtroRota = document.getElementById('filtroRotaRelatorio')?.value || '';
    const table = document.getElementById('rotasGastoTable');
    
    let rotasFiltradas = data.rotas.filter(r => r.empresaId === currentEmpresa.id);
    if (filtroRota) {
        rotasFiltradas = rotasFiltradas.filter(r => r.id == filtroRota);
    }
    
    table.innerHTML = rotasFiltradas.map(r => {
        const veiculo = data.veiculos.find(v => v.id == r.veiculo);
        const motorista = data.motoristas.find(m => m.id == r.motorista);
        
        let gastoRota = 0;
        
        data.abastecimentos.filter(a => a.empresaId === currentEmpresa.id).forEach(a => {
            const dataAb = new Date(a.data);
            const dataRota = new Date(r.dataInicio);
            if (a.veiculo == r.veiculo && dataAb.toDateString() === dataRota.toDateString()) {
                gastoRota += a.valorTotal || 0;
            }
        });
        
        data.pneus.filter(p => p.empresaId === currentEmpresa.id).forEach(p => {
            const dataPneu = new Date(p.data);
            const dataRota = new Date(r.dataInicio);
            if (p.veiculo == r.veiculo && dataPneu.toDateString() === dataRota.toDateString()) {
                gastoRota += p.valor || 0;
            }
        });
        
        data.oleos.filter(o => o.empresaId === currentEmpresa.id).forEach(o => {
            const dataOleo = new Date(o.data);
            const dataRota = new Date(r.dataInicio);
            if (o.veiculo == r.veiculo && dataOleo.toDateString() === dataRota.toDateString()) {
                gastoRota += o.valor || 0;
            }
        });
        
        data.preventivas.filter(p => p.empresaId === currentEmpresa.id).forEach(p => {
            const dataPrev = new Date(p.data);
            const dataRota = new Date(r.dataInicio);
            if (p.veiculo == r.veiculo && dataPrev.toDateString() === dataRota.toDateString()) {
                gastoRota += p.valor || 0;
            }
        });
        
        const custoPorKm = r.kmPercorrido > 0 ? (gastoRota / r.kmPercorrido).toFixed(2) : 0;
        
        return `
            <tr>
                <td>${veiculo ? veiculo.placa : 'N/A'}</td>
                <td>${motorista ? motorista.nome : 'N/A'}</td>
                <td>${r.localSaida}</td>
                <td>${r.destino}</td>
                <td>${new Date(r.dataInicio).toLocaleDateString('pt-BR')}</td>
                <td>${r.kmPercorrido} km</td>
                <td>R$ ${gastoRota.toFixed(2)}</td>
                <td>R$ ${custoPorKm}/km</td>
            </tr>
        `;
    }).join('');
}
 
function preencherFiltroRotas() {
    const selectRotas = document.getElementById('filtroRotaRelatorio');
    const rotasFiltradas = data.rotas.filter(r => r.empresaId === currentEmpresa.id);
    if (selectRotas && rotasFiltradas.length > 0) {
        const opcoesRotas = rotasFiltradas.map(r => {
            const veiculo = data.veiculos.find(v => v.id == r.veiculo);
            const motorista = data.motoristas.find(m => m.id == r.motorista);
            return `<option value="${r.id}">${veiculo?.placa || 'N/A'} - ${motorista?.nome || 'N/A'} (${r.localSaida} → ${r.destino})</option>`;
        }).join('');
        selectRotas.innerHTML = '<option value="">Todas as Rotas</option>' + opcoesRotas;
    }
}
 
function atualizarKMManutencoes() {
    data.rotas.filter(r => r.empresaId === currentEmpresa.id).forEach(rota => {
        data.pneus.filter(p => p.empresaId === currentEmpresa.id).forEach(p => {
            if (p.veiculo == rota.veiculo) {
                const dataRota = new Date(rota.dataInicio);
                const dataPneu = new Date(p.data);
                if (dataPneu <= dataRota) {
                    const rotasPosteriores = data.rotas.filter(r => 
                        r.veiculo == p.veiculo && 
                        r.empresaId === currentEmpresa.id &&
                        new Date(r.dataInicio) >= dataPneu
                    ).sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));
                    
                    if (rotasPosteriores.length > 0) {
                        p.kmAtual = rotasPosteriores[0].kmFim;
                    }
                }
            }
        });
 
        data.oleos.filter(o => o.empresaId === currentEmpresa.id).forEach(o => {
            if (o.veiculo == rota.veiculo) {
                const dataRota = new Date(rota.dataInicio);
                const dataOleo = new Date(o.data);
                if (dataOleo <= dataRota) {
                    const rotasPosteriores = data.rotas.filter(r => 
                        r.veiculo == o.veiculo && 
                        r.empresaId === currentEmpresa.id &&
                        new Date(r.dataInicio) >= dataOleo
                    ).sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));
                    
                    if (rotasPosteriores.length > 0) {
                        o.kmAtual = rotasPosteriores[0].kmFim;
                    }
                }
            }
        });
 
        data.preventivas.filter(p => p.empresaId === currentEmpresa.id).forEach(p => {
            if (p.veiculo == rota.veiculo) {
                const dataRota = new Date(rota.dataInicio);
                const dataPrev = new Date(p.data);
                if (dataPrev <= dataRota) {
                    const rotasPosteriores = data.rotas.filter(r => 
                        r.veiculo == p.veiculo && 
                        r.empresaId === currentEmpresa.id &&
                        new Date(r.dataInicio) >= dataPrev
                    ).sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));
                    
                    if (rotasPosteriores.length > 0) {
                        p.kmAtual = rotasPosteriores[0].kmFim;
                    }
                }
            }
        });
    });
}
 
function calcularValorTotal() {
    const litros = parseFloat(document.getElementById('abastecimentoLitros').value) || 0;
    const valorL = parseFloat(document.getElementById('abastecimentoValorL').value) || 0;
    const valorTotal = litros * valorL;
    document.getElementById('abastecimentoValorTotal').value = valorTotal.toFixed(2);
}
 
// CARREGAR DADOS
function loadData() {
    const savedData = localStorage.getItem(`data_${currentUser.id}`);
    if (savedData) {
        data = JSON.parse(savedData);
    }
    loadMotoristas();
    loadFuncionarios();
    loadVeiculos();
    loadClientes();
    loadAbastecimentos();
    atualizarKMManutencoes();
    loadPneus();
    loadOleos();
    loadPreventivas();
    loadMultas();
    loadBancos();
    loadFinanceiro();
    loadRotas();
    preencherFiltroRotas();
    gerarRelatorioRotas();
}
 
function saveData() {
    localStorage.setItem(`data_${currentUser.id}`, JSON.stringify(data));
}
 
// INICIAR
checkAuth();
 