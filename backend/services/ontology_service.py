import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from models.ontology import OntologyObject, ObjectLink, ObjectAction, ActionParameter, ObjectEvent, TimeSeriesData
from models.domain import (
    Doctor, Hospital, Product, SalesRep, VisitRecord, SalesTarget,
    ComplianceAlert, AcademicEvent, Territory, RecoveryPlan,
    SalesFlow, MarketPotential, HospitalDevelopment, TerritoryPerformance,
    ProductFlow, BudgetCategory, ExpenseClassification, CostDriver,
    LaborPayment, ExpenseROI, CustomerCategory, VisitFeedback,
    PDCAPlan, HospitalStrategy, DepartmentResearch, RWSProject,
    ClinicalTrial, PatientProgram, ResearchCollaboration,
    MeetingCompliance, ExpenseCompliance, CustomerCompliance, ComplianceRule,
)

DOMAIN_MODEL_MAP = {
    "Doctor": Doctor,
    "Hospital": Hospital,
    "Product": Product,
    "SalesRep": SalesRep,
    "VisitRecord": VisitRecord,
    "SalesTarget": SalesTarget,
    "ComplianceAlert": ComplianceAlert,
    "AcademicEvent": AcademicEvent,
    "Territory": Territory,
    "RecoveryPlan": RecoveryPlan,
    "SalesFlow": SalesFlow,
    "MarketPotential": MarketPotential,
    "HospitalDevelopment": HospitalDevelopment,
    "TerritoryPerformance": TerritoryPerformance,
    "ProductFlow": ProductFlow,
    "BudgetCategory": BudgetCategory,
    "ExpenseClassification": ExpenseClassification,
    "CostDriver": CostDriver,
    "LaborPayment": LaborPayment,
    "ExpenseROI": ExpenseROI,
    "CustomerCategory": CustomerCategory,
    "VisitFeedback": VisitFeedback,
    "PDCAPlan": PDCAPlan,
    "HospitalStrategy": HospitalStrategy,
    "DepartmentResearch": DepartmentResearch,
    "RWSProject": RWSProject,
    "ClinicalTrial": ClinicalTrial,
    "PatientProgram": PatientProgram,
    "ResearchCollaboration": ResearchCollaboration,
    "MeetingCompliance": MeetingCompliance,
    "ExpenseCompliance": ExpenseCompliance,
    "CustomerCompliance": CustomerCompliance,
    "ComplianceRule": ComplianceRule,
}

FIELD_SEPARATOR = ","


def _split_field(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(FIELD_SEPARATOR) if v.strip()]


def _join_field(values: List[str]) -> str:
    return FIELD_SEPARATOR.join(values)


def _domain_row_to_dict(row) -> Dict[str, Any]:
    if row is None:
        return {}
    result = {}
    for col in row.__table__.columns:
        if col.name == "id":
            continue
        val = getattr(row, col.name, None)
        if val is None:
            continue
        col_type = str(col.type).upper()
        if col_type == "TEXT" and isinstance(val, str):
            if col.name in (
                "specialty", "key_insights", "preconditions", "side_effects",
                "write_back_targets", "do_actions", "check_results",
                "act_improvements", "related_expenses", "compliance_history",
            ):
                val = _split_field(val)
        result[col.name] = val
    return result


def _link_properties_to_dict(link: ObjectLink) -> Optional[Dict[str, Any]]:
    props = {}
    if link.link_strength is not None:
        props["strength"] = link.link_strength
    if link.link_frequency is not None:
        props["frequency"] = link.link_frequency
    if link.link_volume is not None:
        props["volume"] = link.link_volume
    if link.confidence is not None:
        props["confidence"] = link.confidence
    if link.valid_from is not None:
        props["valid_from"] = link.valid_from
    if link.valid_to is not None:
        props["valid_to"] = link.valid_to
    if link.provenance is not None:
        props["provenance"] = link.provenance
    if link.inverse_relation is not None:
        props["inverse_relation"] = link.inverse_relation
    return props if props else None


