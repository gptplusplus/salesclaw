from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models.action import ActionProposal
from models.execution import ExecutionLog
from schemas.action import ReasoningChainSchema, ActionDefinitionSchema, PendingActionSchema
from services.ontology_service import _split_field
import uuid
import json
from datetime import datetime, timezone


def get_pending_actions(db: Session, user_id: str) -> List[Dict[str, Any]]:
    actions = db.query(ActionProposal).filter(ActionProposal.status == "pending").all()
    results = []
    for a in actions:
        result = _action_to_dict(a)
        results.append(result)
    return results


def approve_action(db: Session, action_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    action = db.query(ActionProposal).filter(ActionProposal.id == action_id).first()
    if not action:
        return None
    action.status = "approved"
    action.approved_by = user_id
    from datetime import datetime, timezone
    action.approved_at = datetime.now(timezone.utc)
    db.commit()
    return {"action_id": action.id, "status": "approved", "message": "Action approved successfully"}


def reject_action(db: Session, action_id: str, user_id: str, feedback: Optional[str] = None) -> Optional[Dict[str, Any]]:
    action = db.query(ActionProposal).filter(ActionProposal.id == action_id).first()
    if not action:
        return None
    action.status = "rejected"
    db.commit()
    return {"action_id": action.id, "status": "rejected", "message": "Action rejected"}


def execute_action(db: Session, action_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    action = db.query(ActionProposal).filter(ActionProposal.id == action_id).first()
    if not action:
        return None
    if action.status != "approved":
        return {"action_id": action.id, "status": action.status, "message": "Action must be approved first"}

    action.status = "executed"
    action.started_at = datetime.now(timezone.utc)

    from services.action_executor import ActionExecutor
    executor = ActionExecutor(db)

    if action.entity_id and action.action_type:
        exec_result = executor.execute_object_action(
            action.entity_id, action.action_type,
            {"reason": action.description} if action.description else {},
            user_id
        )
        action.execution_logs = json.dumps(exec_result)
        if exec_result.get("success"):
            action.completed_at = datetime.now(timezone.utc)
        else:
            action.error_message = exec_result.get("error", "Unknown error")
            action.status = "failed"
        db.commit()
    else:
        log_id = str(uuid.uuid4())
        log_entry = ExecutionLog(
            id=log_id, action_name=action.title,
            tool_name=action.action_type or "manual",
            parameters="", status="executed",
            result=f"Action executed. Previous status: approved",
            plan_id=action_id, user_id=user_id,
        )
        db.add(log_entry)
        action.completed_at = datetime.now(timezone.utc)
        db.commit()

    try:
        import asyncio
        from services.ws_manager import manager
        asyncio.create_task(manager.broadcast({
            "type": "action_executed",
            "data": {"action_id": action_id, "title": action.title, "entity_name": action.entity_name}
        }))
    except Exception as e:
        print(f"WebSocket notification failed: {e}")

    return {"action_id": action.id, "status": action.status, "message": "Action executed successfully"}


def get_execution_logs(db: Session, action_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    query = db.query(ExecutionLog)
    if action_id:
        query = query.filter(ExecutionLog.plan_id == action_id)
    logs = query.order_by(ExecutionLog.timestamp.desc()).limit(limit).all()
    
    return [{
        "id": log.id,
        "action_name": log.action_name,
        "tool_name": log.tool_name,
        "parameters": log.parameters,
        "status": log.status,
        "result": log.result,
        "plan_id": log.plan_id,
        "user_id": log.user_id,
        "timestamp": log.timestamp.isoformat() if log.timestamp else "",
    } for log in logs]


def _action_to_dict(a: ActionProposal) -> Dict[str, Any]:
    reasoning_chain = None
    if a.reasoning_conclusion:
        evidence = []
        if a.reasoning_evidence:
            for item in _split_field(a.reasoning_evidence):
                parts = item.split("|")
                if len(parts) >= 3:
                    evidence.append({"source": parts[0], "observation": parts[1], "weight": float(parts[2])})
        alt_hypotheses = []
        if a.reasoning_alternative_hypotheses:
            for item in _split_field(a.reasoning_alternative_hypotheses):
                parts = item.split("|")
                if len(parts) >= 2:
                    alt_hypotheses.append({"hypothesis": parts[0], "confidence": float(parts[1])})
        suggested_actions = []
        if a.reasoning_suggested_actions:
            for item in _split_field(a.reasoning_suggested_actions):
                parts = item.split("|")
                if len(parts) >= 3:
                    suggested_actions.append({"actionName": parts[0], "priority": parts[1], "reason": parts[2]})
        reasoning_chain = {
            "conclusion": a.reasoning_conclusion,
            "evidence": evidence,
            "confidence": a.reasoning_confidence or 0.9,
            "alternativeHypotheses": alt_hypotheses,
            "suggestedActions": suggested_actions,
        }

    action_definition = None
    if a.action_definition_id:
        action_definition = {
            "id": a.action_definition_id,
            "name": a.action_definition_name or "",
            "description": a.action_definition_description or "",
            "parameters": [],
            "preconditions": _split_field(a.action_definition_preconditions),
            "sideEffects": _split_field(a.action_definition_side_effects),
            "writeBackTargets": _split_field(a.action_definition_write_back_targets),
            "requiresApproval": a.action_definition_requires_approval or False,
        }

    return {
        "id": a.id,
        "title": a.title,
        "description": a.description,
        "type": a.action_type or "",
        "entity_id": a.entity_id or "",
        "entity_name": a.entity_name or "",
        "entity_type": a.entity_type or "",
        "priority": a.priority,
        "status": a.status,
        "timestamp": a.timestamp.isoformat() if a.timestamp else "",
        "proposed_by": a.proposed_by,
        "confidence": a.confidence,
        "reasoning_chain": reasoning_chain,
        "action_definition": action_definition,
    }
