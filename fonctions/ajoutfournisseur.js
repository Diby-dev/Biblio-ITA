function ajoutfournisseur(ipcMain, pool) {
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
}

module.exports = { ajoutfournisseur };