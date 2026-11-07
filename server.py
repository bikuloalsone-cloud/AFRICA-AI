from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="AFRICA AI",
    description="Intelligence Without Borders",
    version="1.0.0"
)

@app.get("/")
def accueil():
    return FileResponse(BASE_DIR / "index.html")

@app.get("/api/health")
def verification():
    return {
        "nom": "AFRICA AI",
        "serveur": "actif",
        "message": "Bienvenue sur AFRICA AI"
    }
