function montreuser(ipcMain, pool) {
    ipcMain.on('get-users', async (event, filters = {}) => {
        console.log('Tentative de récupération des utilisateurs avec filtres:', filters);
    
        let whereClauses = [];
        let values = [];
    
        for (const key in filters) {
            if (filters[key]) {
                if (key === 'type_utilisateur' || key === 'statut_utilisateur') {
                    whereClauses.push(`${key} = ?`);
                    values.push(filters[key]);
                } else {
                    whereClauses.push(`${key} LIKE ?`);
                    values.push(`%${filters[key]}%`);
                }
            }
        }
    
        let sql = `
            SELECT 
                id_utilisateur, 
                nom_utilisateur, 
                prenom_utilisateur, 
                type_utilisateur, 
                classe_utilisateur, 
                filiere_utilisateur, 
                contact_utilisateur, 
                statut_utilisateur 
            FROM utilisateur 
        `;
    
        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }
    
        sql += ' ORDER BY nom_utilisateur, prenom_utilisateur;';
        
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [rows] = await pool.execute(sql, values);
            
            event.sender.send('get-users-response', { 
                success: true, 
                users: rows 
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des utilisateurs:", error);
            
            event.sender.send('get-users-response', { 
                success: false, 
                message: error.message 
            });
        }
    });
}

module.exports = { montreuser };