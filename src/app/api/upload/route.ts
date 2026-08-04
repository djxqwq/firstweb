import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

const ALLOWED = new Map([
  ["audio/mpeg", "mp3"],
  ["audio/mp3", "mp3"],
  ["audio/ogg", "ogg"],
  ["audio/wav", "wav"],
  ["audio/webm", "webm"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "文件过大（上限 20MB）" }, { status: 400 });
    }

    const ext = ALLOWED.get(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "仅支持 mp3/ogg/wav/webm 音频或 jpg/png/webp/gif 图片" },
        { status: 400 },
      );
    }

    const kind = file.type.startsWith("audio/") ? "audio" : "image";
    const dir = path.join(process.cwd(), "uploads", kind);
    await mkdir(dir, { recursive: true });

    const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buf);

    const url = `/api/media/${kind}/${name}`;
    return NextResponse.json({ url, kind, name, size: file.size });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
