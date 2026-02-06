import json, re
from pathlib import Path

REQ_MD   = Path(r"Requirements/BlackRavenia_RideShare_Canonical_Requirements_v6_1_MERGED_REORG_v3.md")
OUT_JSON = Path(r"Requirements/BlackRavenia_RideShare_Canonical_Requirements_v6_1_MERGED_REORG_v3.json")
OUT_JSONL = Path(r"Requirements/requirements.jsonl")

def parse_blocks(md: str):
    # Split on ### headings
    heading_re = re.compile(r'(?m)^###\s+(.+?)\s*$')
    hits = list(heading_re.finditer(md))
    if not hits:
        raise SystemExit("Parsed 0 requirements: expected '### ' headings in the Markdown (MD).")

    reqs = []
    used_ids = set()

    def alloc_id(n: int):
        return f"BRRS-{n:04d}"

    next_auto = 1

    for i, h in enumerate(hits):
        start = h.start()
        end = hits[i+1].start() if i+1 < len(hits) else len(md)
        block = md[start:end].strip()

        title_line = h.group(1).strip()

        # Optional explicit ID in heading: "BRRS-0001 - Title" or "BRRS-0001: Title"
        m = re.match(r'^(BRRS-\d{4,})\s*[:\-]\s*(.+)$', title_line)
        if m:
            rid = m.group(1).strip()
            title = m.group(2).strip()
        else:
            rid = None
            title = title_line

        body = block.split("\n", 1)[1].strip() if "\n" in block else ""

        # Lightweight metadata parsing (optional; you can add these lines right under the heading)
        # milestone: X
        # priority: P1
        milestone = None
        priority = None
        acceptance = []
        meta_lines = body.splitlines()

        for line in meta_lines[:25]:
            lm = re.match(r'^\s*milestone\s*:\s*(.+?)\s*$', line, re.IGNORECASE)
            if lm: milestone = lm.group(1).strip()
            lp = re.match(r'^\s*priority\s*:\s*(.+?)\s*$', line, re.IGNORECASE)
            if lp: priority = lp.group(1).strip()

        # Acceptance: lines starting with "acceptance:" then bullets "- ..."
        acc_start = None
        for idx, line in enumerate(meta_lines):
            if re.match(r'^\s*acceptance\s*:\s*$', line, re.IGNORECASE):
                acc_start = idx + 1
                break
        if acc_start is not None:
            for line in meta_lines[acc_start:]:
                if re.match(r'^\s*-\s+.+$', line):
                    acceptance.append(re.sub(r'^\s*-\s+','',line).strip())
                elif line.strip()=="":
                    continue
                else:
                    break

        if rid is None:
            # Auto ID (stable if you only append new requirements at the end)
            while alloc_id(next_auto) in used_ids:
                next_auto += 1
            rid = alloc_id(next_auto)
            next_auto += 1

        used_ids.add(rid)

        reqs.append({
            "id": rid,
            "title": title,
            "milestone": milestone,
            "priority": priority,
            "acceptance_criteria": acceptance,
            "body_md": body
        })

    return reqs

def main():
    md = REQ_MD.read_text(encoding="utf-8", errors="replace").replace("\r\n","\n")
    reqs = parse_blocks(md)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSONL.parent.mkdir(parents=True, exist_ok=True)

    OUT_JSON.write_text(json.dumps(reqs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JSONL.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in reqs), encoding="utf-8")

    print(f"Wrote: {OUT_JSON} ({len(reqs)} requirements)")
    print(f"Wrote: {OUT_JSONL}")

if __name__ == "__main__":
    main()
