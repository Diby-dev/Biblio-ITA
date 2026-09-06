const { ipcRenderer } = window.electron;

document.addEventListener('DOMContentLoaded', () => {

    const buttons = document.querySelectorAll('.menu-buttonvi');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const targetFile = button.getAttribute('data-target');
            
            if (targetFile) {
                console.log(`Demande d'ouverture de la fenêtre : ${targetFile}`);
                ipcRenderer.send('open-window', targetFile);
            }
        });
    });

    const slides = document.querySelectorAll('.slideshow-container .slide');
    let currentSlide = 0;

    function nextSlide() {
        if (slides.length === 0) return;

        slides[currentSlide].classList.remove('active');
        
        currentSlide = (currentSlide + 1) % slides.length;
        
        slides[currentSlide].classList.add('active');
    }

    setInterval(nextSlide, 8000);

    if (slides.length > 0) {
        slides[0].classList.add('active');
    }
});