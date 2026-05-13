from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import require_auth
from models.user import User
from models.domain import Doctor, Hospital, SalesTarget
from models.ontology import OntologyObject
from pydantic import BaseModel


router = APIRouter(prefix="/api/insights", tags=["insights"])


class InsightItem(BaseModel):
    id: str
    type: str
    title: str
    description: str
    confidence: float
    evidence: List[dict]
    suggestedActions: List[str]
    relatedEntities: List[str]
    createdAt: str
    status: str


@router.get("/", response_model=List[InsightItem])
def get_insights(
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    """Generate insights based on current data patterns."""
    doctors = db.query(Doctor).join(OntologyObject, OntologyObject.id == Doctor.id).all()
    hospitals = db.query(Hospital).join(OntologyObject, OntologyObject.id == Hospital.id).all()
    
    insights = []
    timestamp = "now"
    idx = 0
    
    high_influence_doctors = [d for d in doctors if d.influence_score and d.influence_score > 7]
    if len(high_influence_doctors) > 0:
        idx += 1
        insights.append(InsightItem(
            id=f"insight_{idx}",
            type="opportunity",
            title="高影响力医生群体分析",
            description=f"系统识别到 {len(high_influence_doctors)} 位高影响力医生（评分>7），他们是关键意见领袖，对处方决策有重要影响",
            confidence=0.9,
            evidence=[{
                "type": "influence_analysis",
                "description": f"{len(high_influence_doctors)} 位医生影响力评分>7",
                "weight": 0.9
            }],
            suggestedActions=["制定KOL管理计划", "邀请参与学术会议", "建立长期合作关系"],
            relatedEntities=[d.id for d in high_influence_doctors[:3]],
            createdAt=timestamp,
            status="active"
        ))
    
    low_volume_doctors = [d for d in doctors if d.prescription_volume and d.prescription_volume < 50]
    if len(low_volume_doctors) > 0:
        idx += 1
        insights.append(InsightItem(
            id=f"insight_{idx}",
            type="trend",
            title="低处方量医生群体关注",
            description=f"系统识别到 {len(low_volume_doctors)} 位处方量偏低的医生（<50），需要分析原因并制定提升策略",
            confidence=0.85,
            evidence=[{
                "type": "volume_analysis",
                "description": f"{len(low_volume_doctors)} 位医生处方量<50",
                "weight": 0.85
            }],
            suggestedActions=["分析处方量偏低原因", "安排针对性拜访", "提供学术支持"],
            relatedEntities=[d.id for d in low_volume_doctors[:3]],
            createdAt=timestamp,
            status="active"
        ))
    
    if len(hospitals) > 0:
        idx += 1
        insights.append(InsightItem(
            id=f"insight_{idx}",
            type="correlation",
            title="医院覆盖分析",
            description=f"当前覆盖 {len(hospitals)} 家医院，建议评估每家医院的医生覆盖深度和产品渗透率",
            confidence=0.8,
            evidence=[{
                "type": "coverage_analysis",
                "description": f"{len(hospitals)} 家医院已覆盖",
                "weight": 0.8
            }],
            suggestedActions=["评估医院覆盖深度", "分析产品渗透率", "制定医院分级管理策略"],
            relatedEntities=[h.id for h in hospitals[:3]],
            createdAt=timestamp,
            status="active"
        ))
    
    return insights
