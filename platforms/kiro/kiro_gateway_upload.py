"""Exporta contas Kiro para o formato credentials.json do kiro-gateway."""

from __future__ import annotations

import json
import logging
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)

DEFAULT_REGION = "us-east-1"
DEFAULT_CREDS_DIR = "/creds"


def _get_config_value(key: str) -> str:
    try:
        from core.config_store import config_store
        return str(config_store.get(key, "") or "")
    except Exception:
        return ""


def resolve_creds_dir(path: str | None = None) -> Path:
    raw = str(path or _get_config_value("kiro_gateway_creds_dir") or "").strip()
    if raw:
        return Path(raw).expanduser()
    env_dir = os.environ.get("KIRO_GATEWAY_CREDS_DIR", "").strip()
    if env_dir:
        return Path(env_dir)
    return Path(DEFAULT_CREDS_DIR)


def _atomic_write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        os.replace(tmp_path, path)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


def _safe_filename(email: str) -> str:
    return "".join(c if c.isalnum() or c in "-._" else "_" for c in email)


def _load_credentials_list(creds_dir: Path) -> list[dict]:
    path = creds_dir / "credentials.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def upload_to_kiro_gateway(account, creds_dir: str | None = None) -> Tuple[bool, str]:
    """Escreve credenciais Kiro no formato type=json para o kiro-gateway."""
    target_dir = resolve_creds_dir(creds_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    extra = getattr(account, "extra", {}) or {}
    email = getattr(account, "email", "") or extra.get("email") or ""

    refresh_token = extra.get("refreshToken") or extra.get("refresh_token") or ""
    client_id = extra.get("clientId") or extra.get("client_id") or ""
    client_secret = extra.get("clientSecret") or extra.get("client_secret") or ""
    access_token = extra.get("accessToken") or extra.get("access_token") or getattr(account, "token", "") or ""
    region = extra.get("region") or DEFAULT_REGION

    if not refresh_token:
        return False, "Conta sem refreshToken"
    if not client_id or not client_secret:
        return False, "Conta sem clientId/clientSecret"

    expires_at = (datetime.now(timezone.utc) + timedelta(hours=8)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    cred_data = {
        "clientId": client_id,
        "clientSecret": client_secret,
        "refreshToken": refresh_token,
        "accessToken": access_token,
        "expiresAt": expires_at,
        "region": region,
    }

    fname = f"{_safe_filename(email)}.json" if email else f"{refresh_token[:12]}.json"
    cred_path = target_dir / fname

    try:
        _atomic_write(cred_path, json.dumps(cred_data, ensure_ascii=False, indent=2))
    except Exception as e:
        return False, f"Falha ao escrever credencial: {e}"

    creds_list = _load_credentials_list(target_dir)

    existing_paths = {item.get("path") for item in creds_list if item.get("type") == "json"}
    if str(cred_path) not in existing_paths:
        entry: dict = {"type": "json", "path": str(cred_path), "enabled": True, "region": region}
        if email:
            entry["label"] = email
        creds_list.insert(0, entry)

        try:
            _atomic_write(target_dir / "credentials.json", json.dumps(creds_list, ensure_ascii=False, indent=2))
        except Exception as e:
            return False, f"Arquivo salvo mas falha ao atualizar credentials.json: {e}"

    return True, f"Exportado para kiro-gateway: {cred_path}"
