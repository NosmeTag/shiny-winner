import { initAuth, loginUser, registerUser, logoutUser, resetPassword, isAdmin, getCurrentUser, resendVerification, updateUserPassword, requestForToken } from './services/auth.js';
import {
    subscribeToMaintenance, subscribeToDefects, subscribeToLexReservations,
    subscribeToMyActiveLoans, subscribeToAllActiveLoans, subscribeToChromeStatus, reserveLex, deleteLexReservation,
    reserveChromebooks, returnChromebookLoan, transferLoan, reportDefect, fixDefect, toggleMaintenance,
    fetchDashboardStats, fetchReportData, fetchAllUsers, fetchRecentLogs,
    updateUser, deleteUser
} from './services/db.js';
import { renderAuthView, renderDashboardStructure, updateAuthInfo, renderLexList, renderChromebookGrid, renderAdminDefects, renderVerificationPending, renderUserList, renderHistoryLogs, renderProfileView } from './ui/render.js';
import { initDashboardCharts } from './ui/charts.js';
import { showSuccess, showError, showWarning, showOfflineMessage } from './ui/toasts.js';
import { NUM_CHROMEBOOKS } from './config/constants.js';
import { getSlotsInRange, isPastDate, getCurrentTimeSlot, formatDate } from './utils/date.js';
import { getSpinnerHtml } from './utils/helpers.js';
import { showModal, showPrompt, showEditUserModal, showReturnModal, showTransferModal } from './ui/modal.js';

// State
let maintenanceSet = new Set();
let defectiveData = {};
let cbStatus = {};
let selCbs = new Set();
let selectedSlots = [];

// Global State Variables
let unsubscribeChrome = null;
let isAdminMaintenanceMode = false;
let allUsers = [];
let allLogs = [];
let userPage = 1;
let logPage = 1;
const ITEMS_PER_PAGE = 10;
// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initAuth(handleUserChange);

    // Offline/Online Listeners
    window.addEventListener('online', () => showOfflineMessage(false));
    window.addEventListener('offline', () => showOfflineMessage(true));
    if (!navigator.onLine) showOfflineMessage(true);

    // Global Event Delegation
    setupGlobalListeners();
    setupPWAListeners();
});

const handleUserChange = (user) => {
    const header = document.getElementById('main-header');
    if (user) {
        if (!user.emailVerified && !isAdmin()) {
            header?.classList.add('hidden');
            renderVerificationPending(user.email);
            setupPendingListeners();
        } else {
            header?.classList.remove('hidden');
            let userName = user.displayName || user.email.split('@')[0];
            updateAuthInfo(user, userName);
            renderDashboardStructure(userName);
            setupDashboardListeners();

            // Auto-load current status
            const today = new Date().toISOString().split('T')[0];
            const currentSlot = getCurrentTimeSlot();

            const dateInput = document.getElementById('chrome-date');
            if (dateInput) {
                if (dateInput._flatpickr) {
                    dateInput._flatpickr.setDate(today, true);
                } else {
                    dateInput.value = today;
                }
            }

            const timeInput = document.getElementById('chrome-start');
            if (timeInput) {
                const now = new Date();
                now.setMinutes(now.getMinutes() + 2); // Add 2 minutes buffer
                const currentH = now.getHours().toString().padStart(2, '0');
                const currentM = now.getMinutes().toString().padStart(2, '0');
                const currentTime = `${currentH}:${currentM}`;

                if (timeInput._flatpickr) {
                    timeInput._flatpickr.setDate(currentTime, true);
                } else {
                    timeInput.value = currentTime;
                }
            }

            // Load status immediately (Global status)
            loadChromebookStatus();

            if (isAdmin()) {
                document.getElementById('admin-charts-section').classList.remove('hidden');
                document.getElementById('admin-reports-section').classList.remove('hidden');
                document.getElementById('admin-reports-section').classList.remove('hidden');
                // document.getElementById('admin-maintenance-controls').classList.remove('hidden'); // Moved to card
                document.getElementById('admin-defects-panel').classList.remove('hidden');
                document.getElementById('admin-defects-panel').classList.remove('hidden');
                document.getElementById('admin-users-section').classList.remove('hidden');
                document.getElementById('admin-history-section').classList.remove('hidden');

                updateDashboardCharts();
                loadAdminData();
            }
        }
    } else {
        cleanupListeners(); // Stop listening to Firestore
        header?.classList.add('hidden');
        updateAuthInfo(null, "");
        renderAuthView('login');
        setupAuthListeners('login');
    }
};

