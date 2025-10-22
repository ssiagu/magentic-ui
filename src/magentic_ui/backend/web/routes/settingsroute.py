# api/routes/settings.py
import os
import yaml
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from ...datamodel import Settings
from ..deps import get_db

router = APIRouter()


def _get_or_create_settings(user_id: str, db) -> Settings:  # pyright: ignore[reportUnknownParameterType, reportMissingParameterType]
    """Get existing settings or create default ones for user_id"""
    response = db.get(Settings, filters={"user_id": user_id})  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
    if response.status and response.data:  # pyright: ignore[reportUnknownMemberType]
        return response.data[0]  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]

    # Create default settings
    default_settings = Settings(user_id=user_id)  # pyright: ignore[reportCallIssue]
    upsert_response = db.upsert(default_settings)  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
    if not upsert_response.status:  # pyright: ignore[reportUnknownMemberType]
        raise HTTPException(status_code=500, detail=upsert_response.message)  # pyright: ignore[reportUnknownMemberType]

    return upsert_response.data  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]


@router.get("/")
async def get_settings(user_id: str, db=Depends(get_db)) -> Dict:  # pyright: ignore[reportUnknownParameterType, reportMissingParameterType, reportMissingTypeArgument]
    try:
        settings = _get_or_create_settings(user_id, db)
        return {"status": True, "data": settings}  # pyright: ignore[reportUnknownVariableType]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/")
async def update_settings(settings: Settings, db=Depends(get_db)) -> Dict:  # pyright: ignore[reportUnknownParameterType, reportMissingParameterType, reportMissingTypeArgument]
    try:
        # Get existing settings to preserve the id
        existing = _get_or_create_settings(settings.user_id, db)  # pyright: ignore[reportArgumentType]
        settings.id = existing.id if hasattr(existing, "id") else existing["id"]  # pyright: ignore[reportIndexIssue]

        response = db.upsert(settings)
        if not response.status:
            raise HTTPException(status_code=400, detail=response.message)
        return {"status": True, "data": response.data}  # pyright: ignore[reportUnknownVariableType]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/config-info")
async def get_config_info() -> Dict:  # pyright: ignore[reportUnknownParameterType, reportMissingTypeArgument]
    """Get information about whether the app was started with a config file"""
    config_file = os.environ.get("_CONFIG")
    has_config_file = config_file is not None
    config_content = None

    if has_config_file and config_file:
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                config_content = yaml.safe_load(f)
        except Exception as e:
            # If we can't read the config file, just log the error but don't fail
            print(f"Warning: Could not read config file {config_file}: {e}")

    return {  # pyright: ignore[reportUnknownVariableType]
        "status": True,
        "data": {
            "has_config_file": has_config_file,
            "config_file_path": config_file if has_config_file else None,
            "config_content": config_content,
        },
    }
