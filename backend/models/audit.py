from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    entity_name = Column(String, nullable=True)
    user_id = Column(String, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())
    details = Column(Text, nullable=True)
