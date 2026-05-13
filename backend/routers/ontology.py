import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, require_auth
from models.user import User
from schemas.ontology import (
    OntologyObjectResponse, OntologyObjectListResponse,
    SearchResponse, ActionExecutionRequest, ActionExecutionResponse,
    OntologyObjectCreate, OntologyObjectUpdate,
)
from services.ontology_service import get_all_objects, get_object_by_id, search_objects, create_object, update_object, delete_object
from models.ontology import OntologyObject, ObjectEvent
from models.audit import AuditLog

router = APIRouter(prefix="/api/ontology", tags=["ontology"])


@router.get("/objects", response_model=OntologyObjectListResponse)
def list_objects(
    type: Optional[str] = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
):
    result = get_all_objects(db, type, page, page_size)
    return OntologyObjectListResponse(**result)


@router.get("/{object_type}/search", response_model=SearchResponse)
def search(
    object_type: str,
    query: str = Query(""),
    limit: int = Query(10),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
):
    results = search_objects(db, object_type, query, limit)
    return SearchResponse(results=results, total=len(results), limit=limit)


@router.get("/{object_type}/{object_id}")
def get_object(
    object_type: str,
    object_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
):
    result = get_object_by_id(db, object_type, object_id)
    if not result:
        return {"id": object_id, "type": object_type, "properties": {}, "links": {}, "metadata": {}}
    return result


@router.post("/{object_type}")
def create_new_object(
    object_type: str,
    data: OntologyObjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    result = create_object(db, object_type, data.model_dump())
    return result


@router.put("/{object_type}/{object_id}")
def update_existing_object(
    object_type: str,
    object_id: str,
    data: OntologyObjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = update_object(db, object_type, object_id, update_data)
    if not result:
        raise HTTPException(status_code=404, detail="Object not found")
    return result


@router.delete("/{object_type}/{object_id}")
def delete_existing_object(
    object_type: str,
    object_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    success = delete_object(db, object_type, object_id)
    if not success:
        raise HTTPException(status_code=404, detail="Object not found")
    return {"success": True}


@router.post("/{object_type}/{object_id}/action", response_model=ActionExecutionResponse)
def execute_action(
    object_type: str,
    object_id: str,
    req: ActionExecutionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    obj = db.query(OntologyObject).filter(
        OntologyObject.id == object_id,
        OntologyObject.object_type == object_type,
    ).first()
    if not obj:
        return ActionExecutionResponse(success=False, error="Object not found", transaction_id="")

    event = ObjectEvent(
        id=f"evt_{uuid.uuid4().hex[:8]}",
        object_id=object_id,
        event_type="ActionExecuted",
        timestamp=datetime.now(timezone.utc).isoformat(),
        description=f"Executed action: {req.action}",
        related_object_id=object_id,
        related_object_name=obj.name,
    )
    db.add(event)

    audit = AuditLog(
        id=f"al_{uuid.uuid4().hex[:8]}",
        action="execute_action",
        entity_type=object_type,
        entity_id=object_id,
        entity_name=obj.name,
        user_id=user.id,
        details=f"Executed action {req.action} with params: {req.params}",
    )
    db.add(audit)
    db.commit()

    return ActionExecutionResponse(
        success=True,
        data={"action": req.action, "objectId": object_id},
        transaction_id=f"tx_{uuid.uuid4().hex[:8]}",
    )