def build_ontology_object_response(
    obj: OntologyObject,
    links: List[ObjectLink],
    actions: List[ObjectAction],
    action_params_map: Dict[str, List[ActionParameter]],
    events: List[ObjectEvent],
    time_series: List[TimeSeriesData],
    domain_row=None,
) -> Dict[str, Any]:
    properties = _domain_row_to_dict(domain_row) if domain_row else {}

    link_schemas = []
    for link in links:
        link_dict = {
            "linkType": link.link_type,
            "targetId": link.target_id,
            "targetName": link.target_name,
            "targetType": link.target_type,
        }
        link_props = _link_properties_to_dict(link)
        if link_props:
            link_dict["properties"] = link_props
        link_schemas.append(link_dict)

    action_schemas = []
    for action in actions:
        params = action_params_map.get(action.id, [])
        param_list = []
        for p in params:
            param_list.append({
                "name": p.name,
                "type": p.param_type,
                "required": p.required,
                "defaultValue": p.default_value,
                "description": p.description,
            })
        action_schemas.append({
            "id": action.id,
            "name": action.name,
            "description": action.description,
            "parameters": param_list,
            "preconditions": _split_field(action.preconditions),
            "sideEffects": _split_field(action.side_effects),
            "writeBackTargets": _split_field(action.write_back_targets),
            "requiresApproval": action.requires_approval,
        })

    event_schemas = []
    for event in events:
        event_schemas.append({
            "id": event.id,
            "eventType": event.event_type,
            "timestamp": event.timestamp,
            "description": event.description,
            "relatedObjectId": event.related_object_id,
            "relatedObjectName": event.related_object_name,
        })

    ts_dict: Dict[str, List[Dict[str, Any]]] = {}
    for ts in time_series:
        if ts.series_name not in ts_dict:
            ts_dict[ts.series_name] = []
        ts_dict[ts.series_name].append({
            "timestamp": ts.timestamp,
            "value": ts.value,
        })

    return {
        "id": obj.id,
        "objectType": obj.object_type,
        "name": obj.name,
        "properties": properties,
        "links": link_schemas,
        "actions": action_schemas,
        "events": event_schemas,
        "timeSeries": ts_dict,
        "interfaces": [],
        "status": obj.status,
        "lifecycleStage": obj.lifecycle_stage,
        "sentiment": obj.sentiment,
        "complianceRiskLevel": obj.compliance_risk_level,
    }


def _batch_load_related_data(db: Session, object_ids: List[str], objects: List[OntologyObject]) -> Dict[str, Dict[str, Any]]:
    if not object_ids:
        return {}

    all_links = db.query(ObjectLink).filter(ObjectLink.source_id.in_(object_ids)).all()
    links_by_obj: Dict[str, List[ObjectLink]] = {}
    for link in all_links:
        links_by_obj.setdefault(link.source_id, []).append(link)

    all_actions = db.query(ObjectAction).filter(ObjectAction.object_id.in_(object_ids)).all()
    actions_by_obj: Dict[str, List[ObjectAction]] = {}
    action_ids = []
    for action in all_actions:
        actions_by_obj.setdefault(action.object_id, []).append(action)
        action_ids.append(action.id)

    action_params_map: Dict[str, List[ActionParameter]] = {}
    if action_ids:
        all_params = db.query(ActionParameter).filter(ActionParameter.action_id.in_(action_ids)).all()
        for p in all_params:
            action_params_map.setdefault(p.action_id, []).append(p)

    all_events = db.query(ObjectEvent).filter(ObjectEvent.object_id.in_(object_ids)).all()
    events_by_obj: Dict[str, List[ObjectEvent]] = {}
    for event in all_events:
        events_by_obj.setdefault(event.object_id, []).append(event)

    all_time_series = db.query(TimeSeriesData).filter(TimeSeriesData.object_id.in_(object_ids)).all()
    ts_by_obj: Dict[str, List[TimeSeriesData]] = {}
    for ts in all_time_series:
        ts_by_obj.setdefault(ts.object_id, []).append(ts)

    type_to_ids: Dict[str, List[str]] = {}
    for obj in objects:
        type_to_ids.setdefault(obj.object_type, []).append(obj.id)

    domain_rows_by_id: Dict[str, Any] = {}
    for obj_type, ids in type_to_ids.items():
        model_class = DOMAIN_MODEL_MAP.get(obj_type)
        if model_class:
            rows = db.query(model_class).filter(model_class.id.in_(ids)).all()
            for row in rows:
                domain_rows_by_id[row.id] = row

    result = {}
    for obj_id in object_ids:
        result[obj_id] = {
            "links": links_by_obj.get(obj_id, []),
            "actions": actions_by_obj.get(obj_id, []),
            "action_params_map": action_params_map,
            "events": events_by_obj.get(obj_id, []),
            "time_series": ts_by_obj.get(obj_id, []),
            "domain_row": domain_rows_by_id.get(obj_id),
        }
    return result


