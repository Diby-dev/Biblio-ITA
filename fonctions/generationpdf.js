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
                L.image_livre,
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

        let imageLivreDataUrl = '';
        if (emprunt.image_livre) {
            const projectRoot = path.resolve(__dirname, '..');
            const imageLivrePath = path.resolve(projectRoot, emprunt.image_livre);
            const isImageInProject = imageLivrePath.startsWith(projectRoot + path.sep);
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            };
            const mimeType = mimeTypes[path.extname(imageLivrePath).toLowerCase()];

            if (isImageInProject && mimeType && fs.existsSync(imageLivrePath)) {
                const imageBuffer = fs.readFileSync(imageLivrePath);
                imageLivreDataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
            }
        }

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
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4;
                margin: 15mm;
            }
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 0; 
                color: #000;
                font-size: 14px;
                line-height: 1.5;
            }
            
            /* EN-TÊTE OFFICIEL STYLE RELEVÉ DE NOTES */
            .top-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                border-bottom: 2px solid #0056b3;
                padding-bottom: 12px;
                margin-bottom: 20px;
            }
            .top-header-left {
                display: flex;
                align-items: center;
            }
            .top-header-logo {
                width: 85px;
                height: auto;
                margin-right: 15px;
            }
            .institution-info {
                font-size: 11px;
                line-height: 1.3;
                font-weight: bold;
                color: #333;
            }
            .top-header-right {
                text-align: right;
                font-size: 11px;
                line-height: 1.3;
                color: #555;
            }

            /* TITRE DU DOCUMENT */
            .doc-title-container {
                background-color: #0056b3;
                color: white;
                text-align: center;
                padding: 10px;
                font-weight: bold;
                font-size: 16px;
                text-transform: uppercase;
                margin-bottom: 25px;
                letter-spacing: 0.5px;
            }

            /* TABLEAUX DE DONNÉES STRUCTURÉS */
            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
            }
            .data-table th, .data-table td {
                border: 1px solid #ccc;
                padding: 10px 12px;
                text-align: left;
                font-size: 13px;
            }
            .data-table th {
                background-color: #f2f2f2;
                font-weight: bold;
                color: #333;
                width: 32%;
            }
            .data-table td {
                background-color: #fff;
                color: #111;
            }
            .book-cover {
                width: 120px;
                height: 170px;
                object-fit: cover;
                border: 1px solid #ccc;
                border-radius: 4px;
                display: block;
            }
            .no-book-cover {
                color: #666;
                font-style: italic;
            }

            /* STATUTS */
            .statut-en-cours { color: #007bff; font-weight: bold; }
            .statut-retourne { color: #28a745; font-weight: bold; } 
            .statut-en-retard { color: #dc3545; font-weight: bold; }

            /* SECTION SIGNATURE / FOOTER */
            .footer-section {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                font-size: 12px;
            }
            .signature-box {
                width: 220px;
                height: 80px;
                border: 1px dashed #bbb;
                text-align: center;
                padding-top: 8px;
                color: #666;
            }
            .system-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 10px;
                color: #777;
                border-top: 1px solid #ddd;
                padding-top: 6px;
            }
        </style>
    </head>
    <body>
        
        <div class="top-header">
            <div class="top-header-left">
                ${logoDataUrl ? `<img src="${logoDataUrl}" class="top-header-logo" alt="Logo">` : ''}
                <div class="institution-info">
                    GROUPE ITA - INGENIERIE SA<br>
                    INSTITUT DES TECHNOLOGIES ABIDJAN<br>
                    DIRECTION ACADÉMIQUE / BIBLIOTHÈQUE
                </div>
            </div>
            <div class="top-header-right">
                20 BP 195 ABIDJAN 20<br>
            </div>
        </div>
        
        <div class="doc-title-container">
            FICHE D'EMPRUNT DE LIVRE N° ${emprunt.id_emprunt}
        </div>

        <table class="data-table">
            <tr>
                <th>Image du Livre</th>
                <td>${imageLivreDataUrl ? `<img src="${imageLivreDataUrl}" class="book-cover" alt="Couverture du livre">` : '<span class="no-book-cover">Aucune image disponible</span>'}</td>
            </tr>
            <tr>
                <th>Titre du Livre</th>
                <td><strong>${emprunt.titre_livre || 'N/A'}</strong></td>
            </tr>
            <tr>
                <th>Nom de l'Emprunteur</th>
                <td><strong>${emprunt.nom_utilisateur_complet || 'N/A'}</strong></td>
            </tr>
            <tr>
                <th>Contact Emprunteur</th>
                <td>${emprunt.contact_utilisateur || 'N/A'}</td>
            </tr>
            <tr>
                <th>Date d'Emprunt</th>
                <td>${emprunt.date_emprunt}</td>
            </tr>
            <tr>
                <th>Date Limite de Retour</th>
                <td>${emprunt.date_limite_retour}</td>
            </tr>
            <tr>
                <th>Date de Retour Effective</th>
                <td>${emprunt.date_retour || 'En attente de retour'}</td>
            </tr>
            <tr>
                <th>Statut Actuel</th>
                <td><span class="statut-${statutClass}">${emprunt.statut_emprunt}</span></td>
            </tr>
        </table>

        <div class="footer-section">
            <div>
                <p>Document généré par la gestion de bibliothèque Biblio ITA.</p>
            </div>
            <div class="signature-box">
                Cachet / Signature
            </div>
        </div>

        <div class="system-footer">
            Biblio ITA — Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} — Document officiel provisoire.
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
