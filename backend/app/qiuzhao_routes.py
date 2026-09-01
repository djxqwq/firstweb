"""
秋招投递工具 API —— 仅 admin 可访问，与站点内容 CRUD 隔离。
灵感参考：JobTrack AI / JobHunter 的状态管道 + 临近日程。
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.main import (
    Admin,
    QiuzhaoApplication,
    _loads,
    get_current_admin,
    get_db,
)

router = APIRouter(prefix="/api/tools/qiuzhao", tags=["tools-qiuzhao"])

STATUSES = (
    "wishlist",
    "applied",
    "exam",
    "interview",
    "offer",
    "rejected",
)

STATUS_LABELS = {
    "wishlist": "待投",
    "applied": "已投",
    "exam": "笔试",
    "interview": "面试",
    "offer": "Offer",
    "rejected": "挂了",
}


class QiuzhaoIn(BaseModel):
    company: str = ""
    role: str = ""
    city: str = ""
    channel: str = ""
    track: str = ""
    status: str = "wishlist"
    priority: str = "normal"
    applied_at: str = ""
    exam_at: str = ""
    exam_url: str = ""
    exam_done: bool = False
    exam_result: str = ""
    interview_at: str = ""
    interview_url: str = ""
    interview_done: bool = False
    interview_round: str = ""
    interview_result: str = ""
    next_action_at: str = ""
    salary: str = ""
    jd_url: str = ""
    apply_url: str = ""
    notes: str = ""
    events: list[dict[str, Any]] = Field(default_factory=list)


class StatusIn(BaseModel):
    status: str


def _auto_next_action(payload: QiuzhaoIn | QiuzhaoApplication) -> str:
    """从笔试/各轮面试日期自动推算最近节点（忽略手填）。"""
    today = datetime.now(timezone.utc).astimezone().date().isoformat()
    candidates: list[str] = []

    exam_at = getattr(payload, "exam_at", "") or ""
    exam_done = bool(getattr(payload, "exam_done", False))
    if exam_at and not exam_done:
        candidates.append(exam_at[:10])

    interview_at = getattr(payload, "interview_at", "") or ""
    interview_done = bool(getattr(payload, "interview_done", False))
    if interview_at and not interview_done:
        candidates.append(interview_at[:10])

    events = getattr(payload, "events", None)
    if events is None and hasattr(payload, "events_json"):
        events = _loads(getattr(payload, "events_json", None), [])
    if isinstance(events, list):
        for ev in events:
            if not isinstance(ev, dict):
                continue
            if ev.get("done"):
                continue
            at = str(ev.get("at") or "")[:10]
            if at:
                candidates.append(at)

    upcoming = sorted(d for d in candidates if d >= today)
    if upcoming:
        return upcoming[0]
    past = sorted((d for d in candidates if d), reverse=True)
    return past[0] if past else ""


def _to_out(row: QiuzhaoApplication) -> dict[str, Any]:
    return {
        "id": row.id,
        "company": row.company or "",
        "role": row.role or "",
        "city": row.city or "",
        "channel": row.channel or "",
        "track": row.track or "",
        "status": row.status or "wishlist",
        "status_label": STATUS_LABELS.get(row.status or "", row.status or ""),
        "priority": row.priority or "normal",
        "applied_at": row.applied_at or "",
        "exam_at": row.exam_at or "",
        "exam_url": row.exam_url or "",
        "exam_done": bool(row.exam_done),
        "exam_result": row.exam_result or "",
        "interview_at": row.interview_at or "",
        "interview_url": row.interview_url or "",
        "interview_done": bool(row.interview_done),
        "interview_round": row.interview_round or "",
        "interview_result": row.interview_result or "",
        "next_action_at": row.next_action_at or "",
        "salary": row.salary or "",
        "jd_url": row.jd_url or "",
        "apply_url": row.apply_url or "",
        "notes": row.notes or "",
        "events": _loads(row.events_json, []),
        "created_at": row.created_at.replace(tzinfo=timezone.utc).isoformat()
        if row.created_at
        else None,
        "updated_at": row.updated_at.replace(tzinfo=timezone.utc).isoformat()
        if row.updated_at
        else None,
    }


def _sync_interview_from_events(payload: QiuzhaoIn) -> None:
    """用面试 events 回填兼容字段（列表摘要用）。"""
    rounds = [
        e
        for e in (payload.events or [])
        if isinstance(e, dict) and e.get("type", "interview") == "interview"
    ]
    if not rounds:
        return
    pending = [r for r in rounds if not r.get("done")]
    pick = (
        sorted(pending, key=lambda r: str(r.get("at") or "9999"))[0]
        if pending
        else rounds[-1]
    )
    payload.interview_round = str(pick.get("round") or payload.interview_round or "")
    payload.interview_at = str(pick.get("at") or "")
    payload.interview_url = str(pick.get("url") or "")
    payload.interview_done = bool(pick.get("done"))
    payload.interview_result = str(pick.get("result") or "")


def _apply_payload(row: QiuzhaoApplication, payload: QiuzhaoIn) -> None:
    status = payload.status if payload.status in STATUSES else "wishlist"
    _sync_interview_from_events(payload)
    row.company = (payload.company or "").strip()
    row.role = (payload.role or "").strip()
    row.city = (payload.city or "").strip()
    row.channel = (payload.channel or "").strip()
    row.track = (payload.track or "").strip()
    row.status = status
    row.priority = payload.priority or "normal"
    row.applied_at = payload.applied_at or ""
    row.exam_at = payload.exam_at or ""
    row.exam_url = payload.exam_url or ""
    row.exam_done = bool(payload.exam_done)
    row.exam_result = payload.exam_result or ""
    row.interview_at = payload.interview_at or ""
    row.interview_url = payload.interview_url or ""
    row.interview_done = bool(payload.interview_done)
    row.interview_round = payload.interview_round or ""
    row.interview_result = payload.interview_result or ""
    row.next_action_at = _auto_next_action(payload)
    row.salary = payload.salary or ""
    row.jd_url = payload.jd_url or ""
    row.apply_url = payload.apply_url or ""
    row.notes = payload.notes or ""
    row.events_json = json.dumps(payload.events or [], ensure_ascii=False)


@router.get("/applications")
def list_applications(
    status: Optional[str] = None,
    q: str = "",
    sort: str = Query("next"),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    query = select(QiuzhaoApplication)
    if status and status in STATUSES:
        query = query.where(QiuzhaoApplication.status == status)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                QiuzhaoApplication.company.like(like),
                QiuzhaoApplication.role.like(like),
                QiuzhaoApplication.city.like(like),
                QiuzhaoApplication.channel.like(like),
                QiuzhaoApplication.track.like(like),
                QiuzhaoApplication.notes.like(like),
            )
        )
    if sort not in ("next", "applied", "updated", "company"):
        sort = "next"
    if sort == "company":
        query = query.order_by(QiuzhaoApplication.company.asc())
    elif sort == "applied":
        query = query.order_by(QiuzhaoApplication.applied_at.desc(), QiuzhaoApplication.id.desc())
    elif sort == "updated":
        query = query.order_by(QiuzhaoApplication.updated_at.desc())
    else:
        # 有 next_action_at 的靠前，空的靠后
        query = query.order_by(
            QiuzhaoApplication.next_action_at.asc(),
            QiuzhaoApplication.id.desc(),
        )
    rows = db.scalars(query).all()
    return [_to_out(r) for r in rows]


@router.get("/stats")
def qiuzhao_stats(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    today = datetime.now(timezone.utc).astimezone().date().isoformat()
    week = _plus_days(today, 7)
    rows = db.scalars(select(QiuzhaoApplication)).all()
    by_status: dict[str, int] = {s: 0 for s in STATUSES}
    upcoming = 0
    overdue = 0
    exam_todo = 0
    interview_todo = 0
    terminal = {"offer", "rejected", "ghosted", "closed"}
    for r in rows:
        st = r.status or "wishlist"
        if st in by_status:
            by_status[st] += 1
        na = (r.next_action_at or "")[:10]
        if na and st not in terminal:
            if na < today:
                overdue += 1
            elif na <= week:
                upcoming += 1
        if (
            (r.exam_at or r.exam_url)
            and not r.exam_done
            and st not in terminal
        ):
            exam_todo += 1
        if (
            (r.interview_at or r.interview_url)
            and not r.interview_done
            and st not in terminal
        ):
            interview_todo += 1

    total = len(rows)
    active = sum(
        by_status[s]
        for s in ("wishlist", "applied", "exam", "interview")
    )
    return {
        "total": total,
        "active": active,
        "by_status": by_status,
        "labels": STATUS_LABELS,
        "upcoming_7d": upcoming,
        "overdue": overdue,
        "exam_todo": exam_todo,
        "interview_todo": interview_todo,
        "offers": by_status.get("offer", 0),
    }


def _plus_days(iso: str, n: int) -> str:
    from datetime import date, timedelta

    d = date.fromisoformat(iso[:10])
    return (d + timedelta(days=n)).isoformat()


@router.post("/applications")
def create_application(
    payload: QiuzhaoIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    if not (payload.company or "").strip():
        raise HTTPException(400, "公司名称必填")
    row = QiuzhaoApplication()
    _apply_payload(row, payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.put("/applications/{app_id}")
def update_application(
    app_id: int,
    payload: QiuzhaoIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    row = db.get(QiuzhaoApplication, app_id)
    if not row:
        raise HTTPException(404, "not found")
    if not (payload.company or "").strip():
        raise HTTPException(400, "公司名称必填")
    _apply_payload(row, payload)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/applications/{app_id}/status")
def patch_status(
    app_id: int,
    payload: StatusIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    if payload.status not in STATUSES:
        raise HTTPException(400, "invalid status")
    row = db.get(QiuzhaoApplication, app_id)
    if not row:
        raise HTTPException(404, "not found")
    row.status = payload.status
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/applications/{app_id}")
def delete_application(
    app_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    row = db.get(QiuzhaoApplication, app_id)
    if not row:
        raise HTTPException(404, "not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/meta")
def qiuzhao_meta(_: Admin = Depends(get_current_admin)):
    return {
        "statuses": [
            {"key": k, "label": STATUS_LABELS[k]} for k in STATUSES
        ],
        "priorities": [
            {"key": "low", "label": "低"},
            {"key": "normal", "label": "普通"},
            {"key": "high", "label": "高"},
            {"key": "urgent", "label": "紧急"},
        ],
        "channels": ["官网", "牛客", "实习僧", "Boss", "内推", "宣讲会", "其他"],
        "tracks": ["后端", "前端", "全栈", "算法", "客户端", "测试", "数据", "其他"],
    }
