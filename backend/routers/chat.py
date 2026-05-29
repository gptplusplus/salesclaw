from typing import Optional
import asyncio
import json
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from auth import require_auth, get_current_user
from models.user import User
from schemas.chat import ChatRequest, ChatResponse
from services.chat_service import (
    create_or_get_thread,
    save_message,
    generate_response,
    generate_response_with_llm,
    generate_response_with_agent,
    _is_complex_question,
    _get_data_summary,
    _get_thread_messages,
)
from llm import is_llm_configured, build_system_prompt, chat_with_llm_stream_with_thinking

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    user_id = user.id
    thread = create_or_get_thread(db, user_id, req.thread_id)
    save_message(db, thread.id, "user", req.message)

    response_text, reasoning_info = _get_chat_response(db, req.message, thread.id)

    save_message(db, thread.id, "assistant", response_text)
    return ChatResponse(
        response=response_text,
        thread_id=thread.id,
        actions=[],
        reasoning=reasoning_info,
    )


def _get_chat_response(db: Session, message: str, thread_id: str) -> tuple:
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(generate_response_with_llm(db, message, thread_id))
        loop.close()
        if result:
            print(f"✅ LLM response generated for: {message[:50]}")
            return result, None
        else:
            print("⚠️ LLM returned None, falling back to agent or template")
    except Exception as e:
        print(f"❌ LLM call failed: {type(e).__name__}: {e}")

    if _is_complex_question(message):
        agent_response, agent_result = generate_response_with_agent(db, message)
        if agent_response:
            return agent_response, agent_result

    return generate_response(db, message), None


