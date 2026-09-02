function ajoutemprunt(ipcMain, pool) {
    ipcMain.on('add-emprunt', async (event, empruntData) => {
        console.log('Tentative d\'enregistrement d\'un emprunt:', empruntData);
    
        const insertSql = `
            INSERT INTO emprunt 
            (id_utilisateur, id_livre, date_emprunt, statut_emprunt, date_limite_retour_emprunt, date_retour_emprunt) 
            VALUES (?, ?, ?, ?, ?, ?);
        `;
        
        const insertValues = [
            empruntData.id_utilisateur,
            empruntData.id_livre,
            empruntData.date_emprunt,
            empruntData.statut_emprunt,
            empruntData.date_limite_retour_emprunt,
            empruntData.date_retour_emprunt || null 
        ];
    
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [result] = await pool.execute(insertSql, insertValues);
            
            let nouveauStatutLivre;
            const statutEmprunt = empruntData.statut_emprunt.toLowerCase();
    
            if (statutEmprunt === 'en cours' || statutEmprunt === 'en retard') {
                nouveauStatutLivre = 'emprunté';
            } else if (statutEmprunt === 'retourné') {
                nouveauStatutLivre = 'disponible';
            } else {
                nouveauStatutLivre = null; 
            }
    
            if (nouveauStatutLivre) {
                const updateLivreSql = `
                    UPDATE livre 
                    SET statut_livre = ? 
                    WHERE id_livre = ?;
                `;
                await pool.execute(updateLivreSql, [nouveauStatutLivre, empruntData.id_livre]);
                console.log(`Statut du livre ID ${empruntData.id_livre} mis à jour à: ${nouveauStatutLivre}`);
            }
            
            event.sender.send('add-emprunt-response', { 
                success: true, 
                id: result.insertId,
                statut_livre_mis_a_jour: nouveauStatutLivre
            });
    
        } catch (error) {
            console.error("Erreur d'insertion de l'emprunt et/ou de mise à jour du livre:", error);
            
            let message = error.message;
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                 message = "Erreur de clé étrangère : L'ID Utilisateur ou l'ID Livre n'existe pas.";
            }
            
            event.sender.send('add-emprunt-response', { 
                success: false, 
                message: message
            });
        }
    });
}

module.exports = { ajoutemprunt };