// auteur-renderer.js

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auteur-form');
    const messageDiv = document.getElementById('message');
    // 👈 SÉLECTION DU NOUVEAU BOUTON
    const viewButton = document.getElementById('btn-voir-liste'); 
    const backButton = document.getElementById('btn-retour');

    // ----------------------------------------------------
    // 1. GESTION DE L'ENREGISTREMENT (EXISTANT)
    // ----------------------------------------------------
    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const auteurData = Object.fromEntries(formData.entries());

        messageDiv.className = '';
        messageDiv.textContent = 'Enregistrement de l\'auteur en cours...';

        ipcRenderer.send('add-auteur', auteurData);
    });

    ipcRenderer.on('add-auteur-response', (event, response) => {
        if (response.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = `Auteur enregistré avec succès. ID: ${response.id}`;
            form.reset(); 
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = `Erreur lors de l'enregistrement : ${response.message}`;
        }
    });

    // ----------------------------------------------------
    // 2. GESTION DU BOUTON 'VOIR LA LISTE' (NOUVEAU)
    // ----------------------------------------------------
    if (viewButton) {
        viewButton.addEventListener('click', () => {
            // Utilise le canal 'open-window' existant dans main.js
            ipcRenderer.send('open-window', 'voir_auteur.html'); 
        });
    } else {
        console.error("Erreur: Le bouton #btn-voir-liste n'a pas été trouvé dans auteur.html.");
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            // Envoie la demande pour ouvrir utilisateur.html (qui remplacera la fenêtre actuelle)
            ipcRenderer.send('open-window', 'index.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});