const puppeteer = require('puppeteer');
const { app, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function generationpdf(ipcMain, pool) {
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
        const logoPath = path.join(__dirname, '../logo.png');
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
}

module.exports = { generationpdf };