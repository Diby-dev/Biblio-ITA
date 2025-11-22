// utilisateur-renderer.js

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('user-form');
    const messageDiv = document.getElementById('message');
    // ⚠️ ASSUREZ-VOUS D'AVOIR CETTE LIGNE :
    const viewButton = document.getElementById('btn-voir-liste'); 
    
    // 📢 NOUVELLE LIGNE : Récupérer le bouton retour
    const backButton = document.getElementById('btn-retour'); 

    // ----------------------------------------------------
    // 1. GESTION DU CLIC SUR LE BOUTON 'ENREGISTRER' (EXISTANT)
    // ----------------------------------------------------
    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData.entries());

        messageDiv.className = '';
        messageDiv.textContent = 'Enregistrement en cours...';

        ipcRenderer.send('add-user', userData);
    });

    // Écoute la réponse du processus principal (EXISTANT)
    ipcRenderer.on('add-user-response', (event, response) => {
        if (response.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = `Utilisateur enregistré avec succès. ID: ${response.id}`;
            form.reset(); 
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = `Erreur lors de l'enregistrement : ${response.message}`;
        }
    });

    // ----------------------------------------------------
    // 2. GESTION DU CLIC SUR LE BOUTON 'VOIR LA LISTE' (EXISTANT)
    // ----------------------------------------------------
    if (viewButton) {
        viewButton.addEventListener('click', () => {
            // Demande au processus principal d'ouvrir la fenêtre cible
            ipcRenderer.send('open-window', 'voir_utilisateur.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-voir-liste n'a pas été trouvé.");
    }
    
    // ----------------------------------------------------
    // 3. 📢 GESTION DU CLIC SUR LE BOUTON 'RETOUR AU MENU' (NOUVEAU)
    // ----------------------------------------------------
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Envoie la demande pour ouvrir index.html (qui remplacera la fenêtre actuelle)
            ipcRenderer.send('open-window', 'index.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});