function ajoutlivre(ipcMain, pool) {
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
}

module.exports = { ajoutlivre };