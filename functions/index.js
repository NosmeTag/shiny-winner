const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendNewReservationNotification = functions.firestore
    .document("reservas_chromebooks_agendamento/{docId}")
    .onCreate(async (snap, context) => {
        const newData = snap.data();
        const teacherName = newData.teacherName;

        // Get all admin users
        const adminsSnapshot = await admin.firestore()
            .collection("users")
            .where("role", "==", "admin")
            .get();

        const tokens = [];
        adminsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken) {
                tokens.push(data.fcmToken);
            }
        });

        if (tokens.length === 0) {
            console.log("No admin tokens found.");
            return null;
        }

        const message = {
            notification: {
                title: "Nova Reserva de Chromebooks!",
                body: `Professor(a) ${teacherName} acabou de fazer uma reserva.`,
            },
            tokens: tokens,
        };

        try {
            const response = await admin.messaging().sendMulticast(message);
            console.log("Notifications sent:", response.successCount);
        } catch (error) {
            console.error("Error sending notifications:", error);
        }
    });

exports.sendLexNotification = functions.firestore
    .document("reservas_sala_lex/{docId}")
    .onCreate(async (snap, context) => {
        const newData = snap.data();
        const teacherName = newData.teacherName || "Alguém";

        const adminsSnapshot = await admin.firestore()
            .collection("users")
            .where("role", "==", "admin")
            .get();

        const tokens = [];
        adminsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken) tokens.push(data.fcmToken);
        });

        if (tokens.length === 0) return null;

        const message = {
            notification: {
                title: "Reserva Sala Lets",
                body: `Nova reserva feita por ${teacherName}.`,
            },
            tokens: tokens,
        };

        await admin.messaging().sendMulticast(message);
    });

exports.sendReturnNotification = functions.firestore
    .document("reservas_chromebooks_agendamento/{docId}")
    .onDelete(async (snap, context) => {
        const deletedData = snap.data();
        const teacherName = deletedData.teacherName;

        const adminsSnapshot = await admin.firestore()
            .collection("users")
            .where("role", "==", "admin")
            .get();

        const tokens = [];
        adminsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken) tokens.push(data.fcmToken);
        });

        if (tokens.length === 0) return null;

        const message = {
            notification: {
                title: "Devolução Realizada",
                body: `Os Chromebooks de ${teacherName} foram devolvidos.`,
            },
            tokens: tokens,
        };

        await admin.messaging().sendMulticast(message);
    });
