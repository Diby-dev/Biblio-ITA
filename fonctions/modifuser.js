function modifuser(ipcMain, pool) {
    ipcMain.on('update-user', async (event, userData) => {
        console.log('Tentative de mise à jour de l\'utilisateur:', userData);
    
        const { 
            id_utilisateur, 
            nom_utilisateur, 
            prenom_utilisateur, 
            type_utilisateur, 
            classe_utilisateur, 
            filiere_utilisateur, 
            contact_utilisateur, 
            statut_utilisateur 
        } = userData;
    
        if (!id_utilisateur) {
            event.sender.send('update-user-response', { 
                success: false, 
                id: 'N/A',
                message: "ID utilisateur manquant pour la mise à jour." 
            });
            return;
        }
    
        const sql = `
            UPDATE utilisateur 
            SET 
                nom_utilisateur = ?, 
                prenom_utilisateur = ?, 
                type_utilisateur = ?, 
                classe_utilisateur = ?, 
                filiere_utilisateur = ?, 
                contact_utilisateur = ?, 
                statut_utilisateur = ?
            WHERE id_utilisateur = ?
        `;
        
        const values = [
            nom_utilisateur, 
            prenom_utilisateur, 
            type_utilisateur, 
            classe_utilisateur, 
            filiere_utilisateur, 
            contact_utilisateur, 
            statut_utilisateur,
            id_utilisateur
        ];
    
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [result] = await pool.execute(sql, values);
            
            if (result.affectedRows === 0) {
                event.sender.send('update-user-response', { 
                    success: true, 
                    id: id_utilisateur 
                });
                return;
            }
    
            event.sender.send('update-user-response', { 
                success: true, 
                id: id_utilisateur 
            });
    
        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
            
            event.sender.send('update-user-response', { 
                success: false, 
                id: id_utilisateur,
                message: error.message 
            });
        }
    });
}

module.exports = { modifuser };