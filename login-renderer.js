const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('message');
    
    const btnVisiteur = document.getElementById('btn-acces-visiteur');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const password = passwordInput.value;
        
        messageDiv.textContent = 'Vérification en cours...';
        messageDiv.style.color = 'gray';

        ipcRenderer.send('admin-authenticate', { password }); 
    });

    ipcRenderer.on('auth-response', (event, response) => {
        if (response.success) {
 
            messageDiv.textContent = 'Connexion réussie !';
            messageDiv.style.color = 'green';
        } else {
            messageDiv.textContent = response.message; //
            messageDiv.style.color = 'red';
            passwordInput.value = '';
        }
    });
    

    if (btnVisiteur) {
        btnVisiteur.addEventListener('click', () => {
            ipcRenderer.send('guest-access');
        });
    } else {
        console.error("Le bouton 'Accès visiteur' (ID: btn-acces-visiteur) n'a pas été trouvé.");
    }
});