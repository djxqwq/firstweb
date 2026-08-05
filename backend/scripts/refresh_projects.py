# -*- coding: utf-8 -*-
"""Refresh project rows with richer detail + optional links (no forced GitHub)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import SessionLocal, Content, seed_if_empty  # noqa: E402
from sqlalchemy import select, delete  # noqa: E402

PROJECTS = [
    {
        "title": "派陪 · Pepper 机器人智能养老护理",
        "summary": "基于 Uniapp 跨端养老小程序，打通健康数据可视化与 Pepper 机器人集成。",
        "detail": "面向养老场景的跨端小程序：健康数据可视化、陪护提醒与 Pepper 机器人能力集成。\n\n亮点：首屏加载提速约 30%；支撑挑战杯人工智能+专项赛省级铜奖。\n技术：Uniapp · 小程序 · 跨端交互。",
        "tags": ["Uniapp", "小程序", "跨端"],
        "links": {"demo": "https://723539.xyz"},
        "sort_order": 1,
    },
    {
        "title": "基于物联网的养老陪护系统",
        "summary": "Java/Python 后端 + MySQL，多设备健康指标实时同步的养老陪护系统。",
        "detail": "国家级大学生创新创业训练计划项目（核心成员 2/5）。多设备健康指标采集与同步，覆盖陪护场景闭环。\n\n软著登记号：2025R11L3781196。\n技术：Java · Python · MySQL · 物联网。",
        "tags": ["Java", "Python", "MySQL", "物联网"],
        "links": {"docs": "https://blog.csdn.net/2302_79866931"},
        "sort_order": 2,
    },
    {
        "title": "浓烟环境人体目标判别系统",
        "summary": "OpenCV + YOLOv5 火灾救援视觉判别系统，适配 Windows/Ubuntu。",
        "detail": "面向浓烟/火灾救援场景的人体目标判别：单帧处理 ≤100ms，人体识别准确率 ≥80%。\n\n技术：Python · OpenCV · YOLOv5。",
        "tags": ["Python", "OpenCV", "YOLOv5"],
        "links": {},
        "sort_order": 3,
    },
    {
        "title": "全栈开发实践项目",
        "summary": "Vue.js + Spring Boot + MySQL 课程全栈闭环实践。",
        "detail": "从前端交互到后端接口与数据持久化的完整练习项目，沉淀全栈工程化经验。\n\n技术：Vue.js · Spring Boot · MySQL。",
        "tags": ["Vue.js", "Spring Boot", "MySQL"],
        "links": {"github": "https://github.com/djxqwq"},
        "sort_order": 4,
    },
]


def main():
    db = SessionLocal()
    try:
        seed_if_empty(db)
        db.execute(delete(Content).where(Content.type == "project"))
        for p in PROJECTS:
            db.add(
                Content(
                    type="project",
                    title=p["title"],
                    summary=p["summary"],
                    body_json=json.dumps({"detail": p["detail"]}, ensure_ascii=False),
                    tags_json=json.dumps(p["tags"], ensure_ascii=False),
                    links_json=json.dumps(p["links"], ensure_ascii=False),
                    sort_order=p["sort_order"],
                    published=True,
                )
            )
        db.commit()
        rows = db.scalars(select(Content).where(Content.type == "project")).all()
        print("updated projects:", len(rows))
        for r in rows:
            print("-", r.title, r.links_json)
    finally:
        db.close()


if __name__ == "__main__":
    main()
