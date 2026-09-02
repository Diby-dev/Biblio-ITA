function montreauteur(ipcMain, pool) {
    ipcMain.on('get-auteurs', async (event, filters = {}) => {
        console.log('Tentative de récupération de la liste des auteurs avec filtres:', filters);
    
        let whereClauses = [];
        let values = [];
    
        
        for (const key in filters) {
            if (filters[key]) {
                
                whereClauses.push(`${key} LIKE ?`);
                values.push(`%${filters[key]}%`);
            }
        }
        
        let sql = `
            SELECT 
                id_auteur, 
                nom_auteur, 
                prenom_auteur, 
                nationalite_auteur, 
                DATE_FORMAT(date_naissance_auteur, '%Y-%m-%d') AS date_naissance_auteur_formattee
            FROM auteur
        `;
    
        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }
        
        sql += ' ORDER BY nom_auteur, prenom_auteur;';
        
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [rows] = await pool.execute(sql, values); 
            
            event.sender.send('get-auteurs-response', { 
                success: true, 
                auteurs: rows 
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des auteurs:", error);
            
            event.sender.send('get-auteurs-response', { 
                success: false, 
                message: error.message 
            });
        }
    });
}

module.exports = { montreauteur };