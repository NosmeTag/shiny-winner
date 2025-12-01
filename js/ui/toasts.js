export const showSuccess = (message) => {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: { background: "#10b981", borderRadius: "8px", fontWeight: "bold" }
    }).showToast();
};

export const showError = (message) => {
    Toastify({
        text: message,
        duration: 4000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: { background: "#ef4444", borderRadius: "8px", fontWeight: "bold" }
    }).showToast();
};

export const showWarning = (message, options = {}) => {
    Toastify({
        text: message,
        duration: options.duration || 4000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: { background: "#f59e0b", borderRadius: "8px", fontWeight: "bold", color: "#fff" },
        onClick: options.onClick, // Callback after click
        ...options
    }).showToast();
};

let offlineToast = null;
export const showOfflineMessage = (isOffline) => {
    if (isOffline) {
        if (!offlineToast) {
            offlineToast = Toastify({
                text: "📡 Você está offline. Algumas funções podem não funcionar.",
                duration: -1, // Persist
                close: false,
                gravity: "bottom",
                position: "center",
                style: { background: "#334155", borderRadius: "8px", fontWeight: "bold" }
            }).showToast();
        }
    } else {
        if (offlineToast) {
            offlineToast.hideToast();
            offlineToast = null;
            showSuccess("Conexão restabelecida!");
        }
    }
};
