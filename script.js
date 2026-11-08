
// ==========================================
// AFRICA AI - APPLICATION ET AUTHENTIFICATION
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyCzeNVIkx_vuFGFq43tgZlK-krkCanvg",
    authDomain: "africa-ai-3a773.firebaseapp.com",
    projectId: "africa-ai-3a773",
    storageBucket: "africa-ai-3a773.firebasestorage.app",
    messagingSenderId: "500182417635",
    appId: "1:500182417635:web:5fe7aba52aac11051185d6"
};

let auth = null;

try {
    if (!window.firebase) {
        throw new Error("Firebase n'a pas été chargé.");
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    auth = firebase.auth();

} catch (error) {
    console.error("Initialisation Firebase :", error);
}

// ==========================================
// ELEMENTS DE L'INTERFACE
// ==========================================

function element(id) {
    return document.getElementById(id);
}

const loginScreen = element("loginScreen");
const appShell = element("appShell");
const loginButton = element("googleLoginButton");
const loginError = element("loginError");

const chatForm = element("chatForm");
const chatInput = element("chatInput");
const chatMessages = element("chatMessages");
const sendButton = element("sendButton");

// ==========================================
// CONNEXION GOOGLE
// ==========================================

function showLoginError(message) {
    if (loginError) {
        loginError.textContent = message;
    }
}

function showApplication(user) {
    if (!loginScreen || !appShell) return;

    loginScreen.hidden = !!user;
    appShell.hidden = !user;

    if (user) {
        element("userName").textContent =
            user.displayName || "Utilisateur";

        element("userEmail").textContent =
            user.email || "Compte Google";

        const avatar = element("userAvatar");

        if (avatar) {
            avatar.textContent =
                (user.displayName || user.email || "A")
                .trim()
                .charAt(0)
                .toUpperCase();
        }

        showLoginError("");
    }
}

async function loginWithGoogle() {
    if (!auth) {
        showLoginError(
            "Impossible de charger le service de connexion. Actualisez la page."
        );
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Connexion en cours...";

    try {
        const provider = new firebase.auth.GoogleAuthProvider();

        provider.setCustomParameters({
            prompt: "select_account"
        });

        await auth.setPersistence(
            firebase.auth.Auth.Persistence.LOCAL
        );

        await auth.signInWithPopup(provider);

    } catch (error) {
        console.error("Erreur connexion Google :", error);

        const errors = {
            "auth/unauthorized-domain":
                "Ce domaine n'est pas autorisé dans Firebase Authentication.",

            "auth/popup-blocked":
                "Le navigateur a bloqué la fenêtre Google. Autorisez les fenêtres pop-up.",

            "auth/popup-closed-by-user":
                "La fenêtre de connexion a été fermée.",

            "auth/network-request-failed":
                "Vérifiez votre connexion Internet."
        };

        showLoginError(
            errors[error.code] ||
            "La connexion Google a échoué. Réessayez."
        );

    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML =
            '<span class="google-letter">G</span> Continuer avec Google';
    }
}

if (loginButton) {
    loginButton.addEventListener("click", loginWithGoogle);
}

// Surveiller automatiquement la connexion
if (auth) {
    auth.onAuthStateChanged(user => {
        showApplication(user);
    });
} else {
    showApplication(null);
}

// Déconnexion
const logoutButton = element("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        if (!auth) return;

        try {
            await auth.signOut();
        } catch (error) {
            console.error("Erreur de déconnexion :", error);
            alert("Impossible de se déconnecter.");
        }
    });
}

// ==========================================
// NAVIGATION ET MENUS
// ==========================================

