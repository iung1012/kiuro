"""Exporta contas Kiro para o formato credentials.json do kiro-gateway."""

from __future__ import annotations

import json
import logging
import os
import tempfile
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
    runtime_dir = os.environ.get("APP_RUNTIME_DIR", "")
    if runtime_dir:
        return Path(runtime_dir) / "kiro-gateway-creds"
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
    """Adiciona a conta ao credentials.json do kiro-gateway usando refresh_token inline."""
    target_dir = resolve_creds_dir(creds_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    extra = getattr(account, "extra", {}) or {}
    email = getattr(account, "email", "") or extra.get("email") or ""

    refresh_token = extra.get("refreshToken") or extra.get("refresh_token") or ""
    if not refresh_token:
        return False, "Conta sem refreshToken"

    region = extra.get("region") or DEFAULT_REGION

    creds_list = _load_credentials_list(target_dir)

    # Verifica se já existe entrada para esse email/token
    for entry in creds_list:
        if entry.get("refresh_token") == refresh_token:
            return True, f"Conta já presente no kiro-gateway: {email}"

    entry: dict = {
        "type": "refresh_token",
        "refresh_token": refresh_token,
        "enabled": True,
        "region": region,
    }
    if email:
        entry["label"] = email

    creds_list.insert(0, entry)

    try:
        _atomic_write(target_dir / "credentials.json", json.dumps(creds_list, ensure_ascii=False, indent=2))
    except Exception as e:
        return False, f"Falha ao atualizar credentials.json: {e}"

    return True, f"Conta adicionada ao kiro-gateway: {email}"