def get_all_objects(db: Session, object_type: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    query = db.query(OntologyObject)
    if object_type:
        query = query.filter(OntologyObject.object_type == object_type)

    total = query.count()
    offset = (page - 1) * page_size
    objects = query.offset(offset).limit(page_size).all()

    if not objects:
        return {"results": [], "total": total, "page": page, "page_size": page_size, "has_next": offset + page_size < total}

    object_ids = [obj.id for obj in objects]
    related_data = _batch_load_related_data(db, object_ids, objects)

    results = []
    for obj in objects:
        data = related_data.get(obj.id, {})
        result = build_ontology_object_response(
            obj,
            data.get("links", []),
            data.get("actions", []),
            data.get("action_params_map", {}),
            data.get("events", []),
            data.get("time_series", []),
            data.get("domain_row"),
        )
        results.append(result)
    return {"results": results, "total": total, "page": page, "page_size": page_size, "has_next": offset + page_size < total}


def get_object_by_id(db: Session, object_type: str, object_id: str) -> Optional[Dict[str, Any]]:
    obj = db.query(OntologyObject).filter(
        OntologyObject.id == object_id,
        OntologyObject.object_type == object_type,
    ).first()
    if not obj:
        return None
    related_data = _batch_load_related_data(db, [obj.id], [obj])
    data = related_data.get(obj.id, {})
    return build_ontology_object_response(
        obj,
        data.get("links", []),
        data.get("actions", []),
        data.get("action_params_map", {}),
        data.get("events", []),
        data.get("time_series", []),
        data.get("domain_row"),
    )


def search_objects(db: Session, object_type: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
    objects = db.query(OntologyObject).filter(
        OntologyObject.object_type == object_type,
        OntologyObject.name.contains(query),
    ).limit(limit).all()

    if not objects:
        return []

    object_ids = [obj.id for obj in objects]
    related_data = _batch_load_related_data(db, object_ids, objects)

    results = []
    for obj in objects:
        data = related_data.get(obj.id, {})
        result = build_ontology_object_response(
            obj,
            data.get("links", []),
            data.get("actions", []),
            data.get("action_params_map", {}),
            data.get("events", []),
            data.get("time_series", []),
            data.get("domain_row"),
        )
        results.append(result)
    return results


def _get_full_object(db: Session, obj: OntologyObject) -> Dict[str, Any]:
    related_data = _batch_load_related_data(db, [obj.id], [obj])
    data = related_data.get(obj.id, {})
    return build_ontology_object_response(
        obj,
        data.get("links", []),
        data.get("actions", []),
        data.get("action_params_map", {}),
        data.get("events", []),
        data.get("time_series", []),
        data.get("domain_row"),
    )


def create_object(db: Session, object_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    obj_id = data.get("id") or f"{object_type.lower()}_{uuid.uuid4().hex[:8]}"
    obj = OntologyObject(
        id=obj_id,
        object_type=object_type,
        name=data.get("name", ""),
        status=data.get("status", "normal"),
        lifecycle_stage=data.get("lifecycleStage"),
        sentiment=data.get("sentiment"),
        compliance_risk_level=data.get("complianceRiskLevel"),
    )
    db.add(obj)

    properties = data.get("properties", {})
    _create_domain_row(db, object_type, obj_id, properties)

    for link_data in data.get("links", []):
        link_props = link_data.get("properties", {}) or {}
        link = ObjectLink(
            source_id=obj_id,
            link_type=link_data.get("linkType", ""),
            target_id=link_data.get("targetId", ""),
            target_name=link_data.get("targetName", ""),
            target_type=link_data.get("targetType", ""),
            link_strength=link_props.get("strength"),
            link_frequency=link_props.get("frequency"),
            link_volume=link_props.get("volume"),
            confidence=link_props.get("confidence"),
            valid_from=link_props.get("valid_from"),
            valid_to=link_props.get("valid_to"),
            provenance=link_props.get("provenance", "manual"),
            inverse_relation=link_props.get("inverse_relation"),
        )
        db.add(link)

    for action_data in data.get("actions", []):
        action = ObjectAction(
            id=action_data.get("id", f"act_{obj_id}_{action_data.get('name', '')}"),
            object_id=obj_id,
            name=action_data.get("name", ""),
            description=action_data.get("description"),
            requires_approval=action_data.get("requiresApproval", False),
            preconditions=_join_field(action_data.get("preconditions", [])),
            side_effects=_join_field(action_data.get("sideEffects", [])),
            write_back_targets=_join_field(action_data.get("writeBackTargets", [])),
        )
        db.add(action)
        for param_data in action_data.get("parameters", []):
            param = ActionParameter(
                action_id=action.id,
                name=param_data.get("name", ""),
                param_type=param_data.get("type", "string"),
                required=param_data.get("required", False),
                default_value=param_data.get("defaultValue"),
                description=param_data.get("description"),
            )
            db.add(param)

    for event_data in data.get("events", []):
        event = ObjectEvent(
            id=event_data.get("id", f"evt_{obj_id}_{uuid.uuid4().hex[:8]}"),
            object_id=obj_id,
            event_type=event_data.get("eventType", ""),
            timestamp=event_data.get("timestamp", ""),
            description=event_data.get("description"),
            related_object_id=event_data.get("relatedObjectId"),
            related_object_name=event_data.get("relatedObjectName"),
        )
        db.add(event)

    for series_name, points in data.get("timeSeries", {}).items():
        for point in points:
            ts = TimeSeriesData(
                object_id=obj_id,
                series_name=series_name,
                timestamp=point.get("timestamp", ""),
                value=point.get("value", 0),
            )
            db.add(ts)

    db.commit()
    return _get_full_object(db, obj)


def _create_domain_row(db: Session, object_type: str, obj_id: str, properties: Dict[str, Any]):
    model_class = DOMAIN_MODEL_MAP.get(object_type)
    if not model_class:
        return
    col_names = {c.name for c in model_class.__table__.columns}
    filtered = {}
    for k, v in properties.items():
        db_field = k
        if db_field in col_names:
            if isinstance(v, list):
                v = _join_field([str(i) for i in v])
            filtered[db_field] = v
    if not filtered:
        filtered = {"id": obj_id}
    else:
        filtered["id"] = obj_id
    row = model_class(**filtered)
    db.add(row)


def update_object(db: Session, object_type: str, object_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    obj = db.query(OntologyObject).filter(
        OntologyObject.id == object_id,
        OntologyObject.object_type == object_type,
    ).first()
    if not obj:
        return None

    if "name" in data:
        obj.name = data["name"]
    if "status" in data:
        obj.status = data["status"]
    if "lifecycleStage" in data:
        obj.lifecycle_stage = data["lifecycleStage"]
    if "sentiment" in data:
        obj.sentiment = data["sentiment"]
    if "complianceRiskLevel" in data:
        obj.compliance_risk_level = data["complianceRiskLevel"]

    if "properties" in data:
        _update_domain_row(db, object_type, object_id, data["properties"])

    db.commit()
    return _get_full_object(db, obj)


def _update_domain_row(db: Session, object_type: str, obj_id: str, properties: Dict[str, Any]):
    model_class = DOMAIN_MODEL_MAP.get(object_type)
    if not model_class:
        return
    row = db.query(model_class).filter(model_class.id == obj_id).first()
    if not row:
        _create_domain_row(db, object_type, obj_id, properties)
        return
    col_names = {c.name for c in model_class.__table__.columns}
    for k, v in properties.items():
        if k in col_names and k != "id":
            if isinstance(v, list):
                v = _join_field([str(i) for i in v])
            setattr(row, k, v)


def delete_object(db: Session, object_type: str, object_id: str) -> bool:
    obj = db.query(OntologyObject).filter(
        OntologyObject.id == object_id,
        OntologyObject.object_type == object_type,
    ).first()
    if not obj:
        return False

    db.query(ObjectLink).filter(ObjectLink.source_id == object_id).delete()
    db.query(ObjectAction).filter(ObjectAction.object_id == object_id).delete()
    db.query(ObjectEvent).filter(ObjectEvent.object_id == object_id).delete()
    db.query(TimeSeriesData).filter(TimeSeriesData.object_id == object_id).delete()

    model_class = DOMAIN_MODEL_MAP.get(object_type)
    if model_class:
        domain_row = db.query(model_class).filter(model_class.id == object_id).first()
        if domain_row:
            db.delete(domain_row)

    db.delete(obj)
    db.commit()
    return True


def get_entity_with_domain(db: Session, entity_id: str) -> Optional[Dict[str, Any]]:
    obj = db.query(OntologyObject).filter(OntologyObject.id == entity_id).first()
    if not obj:
        return None

    model_class = DOMAIN_MODEL_MAP.get(obj.object_type)
    domain_row = None
    if model_class:
        domain_row = db.query(model_class).filter(model_class.id == entity_id).first()

    related_data = _batch_load_related_data(db, [entity_id], [obj])
    data = related_data.get(entity_id, {})

    result = build_ontology_object_response(
        obj,
        data.get("links", []),
        data.get("actions", []),
        data.get("action_params_map", {}),
        data.get("events", []),
        data.get("time_series", []),
        domain_row,
    )
    result["entityType"] = obj.object_type
    if domain_row:
        result["domainData"] = _domain_row_to_dict(domain_row)

    return result
