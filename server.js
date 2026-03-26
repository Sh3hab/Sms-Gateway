const express = require('express');
const session = require('express-session');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'S0m3_S3cr3t_K3y_2026!_#',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));


const DB_PATH = path.join(__dirname, 'database.json');


async function initDB() {
    if (!await fs.pathExists(DB_PATH)) {
        const initialDB = {
            settings: {
                recipient: '',
                totalCount: 1,
                intervalSec: 2,
                signatureEnabled: false,
                signatureText: '\n\n-- بوت رسائل نصيه',
                gatewayUrl: 'http://127.0.0.1:8080/send-sms'
            },
            keywords: ['مرحباً', 'كيف حالك؟', 'أتمنى لك يوماً سعيداً', 'هذه رسالة تجريبية', 'مع تحيات البوت'],
            logs: [],
            users: [] 
        };
        await fs.writeJson(DB_PATH, initialDB, { spaces: 2 });
    }
}


async function readDB() {
    return fs.readJson(DB_PATH);
}

async function writeDB(data) {
    return fs.writeJson(DB_PATH, data, { spaces: 2 });
}

const otpStore = new Map();


setInterval(() => {
    const now = Date.now();
    for (const [phone, data] of otpStore.entries()) {
        if (data.expires < now) otpStore.delete(phone);
    }
}, 8 * 60 * 1000);

function generateRandomMessage(keywords, signatureEnabled, signatureText) {
    if (!keywords.length) return 'رسالة افتراضية' + (signatureEnabled ? signatureText : '');
    

    const maxWords = Math.min(5, keywords.length);
    const wordCount = Math.floor(Math.random() * (maxWords - 1 + 1)) + 1; // at least 1

    const shuffled = [...keywords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, wordCount);
    let message = selected.join(' ');

    if (signatureEnabled) message += signatureText;
    return message;
}

let sendingActive = false;
let currentJob = null; 

async function sendSMS(gatewayUrl, recipient, text) {
    try {
        
        const response = await axios.post(gatewayUrl, {
            to: recipient,
            message: text
        }, { timeout: 10000 });
        return { success: true, response: response.data };
    } catch (error) {
        console.error('SMS sending failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function sendotp(gatewayUrl, phone, otptext) {
    try {

        const response = await axios.post(gatewayUrl, {
            to: phone,
            message: otptext
        }, { timeout: 10000 });
        return { success: true, response: response.data };
    } catch (error) {
        console.error('otp sending failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function runSendingJob() {
    if (!currentJob) return;
    
    const { recipient, total, interval, signatureEnabled, signatureText, gatewayUrl, keywords } = currentJob;
    let sentCount = 0;
    
    while (sendingActive && sentCount < total) {
        
        const messageText = generateRandomMessage(keywords, signatureEnabled, signatureText);
        const logId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const result = await sendSMS(gatewayUrl, recipient, messageText);
        
        const logEntry = {
            id: logId,
            text: messageText,
            time: timestamp,
            status: result.success ? 'success' : 'failed',
            recipient: recipient,
            error: result.error || null
        };
        
       
        const db = await readDB();
        db.logs.unshift(logEntry); 

        if (db.logs.length > 500) db.logs = db.logs.slice(0, 500);
        await writeDB(db);
        
        sentCount++;
        currentJob.sentCount = sentCount;
        

        if (sendingActive && sentCount < total) {
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }
    }
    

    sendingActive = false;
    currentJob = null;
}

app.post('/api/login/send-otp', async (req, res) => {
    const { phone, username } = req.body;
    if (!phone || !username) {
        return res.status(400).json({ error: 'Phone and username required' });
    }
    
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 8 * 60 * 1000; 
    otpStore.set(phone, { otp, expires, username });
    
    const otptext = (`OTP is: ${otp}`);
    
    console.log(`OTP for ${phone}: ${otp}`);
    const result = await sendotp(`http://127.0.0.1:8080/send-sms`, phone, otptext);

    
    
    res.json({ message: 'OTP sent (simulated)', otp: otp });
});

app.post('/api/login/verify', (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP required' });
    }
    
    const stored = otpStore.get(phone);
    if (!stored) {
        return res.status(401).json({ error: 'OTP expired or not requested' });
    }
    
    if (stored.otp !== otp) {
        return res.status(401).json({ error: 'Invalid OTP' });
    }
    

    req.session.user = {
        phone: phone,
        username: stored.username,
        loginTime: Date.now()
    };
    

    otpStore.delete(phone);
    
    res.json({ success: true, user: req.session.user });
});


app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});


app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});


app.get('/api/settings', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const db = await readDB();
    res.json(db.settings);
});


app.post('/api/settings', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const newSettings = req.body;
    const db = await readDB();
    db.settings = { ...db.settings, ...newSettings };
    await writeDB(db);
    res.json({ success: true, settings: db.settings });
});


app.get('/api/keywords', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const db = await readDB();
    res.json({ keywords: db.keywords });
});


app.post('/api/keywords', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { keywords } = req.body;
    if (!Array.isArray(keywords)) {
        return res.status(400).json({ error: 'Keywords must be an array' });
    }
    const db = await readDB();
    db.keywords = keywords;
    await writeDB(db);
    res.json({ success: true, keywords: db.keywords });
});


app.get('/api/logs', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const db = await readDB();
    res.json({ logs: db.logs.slice(0, 800) });
});


app.post('/api/logs/clear', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const db = await readDB();
    db.logs = [];
    await writeDB(db);
    res.json({ success: true });
});


app.post('/api/start', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    
    if (sendingActive) {
        return res.status(400).json({ error: 'Job already running' });
    }
    
    
    const db = await readDB();
    const { settings, keywords } = db;
    

    if (!settings.recipient) {
        return res.status(400).json({ error: 'Recipient number is required' });
    }
    if (!settings.gatewayUrl) {
        return res.status(400).json({ error: 'Gateway URL is required' });
    }
    if (settings.totalCount <= 0) {
        return res.status(400).json({ error: 'Total count must be > 0' });
    }
    
    currentJob = {
        recipient: settings.recipient,
        total: settings.totalCount,
        interval: settings.intervalSec,
        signatureEnabled: settings.signatureEnabled,
        signatureText: settings.signatureText,
        gatewayUrl: settings.gatewayUrl,
        keywords: keywords,
        sentCount: 0
    };
    
    sendingActive = true;

    runSendingJob().catch(err => {
        console.error('Job error:', err);
        sendingActive = false;
        currentJob = null;
    });
    
    res.json({ success: true, message: 'Sending started' });
});


app.post('/api/stop', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    
    if (!sendingActive) {
        return res.status(400).json({ error: 'No active job' });
    }
    
    sendingActive = false;
    res.json({ success: true, message: 'Sending stopped' });
});


app.get('/api/status', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    
    if (sendingActive && currentJob) {
        res.json({
            active: true,
            total: currentJob.total,
            sent: currentJob.sentCount,
            remaining: currentJob.total - currentJob.sentCount
        });
    } else {
        res.json({ active: false });
    }
});


app.post('/api/test-send', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { recipient, message, gatewayUrl } = req.body;
    if (!recipient || !message || !gatewayUrl) {
        return res.status(400).json({ error: 'Recipient, message and gateway URL required' });
    }
    
    const result = await sendSMS(gatewayUrl, recipient, message);
    res.json(result);
});

async function startServer() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Access the dashboard at http://localhost:${PORT}`);
    });
}

startServer();