const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const puppeteer = require('puppeteer');
const fs = require('fs'); 


const { ajoutuser } = require('./fonctions/ajoutuser');
const { modifuser} = require('./fonctions/modifuser');
const { montreuser } = require('./fonctions/montreuser');
const { ajoutauteur } = require('./fonctions/ajoutauteur');
const { modifauteur } = require('./fonctions/modifauteur');
const { montreauteur } = require('./fonctions/montreauteur');
const { ajoutfournisseur } = require('./fonctions/ajoutfournisseur');
const { modiffournisseur } = require('./fonctions/modiffournisseur');
const { montrefournisseur } = require('./fonctions/montrefournisseur');
const { dependancelivre} = require('./fonctions/dependancelivre');
const { ajoutlivre } = require('./fonctions/ajoutlivre');
const { montrelivre } = require('./fonctions/montrelivre');
const { dependancelivre2 } = require('./fonctions/dependancelivre2');
const { modiflivre } = require('./fonctions/modiflivre');
const { dependanceemprunt } = require('./fonctions/dependanceemprunt');
const { ajoutemprunt } = require('./fonctions/ajoutemprunt');
const { montreemprunt } = require('./fonctions/montreemprunt');
const { dependanceemprunt2 } = require('./fonctions/dependanceemprunt2');
const { modifemprunt } = require('./fonctions/modifemprunt');
const { dashboard } = require('./fonctions/dashboard');
const { generationpdf } = require('./fonctions/generationpdf');
const { admin } = require('./fonctions/admin');


const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bibliotheque',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool; 
const openWindows = new Set();
let currentActiveWindow = null; 
let accessMode = 'none';
const authAttempts = new Map();
const AUTH_WINDOW_MS = 60 * 1000;
const MAX_AUTH_ATTEMPTS = 5;

const ADMIN_WINDOWS = new Set(['index.html', 'dash.html', 'utilisateur.html', 'voir_utilisateur.html', 'livre.html', 'voir_livre.html', 'auteur.html', 'voir_auteur.html', 'fournisseur.html', 'voir_fournisseur.html', 'emprunt.html', 'voir_emprunt.html']);
const VISITOR_WINDOWS = new Set(['indexvis.html', 'voir_livrevis.html', 'voir_auteurvis.html']);



async function migrateDatabase(pool) {
    try {
        await pool.query("ALTER TABLE livre MODIFY COLUMN statut_livre ENUM('disponible', 'vide', 'emprunté') NOT NULL DEFAULT 'disponible';");
    } catch (e) {
        console.log('Migration statut_livre notice:', e.message);
    }
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM livre LIKE 'exemplaire_livre';");
        if (columns.length === 0) {
            await pool.query("ALTER TABLE livre ADD COLUMN exemplaire_livre INT NOT NULL DEFAULT 1;");
            console.log("Colonne exemplaire_livre ajoutée avec succès.");
        }
    } catch (e) {
        console.error("Erreur migration exemplaire_livre:", e.message);
    }
}

function createAdminOnlyIpc(ipc) {
    return {
        on(channel, listener) {
            ipc.on(channel, (event, ...args) => {
                if (accessMode !== 'admin') {
                    console.warn(`Tentative d'accès non autorisée au canal admin : ${channel}`);
                    const responseChannel = `${channel}-response`;
                    event.sender.send(responseChannel, {
                        success: false,
                        message: "Accès refusé : privilèges administrateur requis."
                    });
                    return;
                }
                return listener(event, ...args);
            });
        }
    };
}

function createSharedIpc(ipc) {
    return {
        on(channel, listener) {
            ipc.on(channel, (event, ...args) => {
                if (accessMode !== 'admin' && accessMode !== 'visitor') {
                    console.warn(`Tentative d'accès non autorisée au canal partagé : ${channel}`);
                    const responseChannel = `${channel}-response`;
                    event.sender.send(responseChannel, {
                        success: false,
                        message: "Accès refusé : session non authentifiée."
                    });
                    return;
                }
                return listener(event, ...args);
            });
        }
    };
}

