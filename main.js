const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');

const puppeteer = require('puppeteer');
const fs = require('fs'); 

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

function initializeDatabasePool() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('connexion à MySQL créé avec succès.');
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

ipcMain.on('add-user', async (event, userData) => {
    console.log('Tentative d\'enregistrement d\'un utilisateur:', userData);

    const sql = `
        INSERT INTO utilisateur 
        (nom_utilisateur, prenom_utilisateur, type_utilisateur, classe_utilisateur, filiere_utilisateur, contact_utilisateur, statut_utilisateur) 
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    
    const values = [
        userData.nom_utilisateur,
        userData.prenom_utilisateur,
        userData.type_utilisateur,
        userData.classe_utilisateur || null,
        userData.filiere_utilisateur || null,
        userData.contact_utilisateur,
        userData.statut_utilisateur
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        event.sender.send('add-user-response', { 
            success: true, 
            id: result.insertId 
        });

    } catch (error) {
        console.error("Erreur d'insertion dans la base de données:", error);
        
        event.sender.send('add-user-response', { 
            success: false, 
            message: error.message 
        });
    }
});

ipcMain.on('update-user', async (event, userData) => {
    console.log('Tentative de mise à jour de l\'utilisateur:', userData);

    const { 
        id_utilisateur, 
        nom_utilisateur, 
        prenom_utilisateur, 
        type_utilisateur, 
        classe_utilisateur, 
        filiere_utilisateur, 
        contact_utilisateur, 
        statut_utilisateur 
    } = userData;

    if (!id_utilisateur) {
        event.sender.send('update-user-response', { 
            success: false, 
            id: 'N/A',
            message: "ID utilisateur manquant pour la mise à jour." 
        });
        return;
    }

    const sql = `
        UPDATE utilisateur 
        SET 
            nom_utilisateur = ?, 
            prenom_utilisateur = ?, 
            type_utilisateur = ?, 
            classe_utilisateur = ?, 
            filiere_utilisateur = ?, 
            contact_utilisateur = ?, 
            statut_utilisateur = ?
        WHERE id_utilisateur = ?
    `;
    
    const values = [
        nom_utilisateur, 
        prenom_utilisateur, 
        type_utilisateur, 
        classe_utilisateur, 
        filiere_utilisateur, 
        contact_utilisateur, 
        statut_utilisateur,
        id_utilisateur
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        if (result.affectedRows === 0) {
            event.sender.send('update-user-response', { 
                success: true, 
                id: id_utilisateur 
            });
            return;
        }

        event.sender.send('update-user-response', { 
            success: true, 
            id: id_utilisateur 
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
        
        event.sender.send('update-user-response', { 
            success: false, 
            id: id_utilisateur,
            message: error.message 
        });
    }
});

ipcMain.on('get-users', async (event, filters = {}) => {
    console.log('Tentative de récupération des utilisateurs avec filtres:', filters);

    let whereClauses = [];
    let values = [];

    for (const key in filters) {
        if (filters[key]) {
            if (key === 'type_utilisateur' || key === 'statut_utilisateur') {
                whereClauses.push(`${key} = ?`);
                values.push(filters[key]);
            } else {
                whereClauses.push(`${key} LIKE ?`);
                values.push(`%${filters[key]}%`);
            }
        }
    }

    let sql = `
        SELECT 
            id_utilisateur, 
            nom_utilisateur, 
            prenom_utilisateur, 
            type_utilisateur, 
            classe_utilisateur, 
            filiere_utilisateur, 
            contact_utilisateur, 
            statut_utilisateur 
        FROM utilisateur 
    `;

    if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY nom_utilisateur, prenom_utilisateur;';
    
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [rows] = await pool.execute(sql, values);
        
        event.sender.send('get-users-response', { 
            success: true, 
            users: rows 
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error);
        
        event.sender.send('get-users-response', { 
            success: false, 
            message: error.message 
        });
    }
});

ipcMain.on('add-auteur', async (event, auteurData) => {
    console.log('Tentative d\'enregistrement d\'un auteur:', auteurData);

    const sql = `
        INSERT INTO auteur 
        (nom_auteur, prenom_auteur, nationalite_auteur, date_naissance_auteur) 
        VALUES (?, ?, ?, ?);
    `;
    
    const values = [
        auteurData.nom_auteur,
        auteurData.prenom_auteur,
        auteurData.nationalite_auteur || null,
        auteurData.date_naissance_auteur || null 
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        event.sender.send('add-auteur-response', { 
            success: true, 
            id: result.insertId 
        });

    } catch (error) {
        console.error("Erreur d'insertion de l'auteur dans la base de données:", error);
        
        event.sender.send('add-auteur-response', { 
            success: false, 
            message: error.message 
        });
    }
});


ipcMain.on('update-auteur', async (event, auteurData) => {
    console.log('Tentative de mise à jour de l\'auteur:', auteurData);

    const { 
        id_auteur, 
        nom_auteur, 
        prenom_auteur, 
        nationalite_auteur, 
        date_naissance_auteur
    } = auteurData;

    if (!id_auteur) {
        event.sender.send('update-auteur-response', { 
            success: false, 
            id: 'N/A',
            message: "ID auteur manquant pour la mise à jour." 
        });
        return;
    }

    const sql = `
        UPDATE auteur 
        SET 
            nom_auteur = ?, 
            prenom_auteur = ?, 
            nationalite_auteur = ?, 
            date_naissance_auteur = ?
        WHERE id_auteur = ?
    `;
    
    const values = [
        nom_auteur, 
        prenom_auteur, 
        nationalite_auteur, 
        date_naissance_auteur,
        id_auteur
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        event.sender.send('update-auteur-response', { 
            success: true, 
            id: id_auteur 
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'auteur:", error);
        
        event.sender.send('update-auteur-response', { 
            success: false, 
            id: id_auteur,
            message: error.message 
        });
    }
});


ipcMain.on('get-auteurs', async (event, filters = {}) => {
    console.log('Tentative de récupération de la liste des auteurs avec filtres:', filters);

    let whereClauses = [];
    let values = [];

    
    for (const key in filters) {
        if (filters[key]) {
            
            whereClauses.push(`${key} LIKE ?`);
            values.push(`%${filters[key]}%`);
        }
    }
    
    let sql = `
        SELECT 
            id_auteur, 
            nom_auteur, 
            prenom_auteur, 
            nationalite_auteur, 
            DATE_FORMAT(date_naissance_auteur, '%Y-%m-%d') AS date_naissance_auteur_formattee
        FROM auteur
    `;

    if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    sql += ' ORDER BY nom_auteur, prenom_auteur;';
    
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [rows] = await pool.execute(sql, values); 
        
        event.sender.send('get-auteurs-response', { 
            success: true, 
            auteurs: rows 
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des auteurs:", error);
        
        event.sender.send('get-auteurs-response', { 
            success: false, 
            message: error.message 
        });
    }
});


ipcMain.on('add-fournisseur', async (event, fournisseurData) => {
    console.log('Tentative d\'enregistrement d\'un fournisseur:', fournisseurData);

    const sql = `
        INSERT INTO fournisseur 
        (nom_fournisseur, contact_fournisseur, email_fournisseur, adresse_fournisseur) 
        VALUES (?, ?, ?, ?);
    `;
    
    const values = [
        fournisseurData.nom_fournisseur,
        fournisseurData.contact_fournisseur || null,
        fournisseurData.email_fournisseur || null,
        fournisseurData.adresse_fournisseur || null
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        event.sender.send('add-fournisseur-response', { 
            success: true, 
            id: result.insertId 
        });

    } catch (error) {
        console.error("Erreur d'insertion du fournisseur dans la base de données:", error);
        
        let message = error.message;
        if (error.code === 'ER_DUP_ENTRY') {
             message = "Ce contact ou cet email est déjà utilisé par un autre fournisseur (vérifiez les contraintes UNIQUE).";
        }
        
        event.sender.send('add-fournisseur-response', { 
            success: false, 
            message: message
        });
    }
});


ipcMain.on('update-fournisseur', async (event, fournisseurData) => {
    console.log('Tentative de mise à jour du fournisseur:', fournisseurData);

    const { 
        id_fournisseur, 
        nom_fournisseur, 
        contact_fournisseur, 
        email_fournisseur, 
        adresse_fournisseur
    } = fournisseurData;

    if (!id_fournisseur || !nom_fournisseur) {
        event.sender.send('update-fournisseur-response', { 
            success: false, 
            id: id_fournisseur || 'N/A',
            message: "ID ou Nom du fournisseur manquant(s) pour la mise à jour." 
        });
        return;
    }

    const sql = `
        UPDATE fournisseur 
        SET 
            nom_fournisseur = ?, 
            contact_fournisseur = ?, 
            email_fournisseur = ?, 
            adresse_fournisseur = ?
        WHERE id_fournisseur = ?
    `;
    
    const values = [
        nom_fournisseur, 
        contact_fournisseur, 
        email_fournisseur, 
        adresse_fournisseur,
        id_fournisseur
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        event.sender.send('update-fournisseur-response', { 
            success: true, 
            id: id_fournisseur 
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour du fournisseur:", error);
        
        event.sender.send('update-fournisseur-response', { 
            success: false, 
            id: id_fournisseur,
            message: error.message 
        });
    }
});



ipcMain.on('get-fournisseurs', async (event, filters = {}) => {
    console.log('Tentative de récupération de la liste des fournisseurs avec filtres:', filters);

    let whereClauses = [];
    let values = [];

    
    for (const key in filters) {
        if (filters[key]) {
            whereClauses.push(`${key} LIKE ?`);
            values.push(`%${filters[key]}%`);
        }
    }
    
    let sql = `
        SELECT 
            id_fournisseur, 
            nom_fournisseur, 
            contact_fournisseur, 
            email_fournisseur, 
            adresse_fournisseur
        FROM fournisseur 
    `;

    if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    sql += ' ORDER BY nom_fournisseur;';
    
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [rows] = await pool.execute(sql, values); 
        
        event.sender.send('get-fournisseurs-response', { 
            success: true, 
            fournisseurs: rows 
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des fournisseurs:", error);
        
        event.sender.send('get-fournisseurs-response', { 
            success: false, 
            message: error.message 
        });
    }
});


ipcMain.on('get-livre-dependencies-for-add', async (event) => {
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [auteursResult] = await pool.execute(`
            SELECT 
                id_auteur, 
                CONCAT(prenom_auteur, ' ', nom_auteur) AS nom_auteur_complet 
            FROM auteur 
            ORDER BY nom_auteur_complet ASC
        `);

        const [fournisseursResult] = await pool.execute(`
            SELECT 
                id_fournisseur, 
                nom_fournisseur 
            FROM fournisseur 
            ORDER BY nom_fournisseur ASC
        `);

        console.log(`Dépendances Livre chargées. Auteurs: ${auteursResult.length}, Fournisseurs: ${fournisseursResult.length}`);

        event.sender.send('get-livre-dependencies-for-add-response', { 
            success: true, 
            auteurs: auteursResult, 
            fournisseurs: fournisseursResult 
        });

    } catch (error) {
        console.error("ERREUR CRITIQUE DE CHARGEMENT DES DÉPENDANCES (main.js):", error);
        event.sender.send('get-livre-dependencies-for-add-response', { 
            success: false, 
            message: error.message 
        });
    }
});

ipcMain.on('add-livre', async (event, livreData) => {
    console.log('Tentative d\'enregistrement d\'un livre:', livreData);

    const sql = `
        INSERT INTO livre 
        (titre_livre, statut_livre, id_auteur, id_fournisseur) 
        VALUES (?, ?, ?, ?);
    `;
    
    const values = [
        livreData.titre_livre,
        livreData.statut_livre || 'disponible',
        livreData.id_auteur || null,       
        livreData.id_fournisseur || null   
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        event.sender.send('add-livre-response', { 
            success: true, 
            id: result.insertId 
        });

    } catch (error) {
        console.error("Erreur d'insertion du livre dans la base de données:", error);
        
        
        let message = error.message;
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             message = "Erreur: L'ID Auteur ou l'ID Fournisseur spécifié n'existe pas dans la base de données.";
        }
        
        event.sender.send('add-livre-response', { 
            success: false, 
            message: message
        });
    }
});


ipcMain.on('get-livres', async (event, filters = {}) => {
    console.log('Tentative de récupération de la liste des livres avec filtres:', filters);

    let whereClauses = [];
    let values = [];

    if (filters.titre_livre) {
        whereClauses.push(`L.titre_livre LIKE ?`);
        values.push(`%${filters.titre_livre}%`);
    }

    if (filters.statut_livre) {
        whereClauses.push(`L.statut_livre = ?`);
        values.push(filters.statut_livre);
    }
    
    if (filters.nom_auteur_complet) {
        whereClauses.push(`CONCAT(A.prenom_auteur, ' ', A.nom_auteur) LIKE ?`);
        values.push(`%${filters.nom_auteur_complet}%`);
    }

    if (filters.nom_fournisseur) {
        whereClauses.push(`F.nom_fournisseur LIKE ?`);
        values.push(`%${filters.nom_fournisseur}%`);
    }

    let sql = `
        SELECT 
            L.id_livre, 
            L.titre_livre, 
            L.statut_livre,
            L.id_auteur,         /* <--- NOUVEAU: ID Auteur */
            L.id_fournisseur,    /* <--- NOUVEAU: ID Fournisseur */
            CONCAT(A.prenom_auteur, ' ', A.nom_auteur) AS nom_auteur_complet,
            F.nom_fournisseur
        FROM livre L
        LEFT JOIN auteur A ON L.id_auteur = A.id_auteur
        LEFT JOIN fournisseur F ON L.id_fournisseur = F.id_fournisseur
    `;

    if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    sql += ' ORDER BY L.titre_livre;';
    
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [rows] = await pool.execute(sql, values);
        
        event.sender.send('get-livres-response', { 
            success: true, 
            livres: rows 
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des livres:", error);
        
        event.sender.send('get-livres-response', { 
            success: false, 
            message: error.message 
        });
    }
});


ipcMain.on('get-livre-dependencies', async (event) => {
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [auteursResult] = await pool.execute(`
            SELECT 
                id_auteur, 
                CONCAT(nom_auteur, ' ', prenom_auteur) AS nom_auteur_complet 
            FROM auteur 
            ORDER BY nom_auteur_complet
        `);

        const [fournisseursResult] = await pool.execute(`
            SELECT 
                id_fournisseur, 
                nom_fournisseur 
            FROM fournisseur 
            ORDER BY nom_fournisseur
        `);

        event.sender.send('get-livre-dependencies-response', { 
            success: true, 
            auteurs: auteursResult, 
            fournisseurs: fournisseursResult 
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des dépendances du livre:", error);
        event.sender.send('get-livre-dependencies-response', { 
            success: false, 
            message: error.message 
        });
    }
});


ipcMain.on('update-livre', async (event, livreData) => {
    console.log('Tentative de mise à jour du livre:', livreData);

    const { 
        id_livre, 
        titre_livre, 
        id_auteur, 
        id_fournisseur, 
        statut_livre 
    } = livreData;

    if (!id_livre || !titre_livre || !statut_livre) {
        event.sender.send('update-livre-response', { 
            success: false, 
            id: id_livre || 'N/A',
            message: "ID, Titre ou Statut du livre manquant(s) pour la mise à jour." 
        });
        return;
    }

    const sql = `
        UPDATE livre 
        SET 
            titre_livre = ?, 
            id_auteur = ?, 
            id_fournisseur = ?, 
            statut_livre = ?
        WHERE id_livre = ?
    `;
    
    const values = [
        titre_livre, 
        id_auteur, 
        id_fournisseur, 
        statut_livre,
        id_livre
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        event.sender.send('update-livre-response', { 
            success: true, 
            id: id_livre 
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour du livre:", error);
        
        event.sender.send('update-livre-response', { 
            success: false, 
            id: id_livre,
            message: error.message 
        });
    }
});
ipcMain.on('get-emprunt-add-dependencies', async (event) => {
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [utilisateursResult] = await pool.execute(`
            SELECT 
                id_utilisateur, 
                -- Utilisation de IFNULL pour gérer les NULL et assurer que la concaténation ne renvoie pas NULL.
                CONCAT(
                    IFNULL(prenom_utilisateur, ''),  
                    ' ', 
                    IFNULL(nom_utilisateur, '')
                ) AS nom_complet_affichage -- Alias clair pour le formulaire d'ajout
            FROM utilisateur 
            ORDER BY nom_complet_affichage ASC
        `);

        const [livresResult] = await pool.execute(`
            SELECT 
                id_livre, 
                titre_livre 
            FROM livre 
            WHERE statut_livre = 'Disponible'
            ORDER BY titre_livre ASC
        `);

        event.sender.send('get-emprunt-add-dependencies-response', { 
            success: true, 
            utilisateurs: utilisateursResult, 
            livres: livresResult 
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des dépendances d'ajout d'emprunt:", error);
        event.sender.send('get-emprunt-add-dependencies-response', { 
            success: false, 
            message: error.message 
        });
    }
});

ipcMain.on('add-emprunt', async (event, empruntData) => {
    console.log('Tentative d\'enregistrement d\'un emprunt:', empruntData);

    const insertSql = `
        INSERT INTO emprunt 
        (id_utilisateur, id_livre, date_emprunt, statut_emprunt, date_limite_retour_emprunt, date_retour_emprunt) 
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    
    const insertValues = [
        empruntData.id_utilisateur,
        empruntData.id_livre,
        empruntData.date_emprunt,
        empruntData.statut_emprunt,
        empruntData.date_limite_retour_emprunt,
        empruntData.date_retour_emprunt || null 
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(insertSql, insertValues);
        
        let nouveauStatutLivre;
        const statutEmprunt = empruntData.statut_emprunt.toLowerCase();

        if (statutEmprunt === 'en cours' || statutEmprunt === 'en retard') {
            nouveauStatutLivre = 'emprunté';
        } else if (statutEmprunt === 'retourné') {
            nouveauStatutLivre = 'disponible';
        } else {
            nouveauStatutLivre = null; 
        }

        if (nouveauStatutLivre) {
            const updateLivreSql = `
                UPDATE livre 
                SET statut_livre = ? 
                WHERE id_livre = ?;
            `;
            await pool.execute(updateLivreSql, [nouveauStatutLivre, empruntData.id_livre]);
            console.log(`Statut du livre ID ${empruntData.id_livre} mis à jour à: ${nouveauStatutLivre}`);
        }
        
        event.sender.send('add-emprunt-response', { 
            success: true, 
            id: result.insertId,
            statut_livre_mis_a_jour: nouveauStatutLivre
        });

    } catch (error) {
        console.error("Erreur d'insertion de l'emprunt et/ou de mise à jour du livre:", error);
        
        let message = error.message;
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             message = "Erreur de clé étrangère : L'ID Utilisateur ou l'ID Livre n'existe pas.";
        }
        
        event.sender.send('add-emprunt-response', { 
            success: false, 
            message: message
        });
    }
});


