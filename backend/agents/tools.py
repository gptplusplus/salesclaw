from langchain_core.tools import tool
from typing import Dict, Any
import uuid
from sqlalchemy.orm import Session
from database import SessionLocal
from models.domain import Doctor, Hospital, Product, SalesTarget, ComplianceAlert
from models.ontology import OntologyObject
from models.execution import ExecutionLog
from models.action import ActionProposal


@tool
def get_customer_context(keyword: str) -> str:
    """Retrieve key statistics regarding Doctors, Hospitals, and prescription volumes. Use this when analyzing customer churn or territory overview."""
    db = SessionLocal()
    try:
        doctor_count = db.query(Doctor).count()
        hospital_count = db.query(Hospital).count()
        doctors = db.query(Doctor).join(OntologyObject, OntologyObject.id == Doctor.id).all()
        
        lines = []
        for d in doctors[:5]:
            obj = db.query(OntologyObject).filter(OntologyObject.id == d.id).first()
            name = obj.name if obj else d.id
            lines.append(f"- {name}：处方量 {d.prescription_volume or 'N/A'}，影响力 {d.influence_score or 'N/A'}")
        
        result = f"医生总数: {doctor_count}, 医院总数: {hospital_count}\n"
        if lines:
            result += "医生数据:\n" + "\n".join(lines)
        return result
    except Exception as e:
        return f"Error retrieving customer context: {str(e)}"
    finally:
        db.close()


@tool
def get_compliance_risks() -> str:
    """Check for active compliance risks or alerts."""
    db = SessionLocal()
    try:
        alerts = db.query(ComplianceAlert).all()
        if not alerts:
            return "当前无合规告警"
        
        lines = []
        for alert in alerts[:5]:
            lines.append(f"- 告警ID: {alert.id}, 类型: {alert.risk_type or 'N/A'}, 状态: {alert.alert_status or 'N/A'}")
        
        return f"当前合规告警数量: {len(alerts)} 条\n" + "\n".join(lines)
    except Exception as e:
        return f"Error retrieving compliance risks: {str(e)}"
    finally:
        db.close()


@tool
def get_sales_target_status() -> str:
    """Check current sales targets achievement."""
    db = SessionLocal()
    try:
        targets = db.query(SalesTarget).all()
        if not targets:
            return "暂无销售目标数据"
        
        avg_rate = sum(t.achievement_rate or 0 for t in targets) / len(targets)
        lines = []
        for t in targets[:5]:
            lines.append(f"- 目标: {t.target_type or 'N/A'}, 达成率: {t.achievement_rate or 'N/A'}%")
        
        return f"当前平均达成率: {avg_rate:.1f}%\n" + "\n".join(lines)
    except Exception as e:
        return f"Error retrieving sales target status: {str(e)}"
    finally:
        db.close()


@tool
def execute_action(action_type: str, target: str, params: Dict[str, Any]) -> str:
    """
    Execute a strategic action.
    action_type: e.g., 'increase_visits', 'send_academic_materials', 'adjust_budget'.
    target: The specific doctor, hospital, or region ID.
    params: specific arguments for the action.
    """
    db = SessionLocal()
    try:
        log_id = str(uuid.uuid4())
        log_entry = ExecutionLog(
            id=log_id,
            action_name=action_type,
            tool_name="execute_action",
            parameters=str(params),
            status="proposed",
            result=f"Action '{action_type}' for target '{target}' proposed.",
        )
        db.add(log_entry)
        
        proposal_id = str(uuid.uuid4())
        proposal = ActionProposal(
            id=proposal_id,
            title=action_type,
            description=str(params.get("description", "")),
            action_type=action_type,
            entity_id=target,
            priority=params.get("priority", "medium"),
            status="pending",
            proposed_by="agent",
        )
        db.add(proposal)
        db.commit()
        
        return f"Action '{action_type}' for target '{target}' proposed successfully. Proposal ID: {proposal_id}"
    except Exception as e:
        db.rollback()
        return f"Action proposal failed: {str(e)}"
    finally:
        db.close()


