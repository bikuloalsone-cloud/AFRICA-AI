
// =====================================================
// AFRICA AI - SCRIPT PRINCIPAL
// Firebase Google Authentication + Gemini + Supabase
// =====================================================

const firebaseConfig = {
    apiKey: "AIzaSyCzeNVIkx_vuFGFq43tgPhZlK-krkCanvg",
    authDomain: "africa-ai-3a773.firebaseapp.com",
    projectId: "africa-ai-3a773",
    storageBucket: "africa-ai-3a773.firebasestorage.app",
    messagingSenderId: "500182417635",
    appId: "1:500182417635:web:5fe7aba52aac11051185d6"
};

// =====================================================
// 1. INITIALISATION FIREBASE
// =====================================================

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();

let currentUser = null;
let activeConversation = null;
let conversations = [];
let sendingMessage = false;


// =====================================================
// 2. ELEMENTS HTML
// =====================================================

const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");

const googleLoginButton = document.getElementById(
    "googleLoginButton"
);

const loginError = document.getElementById("loginError");

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userAvatar = document.getElementById("userAvatar");

const logoutButton = document.getElementById("logoutButton");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const sendButton = document.getElementById("sendButton");

const conversationHistory = document.getElementById(
    "conversationHistory"
);

const newConversationButton = document.getElementById(
    "newConversationButton"
);

const assistantView = document.getElementById("assistantView");
const placeholderView = document.getElementById("placeholderView");
const memoryView = document.getElementById("memoryView");
const memoryEnabledToggle = document.getElementById("memoryEnabledToggle");
const memoryList = document.getElementById("memoryList");
const memoryCount = document.getElementById("memoryCount");
const memoryStatus = document.getElementById("memoryStatus");
const memoryForm = document.getElementById("memoryForm");
const memoryInput = document.getElementById("memoryInput");
const saveMemoryButton = document.getElementById("saveMemoryButton");
const refreshMemoriesButton = document.getElementById("refreshMemoriesButton");
const deleteAllMemoriesButton = document.getElementById("deleteAllMemoriesButton");
let memoriesCache = [];

const currentPageTitle = document.getElementById(
    "currentPageTitle"
);

const placeholderTitle = document.getElementById(
    "placeholderTitle"
);

const placeholderDescription = document.getElementById(
    "placeholderDescription"
);

const openSidebar = document.getElementById("openSidebar");
const closeSidebar = document.getElementById("closeSidebar");
const sidebar = document.getElementById("sidebar");

const returnAssistantButton = document.getElementById(
    "returnAssistantButton"
);


// =====================================================
// 3. OUTILS
// =====================================================

function showMessage(message) {
    alert(message);
}

function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

function formatMessage(text) {
    return escapeHTML(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

async function getAuthHeaders() {
    if (!currentUser) {
        throw new Error("Vous devez vous connecter.");
    }

    const token = await currentUser.getIdToken();

    return {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
    };
}

async function apiRequest(url, options = {}) {
    const headers = await getAuthHeaders();

    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {})
        }
    });

    let result = {};

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(
            result.detail || "Une erreur est survenue."
        );
    }

    return result;
}


// =====================================================
// 4. CONNEXION GOOGLE
// =====================================================

async function loginWithGoogle() {
    loginError.textContent = "";

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
        console.error("ERREUR GOOGLE :", error);

        loginError.textContent =
            "Connexion impossible : " + error.message;
    }
}

if (googleLoginButton) {
    googleLoginButton.addEventListener(
        "click",
        loginWithGoogle
    );
}


// =====================================================
// 5. AFFICHER L'APPLICATION
// =====================================================

function showApplication(user) {
    currentUser = user;

    loginScreen.hidden = true;
    appShell.hidden = false;

    userName.textContent =
        user.displayName || "Utilisateur";

    userEmail.textContent =
        user.email || "";

    if (user.photoURL) {
        userAvatar.innerHTML = "";

        const image = document.createElement("img");

        image.src = user.photoURL;
        image.alt = "Photo de profil";
        image.referrerPolicy = "no-referrer";

        userAvatar.appendChild(image);

    } else {
        userAvatar.textContent =
            (user.displayName || "A").charAt(0).toUpperCase();
    }

    synchroniserProfil();
    chargerConversations();
    chargerParametresMemoire();
    chargerMemoires();
}


// =====================================================
// 6. ENREGISTRER LE PROFIL DANS SUPABASE
// =====================================================

async function synchroniserProfil() {
    try {
        await apiRequest("/api/profile", {
            method: "POST"
        });

        console.log("Profil AFRICA AI synchronisé.");

    } catch (error) {
        console.error(
            "ERREUR SYNCHRONISATION PROFIL :",
            error
        );
    }
}