// --- Listeners Setup ---

const setupAuthListeners = (mode) => {
    const form = document.getElementById('auth-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = getSpinnerHtml('');
            btn.disabled = true;

            const email = form.email.value;

            if (mode === 'reset') {
                const res = await resetPassword(email);
                if (res.success) { showSuccess("Email de recuperação enviado!"); renderAuthView('login'); setupAuthListeners('login'); }
                else { showError(res.message); btn.innerHTML = originalText; btn.disabled = false; }
                return;
            }

            const password = form.password.value;

            if (mode === 'login') {
                const res = await loginUser(email, password);
                if (!res.success) { showError(res.message); btn.innerHTML = originalText; btn.disabled = false; }
            } else {
                const name = form.name.value;
                const res = await registerUser(name, email, password);
                if (!res.success) {
                    showError(res.message);
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                } else {
                    showSuccess("Cadastro realizado! Verifique seu email.");
                    renderAuthView('login');
                    setupAuthListeners('login');
                }
            }
        });
    }

    document.getElementById('switch-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const newMode = mode === 'login' ? 'register' : 'login';
        renderAuthView(newMode);
        setupAuthListeners(newMode);
    });

    document.getElementById('forgot-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderAuthView('reset');
        setupAuthListeners('reset');
    });

    document.getElementById('back-login-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderAuthView('login');
        setupAuthListeners('login');
    });
};

const setupPendingListeners = () => {
    document.getElementById('resend-btn')?.addEventListener('click', resendVerification);
    document.getElementById('logout-btn-pending')?.addEventListener('click', logoutUser);
};

// Listener Unsubscribers
let unsubLex = null;
let unsubMaint = null;
let unsubDefects = null;
let unsubLoans = null;

const cleanupListeners = () => {
    if (unsubLex) { unsubLex(); unsubLex = null; }
    if (unsubMaint) { unsubMaint(); unsubMaint = null; }
    if (unsubDefects) { unsubDefects(); unsubDefects = null; }
    if (unsubLoans) { unsubLoans(); unsubLoans = null; }
    if (unsubscribeChrome) { unsubscribeChrome(); unsubscribeChrome = null; }
};

