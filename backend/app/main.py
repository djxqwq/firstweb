"""
FastAPI backend for 邓锦鑫 cyber homepage.
DB: TiDB (MySQL protocol) via DATABASE_URL; falls back to SQLite for local.

Inspired by tiangolo/full-stack-fastapi-template JWT/CRUD patterns.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    Text,
    create_engine,
    func,
    select,
)
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
ADMIN_USER = os.getenv("ADMIN_USER", "1075751918")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "D@1q1q1q1q")

# TiDB example: mysql+pymysql://user:pass@host:4000/blog?charset=utf8mb4
# Local fallback: sqlite under backend/
_DEFAULT_SQLITE = "sqlite:///" + str(
    (Path(__file__).resolve().parent.parent / "data.db").as_posix()
)
DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_SQLITE)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
# TiDB Cloud / MySQL 强制 SSL
if DATABASE_URL.startswith("mysql"):
    import ssl as _ssl
    _ssl_ctx = _ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = _ssl.CERT_NONE
    connect_args = {"ssl": _ssl_ctx}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Content(Base):
    __tablename__ = "contents"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(32), index=True, nullable=False)  # project|education|honor|skill|profile|message
    title = Column(String(255), default="")
    summary = Column(Text, default="")
    body_json = Column(Text, default="{}")
    cover_url = Column(String(512), default="")
    tags_json = Column(Text, default="[]")
    links_json = Column(Text, default="{}")
    sort_order = Column(Integer, default=0)
    published = Column(Boolean, default=True)
    level = Column(Integer, default=0)  # for skills
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Visit(Base):
    __tablename__ = "visits"
    id = Column(Integer, primary_key=True, index=True)
    ip_hash = Column(String(64), default="")
    ua = Column(String(512), default="")
    path = Column(String(255), default="/")
    referrer = Column(String(512), default="")
    device = Column(String(64), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    key = Column(String(64), unique=True, nullable=False)
    value_json = Column(Text, default="{}")


class ProjectClick(Base):
    __tablename__ = "project_clicks"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, index=True)
    count = Column(Integer, default=0)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ContentIn(BaseModel):
    type: str
    title: str = ""
    summary: str = ""
    body_json: dict[str, Any] | list[Any] | str = Field(default_factory=dict)
    cover_url: str = ""
    tags_json: list[Any] | str = Field(default_factory=list)
    links_json: dict[str, Any] | str = Field(default_factory=dict)
    sort_order: int = 0
    published: bool = True
    level: int = 0


class ContentOut(BaseModel):
    id: int
    type: str
    title: str
    summary: str
    body: Any = None
    cover_url: str = ""
    tags: list[Any] = []
    links: dict[str, Any] = {}
    sort_order: int = 0
    published: bool = True
    level: int = 0

    class Config:
        from_attributes = True


class MessageIn(BaseModel):
    name: str = "visitor"
    content: str


class VisitIn(BaseModel):
    path: str = "/"
    referrer: str = ""
    device: str = ""


class SettingsIn(BaseModel):
    effects: dict[str, Any] | None = None
    site_title: str | None = None
    footer: dict[str, Any] | None = None
    music: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_admin(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc
    admin = db.scalar(select(Admin).where(Admin.username == username))
    if not admin:
        raise credentials_exception
    return admin


def _loads(raw: str | None, default: Any):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def content_to_out(row: Content) -> dict:
    return {
        "id": row.id,
        "type": row.type,
        "title": row.title or "",
        "summary": row.summary or "",
        "body": _loads(row.body_json, {}),
        "cover_url": row.cover_url or "",
        "tags": _loads(row.tags_json, []),
        "links": _loads(row.links_json, {}),
        "sort_order": row.sort_order or 0,
        "published": bool(row.published),
        "level": row.level or 0,
    }


def ensure_admin(db: Session) -> None:
    """Create or sync single admin from env (personal site)."""
    admin = db.scalar(select(Admin).where(Admin.username == ADMIN_USER))
    pwd = hash_password(ADMIN_PASSWORD)
    if admin:
        admin.password_hash = pwd
        return
    legacy = db.scalar(select(Admin).where(Admin.username == "admin"))
    if legacy and ADMIN_USER != "admin":
        legacy.username = ADMIN_USER
        legacy.password_hash = pwd
        return
    db.add(Admin(username=ADMIN_USER, password_hash=pwd))


def ensure_skills(db: Session) -> None:
    """Ensure canonical proficiency skills exist (won't overwrite levels)."""
    canonical = [
        ("C/C++", 92, 1),
        ("算法竞赛", 90, 2),
        ("Python", 88, 3),
        ("Java", 82, 4),
        ("Vue/Uniapp", 80, 5),
        ("Spring Boot/FastAPI", 78, 6),
        ("MySQL/TiDB", 76, 7),
        ("OpenCV/YOLO", 74, 8),
    ]
    existing = {
        r.title: r
        for r in db.scalars(select(Content).where(Content.type == "skill")).all()
    }
    for title, level, order in canonical:
        if title in existing:
            continue
        db.add(
            Content(
                type="skill",
                title=title,
                level=level,
                sort_order=order,
                published=True,
            )
        )


def seed_if_empty(db: Session) -> None:
    ensure_admin(db)
    ensure_skills(db)

    if not db.scalar(select(Setting).where(Setting.key == "public")):
        db.add(
            Setting(
                key="public",
                value_json=json.dumps(
                    {
                        "site_title": "个人技术博客",
                        "effects": {
                            "fluid": True,
                            "snake": True,
                            "eggs": True,
                        },
                        "music": {
                            "enabled": True,
                            "volume": 0.4,
                            "tracks": [],
                        },
                        "footer": {
                            "copyright": "邓锦鑫",
                            "icp": "",
                        },
                    },
                    ensure_ascii=False,
                ),
            )
        )

    if db.scalar(select(func.count()).select_from(Content)) == 0:
        seeds = [
            Content(
                type="profile",
                title="邓锦鑫",
                summary="软件工程全栈开发者 | 算法竞赛爱好者",
                body_json=json.dumps(
                    {
                        "name": "邓锦鑫",
                        "role": "软件工程全栈开发者 | 算法竞赛爱好者",
                        "school": "浙江财经大学 · 软件工程",
                        "email": "1075751918@qq.com",
                        "github": "https://github.com/djxqwq",
                        "csdn": "https://blog.csdn.net/2302_79866931",
                        "blog": "https://723539.xyz",
                        "bio": "浙江财经大学软件工程专业学生，专注于全栈开发和人工智能领域。热爱算法竞赛，擅长 C/C++、Python、Java 开发。",
                    },
                    ensure_ascii=False,
                ),
                sort_order=0,
                cover_url="/avatar.jpg",
            ),
            Content(
                type="project",
                title="派陪 · Pepper 机器人智能养老护理",
                summary="Uniapp 跨端养老小程序，健康数据可视化与 Pepper 集成；首屏提速 30%，挑战杯 AI+ 省铜。",
                tags_json=json.dumps(["Uniapp", "小程序", "跨端"], ensure_ascii=False),
                links_json=json.dumps({"github": "https://github.com/djxqwq"}, ensure_ascii=False),
                sort_order=1,
            ),
            Content(
                type="project",
                title="基于物联网的养老陪护系统",
                summary="Java/Python + MySQL，多设备健康指标同步；国家级大创，软著 2025R11L3781196。",
                tags_json=json.dumps(["Java", "Python", "MySQL", "物联网"], ensure_ascii=False),
                links_json=json.dumps({"github": "https://github.com/djxqwq"}, ensure_ascii=False),
                sort_order=2,
            ),
            Content(
                type="project",
                title="浓烟环境人体目标判别系统",
                summary="OpenCV + YOLOv5，单帧 ≤100ms，识别准确率 ≥80%。",
                tags_json=json.dumps(["Python", "OpenCV", "YOLOv5"], ensure_ascii=False),
                links_json=json.dumps({"github": "https://github.com/djxqwq"}, ensure_ascii=False),
                sort_order=3,
            ),
            Content(
                type="project",
                title="全栈开发实践项目",
                summary="Vue.js + Spring Boot + MySQL 课程全栈闭环。",
                tags_json=json.dumps(["Vue.js", "Spring Boot", "MySQL"], ensure_ascii=False),
                links_json=json.dumps({"github": "https://github.com/djxqwq"}, ensure_ascii=False),
                sort_order=4,
            ),
            Content(
                type="education",
                title="浙江财经大学 · 软件工程",
                summary="2023-09 ~ 至今 · GPA 3.77/5.0 · 综测前 10%",
                sort_order=1,
            ),
            Content(
                type="education",
                title="计算机 ACM 协会 · 干事→社长",
                summary="三级培养体系 · 活动 18+ 场 · 覆盖 300+ 人次 · 获奖同比 +40%",
                sort_order=2,
            ),
            Content(type="honor", title="第十六届蓝桥杯 C++ 全国总决赛二等奖 / 省一等奖", sort_order=1),
            Content(type="honor", title="第十五届蓝桥杯 C++ 全国总决赛三等奖 / 省一等奖", sort_order=2),
            Content(type="honor", title="第十届天梯赛全国总决赛团队二等奖", sort_order=3),
            Content(type="honor", title="挑战杯人工智能+专项赛省级铜奖", sort_order=4),
            Content(type="honor", title="国家级大学生创新创业训练计划项目（核心成员 2/5）", sort_order=5),
            Content(type="honor", title="软件著作权：基于物联网的养老陪护系统", sort_order=6),
            Content(type="skill", title="C/C++", level=92, sort_order=1),
            Content(type="skill", title="算法竞赛", level=90, sort_order=2),
            Content(type="skill", title="Python", level=88, sort_order=3),
            Content(type="skill", title="Java", level=82, sort_order=4),
            Content(type="skill", title="Vue/Uniapp", level=80, sort_order=5),
            Content(type="skill", title="Spring Boot/FastAPI", level=78, sort_order=6),
            Content(type="skill", title="MySQL/TiDB", level=76, sort_order=7),
            Content(type="skill", title="OpenCV/YOLO", level=74, sort_order=8),
        ]
        db.add_all(seeds)
    db.commit()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="邓锦鑫个人技术博客 API", version="1.0.0")

