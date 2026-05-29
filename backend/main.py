import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables, _get_engine
from sqlalchemy.orm import sessionmaker

DEFAULT_ORIGINS = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,tauri://localhost,http://tauri.localhost,http://localhost:1420,http://localhost:1421,http://localhost:1422,http://localhost:1423,http://localhost:1424,http://0.0.0.0:5173"

from routers import health, auth, ontology, actions, chat, scenarios, inference, notifications, reminders, agent, reasoning, effects, ws, memory, perception, suggestions, insights, ontology_definition, events, ontology_admin

def _get_db_session():
    engine = _get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


async def periodic_risk_scan():
    while True:
        await asyncio.sleep(300)
        try:
            db = _get_db_session()
            from models.domain import Doctor
            from models.ontology import OntologyObject
            from services.ws_manager import manager
            warning_count = db.query(OntologyObject).filter(
                OntologyObject.status.in_(["warning", "critical"])
            ).count()
            if warning_count > 0:
                await manager.broadcast({
                    "type": "periodic_scan",
                    "data": {
                        "timestamp": asyncio.get_event_loop().time(),
                        "warning_entities": warning_count,
                        "message": f"发现 {warning_count} 个实体处于风险状态"
                    }
                })
            db.close()
        except Exception as e:
            print(f"Periodic scan error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    from seed import seed_database
    seed_database()
    scan_task = asyncio.create_task(periodic_risk_scan())
    yield
    scan_task.cancel()


app = FastAPI(title="SalesClaw API", version="1.0.0", lifespan=lifespan)

allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", DEFAULT_ORIGINS)
allowed_cors_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
if not allowed_cors_origins:
    allowed_cors_origins = ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(ontology.router)
app.include_router(actions.router)
app.include_router(chat.router)
app.include_router(scenarios.router)
app.include_router(inference.router)
app.include_router(notifications.router)
app.include_router(reminders.router)
app.include_router(agent.router)
app.include_router(reasoning.router)
app.include_router(effects.router)
app.include_router(ws.router)
app.include_router(memory.router)
app.include_router(perception.router)
app.include_router(suggestions.router)
app.include_router(insights.router)
app.include_router(ontology_definition.router)
app.include_router(events.router)
app.include_router(ontology_admin.router)