const setupDashboardListeners = () => {
    document.getElementById('logout-btn')?.addEventListener('click', logoutUser);
    document.getElementById('profile-btn')?.addEventListener('click', () => {
        cleanupListeners(); // Stop dashboard listeners
        renderProfileView(getCurrentUser());
        setupProfileListeners();
    });

    // Lex
    document.getElementById('reserve-lex-btn')?.addEventListener('click', handleLexReservation);
    // Subscription moved to isAdmin block for notifications

    // Chrome
    document.getElementById('load-chrome-btn')?.addEventListener('click', () => {
        const timeInput = document.getElementById('chrome-start');
        if (timeInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 2);
            const h = now.getHours().toString().padStart(2, '0');
            const m = now.getMinutes().toString().padStart(2, '0');
            const newTime = `${h}:${m}`;
            if (timeInput._flatpickr) timeInput._flatpickr.setDate(newTime, true);
            else timeInput.value = newTime;
        }
        loadChromebookStatus();
    });
    document.getElementById('loan-btn')?.addEventListener('click', handleChromebookReservation);
    document.getElementById('auto-select-btn')?.addEventListener('click', autoSelectChromebooks);

    // Admin
    if (isAdmin()) {
        document.getElementById('maintenance-toggle')?.addEventListener('change', (e) => {
            isAdminMaintenanceMode = e.target.checked;
            const grid = document.getElementById('chromebook-selector');
            if (isAdminMaintenanceMode) grid.classList.add('editing-maintenance');
            else grid.classList.remove('editing-maintenance');
        });

        document.getElementById('download-excel-btn')?.addEventListener('click', () => downloadReport('excel'));
        document.getElementById('download-pdf-btn')?.addEventListener('click', () => downloadReport('pdf'));
    }

    // Status Listeners
    if (unsubMaint) unsubMaint();
    unsubMaint = subscribeToMaintenance((set) => {
        maintenanceSet = set;
        refreshGrid();
        if (isAdmin()) updateDashboardCharts();
    });

    if (unsubDefects) unsubDefects();
    unsubDefects = subscribeToDefects((data) => {
        defectiveData = data;
        refreshGrid();
        if (isAdmin()) { renderAdminDefects(data); updateDashboardCharts(); }
    });

    if (unsubLoans) unsubLoans();
    const loansCallback = (data) => {
        const container = document.getElementById('my-active-loans-container');
        if (!container) return;
        const list = document.getElementById('my-active-list');
        const title = container.querySelector('h4');

        if (data.length === 0) { container.classList.add('hidden'); return; }
        container.classList.remove('hidden');

        if (isAdmin()) {
            title.innerHTML = `⚡ Chromebooks em Uso (Todos) <span class="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">${data.length}</span>`;
            container.classList.remove('bg-blue-50', 'border-blue-100');
            container.classList.add('bg-red-50', 'border-red-100');
        } else {
            title.innerHTML = `⚡ Meus Chromebooks`;
            container.classList.remove('bg-red-50', 'border-red-100');
            container.classList.add('bg-blue-50', 'border-blue-100');
        }

        const sorted = data.sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time));
        list.innerHTML = sorted.map(d => `
            <div class="active-loan-card flex justify-between items-center p-3 bg-white rounded shadow-sm mb-2 border-l-4 ${isAdmin() ? 'border-red-500' : 'border-[#00264d]'}">
                <div>
                    <span class="block text-xs text-gray-500 font-bold uppercase">${formatDate(d.day)} • ${d.time}</span>
                    <span class="block text-sm font-bold text-[#00264d]">${isAdmin() ? `<span class="text-red-600 mr-1">●</span> ${d.teacherName}` : `CBs: ${d.chromebooks.join(', ')}`}</span>
                    ${isAdmin() ? `<span class="block text-xs text-gray-400 mt-1">CBs: ${d.chromebooks.join(', ')}</span>` : ''}
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="window.dispatchEvent(new CustomEvent('report-defect', {detail: {id: '${d.id}', list: [${d.chromebooks}]}}))" class="text-yellow-500 hover:text-yellow-600 text-xl" title="Reportar Defeito">⚠️</button>
                    <button onclick="window.dispatchEvent(new CustomEvent('transfer-loan-request', {detail: '${d.id}'}))" class="text-blue-500 hover:text-blue-700 font-bold text-xs uppercase tracking-wide border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 transition-colors" title="Transferir Responsabilidade">Transferir</button>
                    <button onclick="window.dispatchEvent(new CustomEvent('return-loan-request', {detail: {id: '${d.id}', list: [${d.chromebooks}]}}))" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-xs shadow-sm transition-colors">DEVOLVER</button>
                </div>
            </div>`).join('');
    };

    if (isAdmin()) {
        // Check permission on load
        if ("Notification" in window && Notification.permission === "default") {
            showWarning("⚠️ Clique aqui para ativar notificações de novas reservas", {
                duration: -1, // Persistent
                onClick: () => {
                    Notification.requestPermission().then(p => {
                        if (p === 'granted') {
                            showSuccess("Notificações ativadas!");
                            // requestForToken(); // Removed FCM
                        }
                    });
                }
            });
        }

        unsubLoans = subscribeToAllActiveLoans((data) => {
            // Check for new loans and returns
            const currentIds = new Set(data.map(d => d.id));

            if (previousLoanIds !== null) {
                // New Loans
                data.forEach(loan => {
                    if (!previousLoanIds.has(loan.id)) {
                        sendNotification("Nova Reserva!", `Professor(a) ${loan.teacherName} reservou Chromebooks.`);
                    }
                });

                // Returns (Loans that disappeared)
                previousLoanIds.forEach(id => {
                    if (!currentIds.has(id)) {
                        sendNotification("Devolução Realizada", "Um empréstimo de Chromebooks foi finalizado.");
                    }
                });
            }
            // Update previous IDs
            previousLoanIds = currentIds;

            loansCallback(data);
        });

        // Lex Notifications
        if (unsubLex) unsubLex();
        unsubLex = subscribeToLexReservations((data) => {
            if (previousLexIds !== null) {
                data.forEach(res => {
                    if (!previousLexIds.has(res.id)) {
                        sendNotification("Reserva Sala Lets", `Nova reserva para ${res.date} às ${res.startTime}.`);
                    }
                });
            }
            previousLexIds = new Set(data.map(d => d.id));
            renderLexList(data, getCurrentUser().uid);
        });

    } else {
        unsubLoans = subscribeToMyActiveLoans(getCurrentUser().uid, loansCallback);

        // Lex (Non-admin just renders)
        if (unsubLex) unsubLex();
        unsubLex = subscribeToLexReservations((data) => renderLexList(data, getCurrentUser().uid));
    }

    // Check if already granted
    if (isAdmin() && "Notification" in window && Notification.permission === "granted") {
        // requestForToken(); // Removed FCM
    }
};

