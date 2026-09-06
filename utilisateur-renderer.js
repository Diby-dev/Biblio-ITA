const { ipcRenderer } = window.electron;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('user-form');
    const messageDiv = document.getElementById('message');
    const viewButton = document.getElementById('btn-voir-liste'); 
    const backButton = document.getElementById('btn-retour'); 

    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData.entries());
        messageDiv.className = '';
        messageDiv.textContent = 'Enregistrement en cours...';
        ipcRenderer.send('add-user', userData);
    });

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
 
    if (viewButton) {
        viewButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'voir_utilisateur.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-voir-liste n'a pas été trouvé.");
    }
    
    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'index.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});