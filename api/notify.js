const admin = require("firebase-admin");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log("Found FIREBASE_SERVICE_ACCOUNT, length:", process.env.FIREBASE_SERVICE_ACCOUNT.length);
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("Firebase Admin initialized successfully.");
        } else {
            console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT environment variable is missing.");
        }
    } catch (error) {
        console.error("CRITICAL: Failed to initialize Firebase Admin:", error);
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

    if (!admin.apps.length) {
        return res.status(500).json({ error: 'Firebase Admin not initialized. Check server logs for FIREBASE_SERVICE_ACCOUNT error.' });
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
