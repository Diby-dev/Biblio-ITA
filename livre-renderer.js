const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('livre-form');
    const messageDiv = document.getElementById('message');
    const viewButton = document.getElementById('btn-voir-liste'); 
    const backButton = document.getElementById('btn-retour');
    
    const auteurSelect = document.getElementById('id_auteur');
    const fournisseurSelect = document.getElementById('id_fournisseur');

    const displayMessage = (message, type = '') => {
        messageDiv.textContent = message;
        messageDiv.className = type; 
    };
    
    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const livreData = Object.fromEntries(formData.entries());

        livreData.id_auteur = livreData.id_auteur === '' ? null : livreData.id_auteur;
        livreData.id_fournisseur = livreData.id_fournisseur === '' ? null : livreData.id_fournisseur;
        const exemplairesParsed = parseInt(livreData.exemplaire_livre, 10);
        livreData.exemplaire_livre = isNaN(exemplairesParsed) || exemplairesParsed < 0 ? 0 : exemplairesParsed;

        messageDiv.className = '';
        messageDiv.textContent = 'Enregistrement du livre en cours...';

        ipcRenderer.send('add-livre', livreData);
    });

    ipcRenderer.on('add-livre-response', (event, response) => {
        if (response.success) {
            displayMessage(`Livre enregistré avec succès. ID: ${response.id}`, 'success');
            form.reset(); 

            loadDependencies();
        } else {
            displayMessage(`Erreur lors de l'enregistrement : ${response.message}`, 'error');
        }
    });
    
    const fillSelect = (selectElement, dataList, idKey, textKey, defaultText) => {
        selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`;
        
        dataList.forEach(item => {
            const option = document.createElement('option');
            option.value = item[idKey]; 
            option.textContent = item[textKey]; 
            selectElement.appendChild(option);
        });
    };

    const loadDependencies = () => {
        ipcRenderer.send('get-livre-dependencies-for-add');
    };

    ipcRenderer.on('get-livre-dependencies-for-add-response', (event, response) => {
        if (response.success) {
            fillSelect(auteurSelect, response.auteurs, 'id_auteur', 'nom_auteur_complet', 'Sélectionnez un auteur');
            
            fillSelect(fournisseurSelect, response.fournisseurs, 'id_fournisseur', 'nom_fournisseur', 'Sélectionnez un fournisseur');
            
            
        } else {
            displayMessage(`Impossible de charger les listes : ${response.message}.`, 'error');
            console.error("Erreur de chargement des dépendances:", response.message);
        }
    });

    loadDependencies(); 
    
    if (viewButton) {
        viewButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'voir_livre.html'); 
        });
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'index.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});