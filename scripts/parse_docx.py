# -*- coding: utf-8 -*-
"""
方剂学 docx → formulas.json 一次性解析脚本（行组归并版，纯标准库，容错）
用法: python scripts/parse_docx.py
输入: ../方剂学（表格汇总）1794232393.docx
输出: public/data/formulas.json + docs/解析报告.md

结构: 文档正文为若干表格。一行 1 格 = 章/节标题；一行 4 格 = 方剂内容
（格0 方名《出处》 / 格1 组成【君臣佐使】 / 格2 功用主治 / 格3 歌诀注意用法）。
难点: 一首方剂跨页时被拆成连续多行，且方名/出处因垂直居中出现在中间行。
策略: 按"行组"归并——新组的判定: 再次出现【君】、或出现新的方名片段。
"""
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
DOCX = ROOT.parent / "方剂学（表格汇总）1794232393.docx"
OUT_JSON = ROOT / "public" / "data" / "formulas.json"
OUT_REPORT = ROOT / "docs" / "解析报告.md"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
ROLES = {"君", "臣", "佐", "佐使", "使"}
CN_NUM = "一二三四五六七八九十"
TEXT_MAP = {"功用": "function", "主治": "indication", "歌诀": "verse", "注意": "note", "用法": "usage"}


def elem_text(el) -> str:
    parts = []
    for p in el.iter(W + "p"):
        seg = "".join(t.text or "" for t in p.iter(W + "t"))
        parts.append(seg)
    return "\n".join(parts).strip()


def parse_fields(text: str):
    """含【标签】文本 → [(标签, 内容)]；无标签续段标记为 '_text'"""
    fields = []
    current = None
    for seg in re.split(r"(【[^】]+】)", text):
        seg = seg.strip()
        if not seg:
            continue
        m = re.match(r"^【(.+?)】$", seg)
        if m:
            current = [m.group(1).strip(), ""]
            fields.append(current)
        elif current is not None:
            current[1] += seg.replace("\n", "")
        else:
            fields.append(["_text", seg.replace("\n", "")])
    return fields


