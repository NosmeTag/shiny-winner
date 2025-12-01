importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDYcYJLPcTjBTihLPh-nw0jmCr_2s8SSGI",
    authDomain: "lets-955b6.firebaseapp.com",
    projectId: "lets-955b6",
    storageBucket: "lets-955b6.firebasestorage.app",
    messagingSenderId: "862326216712",
    appId: "1:862326216712:web:b376f2979699a32d6e59bd",
    measurementId: "G-0EG4DG1N55"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/imagem/mopi_logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
