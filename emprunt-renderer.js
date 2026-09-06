const { ipcRenderer } = window.electron;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('emprunt-form');
    const messageDiv = document.getElementById('message');
    const viewButton = document.getElementById('btn-voir-liste'); 
    const backButton = document.getElementById('btn-retour');

    const displayMessage = (message, type = '') => {
        messageDiv.textContent = message;
        messageDiv.className = type; 
    };

    const fillSelect = (selectElement, dataList, idKey, textKey, defaultText) => {
        if (!selectElement) return;

        selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`;
        
        dataList.forEach(item => {
            const option = document.createElement('option');
            option.value = item[idKey]; 
            option.textContent = item[textKey];
            selectElement.appendChild(option);
        });
    };
    
    const loadDependencies = () => {
        displayMessage('Chargement des listes de dépendance...', '');
        ipcRenderer.send('get-emprunt-add-dependencies');
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const empruntData = Object.fromEntries(formData.entries());

        empruntData.id_utilisateur = empruntData.id_utilisateur === '' ? null : parseInt(empruntData.id_utilisateur, 10);
        empruntData.id_livre = empruntData.id_livre === '' ? null : parseInt(empruntData.id_livre, 10);
        
        if (!empruntData.id_utilisateur || !empruntData.id_livre) {
            displayMessage("Veuillez sélectionner un utilisateur et un livre.", 'error');
            return;
        }

        empruntData.date_retour_emprunt = empruntData.date_retour_emprunt.trim() === '' ? null : empruntData.date_retour_emprunt;


        messageDiv.className = '';
        messageDiv.textContent = 'Validation de l\'emprunt en cours...';

        ipcRenderer.send('add-emprunt', empruntData);
    });

    ipcRenderer.on('add-emprunt-response', (event, response) => {
        if (response.success) {
            displayMessage(`Emprunt enregistré avec succès. ID: ${response.id}.`, 'success');
            form.reset(); 
            loadDependencies(); 
        } else {
            displayMessage(`Erreur lors de l'emprunt : ${response.message}`, 'error');
        }
    });

    ipcRenderer.on('get-emprunt-add-dependencies-response', (event, response) => {
        if (response.success) {
            
            setTimeout(() => {
                
                const utilisateurSelectFresh = document.getElementById('id_utilisateur');
                const livreSelectFresh = document.getElementById('id_livre');
                
                if (!utilisateurSelectFresh || !livreSelectFresh) {
                    console.error("Erreur: Les éléments SELECT n'ont pas été trouvés après le délai.");
                    return;
                }

                fillSelect(utilisateurSelectFresh, 
                           response.utilisateurs, 
                           'id_utilisateur', 
                           'nom_complet_affichage', 
                           'Sélectionnez un utilisateur');
                
                fillSelect(livreSelectFresh, 
                           response.livres, 
                           'id_livre', 
                           'titre_livre', 
                           'Sélectionnez un livre disponible');
                
                displayMessage('.', 'success');
                
            }, 50);
            
        } else {
            displayMessage(`Impossible de charger les listes : ${response.message}.`, 'error');
            console.error("Erreur de chargement des dépendances d'emprunt:", response.message);
        }
    });

    loadDependencies(); 

    if (viewButton) {
        viewButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'voir_emprunt.html'); 
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