"""SSE Streaming endpoints for live debate viewing."""

import asyncio
import json
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from routers.debates import active_debates, stream_queues, _get_or_create_queue

router = APIRouter()


@router.get("/debates/{debate_id}/stream/all")
async def stream_all(debate_id: str):
    """SSE stream for ALL agents multiplexed into one stream.
    
    If the debate hasn't started yet, waits up to 10s for it to appear.
    """

    # Wait for debate to appear in active_debates (timing issue fix)
    waited = 0
    while debate_id not in active_debates and waited < 10:
        await asyncio.sleep(0.5)
        waited += 0.5

    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail="No active debate found. Try starting it first.")

    async def _all_generator():
        # Initial connection event
        yield f"data: {json.dumps({'connected': True, 'debate_id': debate_id})}\n\n"

        state = active_debates.get(debate_id)
        if not state:
            yield "data: [DONE]\n\n"
            return

        agent_ids = [a.id for a in state.agents] + ["moderator"]
        done_agents = set()
        idle_ticks = 0
        start_time = time.time()

        while True:
            found_any = False
            for aid in agent_ids:
                if aid in done_agents:
                    continue
                q = stream_queues.get(debate_id, {}).get(aid)
                if not q:
                    continue
                try:
                    chunk = q.get_nowait()
                    found_any = True
                    idle_ticks = 0

                    data = {
                        "agent_id": chunk.agent_id,
                        "agent_name": chunk.agent_name,
                        "agent_icon": chunk.agent_icon,
                        "round_number": chunk.round_number,
                    }

                    if chunk.done:
                        data["done"] = True
                        data["error"] = chunk.error
                        if chunk.round_number == 99:
                            done_agents.add(aid)
                        # Also mark agent done for non-moderator final rounds
                        if chunk.error:
                            done_agents.add(aid)
                    elif chunk.status and not chunk.token:
                        data["status"] = chunk.status
                    else:
                        data["token"] = chunk.token or ""
                        if chunk.status:
                            data["status"] = chunk.status

                    yield f"data: {json.dumps(data)}\n\n"

                except asyncio.QueueEmpty:
                    continue

            if len(done_agents) >= len(agent_ids):
                yield "data: [DONE]\n\n"
                return

            if not found_any:
                idle_ticks += 1
                await asyncio.sleep(0.05)

                # Keepalive every ~2 seconds
                if idle_ticks % 40 == 0:
                    state = active_debates.get(debate_id)
                    if not state:
                        yield "data: [DONE]\n\n"
                        return
                    elapsed = int(time.time() - start_time)
                    yield f"data: {json.dumps({'keepalive': True, 'round': state.current_round, 'status': state.status, 'elapsed': elapsed})}\n\n"

                # Safety: if debate disappears from active_debates (crashed)
                if idle_ticks % 200 == 0:
                    if debate_id not in active_debates:
                        yield f"data: {json.dumps({'error': 'Debate ended unexpectedly', 'done': True, 'agent_id': 'system'})}\n\n"
                        yield "data: [DONE]\n\n"
                        return

    return StreamingResponse(
        _all_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/debates/{debate_id}/stream/{agent_id}")
async def stream_agent(debate_id: str, agent_id: str):
    """SSE stream for a specific agent's tokens."""
    waited = 0
    while debate_id not in active_debates and waited < 10:
        await asyncio.sleep(0.5)
        waited += 0.5

    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail="No active debate found.")

    async def _agent_generator():
        yield f"data: {json.dumps({'connected': True})}\n\n"
        queue = _get_or_create_queue(debate_id, agent_id)
        try:
            while True:
                try:
                    chunk = await asyncio.wait_for(queue.get(), timeout=60.0)
                    data = {"agent_id": chunk.agent_id, "round_number": chunk.round_number}
                    if chunk.done:
                        data["done"] = True
                        data["error"] = chunk.error
                        yield f"data: {json.dumps(data)}\n\n"
                        state = active_debates.get(debate_id)
                        if not state or state.status != "running" or chunk.round_number >= 99:
                            yield "data: [DONE]\n\n"
                            return
                    else:
                        data["token"] = chunk.token
                        if chunk.status:
                            data["status"] = chunk.status
                        yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    if debate_id not in active_debates:
                        yield "data: [DONE]\n\n"
                        return
        except asyncio.CancelledError:
            return

    return StreamingResponse(
        _agent_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