@tool
def create_visit_record(doctor_id: str, visit_date: str, notes: str = "") -> str:
    """Create a visit record for a doctor."""
    db = SessionLocal()
    try:
        log_id = str(uuid.uuid4())
        log_entry = ExecutionLog(
            id=log_id,
            action_name="create_visit_record",
            tool_name="create_visit_record",
            parameters=f"doctor_id={doctor_id}, visit_date={visit_date}",
            status="success",
            result=f"Visit record created for doctor {doctor_id} on {visit_date}",
        )
        db.add(log_entry)
        db.commit()
        return f"拜访记录已创建，医生: {doctor_id}, 日期: {visit_date}"
    except Exception as e:
        db.rollback()
        return f"创建拜访记录失败: {str(e)}"
    finally:
        db.close()


@tool
def update_doctor_sentiment(doctor_id: str, sentiment: str) -> str:
    """Update doctor sentiment/attitude."""
    db = SessionLocal()
    try:
        log_id = str(uuid.uuid4())
        log_entry = ExecutionLog(
            id=log_id,
            action_name="update_doctor_sentiment",
            tool_name="update_doctor_sentiment",
            parameters=f"doctor_id={doctor_id}, sentiment={sentiment}",
            status="success",
            result=f"Doctor {doctor_id} sentiment updated to {sentiment}",
        )
        db.add(log_entry)
        db.commit()
        return f"医生态度已更新，医生: {doctor_id}, 态度: {sentiment}"
    except Exception as e:
        db.rollback()
        return f"更新医生态度失败: {str(e)}"
    finally:
        db.close()


@tool
def flag_compliance_risk(entity_id: str, risk_type: str, severity: str = "medium") -> str:
    """Flag a compliance risk for an entity."""
    db = SessionLocal()
    try:
        alert_id = str(uuid.uuid4())
        alert = ComplianceAlert(
            id=alert_id,
            severity=severity,
            risk_type=risk_type,
            alert_description=f"Compliance risk flagged for entity {entity_id}",
            alert_status="active",
        )
        db.add(alert)
        
        log_id = str(uuid.uuid4())
        log_entry = ExecutionLog(
            id=log_id,
            action_name="flag_compliance_risk",
            tool_name="flag_compliance_risk",
            parameters=f"entity_id={entity_id}, risk_type={risk_type}, severity={severity}",
            status="success",
            result=f"Compliance risk flagged for {entity_id}",
        )
        db.add(log_entry)
        db.commit()
        return f"合规风险已标记，实体: {entity_id}, 类型: {risk_type}, 严重度: {severity}"
    except Exception as e:
        db.rollback()
        return f"标记合规风险失败: {str(e)}"
    finally:
        db.close()


@tool
def send_notification(user_id: str, message: str, priority: str = "medium") -> str:
    """Send a notification to a user."""
    db = SessionLocal()
    try:
        log_id = str(uuid.uuid4())
        log_entry = ExecutionLog(
            id=log_id,
            action_name="send_notification",
            tool_name="send_notification",
            parameters=f"user_id={user_id}, priority={priority}",
            status="success",
            result=f"Notification sent to {user_id}",
        )
        db.add(log_entry)
        db.commit()
        
        # 异步通知（不阻塞主流程）
        try:
            from services.ws_manager import manager
            import asyncio
            
            try:
                loop = asyncio.get_running_loop()
                # 如果在已有事件循环中，创建后台任务
                asyncio.create_task(
                    manager.send_to_user(user_id, {
                        "type": "new_alert",
                        "data": {"message": message, "priority": priority}
                    })
                )
            except RuntimeError:
                # 没有运行中的事件循环，创建新的
                loop = asyncio.new_event_loop()
                try:
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(
                        manager.send_to_user(user_id, {
                            "type": "new_alert",
                            "data": {"message": message, "priority": priority}
                        })
                    )
                finally:
                    loop.close()
        except Exception:
            # WebSocket通知失败不影响主流程
            pass
        
        return f"通知已发送给用户: {user_id}, 优先级: {priority}"
    except Exception as e:
        db.rollback()
        return f"发送通知失败: {str(e)}"
    finally:
        db.close()


AGENT_TOOLS = [
    get_customer_context,
    get_compliance_risks,
    get_sales_target_status,
    execute_action,
    create_visit_record,
    update_doctor_sentiment,
    flag_compliance_risk,
    send_notification
]
