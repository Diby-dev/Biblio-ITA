function montrefournisseur(ipcMain, pool) {
    ipcMain.on('get-fournisseurs', async (event, filters = {}) => {
        console.log('Tentative de récupération de la liste des fournisseurs avec filtres:', filters);
    
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
                id_fournisseur, 
                nom_fournisseur, 
                contact_fournisseur, 
                email_fournisseur, 
                adresse_fournisseur
            FROM fournisseur 
        `;
    
        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }
        
        sql += ' ORDER BY nom_fournisseur;';
        
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [rows] = await pool.execute(sql, values); 
            
            event.sender.send('get-fournisseurs-response', { 
                success: true, 
                fournisseurs: rows 
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des fournisseurs:", error);
            
            event.sender.send('get-fournisseurs-response', { 
                success: false, 
                message: error.message 
            });
        }
    });
}

module.exports = { montrefournisseur };