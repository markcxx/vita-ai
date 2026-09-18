from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.db.session import Base


def now() -> datetime:
    return datetime.now(UTC)


def new_id() -> str:
    return str(uuid4())


class UTCTimestamp(TypeDecorator[datetime]):
    """Store UTC with microseconds; return timezone-aware values."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | int | None, dialect: Dialect):
        if value is None:
            return None
        value = datetime.fromtimestamp(value, UTC) if isinstance(value, int) else value
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | int | None, _dialect: Dialect):
        if isinstance(value, int):
            return datetime.fromtimestamp(value, UTC)
        return value.astimezone(UTC) if value is not None else None


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    name: Mapped[str | None] = mapped_column(String(200))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, server_default=text("'{}'::json"))
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now, onupdate=now)


class Resume(Base):
    __tablename__ = "resumes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="未命名简历")
    template: Mapped[str] = mapped_column(String(100), default="classic")
    theme_config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[str] = mapped_column(String(8), default="zh")
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    share_password: Mapped[str | None] = mapped_column(String(255))
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now, onupdate=now)
    sections: Mapped[list["ResumeSection"]] = relationship(
        cascade="all, delete-orphan", order_by="ResumeSection.sort_order", lazy="selectin"
    )


class ResumeSection(Base):
    __tablename__ = "resume_sections"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    resume_id: Mapped[str] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(200))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    content: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now, onupdate=now)


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now, onupdate=now)


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    resume_id: Mapped[str] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="新对话")
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now, onupdate=now)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    message_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)


class ResumeShare(Base):
    __tablename__ = "resume_shares"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    resume_id: Mapped[str] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True)
    label: Mapped[str] = mapped_column(String(200), default="")
    password: Mapped[str | None] = mapped_column(String(255))
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now, onupdate=now)


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    resume_id: Mapped[str] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32), index=True)
    source_text: Mapped[str | None] = mapped_column(Text)
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    score: Mapped[int] = mapped_column(Integer, default=0)
    secondary_score: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)


class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    resume_id: Mapped[str | None] = mapped_column(ForeignKey("resumes.id", ondelete="SET NULL"))
    job_description: Mapped[str] = mapped_column(Text)
    job_title: Mapped[str] = mapped_column(String(200), default="")
    selected_interviewers: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    interaction_mode: Mapped[str] = mapped_column(String(16), default="text")
    current_round: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="preparing")
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now, onupdate=now)


class InterviewRound(Base):
    __tablename__ = "interview_rounds"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True
    )
    interviewer_type: Mapped[str] = mapped_column(String(80))
    interviewer_config: Mapped[dict[str, Any]] = mapped_column(JSON)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    question_count: Mapped[int] = mapped_column(Integer, default=0)
    max_questions: Mapped[int] = mapped_column(Integer, default=10)
    summary: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now, onupdate=now)


class InterviewMessage(Base):
    __tablename__ = "interview_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    round_id: Mapped[str] = mapped_column(
        ForeignKey("interview_rounds.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(24))
    content: Mapped[str] = mapped_column(Text)
    message_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)


class InterviewReport(Base):
    __tablename__ = "interview_reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), unique=True
    )
    overall_score: Mapped[int] = mapped_column(Integer)
    dimension_scores: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    round_evaluations: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    overall_feedback: Mapped[str] = mapped_column(Text)
    improvement_plan: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)


class Operation(Base):
    __tablename__ = "operations"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    resume_id: Mapped[str] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"))
    expected_version: Mapped[int] = mapped_column(Integer)
    operations: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(24), default="proposed")
    idempotency_key: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)





class SchemaVersion(Base):
    __tablename__ = "schema_versions"
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    applied_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)








class ResumeAnalysisReport(Base):
    __tablename__ = "resume_analysis_reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    source_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCTimestamp(), default=now)