function initializeDatabasePool() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('connexion à MySQL créé avec succès.');
        
        migrateDatabase(pool);

        const adminIpc = createAdminOnlyIpc(ipcMain);
        const sharedIpc = createSharedIpc(ipcMain);

        ajoutuser(adminIpc, pool);
        modifuser(adminIpc, pool);
        montreuser(adminIpc, pool);
        ajoutauteur(adminIpc, pool);
        modifauteur(adminIpc, pool);
        montreauteur(sharedIpc, pool);
        ajoutfournisseur(adminIpc, pool);
        modiffournisseur(adminIpc, pool);
        montrefournisseur(adminIpc, pool);
        dependancelivre(adminIpc, pool);
        ajoutlivre(adminIpc, pool);
        montrelivre(sharedIpc, pool);
        dependancelivre2(adminIpc, pool);
        modiflivre(adminIpc, pool);
        dependanceemprunt(adminIpc, pool);
        ajoutemprunt(adminIpc, pool);
        montreemprunt(adminIpc, pool);
        dependanceemprunt2(adminIpc, pool);
        modifemprunt(adminIpc, pool);
        dashboard(adminIpc, pool);
        admin(adminIpc, pool);
        generationpdf(adminIpc, pool);

    } catch (err) {
        console.error('ERREUR: Impossible de créer une connexion à MySQL:', err);
    }
}





function createAndReplaceWindow(targetFile) {
    if (currentActiveWindow && !currentActiveWindow.isDestroyed()) {
        currentActiveWindow.close();
    }

    let windowOptions = {
        width: 1400,
        height: 900,
        title: targetFile.replace('.html', '').toUpperCase(),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    };

    const newWindow = new BrowserWindow(windowOptions);
    newWindow.loadFile(path.join(__dirname, targetFile));
    newWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    newWindow.webContents.on('will-navigate', (event) => event.preventDefault());
    currentActiveWindow = newWindow;
    newWindow.on('closed', () => {
   
        if (currentActiveWindow === newWindow) {
            currentActiveWindow = null;
        }
    });
}

app.whenReady().then(() => {
    initializeDatabasePool(); 
    createAndReplaceWindow('login.html');       
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createAndReplaceWindow('login.html');
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('open-window', (event, targetFile) => {
    if (targetFile === 'login.html') {
        accessMode = 'none';
        createAndReplaceWindow('login.html');
        return;
    }

    const isAdminWindow = ADMIN_WINDOWS.has(targetFile);
    const isVisitorWindow = VISITOR_WINDOWS.has(targetFile);
    const isAllowed = (accessMode === 'admin' && isAdminWindow) || (accessMode === 'visitor' && isVisitorWindow);
    if (!isAllowed) {
        console.warn(`Navigation refusée vers : ${targetFile}`);
        return;
    }
    createAndReplaceWindow(targetFile);
});









ipcMain.on('guest-access', (event) => {
    console.log("Processus principal a reçu la demande d'accès visiteur.");
    accessMode = 'visitor';
    createAndReplaceWindow('indexvis.html');
});

ipcMain.on('admin-authenticate', async (event, { nom_admin, password }) => {
    console.log(`Tentative de connexion...`);

    const nomAdmin = (nom_admin || '').trim();
    const attemptKey = event.sender.id;
    const previousAttempt = authAttempts.get(attemptKey);
    const now = Date.now();
    const attempt = previousAttempt && now - previousAttempt.firstAttempt < AUTH_WINDOW_MS
        ? previousAttempt
        : { count: 0, firstAttempt: now };

    if (attempt.count >= MAX_AUTH_ATTEMPTS) {
        const remainingSeconds = Math.ceil((AUTH_WINDOW_MS - (now - attempt.firstAttempt)) / 1000);
        event.sender.send('auth-response', { success: false, message: `Trop de tentatives. Réessayez dans ${remainingSeconds} secondes.` });
        return;
    }

    try {
        if (!nomAdmin || !password) {
            attempt.count += 1;
            authAttempts.set(attemptKey, attempt);
            event.sender.send('auth-response', { success: false, message: 'Le nom et le mot de passe sont obligatoires.' });
            return;
        }

        const [[adminAccount]] = await pool.execute(
            "SELECT mot_de_passe_admin FROM admin WHERE nom_admin = ? AND statut_admin = 'actif' LIMIT 1",
            [nomAdmin]
        );
        const passwordIsValid = adminAccount && await bcrypt.compare(password, adminAccount.mot_de_passe_admin);

        if (!passwordIsValid) {
            attempt.count += 1;
            authAttempts.set(attemptKey, attempt);
            event.sender.send('auth-response', { success: false, message: 'Nom, mot de passe incorrect ou compte bloqué.' });
            return;
        }

        event.sender.send('auth-response', { 
            success: true, 
            message: 'Accès autorisé. Redirection...'
        });
        authAttempts.delete(attemptKey);
        accessMode = 'admin';
        createAndReplaceWindow('index.html'); 
    } catch (error) {
        console.error("Erreur d'authentification administrateur:", error);
        event.sender.send('auth-response', { 
            success: false, 
            message: 'Connexion impossible. Vérifiez la base de données.'
        });
    }
});
