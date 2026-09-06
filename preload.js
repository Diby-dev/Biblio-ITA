const { contextBridge, ipcRenderer } = require('electron');

const channelsByPage = {
    'login.html': ['admin-authenticate', 'auth-response', 'guest-access'],
    'index.html': ['open-window'],
    'dash.html': ['open-window', 'get-dashboard-stats', 'get-dashboard-stats-response', 'get-admins', 'get-admins-response', 'add-admin', 'add-admin-response', 'toggle-admin-status', 'toggle-admin-status-response'],
    'utilisateur.html': ['open-window', 'add-user', 'add-user-response'],
    'voir_utilisateur.html': ['open-window', 'get-users', 'get-users-response', 'update-user', 'update-user-response'],
    'livre.html': ['open-window', 'add-livre', 'add-livre-response', 'get-livre-dependencies-for-add', 'get-livre-dependencies-for-add-response'],
    'voir_livre.html': ['open-window', 'get-livres', 'get-livres-response', 'get-livre-dependencies', 'get-livre-dependencies-response', 'update-livre', 'update-livre-response'],
    'auteur.html': ['open-window', 'add-auteur', 'add-auteur-response'],
    'voir_auteur.html': ['open-window', 'get-auteurs', 'get-auteurs-response', 'update-auteur', 'update-auteur-response'],
    'fournisseur.html': ['open-window', 'add-fournisseur', 'add-fournisseur-response'],
    'voir_fournisseur.html': ['open-window', 'get-fournisseurs', 'get-fournisseurs-response', 'update-fournisseur', 'update-fournisseur-response'],
    'emprunt.html': ['open-window', 'get-emprunt-add-dependencies', 'get-emprunt-add-dependencies-response', 'add-emprunt', 'add-emprunt-response'],
    'voir_emprunt.html': ['open-window', 'get-emprunts', 'get-emprunts-response', 'get-emprunt-dependencies', 'get-emprunt-dependencies-response', 'update-emprunt', 'update-emprunt-response', 'generate-emprunt-pdf-single', 'generate-emprunt-pdf-response', 'open-file-in-shell'],
    'indexvis.html': ['open-window'],
    'voir_livrevis.html': ['open-window', 'get-livres', 'get-livres-response'],
    'voir_auteurvis.html': ['open-window', 'get-auteurs', 'get-auteurs-response']
};

const rawPath = new URL(window.location.href).pathname;
const pageName = decodeURIComponent(rawPath.split('/').pop() || '');
const allowedChannels = new Set(channelsByPage[pageName] || []);

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send(channel, ...args) {
            if (!allowedChannels.has(channel)) {
                console.error(`Canal IPC non autorisé pour cette page (${pageName}) : ${channel}`);
                throw new Error(`Canal IPC non autorisé : ${channel}`);
            }
            ipcRenderer.send(channel, ...args);
        },
        on(channel, listener) {
            if (!allowedChannels.has(channel)) {
                console.error(`Canal IPC non autorisé pour cette page (${pageName}) : ${channel}`);
                throw new Error(`Canal IPC non autorisé : ${channel}`);
            }
            const wrappedListener = (_event, ...args) => listener(_event, ...args);
            ipcRenderer.on(channel, wrappedListener);
            return () => ipcRenderer.removeListener(channel, wrappedListener);
        }
    }
});