// =====================================================
// 7. DECONNEXION
// =====================================================

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await auth.signOut();

            currentUser = null;
            activeConversation = null;
            conversations = [];

        } catch (error) {
            showMessage(
                "Erreur de déconnexion : " + error.message
            );
        }
    });
}


// =====================================================
// 8. SURVEILLER LA CONNEXION
// =====================================================

auth.onAuthStateChanged(user => {
    if (user) {
        showApplication(user);

    } else {
        currentUser = null;

        loginScreen.hidden = false;
        appShell.hidden = true;

        conversations = [];
        activeConversation = null;
        memoriesCache = [];
    }
});


// =====================================================
// 9. CHARGER LES CONVERSATIONS
// =====================================================

async function chargerConversations() {
    if (!currentUser) return;

    try {
        const result = await apiRequest(
            "/api/conversations"
        );

        conversations = result.conversations || [];

        afficherHistorique();

    } catch (error) {
        console.error(
            "ERREUR CHARGEMENT CONVERSATIONS :",
            error
        );

        conversationHistory.innerHTML =
            '<p class="empty-history">Impossible de charger l’historique.</p>';
    }
}


// =====================================================
// 10. AFFICHER L'HISTORIQUE
// =====================================================

function afficherHistorique() {
    conversationHistory.innerHTML = "";

    if (!conversations.length) {
        conversationHistory.innerHTML =
            '<p class="empty-history">Aucune conversation enregistrée.</p>';

        return;
    }

    conversations.forEach(conversation => {
        const button = document.createElement("button");

        button.className = "conversation-item";

        if (
            activeConversation &&
            activeConversation.id === conversation.id
        ) {
            button.classList.add("active");
        }

        button.textContent = conversation.title;

        button.addEventListener("click", () => {
            ouvrirConversation(conversation.id);
        });

        conversationHistory.appendChild(button);
    });
}


// =====================================================
// 11. OUVRIR UNE ANCIENNE CONVERSATION
// =====================================================

async function ouvrirConversation(id) {
    try {
        const result = await apiRequest(
            "/api/conversations/" + encodeURIComponent(id) + "/messages"
        );

        activeConversation = {
            id: id,
            messages: result.messages || []
        };

        chatMessages.innerHTML = "";

        activeConversation.messages.forEach(message => {
            ajouterMessage(
                message.role,
                message.content,
                false
            );
        });

        afficherHistorique();

        afficherVue("assistant");

        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
        console.error("ERREUR OUVERTURE :", error);

        showMessage(
            "Impossible d'ouvrir cette conversation : " +
            error.message
        );
    }
}


// =====================================================
// 12. AFFICHER UN MESSAGE
// =====================================================

