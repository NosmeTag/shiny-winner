import {
    collection, query, where, addDoc, getDocs, getDoc,
    onSnapshot, doc, deleteDoc, serverTimestamp, writeBatch, setDoc, orderBy, limit
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getDbInstance, getCurrentUser, isAdmin } from './auth.js';
import { COLLECTIONS, NUM_CHROMEBOOKS } from '../config/constants.js';
import { showSuccess, showError, showWarning } from '../ui/toasts.js';

// --- Listeners ---
export const subscribeToMaintenance = (callback) => {
    const db = getDbInstance();
    return onSnapshot(doc(db, COLLECTIONS.CONFIG, "maintenance"), (docSnap) => {
        const list = docSnap.exists() ? (docSnap.data().list || []) : [];
        callback(new Set(list));
    }, (error) => {
        console.warn("Maintenance listener error:", error);
    });
};

export const subscribeToDefects = (callback) => {
    const db = getDbInstance();
    return onSnapshot(doc(db, COLLECTIONS.CONFIG, "defects"), (docSnap) => {
        const data = docSnap.exists() ? docSnap.data().list : {};
        // Normalize data
        let defects = {};
        if (Array.isArray(data)) defects = {}; // Legacy format fix
        else defects = data || {};
        callback(defects);
    }, (error) => {
        console.warn("Defects listener error:", error);
    });
};

export const subscribeToLexReservations = (callback) => {
    const db = getDbInstance();
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, COLLECTIONS.LEX), where('day', '>=', today));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(data);
    });
};

export const subscribeToMyActiveLoans = (userId, callback) => {
    const db = getDbInstance();
    const q = query(collection(db, COLLECTIONS.CHROME), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(data);
    });
};

export const subscribeToAllActiveLoans = (callback) => {
    const db = getDbInstance();
    const q = query(collection(db, COLLECTIONS.CHROME));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(data);
    });
};

export const subscribeToChromeStatus = (callback, errorCallback) => {
    const db = getDbInstance();
    // Fetch ALL active loans (no date/time filter)
    const q = query(collection(db, COLLECTIONS.CHROME));
    return onSnapshot(q, (snapshot) => {
        const reservations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(reservations);
    }, errorCallback);
};

// --- Actions ---

export const reserveLex = async (date, start, end, teacherName) => {
    const db = getDbInstance();
    const user = getCurrentUser();

    // Check availability (Overlap Logic)
    // Existing: Start < NewEnd AND End > NewStart
    const q = query(collection(db, COLLECTIONS.LEX), where('day', '==', date));
    const snap = await getDocs(q);

    const hasConflict = snap.docs.some(doc => {
        const d = doc.data();
        return d.start < end && d.end > start;
    });
    if (hasConflict) throw new Error("Horário ocupado.");

    await addDoc(collection(db, COLLECTIONS.LEX), {
        day: date,
        start: start,
        end: end,
        time: `${start} - ${end}`, // Legacy display support
        reservedBy: user.uid,
        teacherName: teacherName,
        timestamp: serverTimestamp()
    });

    // Notify Admin (Client-side listener handles this)
};

export const deleteLexReservation = async (id) => {
    const db = getDbInstance();
    await deleteDoc(doc(db, COLLECTIONS.LEX, id));
};

export const reserveChromebooks = async (date, start, chromebooksList, teacherName) => {
    const db = getDbInstance();
    const user = getCurrentUser();

    // Check if any selected chromebook is already in an active loan
    // (Double check server-side to prevent race conditions)
    const q = query(collection(db, COLLECTIONS.CHROME));
    const snap = await getDocs(q);
    const activeIds = new Set();
    snap.docs.forEach(d => {
        d.data().chromebooks.forEach(id => activeIds.add(id));
    });

    const conflict = chromebooksList.some(id => activeIds.has(id));
    if (conflict) throw new Error("Um ou mais Chromebooks selecionados já estão em uso.");

    const batch = writeBatch(db);
    // Create a single loan document for the group
    const newRef = doc(collection(db, COLLECTIONS.CHROME));
    batch.set(newRef, {
        userId: user.uid,
        teacherName: teacherName,
        chromebooks: chromebooksList,
        day: date,
        time: start, // Only start time
        timestamp: serverTimestamp()
    });

    await batch.commit();

    // Notify Admin (Client-side listener handles this)
};

