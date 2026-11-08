
from pathlib import Path
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from google import genai

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="AFRICA AI",
    description="Intelligence Without Borders",
    version="4.0.0"
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
        "version": "4.0.0"
    }


@app.post("/api/chat")
def discuter(data: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
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
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=data.message,
            config={
                "system_instruction": (
                    "Tu es AFRICA AI, un assistant intelligent, "
                    "utile, respectueux et compétent. "
                    "Réponds dans la langue de l'utilisateur."
                )
            }
        )

        if not response.text:
            raise RuntimeError("Réponse vide de Gemini.")

        return {"reply": response.text}

    except Exception as erreur:
        print("ERREUR GEMINI AFRICA AI :", repr(erreur))
        raise HTTPException(
            status_code=500,
            detail="Impossible de contacter Gemini."
        )