ipcMain.on('get-emprunts', async (event, filters = {}) => {
    console.log('Tentative de récupération de la liste des emprunts avec filtres:', filters);

    let whereClauses = [];
    let values = [];

    if (filters.titre_livre) {
        whereClauses.push(`L.titre_livre LIKE ?`);
        values.push(`%${filters.titre_livre}%`);
    }

    if (filters.nom_utilisateur_complet) {
        whereClauses.push(`CONCAT(U.prenom_utilisateur, ' ', U.nom_utilisateur) LIKE ?`);
        values.push(`%${filters.nom_utilisateur_complet}%`);
    }

    if (filters.statut_emprunt) {
        whereClauses.push(`E.statut_emprunt = ?`);
        values.push(filters.statut_emprunt);
    }
    
 
    if (filters.date_emprunt) {
        whereClauses.push(`DATE(E.date_emprunt) = ?`);
        values.push(filters.date_emprunt);
    }

    if (filters.date_limite) {
        whereClauses.push(`DATE(E.date_limite_retour_emprunt) = ?`);
        values.push(filters.date_limite);
    }
    
    if (filters.date_retour) {
        whereClauses.push(`DATE(E.date_retour_emprunt) = ?`);
        values.push(filters.date_retour);
    }


    let sql = `
        SELECT 
            E.id_emprunt,
            E.id_livre, 
            E.id_utilisateur,
            L.titre_livre, 
            CONCAT(U.prenom_utilisateur, ' ', U.nom_utilisateur) AS nom_utilisateur_complet,
            
            DATE_FORMAT(E.date_emprunt, '%Y-%m-%d') AS date_emprunt, 
            E.statut_emprunt, 
            DATE_FORMAT(E.date_limite_retour_emprunt, '%Y-%m-%d') AS date_limite_retour,
            DATE_FORMAT(E.date_retour_emprunt, '%Y-%m-%d') AS date_retour
        FROM emprunt E
        LEFT JOIN livre L ON E.id_livre = L.id_livre
        LEFT JOIN utilisateur U ON E.id_utilisateur = U.id_utilisateur
    `;

    if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    sql += ' ORDER BY E.date_emprunt DESC;';
    
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [rows] = await pool.execute(sql, values);
        
        event.sender.send('get-emprunts-response', { 
            success: true, 
            emprunts: rows 
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des emprunts:", error);
        
        event.sender.send('get-emprunts-response', { 
            success: false, 
            message: error.message 
        });
    }
});

ipcMain.on('get-emprunt-dependencies', async (event) => {
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [livresRows] = await pool.execute(
            `SELECT id_livre, titre_livre FROM livre ORDER BY titre_livre`
        );
        
        const [utilisateursRows] = await pool.execute(
            `SELECT id_utilisateur, CONCAT(prenom_utilisateur, ' ', nom_utilisateur) AS nom_complet FROM utilisateur ORDER BY nom_complet`
        );

        event.sender.send('get-emprunt-dependencies-response', {
            success: true,
            livres: livresRows,
            utilisateurs: utilisateursRows
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des dépendances d'emprunt:", error);
        event.sender.send('get-emprunt-dependencies-response', {
            success: false,
            message: error.message
        });
    }
});


ipcMain.on('update-emprunt', async (event, data) => {
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
        
        const { id_emprunt, id_livre, statut_emprunt } = data; 
        const dateRetourValue = data.date_retour || null;

        const updateEmpruntSql = `
            UPDATE emprunt SET
                id_livre = ?, 
                id_utilisateur = ?, 
                date_emprunt = ?, 
                statut_emprunt = ?, 
                date_limite_retour_emprunt = ?, 
                date_retour_emprunt = ? 
            WHERE id_emprunt = ?;
        `;
        const updateEmpruntValues = [
            data.id_livre, 
            data.id_utilisateur, 
            data.date_emprunt, 
            data.statut_emprunt, 
            data.date_limite_retour, 
            dateRetourValue,
            data.id_emprunt
        ];

        await pool.execute(updateEmpruntSql, updateEmpruntValues);
        
        let nouveauStatutLivre;
        const statutEmpruntModifie = statut_emprunt.toLowerCase();

        if (statutEmpruntModifie === 'en cours' || statutEmpruntModifie === 'en retard') {
            nouveauStatutLivre = 'emprunté';
            
        } else if (statutEmpruntModifie === 'retourné') {
            
            const [activeEmprunts] = await pool.execute(
                `
                SELECT COUNT(*) AS count 
                FROM emprunt 
                WHERE id_livre = ? 
                AND statut_emprunt IN ('en cours', 'en retard')
                `, 
                [id_livre]
            );

            if (activeEmprunts[0].count > 0) {
                nouveauStatutLivre = 'emprunté';
            } else {
                nouveauStatutLivre = 'disponible';
            }
        } else {
            nouveauStatutLivre = null; 
        }


        if (nouveauStatutLivre) {
            const updateLivreSql = `
                UPDATE livre 
                SET statut_livre = ? 
                WHERE id_livre = ?;
            `;
            await pool.execute(updateLivreSql, [nouveauStatutLivre, id_livre]); 
            console.log(`Statut du livre ID ${id_livre} mis à jour à: ${nouveauStatutLivre} suite à la modification de l'emprunt.`);
        }
        
        event.sender.send('update-emprunt-response', {
            success: true,
            id_emprunt: id_emprunt,
            statut_livre_mis_a_jour: nouveauStatutLivre
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'emprunt:", error);
        
        let message = error.message;
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             message = "Erreur de clé étrangère : L'ID Utilisateur ou l'ID Livre n'existe pas.";
        }
        
        event.sender.send('update-emprunt-response', {
            success: false,
            id_emprunt: data.id_emprunt,
            message: message
        });
    }
});

ipcMain.on('get-dashboard-stats', async (event) => {
    console.log('Tentative de récupération des statistiques du dashboard...');
    
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [
            [livresTotal],
            [livresEmpruntes],
            [livresDispo],
            [empruntsTotal],
            [empruntsRetournes],
            [empruntsRetard],
            [utilisateursTotal],
            [utilisateursInscrits],
            [utilisateursDesabonnes],
            [fournisseursTotal],
            [auteursTotal]
        ] = await Promise.all([
            pool.execute('SELECT COUNT(*) AS total FROM livre;'),
            pool.execute("SELECT COUNT(*) AS total FROM livre WHERE statut_livre = 'emprunté';"),
            pool.execute("SELECT COUNT(*) AS total FROM livre WHERE statut_livre = 'disponible';"),
            pool.execute('SELECT COUNT(*) AS total FROM emprunt;'),
            pool.execute("SELECT COUNT(*) AS total FROM emprunt WHERE statut_emprunt = 'retourné';"),
            pool.execute("SELECT COUNT(*) AS total FROM emprunt WHERE statut_emprunt = 'en retard';"),
            pool.execute('SELECT COUNT(*) AS total FROM utilisateur;'),
            pool.execute("SELECT COUNT(*) AS total FROM utilisateur WHERE statut_utilisateur = 'inscrit';"),
            pool.execute("SELECT COUNT(*) AS total FROM utilisateur WHERE statut_utilisateur = 'désabonné';"),
            pool.execute('SELECT COUNT(*) AS total FROM fournisseur;'),
            pool.execute('SELECT COUNT(*) AS total FROM auteur;')
        ]);

        event.sender.send('get-dashboard-stats-response', {
            success: true,
            stats: {
                livresEnregistres: livresTotal[0].total,
                livresEmpruntes: livresEmpruntes[0].total,
                livresDisponibles: livresDispo[0].total,
                countEmprunts: empruntsTotal[0].total,
                empruntsRetournes: empruntsRetournes[0].total,
                empruntsRetard: empruntsRetard[0].total,
                countUtilisateurs: utilisateursTotal[0].total,
                utilisateursInscrits: utilisateursInscrits[0].total,
                utilisateursDesabonnes: utilisateursDesabonnes[0].total,
                countFournisseurs: fournisseursTotal[0].total,
                countAuteurs: auteursTotal[0].total
            }
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques du dashboard:", error);
        
        event.sender.send('get-dashboard-stats-response', {
            success: false,
            message: error.message
        });
    }
});



ipcMain.on('generate-emprunt-pdf-single', async (event, id_emprunt) => {
    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const sql = `
            SELECT 
                E.id_emprunt, 
                L.titre_livre, 
                CONCAT(U.prenom_utilisateur, ' ', U.nom_utilisateur) AS nom_utilisateur_complet,
                DATE_FORMAT(E.date_emprunt, '%Y-%m-%d') AS date_emprunt, 
                E.statut_emprunt, 
                DATE_FORMAT(E.date_limite_retour_emprunt, '%Y-%m-%d') AS date_limite_retour,
                DATE_FORMAT(E.date_retour_emprunt, '%Y-%m-%d') AS date_retour,
                U.contact_utilisateur
            FROM emprunt E
            LEFT JOIN livre L ON E.id_livre = L.id_livre
            LEFT JOIN utilisateur U ON E.id_utilisateur = U.id_utilisateur
            WHERE E.id_emprunt = ?;
        `;
        const [rows] = await pool.execute(sql, [id_emprunt]);
        
        if (rows.length === 0) {
            throw new Error(`Emprunt ID ${id_emprunt} introuvable.`);
        }
        const emprunt = rows[0];
        const statutClass = emprunt.statut_emprunt.toLowerCase().replace(' ', '-').replace('é', 'e'); 
        const logoPath = path.join(__dirname, 'logo.png');
        let logoDataUrl = '';
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const mimeType = 'image/png';
            logoDataUrl = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
        } else {
            console.error("Fichier logo.png non trouvé au chemin:", logoPath);
        }

       const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 50px; }
            
            /* NOUVEAUX STYLES POUR L'EN-TÊTE SUPÉRIEUR */
            .top-header {
                display: flex; 
                align-items: center; 
                /* Changement: Justifier le contenu pour qu'il soit regroupé à gauche */
                justify-content: flex-start; /* Place le logo et le texte à gauche */
                padding-bottom: 10px; 
                margin-bottom: 10px; 
            }
            .top-header-logo {
                width: 100px; 
                height: auto;
                /* Ajoute une marge pour séparer le logo du texte */
                margin-right: 20px; 
            }
            .top-header-text {
                /* Suppression de flex-grow: 1, car nous ne voulons plus qu'il prenne tout l'espace */
                /* flex-grow: 1; <-- à supprimer ou commenter */
                text-align: left; /* Aligne le texte à gauche (près du logo) */
                line-height: 1.2;
            }
            .top-header-text p {
                margin: 0;
                font-size: 14px;
                color: #333; 
            }
            
            /* STYLES DU BANDEAU BLEU (HEADER) MIS À JOUR */
            .header { 
                background-color: #17a2b8; 
                color: white; 
                padding: 15px; 
                border-radius: 8px 8px 0 0; 
                text-align: center; /* Pour centrer le titre */
            }
            h1 { 
                margin: 0; 
                font-size: 24px; 
            }
            
            /* Styles du corps de la fiche (inchangés) */
            .section { margin-top: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
            .info-grid { display: table; width: 100%; border-collapse: collapse; }
            .info-row { display: table-row; }
            .info-label, .info-value { display: table-cell; padding: 10px; border-bottom: 1px solid #eee; }
            .info-label { font-weight: bold; width: 35%; background-color: #f4f4f4; }
            .statut-en-cours { color: #007bff; font-weight: bold; }
            .statut-retourne { color: green; font-weight: bold; } 
            .statut-en-retard { color: red; font-weight: bold; }
            .footer { text-align: right; margin-top: 50px; font-size: 10px; color: #666; }
        </style>
    </head>
    <body>
        
        <div class="top-header">
            <img src="${logoDataUrl}" class="top-header-logo" alt="Logo">
            
            <div class="top-header-text">
                <p><strong>GROUPE ITA-INGENIERIE</strong></p>
                <p>INSTITUT DES TECHNOLOGIES</p>
            </div>
        </div>
        
        <div class="header">
            <h1>Fiche d'Emprunt</h1>
        </div>
        
        <div class="section">
            <h2>Informations du Livre</h2>
            <div class="info-grid">
                <div class="info-row"><div class="info-label">Titre:</div><div class="info-value">${emprunt.titre_livre || 'N/A'}</div></div>
            </div>
        </div>

        <div class="section">
            <h2>Informations de l'Emprunteur</h2>
            <div class="info-grid">
                <div class="info-row"><div class="info-label">Nom Complet:</div><div class="info-value">${emprunt.nom_utilisateur_complet || 'N/A'}</div></div>
                <div class="info-row"><div class="info-label">Contact:</div><div class="info-value">${emprunt.contact_utilisateur || 'N/A'}</div></div>
            </div>
        </div>

        <div class="section">
            <h2>Détails de l'Emprunt</h2>
            <div class="info-grid">
                <div class="info-row"><div class="info-label">Date d'Emprunt:</div><div class="info-value">${emprunt.date_emprunt}</div></div>
                <div class="info-row"><div class="info-label">Statut Actuel:</div><div class="info-value"><span class="statut-${statutClass}">${emprunt.statut_emprunt}</span></div></div>
                <div class="info-row"><div class="info-label">Limite de Retour:</div><div class="info-value">${emprunt.date_limite_retour}</div></div>
                <div class="info-row"><div class="info-label">Retour:</div><div class="info-value">${emprunt.date_retour || 'En attente'}</div></div>
            </div>
        </div>

        <div class="footer">
            Biblio ITA ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
        </div>
    </body>
    </html>
`;
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const targetDir = path.join(app.getPath('documents'), 'Bibliotech PDF');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            }

        const pdfPath = path.join(targetDir, `fiche_emprunt_${id_emprunt}_${Date.now()}.pdf`);

        await page.pdf({ 
            path: pdfPath, 
            format: 'A4',
            printBackground: true 
        });

        await browser.close();

        event.sender.send('generate-emprunt-pdf-response', { 
            success: true, 
            path: pdfPath 
        });

    } catch (error) {
        console.error("Erreur lors de la génération du PDF individuel:", error);
        event.sender.send('generate-emprunt-pdf-response', { 
            success: false, 
            message: error.message 
        });
    }
});


ipcMain.on('open-file-in-shell', (event, filePath) => {
    shell.openPath(filePath)
        .catch(err => console.error("Erreur lors de l'ouverture du fichier:", err));
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