// --- Notification Logic ---
let previousLoanIds = null;
let previousLexIds = null;

function sendNotification(title, body) {
    if (Notification.permission === "granted") {
        try {
            const notif = new Notification(title, {
                body: body,
                icon: './imagem/mopi_logo.png',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                tag: 'new-reservation'
            });
            notif.onclick = () => {
                window.focus();
                notif.close();
            };
        } catch (e) {
            console.error("Notification Error:", e);
        }
    }
}

const setupGlobalListeners = () => {
    window.addEventListener('delete-lex', (e) => {
        showModal({
            title: "Cancelar Reserva",
            content: "Tem certeza que deseja cancelar esta reserva?",
            confirmText: "Sim, cancelar",
            onConfirm: () => deleteLexReservation(e.detail).catch(err => showError("Erro ao cancelar."))
        });
    });

    window.addEventListener('toggle-cb', (e) => handleCbToggle(e.detail));

    window.addEventListener('fix-defect', (e) => {
        showModal({
            title: "Consertar Chromebook",
            content: "Confirmar que este Chromebook foi consertado e está pronto para uso?",
            confirmText: "Sim, liberar",
            onConfirm: () => fixDefect(e.detail).then(() => showSuccess("Liberado!")).catch(() => showError("Erro."))
        });
    });

    window.addEventListener('return-loan-request', async (e) => {
        const idsToReturn = await showReturnModal({ chromebooks: e.detail.list });
        if (idsToReturn) {
            try {
                await returnChromebookLoan(e.detail.id, idsToReturn);
                showSuccess("Devolução realizada!");
                if (isAdmin()) { updateDashboardCharts(); loadAdminData(); }
            } catch (err) {
                console.error(err);
                showError("Erro ao devolver.");
            }
        }
    });

    window.addEventListener('transfer-loan-request', async (e) => {
        // Ensure users are loaded
        if (allUsers.length === 0) allUsers = await fetchAllUsers();

        const targetUser = await showTransferModal({ users: allUsers });
        if (targetUser) {
            try {
                await transferLoan(e.detail, targetUser.id, targetUser.name);
                showSuccess(`Transferido para ${targetUser.name}!`);
                if (isAdmin()) { updateDashboardCharts(); loadAdminData(); }
            } catch (err) {
                console.error(err);
                showError("Erro ao transferir.");
            }
        }
    });

    window.addEventListener('report-defect', (e) => handleReportDefectUI(e.detail.id, e.detail.list));

    window.addEventListener('delete-user', async (e) => {
        const confirm = await showModal({
            title: "Excluir Usuário?",
            message: `Tem certeza que deseja remover < b > ${e.detail.name}</b >? Essa ação não pode ser desfeita.`,
            confirmText: "Excluir",
            cancelText: "Cancelar",
            type: "danger"
        });

        if (confirm) {
            try {
                await deleteUser(e.detail.id);
                showSuccess("Usuário removido.");
                loadAdminData();
            } catch (err) {
                console.error(err);
                if (err.message.includes("offline") || err.code === 'unavailable' || err.message.includes("BLOCKED")) {
                    showError("Erro de conexão. Verifique bloqueadores de anúncios.");
                } else {
                    showError("Erro ao excluir: " + err.message);
                }
            }
        }
    });

    window.addEventListener('edit-user', async (e) => {
        const result = await showEditUserModal({
            currentName: e.detail.name,
            currentRole: e.detail.role,
            currentDept: e.detail.department
        });

        if (result) {
            try {
                await updateUser(e.detail.id, { name: result.name, role: result.role, department: result.dept });
                showSuccess("Usuário atualizado!");
                loadAdminData();
            } catch (err) {
                console.error(err);
                if (err.message.includes("offline") || err.code === 'unavailable' || err.message.includes("BLOCKED")) {
                    showError("Erro de conexão. Verifique se algum bloqueador de anúncios está impedindo o acesso.");
                } else {
                    showError("Erro ao atualizar: " + err.message);
                }
            }
        }
    });
};

