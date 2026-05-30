import json
import logging
import asyncio
from typing import Dict, Any, List, Callable, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    OBJECT_CREATED = "object.created"
    OBJECT_UPDATED = "object.updated"
    OBJECT_DELETED = "object.deleted"
    LINK_CREATED = "link.created"
    LINK_DELETED = "link.deleted"
    ACTION_EXECUTED = "action.executed"
    ACTION_APPROVED = "action.approved"
    ACTION_REJECTED = "action.rejected"
    LIFECYCLE_CHANGED = "lifecycle.changed"
    STATUS_CHANGED = "status.changed"
    RISK_DETECTED = "risk.detected"
    INFERENCE_RESULT = "inference.result"
    NOTIFICATION_CREATED = "notification.created"


@dataclass
class OntologyEvent:
    event_type: EventType
    object_id: Optional[str] = None
    object_type: Optional[str] = None
    object_name: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: str = "system"


EventHandler = Callable[[OntologyEvent], Any]


class EventBus:
    def __init__(self):
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._wildcard_handlers: List[EventHandler] = []
        self._event_log: List[OntologyEvent] = []
        self._max_log_size = 1000

    def subscribe(self, event_type: str, handler: EventHandler):
        if event_type == "*":
            self._wildcard_handlers.append(handler)
        else:
            if event_type not in self._handlers:
                self._handlers[event_type] = []
            self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: EventHandler):
        if event_type == "*":
            if handler in self._wildcard_handlers:
                self._wildcard_handlers.remove(handler)
        elif event_type in self._handlers:
            if handler in self._handlers[event_type]:
                self._handlers[event_type].remove(handler)

    def publish(self, event: OntologyEvent):
        self._event_log.append(event)
        if len(self._event_log) > self._max_log_size:
            self._event_log = self._event_log[-self._max_log_size:]

        handlers = self._handlers.get(event.event_type, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                print(f"Event handler error for {event.event_type}: {e}")

        for handler in self._wildcard_handlers:
            try:
                handler(event)
            except Exception as e:
                print(f"Wildcard handler error: {e}")

    def publish_async(self, event: OntologyEvent):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(self._async_publish(event))
            else:
                self.publish(event)
        except RuntimeError:
            self.publish(event)

    async def _async_publish(self, event: OntologyEvent):
        self.publish(event)

    def get_recent_events(self, limit: int = 50, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        events = self._event_log
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        return [
            {
                "eventType": e.event_type,
                "objectId": e.object_id,
                "objectType": e.object_type,
                "objectName": e.object_name,
                "data": e.data,
                "timestamp": e.timestamp,
                "source": e.source,
            }
            for e in events[-limit:]
        ]


event_bus = EventBus()


def _persist_event(event_type: str, data: dict):
    try:
        from database import _get_engine
        from sqlalchemy import text
        engine = _get_engine()
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ontology_events_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    event_data TEXT,
                    timestamp TEXT NOT NULL
                )
            """))
            conn.execute(text("""
                INSERT INTO ontology_events_log (event_type, event_data, timestamp)
                VALUES (:type, :data, :ts)
            """), {"type": event_type, "data": json.dumps(data, default=str), "ts": datetime.now(timezone.utc).isoformat()})
            conn.commit()
    except Exception as e:
        logger.debug(f"Event persist failed: {e}")


def publish_ontology_event(event_type: EventType, object_id: str = None,
                           object_type: str = None, object_name: str = None,
                           data: Dict[str, Any] = None, source: str = "system"):
    event = OntologyEvent(
        event_type=event_type,
        object_id=object_id,
        object_type=object_type,
        object_name=object_name,
        data=data or {},
        source=source,
    )
    event_bus.publish(event)
    _persist_event(
        event_type.value if isinstance(event_type, EventType) else str(event_type),
        {
            "object_id": object_id,
            "object_type": object_type,
            "object_name": object_name,
            "data": data or {},
            "source": source,
        },
    )
    return event
