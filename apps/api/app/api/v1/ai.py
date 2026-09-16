from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.ai.services.ai_service import AIService
from app.schemas.ai import ChatRequest, ChatResponse

router = APIRouter(prefix="/projects", tags=["AI Incident Assistant"])

@router.post("/{project_id}/ai/chat", response_model=ChatResponse)
async def chat_incident_assistant(
    project_id: str,
    chat_in: ChatRequest,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    ai_service = AIService(db)
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in chat_in.conversation_history]
    result = await ai_service.chat_assistant(
        project_id=project.id,
        question=chat_in.question,
        history=history_dicts
    )
    return ChatResponse(
        answer=result["answer"],
        telemetry_grounding=result["telemetry_grounding"],
        suggested_followups=result["suggested_followups"]
    )
