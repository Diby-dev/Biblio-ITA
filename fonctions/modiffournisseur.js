function modiffournisseur(ipcMain, pool) {
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
}

module.exports = { modiffournisseur };