const setupProfileListeners = () => {
    document.getElementById('back-dashboard-btn')?.addEventListener('click', () => {
        handleUserChange(getCurrentUser()); // Reload dashboard
    });

    document.getElementById('profile-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const p1 = e.target.newPassword.value;
        const p2 = e.target.confirmPassword.value;

        if (p1 !== p2) return showError("As senhas não conferem.");

        const btn = document.getElementById('save-password-btn');
        const original = btn.innerHTML;
        btn.innerHTML = getSpinnerHtml(''); btn.disabled = true;

        const res = await updateUserPassword(p1);
        if (res.success) {
            showSuccess("Senha atualizada!");
            e.target.reset();
        } else {
            showError(res.message);
        }
        btn.innerHTML = original; btn.disabled = false;
    });
};

// --- Logic Handlers ---

async function handleLexReservation() {
    const d = document.getElementById('lex-date').value;
    const start = document.getElementById('lex-start').value;
    const end = document.getElementById('lex-end').value;

    if (!d || !start || !end) return showError("Dados incompletos.");
    if (start >= end) return showError("O início deve ser antes do fim.");

    // Duration Validation (Max 3 hours)
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const durationMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);

    if (durationMinutes > 180) return showError("Máximo de 3 horas por reserva.");

    // Past Date Validation
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentTime = `${currentH.toString().padStart(2, '0')}: ${currentM.toString().padStart(2, '0')}`;

    if (d < today) return showError("Não é possível reservar no passado.");
    if (d === today && start < currentTime) return showError("Horário já passou.");

    const btn = document.getElementById('reserve-lex-btn');
    const originalTxt = btn.innerText;
    btn.innerHTML = '...'; btn.disabled = true;

    try {
        await reserveLex(d, start, end, getCurrentUser().displayName || getCurrentUser().email);
        showSuccess("Reservado!");
    } catch (e) {
        showError(e.message || "Erro ao reservar.");
    } finally {
        btn.innerText = originalTxt; btn.disabled = false;
    }
};

function loadChromebookStatus() {
    const d = document.getElementById('chrome-date').value;
    const start = document.getElementById('chrome-start').value;

    // if (!d || !start) return showError("Dados incompletos."); // Removed to allow auto-load

    if (unsubscribeChrome) unsubscribeChrome();

    document.getElementById('chromebook-selector').innerHTML = '<div class="col-span-full flex justify-center py-8"><div class="spinner"></div></div>';

    unsubscribeChrome = subscribeToChromeStatus((reservations) => {
        cbStatus = {}; selCbs.clear();

        let countFree = 0; let countBusy = 0;
        for (let i = 1; i <= NUM_CHROMEBOOKS; i++) cbStatus[i] = 'available';

        reservations.forEach(res => {
            if (res.chromebooks) {
                res.chromebooks.forEach(num => { cbStatus[num] = 'loaned'; });
            }
        });

        for (let i = 1; i <= NUM_CHROMEBOOKS; i++) {
            if (maintenanceSet.has(i) || defectiveData[i]) { /* none */ }
            else if (cbStatus[i] === 'loaned') { countBusy++; }
            else { countFree++; }
        }

        const statFree = document.getElementById('stat-free'); if (statFree) statFree.innerText = countFree;
        const statBusy = document.getElementById('stat-busy'); if (statBusy) statBusy.innerText = countBusy;

        refreshGrid();
    }, (e) => showError("Erro ao carregar status."));
};

function handleCbToggle(id) {
    if (isAdminMaintenanceMode) {
        toggleMaintenance(id, maintenanceSet).catch(console.error);
        return;
    }
    if (defectiveData[id]) return showWarning("Reportado com defeito.");
    if (maintenanceSet.has(id)) return showWarning("Manutenção.");
    if (cbStatus[id] === 'loaned') return;

    selCbs.has(id) ? selCbs.delete(id) : selCbs.add(id);
    refreshGrid();
    updateButtonsState();
};

function refreshGrid() {
    renderChromebookGrid(NUM_CHROMEBOOKS, cbStatus, maintenanceSet, defectiveData, selCbs, isAdminMaintenanceMode);
};

