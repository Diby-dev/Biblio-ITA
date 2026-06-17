const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auteur-form');
    const messageDiv = document.getElementById('message');
    const viewButton = document.getElementById('btn-voir-liste'); 
    const backButton = document.getElementById('btn-retour');

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

    if (viewButton) {
        viewButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'voir_auteur.html'); 
        });
    } else {
        console.error("Erreur: Le bouton #btn-voir-liste n'a pas été trouvé dans auteur.html.");
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'index.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});