function ajouterMessage(role, content, sauvegarder = true) {
    const message = document.createElement("div");

    message.className =
        role === "user"
            ? "message user"
            : "message assistant";

    const avatar = document.createElement("div");

    avatar.className = "message-avatar";

    avatar.textContent =
        role === "user"
            ? "Vous"
            : "✦";

    const messageContent = document.createElement("div");

    messageContent.className = "message-content";

    const author = document.createElement("span");

    author.textContent =
        role === "user"
            ? "VOUS"
            : "AFRICA AI";

    const body = document.createElement("div");

    body.className = "message-body";

    body.innerHTML =
        "<p>" + formatMessage(content) + "</p>";

    messageContent.appendChild(author);
    messageContent.appendChild(body);

    message.appendChild(avatar);
    message.appendChild(messageContent);

    chatMessages.appendChild(message);

    if (sauvegarder && activeConversation) {
        activeConversation.messages.push({
            role: role,
            content: content
        });
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// =====================================================
// 13. INDICATEUR DE CHARGEMENT
// =====================================================

function afficherChargement() {
    const loading = document.createElement("div");

    loading.id = "africaLoading";
    loading.className = "message assistant";

    loading.innerHTML = `
        <div class="message-avatar">✦</div>
        <div class="message-content">
            <span>AFRICA AI</span>
            <div class="message-body">
                <p>AFRICA AI réfléchit...</p>
            </div>
        </div>
    `;

    chatMessages.appendChild(loading);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function retirerChargement() {
    const loading = document.getElementById(
        "africaLoading"
    );

    if (loading) {
        loading.remove();
    }
}


// =====================================================
// 14. ENVOYER UN MESSAGE A GEMINI
// =====================================================

async function envoyerMessage(message) {
    if (!currentUser || sendingMessage) return;

    sendingMessage = true;
    sendButton.disabled = true;

    ajouterMessage("user", message);

    afficherChargement();

    try {
        const result = await apiRequest("/api/chat", {
            method: "POST",

            body: JSON.stringify({
                message: message,
                conversation_id:
                    activeConversation?.id || null
            })
        });

        retirerChargement();

        if (!activeConversation) {
            activeConversation = {
                id: result.conversation_id,
                messages: []
            };
        }

        activeConversation.id = result.conversation_id;

        ajouterMessage(
            "assistant",
            result.reply
        );

        await chargerConversations();

    } catch (error) {
        retirerChargement();

        console.error("ERREUR CHAT :", error);

        ajouterMessage(
            "assistant",
            "Une erreur est survenue : " + error.message
        );

    } finally {
        sendingMessage = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}


// =====================================================
// 15. FORMULAIRE DE CHAT
// =====================================================

if (chatForm) {
    chatForm.addEventListener("submit", async event => {
        event.preventDefault();

        const message = chatInput.value.trim();

        if (!message || sendingMessage) return;

        chatInput.value = "";

        await envoyerMessage(message);
    });
}


// =====================================================
// 16. NOUVELLE CONVERSATION
// =====================================================

function nouvelleConversation() {
    activeConversation = null;

    chatMessages.innerHTML = `
        <div class="message assistant">
            <div class="message-avatar">✦</div>
            <div class="message-content">
                <span>AFRICA AI</span>
                <div class="message-body">
                    <p>
                        Bonjour ! Je suis AFRICA AI.
                        Comment puis-je vous aider aujourd'hui ?
                    </p>
                </div>
            </div>
        </div>
    `;

    afficherHistorique();
    afficherVue("assistant");

    chatInput.focus();
}

if (newConversationButton) {
    newConversationButton.addEventListener(
        "click",
        nouvelleConversation
    );
}


// =====================================================
// AFRICA MEMORY 2.0 : GESTION DES SOUVENIRS
// =====================================================

function afficherStatutMemoire(message, erreur = false) {
    if (!memoryStatus) return;
    memoryStatus.textContent = message;
    memoryStatus.classList.toggle("error", erreur);
}

async function chargerParametresMemoire() {
    if (!currentUser || !memoryEnabledToggle) return;
    try {
        const result = await apiRequest("/api/memories/settings");
        memoryEnabledToggle.checked = result.enabled !== false;
    } catch (error) {
        afficherStatutMemoire("Impossible de charger le réglage mémoire : " + error.message, true);
    }
}

async function chargerMemoires() {
    if (!currentUser || !memoryList) return;
    memoryList.innerHTML = '<p class="memory-empty">Chargement des souvenirs…</p>';
    try {
        const result = await apiRequest("/api/memories");
        memoriesCache = Array.isArray(result.memories) ? result.memories : [];
        afficherMemoires();
    } catch (error) {
        memoryList.innerHTML = '<p class="memory-empty">Impossible de charger les souvenirs.</p>';
        memoryCount.textContent = "Chargement impossible";
        afficherStatutMemoire(error.message, true);
    }
}

function afficherMemoires() {
    if (!memoryList) return;
    memoryCount.textContent = memoriesCache.length + (memoriesCache.length === 1 ? " souvenir enregistré" : " souvenirs enregistrés");
    memoryList.innerHTML = "";
    if (!memoriesCache.length) {
        memoryList.innerHTML = '<p class="memory-empty">Aucun souvenir enregistré pour le moment.</p>';
        return;
    }
    memoriesCache.forEach(memory => {
        const card = document.createElement("article");
        card.className = "memory-item";
        const content = document.createElement("p");
        content.textContent = memory.content || "Souvenir sans contenu";
        const date = document.createElement("small");
        const parsedDate = memory.created_at ? new Date(memory.created_at) : null;
        date.textContent = parsedDate && !Number.isNaN(parsedDate.getTime()) ? "Enregistré le " + parsedDate.toLocaleString("fr-FR") : "Date inconnue";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "memory-delete-btn";
        remove.textContent = "Supprimer";
        remove.addEventListener("click", () => supprimerMemoire(memory.id));
        const meta = document.createElement("div");
        meta.className = "memory-item-meta";
        meta.append(date, remove);
        card.append(content, meta);
        memoryList.appendChild(card);
    });
}

async function ajouterSouvenir(content) {
    const result = await apiRequest("/api/memories", {
        method: "POST",
        body: JSON.stringify({ content })
    });
    await chargerMemoires();
    return result;
}

async function supprimerMemoire(id) {
    if (!id || !confirm("Supprimer définitivement ce souvenir ?")) return;
    try {
        await apiRequest("/api/memories/" + encodeURIComponent(id), { method: "DELETE" });
        afficherStatutMemoire("Souvenir supprimé.");
        await chargerMemoires();
    } catch (error) {
        afficherStatutMemoire("Suppression impossible : " + error.message, true);
    }
}

if (memoryForm) {
    memoryForm.addEventListener("submit", async event => {
        event.preventDefault();
        const content = memoryInput.value.trim();
        if (!content) return afficherStatutMemoire("Écris un souvenir avant de l'enregistrer.", true);
        saveMemoryButton.disabled = true;
        try {
            await ajouterSouvenir(content);
            memoryInput.value = "";
            afficherStatutMemoire("Souvenir enregistré avec succès.");
        } catch (error) {
            afficherStatutMemoire("Enregistrement impossible : " + error.message, true);
        } finally {
            saveMemoryButton.disabled = false;
        }
    });
}

if (memoryEnabledToggle) {
    memoryEnabledToggle.addEventListener("change", async () => {
        const desired = memoryEnabledToggle.checked;
        memoryEnabledToggle.disabled = true;
        try {
            const result = await apiRequest("/api/memories/settings", {
                method: "PATCH",
                body: JSON.stringify({ enabled: desired })
            });
            memoryEnabledToggle.checked = result.enabled;
            afficherStatutMemoire(result.enabled ? "Mémoire activée." : "Mémoire désactivée.");
        } catch (error) {
            memoryEnabledToggle.checked = !desired;
            afficherStatutMemoire("Impossible de modifier le réglage : " + error.message, true);
        } finally {
            memoryEnabledToggle.disabled = false;
        }
    });
}

if (refreshMemoriesButton) refreshMemoriesButton.addEventListener("click", chargerMemoires);

if (deleteAllMemoriesButton) {
    deleteAllMemoriesButton.addEventListener("click", async () => {
        if (!memoriesCache.length) return afficherStatutMemoire("Aucun souvenir à supprimer.");
        if (!confirm("Attention : supprimer définitivement TOUS vos souvenirs ? Cette action est irréversible.")) return;
        deleteAllMemoriesButton.disabled = true;
        try {
            await apiRequest("/api/memories", { method: "DELETE" });
            memoriesCache = [];
            afficherMemoires();
            afficherStatutMemoire("Tous vos souvenirs ont été supprimés.");
        } catch (error) {
            afficherStatutMemoire("Suppression globale impossible : " + error.message, true);
        } finally {
            deleteAllMemoriesButton.disabled = false;
        }
    });
}

// =====================================================
// 17. NAVIGATION ENTRE LES ESPACES
// =====================================================

const titresPages = {
    assistant: "AFRICA BRAIN",
    web: "AFRICA WEB",
    learn: "AFRICA LEARN",
    code: "AFRICA CODE",
    create: "AFRICA CREATE",
    projects: "MES PROJETS",
    settings: "PARAMÈTRES",
    premium: "AFRICA PREMIUM"
};

const descriptionsPages = {
    web: "Votre espace de recherche Internet sera bientôt disponible.",
    learn: "Apprenez, étudiez et développez vos connaissances.",
    code: "Un espace pour programmer et développer vos projets.",
    create: "Votre studio de création sera bientôt disponible.",
    projects: "Retrouvez et gérez vos projets.",
    settings: "Gérez votre compte et vos souvenirs personnels.",
    premium: "Découvrez les offres AFRICA AI Premium."
};

function afficherVue(view) {
    const isAssistant = view === "assistant";
    const isMemory = view === "settings";

    assistantView.hidden = !isAssistant;
    placeholderView.hidden = isAssistant || isMemory;
    if (memoryView) memoryView.hidden = !isMemory;
    if (isMemory) {
        chargerParametresMemoire();
        chargerMemoires();
    }

    currentPageTitle.textContent =
        titresPages[view] || "AFRICA AI";

    if (!isAssistant && !isMemory) {
        placeholderTitle.textContent =
            titresPages[view] || "Bienvenue";

        placeholderDescription.textContent =
            descriptionsPages[view] ||
            "Cet espace sera bientôt disponible.";
    }

    document.querySelectorAll(".sidebar-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.view === view
        );
    });

    if (sidebar) {
        sidebar.classList.remove("open");
        document.body.classList.remove("sidebar-open");
    }
}

document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        afficherVue(button.dataset.view);
    });
});

if (returnAssistantButton) {
    returnAssistantButton.addEventListener("click", () => {
        afficherVue("assistant");
    });
}


// =====================================================
// 18. MENU MOBILE
// =====================================================

if (openSidebar) {
    openSidebar.addEventListener("click", () => {
        sidebar.classList.add("open");
        document.body.classList.add("sidebar-open");
    });
}

if (closeSidebar) {
    closeSidebar.addEventListener("click", () => {
        sidebar.classList.remove("open");
        document.body.classList.remove("sidebar-open");
    });
}


// =====================================================
// 19. DEMARRAGE
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("AFRICA AI 5.1 est prêt.");
});

console.log("AFRICA AI : Firebase et interface initialisés.");
