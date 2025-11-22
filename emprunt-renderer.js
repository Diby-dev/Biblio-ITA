// emprunt-renderer.js

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('emprunt-form');
    const messageDiv = document.getElementById('message');
    const viewButton = document.getElementById('btn-voir-liste'); 
    const backButton = document.getElementById('btn-retour');

    // Fonction utilitaire pour afficher les messages
    const displayMessage = (message, type = '') => {
        messageDiv.textContent = message;
        messageDiv.className = type; 
    };

    /**
     * Remplis le <select> avec les données.
     */
    const fillSelect = (selectElement, dataList, idKey, textKey, defaultText) => {
        if (!selectElement) return; // Sécurité

        selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`;
        
        dataList.forEach(item => {
            const option = document.createElement('option');
            option.value = item[idKey]; 
            option.textContent = item[textKey];
            selectElement.appendChild(option);
        });
    };
    
    /**
     * Lance la requête pour récupérer les dépendances.
     */
    const loadDependencies = () => {
        displayMessage('Chargement des listes de dépendance...', '');
        // 🎯 CORRECTION 1: Utiliser le NOUVEAU canal IPC pour l'ajout d'emprunt
        ipcRenderer.send('get-emprunt-add-dependencies');
    };

    // ----------------------------------------------------
    // 1. GESTION DE L'ENREGISTREMENT
    // ----------------------------------------------------
    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const empruntData = Object.fromEntries(formData.entries());

        // Assurer que les IDs sont des nombres et ne sont pas vides
        empruntData.id_utilisateur = empruntData.id_utilisateur === '' ? null : parseInt(empruntData.id_utilisateur, 10);
        empruntData.id_livre = empruntData.id_livre === '' ? null : parseInt(empruntData.id_livre, 10);
        
        if (!empruntData.id_utilisateur || !empruntData.id_livre) {
            displayMessage("Veuillez sélectionner un utilisateur et un livre.", 'error');
            return;
        }

        // Le champ date_retour est facultatif (peut être '')
        empruntData.date_retour_emprunt = empruntData.date_retour_emprunt.trim() === '' ? null : empruntData.date_retour_emprunt;


        messageDiv.className = '';
        messageDiv.textContent = 'Validation de l\'emprunt en cours...';

        ipcRenderer.send('add-emprunt', empruntData);
    });

    ipcRenderer.on('add-emprunt-response', (event, response) => {
        if (response.success) {
            displayMessage(`Emprunt enregistré avec succès. ID: ${response.id}.`, 'success');
            form.reset(); 
            // Recharger les dépendances pour retirer le livre qui vient d'être emprunté
            loadDependencies(); 
        } else {
            displayMessage(`Erreur lors de l'emprunt : ${response.message}`, 'error');
        }
    });

    // ----------------------------------------------------
    // 3. RÉPONSE DES DÉPENDANCES (CORRIGÉE)
    // ----------------------------------------------------
    // 🎯 CORRECTION 2: Écouter la NOUVELLE réponse IPC
    ipcRenderer.on('get-emprunt-add-dependencies-response', (event, response) => {
        if (response.success) {
            
            // 🎯 CORRECTION 3: Délai de rendu et ré-acquisition des références DOM pour la robustesse
            setTimeout(() => {
                
                const utilisateurSelectFresh = document.getElementById('id_utilisateur');
                const livreSelectFresh = document.getElementById('id_livre');
                
                if (!utilisateurSelectFresh || !livreSelectFresh) {
                    console.error("Erreur: Les éléments SELECT n'ont pas été trouvés après le délai.");
                    return;
                }

                // Remplissage des Utilisateurs (avec le nouvel alias SQL)
                fillSelect(utilisateurSelectFresh, 
                           response.utilisateurs, 
                           'id_utilisateur', 
                           'nom_complet_affichage', // 🎯 CLÉ MISE À JOUR !
                           'Sélectionnez un utilisateur');
                
                // Remplissage des Livres (uniquement Disponibles)
                fillSelect(livreSelectFresh, 
                           response.livres, 
                           'id_livre', 
                           'titre_livre', 
                           'Sélectionnez un livre disponible');
                
                displayMessage('Formulaire prêt. Les livres listés sont disponibles.', 'success');
                
            }, 50); // Délai de 50 millisecondes
            
        } else {
            displayMessage(`Impossible de charger les listes : ${response.message}.`, 'error');
            console.error("Erreur de chargement des dépendances d'emprunt:", response.message);
        }
    });

    // Déclenchement du chargement au démarrage de la page
    loadDependencies(); 

    // ----------------------------------------------------
    // 4. GESTION DES BOUTONS
    // ----------------------------------------------------
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