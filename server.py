
from pathlib import Path
import os
import re
import json
import ipaddress
from urllib.parse import urlparse, urlencode
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from google import genai

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="AFRICA AI",
    description="Intelligence Without Borders",
    version="5.0.0"
)


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def accueil():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/style.css")
def style():
    return FileResponse(BASE_DIR / "style.css")


@app.get("/script.js")
def script():
    return FileResponse(BASE_DIR / "script.js")


@app.get("/api/health")
def verification():
    return {
        "nom": "AFRICA AI",
        "serveur": "actif",
        "version": "5.0.0",
        "recherche_web": bool(os.getenv("TINYFISH_API_KEY"))
    }


def extraire_urls(message):
    urls = re.findall(r"https?://[^\s<>\"']+", message)

    urls = [
        url.rstrip(".,;:!?)]}")
        for url in urls
    ]

    return list(dict.fromkeys(urls))[:5]


def url_publique(url):
    try:
        parsed = urlparse(url)
        host = parsed.hostname

        if parsed.scheme not in ("http", "https"):
            return False

        if not host or "." not in host:
            return False

        if host.lower() in ("localhost", "localhost.localdomain"):
            return False

        if host.lower().endswith(".local"):
            return False

        try:
            address = ipaddress.ip_address(host)

            if not address.is_global:
                return False

        except ValueError:
            pass

        return True

    except Exception:
        return False


def requete_tinyfish(url, api_key, payload=None):
    headers = {
        "X-API-Key": api_key,
        "Accept": "application/json"
    }

    body = None

    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")

    request = Request(
        url,
        data=body,
        headers=headers,
        method="POST" if body else "GET"
    )

    with urlopen(request, timeout=25) as response:
        contenu = response.read(3_000_000)

    return json.loads(contenu.decode("utf-8"))


def rechercher_internet(question, api_key):
    adresse = (
        "https://api.search.tinyfish.ai/?"
        + urlencode({"query": question[:1000]})
    )

    resultat = requete_tinyfish(adresse, api_key)

    return resultat.get("results", [])


def lire_pages(urls, api_key):
    urls_valides = [
        url for url in urls
        if url_publique(url)
    ][:5]

    if not urls_valides:
        return []

    resultat = requete_tinyfish(
        "https://api.fetch.tinyfish.ai",
        api_key,
        {"urls": urls_valides}
    )

    return resultat.get("results", [])


def besoin_recherche(message):
    texte = message.lower()

    mots = (
        "recherche sur internet",
        "cherche sur internet",
        "recherche",
        "sources",
        "références",
        "actualité",
        "actualités",
        "aujourd'hui",
        "actuellement",
        "en ce moment",
        "dernière version",
        "récent",
        "récemment",
        "prix actuel",
        "cours actuel",
        "compare",
        "comparaison",
        "approfondi",
        "approfondie",
        "rapport",
        "étude",
        "qui est",
        "quand est",
        "où se trouve",
        "réglementation",
        "météo"
    )

    return any(mot in texte for mot in mots)


def obtenir_contexte_web(message):
    api_key = os.getenv("TINYFISH_API_KEY")

    if not api_key:
        return "", [], "La recherche Internet n'est pas configurée."

    urls = extraire_urls(message)
    sources = []
    parties = []

    try:
        if urls:
            pages = lire_pages(urls, api_key)

            for page in pages:
                titre = page.get("title") or "Page Internet"
                lien = page.get("url") or ""
                contenu = page.get("text") or ""

                if contenu:
                    sources.append({
                        "title": titre,
                        "url": lien
                    })

                    numero = len(sources)

                    parties.append(
                        f"[SOURCE {numero}]\n"
                        f"Titre : {titre}\n"
                        f"URL : {lien}\n"
                        f"Contenu : {contenu[:5000]}"
                    )

            if not pages:
                return "", [], (
                    "Les liens fournis n'ont pas pu être lus."
                )

        elif besoin_recherche(message):

            resultats = rechercher_internet(message, api_key)

            urls_resultats = []

            for resultat in resultats[:5]:
                lien = resultat.get("url", "")

                if lien and not lien.startswith(("http://", "https://")):
                    lien = "https://" + lien

                if lien and url_publique(lien):
                    urls_resultats.append(lien)

            pages = lire_pages(urls_resultats[:3], api_key)

            for page in pages:
                titre = page.get("title") or "Page Internet"
                lien = page.get("url") or ""
                contenu = page.get("text") or ""

                if contenu:
                    sources.append({
                        "title": titre,
                        "url": lien
                    })

                    numero = len(sources)

                    parties.append(
                        f"[SOURCE {numero}]\n"
                        f"Titre : {titre}\n"
                        f"URL : {lien}\n"
                        f"Contenu : {contenu[:5000]}"
                    )

            # Les extraits de recherche servent de secours
            if not pages:
                for resultat in resultats[:5]:
                    lien = resultat.get("url", "")
                    titre = resultat.get("title", "")
                    extrait = resultat.get("snippet", "")

                    if lien and not lien.startswith(("http://", "https://")):
                        lien = "https://" + lien

                    if titre and extrait:
                        sources.append({
                            "title": titre,
                            "url": lien
                        })

                        numero = len(sources)

                        parties.append(
                            f"[SOURCE {numero}]\n"
                            f"Titre : {titre}\n"
                            f"URL : {lien}\n"
                            f"Extrait : {extrait}"
                        )

        else:
            return "", [], ""

    except Exception as erreur:
        print("ERREUR TINYFISH :", repr(erreur))
        return "", [], "La recherche Internet a échoué."

    contexte = "\n\n".join(parties)

    return contexte, sources, ""


@app.post("/api/chat")
def discuter(data: ChatRequest):

    gemini_key = os.getenv("GEMINI_API_KEY")

    if not gemini_key:
        raise HTTPException(
            status_code=500,
            detail="La clé Gemini est manquante."
        )

    if not data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Écris un message."
        )

    try:
        contexte, sources, avertissement = (
            obtenir_contexte_web(data.message)
        )

        prompt = data.message

        if contexte:
            prompt = f"""
QUESTION DE L'UTILISATEUR :
{data.message}

INFORMATIONS RECUEILLIES SUR INTERNET :
{contexte}

CONSIGNES :
- Analyse les informations fournies.
- Compare les sources lorsqu'elles se contredisent.
- N'invente pas de faits.
- Distingue les faits vérifiés des hypothèses.
- Cite les sources dans ta réponse avec [1], [2], etc.
- Réponds clairement dans la langue de l'utilisateur.
"""

        client = genai.Client(api_key=gemini_key)

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config={
                "system_instruction": (
                    "Tu es AFRICA AI, un assistant intelligent "
                    "utile, rigoureux et respectueux. "
                    "Tu aides les utilisateurs dans leurs "
                    "questions, leurs études et leurs projets. "
                    "Quand des sources Internet sont fournies, "
                    "base ton analyse sur ces sources."
                )
            }
        )

        if not response.text:
            raise RuntimeError("Réponse vide de Gemini.")

        reponse = response.text

        if sources:
            reponse += "\n\nSources consultées :\n"

            for numero, source in enumerate(sources, start=1):
                reponse += (
                    f"\n[{numero}] {source['title']}\n"
                    f"{source['url']}\n"
                )

        if avertissement:
            reponse += (
                "\n\nInformation : "
                + avertissement
            )

        return {
            "reply": reponse,
            "web_used": bool(sources)
        }

    except Exception as erreur:
        print("ERREUR AFRICA AI :", repr(erreur))

        raise HTTPException(
            status_code=500,
            detail="Impossible de traiter la demande."
        )
