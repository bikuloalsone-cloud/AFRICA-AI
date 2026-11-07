// AFRICA AI - Script principal

function toggleMenu() {
    const navigation = document.querySelector("nav");

    if (navigation) {
        navigation.classList.toggle("active");
    }
}

function showMessage(message) {
    alert(message);
}

// Fermer le menu après avoir choisi une rubrique
document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", () => {
        const navigation = document.querySelector("nav");

        if (navigation) {
            navigation.classList.remove("active");
        }
    });
});

// Message pour les fonctionnalités pas encore connectées
document.addEventListener("DOMContentLoaded", () => {
    console.log("AFRICA AI est prêt.");

    document.querySelectorAll(".service-card").forEach(card => {
        card.addEventListener("click", () => {
            const title = card.querySelector("h3");

            if (title) {
                showMessage(
                    title.textContent +
                    " : cette fonctionnalité sera activée dans une prochaine étape."
                );
            }
        });
    });
});
