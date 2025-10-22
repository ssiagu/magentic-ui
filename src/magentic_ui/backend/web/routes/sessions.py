# api/routes/sessions.py
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from ...datamodel import Message, Run, Session, RunStatus
from ..deps import get_db

router = APIRouter()


@router.get("/")
async def list_sessions(user_id: str, db=Depends(get_db)) -> Dict:  # pyright: ignore[reportUnknownParameterType, reportMissingParameterType, reportMissingTypeArgument]
    """List all sessions for a user"""
    response = db.get(Session, filters={"user_id": user_id})
    return {"status": True, "data": response.data}  # pyright: ignore[reportUnknownVariableType]


@router.get("/{session_id}")
async def get_session(session_id: int, user_id: str, db=Depends(get_db)) -> Dict:  # pyright: ignore[reportUnknownParameterType, reportMissingParameterType, reportMissingTypeArgument]
    """Get a specific session"""
    response = db.get(Session, filters={"id": session_id, "user_id": user_id})
    if not response.status or not response.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": True, "data": response.data[0]}  # pyright: ignore[reportUnknownVariableType]


@router.post("/")
async def create_session(session: Session, db=Depends(get_db)) -> Dict:  # pyright: ignore[reportUnknownParameterType, reportMissingParameterType, reportMissingTypeArgument]
    """Create a new session with an associated run"""
    # Create session
    session_response = db.upsert(session)
    if not session_response.status:
        raise HTTPException(status_code=400, detail=session_response.message)

    # Create associated run
    try:
        run = db.upsert(
            Run(  # pyright: ignore[reportCallIssue]
                session_id=session.id,
                status=RunStatus.CREATED,
                user_id=session.user_id,
                task=None,
                team_result=None,
            ),
            return_json=False,
        )
        if not run.status:
            # Clean up session if run creation failed
            raise HTTPException(status_code=400, detail=run.message)
        return {"status": True, "data": session_response.data}  # pyright: ignore[reportUnknownVariableType]
    except Exception as e:
        # Clean up session if run creation failed
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/{session_id}")
async def update_session(  # pyright: ignore[reportUnknownParameterType]
    session_id: int, user_id: str, session: Session, db=Depends(get_db)  # pyright: ignore[reportMissingParameterType]
) -> Dict:  # pyright: ignore[reportMissingTypeArgument]
    """Update an existing session"""
    # First verify the session belongs to user
    existing = db.get(Session, filters={"id": session_id, "user_id": user_id})
    if not existing.status or not existing.data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update the session
    response = db.upsert(session)
    if not response.status:
        raise HTTPException(status_code=400, detail=response.message)

    return {  # pyright: ignore[reportUnknownVariableType]
        "status": True,
        "data": response.data,
        "message": "Session updated successfully",
    }


@router.delete("/{session_id}")
async def delete_session(session_id: int, user_id: str, db=Depends(get_db)) -> Dict:  # pyright: ignore[reportUnknownParameterType, reportMissingParameterType, reportMissingTypeArgument]
    """Delete a session and all its associated runs and messages"""
    # Delete the session
    db.delete(filters={"id": session_id, "user_id": user_id}, model_class=Session)

    return {"status": True, "message": "Session deleted successfully"}  # pyright: ignore[reportUnknownVariableType]


@router.get("/{session_id}/runs")
async def list_session_runs(session_id: int, user_id: str, db=Depends(get_db)) -> Dict:  # pyright: ignore[reportUnknownParameterType, reportMissingParameterType, reportMissingTypeArgument]
    """Get complete session history organized by runs"""

    try:
        # 1. Verify session exists and belongs to user
        session = db.get(
            Session, filters={"id": session_id, "user_id": user_id}, return_json=False
        )
        if not session.status:
            raise HTTPException(
                status_code=500, detail="Database error while fetching session"
            )
        if not session.data:
            raise HTTPException(
                status_code=404, detail="Session not found or access denied"
            )

        # 2. Get ordered runs for session
        runs = db.get(
            Run, filters={"session_id": session_id}, order="asc", return_json=False
        )
        if not runs.status:
            raise HTTPException(
                status_code=500, detail="Database error while fetching runs"
            )

        # 3. Build response with messages per run
        run_data = []
        if runs.data:  # It's ok to have no runs
            for run in runs.data:
                try:
                    # Get messages for this specific run
                    messages = db.get(
                        Message,
                        filters={"run_id": run.id},
                        order="asc",
                        return_json=False,
                    )
                    if not messages.status:
                        logger.error(f"Failed to fetch messages for run {run.id}")
                        # Continue processing other runs even if one fails
                        messages.data = []

                    run_data.append(  # pyright: ignore[reportUnknownMemberType]
                        {
                            "id": str(run.id),
                            "created_at": run.created_at,
                            "status": run.status,
                            "task": run.task,
                            "team_result": run.team_result,
                            "messages": messages.data or [],  # pyright: ignore[reportUnknownMemberType]
                            "input_request": getattr(run, "input_request", None),
                        }
                    )
                except Exception as e:
                    logger.error(f"Error processing run {run.id}: {str(e)}")
                    # Include run with error state instead of failing entirely
                    run_data.append(  # pyright: ignore[reportUnknownMemberType]
                        {
                            "id": str(run.id),
                            "created_at": run.created_at,
                            "status": "ERROR",
                            "task": run.task,
                            "team_result": None,
                            "messages": [],
                            "error": f"Failed to process run: {str(e)}",
                            "input_request": getattr(run, "input_request", None),
                        }
                    )

        return {"status": True, "data": {"runs": run_data}}  # pyright: ignore[reportUnknownVariableType]

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Unexpected error in list_messages: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Internal server error while fetching session data"
        ) from e