function updateButtonsState() {
    const lBtn = document.getElementById('loan-btn');
    const count = document.getElementById('selected-count');
    if (count) count.innerText = selCbs.size;
    if (lBtn) lBtn.disabled = selCbs.size === 0;
};

function autoSelectChromebooks() {
    const qtyInput = document.getElementById('auto-qty');
    const qty = parseInt(qtyInput.value);
    if (!qty || qty <= 0) return showWarning("Qtd inválida.");
    if (qty > NUM_CHROMEBOOKS) return showWarning(`Máximo ${NUM_CHROMEBOOKS}.`);

    let needed = qty;
    selCbs.clear();
    for (let i = 1; i <= NUM_CHROMEBOOKS; i++) {
        if (needed === 0) break;
        if (!maintenanceSet.has(i) && !defectiveData[i] && cbStatus[i] !== 'loaned') { selCbs.add(i); needed--; }
    }
    refreshGrid();
    updateButtonsState();
    if (needed > 0) showError(`Apenas ${qty - needed} disponíveis.`);
};

async function handleChromebookReservation() {
    const d = document.getElementById('chrome-date').value;
    const start = document.getElementById('chrome-start').value;
    // const end = document.getElementById('chrome-end').value; // Removed

    // Past Date Validation
    if (isPastDate(d, start)) return showError("Não é possível reservar no passado.");

    if (!d || !start) return showError("Dados incompletos.");

    const btn = document.getElementById('loan-btn');
    btn.innerHTML = getSpinnerHtml(''); btn.disabled = true;

    try {
        const cbsList = Array.from(selCbs).sort((a, b) => a - b);
        await reserveChromebooks(d, start, cbsList, getCurrentUser().displayName || getCurrentUser().email);

        showSuccess("Reservado!");
        selCbs.clear();
        if (isAdmin()) { updateDashboardCharts(); loadAdminData(); }
    } catch (e) {
        console.error(e);
        showError(e.message || "Erro ao reservar.");
    } finally {
        btn.innerHTML = `Confirmar(<span id="selected-count">0</span>)`;
    }
};

async function handleReportDefectUI(loanId, chromebooksList) {
    const targetId = await showPrompt({
        title: "Reportar Defeito",
        message: `Qual o número do Chromebook com defeito ? (Opções: ${chromebooksList.join(', ')
            })`,
        placeholder: "Ex: 12"
    });

    if (!targetId) return;
    const idInt = parseInt(targetId);

    if (!chromebooksList.includes(idInt)) return showError("Número inválido. O Chromebook deve fazer parte deste empréstimo.");

    const reason = await showPrompt({
        title: "Descreva o Problema",
        message: "O que está acontecendo com o Chromebook?",
        placeholder: "Ex: Tecla 'A' não funciona..."
    });

    if (!reason) return;

    try {
        await reportDefect(idInt, reason, getCurrentUser().displayName);
        showWarning(`Reportado!`);
    } catch (e) { showError("Erro."); }
};

const updateDashboardCharts = async () => {
    const stats = await fetchDashboardStats();
    initDashboardCharts(stats);
};

const loadAdminData = async () => {
    try {
        allUsers = await fetchAllUsers();
        allLogs = await fetchRecentLogs(100); // Fetch more for pagination

        updateAdminViews();
        setupAdminListeners();
    } catch (e) {
        console.error("Erro ao carregar dados admin:", e);
    }
};

const updateAdminViews = () => {
    // Users Logic
    const userSearch = document.getElementById('user-search')?.value.toLowerCase() || '';
    const filteredUsers = allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(userSearch)) ||
        (u.email && u.email.toLowerCase().includes(userSearch))
    );

    const totalUserPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
    if (userPage > totalUserPages) userPage = totalUserPages;

    const startUser = (userPage - 1) * ITEMS_PER_PAGE;
    const paginatedUsers = filteredUsers.slice(startUser, startUser + ITEMS_PER_PAGE);

    renderUserList(paginatedUsers);

    document.getElementById('user-page-info').innerText = `${userPage}/${totalUserPages}`;
    document.getElementById('user-prev-btn').disabled = userPage === 1;
    document.getElementById('user-next-btn').disabled = userPage === totalUserPages;

    // Logs Logic
    const logSearch = document.getElementById('history-search')?.value.toLowerCase() || '';
    const filteredLogs = allLogs.filter(l =>
        (l.teacherName && l.teacherName.toLowerCase().includes(logSearch)) ||
        (l.chromebooks && l.chromebooks.join(',').includes(logSearch))
    );

    const totalLogPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
    if (logPage > totalLogPages) logPage = totalLogPages;

    const startLog = (logPage - 1) * ITEMS_PER_PAGE;
    const paginatedLogs = filteredLogs.slice(startLog, startLog + ITEMS_PER_PAGE);

    renderHistoryLogs(paginatedLogs);

    document.getElementById('history-page-info').innerText = `${logPage}/${totalLogPages}`;
    document.getElementById('history-prev-btn').disabled = logPage === 1;
    document.getElementById('history-next-btn').disabled = logPage === totalLogPages;
};