async def _stream_response_generator(db: Session, message: str, thread_id: str):
    print(f"📡 Starting stream generator...")
    try:
        print(f"🔗 Sending connected event")
        yield "data: " + json.dumps({"type": "connected"}, ensure_ascii=False) + "\n\n"

        if not is_llm_configured():
            print(f"⚠️ LLM not configured, falling back to agent or template")
            if _is_complex_question(message):
                print(f"🤖 Trying agent for complex question...")
                agent_response, agent_result = generate_response_with_agent(db, message)
                if agent_response:
                    full_answer = str(agent_response)
                    data = json.dumps({
                        "type": "answer",
                        "content": full_answer,
                        "thinking": "",
                        "answer": full_answer,
                    }, ensure_ascii=False)
                    yield f"data: {data}\n\n"
                    save_message(db, thread_id, "user", message)
                    save_message(db, thread_id, "assistant", full_answer)
                    final_data = json.dumps({
                        "type": "done",
                        "thinking": "",
                        "answer": full_answer,
                        "thread_id": thread_id,
                    }, ensure_ascii=False)
                    yield f"data: {final_data}\n\n"
                    yield "data: [DONE]\n\n"
                    print(f"✅ Agent response sent")
                    return

            print(f"📝 Using template response...")
            template_response = generate_response(db, message)
            full_answer = template_response or "抱歉，系统暂时无法回答您的问题。"
            data = json.dumps({
                "type": "answer",
                "content": full_answer,
                "thinking": "",
                "answer": full_answer,
            }, ensure_ascii=False)
            yield f"data: {data}\n\n"
            save_message(db, thread_id, "user", message)
            save_message(db, thread_id, "assistant", full_answer)
            final_data = json.dumps({
                "type": "done",
                "thinking": "",
                "answer": full_answer,
                "thread_id": thread_id,
            }, ensure_ascii=False)
            yield f"data: {final_data}\n\n"
            yield "data: [DONE]\n\n"
            print(f"✅ Template response sent")
            return

        print(f"📝 Getting data summary and building system prompt...")
        data_summary = _get_data_summary(db)
        system_prompt = build_system_prompt(data_summary)

        messages = []
        if thread_id:
            print(f"💬 Loading thread messages for thread: {thread_id}")
            messages = _get_thread_messages(db, thread_id)
        messages.append({"role": "user", "content": message})
        
        print(f"🚀 Calling LLM stream API with {len(messages)} messages...")

        full_thinking = ""
        full_answer = ""
        chunk_count = 0
        current_type = None

        async for chunk_type, chunk_content in chat_with_llm_stream_with_thinking(messages, system_prompt):
            chunk_count += 1
            current_type = chunk_type
            print(f"📦 LLM chunk #{chunk_count}: type={chunk_type}, len={len(chunk_content)}")
            if chunk_type == "thinking":
                full_thinking += chunk_content
                data = json.dumps({
                    "type": "thinking",
                    "content": chunk_content,
                    "thinking": full_thinking,
                    "answer": "",
                }, ensure_ascii=False)
                yield f"data: {data}\n\n"
            elif chunk_type == "answer":
                full_answer += chunk_content
                data = json.dumps({
                    "type": "answer",
                    "content": chunk_content,
                    "thinking": full_thinking,
                    "answer": full_answer,
                }, ensure_ascii=False)
                yield f"data: {data}\n\n"

        print(f"\n📊 Stream complete: {chunk_count} chunks")
        print(f"   Thinking: {len(full_thinking)} chars")
        print(f"   Answer: {len(full_answer)} chars")
        
        if not full_thinking and not full_answer:
            print(f"⚠️ No content from LLM, falling back to agent or template")
            if _is_complex_question(message):
                agent_response, agent_result = generate_response_with_agent(db, message)
                if agent_response:
                    full_answer = str(agent_response)
                else:
                    full_answer = generate_response(db, message) or "抱歉，系统暂时无法回答您的问题。"
            else:
                full_answer = generate_response(db, message) or "抱歉，系统暂时无法回答您的问题。"
            
            data = json.dumps({
                "type": "answer",
                "content": full_answer,
                "thinking": "",
                "answer": full_answer,
            }, ensure_ascii=False)
            yield f"data: {data}\n\n"

        if full_thinking and full_answer:
            save_message(db, thread_id, "user", message)
            save_message(db, thread_id, "assistant", full_answer)
        elif full_answer:
            save_message(db, thread_id, "user", message)
            save_message(db, thread_id, "assistant", full_answer)

        final_data = json.dumps({
            "type": "done",
            "thinking": full_thinking,
            "answer": full_answer,
            "thread_id": thread_id,
        }, ensure_ascii=False)
        yield f"data: {final_data}\n\n"
        yield "data: [DONE]\n\n"
        print(f"✅ Stream generator finished successfully")
    except Exception as e:
        print(f"❌ Stream generator error: {e}")
        import traceback
        traceback.print_exc()
        error_data = json.dumps({
            "type": "error",
            "content": "抱歉，服务出现错误，请稍后再试。",
            "thinking": "",
            "answer": "抱歉，服务出现错误，请稍后再试。",
        }, ensure_ascii=False)
        yield f"data: {error_data}\n\n"
        yield "data: [DONE]\n\n"


@router.post("/chat/stream")
async def chat_stream(
    req: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_auth),
):
    print(f"\n{'='*60}")
    print(f"🚀 SSE stream request received")
    print(f"   User: {user.id}")
    print(f"   Message: {req.message[:50]}...")
    print(f"   Thread: {req.thread_id}")
    print(f"{'='*60}\n")
    
    user_id = user.id
    thread = create_or_get_thread(db, user_id, req.thread_id)
    
    print(f"✅ Thread created/loaded: {thread.id}")
    
    return StreamingResponse(
        _stream_response_generator(db, req.message, thread.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/oag")
async def oag_chat_endpoint(
    request: dict,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
):
    from services.oag_service import oag_chat
    result = await oag_chat(db, request.get("message", ""), user.id if user else "anonymous")
    return result


@router.get("/oag/analyze/{object_id}")
async def oag_analyze_endpoint(
    object_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
):
    from services.oag_service import oag_object_analysis
    result = oag_object_analysis(db, object_id)
    return result