def main():
    if not DOCX.exists():
        print(f"找不到源文件: {DOCX}", file=sys.stderr)
        sys.exit(1)

    with zipfile.ZipFile(DOCX) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find(W + "body")

    chapters = []
    chapter = None
    section = ""
    anomalies = []
    group = None              # 当前行组
    last_field_by_cell = {}   # 格位 → 最近文本字段（接无标签续文）

    def add_header(line: str) -> bool:
        nonlocal chapter, section
        m = re.match(rf"^第([{CN_NUM}]+)章\s*(.+)", line)
        if m:
            chapter = {"name": m.group(2).strip(), "formulas": []}
            chapters.append(chapter)
            section = ""
            return True
        m = re.match(rf"^([{CN_NUM}]+)、\s*(.+)", line)
        if m and chapter is not None:
            section = m.group(2).strip()
            return True
        return False

    def flush():
        nonlocal group
        if group is None:
            return
        blob = "".join(group["c0frags"])
        m = re.match(r"^(.*?)《(.+?)》", blob)
        if m:
            name, source = m.group(1).strip(), m.group(2).strip()
        else:
            name, source = blob.replace("《", "").replace("》", "").strip(), ""
            if "《" in blob or "》" in blob:
                mm = re.search(r"《(.*)", blob)
                if mm and not name:
                    name = blob.split("《")[0].strip()
                source = (mm.group(1) if mm else "").strip("》 ").strip()
        # 全组无标签（附方）：按格位归派 格1→歌诀 格2→功用 格3→主治；否则并入注意
        has_tags = bool(group["composition"] or group["function"] or group["verse"]
                        or group["indication"] or group["usage"])
        pos_map = {1: "verse", 2: "function", 3: "indication"}
        for pos, text in group["pending"].items():
            if not text:
                continue
            if has_tags:
                group["note"] = (group["note"] or "") + text
            else:
                key = pos_map.get(pos, "note")
                group[key] = (group[key] or "") + text

        f = {
            "name": name, "source": source, "section": group["section"],
            "composition": group["composition"],
            "function": group["function"], "indication": group["indication"],
            "verse": group["verse"], "note": group["note"], "usage": group["usage"],
        }
        if not f["name"]:
            anomalies.append(f"行组缺方名（{f['section'] or '?'}）: 组成{len(f['composition'])}项")
        elif chapter is None:
            anomalies.append(f"方剂出现在任何章节之前: {f['name']}")
        else:
            chapter["formulas"].append(f)
        group = None

    def new_group():
        nonlocal group
        flush()
        group = {
            "section": section, "c0frags": [], "has_jun": False, "has_name": False,
            "composition": [], "function": None, "indication": None,
            "verse": None, "note": None, "usage": None, "pending": {},
        }
        last_field_by_cell.clear()

    def merge_cells(cells):
        for pos, cell in enumerate(cells, start=1):
            if not cell:
                continue
            if "【君】" in cell:
                group["has_jun"] = True
            for tag, content in parse_fields(cell):
                if tag in ROLES:
                    group["composition"].append({"role": tag, "herbs": content})
                    last_field_by_cell[pos] = "_role"
                elif tag in TEXT_MAP:
                    key = TEXT_MAP[tag]
                    group[key] = (group[key] or "") + content
                    last_field_by_cell[pos] = key
                elif content:
                    key = last_field_by_cell.get(pos)
                    if key == "_role" and group["composition"]:
                        # 药名跨行：接到上一个角色
                        group["composition"][-1]["herbs"] += content
                    elif key and key != "_role":
                        group[key] = (group[key] or "") + content
                    else:
                        # 无标签暂存，flush 时决定归派
                        group["pending"][pos] = group["pending"].get(pos, "") + content

    def c0_kind(c0: str) -> str:
        """格0 片段分类: name / source / empty"""
        if not c0:
            return "empty"
        blob = "".join(group["c0frags"]) if group else ""
        if "《" in blob and "》" not in blob:
            return "source"   # 出处未闭合，继续接（如 '剂局方》'）
        if c0.startswith("《"):
            return "source"
        return "name"

    def add_row(cells):
        c0 = cells[0].replace("\n", "").strip()
        rest = cells[1:4]
        kind = c0_kind(c0)
        has_jun_row = any("【君】" in c for c in rest)

        need_new = False
        if group is None:
            need_new = True
        elif kind == "name" and group["has_name"]:
            need_new = True
        elif has_jun_row and group["has_jun"]:
            need_new = True

        if need_new:
            new_group()
        if kind == "name":
            group["has_name"] = True
        if c0:
            group["c0frags"].append(c0)
        merge_cells(rest)

    for child in body:
        if child.tag == W + "p":
            line = elem_text(child)
            if line:
                flush()
                add_header(line)
        elif child.tag == W + "tbl":
            for tr in child.findall(W + "tr"):
                cells = [elem_text(tc) for tc in tr.findall(W + "tc")]
                if len(cells) == 1:
                    line = cells[0].replace("\n", "").strip()
                    if line:
                        flush()
                        add_header(line)
                elif len(cells) >= 4:
                    add_row(cells[:4])
                elif len(cells) in (2, 3):
                    anomalies.append(f"非常规行（{len(cells)} 格）: {cells[0][:30]!r}")
                    add_row(cells + [""] * (4 - len(cells)))
    flush()

    # 编号 + 报告
    idx = 0
    missing = []
    for ci, ch in enumerate(chapters, 1):
        ch["id"] = ci
        for f in ch["formulas"]:
            idx += 1
            f["id"] = f"f{idx:03d}"
            miss = []
            if not f["composition"]:
                miss.append("组成")
            for key, label in [("function", "功用"), ("indication", "主治"), ("verse", "歌诀")]:
                if not f.get(key):
                    miss.append(label)
            if miss:
                missing.append(f"- {f['id']} {f['name']}（{ch['name']}）缺: {'、'.join(miss)}")

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as fp:
        json.dump({"chapters": chapters}, fp, ensure_ascii=False, indent=1)

    report = ["# docx 解析报告", ""]
    report.append(f"- 章节数: {len(chapters)}")
    report.append(f"- 方剂总数: {idx}")
    report.append("- 各章方数: " + "、".join(f"{ch['name']} {len(ch['formulas'])}" for ch in chapters))
    report.append(f"\n## 缺字段清单（{len(missing)} 首，已容错入库，界面显示「暂无」）\n")
    report.extend(missing if missing else ["无"])
    report.append(f"\n## 结构异常（{len(anomalies)} 处，需人工核对）\n")
    report.extend(anomalies if anomalies else ["无"])
    OUT_REPORT.write_text("\n".join(report), encoding="utf-8")

    print(f"OK: {len(chapters)} 章 / {idx} 方 -> {OUT_JSON}")
    print(f"缺字段: {len(missing)} 首, 结构异常: {len(anomalies)} 处（详见 {OUT_REPORT}）")


if __name__ == "__main__":
    main()
