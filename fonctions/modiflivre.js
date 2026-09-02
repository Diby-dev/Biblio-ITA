function modiflivre(ipcMain, pool) {
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
}

module.exports = { modiflivre };