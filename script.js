
// AFRICA AI - Interface intelligente

function toggleMenu() {
    const navigation = document.querySelector("#navigation");

    if (navigation) {
        navigation.classList.toggle("active");
    }
}

function showMessage(message) {
    alert(message);
}

// Vérifier les liens avant de les rendre cliquables
function safeUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }
    } catch (error) {
        return null;
    }
    return null;
}

// Mise en forme du texte sans afficher les signes Markdown
function renderInline(parent, value) {
    const text = String(value)
        .replace(/\\([*_`#])/g, "$1")
        .replace(/&#x20;|&nbsp;/gi, " ");

    const pattern =
        /(\*\*[^*]+?\*\*|__[^_]+?__|`[^`]+`|\*[^*\n]+?\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s<]+)/g;

    let position = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        parent.appendChild(
            document.createTextNode(text.slice(position, match.index))
        );

        const token = match[0];
        let element = null;

        if (token.startsWith("**") || token.startsWith("__")) {
            element = document.createElement("strong");
            element.textContent = token.slice(2, -2);

        } else if (token.startsWith("`")) {
            element = document.createElement("code");
            element.textContent = token.slice(1, -1);

        } else if (token.startsWith("*")) {
            element = document.createElement("em");
            element.textContent = token.slice(1, -1);

        } else {
            const linkMatch = token.match(
                /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/
            );

            const bareLink = token.match(/^https?:\/\//);

            let label;
            let address;

            if (linkMatch) {
                label = linkMatch[1];
                address = linkMatch[2];
            } else if (bareLink) {
                address = token.replace(/[.,;!?]+$/, "");
                label = address;
            }

            const validAddress = address ? safeUrl(address) : null;

            if (validAddress) {
                element = document.createElement("a");
                element.href = validAddress;
                element.textContent = label;
                element.target = "_blank";
                element.rel = "noopener noreferrer";
                element.className = "message-link";
            }

            if (element && bareLink) {
                const punctuation = token.slice(address.length);
                parent.appendChild(element);
                parent.appendChild(document.createTextNode(punctuation));
                position = pattern.lastIndex;
                continue;
            }
        }

        if (element) {
            parent.appendChild(element);
        } else {
            parent.appendChild(document.createTextNode(token));
        }

        position = pattern.lastIndex;
    }

    parent.appendChild(document.createTextNode(text.slice(position)));
}

// Copier du texte
async function copyText(text, button) {
    try {
        await navigator.clipboard.writeText(text);

        const oldLabel = button.textContent;
        button.textContent = "Copié !";

        setTimeout(() => {
            button.textContent = oldLabel;
        }, 1500);

    } catch (error) {
        button.textContent = "Copie indisponible";
    }
}

// Afficher les réponses proprement
function renderMessage(container, source) {
    container.replaceChildren();

    const lines = String(source).split("\n");

    let paragraph = [];
    let currentList = null;
    let listType = null;
    let inCode = false;
    let codeLines = [];
    let codeLanguage = "";

    function finishParagraph() {
        if (!paragraph.length) return;

        const p = document.createElement("p");

        paragraph.forEach((line, index) => {
            if (index > 0) p.appendChild(document.createElement("br"));
            renderInline(p, line);
        });

        container.appendChild(p);
        paragraph = [];
    }

    function finishList() {
        if (currentList) {
            container.appendChild(currentList);
            currentList = null;
            listType = null;
        }
    }

    function finishCode() {
        const wrapper = document.createElement("div");
        wrapper.className = "code-wrapper";

        const header = document.createElement("div");
        header.className = "code-header";

        const language = document.createElement("span");
        language.textContent = codeLanguage || "Code";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy-button";
        button.textContent = "Copier le code";

        const codeText = codeLines.join("\n");

        button.addEventListener("click", () => {
            copyText(codeText, button);
        });

        header.appendChild(language);
        header.appendChild(button);

        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = codeText;

        pre.appendChild(code);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
        container.appendChild(wrapper);

        codeLines = [];
        codeLanguage = "";
    }

    for (const line of lines) {

        if (line.trim().startsWith("```")) {
            finishParagraph();
            finishList();

            if (inCode) {
                finishCode();
                inCode = false;
            } else {
                inCode = true;
                codeLanguage = line.trim().slice(3).trim();
            }

            continue;
        }

        if (inCode) {
            codeLines.push(line);
            continue;
        }

        if (!line.trim()) {
            finishParagraph();
            finishList();
            continue;
        }

        const heading = line.match(/^#{1,4}\s+(.+)$/);

        if (heading) {
            finishParagraph();
            finishList();

            const h = document.createElement("h3");
            renderInline(h, heading[1]);
            container.appendChild(h);
            continue;
        }

        const unordered = line.match(/^\s*[-*]\s+(.+)$/);
        const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);

        if (unordered || ordered) {
            finishParagraph();

            const type = unordered ? "ul" : "ol";

            if (!currentList || listType !== type) {
                finishList();
                currentList = document.createElement(type);
                listType = type;
            }

            const li = document.createElement("li");
            renderInline(li, (unordered || ordered)[1]);
            currentList.appendChild(li);
            continue;
        }

        finishList();
        paragraph.push(line);
    }

    finishParagraph();
    finishList();

    if (inCode) {
        finishCode();
    }
}

// Démarrage de AFRICA AI
document.addEventListener("DOMContentLoaded", () => {

    console.log("AFRICA AI est prêt.");

    document.querySelectorAll("#navigation a").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelector("#navigation")
                ?.classList.remove("active");
        });
    });

    document.querySelectorAll(".service-card:not(.featured)")
        .forEach(card => {
            card.addEventListener("click", () => {
                const title = card.querySelector("h3");

                if (title) {
                    showMessage(
                        title.textContent +
                        " : cette fonctionnalité sera bientôt disponible."
                    );
                }
            });
        });

    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");
    const sendButton = document.getElementById("sendButton");

    if (!chatForm || !chatInput || !chatMessages || !sendButton) {
        return;
    }

    function addMessage(role, content) {
        const message = document.createElement("div");
        message.className = "message " + role;

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = role === "user" ? "●" : "✦";

        const messageContent = document.createElement("div");
        messageContent.className = "message-content";

        const name = document.createElement("span");
        name.textContent = role === "user" ? "VOUS" : "AFRICA AI";

        const body = document.createElement("div");
        body.className = "message-body";

        renderMessage(body, content);

        messageContent.appendChild(name);
        messageContent.appendChild(body);

        message.appendChild(avatar);
        message.appendChild(messageContent);

        if (role === "assistant" &&
            content !== "AFRICA AI réfléchit...") {

            const actions = document.createElement("div");
            actions.className = "message-actions";

            const copyButton = document.createElement("button");
            copyButton.type = "button";
            copyButton.className = "copy-button";
            copyButton.textContent = "Copier la réponse";

            copyButton.addEventListener("click", () => {
                copyText(content, copyButton);
            });

            actions.appendChild(copyButton);
            messageContent.appendChild(actions);
        }

        chatMessages.appendChild(message);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return message;
    }

    chatForm.addEventListener("submit", async event => {
        event.preventDefault();

        const message = chatInput.value.trim();

        if (!message || sendButton.disabled) return;

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
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Erreur du serveur.");
            }

            if (typeof data.reply !== "string" || !data.reply.trim()) {
                throw new Error("Réponse vide.");
            }

            loadingMessage.remove();
            addMessage("assistant", data.reply);

        } catch (error) {
            console.error("Erreur AFRICA BRAIN :", error);

            loadingMessage.remove();

            addMessage(
                "assistant",
                "Je rencontre un problème de connexion. Veuillez réessayer."
            );

        } finally {
            sendButton.disabled = false;
            sendButton.textContent = "Envoyer ↗";
            chatInput.focus();
        }
    });

    chatInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            chatForm.requestSubmit();
        }
    });

});
