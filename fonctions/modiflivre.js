const { enregistrerImageLivre } = require('./imageLivre');

function modiflivre(ipcMain, pool) {
    ipcMain.on('update-livre', async (event, livreData) => {
        console.log('Tentative de mise à jour du livre:', livreData);
    
        const { 
            id_livre, 
            titre_livre, 
            id_auteur, 
            id_fournisseur, 
            exemplaire_livre,
            statut_livre,
            imageSourcePath
        } = livreData;
    
        if (!id_livre || !titre_livre) {
            event.sender.send('update-livre-response', { 
                success: false, 
                id: id_livre || 'N/A',
                message: "ID ou Titre du livre manquant pour la mise à jour." 
            });
            return;
        }

        const nbExemplaires = parseInt(exemplaire_livre, 10);
        const exemplaires = isNaN(nbExemplaires) || nbExemplaires < 0 ? 0 : nbExemplaires;
        const statut = exemplaires > 0 ? 'disponible' : 'vide';
    
        const champs = [
            'titre_livre = ?',
            'id_auteur = ?',
            'id_fournisseur = ?',
            'statut_livre = ?',
            'exemplaire_livre = ?'
        ];
        
        const values = [
            titre_livre, 
            id_auteur, 
            id_fournisseur, 
            statut,
            exemplaires
        ];
    
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

            if (imageSourcePath) {
                const imageLivre = await enregistrerImageLivre(imageSourcePath);
                champs.push('image_livre = ?');
                values.push(imageLivre);
            }

            values.push(id_livre);
            const sql = `UPDATE livre SET ${champs.join(', ')} WHERE id_livre = ?`;
    
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
}

module.exports = { modiflivre };
