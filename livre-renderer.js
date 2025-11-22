// livre-renderer.js

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('livre-form');
    const messageDiv = document.getElementById('message');
    const viewButton = document.getElementById('btn-voir-liste'); 
    const backButton = document.getElementById('btn-retour');
    
    // ✨ NOUVELLE DÉCLARATION DES SELECTS
    const auteurSelect = document.getElementById('id_auteur');
    const fournisseurSelect = document.getElementById('id_fournisseur');

    // Fonction utilitaire pour afficher les messages
    const displayMessage = (message, type = '') => {
        messageDiv.textContent = message;
        messageDiv.className = type; 
    };
    
    // ----------------------------------------------------
    // 1. GESTION DE L'ENREGISTREMENT
    // ----------------------------------------------------
    form.addEventListener('submit', (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const livreData = Object.fromEntries(formData.entries());

        // ✨ MODIFICATION : Simplification de la conversion de l'ID.
        // Les selects renvoient une chaîne vide ('') si rien n'est sélectionné.
        // La chaîne vide est traitée comme null par la suite, pas besoin de parseInt.
        // On s'assure juste que les valeurs sont bien transmises.
        livreData.id_auteur = livreData.id_auteur === '' ? null : livreData.id_auteur;
        livreData.id_fournisseur = livreData.id_fournisseur === '' ? null : livreData.id_fournisseur;

        messageDiv.className = '';
        messageDiv.textContent = 'Enregistrement du livre en cours...';

        ipcRenderer.send('add-livre', livreData);
    });

    ipcRenderer.on('add-livre-response', (event, response) => {
        if (response.success) {
            displayMessage(`Livre enregistré avec succès. ID: ${response.id}`, 'success');
            form.reset(); 
            // Recharger les dépendances pour remettre les listes à l'état initial
            loadDependencies();
        } else {
            displayMessage(`Erreur lors de l'enregistrement : ${response.message}`, 'error');
        }
    });
    
    // ----------------------------------------------------
    // 2. LOGIQUE DE CHARGEMENT DES LISTES DÉROULANTES
    // ----------------------------------------------------

    /**
     * Remplis le <select> avec les données (Nom pour l'affichage, ID pour la valeur).
     */
    const fillSelect = (selectElement, dataList, idKey, textKey, defaultText) => {
        selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`;
        
        dataList.forEach(item => {
            const option = document.createElement('option');
            // L'ID numérique est la VALEUR envoyée au main.js
            option.value = item[idKey]; 
            // Le Nom est le TEXTE affiché à l'utilisateur
            option.textContent = item[textKey]; 
            selectElement.appendChild(option);
        });
    };

    /**
     * Lance la requête pour récupérer les dépendances (auteurs et fournisseurs).
     */
    const loadDependencies = () => {
        ipcRenderer.send('get-livre-dependencies-for-add');
    };

    // Réponse de la requête des dépendances (remplissage)
    ipcRenderer.on('get-livre-dependencies-for-add-response', (event, response) => {
        if (response.success) {
            // Remplissage des auteurs
            fillSelect(auteurSelect, response.auteurs, 'id_auteur', 'nom_auteur_complet', 'Sélectionnez un auteur');
            
            // Remplissage des fournisseurs
            fillSelect(fournisseurSelect, response.fournisseurs, 'id_fournisseur', 'nom_fournisseur', 'Sélectionnez un fournisseur');
            
            
        } else {
            // Affichage de l'erreur en cas d'échec de la base de données
            displayMessage(`Impossible de charger les listes : ${response.message}.`, 'error');
            console.error("Erreur de chargement des dépendances:", response.message);
        }
    });

    // Déclenchement du chargement au démarrage de la page
    loadDependencies(); 
    
    // ----------------------------------------------------
    // 3. GESTION DES BOUTONS (INCHANGÉE)
    // ----------------------------------------------------
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