const views = {
    assistant: {
        title: "AFRICA BRAIN",
        description: ""
    },

    web: {
        title: "AFRICA WEB",
        description:
            "Recherchez des informations sur Internet, analysez des liens et comparez des sources avec AFRICA AI."
    },

    learn: {
        title: "AFRICA LEARN",
        description:
            "Votre espace d'apprentissage, d'exercices et de formation sera développé ici."
    },

    code: {
        title: "AFRICA CODE",
        description:
            "Votre espace de programmation, de création et de correction de code sera développé ici."
    },

    create: {
        title: "AFRICA CREATE",
        description:
            "Votre espace de création de textes et de documents sera développé ici."
    },

    projects: {
        title: "MES PROJETS",
        description:
            "Retrouvez ici vos projets lorsque leur stockage sera intégré."
    },

    settings: {
        title: "PARAMÈTRES",
        description:
            "Votre compte Google est connecté à AFRICA AI. La gestion avancée du profil sera ajoutée prochainement."
    },

    premium: {
        title: "AFRICA PREMIUM",
        description:
            "Les fonctionnalités et abonnements Premium seront présentés ici."
    }
};

function closeSidebar() {
    appShell?.classList.remove("sidebar-open");
}

function openSidebar() {
    appShell?.classList.add("sidebar-open");
}

element("openSidebar")?.addEventListener("click", openSidebar);
element("closeSidebar")?.addEventListener("click", closeSidebar);

document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        const viewName = button.dataset.view;
        const view = views[viewName];

        if (!view) return;

        document.querySelectorAll("[data-view]").forEach(item => {
            item.classList.toggle("active", item === button);
        });

        const isAssistant = viewName === "assistant";

        element("assistantView").hidden = !isAssistant;
        element("placeholderView").hidden = isAssistant;

        element("currentPageTitle").textContent = view.title;

        if (!isAssistant) {
            element("placeholderTitle").textContent = view.title;
            element("placeholderDescription").textContent =
                view.description;
        }

        closeSidebar();
    });
});

element("returnAssistantButton")?.addEventListener("click", () => {
    document.querySelector('[data-view="assistant"]')?.click();
});

// ==========================================
// FORMATAGE DES REPONSES
// ==========================================

function safeUrl(value) {
    try {
        const url = new URL(value);

        if (["https:", "http:"].includes(url.protocol)) {
            return url.href;
        }
    } catch (error) {
        return null;
    }

    return null;
}

function renderInline(parent, value) {
    const text = String(value).replace(
        /\\([*_`#])/g,
        "$1"
    );

    const pattern =
        /(\*\*[^*]+?\*\*|__[^_]+?__|`[^`]+`|\*[^*\n]+?\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s<]+)/g;

    let position = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        parent.appendChild(
            document.createTextNode(
                text.slice(position, match.index)
            )
        );

        const token = match[0];
        let node = null;

        if (token.startsWith("**") || token.startsWith("__")) {
            node = document.createElement("strong");
            node.textContent = token.slice(2, -2);

        } else if (token.startsWith("`")) {
            node = document.createElement("code");
            node.textContent = token.slice(1, -1);

        } else if (token.startsWith("*")) {
            node = document.createElement("em");
            node.textContent = token.slice(1, -1);

        } else {
            const markdownLink = token.match(
                /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/
            );

            const address = markdownLink
                ? markdownLink[2]
                : token.replace(/[.,;!?]+$/, "");

            const url = safeUrl(address);

            if (url) {
                node = document.createElement("a");
                node.href = url;
                node.textContent = markdownLink
                    ? markdownLink[1]
                    : address;
                node.target = "_blank";
                node.rel = "noopener noreferrer";
                node.className = "message-link";
            }

            if (node && !markdownLink) {
                parent.appendChild(node);
                parent.appendChild(
                    document.createTextNode(
                        token.slice(address.length)
                    )
                );
                position = pattern.lastIndex;
                continue;
            }
        }

        if (node) {
            parent.appendChild(node);
        } else {
            parent.appendChild(document.createTextNode(token));
        }

        position = pattern.lastIndex;
    }

    parent.appendChild(
        document.createTextNode(text.slice(position))
    );
}

async function copyText(text, button) {
    try {
        await navigator.clipboard.writeText(text);

        const oldText = button.textContent;
        button.textContent = "Copié !";

        setTimeout(() => {
            button.textContent = oldText;
        }, 1500);

    } catch (error) {
        button.textContent = "Copie indisponible";
    }
}

function renderMessage(container, source) {
    container.replaceChildren();

    const lines = String(source).split(/\r?\n/);

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
            if (index > 0) {
                p.appendChild(document.createElement("br"));
            }

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

    if (inCode) finishCode();
}

// ==========================================
// HISTORIQUE LOCAL DES CONVERSATIONS
// ==========================================

let conversations = [];
let activeConversation = null;

function welcomeMessage() {
    return [{
        role: "assistant",
        content:
            "Bonjour ! Je suis AFRICA AI. Comment puis-je vous aider aujourd'hui ?"
    }];
}

function ensureConversation(firstMessage) {
    if (!activeConversation) {
        activeConversation = {
            id: Date.now(),
            title: firstMessage.slice(0, 38),
            messages: []
        };

        conversations.unshift(activeConversation);
        renderConversationHistory();
    }
}

function renderConversationHistory() {
    const history = element("conversationHistory");

    if (!history) return;

    history.replaceChildren();

    if (!conversations.length) {
        const empty = document.createElement("p");
        empty.className = "empty-history";
        empty.textContent = "Aucune conversation enregistrée.";
        history.appendChild(empty);
        return;
    }

    conversations.forEach(conversation => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-item";
        button.textContent = conversation.title;

        button.addEventListener("click", () => {
            activeConversation = conversation;
            showConversation(conversation);
            document.querySelector('[data-view="assistant"]')?.click();
        });

        history.appendChild(button);
    });
}

