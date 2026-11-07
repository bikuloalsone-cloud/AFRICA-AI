from pathlib import Path
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from openai import OpenAI

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="AFRICA AI",
    description="Intelligence Without Borders",
    version="3.0.0"
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
        "version": "3.0.0"
    }


@app.post("/api/chat")
def discuter(data: ChatRequest):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="La clé API est manquante."
        )

    if not data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Écris un message."
        )

    try:
        client = OpenAI()

        response = client.responses.create(
            model="gpt-4.1-mini",
            instructions=(
                "Tu es AFRICA AI, un assistant intelligent, "
                "utile, respectueux et compétent. "
                "Réponds dans la langue de l'utilisateur."
            ),
            input=data.message
        )

        return {"reply": response.output_text}

    except Exception as erreur:
        print("ERREUR AFRICA AI :", repr(erreur))
        raise HTTPException(
            status_code=500,
            detail="Impossible de contacter l'intelligence artificielle."
        )
