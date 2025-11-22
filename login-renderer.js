// login-renderer.js

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sélection des éléments DOM
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('message');
    
    // NOUVEAU : Sélection du bouton "Accès visiteur"
    const btnVisiteur = document.getElementById('btn-acces-visiteur');

    // 2. Gestion de la soumission du formulaire (Accès Admin)
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const password = passwordInput.value;
        
        messageDiv.textContent = 'Vérification en cours...';
        messageDiv.style.color = 'gray';

        // Envoi SEULEMENT du mot de passe au processus principal
        // Le canal de communication est 'admin-authenticate'
        ipcRenderer.send('admin-authenticate', { password }); 
    });

    // 3. Réception de la réponse du processus principal (pour l'Admin)
    ipcRenderer.on('auth-response', (event, response) => {
        if (response.success) {
            // Si le mot de passe est correct, le processus principal charge index.html
            messageDiv.textContent = 'Connexion réussie !';
            messageDiv.style.color = 'green';
        } else {
            // Échec
            messageDiv.textContent = response.message; // Affiche 'Mot de passe incorrect.'
            messageDiv.style.color = 'red';
            passwordInput.value = ''; // Efface le mot de passe saisi
        }
    });
    
    // --- NOUVEAU : Logique d'accès visiteur ---

    if (btnVisiteur) {
        btnVisiteur.addEventListener('click', () => {
            // Le bouton dans le HTML est de type="button" pour éviter la soumission du formulaire.
            // Envoi d'un message IPC pour demander au Processus Principal d'ouvrir indexvis.html.
            // On peut envoyer un canal simple qui indique l'action : 'guest-access'
            ipcRenderer.send('guest-access');
        });
    } else {
        console.error("Le bouton 'Accès visiteur' (ID: btn-acces-visiteur) n'a pas été trouvé.");
    }
});