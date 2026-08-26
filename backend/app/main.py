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
    blocked = Column(Boolean, default=False, index=True)
    proxy = Column(Boolean, default=False)
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


class QiuzhaoApplication(Base):
    """秋招投递记录 —— 仅本人工具使用，不进公开站点。"""

    __tablename__ = "qiuzhao_applications"
    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(128), nullable=False, default="", index=True)
    role = Column(String(128), default="")
    city = Column(String(64), default="")
    channel = Column(String(64), default="")  # 官网 / 牛客 / 内推 …
    track = Column(String(64), default="")  # 后端 / 前端 / 算法 …
    status = Column(String(32), default="wishlist", index=True)
    priority = Column(String(16), default="normal")  # low|normal|high|urgent
    applied_at = Column(String(32), default="")  # YYYY-MM-DD
    exam_at = Column(String(32), default="")
    exam_url = Column(String(512), default="")
    exam_done = Column(Boolean, default=False)
    exam_result = Column(String(16), default="")  # pending|pass|fail|skip|""
    interview_at = Column(String(32), default="")
    interview_url = Column(String(512), default="")
    interview_done = Column(Boolean, default=False)
    interview_round = Column(String(64), default="")
    interview_result = Column(String(16), default="")
    next_action_at = Column(String(32), default="", index=True)
    salary = Column(String(64), default="")
    jd_url = Column(String(512), default="")
    apply_url = Column(String(512), default="")
    notes = Column(Text, default="")
    events_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


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
        "blocked": "BOOLEAN DEFAULT 0",
        "proxy": "BOOLEAN DEFAULT 0",
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
            ("ix_visits_blocked", "blocked"),
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
    3. 去掉 ip_hash 上的唯一约束（否则新备注 ip_hash 为空会互相冲突，导致保存失败）。
    4. 尽量把 ip_hash 改为可空 / 默认空串。
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

        # 刷新列信息
        try:
            inspector = sqlalchemy_inspect(conn)
            cols = {c["name"] for c in inspector.get_columns("visitor_notes")}
            indexes = inspector.get_indexes("visitor_notes")
        except Exception:
            cols = set()
            indexes = []

        # 去掉旧 ip_hash 唯一索引（空值冲突会导致备注写入失败）
        for idx in indexes:
            col_names = list(idx.get("column_names") or [])
            if idx.get("unique") and col_names == ["ip_hash"]:
                name = idx.get("name")
                if not name:
                    continue
                try:
                    conn.execute(sqlalchemy_text(f"DROP INDEX {name} ON visitor_notes"))
                    conn.commit()
                except Exception:
                    conn.rollback()
                    try:
                        conn.execute(sqlalchemy_text(f"DROP INDEX IF EXISTS {name}"))
                        conn.commit()
                    except Exception:
                        conn.rollback()

        # 放宽 ip_hash 约束，避免 INSERT 因 NOT NULL 失败
        if "ip_hash" in cols:
            for ddl in (
                "ALTER TABLE visitor_notes MODIFY ip_hash VARCHAR(64) NULL DEFAULT ''",
                "ALTER TABLE visitor_notes ALTER COLUMN ip_hash DROP NOT NULL",
            ):
                try:
                    conn.execute(sqlalchemy_text(ddl))
                    conn.commit()
                    break
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


def _lookup_visitor_note(
    notes: dict[str, str],
    *,
    key: str = "",
    visitor_id: str = "",
    ip_hash: str = "",
    ip: str = "",
) -> str:
    """按多种可能的绑定键查找备注（visitor_id / hash:ip_hash / 明文 IP）。"""
    candidates = [
        key,
        visitor_id,
        f"hash:{ip_hash}" if ip_hash else "",
        ip,
    ]
    for c in candidates:
        if c and notes.get(c):
            return notes[c]
    return ""


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
_BAD_CITY_NAMES = {"南市", "Unknown", "unknown", "", "内网IP", "保留地址"}

# IP 地理位置内存缓存（避免对同一 IP 重复请求外部 API）
_geo_cache: dict[str, tuple[float, dict]] = {}
_GEO_CACHE_TTL = 3600  # 1 小时


