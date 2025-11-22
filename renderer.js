// Logique pour le Diaporama et l'Ouverture des Fenêtres

// L'API 'ipcRenderer' est utilisée pour communiquer avec le processus principal (main.js)
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------
    // 1. Logique d'Ouverture des Fenêtres (Utilisation de ipcRenderer)
    // --------------------------------------------------
    
    // Sélectionne tous les boutons avec la classe 'menu-button'
    const buttons = document.querySelectorAll('.menu-button');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Récupère la valeur de l'attribut data-target, qui est le nom du fichier HTML
            const targetFile = button.getAttribute('data-target');
            
            if (targetFile) {
                console.log(`Demande d'ouverture de la fenêtre : ${targetFile}`);
                // Envoie un message au processus principal pour ouvrir la fenêtre
                // Le canal de communication est 'open-window'
                ipcRenderer.send('open-window', targetFile);
            }
        });
    });


    // --------------------------------------------------
    // 2. Logique du Diaporama (Fondu) - CORRIGÉE pour transition 5s
    // --------------------------------------------------

    const slides = document.querySelectorAll('.slideshow-container .slide');
    let currentSlide = 0;

    function nextSlide() {
        if (slides.length === 0) return; // Sécurité

        // 1. Retire la classe 'active' de la diapositive ACTUELLE pour démarrer le FONDUE OUT
        // La transition CSS gère le fondu
        slides[currentSlide].classList.remove('active');
        
        // 2. Calcule l'index de la prochaine diapositive
        currentSlide = (currentSlide + 1) % slides.length;
        
        // 3. Ajoute la classe 'active' à la NOUVELLE diapositive pour démarrer le FONDUE IN
        slides[currentSlide].classList.add('active');
    }

    // Intervalle pour changer de diapositive toutes les 5 secondes (5000ms)
    // Le fondu se produit en 1s (défini dans le CSS de index.html) au début de chaque intervalle de 5 secondes.
    setInterval(nextSlide, 8000);

    // Initialisation : S'assurer que la première diapositive est active au démarrage
    if (slides.length > 0) {
        slides[0].classList.add('active');
    }
});