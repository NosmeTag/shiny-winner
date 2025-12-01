const admin = require("firebase-admin");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    // We expect the service account to be passed as a JSON string in the environment variable
    // FIREBASE_SERVICE_ACCOUNT
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        console.error("FIREBASE_SERVICE_ACCOUNT environment variable not set.");
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { title, body } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Missing title or body' });
        }

        // Fetch all admin tokens from Firestore
        // Note: In a serverless function, we can use the admin SDK to query Firestore directly
        const db = admin.firestore();
        const adminsSnapshot = await db.collection("users")
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
            return res.status(200).json({ message: 'No admin tokens found, but executed successfully.' });
        }

        const message = {
            notification: {
                title: title,
                body: body,
            },
            tokens: tokens,
        };

        const response = await admin.messaging().sendMulticast(message);
        console.log("Notifications sent:", response.successCount);

        return res.status(200).json({
            success: true,
            sentCount: response.successCount,
            failureCount: response.failureCount
        });

    } catch (error) {
        console.error("Error sending notification:", error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};