function addMessage(role, content, save = true) {
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

    if (role === "assistant" && save) {
        const actions = document.createElement("div");
        actions.className = "message-actions";

        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "copy-button";
        copy.textContent = "Copier la réponse";

        copy.addEventListener("click", () => {
            copyText(content, copy);
        });

        actions.appendChild(copy);
        messageContent.appendChild(actions);
    }

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (save && activeConversation) {
        activeConversation.messages.push({
            role,
            content
        });
    }

    return message;
}

function showConversation(conversation) {
    chatMessages.replaceChildren();

    const messages = conversation.messages.length
        ? conversation.messages
        : welcomeMessage();

    messages.forEach(message => {
        addMessage(
            message.role,
            message.content,
            false
        );
    });
}

function newConversation() {
    activeConversation = null;

    chatMessages.replaceChildren();

    welcomeMessage().forEach(message => {
        addMessage(message.role, message.content, false);
    });

    chatInput.value = "";

    document.querySelector('[data-view="assistant"]')?.click();
    closeSidebar();
}

element("newConversationButton")?.addEventListener(
    "click",
    newConversation
);

// ==========================================
// CHAT GEMINI ET RECHERCHE INTERNET
// ==========================================

if (chatForm && chatInput && chatMessages && sendButton) {

    chatForm.addEventListener("submit", async event => {
        event.preventDefault();

        const message = chatInput.value.trim();

        if (!message || sendButton.disabled) return;

        if (!auth || !auth.currentUser) {
            alert("Connectez-vous avec Google avant de discuter.");
            return;
        }

        ensureConversation(message);

        addMessage("user", message);

        chatInput.value = "";
        sendButton.disabled = true;
        sendButton.textContent = "Envoi...";

        const loadingMessage = addMessage(
            "assistant",
            "AFRICA AI réfléchit...",
            false
        );

        try {
            const idToken = await auth.currentUser.getIdToken();

            const response = await fetch("/api/chat", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": "Bearer " + idToken
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

            if (
                typeof data.reply !== "string" ||
                !data.reply.trim()
            ) {
                throw new Error("Réponse vide.");
            }

            loadingMessage.remove();

            addMessage("assistant", data.reply);

        } catch (error) {
            console.error("Erreur AFRICA AI :", error);

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
}

// ==========================================
// DEMARRAGE
// ==========================================

element("returnAssistantButton")?.addEventListener(
    "click",
    newConversation
);

document.addEventListener("DOMContentLoaded", () => {
    console.log("AFRICA AI est prêt.");
    renderConversationHistory();
});