def _norm_region(name: str) -> str:
    name = (name or "").strip()
    if name.endswith("省") and len(name) > 2:
        return name[:-1]
    return name


def _norm_city(name: str) -> str:
    name = (name or "").strip()
    if name in _BAD_CITY_NAMES:
        return ""
    if name.endswith("市") and len(name) > 2:
        return name[:-1]
    return name


def _normalize_district(name: str, city: str = "") -> str:
    """把「富阳」「西湖」等补成区县级；拒绝乡镇当区县。"""
    d = (name or "").strip()
    if not d:
        return ""
    if d.endswith(("镇", "乡", "村")):
        return ""
    if d.endswith(("区", "县", "旗")):
        return d
    if d.endswith("街道"):
        return ""
    # 裸地名：杭州常见区
    if city in ("杭州", "杭州市") and d in {
        "西湖",
        "上城",
        "拱墅",
        "滨江",
        "萧山",
        "余杭",
        "临平",
        "钱塘",
        "富阳",
        "临安",
        "桐庐",
        "淳安",
        "建德",
    }:
        return f"{d}区" if d not in {"桐庐", "淳安", "建德"} else f"{d}县"
    if len(d) <= 4 and not d.endswith(("市", "省")):
        return f"{d}区"
    return ""


def _pick_district(*candidates: str, city: str = "", region: str = "") -> str:
    """从候选里挑更可信的区县：优先「区/县/旗」，绝不回落乡镇。"""
    preferred: list[str] = []
    ban = {city, region, f"{city}市", f"{region}省", ""}
    for raw in candidates:
        d = _normalize_district(raw, city=city)
        if not d or d in ban or len(d) > 12:
            continue
        if d.endswith(("区", "县", "旗")):
            preferred.append(d)
    return preferred[0] if preferred else ""


def _coords_plausible(city: str, lat, lon) -> bool:
    """粗滤明显错城的坐标（如杭州却落到金华一带）。"""
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return False
    boxes = {
        "杭州": (29.85, 30.65, 119.70, 120.70),
        "杭州市": (29.85, 30.65, 119.70, 120.70),
        "北京": (39.4, 41.1, 115.7, 117.5),
        "上海": (30.7, 31.9, 120.8, 122.2),
        "深圳": (22.4, 22.9, 113.7, 114.7),
        "广州": (22.8, 23.5, 113.0, 113.7),
    }
    box = boxes.get(city) or boxes.get(f"{city}市")
    if not box:
        return True
    min_lat, max_lat, min_lon, max_lon = box
    return min_lat <= lat_f <= max_lat and min_lon <= lon_f <= max_lon


