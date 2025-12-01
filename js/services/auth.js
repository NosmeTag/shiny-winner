import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut, updateProfile, sendEmailVerification,
    sendPasswordResetEmail, updatePassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";
import { TECH_EMAIL, COLLECTIONS } from '../config/constants.js';
import { showSuccess, showError } from '../ui/toasts.js';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDYcYJLPcTjBTihLPh-nw0jmCr_2s8SSGI",
    authDomain: "lets-955b6.firebaseapp.com",
    projectId: "lets-955b6",
    storageBucket: "lets-955b6.firebasestorage.app",
    messagingSenderId: "862326216712",
    appId: "1:862326216712:web:b376f2979699a32d6e59bd",
    measurementId: "G-0EG4DG1N55"
};

let app, auth, db, messaging;
let currentUser = null;
let isRegistrationFlow = false;

export const initAuth = (onUserChanged) => {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
            if (isRegistrationFlow) return;
            currentUser = user;
            if (user) {
                try {
                    const snap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
                    if (snap.exists()) {
                        currentUser.role = snap.data().role;
                    }
                } catch (e) { console.error("Error fetching role:", e); }
            }
            onUserChanged(currentUser);
        });

        // Initialize Messaging
        try {
            messaging = getMessaging(app);
        } catch (e) {
            console.warn("Messaging not supported (likely http localhost).");
        }

        return { app, auth, db };
    } catch (error) {
        console.error("Auth Init Error:", error);
        showError("Erro ao inicializar autenticação.");
    }
};

export const requestForToken = async () => {
    if (!messaging) return null;
    try {
        // VAPID Key is required for web push. User must generate this in Firebase Console.
        const currentToken = await getToken(messaging, { vapidKey: 'BFPu_TIhMA6ADBqyamgWHf-NEcjSke0Z8ewiYM4n5rDCwJkRSBHfiih5u1VfoypjSdSl-MdwnHOJtikAWO59F78' });
        if (currentToken) {
            const user = auth.currentUser;
            if (user) {
                await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                    fcmToken: currentToken
                }, { merge: true });
            }
            return currentToken;
        } else {
            console.log('No registration token available.');
            return null;
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
        return null;
    }
};

export const getAuthInstance = () => auth;
export const getDbInstance = () => db;
export const getCurrentUser = () => currentUser;
export const isAdmin = () => currentUser && (currentUser.email === TECH_EMAIL || currentUser.role === 'admin');

export const loginUser = async (email, password) => {
    try {
        if (!email.endsWith('@mopi.com.br') && email !== TECH_EMAIL) {
            throw new Error("Acesso restrito: Utilize seu e-mail @mopi.com.br");
        }
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        console.error(error);
        let msg = "Erro de login/senha.";
        if (error.message.includes("Acesso restrito")) msg = error.message;
        return { success: false, message: msg };
    }
};

export const registerUser = async (name, email, password) => {
    isRegistrationFlow = true;
    try {
        if (!email.endsWith('@mopi.com.br') && email !== TECH_EMAIL) {
            throw new Error("Acesso restrito: Utilize seu e-mail @mopi.com.br");
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });

        // Save user to Firestore
        await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
            name: name,
            email: email,
            role: email === TECH_EMAIL ? 'admin' : 'teacher',
            createdAt: serverTimestamp()
        });

        if (email === TECH_EMAIL) {
            isRegistrationFlow = false;
            // Force trigger state change
            currentUser = cred.user;
            return { success: true, user: cred.user };
        } else {
            await sendEmailVerification(cred.user);
            await signOut(auth);
            isRegistrationFlow = false;
            return { success: true, pendingVerification: true };
        }
    } catch (error) {
        isRegistrationFlow = false;
        console.error(error);
        let msg = "Erro ao cadastrar.";
        if (error.message.includes("Acesso restrito")) msg = error.message;
        else if (error.code === 'auth/email-already-in-use') msg = "Email já cadastrado.";
        return { success: false, message: msg };
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
        showSuccess("Desconectado.");
    } catch (error) {
        console.error(error);
    }
};

export const resetPassword = async (email) => {
    if (!email) return { success: false, message: "Digite seu email." };
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erro ao enviar email de recuperação." };
    }
};

export const resendVerification = async () => {
    if (auth.currentUser) {
        try {
            await sendEmailVerification(auth.currentUser);
            showSuccess('Email reenviado!');
        } catch (e) {
            showError('Aguarde para reenviar.');
        }
    }
};

export const updateUserPassword = async (newPassword) => {
    const user = auth.currentUser;
    if (!user) return { success: false, message: "Usuário não logado." };
    try {
        await updatePassword(user, newPassword);
        return { success: true };
    } catch (error) {
        console.error(error);
        let msg = "Erro ao atualizar senha.";
        if (error.code === 'auth/requires-recent-login') msg = "Faça login novamente para alterar a senha.";
        if (error.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
        return { success: false, message: msg };
    }
};
