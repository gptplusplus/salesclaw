import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.ontology import OntologyObject
from models.domain import SalesTarget, BudgetCategory, VisitFeedback


def get_decision_effects(db: Session, decision_id: str) -> Dict[str, Any]:
    obj = db.query(OntologyObject).filter(OntologyObject.id == decision_id).first()
    if not obj:
        return {"error": "Decision not found", "metrics": []}

    metrics = _compute_metrics(db, obj)
    return {
        "decisionId": decision_id,
        "decisionName": obj.name,
        "decisionType": obj.object_type,
        "metrics": metrics,
        "computedAt": datetime.now(timezone.utc).isoformat(),
    }


def _compute_metrics(db: Session, decision_obj: OntologyObject) -> List[Dict[str, Any]]:
    metrics = []

    sales_growth = _compute_sales_growth(db)
    metrics.append(sales_growth)

    customer_satisfaction = _compute_customer_satisfaction(db)
    metrics.append(customer_satisfaction)

    execution_efficiency = _compute_execution_efficiency(db, decision_obj)
    metrics.append(execution_efficiency)

    resource_utilization = _compute_resource_utilization(db)
    metrics.append(resource_utilization)

    return metrics


def _compute_sales_growth(db: Session) -> Dict[str, Any]:
    targets = db.query(SalesTarget).all()
    if not targets:
        return {"name": "销售增长", "expected": 15, "actual": 0, "unit": "%", "status": "below"}

    avg_rate = sum(t.achievement_rate or 0 for t in targets) / len(targets)
    actual = round(avg_rate, 1)
    expected = 15

    return {
        "name": "销售增长",
        "expected": expected,
        "actual": actual,
        "unit": "%",
        "status": "exceeded" if actual > expected else "met" if actual >= expected * 0.8 else "below",
        "detail": f"平均达成率 {actual}%，基于 {len(targets)} 个销售目标",
    }


def _compute_customer_satisfaction(db: Session) -> Dict[str, Any]:
    feedbacks = db.query(VisitFeedback).all()
    if not feedbacks:
        return {"name": "客户满意度", "expected": 85, "actual": 0, "unit": "%", "status": "below"}

    positive = sum(1 for f in feedbacks if f.feedback_sentiment == "positive")
    total_with_sentiment = sum(1 for f in feedbacks if f.feedback_sentiment is not None)
    if total_with_sentiment == 0:
        return {"name": "客户满意度", "expected": 85, "actual": 0, "unit": "%", "status": "below"}

    actual = round(positive / total_with_sentiment * 100, 1)
    expected = 85

    return {
        "name": "客户满意度",
        "expected": expected,
        "actual": actual,
        "unit": "%",
        "status": "exceeded" if actual > expected else "met" if actual >= expected * 0.8 else "below",
        "detail": f"正面反馈比例 {actual}%，基于 {total_with_sentiment} 条反馈",
    }


def _compute_execution_efficiency(db: Session, decision_obj: OntologyObject) -> Dict[str, Any]:
    from models.action import ActionProposal
    actions = db.query(ActionProposal).filter(ActionProposal.entity_id == decision_obj.id).all()
    if not actions:
        all_actions = db.query(ActionProposal).all()
        if not all_actions:
            return {"name": "执行效率", "expected": 100, "actual": 0, "unit": "%", "status": "below"}
        completed = sum(1 for a in all_actions if a.status in ("approved", "executed"))
        actual = round(completed / len(all_actions) * 100, 1)
    else:
        completed = sum(1 for a in actions if a.status in ("approved", "executed"))
        actual = round(completed / len(actions) * 100, 1)

    expected = 100

    return {
        "name": "执行效率",
        "expected": expected,
        "actual": actual,
        "unit": "%",
        "status": "exceeded" if actual >= 100 else "met" if actual >= 80 else "below",
    }


def _compute_resource_utilization(db: Session) -> Dict[str, Any]:
    budgets = db.query(BudgetCategory).all()
    if not budgets:
        return {"name": "资源利用率", "expected": 90, "actual": 0, "unit": "%", "status": "below"}

    rates = []
    for b in budgets:
        if b.budget_amount and b.budget_amount > 0 and b.used_amount is not None:
            rates.append(b.used_amount / b.budget_amount * 100)
        elif b.execution_rate is not None:
            rates.append(b.execution_rate * 100)

    if not rates:
        return {"name": "资源利用率", "expected": 90, "actual": 0, "unit": "%", "status": "below"}

    actual = round(sum(rates) / len(rates), 1)
    expected = 90

    return {
        "name": "资源利用率",
        "expected": expected,
        "actual": actual,
        "unit": "%",
        "status": "exceeded" if actual > expected else "met" if actual >= expected * 0.8 else "below",
        "detail": f"平均使用率 {actual}%，基于 {len(rates)} 个预算分类",
    }