export const returnChromebookLoan = async (loanId, specificIds = null) => {
    const db = getDbInstance();
    const docRef = doc(db, COLLECTIONS.CHROME, loanId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const allIds = data.chromebooks || [];

        // If specificIds is null or empty, return ALL
        // If specificIds contains all IDs, return ALL
        const idsToReturn = (specificIds && specificIds.length > 0) ? specificIds : allIds;
        const isFullReturn = idsToReturn.length === allIds.length || idsToReturn.every(id => allIds.includes(id)) && allIds.every(id => idsToReturn.includes(id));

        if (isFullReturn) {
            await addDoc(collection(db, COLLECTIONS.LOGS), {
                ...data,
                status: 'Devolvido',
                returnedAt: serverTimestamp()
            });
            await deleteDoc(docRef);

            // Notify Admin (Client-side listener handles this)
        } else {
            // Partial Return
            const remainingIds = allIds.filter(id => !idsToReturn.includes(id));

            // Log the returned part
            await addDoc(collection(db, COLLECTIONS.LOGS), {
                ...data,
                chromebooks: idsToReturn,
                status: 'Devolvido Parcialmente',
                returnedAt: serverTimestamp()
            });

            // Update the loan with remaining IDs
            await setDoc(docRef, { chromebooks: remainingIds }, { merge: true });
        }
    }
};

export const transferLoan = async (loanId, newUserId, newTeacherName) => {
    const db = getDbInstance();
    const docRef = doc(db, COLLECTIONS.CHROME, loanId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const oldData = docSnap.data();

        // Log the transfer
        await addDoc(collection(db, COLLECTIONS.LOGS), {
            ...oldData,
            status: 'Transferido',
            transferredTo: newTeacherName,
            transferredAt: serverTimestamp()
        });

        // Update the loan owner
        await setDoc(docRef, {
            userId: newUserId,
            teacherName: newTeacherName,
            transferredFrom: oldData.teacherName
        }, { merge: true });
    }
};

// --- Admin Actions ---

export const reportDefect = async (id, reason, reporterName) => {
    const db = getDbInstance();
    const docRef = doc(db, COLLECTIONS.CONFIG, "defects");
    const docSnap = await getDoc(docRef);
    let currentDefects = docSnap.exists() ? (docSnap.data().list || {}) : {};
    if (Array.isArray(currentDefects)) currentDefects = {};

    currentDefects[id] = { reason, reporter: reporterName, date: new Date().toISOString() };
    await setDoc(docRef, { list: currentDefects });
};

export const fixDefect = async (id) => {
    const db = getDbInstance();
    const docRef = doc(db, COLLECTIONS.CONFIG, "defects");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        let currentDefects = docSnap.data().list || {};
        if (Array.isArray(currentDefects)) currentDefects = {};
        delete currentDefects[id];
        await setDoc(docRef, { list: currentDefects });
    }
};

export const toggleMaintenance = async (id, currentSet) => {
    const db = getDbInstance();
    const newSet = new Set(currentSet);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    await setDoc(doc(db, COLLECTIONS.CONFIG, "maintenance"), { list: Array.from(newSet) });
};

// --- Reports ---

export const fetchReportData = async (month) => {
    const db = getDbInstance();
    const startStr = `${month}-01`;
    const endStr = `${month}-31`;

    const [snapLex, snapActive, snapHist] = await Promise.all([
        getDocs(query(collection(db, COLLECTIONS.LEX), where('day', '>=', startStr), where('day', '<=', endStr))),
        getDocs(query(collection(db, COLLECTIONS.CHROME), where('day', '>=', startStr), where('day', '<=', endStr))),
        getDocs(query(collection(db, COLLECTIONS.LOGS), where('day', '>=', startStr), where('day', '<=', endStr)))
    ]);

    return {
        lex: snapLex.docs.map(d => d.data()),
        active: snapActive.docs.map(d => d.data()),
        history: snapHist.docs.map(d => d.data())
    };
};

export const fetchDashboardStats = async () => {
    const db = getDbInstance();

    // Maintenance & Defects
    let maintenanced = 0; let defective = 0;
    try {
        const maintSnap = await getDoc(doc(db, COLLECTIONS.CONFIG, "maintenance"));
        if (maintSnap.exists()) maintenanced = (maintSnap.data().list || []).length;

        const defSnap = await getDoc(doc(db, COLLECTIONS.CONFIG, "defects"));
        if (defSnap.exists()) {
            const d = defSnap.data().list;
            defective = Array.isArray(d) ? 0 : Object.keys(d || {}).length;
        }
    } catch (e) { }

    // Active Loans
    const snap = await getDocs(collection(db, COLLECTIONS.CHROME));
    let inUse = 0; let teacherStats = {};
    snap.forEach(doc => {
        const d = doc.data();
        inUse += d.chromebooks.length;
        teacherStats[d.teacherName] = (teacherStats[d.teacherName] || 0) + d.chromebooks.length;
    });

    return { inUse, maintenanced, defective, teacherStats };
};

export const fetchAllUsers = async () => {
    const db = getDbInstance();
    const snap = await getDocs(collection(db, COLLECTIONS.USERS));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateUser = async (uid, data) => {
    const db = getDbInstance();
    await setDoc(doc(db, COLLECTIONS.USERS, uid), data, { merge: true });
};

export const deleteUser = async (uid) => {
    const db = getDbInstance();
    await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
};

export const fetchRecentLogs = async (limitCount = 50) => {
    const db = getDbInstance();
    const q = query(collection(db, COLLECTIONS.LOGS), orderBy('returnedAt', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
};
