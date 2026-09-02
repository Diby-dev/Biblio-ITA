function modifauteur(ipcMain, pool) {
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
}

module.exports = { modifauteur };