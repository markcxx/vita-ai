from typing import Protocol

from pydantic import BaseModel


class InterviewTurnInput(BaseModel):
    session_id: str
    round_id: str
    candidate_answer: str


class InterviewTurnResult(BaseModel):
    message: str
    action: str = "continue"


class InterviewModel(Protocol):
    """Port implemented by a LangChain/LangGraph adapter in a later phase."""

    async def generate_turn(self, request: InterviewTurnInput) -> InterviewTurnResult: ...
