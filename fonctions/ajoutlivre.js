const { enregistrerImageLivre } = require('./imageLivre');

function ajoutlivre(ipcMain, pool) {
    ipcMain.on('add-livre', async (event, livreData, imageSourcePath) => {
        console.log('Tentative d\'enregistrement d\'un livre:', livreData);
    
        const nbExemplaires = parseInt(livreData.exemplaire_livre, 10);
        const exemplaires = isNaN(nbExemplaires) || nbExemplaires < 0 ? 0 : nbExemplaires;
        const statut = exemplaires > 0 ? 'disponible' : 'vide';

        const sql = `
            INSERT INTO livre 
            (titre_livre, statut_livre, id_auteur, id_fournisseur, exemplaire_livre, image_livre)
            VALUES (?, ?, ?, ?, ?, ?);
        `;
        
        const values = [
            livreData.titre_livre,
            statut,
            livreData.id_auteur || null,       
            livreData.id_fournisseur || null,
            exemplaires
        ];
    
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

            const imageLivre = await enregistrerImageLivre(imageSourcePath);
            values.push(imageLivre);
    
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
}

module.exports = { ajoutlivre };
