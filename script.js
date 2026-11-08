
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

document.addEventListener("DOMContentLoaded", () => {

    console.log("AFRICA AI est prêt.");

    // Fermeture du menu mobile
    document.querySelectorAll("#navigation a").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelector("#navigation")
                ?.classList.remove("active");
        });
    });

    // Les autres services sont encore en développement
    document.querySelectorAll(".service-card:not(.featured)")
        .forEach(card => {
            card.addEventListener("click", () => {
                const title = card.querySelector("h3");

                if (title) {
                    showMessage(
                        title.textContent +
                        " : cette fonctionnalité sera activée prochainement."
                    );
                }
            });
        });

    // Connexion du chat à Gemini
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");
    const sendButton = document.getElementById("sendButton");

    if (!chatForm || !chatInput || !chatMessages || !sendButton) {
        console.error("Interface AFRICA BRAIN introuvable.");
        return;
    }

    // Ajouter un message à la conversation
    function addMessage(role, content) {
        const message = document.createElement("div");
        message.className = "message " + role;

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = role === "user" ? "VOUS" : "✦";

        const messageContent = document.createElement("div");
        messageContent.className = "message-content";

        const name = document.createElement("span");
        name.textContent = role === "user" ? "VOUS" : "AFRICA AI";

        const paragraph = document.createElement("p");
        paragraph.textContent = content;

        messageContent.appendChild(name);
        messageContent.appendChild(paragraph);

        message.appendChild(avatar);
        message.appendChild(messageContent);

        chatMessages.appendChild(message);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return message;
    }

    // Envoyer le message à notre serveur
    chatForm.addEventListener("submit", async event => {
        event.preventDefault();

        const message = chatInput.value.trim();

        if (!message) {
            return;
        }

        addMessage("user", message);

        chatInput.value = "";
        sendButton.disabled = true;
        sendButton.textContent = "Envoi...";

        const loadingMessage = addMessage(
            "assistant",
            "AFRICA AI réfléchit..."
        );

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    message: message
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Erreur du serveur."
                );
            }

            if (typeof data.reply !== "string" || !data.reply.trim()) {
                throw new Error("La réponse reçue est vide.");
            }

            loadingMessage.remove();
            addMessage("assistant", data.reply);

        } catch (error) {
            console.error("Erreur AFRICA BRAIN :", error);

            loadingMessage.remove();

            addMessage(
                "assistant",
                "Je rencontre un problème de connexion. Vérifiez votre connexion Internet et réessayez."
            );

        } finally {
            sendButton.disabled = false;
            sendButton.textContent = "Envoyer ↗";
            chatInput.focus();
        }
    });

    // Entrée pour envoyer, Maj + Entrée pour aller à la ligne
    chatInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            chatForm.requestSubmit();
        }
    });

});