const setupAdminListeners = () => {
    // Avoid duplicate listeners
    const userSearch = document.getElementById('user-search');
    if (userSearch && !userSearch.dataset.listening) {
        userSearch.dataset.listening = "true";
        userSearch.addEventListener('input', () => { userPage = 1; updateAdminViews(); });
        document.getElementById('user-prev-btn').addEventListener('click', () => { if (userPage > 1) { userPage--; updateAdminViews(); } });
        document.getElementById('user-next-btn').addEventListener('click', () => { userPage++; updateAdminViews(); });
    }

    const logSearch = document.getElementById('history-search');
    if (logSearch && !logSearch.dataset.listening) {
        logSearch.dataset.listening = "true";
        logSearch.addEventListener('input', () => { logPage = 1; updateAdminViews(); });
        document.getElementById('history-prev-btn').addEventListener('click', () => { if (logPage > 1) { logPage--; updateAdminViews(); } });
        document.getElementById('history-next-btn').addEventListener('click', () => { logPage++; updateAdminViews(); });
    }
};

const downloadReport = async (type) => {
    const month = document.getElementById('report-month').value;
    if (!month) return showWarning("Selecione um mês.");

    const btnId = type === 'excel' ? 'download-excel-btn' : 'download-pdf-btn';
    const btn = document.getElementById(btnId);
    const originalTxt = btn.innerHTML;
    btn.innerHTML = '...'; btn.disabled = true;

    try {
        const data = await fetchReportData(month);
        const flatData = [];

        data.lex.forEach(r => flatData.push({ Data: formatDate(r.day), Hora: r.time, Recurso: "Espaço Let's", Professor: r.teacherName, Detalhes: "-", Status: "Agendado" }));
        data.active.forEach(r => flatData.push({ Data: formatDate(r.day), Hora: r.time, Recurso: "Chromebooks", Professor: r.teacherName, Detalhes: r.chromebooks.join(', '), Status: "Em Uso" }));
        data.history.forEach(r => flatData.push({ Data: formatDate(r.day), Hora: r.time, Recurso: "Chromebooks", Professor: r.teacherName, Detalhes: r.chromebooks.join(', '), Status: "Devolvido" }));

        flatData.sort((a, b) => {
            const dateA = a.Data.split('/').reverse().join('-');
            const dateB = b.Data.split('/').reverse().join('-');
            return dateA.localeCompare(dateB) || a.Hora.localeCompare(b.Hora);
        });

        if (flatData.length === 0) { showWarning("Sem dados."); return; }

        if (type === 'excel') {
            const ws = XLSX.utils.json_to_sheet(flatData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
            XLSX.writeFile(wb, `Mopi_${month}.xlsx`);
        } else {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text(`Relatório Mopi: ${month}`, 14, 20);
            doc.autoTable({
                head: [["Data", "Hora", "Recurso", "Prof", "Detalhes", "Status"]],
                body: flatData.map(i => [i.Data, i.Hora, i.Recurso, i.Professor, i.Detalhes, i.Status]),
                startY: 30
            });
            doc.save(`Mopi_${month}.pdf`);
        }
        showSuccess("Baixado!");
    } catch (e) {
        console.error(e); showError("Erro ao baixar relatório.");
    } finally {
        btn.innerHTML = originalTxt; btn.disabled = false;
    }
};

// --- PWA Logic ---
let deferredPrompt;

const setupPWAListeners = () => {
    const installBtn = document.getElementById('install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.classList.remove('hidden');
    });

    installBtn?.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        }
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        installBtn?.classList.add('hidden');
        showSuccess("App instalado com sucesso!");
    });
};
