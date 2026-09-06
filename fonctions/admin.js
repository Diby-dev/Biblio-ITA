const bcrypt = require('bcrypt');

function admin(ipcMain, pool) {
    ipcMain.on('get-admins', async (event) => {
        try {
            const [admins] = await pool.execute(
                'SELECT id_admin, nom_admin, statut_admin FROM admin ORDER BY nom_admin ASC'
            );
            event.sender.send('get-admins-response', { success: true, admins });
        } catch (error) {
            event.sender.send('get-admins-response', { success: false, message: error.message });
        }
    });

    ipcMain.on('add-admin', async (event, adminData) => {
        try {
            const nomAdmin = (adminData.nom_admin || '').trim();
            const motDePasse = adminData.mot_de_passe_admin || '';

            if (!nomAdmin || !motDePasse) {
                throw new Error("Le nom et le mot de passe sont obligatoires.");
            }
            if (motDePasse.length < 8) {
                throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
            }

            const [existingAdmins] = await pool.execute(
                'SELECT id_admin FROM admin WHERE nom_admin = ? LIMIT 1',
                [nomAdmin]
            );
            if (existingAdmins.length > 0) {
                throw new Error("Un administrateur possède déjà ce nom.");
            }

            const passwordHash = await bcrypt.hash(motDePasse, 10);
            const [result] = await pool.execute(
                "INSERT INTO admin (nom_admin, mot_de_passe_admin, statut_admin) VALUES (?, ?, 'actif')",
                [nomAdmin, passwordHash]
            );
            event.sender.send('add-admin-response', { success: true, id: result.insertId });
        } catch (error) {
            event.sender.send('add-admin-response', { success: false, message: error.message });
        }
    });

    ipcMain.on('toggle-admin-status', async (event, idAdmin) => {
        try {
            const [[currentAdmin]] = await pool.execute(
                'SELECT statut_admin FROM admin WHERE id_admin = ?',
                [idAdmin]
            );
            if (!currentAdmin) throw new Error("Administrateur introuvable.");

            const nouveauStatut = currentAdmin.statut_admin === 'actif' ? 'bloqué' : 'actif';
            await pool.execute('UPDATE admin SET statut_admin = ? WHERE id_admin = ?', [nouveauStatut, idAdmin]);
            event.sender.send('toggle-admin-status-response', { success: true, id: idAdmin, statut: nouveauStatut });
        } catch (error) {
            event.sender.send('toggle-admin-status-response', { success: false, message: error.message });
        }
    });
}

module.exports = { admin };