def lookup_ip_geo(ip: str) -> dict:
    """查询 IP 地理位置。

    策略：
    1. 国内 IP：pconline 作省市主源（对中国电信宽带更准）；ip-api 作对照
    2. 海外 / 云厂商：ip-api 主源更准
    3. 若 ip-api 城市为脏数据（如「南市」），丢弃其城市与 lat/lon，避免 Nominatim 反查出错误乡镇
    4. 区县优先取「区/县」，不轻易用镇/村
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
    ipapi: dict = {}
    pconline: dict = {}
    ipapi_city_bad = False

    # 1. ip-api.com
    try:
        url = (
            f"http://ip-api.com/json/{ip}"
            "?lang=zh-CN&fields=status,country,regionName,city,district,isp,org,query,lat,lon,proxy,hosting"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("status") == "success":
            raw_city = (data.get("city") or "").strip()
            ipapi_city_bad = raw_city in _BAD_CITY_NAMES
            city = "" if ipapi_city_bad else _norm_city(raw_city)
            ipapi = {
                "country": data.get("country", "") or "",
                "region": _norm_region(data.get("regionName", "") or ""),
                "city": city,
                "district": (data.get("district") or "").strip(),
                "isp": data.get("isp", "") or data.get("org", "") or "",
                # 城市脏数据时坐标也不可信（会导致 Nominatim 反查到错误乡镇）
                "_lat": None if ipapi_city_bad else data.get("lat"),
                "_lon": None if ipapi_city_bad else data.get("lon"),
                "_city_bad": ipapi_city_bad,
                "proxy": bool(data.get("proxy", False)),
                "hosting": bool(data.get("hosting", False)),
            }
    except Exception:
        pass

    # 2. pconline（国内宽带）
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
            pro = _norm_region((data2.get("pro") or "").strip())
            city2 = _norm_city((data2.get("city") or "").strip())
            region2 = (data2.get("region") or "").strip()
            addr = data2.get("addr") or ""
            district_from_addr = ""
            if region2.endswith(("区", "县", "旗", "镇", "街道")):
                district_from_addr = region2
            elif addr:
                addr_clean = addr
                for part in (pro, city2, f"{pro}省", f"{city2}市"):
                    if part:
                        addr_clean = addr_clean.replace(part, "")
                for sp in (
                    "联通", "电信", "移动", "铁通", "长城", "广电", "教育网",
                    "腾讯", "阿里", "华为", "BGP", "数据中心", "IDC", "云",
                ):
                    addr_clean = addr_clean.replace(sp, "")
                addr_clean = addr_clean.strip(" -_/|")
                # 先找区/县，再考虑镇
                m = re.search(r"([\u4e00-\u9fff]{1,8}(?:区|县|旗))", addr_clean)
                if not m:
                    m = re.search(r"([\u4e00-\u9fff]{1,8}(?:镇|街道))", addr_clean)
                if m:
                    district_from_addr = m.group(1)
            isp2 = ""
            if "电信" in addr:
                isp2 = "中国电信"
            elif "联通" in addr:
                isp2 = "中国联通"
            elif "移动" in addr:
                isp2 = "中国移动"
            elif "腾讯" in addr:
                isp2 = "腾讯云"
            pconline = {
                "country": "中国",
                "region": pro,
                "city": city2,
                "district": district_from_addr,
                "isp": isp2,
            }
    except Exception:
        pass

    # 2b. ip9.com.cn —— 国内常能给到区县（area），补 pconline 空白
    ip9: dict = {}
    try:
        url_ip9 = f"https://ip9.com.cn/get?ip={ip}"
        req_ip9 = urllib.request.Request(
            url_ip9,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req_ip9, timeout=4) as resp_ip9:
            data_ip9 = json.loads(resp_ip9.read().decode("utf-8"))
        d9 = (data_ip9 or {}).get("data") or {}
        if data_ip9.get("ret") == 200 and d9:
            city9 = _norm_city((d9.get("city") or "").strip())
            area9 = (d9.get("area") or "").strip()
            lat9 = d9.get("lat")
            lon9 = d9.get("lng") or d9.get("lon")
            ip9 = {
                "country": (d9.get("country") or "中国").strip(),
                "region": _norm_region((d9.get("prov") or "").strip()),
                "city": city9,
                "district": _normalize_district(area9, city=city9),
                "isp": (d9.get("isp") or "").strip(),
                "_lat": float(lat9) if lat9 not in (None, "") else None,
                "_lon": float(lon9) if lon9 not in (None, "") else None,
            }
            if ip9["_lat"] is not None and ip9["_lon"] is not None:
                if not _coords_plausible(city9, ip9["_lat"], ip9["_lon"]):
                    ip9["_lat"] = None
                    ip9["_lon"] = None
    except Exception:
        pass

    # 合并：国内且 pconline 有城市时，优先用 pconline（电信宽带常被 ip-api 标错）
    prefer_pconline = bool(pconline.get("city")) and (
        ipapi_city_bad
        or not ipapi.get("city")
        or (
            pconline.get("city")
            and ipapi.get("city")
            and pconline["city"] != ipapi["city"]
            and ("中国" in (ipapi.get("country") or "") or "China" in (ipapi.get("country") or "") or not ipapi)
        )
    )

    if prefer_pconline:
        city_m = pconline.get("city") or ip9.get("city") or ""
        result = {
            "country": pconline.get("country") or ip9.get("country") or ipapi.get("country") or "中国",
            "region": pconline.get("region") or ip9.get("region") or ipapi.get("region") or "",
            "city": city_m,
            "district": _pick_district(
                pconline.get("district", ""),
                ip9.get("district", ""),
                ipapi.get("district", ""),
                city=city_m,
                region=pconline.get("region") or ip9.get("region") or "",
            ),
            "isp": pconline.get("isp") or ip9.get("isp") or ipapi.get("isp") or "",
            "_lat": None,
            "_lon": None,
        }
        # 坐标：优先可信的 ip9；ip-api 城市与国内源不一致时一律丢弃
        if ip9.get("_lat") is not None and _coords_plausible(city_m, ip9.get("_lat"), ip9.get("_lon")):
            result["_lat"] = ip9.get("_lat")
            result["_lon"] = ip9.get("_lon")
        elif (
            not ipapi_city_bad
            and ipapi.get("city") == city_m
            and _coords_plausible(city_m, ipapi.get("_lat"), ipapi.get("_lon"))
        ):
            result["_lat"] = ipapi.get("_lat")
            result["_lon"] = ipapi.get("_lon")
    else:
        city_m = ipapi.get("city") or pconline.get("city") or ip9.get("city") or ""
        result = {
            "country": ipapi.get("country") or pconline.get("country") or ip9.get("country") or "",
            "region": ipapi.get("region") or pconline.get("region") or ip9.get("region") or "",
            "city": city_m,
            "district": _pick_district(
                ipapi.get("district", ""),
                pconline.get("district", ""),
                ip9.get("district", ""),
                city=city_m,
                region=ipapi.get("region") or pconline.get("region") or "",
            ),
            "isp": ipapi.get("isp") or pconline.get("isp") or ip9.get("isp") or "",
            "_lat": None,
            "_lon": None,
        }
        if ip9.get("_lat") is not None and _coords_plausible(city_m, ip9.get("_lat"), ip9.get("_lon")):
            result["_lat"] = ip9.get("_lat")
            result["_lon"] = ip9.get("_lon")
        elif _coords_plausible(city_m, ipapi.get("_lat"), ipapi.get("_lon")):
            result["_lat"] = ipapi.get("_lat")
            result["_lon"] = ipapi.get("_lon")
        # 仍缺字段时用国内源补
        if not result["city"] and pconline.get("city"):
            result["city"] = pconline["city"]
        if not result["region"] and pconline.get("region"):
            result["region"] = pconline["region"]
        if not result["district"]:
            result["district"] = _pick_district(
                pconline.get("district", ""),
                ip9.get("district", ""),
                city=result.get("city") or "",
                region=result.get("region") or "",
            )
        if not result["isp"] and (pconline.get("isp") or ip9.get("isp")):
            result["isp"] = pconline.get("isp") or ip9.get("isp") or ""
        if not result["country"] and (result["city"] or result["region"]):
            result["country"] = "中国"

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
                    "Nanshi": "",  # 脏数据
                }
                mapped = _EN_CITY_MAP.get(en_city, en_city)
                if mapped:
                    result["city"] = mapped
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

    # 4. Nominatim 区县 —— 仅在坐标可信且尚无「区/县」时使用；忽略乡镇级结果抢占
    has_district_qu = bool(result.get("district")) and str(result["district"]).endswith(
        ("区", "县", "旗")
    )
    if (
        result.get("country")
        and not has_district_qu
        and result.get("_lat") is not None
        and result.get("_lon") is not None
    ):
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
            # 只要区县级，不要 town/village（容易变成「南马镇」这类错误）
            for key in (
                "city_district",
                "suburb",
                "borough",
                "district",
                "county",
            ):
                district_candidate = (addr4.get(key) or "").strip()
                picked = _pick_district(
                    district_candidate,
                    city=result.get("city") or "",
                    region=result.get("region") or "",
                )
                if picked and picked.endswith(("区", "县", "旗")):
                    result["district"] = picked
                    break
        except Exception:
            pass

    # 5. 仍无区县：百度公开接口（失败忽略）
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
            district5 = _pick_district(
                d.get("district") or "",
                d.get("area") or "",
                d.get("city_district") or "",
                city=result.get("city") or "",
                region=result.get("region") or "",
            )
            if district5:
                result["district"] = district5
                if not result.get("city") and d.get("city"):
                    result["city"] = _norm_city(str(d.get("city")))
                if not result.get("region") and d.get("prov"):
                    result["region"] = _norm_region(str(d.get("prov")))
        except Exception:
            pass

    # 最终兜底：只保留区/县/旗
    dist = (result.get("district") or "").strip()
    if dist and not dist.endswith(("区", "县", "旗")):
        result["district"] = ""

    result.pop("_lat", None)
    result.pop("_lon", None)
    result.pop("_city_bad", None)
    # VPN / 代理 / 云主机检测
    result["proxy"] = bool(ipapi.get("proxy", False))
    result["hosting"] = bool(ipapi.get("hosting", False))
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

    # 检测是否为外网/VPN
    geo = lookup_ip_geo(ip)
    is_blocked = not is_china_ip(ip)
    is_proxy = bool(geo.get("proxy", False))

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

    # 解析 UA
    bo = parse_browser_os(ua)
    # 纠正同 IP 历史记录里被 Nominatim 误标的「xx镇」区县
    try:
        city_now = (geo.get("city") or "")[:64]
        district_now = (geo.get("district") or "")[:64]
        if city_now:
            q_fix = db.query(Visit).filter(Visit.ip == ip[:64], Visit.deleted.is_(False))
            for row in q_fix.limit(200).all():
                old_d = (row.district or "").strip()
                if old_d.endswith(("镇", "乡", "村")) and old_d != district_now:
                    row.district = district_now
                    if city_now and (not row.city or row.city != city_now):
                        row.city = city_now
                    if geo.get("region") and not row.region:
                        row.region = geo.get("region", "")[:64]
    except Exception:
        pass
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
            blocked=is_blocked,
            proxy=is_proxy,
        )
    )
    db.commit()
    return {"ok": True, "visitor_id": visitor_id, "blocked": is_blocked}

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
        "proxy": geo.get("proxy", False),
        "hosting": geo.get("hosting", False),
        "device": detect_device(ua),
        "os": bo["os"],
        "browser": bo["browser"],
        "ua": ua,
    }


def is_china_ip(ip: str) -> bool:
    """判断 IP 是否来自中国大陆。

    规则：
    1. 本地/内网 IP → 允许（开发环境）
    2. ip-api 标记为 proxy 或 hosting → 拦截（VPN / 云主机）
    3. country 不是「中国」→ 拦截（境外节点）
    """
    if not ip or ip in ("127.0.0.1", "localhost", "::1", ""):
        return True
    if ip.startswith(("10.", "172.", "192.168.", "169.254.")):
        return True
    geo = lookup_ip_geo(ip)
    if geo.get("proxy") or geo.get("hosting"):
        return False
    country = (geo.get("country") or "").strip()
    return country == "中国" or country == "China"


@app.get("/api/access-check")
def access_check(request: Request):
    """检查访客是否被允许访问站点。

    国内 IP → allowed=True
    国外 / VPN → allowed=False，前端展示拦截动画
    """
    ip = get_client_ip(request)
    geo = lookup_ip_geo(ip)
    allowed = is_china_ip(ip)
    return {
        "allowed": allowed,
        "ip": ip,
        "country": geo.get("country", ""),
        "city": geo.get("city", ""),
        "proxy": geo.get("proxy", False),
        "hosting": geo.get("hosting", False),
        "isp": geo.get("isp", ""),
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


@app.get("/api/admin/visits/blocked")
def admin_blocked_visits(
    limit: int = 200,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """外网/VPN 访问记录。"""
    rows = db.scalars(
        select(Visit)
        .where(Visit.blocked.is_(True), Visit.deleted.is_(False))
        .order_by(Visit.id.desc())
        .limit(min(limit, 1000))
    ).all()
    return [
        {
            "id": r.id,
            "ip": r.ip,
            "country": r.country,
            "city": r.city,
            "isp": r.isp,
            "path": r.path,
            "device": r.device,
            "os": r.os,
            "browser": r.browser,
            "proxy": r.proxy,
            "ua": r.ua,
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
    notes = {
        n.visitor_id: (n.note or "")
        for n in db.scalars(select(VisitorNote)).all()
        if n.visitor_id
    }
    agg: dict[str, dict] = {}
    for r in rows:
        if group_by == "ip":
            # 按 IP 聚合：同一 IP 的所有访问合并
            key = r.ip or (f"hash:{r.ip_hash}" if r.ip_hash else "unknown")
        else:
            # 默认：优先 visitor_id 聚合；旧数据无 visitor_id 时回退 ip_hash
            key = r.visitor_id or (f"hash:{r.ip_hash}" if r.ip_hash else "unknown")
        a = agg.get(key)
        if a is None:
            a = {
                "key": key,
                "visitor_id": r.visitor_id or "",
                "ip_hash": r.ip_hash or "",
                "note": _lookup_visitor_note(
                    notes,
                    key=key,
                    visitor_id=r.visitor_id or "",
                    ip_hash=r.ip_hash or "",
                    ip=r.ip or "",
                ),
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
        elif not a.get("note"):
            # 合并过程中补上备注（同一 IP 下其它 visitor_id 可能有备注）
            a["note"] = _lookup_visitor_note(
                notes,
                key=key,
                visitor_id=r.visitor_id or "",
                ip_hash=r.ip_hash or "",
                ip=r.ip or "",
            )
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
                # 保持 key 稳定；同步展示用的 visitor_id / ip_hash 为最新一条
                if r.visitor_id:
                    a["visitor_id"] = r.visitor_id
                if r.ip_hash:
                    a["ip_hash"] = r.ip_hash
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
        # 历史脏数据：错误坐标反查出来的乡镇不展示
        dist = (a.get("last_district") or "").strip()
        if dist.endswith(("镇", "乡", "村")):
            a["last_district"] = ""
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
    # 优先按 visitor_id 匹配；hash: 前缀按 ip_hash；看起来像 IP 则按 ip 匹配
    if key.startswith("hash:"):
        q = q.where(Visit.ip_hash == key[5:])
    elif ":" in key or key.count(".") == 3 or key.startswith("["):
        # IPv4 / IPv6（含压缩形式粗略判断）
        q = q.where(Visit.ip == key)
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

    key 可以是 visitor_id（新访客）、hash:ip_hash（旧访客）或明文 IP（按 IP 合并模式）。
    """
    key = (key or "").strip()[:64]
    if not key or key == "unknown":
        raise HTTPException(status_code=400, detail="无效的访客 key")
    note = (payload.note or "")[:500]
    existing = db.scalar(select(VisitorNote).where(VisitorNote.visitor_id == key))
    if existing:
        existing.note = note
    else:
        db.add(VisitorNote(visitor_id=key, note=note))
    try:
        db.commit()
    except Exception:
        # 兼容旧表仍要求 ip_hash / 仍有唯一约束的情况
        db.rollback()
        ih = key[5:] if key.startswith("hash:") else ""
        try:
            db.execute(
                sqlalchemy_text(
                    "INSERT INTO visitor_notes (visitor_id, ip_hash, note) "
                    "VALUES (:vid, :ih, :note)"
                ),
                {"vid": key, "ih": ih or key[:64], "note": note},
            )
            db.commit()
        except Exception:
            db.rollback()
            # 已存在则更新
            try:
                db.execute(
                    sqlalchemy_text(
                        "UPDATE visitor_notes SET note = :note "
                        "WHERE visitor_id = :vid OR ip_hash = :ih"
                    ),
                    {"note": note, "vid": key, "ih": ih or key[:64]},
                )
                db.commit()
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"备注保存失败: {e}") from e
    return {"ok": True, "key": key, "note": note}


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
    elif ":" in key or key.count(".") == 3 or key.startswith("["):
        q = q.filter(Visit.ip == key)
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


# ---- Private tools: 秋招 ----
from app.qiuzhao_routes import router as qiuzhao_router  # noqa: E402

app.include_router(qiuzhao_router)
