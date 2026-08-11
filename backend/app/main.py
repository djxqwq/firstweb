"""
FastAPI backend for 邓锦鑫 cyber homepage.
DB: TiDB (MySQL protocol) via DATABASE_URL; falls back to SQLite for local.

Inspired by tiangolo/full-stack-fastapi-template JWT/CRUD patterns.
"""
from __future__ import annotations

import re
import csv
import hashlib
import io
import json
import os
import secrets
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
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
    inspect as sqlalchemy_inspect,
    literal_column,
    select,
    text as sqlalchemy_text,
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
    visitor_id = Column(String(64), default="", index=True)
    fingerprint_hash = Column(String(64), default="", index=True)
    ip = Column(String(64), default="")
    country = Column(String(64), default="")
    region = Column(String(64), default="")
    city = Column(String(64), default="")
    district = Column(String(64), default="")
    isp = Column(String(128), default="")
    os = Column(String(64), default="")
    browser = Column(String(64), default="")
    ua = Column(String(512), default="")
    path = Column(String(255), default="/")
    referrer = Column(String(512), default="")
    device = Column(String(64), default="")
    deleted = Column(Boolean, default=False, index=True)
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


class VisitorNote(Base):
    """访客备注 —— 按 visitor_id 打标签/备注，IP 变了备注依然在。"""
    __tablename__ = "visitor_notes"
    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(String(64), unique=True, index=True, nullable=False)
    note = Column(Text, default="")
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class MessageLike(Base):
    """留言点赞 —— 用 ip_hash 防重复点赞。"""
    __tablename__ = "message_likes"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, index=True, nullable=False)
    ip_hash = Column(String(64), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AdminLogin(Base):
    """Admin 登录审计记录 —— 追踪哪些设备登录过后台。"""
    __tablename__ = "admin_logins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), nullable=False)
    ip_hash = Column(String(64), default="")
    ua = Column(String(512), default="")
    device = Column(String(64), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


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


class VisitorNoteIn(BaseModel):
    note: str = ""


class VisitIn(BaseModel):
    path: str = "/"
    referrer: str = ""
    device: str = ""
    visitor_id: str = ""
    fingerprint: str = ""


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
        "created_at": row.created_at.replace(tzinfo=timezone.utc).isoformat()
        if row.created_at
        else None,
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
                        "tagline": "邓锦鑫 · 个人技术博客",
                        "roles": [
                            "全栈开发者 · Full-Stack Engineer",
                            "算法竞赛选手 · Competitive Programmer",
                            "AI / 物联网实践者 · Builder",
                        ],
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

    Base.metadata.create_all(bind=engine, checkfirst=True)
    # 轻量迁移：给已存在的 visits / visitor_notes 表补全新增字段（create_all 不会改已有表）
    _migrate_visits_table(engine)
    _migrate_visitor_notes_table(engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


def _migrate_visits_table(engine) -> None:
    """给 visits 表补全新增列，已存在则跳过。兼容 SQLite/TiDB/MySQL。"""
    cols = {
        "visitor_id": "VARCHAR(64) DEFAULT ''",
        "fingerprint_hash": "VARCHAR(64) DEFAULT ''",
        "ip": "VARCHAR(64) DEFAULT ''",
        "country": "VARCHAR(64) DEFAULT ''",
        "region": "VARCHAR(64) DEFAULT ''",
        "city": "VARCHAR(64) DEFAULT ''",
        "district": "VARCHAR(64) DEFAULT ''",
        "isp": "VARCHAR(128) DEFAULT ''",
        "os": "VARCHAR(64) DEFAULT ''",
        "browser": "VARCHAR(64) DEFAULT ''",
        "deleted": "BOOLEAN DEFAULT 0",
    }
    with engine.connect() as conn:
        # 取现有列名
        try:
            inspector = sqlalchemy_inspect(conn)
            existing = {c["name"] for c in inspector.get_columns("visits")}
        except Exception:
            existing = set()
        for col, ddl in cols.items():
            if col in existing:
                continue
            try:
                conn.execute(
                    sqlalchemy_text(f"ALTER TABLE visits ADD COLUMN {col} {ddl}")
                )
                conn.commit()
            except Exception as e:
                # 字段已存在或其他兼容问题，忽略
                conn.rollback()
        # 给新列建索引（若不存在）
        try:
            inspector = sqlalchemy_inspect(conn)
            idx_existing = {i["name"] for i in inspector.get_indexes("visits")}
        except Exception:
            idx_existing = set()
        for idx_name, col in (
            ("ix_visits_visitor_id", "visitor_id"),
            ("ix_visits_fingerprint_hash", "fingerprint_hash"),
            ("ix_visits_deleted", "deleted"),
        ):
            if idx_name in idx_existing:
                continue
            try:
                conn.execute(
                    sqlalchemy_text(f"CREATE INDEX {idx_name} ON visits ({col})")
                )
                conn.commit()
            except Exception:
                conn.rollback()


def _migrate_visitor_notes_table(engine) -> None:
    """把 visitor_notes 表从 ip_hash 迁移到 visitor_id。

    旧表用 ip_hash 作唯一键；新模型用 visitor_id。这里：
    1. 若表不存在则跳过（create_all 会建新表）。
    2. 若旧表只有 ip_hash 列没有 visitor_id 列，补上 visitor_id 列，
       并把旧 ip_hash 数据转成 'hash:{ip_hash}' 写入 visitor_id，
       这样旧访客（聚合 key 为 hash:ip_hash）的备注仍能匹配上。
    """
    with engine.connect() as conn:
        try:
            inspector = sqlalchemy_inspect(conn)
            cols = {c["name"] for c in inspector.get_columns("visitor_notes")}
        except Exception:
            return  # 表不存在，create_all 会建

        # 补 visitor_id 列（若缺）
        if "visitor_id" not in cols:
            try:
                conn.execute(
                    sqlalchemy_text(
                        "ALTER TABLE visitor_notes ADD COLUMN visitor_id VARCHAR(64) DEFAULT ''"
                    )
                )
                conn.commit()
            except Exception:
                conn.rollback()

            # 把旧 ip_hash 数据迁移到 visitor_id（加 hash: 前缀，跨库兼容写法）
            try:
                rows = conn.execute(
                    sqlalchemy_text(
                        "SELECT ip_hash FROM visitor_notes "
                        "WHERE (visitor_id = '' OR visitor_id IS NULL) "
                        "AND ip_hash IS NOT NULL AND ip_hash != ''"
                    )
                ).fetchall()
                for (ip_hash,) in rows:
                    conn.execute(
                        sqlalchemy_text(
                            "UPDATE visitor_notes SET visitor_id = :vid "
                            "WHERE ip_hash = :ih AND (visitor_id = '' OR visitor_id IS NULL)"
                        ),
                        {"vid": f"hash:{ip_hash}", "ih": ip_hash},
                    )
                conn.commit()
            except Exception:
                conn.rollback()

        # 给 visitor_id 建唯一索引（若不存在）
        try:
            inspector = sqlalchemy_inspect(conn)
            idx_existing = {
                i["name"] for i in inspector.get_indexes("visitor_notes")
            }
        except Exception:
            idx_existing = set()
        if "uq_visitor_notes_visitor_id" not in idx_existing and "ix_visitor_notes_visitor_id" not in idx_existing:
            # MySQL/TiDB 支持 CREATE UNIQUE INDEX IF NOT EXISTS；SQLite 不支持 IF NOT EXISTS，try/except 兜底
            try:
                conn.execute(
                    sqlalchemy_text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS uq_visitor_notes_visitor_id "
                        "ON visitor_notes (visitor_id)"
                    )
                )
                conn.commit()
            except Exception:
                conn.rollback()
                try:
                    conn.execute(
                        sqlalchemy_text(
                            "CREATE UNIQUE INDEX uq_visitor_notes_visitor_id "
                            "ON visitor_notes (visitor_id)"
                        )
                    )
                    conn.commit()
                except Exception:
                    conn.rollback()


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
        return {
            "name": "邓锦鑫",
            "role": "软件工程全栈开发者",
            "tagline": "邓锦鑫 · 个人技术博客",
            "roles": [
                "全栈开发者 · Full-Stack Engineer",
                "算法竞赛选手 · Competitive Programmer",
                "AI / 物联网实践者 · Builder",
            ],
            "bio": "浙江财经大学软件工程专业学生，专注于全栈开发和人工智能领域。热爱算法竞赛，擅长 C/C++、Python、Java 开发，致力于构建优雅、高效的解决方案。",
        }
    data = content_to_out(row)
    body = data["body"] if isinstance(data["body"], dict) else {}
    roles = body.get("roles")
    if isinstance(roles, str):
        roles = [r.strip() for r in roles.replace("\r", "").split("\n") if r.strip()]
    if not isinstance(roles, list) or not roles:
        role_one = body.get("role") or row.summary or ""
        roles = [role_one] if role_one else []
    return {
        "name": body.get("name") or row.title,
        "role": body.get("role") or row.summary,
        "tagline": body.get("tagline") or f"{body.get('name') or row.title or '邓锦鑫'} · 个人技术博客",
        "roles": roles,
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


@app.get("/api/internships")
def get_internships(db: Session = Depends(get_db)):
    return list_by_type(db, "internship")


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
            body_json=json.dumps(
                {"is_admin": False, "reply_to": None}, ensure_ascii=False
            ),
            published=True,
            sort_order=0,
        )
    )
    db.commit()
    return {"ok": True}


@app.get("/api/messages")
def list_messages(
    request: Request,
    db: Session = Depends(get_db),
    page: int = 1,
    size: int = 10,
):
    """公开留言墙：分页 + 树形（主留言含 replies），含点赞数与当前用户点赞状态。"""
    size = min(max(size, 1), 50)
    page = max(page, 1)
    all_rows = db.scalars(
        select(Content)
        .where(Content.type == "message", Content.published.is_(True))
        .order_by(Content.id.desc())
        .limit(500)
    ).all()

    msg_ids = [r.id for r in all_rows]
    # 点赞数
    like_counts: dict[int, int] = {}
    # 当前用户是否点赞
    liked_ids: set[int] = set()
    ip = get_client_ip(request)
    my_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    if msg_ids:
        like_rows = db.execute(
            select(MessageLike.message_id, func.count())
            .where(MessageLike.message_id.in_(msg_ids))
            .group_by(MessageLike.message_id)
        ).all()
        like_counts = {mid: cnt for mid, cnt in like_rows}
        liked_ids = set(
            db.scalars(
                select(MessageLike.message_id).where(
                    MessageLike.message_id.in_(msg_ids),
                    MessageLike.ip_hash == my_hash,
                )
            ).all()
        )

    mains: list[dict] = []
    replies_by_parent: dict[int, list[dict]] = {}
    for r in all_rows:
        body = _loads(r.body_json, {})
        if not isinstance(body, dict):
            body = {}
        item = {
            "id": r.id,
            "name": r.title or "visitor",
            "content": r.summary or "",
            "is_admin": bool(body.get("is_admin", False)),
            "reply_to": body.get("reply_to"),
            "created_at": (r.created_at.isoformat() + "Z")
            if r.created_at
            else None,
            "likes": like_counts.get(r.id, 0),
            "liked": r.id in liked_ids,
        }
        rt = item["reply_to"]
        if rt:
            replies_by_parent.setdefault(rt, []).append(item)
        else:
            mains.append(item)

    total = len(mains)
    start = (page - 1) * size
    page_mains = mains[start : start + size]
    for m in page_mains:
        reps = replies_by_parent.get(m["id"], [])
        reps.sort(key=lambda x: x["id"])
        m["replies"] = reps
    return {
        "items": page_mains,
        "total": total,
        "page": page,
        "size": size,
        "has_more": start + size < total,
    }


@app.post("/api/messages/{message_id}/like")
def like_message(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """点赞 / 取消点赞（同 IP 切换），返回最新点赞数。"""
    ip = get_client_ip(request)
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    existing = db.scalar(
        select(MessageLike).where(
            MessageLike.message_id == message_id,
            MessageLike.ip_hash == ip_hash,
        )
    )
    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        db.add(MessageLike(message_id=message_id, ip_hash=ip_hash))
        db.commit()
        liked = True
    count = (
        db.scalar(
            select(func.count())
            .select_from(MessageLike)
            .where(MessageLike.message_id == message_id)
        )
        or 0
    )
    return {"ok": True, "liked": liked, "likes": count}


@app.post("/api/messages/{message_id}/reply")
def reply_message(
    message_id: int, payload: MessageIn, db: Session = Depends(get_db)
):
    """访客公开回复留言（挂在父留言下，嵌套显示）。"""
    parent = db.get(Content, message_id)
    if not parent or parent.type != "message":
        raise HTTPException(404, "message not found")
    db.add(
        Content(
            type="message",
            title=(payload.name or "visitor")[:64],
            summary=payload.content[:2000],
            body_json=json.dumps(
                {"is_admin": False, "reply_to": message_id}, ensure_ascii=False
            ),
            published=True,
            sort_order=0,
        )
    )
    db.commit()
    return {"ok": True}


class ReplyIn(BaseModel):
    content: str


@app.post("/api/admin/messages/{message_id}/reply")
def admin_reply_message(
    message_id: int,
    payload: ReplyIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """管理员回复留言：创建 is_admin=True 的回复，前台高亮显示。"""
    parent = db.get(Content, message_id)
    if not parent or parent.type != "message":
        raise HTTPException(404, "message not found")
    reply = Content(
        type="message",
        title="博主",
        summary=payload.content[:2000],
        body_json=json.dumps(
            {"is_admin": True, "reply_to": message_id}, ensure_ascii=False
        ),
        published=True,
        sort_order=0,
    )
    db.add(reply)
    db.commit()
    return {"ok": True, "id": reply.id}


def delete_upload_file(url: str | None) -> None:
    """删除 /uploads/ 路径对应的文件以节省存储空间。

    仅处理 /uploads/ 开头的相对路径（用户上传文件），跳过外部 URL 和静态资源。
    删除失败静默忽略，不影响主流程。
    """
    if not url or not url.startswith("/uploads/"):
        return
    try:
        path = UPLOAD_DIR / Path(url).name
        if path.is_file():
            path.unlink()
    except Exception:
        pass


def get_client_ip(request: Request) -> str:
    """提取真实访客 IP（穿透 Nginx 反向代理）。

    优先级：X-Forwarded-For 首段 > X-Real-IP > TCP 直连 IP。
    反代场景下 request.client.host 是代理容器 IP，不可直接用。
    """
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        # X-Forwarded-For: client, proxy1, proxy2 — 取最左边的客户端 IP
        return xff.split(",")[0].strip()
    xri = request.headers.get("x-real-ip", "")
    if xri:
        return xri.strip()
    return request.client.host if request.client else ""


def detect_device(ua: str) -> str:
    """从 User-Agent 推断设备类型。"""
    ua_lower = (ua or "").lower()
    if any(k in ua_lower for k in ("mobile", "android", "iphone", "ipad", "windows phone")):
        return "mobile"
    return "desktop"


# ip-api.com 已知返回错误城市名的列表（这些不是真实城市名）
_BAD_CITY_NAMES = {"南市", "Unknown", "unknown", ""}

# IP 地理位置内存缓存（避免对同一 IP 重复请求外部 API）
_geo_cache: dict[str, tuple[float, dict]] = {}
_GEO_CACHE_TTL = 3600  # 1 小时


def lookup_ip_geo(ip: str) -> dict:
    """查询 IP 地理位置。

    策略（中国云厂商 IP 常被国内库标成北京总部，优先信任 ip-api 节点位置）：
    1. ip-api.com — 城市/省份主源（对腾讯云等 CDN 节点更准）
    2. pconline — 仅补全空字段 / ISP，不覆盖已有准确城市
    3. ipinfo.io — 英文城市补充（仅当城市仍空）
    4. Nominatim — 区县补充

    本地/内网 IP 直接返回空字典。结果缓存 1 小时。
    """
    if not ip or ip in ("127.0.0.1", "localhost", "::1", ""):
        return {}
    if ip.startswith(("10.", "172.", "192.168.", "169.254.")):
        return {}

    now = time.time()
    cached = _geo_cache.get(ip)
    if cached:
        age = now - cached[0]
        ttl = 300 if not (cached[1] or {}).get("district") else _GEO_CACHE_TTL
        if age < ttl:
            return cached[1].copy()

    result: dict = {}

    # 1. ip-api.com — 主源
    try:
        url = (
            f"http://ip-api.com/json/{ip}"
            "?lang=zh-CN&fields=status,country,regionName,city,district,isp,org,query,lat,lon"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("status") == "success":
            city = data.get("city", "") or ""
            if city in _BAD_CITY_NAMES:
                city = ""
            # 去掉常见后缀方便展示
            if city.endswith("市") and len(city) > 2:
                city = city[:-1]
            region = data.get("regionName", "") or ""
            if region.endswith("省") and len(region) > 2:
                region = region[:-1]
            result = {
                "country": data.get("country", ""),
                "region": region,
                "city": city,
                "district": data.get("district", "") or "",
                "isp": data.get("isp", "") or data.get("org", "") or "",
                "_lat": data.get("lat"),
                "_lon": data.get("lon"),
            }
    except Exception:
        pass

    # 2. pconline — 只补空，不覆盖（腾讯云等常被错标北京）
    is_cn = bool(result.get("country")) and (
        "中国" in result["country"] or "China" in result["country"]
    )
    if is_cn or not result:
        try:
            url2 = f"https://whois.pconline.com.cn/ipJson.jsp?ip={ip}&json=true"
            req2 = urllib.request.Request(
                url2,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            )
            with urllib.request.urlopen(req2, timeout=5) as resp2:
                raw = resp2.read().decode("gbk", errors="ignore")
            data2 = json.loads(raw)
            if data2 and not data2.get("err"):
                pro = (data2.get("pro") or "").strip()
                city2 = (data2.get("city") or "").strip()
                region2 = (data2.get("region") or "").strip()
                addr = data2.get("addr") or ""
                if city2.endswith("市") and len(city2) > 2:
                    city2 = city2[:-1]
                if pro.endswith("省") and len(pro) > 2:
                    pro = pro[:-1]
                if pro.endswith("市") and len(pro) > 2:
                    # 直辖市
                    pass

                # 仅当主源缺失时才用 pconline 的省市
                if not result.get("city") and city2:
                    result["city"] = city2
                if not result.get("region") and pro:
                    result["region"] = pro
                if not result.get("country"):
                    result["country"] = "中国"

                if region2 and not result.get("district"):
                    # pconline region 常是「西湖区」这类区县
                    result["district"] = region2.rstrip("市") if region2.endswith("区") or region2.endswith("县") or region2.endswith("旗") else region2
                if not result.get("district") and addr:
                    addr_clean = addr
                    for part in (pro, city2, result.get("city", ""), result.get("region", "")):
                        if part:
                            addr_clean = addr_clean.replace(part, "")
                            addr_clean = addr_clean.replace(part + "市", "")
                            addr_clean = addr_clean.replace(part + "省", "")
                    for sp in (
                        "联通", "电信", "移动", "铁通", "长城", "广电", "教育网",
                        "腾讯", "阿里", "华为", "BGP", "数据中心", "IDC", "云",
                    ):
                        addr_clean = addr_clean.replace(sp, "")
                    addr_clean = addr_clean.strip(" -_/|")
                    m = re.search(
                        r"([\u4e00-\u9fff]{1,8}(?:区|县|旗|镇|街道))",
                        addr_clean,
                    )
                    if m:
                        cand = m.group(1)
                        if cand not in (result.get("city"), result.get("region")):
                            result["district"] = cand
                    elif addr_clean and 2 <= len(addr_clean) <= 10 and (
                        "区" in addr_clean
                        or "县" in addr_clean
                        or "旗" in addr_clean
                        or "镇" in addr_clean
                    ):
                        result["district"] = addr_clean

                if not result.get("isp") and addr:
                    for sp in ("联通", "电信", "移动", "铁通", "长城", "广电"):
                        if sp in addr:
                            result["isp"] = f"中国{sp}"
                            break
                    if not result.get("isp") and "腾讯" in addr:
                        result["isp"] = "腾讯云"
        except Exception:
            pass

    # 3. ipinfo — 仅补空城市
    if result.get("country") and not result.get("city"):
        try:
            url3 = f"https://ipinfo.io/{ip}/json"
            req3 = urllib.request.Request(
                url3, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req3, timeout=5) as resp3:
                data3 = json.loads(resp3.read().decode("utf-8"))
            if data3 and not data3.get("error") and data3.get("city"):
                en_city = data3.get("city", "")
                _EN_CITY_MAP = {
                    "Hangzhou": "杭州",
                    "Beijing": "北京",
                    "Shanghai": "上海",
                    "Shenzhen": "深圳",
                    "Guangzhou": "广州",
                    "Jiaxing": "嘉兴",
                    "Ningbo": "宁波",
                    "Wenzhou": "温州",
                    "Nanjing": "南京",
                    "Suzhou": "苏州",
                    "Chengdu": "成都",
                    "Wuhan": "武汉",
                    "Chongqing": "重庆",
                    "Tianjin": "天津",
                    "Xiamen": "厦门",
                    "Fuzhou": "福州",
                    "Changsha": "长沙",
                    "Dongguan": "东莞",
                    "Foshan": "佛山",
                }
                result["city"] = _EN_CITY_MAP.get(en_city, en_city)
                if not result.get("isp") and data3.get("org"):
                    org = data3.get("org", "")
                    for sp, cn in (
                        ("China Telecom", "中国电信"),
                        ("China Unicom", "中国联通"),
                        ("China Mobile", "中国移动"),
                        ("Tencent", "腾讯云"),
                    ):
                        if sp in org:
                            result["isp"] = cn
                            break
        except Exception:
            pass

    # 4. Nominatim 区县（提高 zoom，优先 suburb/city_district）
    if result.get("country") and not result.get("district") and result.get("_lat"):
        try:
            lat = result["_lat"]
            lon = result["_lon"]
            url4 = (
                f"https://nominatim.openstreetmap.org/reverse"
                f"?format=json&lat={lat}&lon={lon}&zoom=14&addressdetails=1&accept-language=zh-CN"
            )
            req4 = urllib.request.Request(
                url4,
                headers={"User-Agent": "PersonalWebsite/1.0 (geolocation)"},
            )
            with urllib.request.urlopen(req4, timeout=5) as resp4:
                data4 = json.loads(resp4.read().decode("utf-8"))
            addr4 = data4.get("address", {})
            for key in (
                "suburb",
                "city_district",
                "borough",
                "quarter",
                "neighbourhood",
                "town",
                "village",
                "county",
            ):
                district_candidate = (addr4.get(key) or "").strip()
                if not district_candidate:
                    continue
                if district_candidate in (result.get("city"), result.get("region")):
                    continue
                if len(district_candidate) > 12:
                    continue
                result["district"] = district_candidate
                break
        except Exception:
            pass

    # 5. 仍无区县时：用百度地图 IP 定位公开接口补区（失败忽略）
    if (
        result.get("country")
        and not result.get("district")
        and ("中国" in (result.get("country") or "") or "China" in (result.get("country") or ""))
    ):
        try:
            url5 = f"https://qifu-api.baidubce.com/ip/local/geo/v1/district?ip={ip}"
            req5 = urllib.request.Request(
                url5, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req5, timeout=4) as resp5:
                data5 = json.loads(resp5.read().decode("utf-8"))
            d = (data5.get("data") or {}) if isinstance(data5, dict) else {}
            district5 = (
                (d.get("district") or d.get("area") or d.get("city_district") or "")
            ).strip()
            if district5 and district5 not in (result.get("city"), result.get("region")):
                result["district"] = district5
                if not result.get("city") and d.get("city"):
                    city5 = str(d.get("city")).replace("市", "")
                    result["city"] = city5
                if not result.get("region") and d.get("prov"):
                    result["region"] = str(d.get("prov")).replace("省", "")
        except Exception:
            pass

    result.pop("_lat", None)
    result.pop("_lon", None)
    _geo_cache[ip] = (now, result.copy())
    return result


def parse_browser_os(ua: str) -> dict:
    """从 User-Agent 字符串解析浏览器和操作系统。"""
    ua = ua or ""
    # 操作系统
    os_name = "未知"
    if "Windows NT 10" in ua:
        os_name = "Windows 10/11"
    elif "Windows NT 6.3" in ua:
        os_name = "Windows 8.1"
    elif "Windows NT 6.1" in ua:
        os_name = "Windows 7"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        os_name = "macOS"
    elif "Android" in ua:
        # 尝试提取版本号
        ver = ""
        if "Android " in ua:
            ver = ua.split("Android ")[1].split(";")[0].strip()
        os_name = f"Android{(' ' + ver) if ver else ''}"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Linux" in ua:
        os_name = "Linux"

    # 浏览器（注意顺序：Edge/Opera 要在 Chrome 前判断）
    browser = "未知"
    if "Edg/" in ua:
        browser = "Edge"
    elif "OPR/" in ua or "Opera" in ua:
        browser = "Opera"
    elif "Chrome/" in ua and "Chromium" not in ua:
        browser = "Chrome"
    elif "Firefox/" in ua:
        browser = "Firefox"
    elif "Safari/" in ua and "Chrome" not in ua:
        browser = "Safari"
    elif "MSIE" in ua or "Trident/" in ua:
        browser = "IE"

    return {"os": os_name, "browser": browser}


# 同 IP + 同路径的去重窗口（秒）：窗口内重复访问不重复记录
VISIT_DEDUP_SECONDS = 300


@app.post("/api/visits")
def post_visit(payload: VisitIn, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    ua = (request.headers.get("user-agent") or "")[:512]
    path = payload.path[:255]
    visitor_id = (payload.visitor_id or "").strip()[:64]

    # 计算浏览器指纹哈希（不含 IP，这样换 VPN/IP 时仍能辅助识别）
    fp_raw = (payload.fingerprint or ua).strip()
    fingerprint_hash = (
        hashlib.sha256(fp_raw.encode()).hexdigest()[:16] if fp_raw else ""
    )

    # 访客 ID 持久化策略：
    # 1) 前端 localStorage + Cookie 双写 UUID（主）
    # 2) 若 UUID 丢失/重生：同 IP + 同指纹 → 收回旧 ID（同设备同网络）
    # 3) 跨 IP：同指纹且 14 天内有访问 → 收回旧 ID（同设备换网络）
    # 避免「仅指纹全局匹配」误把两台同型号电脑合并成一人
    if visitor_id and fingerprint_hash:
        existing = db.scalar(
            select(Visit.visitor_id)
            .where(
                Visit.fingerprint_hash == fingerprint_hash,
                Visit.ip_hash == ip_hash,
                Visit.visitor_id != "",
                Visit.visitor_id != visitor_id,
            )
            .order_by(Visit.id.desc())
            .limit(1)
        )
        if existing:
            visitor_id = existing
        else:
            recent = datetime.now(timezone.utc) - timedelta(days=14)
            existing2 = db.scalar(
                select(Visit.visitor_id)
                .where(
                    Visit.fingerprint_hash == fingerprint_hash,
                    Visit.visitor_id != "",
                    Visit.visitor_id != visitor_id,
                    Visit.created_at >= recent,
                )
                .order_by(Visit.id.desc())
                .limit(1)
            )
            if existing2:
                visitor_id = existing2
    elif not visitor_id and fingerprint_hash:
        # 前端没带 ID：尽量用同 IP+指纹找回
        recovered = db.scalar(
            select(Visit.visitor_id)
            .where(
                Visit.fingerprint_hash == fingerprint_hash,
                Visit.ip_hash == ip_hash,
                Visit.visitor_id != "",
            )
            .order_by(Visit.id.desc())
            .limit(1)
        )
        if recovered:
            visitor_id = recovered

    # 去重：同一 visitor_id（或回退到 ip_hash）+ 同路径在窗口内已记录过则跳过
    dedup_key = visitor_id or ip_hash
    threshold = datetime.now(timezone.utc) - timedelta(seconds=VISIT_DEDUP_SECONDS)
    already = db.scalar(
        select(Visit.id).where(
            Visit.visitor_id == dedup_key if visitor_id else Visit.ip_hash == ip_hash,
            Visit.path == path,
            Visit.created_at >= threshold,
        ).limit(1)
    )
    if already:
        return {"ok": True, "dedup": True, "visitor_id": visitor_id}

    # 查询地理信息 + 解析 UA，存完整访客信息
    geo = lookup_ip_geo(ip)
    bo = parse_browser_os(ua)
    db.add(
        Visit(
            ip_hash=ip_hash,
            visitor_id=visitor_id,
            fingerprint_hash=fingerprint_hash,
            ip=ip[:64],
            country=geo.get("country", "")[:64],
            region=geo.get("region", "")[:64],
            city=geo.get("city", "")[:64],
            district=geo.get("district", "")[:64],
            isp=geo.get("isp", "")[:128],
            os=bo["os"][:64],
            browser=bo["browser"][:64],
            ua=ua,
            path=path,
            referrer=payload.referrer[:512],
            device=payload.device[:64] or detect_device(ua),
        )
    )
    db.commit()
    return {"ok": True, "visitor_id": visitor_id}

def _visit_day_expr():
    """日历日（Asia/Shanghai）。created_at 按 UTC naive 存储。"""
    if DATABASE_URL.startswith("sqlite"):
        return func.date(
            func.datetime(Visit.created_at, literal_column("'+8 hours'"))
        )
    # MySQL / TiDB
    return func.date(func.convert_tz(Visit.created_at, "+00:00", "+08:00"))


def _today_shanghai() -> str:
    return datetime.now(timezone.utc).astimezone(
        timezone(timedelta(hours=8))
    ).date().isoformat()


@app.get("/api/visits/stats")
def visit_stats(days: int = 180, db: Session = Depends(get_db)):
    # 总数统计不加 deleted 过滤 → 删除记录不影响历史累计总数
    days = min(max(int(days or 180), 1), 730)
    total = db.scalar(select(func.count()).select_from(Visit)) or 0
    unique = db.scalar(
        select(func.count(func.distinct(Visit.visitor_id))).where(
            Visit.visitor_id != ""
        )
    ) or 0
    day_col = _visit_day_expr()
    # 热力图按「未软删除」计，与按日筛选列表一致；unique = 当天独立访客数
    identity = func.coalesce(
        func.nullif(Visit.visitor_id, ""),
        Visit.ip_hash,
    )
    rows = db.execute(
        select(day_col, func.count(), func.count(func.distinct(identity)))
        .where(Visit.deleted.is_(False))
        .group_by(day_col)
        .order_by(day_col.desc())
        .limit(days)
    ).all()
    day_list = [
        {"day": str(d), "count": int(c or 0), "unique": int(u or 0)}
        for d, c, u in reversed(rows)
        if d is not None
    ]
    device_rows = db.execute(
        select(Visit.device, func.count())
        .where(Visit.deleted.is_(False))
        .group_by(Visit.device)
    ).all()
    devices = {(d or "unknown"): c for d, c in device_rows}
    today = _today_shanghai()
    today_count = 0
    today_unique = 0
    for d in day_list:
        key = str(d["day"])[:10]
        if key == today:
            today_count = d["count"]
            today_unique = d["unique"]
            break
    return {
        "total": total,
        "unique": unique,
        "today": today_count,
        "today_unique": today_unique,
        "days": day_list,
        "devices": devices,
    }


@app.get("/api/visits/myinfo")
def visit_myinfo(request: Request):
    """返回访客自己的 IP、地区、设备、浏览器、操作系统等信息。

    公开接口，无需鉴权。访客可在前端看到自己的访问身份。
    """
    ip = get_client_ip(request)
    ua = (request.headers.get("user-agent") or "")[:512]
    geo = lookup_ip_geo(ip)
    bo = parse_browser_os(ua)
    return {
        "ip": ip,
        "country": geo.get("country", ""),
        "region": geo.get("region", ""),
        "city": geo.get("city", ""),
        "district": geo.get("district", ""),
        "isp": geo.get("isp", ""),
        "device": detect_device(ua),
        "os": bo["os"],
        "browser": bo["browser"],
        "ua": ua,
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
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    admin = db.scalar(select(Admin).where(Admin.username == form_data.username))
    if not admin or not verify_password(form_data.password, admin.password_hash):
        raise HTTPException(status_code=400, detail="用户名或密码错误")

    # 记录登录设备审计日志
    ip = get_client_ip(request)
    ua = (request.headers.get("user-agent") or "")[:512]
    db.add(
        AdminLogin(
            username=admin.username,
            ip_hash=hashlib.sha256(ip.encode()).hexdigest()[:16],
            ua=ua,
            device=detect_device(ua),
        )
    )
    db.commit()

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
    old_cover = row.cover_url or ""  # 记录旧封面，提交后清理
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
    # 封面更换且旧封面是上传文件时，删除旧文件节省空间
    if old_cover and old_cover != payload.cover_url:
        delete_upload_file(old_cover)
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
    cover = row.cover_url or ""  # 删除内容前记录封面，提交后清理文件
    # 如果是留言，同时删除其所有回复和点赞记录
    if row.type == "message":
        _delete_message_replies(db, content_id)
        db.execute(
            sqlalchemy_text(
                "DELETE FROM message_likes WHERE message_id = :mid"
            ),
            {"mid": content_id},
        )
    db.delete(row)
    db.commit()
    delete_upload_file(cover)
    return {"ok": True}


def _delete_message_replies(db: Session, parent_id: int) -> None:
    """删除指定留言的所有回复（递归删除子回复），同时清理点赞记录。"""
    replies = db.scalars(
        select(Content).where(
            Content.type == "message",
            Content.body_json.like(f'%"reply_to": {parent_id}%'),
        )
    ).all()
    for rep in replies:
        _delete_message_replies(db, rep.id)
        db.execute(
            sqlalchemy_text(
                "DELETE FROM message_likes WHERE message_id = :mid"
            ),
            {"mid": rep.id},
        )
        db.delete(rep)


class BatchDeleteIn(BaseModel):
    ids: list[int]


@app.post("/api/admin/messages/batch-delete")
def admin_batch_delete_messages(
    payload: BatchDeleteIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """批量删除留言（含关联回复和点赞记录）。"""
    if not payload.ids:
        return {"ok": True, "deleted": 0}
    deleted = 0
    for mid in payload.ids:
        row = db.get(Content, mid)
        if not row or row.type != "message":
            continue
        # 删除该留言的回复
        _delete_message_replies(db, mid)
        # 删除关联的点赞记录
        db.execute(
            sqlalchemy_text("DELETE FROM message_likes WHERE message_id = :mid"),
            {"mid": mid},
        )
        db.delete(row)
        deleted += 1
    db.commit()
    return {"ok": True, "deleted": deleted}


@app.post("/api/admin/upload")
async def admin_upload(
    file: UploadFile = File(...),
    old_url: str | None = Form(None),
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
    # 新文件保存成功后，删除旧文件以节省空间
    delete_upload_file(old_url)
    return {"url": f"/uploads/{name}", "name": raw_name, "size": len(content)}


class DeleteFileIn(BaseModel):
    url: str


@app.post("/api/admin/uploads/delete")
def admin_delete_upload(
    payload: DeleteFileIn,
    _: Admin = Depends(get_current_admin),
):
    """删除 /uploads/ 下的指定文件（音乐、封面等）。"""
    delete_upload_file(payload.url)
    return {"ok": True}


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
            # 数据库存的是 UTC，但 DateTime 列不保留时区；取出后补上 UTC 标记，
            # 前端 new Date() 即可自动转为浏览器本地时区显示。
            "created_at": r.created_at.replace(tzinfo=timezone.utc).isoformat()
            if r.created_at
            else None,
        }
        for r in rows
    ]


@app.get("/api/admin/visitors")
def admin_visitors(
    group_by: str = "visitor_id",
    day: str | None = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """聚合访客列表。

    group_by=visitor_id（默认）：按浏览器 visitor_id 聚合，同一人即使 IP 变了也归为一条。
    group_by=ip：按 IP 聚合，同一 IP 下不同浏览器/设备也合并为一条，
                 适合「同一台电脑换了浏览器却被当成两个人」的场景。
    day=YYYY-MM-DD：只聚合该日（Asia/Shanghai）有访问的访客。

    只统计未被软删除的记录；返回最新一条记录的完整访客信息。
    总访问数请看 /api/visits/stats（不受软删除影响）。
    """
    q = select(Visit).where(Visit.deleted.is_(False))
    if day:
        day = day.strip()[:10]
        # 简单校验 YYYY-MM-DD
        try:
            datetime.strptime(day, "%Y-%m-%d")
        except ValueError:
            day = None
        if day:
            q = q.where(_visit_day_expr() == day)
    rows = db.scalars(q.order_by(Visit.id.desc()).limit(5000)).all()
    notes = {n.visitor_id: n.note for n in db.scalars(select(VisitorNote)).all()}
    agg: dict[str, dict] = {}
    for r in rows:
        if group_by == "ip":
            # 按 IP 聚合：同一 IP 的所有访问合并
            key = r.ip or f"hash:{r.ip_hash}" or "unknown"
        else:
            # 默认：优先 visitor_id 聚合；旧数据无 visitor_id 时回退 ip_hash
            key = r.visitor_id or f"hash:{r.ip_hash}" or "unknown"
        a = agg.get(key)
        if a is None:
            a = {
                "visitor_id": r.visitor_id or "",
                "ip_hash": r.ip_hash or "",
                "note": notes.get(key, "") or notes.get(r.visitor_id or "", ""),
                "count": 0,
                "first_at": r.created_at,
                "last_at": r.created_at,
                # 最新一条的完整访客信息
                "last_ip": r.ip or "",
                "last_country": r.country or "",
                "last_region": r.region or "",
                "last_city": r.city or "",
                "last_district": r.district or "",
                "last_isp": r.isp or "",
                "last_os": r.os or "",
                "last_browser": r.browser or "",
                "last_device": r.device,
                "last_path": r.path,
                "last_referrer": r.referrer,
                "last_ua": r.ua,
                # 按 IP 合并时记录子访客数
                "sub_visitors": set(),
            }
            agg[key] = a
        a["count"] += 1
        if group_by == "ip" and r.visitor_id:
            a["sub_visitors"].add(r.visitor_id)
        if r.created_at:
            if a["first_at"] is None or r.created_at < a["first_at"]:
                a["first_at"] = r.created_at
            if r.created_at > a["last_at"]:
                a["last_at"] = r.created_at
                a["last_ip"] = r.ip or ""
                a["last_country"] = r.country or ""
                a["last_region"] = r.region or ""
                a["last_city"] = r.city or ""
                a["last_district"] = r.district or ""
                a["last_isp"] = r.isp or ""
                a["last_os"] = r.os or ""
                a["last_browser"] = r.browser or ""
                a["last_device"] = r.device
                a["last_path"] = r.path
                a["last_referrer"] = r.referrer
                a["last_ua"] = r.ua
    result = list(agg.values())
    result.sort(key=lambda x: x["last_at"] or datetime.min, reverse=True)
    for a in result:
        a["first_at"] = (
            a["first_at"].replace(tzinfo=timezone.utc).isoformat()
            if a["first_at"]
            else None
        )
        a["last_at"] = (
            a["last_at"].replace(tzinfo=timezone.utc).isoformat()
            if a["last_at"]
            else None
        )
        # set 不可 JSON 序列化，转为计数
        a["sub_visitor_count"] = len(a.pop("sub_visitors", set()))
    return result


@app.get("/api/admin/visitors/{key}/records")
def admin_visitor_records(
    key: str,
    limit: int = 500,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """查看某个访客的所有访问记录（按时间倒序）。

    key 可以是 visitor_id（优先）或回退到 ip_hash。只返回未软删除的记录。
    """
    q = select(Visit).where(Visit.deleted.is_(False))
    # 优先按 visitor_id 匹配；若 key 以 hash: 前缀开头则按 ip_hash 匹配
    if key.startswith("hash:"):
        q = q.where(Visit.ip_hash == key[5:])
    else:
        q = q.where(Visit.visitor_id == key)
    rows = db.scalars(q.order_by(Visit.id.desc()).limit(min(max(limit, 1), 2000))).all()
    return [
        {
            "id": r.id,
            "ip": r.ip or "",
            "country": r.country or "",
            "region": r.region or "",
            "city": r.city or "",
            "district": r.district or "",
            "isp": r.isp or "",
            "os": r.os or "",
            "browser": r.browser or "",
            "ua": r.ua,
            "path": r.path,
            "referrer": r.referrer,
            "device": r.device,
            "created_at": r.created_at.replace(tzinfo=timezone.utc).isoformat()
            if r.created_at
            else None,
        }
        for r in rows
    ]


@app.put("/api/admin/visitors/{key}/note")
def admin_visitor_note(
    key: str,
    payload: VisitorNoteIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """给某个访客设置备注。

    key 可以是 visitor_id（新访客）或 hash:ip_hash（旧访客，无 visitor_id）。
    备注按 key 绑定：新访客 IP 变了备注仍在；旧访客备注绑定到 hash:ip_hash。
    """
    existing = db.scalar(select(VisitorNote).where(VisitorNote.visitor_id == key))
    if existing:
        existing.note = payload.note[:500]
    else:
        db.add(VisitorNote(visitor_id=key, note=payload.note[:500]))
    db.commit()
    return {"ok": True}


@app.delete("/api/admin/visits/{visit_id}")
def admin_visit_delete(
    visit_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """软删除单条访问记录——总数统计不变，只是从列表/详情里隐藏。"""
    row = db.scalar(select(Visit).where(Visit.id == visit_id))
    if not row:
        return {"ok": False, "msg": "记录不存在"}
    row.deleted = True
    db.commit()
    return {"ok": True}


@app.delete("/api/admin/visitors/{key}/records")
def admin_visitor_records_clear(
    key: str,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """软删除某个访客的全部访问记录——总数统计不变，该访客从聚合列表消失。

    备注保留；下次该访客再访问会重新出现。
    """
    q = db.query(Visit).filter(Visit.deleted.is_(False))
    if key.startswith("hash:"):
        q = q.filter(Visit.ip_hash == key[5:])
    else:
        q = q.filter(Visit.visitor_id == key)
    q.update({Visit.deleted: True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@app.get("/api/admin/login-records")
def admin_login_records(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Admin 登录审计：查看哪些设备/IP 登录过后台。"""
    rows = db.scalars(
        select(AdminLogin).order_by(AdminLogin.id.desc()).limit(min(limit, 500))
    ).all()
    return [
        {
            "id": r.id,
            "username": r.username,
            "ip_hash": r.ip_hash,
            "ua": r.ua,
            "device": r.device,
            "created_at": r.created_at.replace(tzinfo=timezone.utc).isoformat()
            if r.created_at
            else None,
        }
        for r in rows
    ]


@app.delete("/api/admin/login-records")
def admin_login_records_clear(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """清空登录审计记录。"""
    db.query(AdminLogin).delete()
    db.commit()
    return {"ok": True}


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