# CORS：生产环境从环境变量读取白名单，开发环境允许全部
_cors_env = os.getenv("CORS_ORIGINS", "")
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def on_startup() -> None:
    # MySQL/TiDB: 自动创建数据库（如不存在）
    if DATABASE_URL.startswith("mysql"):
        from sqlalchemy.engine.url import make_url
        url = make_url(DATABASE_URL)
        db_name = url.database or "blog"
        server_url = DATABASE_URL.rsplit(f"/{db_name}", 1)[0] + "/"
        try:
            server_engine = create_engine(server_url, connect_args=connect_args)
            with server_engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}`"))
            server_engine.dispose()
        except Exception as e:
            print(f"[warn] auto-create database failed: {e}")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


# ---- Public ----
@app.get("/api/health")
def health():
    return {"ok": True, "db": DATABASE_URL.split("://")[0]}


@app.get("/api/profile")
def get_profile(db: Session = Depends(get_db)):
    row = db.scalar(
        select(Content).where(Content.type == "profile", Content.published.is_(True))
    )
    if not row:
        return {"name": "邓锦鑫", "role": "软件工程全栈开发者"}
    data = content_to_out(row)
    body = data["body"] if isinstance(data["body"], dict) else {}
    return {
        "name": body.get("name") or row.title,
        "role": body.get("role") or row.summary,
        "school": body.get("school", ""),
        "email": body.get("email", ""),
        "github": body.get("github", ""),
        "csdn": body.get("csdn", ""),
        "blog": body.get("blog", ""),
        "bio": body.get("bio") or row.summary,
        "cover_url": row.cover_url,
    }


def list_by_type(db: Session, type_name: str):
    rows = db.scalars(
        select(Content)
        .where(Content.type == type_name, Content.published.is_(True))
        .order_by(Content.sort_order.asc(), Content.id.asc())
    ).all()
    return [content_to_out(r) for r in rows]


@app.get("/api/projects")
def get_projects(db: Session = Depends(get_db)):
    return list_by_type(db, "project")


@app.get("/api/education")
def get_education(db: Session = Depends(get_db)):
    return list_by_type(db, "education")


@app.get("/api/honors")
def get_honors(db: Session = Depends(get_db)):
    return list_by_type(db, "honor")


@app.get("/api/skills")
def get_skills(db: Session = Depends(get_db)):
    return list_by_type(db, "skill")


@app.get("/api/settings/public")
def get_public_settings(db: Session = Depends(get_db)):
    row = db.scalar(select(Setting).where(Setting.key == "public"))
    return _loads(row.value_json if row else None, {})


@app.post("/api/messages")
def post_message(payload: MessageIn, db: Session = Depends(get_db)):
    db.add(
        Content(
            type="message",
            title=payload.name[:64],
            summary=payload.content[:2000],
            published=False,
            sort_order=0,
        )
    )
    db.commit()
    return {"ok": True}


@app.post("/api/visits")
def post_visit(payload: VisitIn, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else ""
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    ua = (request.headers.get("user-agent") or "")[:512]
    db.add(
        Visit(
            ip_hash=ip_hash,
            ua=ua,
            path=payload.path[:255],
            referrer=payload.referrer[:512],
            device=payload.device[:64],
        )
    )
    db.commit()
    return {"ok": True}


@app.get("/api/visits/stats")
def visit_stats(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(Visit)) or 0
    unique = db.scalar(select(func.count(func.distinct(Visit.ip_hash)))) or 0
    rows = db.execute(
        select(func.date(Visit.created_at), func.count())
        .group_by(func.date(Visit.created_at))
        .order_by(func.date(Visit.created_at).desc())
        .limit(7)
    ).all()
    days = [{"day": str(d), "count": c} for d, c in reversed(rows)]
    device_rows = db.execute(
        select(Visit.device, func.count()).group_by(Visit.device)
    ).all()
    devices = {
        (d or "unknown"): c for d, c in device_rows
    }
    today = datetime.now(timezone.utc).date().isoformat()
    today_count = 0
    for d in days:
        if d["day"] == today or d["day"].startswith(today):
            today_count = d["count"]
            break
    # sqlite date() may return date object string differently
    if today_count == 0 and days:
        # try match last day if it's today locally
        pass
    return {
        "total": total,
        "unique": unique,
        "today": today_count,
        "days": days,
        "devices": devices,
    }


@app.post("/api/projects/{project_id}/click")
def project_click(project_id: int, db: Session = Depends(get_db)):
    row = db.scalar(select(ProjectClick).where(ProjectClick.project_id == project_id))
    if not row:
        row = ProjectClick(project_id=project_id, count=0)
        db.add(row)
    row.count = (row.count or 0) + 1
    db.commit()
    return {"ok": True, "count": row.count}


# ---- Admin auth ----
@app.post("/api/admin/login", response_model=Token)
def admin_login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    admin = db.scalar(select(Admin).where(Admin.username == form_data.username))
    if not admin or not verify_password(form_data.password, admin.password_hash):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    token = create_access_token({"sub": admin.username})
    return {"access_token": token, "token_type": "bearer"}


# ---- Admin CRUD ----
@app.get("/api/admin/contents")
def admin_list_contents(
    type: str | None = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    q = select(Content).order_by(Content.type, Content.sort_order, Content.id)
    if type:
        q = q.where(Content.type == type)
    rows = db.scalars(q).all()
    return [content_to_out(r) for r in rows]


@app.post("/api/admin/contents")
def admin_create_content(
    payload: ContentIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    row = Content(
        type=payload.type,
        title=payload.title,
        summary=payload.summary,
        body_json=json.dumps(payload.body_json, ensure_ascii=False)
        if not isinstance(payload.body_json, str)
        else payload.body_json,
        cover_url=payload.cover_url,
        tags_json=json.dumps(payload.tags_json, ensure_ascii=False)
        if not isinstance(payload.tags_json, str)
        else payload.tags_json,
        links_json=json.dumps(payload.links_json, ensure_ascii=False)
        if not isinstance(payload.links_json, str)
        else payload.links_json,
        sort_order=payload.sort_order,
        published=payload.published,
        level=payload.level,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return content_to_out(row)


@app.put("/api/admin/contents/{content_id}")
def admin_update_content(
    content_id: int,
    payload: ContentIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    row = db.get(Content, content_id)
    if not row:
        raise HTTPException(404, "not found")
    row.type = payload.type
    row.title = payload.title
    row.summary = payload.summary
    row.body_json = (
        json.dumps(payload.body_json, ensure_ascii=False)
        if not isinstance(payload.body_json, str)
        else payload.body_json
    )
    row.cover_url = payload.cover_url
    row.tags_json = (
        json.dumps(payload.tags_json, ensure_ascii=False)
        if not isinstance(payload.tags_json, str)
        else payload.tags_json
    )
    row.links_json = (
        json.dumps(payload.links_json, ensure_ascii=False)
        if not isinstance(payload.links_json, str)
        else payload.links_json
    )
    row.sort_order = payload.sort_order
    row.published = payload.published
    row.level = payload.level
    db.commit()
    db.refresh(row)
    return content_to_out(row)


@app.delete("/api/admin/contents/{content_id}")
def admin_delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    row = db.get(Content, content_id)
    if not row:
        raise HTTPException(404, "not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.post("/api/admin/upload")
async def admin_upload(
    file: UploadFile = File(...),
    _: Admin = Depends(get_current_admin),
):
    raw_name = file.filename or "bin"
    suffix = Path(raw_name).suffix[:16].lower()
    allowed = {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".mp3",
        ".wav",
        ".ogg",
        ".m4a",
        ".webm",
    }
    if suffix and suffix not in allowed:
        raise HTTPException(400, f"unsupported file type: {suffix}")
    name = f"{secrets.token_hex(8)}{suffix or '.bin'}"
    dest = UPLOAD_DIR / name
    content = await file.read()
    # soft limit ~15MB
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(400, "file too large (max 15MB)")
    dest.write_bytes(content)
    return {"url": f"/uploads/{name}", "name": raw_name, "size": len(content)}


@app.get("/api/admin/visits")
def admin_visits(
    limit: int = 100,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    rows = db.scalars(
        select(Visit).order_by(Visit.id.desc()).limit(min(limit, 500))
    ).all()
    return [
        {
            "id": r.id,
            "ip_hash": r.ip_hash,
            "ua": r.ua,
            "path": r.path,
            "referrer": r.referrer,
            "device": r.device,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@app.get("/api/admin/visits/export")
def admin_visits_export(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    rows = db.scalars(select(Visit).order_by(Visit.id.desc()).limit(5000)).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "ip_hash", "path", "device", "referrer", "ua", "created_at"])
    for r in rows:
        writer.writerow(
            [
                r.id,
                r.ip_hash,
                r.path,
                r.device,
                r.referrer,
                r.ua,
                r.created_at.isoformat() if r.created_at else "",
            ]
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=visits.csv"},
    )


@app.get("/api/admin/settings")
def admin_get_settings(
    db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)
):
    row = db.scalar(select(Setting).where(Setting.key == "public"))
    return _loads(row.value_json if row else None, {})


@app.put("/api/admin/settings")
def admin_put_settings(
    payload: SettingsIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    row = db.scalar(select(Setting).where(Setting.key == "public"))
    current = _loads(row.value_json if row else None, {})
    if payload.effects is not None:
        current["effects"] = payload.effects
    if payload.site_title is not None:
        current["site_title"] = payload.site_title
    if payload.footer is not None:
        current["footer"] = payload.footer
    if payload.music is not None:
        current["music"] = payload.music
    if not row:
        row = Setting(key="public", value_json="{}")
        db.add(row)
    row.value_json = json.dumps(current, ensure_ascii=False)
    db.commit()
    return current
