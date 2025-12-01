export const showModal = ({ title, content, onConfirm, confirmText = "Confirmar", cancelText = "Cancelar", showCancel = true }) => {
    // Remove existing modal if any
    const existing = document.getElementById('custom-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100">
            <h3 class="text-lg font-bold text-[#00264d] mb-2">${title}</h3>
            <div class="text-gray-600 mb-6">${content}</div>
            <div class="flex justify-end gap-3">
                ${showCancel ? `<button id="modal-cancel" class="px-4 py-2 rounded text-gray-500 hover:bg-gray-100 font-medium transition-colors">${cancelText}</button>` : ''}
                <button id="modal-confirm" class="px-4 py-2 rounded bg-[#00264d] text-white hover:bg-[#003366] font-bold shadow-md transition-transform transform active:scale-95">${confirmText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        const close = (result) => {
            modal.remove();
            resolve(result);
        };

        confirmBtn.onclick = () => {
            if (onConfirm) onConfirm();
            close(true);
        };

        if (cancelBtn) {
            cancelBtn.onclick = () => close(false);
        }

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal && showCancel) close(false);
        };
    });
};

export const showPrompt = ({ title, message, placeholder = "" }) => {
    const existing = document.getElementById('custom-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 class="text-lg font-bold text-[#00264d] mb-2">${title}</h3>
            <p class="text-gray-600 mb-3 text-sm">${message}</p>
            <input type="text" id="modal-input" class="w-full border border-gray-300 rounded p-2 mb-4 focus:outline-none focus:border-[#00264d]" placeholder="${placeholder}">
            <div class="flex justify-end gap-3">
                <button id="modal-cancel" class="px-4 py-2 rounded text-gray-500 hover:bg-gray-100 font-medium">Cancelar</button>
                <button id="modal-confirm" class="px-4 py-2 rounded bg-[#00264d] text-white hover:bg-[#003366] font-bold">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('modal-input').focus();

    return new Promise((resolve) => {
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        const input = document.getElementById('modal-input');

        const close = (val) => {
            modal.remove();
            resolve(val);
        };

        confirmBtn.onclick = () => {
            const val = input.value.trim();
            if (val) close(val);
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') close(null);
        };

        cancelBtn.onclick = () => close(null);
    });
};

export const showEditUserModal = ({ currentName, currentRole, currentDept }) => {
    const existing = document.getElementById('custom-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';

    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 class="text-lg font-bold text-[#00264d] mb-4">Editar Usuário</h3>
            
            <div class="mb-4">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                <input type="text" id="edit-name" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-[#00264d]" value="${currentName}">
            </div>

            <div class="mb-4">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Setor / Departamento</label>
                <select id="edit-dept" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-[#00264d]">
                    <option value="" ${!currentDept ? 'selected' : ''}>- Sem Setor -</option>
                    <option value="fund1" ${currentDept === 'fund1' ? 'selected' : ''}>Coordenação Fund 1</option>
                    <option value="fund2" ${currentDept === 'fund2' ? 'selected' : ''}>Coordenação Fund 2</option>
                    <option value="tech" ${currentDept === 'tech' ? 'selected' : ''}>Tecnologia</option>
                    <option value="admin" ${currentDept === 'admin' ? 'selected' : ''}>Administrativo</option>
                </select>
            </div>

            <div class="mb-6">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Função</label>
                <select id="edit-role" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-[#00264d]">
                    <option value="teacher" ${currentRole !== 'admin' ? 'selected' : ''}>Professor</option>
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Administrador</option>
                </select>
            </div>

            <div class="flex justify-end gap-3">
                <button id="modal-cancel" class="px-4 py-2 rounded text-gray-500 hover:bg-gray-100 font-medium">Cancelar</button>
                <button id="modal-confirm" class="px-4 py-2 rounded bg-[#00264d] text-white hover:bg-[#003366] font-bold">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        const nameInput = document.getElementById('edit-name');
        const deptInput = document.getElementById('edit-dept');
        const roleInput = document.getElementById('edit-role');

        const close = (val) => {
            modal.remove();
            resolve(val);
        };

        confirmBtn.onclick = () => {
            const name = nameInput.value.trim();
            const dept = deptInput.value;
            const role = roleInput.value;
            if (name) close({ name, dept, role });
        };

        cancelBtn.onclick = () => close(null);

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) close(null);
        };
    });
};
export const showReturnModal = ({ chromebooks }) => {
    const existing = document.getElementById('custom-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';

    const cbListHtml = chromebooks.map(id => `
        <label class="flex items-center gap-3 p-2 border rounded hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" value="${id}" checked class="w-5 h-5 text-[#00264d] rounded focus:ring-[#00264d]">
            <span class="font-bold text-[#00264d]">Chromebook ${id}</span>
        </label>
    `).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 class="text-lg font-bold text-[#00264d] mb-4">Devolução</h3>
            <p class="text-sm text-gray-600 mb-4">Selecione os Chromebooks que serão devolvidos:</p>
            
            <div class="grid grid-cols-2 gap-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                ${cbListHtml}
            </div>

            <div class="flex justify-end gap-3">
                <button id="modal-cancel" class="px-4 py-2 rounded text-gray-500 hover:bg-gray-100 font-medium">Cancelar</button>
                <button id="modal-confirm" class="px-4 py-2 rounded bg-[#00264d] text-white hover:bg-[#003366] font-bold">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');

        const close = (val) => {
            modal.remove();
            resolve(val);
        };

        confirmBtn.onclick = () => {
            const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
            const selected = Array.from(checkboxes).map(cb => parseInt(cb.value));
            if (selected.length > 0) close(selected);
            else close(null);
        };

        cancelBtn.onclick = () => close(null);
        modal.onclick = (e) => { if (e.target === modal) close(null); };
    });
};

export const showTransferModal = ({ users }) => {
    const existing = document.getElementById('custom-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';

    const options = users.map(u => `<option value="${u.id}">${u.name || u.email}</option>`).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 class="text-lg font-bold text-[#00264d] mb-4">Transferir Responsabilidade</h3>
            <p class="text-sm text-gray-600 mb-4">Selecione o professor que assumirá este empréstimo:</p>
            
            <div class="mb-6">
                <select id="transfer-user" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-[#00264d]">
                    <option value="">Selecione um professor...</option>
                    ${options}
                </select>
            </div>

            <div class="flex justify-end gap-3">
                <button id="modal-cancel" class="px-4 py-2 rounded text-gray-500 hover:bg-gray-100 font-medium">Cancelar</button>
                <button id="modal-confirm" class="px-4 py-2 rounded bg-[#00264d] text-white hover:bg-[#003366] font-bold">Transferir</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        const select = document.getElementById('transfer-user');

        const close = (val) => {
            modal.remove();
            resolve(val);
        };

        confirmBtn.onclick = () => {
            const userId = select.value;
            const userName = select.options[select.selectedIndex].text;
            if (userId) close({ id: userId, name: userName });
        };

        cancelBtn.onclick = () => close(null);
        modal.onclick = (e) => { if (e.target === modal) close(null); };
    });
};
