const { ipcRenderer } = window.electron;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('fournisseur-form');
    const messageDiv = document.getElementById('message');
    const viewButton = document.getElementById('btn-voir-liste');
    const backButton = document.getElementById('btn-retour');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const fournisseurData = Object.fromEntries(formData.entries());

        messageDiv.className = '';
        messageDiv.textContent = 'Enregistrement du fournisseur en cours...';

        ipcRenderer.send('add-fournisseur', fournisseurData);
    });

    ipcRenderer.on('add-fournisseur-response', (event, response) => {
        if (response.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = `Fournisseur enregistré avec succès. ID: ${response.id}`;
            form.reset();
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = `Erreur lors de l'enregistrement : ${response.message}`;
            console.error("Erreur d'enregistrement fournisseur:", response.message);
        }
    });

    if (viewButton) {
        viewButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'voir_fournisseur.html'); 
        });
    } else {
        console.warn("Avertissement: Le bouton #btn-voir-liste n'a pas été trouvé.");
    }
    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'index.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});