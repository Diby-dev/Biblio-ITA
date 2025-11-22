// fournisseur-renderer.js

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('fournisseur-form');
    const messageDiv = document.getElementById('message');
    // Sélecteur pour le bouton "Voir la liste"
    const viewButton = document.getElementById('btn-voir-liste');
    const backButton = document.getElementById('btn-retour');

    // ----------------------------------------------------
    // 1. GESTION DE L'ENREGISTREMENT (Soumission du Formulaire)
    // ----------------------------------------------------
    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const fournisseurData = Object.fromEntries(formData.entries());

        messageDiv.className = '';
        messageDiv.textContent = 'Enregistrement du fournisseur en cours...';

        // Envoi des données au processus principal via le canal 'add-fournisseur'
        ipcRenderer.send('add-fournisseur', fournisseurData);
    });

    // 2. Écoute la réponse du processus principal après l'enregistrement
    ipcRenderer.on('add-fournisseur-response', (event, response) => {
        if (response.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = `Fournisseur enregistré avec succès. ID: ${response.id}`;
            form.reset(); // Réinitialise les champs du formulaire
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = `Erreur lors de l'enregistrement : ${response.message}`;
            console.error("Erreur d'enregistrement fournisseur:", response.message);
        }
    });

    // ----------------------------------------------------
    // 3. GESTION DU BOUTON 'VOIR LA LISTE'
    // ----------------------------------------------------
    if (viewButton) {
        viewButton.addEventListener('click', () => {
            // Utilise le canal 'open-window' existant dans main.js pour ouvrir la liste
            ipcRenderer.send('open-window', 'voir_fournisseur.html'); 
        });
    } else {
        console.warn("Avertissement: Le bouton #btn-voir-liste n'a pas été trouvé.");
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