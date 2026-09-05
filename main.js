const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
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


const ADMIN_SECRET_PASSWORD = 'ITAyopADM';

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

function initializeDatabasePool() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('connexion à MySQL créé avec succès.');
        
        migrateDatabase(pool);

        ajoutuser(ipcMain, pool);
        modifuser(ipcMain, pool);
        montreuser(ipcMain, pool);
        ajoutauteur(ipcMain, pool);
        modifauteur(ipcMain, pool);
        montreauteur(ipcMain, pool);
        ajoutfournisseur(ipcMain, pool);
        modiffournisseur(ipcMain, pool);
        montrefournisseur(ipcMain, pool);
        dependancelivre(ipcMain, pool);
        ajoutlivre(ipcMain, pool);
        montrelivre(ipcMain, pool);
        dependancelivre2(ipcMain, pool);
        modiflivre(ipcMain, pool);
        dependanceemprunt(ipcMain, pool);
        ajoutemprunt(ipcMain, pool);
        montreemprunt(ipcMain, pool);
        dependanceemprunt2(ipcMain, pool);
        modifemprunt(ipcMain, pool);
        dashboard(ipcMain, pool);
        generationpdf(ipcMain, pool);

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
            nodeIntegration: true,
            contextIsolation: false
        }
    };

    const newWindow = new BrowserWindow(windowOptions);
    newWindow.loadFile(path.join(__dirname, targetFile));
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
    console.log(`ouverture de la fenêtre : ${targetFile}`);
    createAndReplaceWindow(targetFile);
});









ipcMain.on('guest-access', (event) => {
    console.log("Processus principal a reçu la demande d'accès visiteur.");
    createAndReplaceWindow('indexvis.html');
});

ipcMain.on('admin-authenticate', async (event, { password }) => { 
    console.log(`Tentative de connexion...`);
    
    if (password === ADMIN_SECRET_PASSWORD) {
        event.sender.send('auth-response', { 
            success: true, 
            message: 'Accès autorisé. Redirection...'
        });
        
        createAndReplaceWindow('index.html'); 
        
    } else {
        event.sender.send('auth-response', { 
            success: false, 
            message: 'Mot de passe incorrect.' 
        });
    }
});
