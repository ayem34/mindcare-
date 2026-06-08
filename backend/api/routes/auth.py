"""
api/routes/auth.py — Routes d'authentification (register, login, me)
JWT via python-jose, mots de passe hashés avec bcrypt
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Utilisateur
from backend.api.schemas.schemas import (
    LoginRequest, RegisterRequest,
    TokenResponse, UtilisateurResponse
)

router = APIRouter(prefix="/auth", tags=["Authentification"])

# ── Config JWT ────────────────────────────────────────────────────────────────
SECRET_KEY      = os.getenv("SECRET_KEY", "changez-cette-cle-en-production-svp")
ALGORITHM       = "HS256"
EXPIRE_MINUTES  = 60 * 24  # 24h

pwd_context     = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme   = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db:    Session = Depends(get_db),
) -> Utilisateur:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(Utilisateur).filter(Utilisateur.email == email).first()
    if user is None or not user.est_actif:
        raise credentials_exception
    return user


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UtilisateurResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Inscription d'un nouvel utilisateur."""
    if db.query(Utilisateur).filter(Utilisateur.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà avec cet email."
        )
    user = Utilisateur(
        nom          = payload.nom,
        prenom       = payload.prenom,
        email        = payload.email,
        mot_de_passe = hash_password(payload.mot_de_passe),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Connexion — retourne un JWT Bearer token."""
    user = db.query(Utilisateur).filter(Utilisateur.email == payload.email).first()
    if not user or not verify_password(payload.mot_de_passe, user.mot_de_passe):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect."
        )
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UtilisateurResponse)
def me(current_user: Utilisateur = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return current_user
