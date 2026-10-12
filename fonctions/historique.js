async function enregistrerHistorique(pool, action, details = null) {
    try {
        await pool.execute(
            'INSERT INTO historique (action, details) VALUES (?, ?)',
            [action, details]
        );
    } catch (error) {
        // L'historique ne doit jamais empêcher l'action principale de se terminer.
        console.error("Impossible d'enregistrer l'historique :", error.message);
    }
}

function historique(ipcMain, pool) {
    ipcMain.on('get-history', async (event) => {
        try {
            const [entries] = await pool.execute(
                `SELECT id_historique, action, details,
                        DATE_FORMAT(date_action, '%d/%m/%Y') AS date,
                        DATE_FORMAT(date_action, '%H:%i') AS heure
                 FROM historique
                 ORDER BY date_action DESC, id_historique DESC
                 LIMIT 100`
            );
            event.sender.send('get-history-response', { success: true, entries });
        } catch (error) {
            event.sender.send('get-history-response', { success: false, message: error.message });
        }
    });

    ipcMain.on('clear-history', async (event) => {
        try {
            await pool.execute('DELETE FROM historique');
            event.sender.send('clear-history-response', { success: true });
        } catch (error) {
            event.sender.send('clear-history-response', { success: false, message: error.message });
        }
    });
}

module.exports = { historique, enregistrerHistorique };
