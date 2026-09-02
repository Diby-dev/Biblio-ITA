function ajoutauteur(ipcMain, pool) {
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
}

module.exports = { ajoutauteur };