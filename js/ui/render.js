import { getSpinnerHtml, createTimeOptions } from '../utils/helpers.js';
import { formatDate } from '../utils/date.js';
import { isAdmin } from '../services/auth.js';

export const renderAuthView = (mode) => {
    const isLogin = mode === 'login';
    const isReset = mode === 'reset';

    const container = document.getElementById('app-view');

    if (isReset) {
        container.innerHTML = `
            <div class="max-w-md mx-auto mt-10 bg-white card p-10 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-2 bg-[#00264d]"></div>
                <div class="flex flex-col items-center mb-8">
                    <img src="./imagem/mopi_logo.png" alt="Logo Mopi" class="h-20 object-contain mb-4">
                    <h2 class="text-2xl font-montserrat font-bold text-[#00264d] text-center">Recuperar Senha</h2>
                </div>
                <form id="auth-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Email Cadastrado</label>
                        <input type="email" name="email" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#fcb900] outline-none" placeholder="usuario@mopi.com.br">
                    </div>
                    <button type="submit" id="submit-btn" class="w-full btn-mopi-primary mt-4 shadow-lg">Enviar Email</button>
                </form>
                <div class="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
                    <a href="#" id="back-login-btn" class="text-[#00264d] font-bold hover:underline">Voltar para Login</a>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="max-w-md mx-auto mt-10 bg-white card p-10 relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-[#00264d]"></div>
            <div class="flex flex-col items-center mb-8">
                <img src="./imagem/mopi_logo.png" alt="Logo Mopi" class="h-20 object-contain mb-4">
                <h2 class="text-2xl font-montserrat font-bold text-[#00264d] text-center">${isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
            </div>
            <form id="auth-form" class="space-y-5">
                ${!isLogin ? `<div><label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label><input type="text" name="name" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#fcb900] outline-none" placeholder="Ex: João Silva"></div>` : ''}
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Email Institucional</label>
                    <input type="email" name="email" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#fcb900] outline-none" placeholder="usuario@mopi.com.br">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                    <input type="password" name="password" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#fcb900] outline-none" placeholder="••••••••">
                </div>
                ${isLogin ? `<div class="text-right"><a href="#" id="forgot-btn" class="text-xs text-gray-400 hover:text-[#00264d]">Esqueceu a senha?</a></div>` : ''}
                <button type="submit" id="submit-btn" class="w-full btn-mopi-primary mt-4 shadow-lg">${isLogin ? 'Entrar' : 'Cadastrar'}</button>
            </form>
            <div class="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
                ${isLogin ? 'Novo por aqui? <a href="#" id="switch-btn" class="text-[#00264d] font-bold hover:underline">Criar conta</a>' : 'Já possui conta? <a href="#" id="switch-btn" class="text-[#00264d] font-bold hover:underline">Fazer Login</a>'}
            </div>
        </div>`;
};

export const renderVerificationPending = (email) => {
    document.getElementById('app-view').innerHTML = `
        <div class="max-w-lg mx-auto mt-10 bg-white card p-10 text-center">
            <h2 class="text-2xl font-bold text-[#00264d] mb-2 font-montserrat">Verifique seu Email</h2>
            <p class="text-gray-600 mb-8">Link enviado para <strong>${email}</strong></p>
            <button id="resend-btn" class="btn-mopi-secondary w-full">Reenviar Email</button>
            <button id="logout-btn-pending" class="text-xs text-red-400 font-bold uppercase tracking-wide mt-4">Sair</button>
        </div>`;
};

export const renderDashboardStructure = (userName) => {
    document.getElementById('app-view').innerHTML = `
        <div class="mb-10 text-center md:text-left">
            <h2 class="text-3xl md:text-4xl font-montserrat font-bold text-[#00264d]">Painel de Reservas</h2>
            <p class="text-gray-500 mt-2 text-lg">Bem-vindo, ${userName}.</p>
        </div>

        <div id="admin-charts-section" class="hidden grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-white card p-6"><h3 class="text-[#00264d] font-bold font-montserrat mb-4 text-center">Top Reservas (Semana)</h3><div class="chart-wrapper"><canvas id="chart-ranking"></canvas></div></div>
            <div class="bg-white card p-6"><h3 class="text-[#00264d] font-bold font-montserrat mb-4 text-center">Status dos Chromes</h3><div class="chart-wrapper"><canvas id="chart-status"></canvas></div></div>
        </div>

        <div id="admin-defects-panel" class="hidden bg-white card mb-8 p-6 border-l-4 border-yellow-400">
            <h3 class="text-lg font-bold text-[#00264d] mb-4 flex items-center">⚠️ Chamados de Manutenção (Abertos)</h3>
            <div id="admin-defects-list" class="space-y-2"><p class="text-gray-400 italic text-sm">Nenhum chamado aberto.</p></div>
        </div>
        
        <div id="my-active-loans-container" class="hidden bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 rounded shadow-sm animate-fade-in">
            <h4 class="text-sm font-bold text-[#00264d] mb-3 uppercase tracking-wide">⚡ Meus Chromebooks</h4>
            <div id="my-active-list"></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <section class="bg-white card overflow-hidden flex flex-col h-full">
                <div class="bg-gray-50 p-5 border-b border-gray-100 flex justify-between items-center"><h3 class="text-lg font-bold text-[#00264d] flex items-center"><span class="w-2 h-6 bg-[#fcb900] mr-3 rounded-full"></span> Espaço Let's</h3></div>
                <div class="p-6 flex-grow flex flex-col">
                    <div class="flex flex-col gap-4 mb-6">
                        <input type="text" id="lex-date" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#00264d]" placeholder="Data">
                        <div class="flex gap-2 items-center"><div class="flex-grow"><label class="text-[10px] text-gray-400 font-bold uppercase">Início</label><input type="text" id="lex-start" class="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" placeholder="00:00"></div><span class="text-gray-300 pt-4">➝</span><div class="flex-grow"><label class="text-[10px] text-gray-400 font-bold uppercase">Fim</label><input type="text" id="lex-end" class="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" placeholder="00:00"></div></div>
                        <button id="reserve-lex-btn" class="btn-mopi-primary w-full">Reservar Período</button>
                    </div>
                    <div class="mt-6"><h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Agenda do Dia</h4><div id="lex-list" class="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar"><p class="text-gray-400 text-sm italic">Selecione uma data.</p></div></div>
                </div>
            </section>

            <section class="bg-white card overflow-hidden flex flex-col h-full">
                <div class="bg-[#00264d] p-5 border-b border-gray-100 text-white flex justify-between items-center gap-3">
                    <h3 class="text-lg font-bold flex items-center"><span class="w-2 h-6 bg-[#fcb900] mr-3 rounded-full"></span> Chromebooks</h3>
                    <div class="flex gap-2">
                        <span class="text-[10px] bg-green-500 text-white px-2 py-1 rounded shadow-sm font-bold" title="Disponíveis">LIVRES: <span id="stat-free">--</span></span>
                        <span class="text-[10px] bg-red-500 text-white px-2 py-1 rounded shadow-sm font-bold" title="Em Uso">USADOS: <span id="stat-busy">--</span></span>
                    </div>
                </div>
                <div class="p-6 flex-grow flex flex-col">
                    <div class="flex flex-col gap-4 mb-6">
                        <input type="text" id="chrome-date" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#00264d]" placeholder="Data de Uso">
                        <div class="flex gap-2 items-center">
                            <div class="flex-grow">
                                <label class="text-[10px] text-gray-400 font-bold uppercase">Pegar às</label>
                                <input type="text" id="chrome-start" class="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" placeholder="00:00">
                            </div>
                            <button id="load-chrome-btn" class="bg-blue-100 text-[#00264d] p-2 rounded-lg hover:bg-blue-200 transition" title="Atualizar Status">🔄</button>
                        </div>
                    </div>

                    <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-xs font-bold text-gray-500 uppercase">Seleção Rápida</span>
                            ${isAdmin() ? `<div class="flex items-center gap-2"><span class="text-[10px] font-bold text-red-500 uppercase">Manutenção</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="maintenance-toggle" class="sr-only peer"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div></label></div>` : ''}
                        </div>
                        <div class="flex gap-2">
                            <input type="number" id="auto-qty" min="1" max="40" class="w-16 p-2 text-center border rounded text-sm" placeholder="Qtd">
                            <button id="auto-select-btn" class="flex-grow btn-mopi-secondary text-xs">Selecionar Automático</button>
                        </div>
                    </div>

                    <div id="chromebook-selector" class="grid grid-cols-5 gap-2 mb-6 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                        <!-- Grid rendered by JS -->
                    </div>

                    <button id="loan-btn" class="btn-mopi-primary w-full mt-auto" disabled>Confirmar (<span id="selected-count">0</span>)</button>
                </div>
            </section>
        </div>

        <div id="admin-users-section" class="hidden bg-white card mb-8 p-6">
            <h3 class="text-lg font-bold text-[#00264d] mb-4">Gestão de Usuários</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-xs text-gray-400 uppercase border-b border-gray-100">
                            <th class="p-3">Nome</th>
                            <th class="p-3">Email</th>
                            <th class="p-3">Role</th>
                            <th class="p-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="users-list-body" class="text-sm text-gray-600"></tbody>
                </table>
            </div>
        </div>

        <div id="admin-history-section" class="hidden bg-white card mb-8 p-6">
            <h3 class="text-lg font-bold text-[#00264d] mb-4">Histórico Recente</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-xs text-gray-400 uppercase border-b border-gray-100">
                            <th class="p-3">Data/Hora</th>
                            <th class="p-3">Recurso</th>
                            <th class="p-3">Detalhes</th>
                            <th class="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody id="history-list-body" class="text-sm text-gray-600"></tbody>
                </table>
            </div>
        </div>

        <section id="admin-reports-section" class="hidden bg-white card overflow-hidden mb-20">
            <div class="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div><h3 class="text-lg font-bold text-[#00264d]">Histórico & Relatórios</h3></div>
                <div class="flex gap-2 w-full md:w-auto">
                    <input type="month" id="report-month" class="p-2 border rounded-lg text-sm w-full md:w-40">
                    <button id="download-excel-btn" class="btn-mopi-secondary text-xs">📊 Excel</button>
                    <button id="download-pdf-btn" class="bg-red-50 text-red-600 border border-red-200 font-bold rounded-full px-4 py-2 text-xs hover:bg-red-100 transition">📄 PDF</button>
                </div>
            </div>
        </section>`;

    // Init Flatpickr
    const fpConfig = { locale: "pt", dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", minDate: "today", maxDate: new Date().fp_incr(30), disableMobile: false };
    flatpickr("#lex-date", fpConfig);
    flatpickr("#chrome-date", fpConfig);

    // Init Selects
    // Init Flatpickr Time Pickers (24h)
    const timeConfig = { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, disableMobile: true, locale: "pt" };
    flatpickr("#lex-start", timeConfig);
    flatpickr("#lex-end", timeConfig);
    flatpickr("#chrome-start", timeConfig);

    // Removed Selects Init
};

export const updateAuthInfo = (user, userName) => {
    const el = document.getElementById('auth-info');
    if (!el) return;
    if (user && user.email) {
        const adminBadge = isAdmin() ? '<span class="bg-red-500 text-white text-[9px] px-1 rounded ml-1">ADMIN</span>' : '';
        el.innerHTML = `<div class="flex items-center space-x-4"><div class="text-right hidden md:block"><span class="block font-bold text-sm text-[#fcb900]">${userName.toUpperCase()} ${adminBadge}</span><span class="block text-[10px] text-gray-300 tracking-wide">Professor(a)</span></div><button id="logout-btn" class="text-xs font-bold text-white border border-white/30 hover:bg-white/10 rounded-full px-4 py-2 transition uppercase tracking-wider">Sair</button></div>`;
    } else { el.innerHTML = ''; }
};

export const renderLexList = (reservations, currentUserId) => {
    const el = document.getElementById('lex-list');
    if (!el) return;

    // Sort
    const sorted = reservations.sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time));

    el.innerHTML = sorted.length ? sorted.map(x => `
        <div class="flex justify-between items-center p-3 rounded-lg border border-gray-100 ${x.reservedBy === currentUserId ? 'bg-blue-50 border-blue-200' : 'bg-white'}">
            <div><span class="text-[#00264d] font-bold block">${formatDate(x.day)}</span><span class="text-xs text-gray-500">${x.time} • <span class="uppercase font-bold">${x.teacherName}</span></span></div>
            ${(x.reservedBy === currentUserId || isAdmin()) ? `<button onclick="window.dispatchEvent(new CustomEvent('delete-lex', {detail: '${x.id}'}))" class="text-red-400 hover:text-red-600 font-bold px-2">✕</button>` : ''}
        </div>`).join('') : '<p class="text-gray-400 text-sm italic py-2">Nenhuma reserva.</p>';
};

export const renderChromebookGrid = (numChromebooks, cbStatus, maintenanceSet, defectiveData, selCbs, isAdminMaintenanceMode) => {
    const selEl = document.getElementById('chromebook-selector');
    if (!selEl) return;

    if (isAdminMaintenanceMode) selEl.classList.add('editing-maintenance');
    else selEl.classList.remove('editing-maintenance');

    let html = '';
    for (let i = 1; i <= numChromebooks; i++) {
        let css = 'available';
        if (defectiveData[i]) { css = 'defective'; }
        else if (maintenanceSet.has(i)) { css = 'maintenance'; }
        else if (cbStatus[i] === 'loaned') { css = 'loaned'; }
        else if (selCbs.has(i)) { css = 'selected'; }
        html += `<div onclick="window.dispatchEvent(new CustomEvent('toggle-cb', {detail: ${i}}))" class="chromebook-item ${css}">${i}</div>`;
    }
    selEl.innerHTML = html;
};

export const renderAdminDefects = (defectiveData) => {
    const list = document.getElementById('admin-defects-list');
    if (!list) return;
    const ids = Object.keys(defectiveData);
    if (ids.length === 0) { list.innerHTML = '<p class="text-gray-400 italic text-sm">Nenhum chamado aberto.</p>'; return; }
    list.innerHTML = ids.map(id => {
        const info = defectiveData[id] || { reason: 'Desconhecido', reporter: 'Sistema' };
        return `
        <div class="defect-card">
            <div><span class="block font-bold text-[#00264d]">Chromebook ${id}</span><span class="block text-xs text-red-600 font-bold mt-1">Defeito: ${info.reason}</span><span class="block text-[10px] text-gray-500 mt-1">Report: ${info.reporter}</span></div>
            <button onclick="window.dispatchEvent(new CustomEvent('fix-defect', {detail: '${id}'}))" class="btn-fix">Consertado</button>
        </div>`;
    }).join('');
};

const getDeptColor = (dept) => {
    switch (dept) {
        case 'fund1': return 'bg-blue-100 text-blue-700';
        case 'fund2': return 'bg-green-100 text-green-700';
        case 'tech': return 'bg-purple-100 text-purple-700';
        case 'admin': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-50 text-gray-500';
    }
};

const getDeptLabel = (dept) => {
    switch (dept) {
        case 'fund1': return 'Fund 1';
        case 'fund2': return 'Fund 2';
        case 'tech': return 'Tecnologia';
        case 'admin': return 'Admin';
        default: return dept;
    }
};

export const renderUserList = (users) => {
    const tbody = document.getElementById('users-list-body');
    if (!tbody) return;

    // Search & Pagination UI (Only render once)
    const container = document.getElementById('admin-users-section');
    if (container && !document.getElementById('user-search')) {
        const controls = document.createElement('div');
        controls.className = "flex justify-between items-center mb-4";
        controls.innerHTML = `
            <input type="text" id="user-search" placeholder="Buscar usuário..." class="p-2 border rounded text-sm w-64">
            <div class="flex gap-2">
                <button id="user-prev-btn" class="px-3 py-1 border rounded text-xs disabled:opacity-50">Anterior</button>
                <span id="user-page-info" class="text-xs font-bold self-center">1/1</span>
                <button id="user-next-btn" class="px-3 py-1 border rounded text-xs disabled:opacity-50">Próximo</button>
            </div>
        `;
        container.insertBefore(controls, container.querySelector('.overflow-x-auto'));
    }

    tbody.innerHTML = users.map(u => `
        <tr class="border-b border-gray-50 hover:bg-gray-50">
            <td class="p-3 font-medium text-[#00264d]">
                ${u.name || '-'}
                ${u.department ? `<span class="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getDeptColor(u.department)}">${getDeptLabel(u.department)}</span>` : ''}
            </td>
            <td class="p-3">${u.email}</td>
            <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${u.email === 'mersoficial@gmail.com' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}">${u.email === 'mersoficial@gmail.com' ? 'ADMIN' : 'USER'}</span></td>
            <td class="p-3 flex gap-2">
                <button onclick="window.dispatchEvent(new CustomEvent('edit-user', {detail: {id: '${u.id}', name: '${u.name || ''}', role: '${u.role || 'teacher'}', department: '${u.department || ''}'}}))" class="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wide border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors">Editar</button>
                ${u.email !== 'mersoficial@gmail.com' ? `<button onclick="window.dispatchEvent(new CustomEvent('delete-user', {detail: {id: '${u.id}', name: '${u.name || u.email}'}}))" class="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-wide border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors">Excluir</button>` : ''}
            </td>
        </tr>
    `).join('');
};
export const renderHistoryLogs = (logs) => {
    const tbody = document.getElementById('history-list-body');
    if (!tbody) return;

    // Search & Pagination UI (Only render once)
    const container = document.getElementById('admin-history-section');
    if (container && !document.getElementById('history-search')) {
        const controls = document.createElement('div');
        controls.className = "flex justify-between items-center mb-4";
        controls.innerHTML = `
            <input type="text" id="history-search" placeholder="Buscar no histórico..." class="p-2 border rounded text-sm w-64">
            <div class="flex gap-2">
                <button id="history-prev-btn" class="px-3 py-1 border rounded text-xs disabled:opacity-50">Anterior</button>
                <span id="history-page-info" class="text-xs font-bold self-center">1/1</span>
                <button id="history-next-btn" class="px-3 py-1 border rounded text-xs disabled:opacity-50">Próximo</button>
            </div>
        `;
        container.insertBefore(controls, container.querySelector('.overflow-x-auto'));
    }

    tbody.innerHTML = logs.map(l => `
        <tr class="border-b border-gray-50 hover:bg-gray-50">
            <td class="p-3 text-xs">
                <div class="font-bold">${formatDate(l.day)}</div>
                <div class="text-gray-400">${l.time}</div>
            </td>
            <td class="p-3 text-sm font-medium">Chromebooks</td>
            <td class="p-3 text-xs text-gray-500">
                <div class="font-bold text-[#00264d]">${l.teacherName}</div>
                <div>IDs: ${l.chromebooks ? l.chromebooks.join(', ') : '-'}</div>
            </td>
            <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Devolvido</span></td>
        </tr>
    `).join('');
};

export const renderProfileView = (user) => {
    const container = document.getElementById('app-view');
    if (!container) return;

    container.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <div class="bg-white card p-8 mb-6">
                <div class="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                    <div class="bg-[#00264d] text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold">
                        ${user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-[#00264d]">${user.displayName || 'Usuário'}</h2>
                        <p class="text-gray-500">${user.email}</p>
                        <span class="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wide">
                            ${user.email === 'mersoficial@gmail.com' ? 'Administrador' : 'Professor'}
                        </span>
                    </div>
                </div>

                <form id="profile-password-form" class="space-y-6">
                    <h3 class="text-lg font-bold text-[#00264d] mb-4">Alterar Senha</h3>
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
                        <input type="password" name="newPassword" required minlength="6" 
                            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#fcb900] outline-none transition-all" 
                            placeholder="Mínimo 6 caracteres">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Nova Senha</label>
                        <input type="password" name="confirmPassword" required minlength="6" 
                            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#fcb900] outline-none transition-all" 
                            placeholder="Repita a senha">
                    </div>

                    <div class="flex gap-4 pt-4">
                        <button type="button" id="back-dashboard-btn" class="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors">
                            Voltar
                        </button>
                        <button type="submit" id="save-password-btn" class="flex-1 btn-mopi-primary shadow-lg">
                            Atualizar Senha
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
};
