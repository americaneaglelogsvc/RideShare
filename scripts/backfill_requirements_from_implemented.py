import os, re, sys, time

MARKER = "## Backfilled from implemented_not_documented (auto)"

def backfill(md_path: str, implemented_path: str) -> bool:
    if not os.path.exists(implemented_path):
        return False
    impl = open(implemented_path, "r", encoding="utf-8").read().strip()
    if not impl:
        return False

    md = open(md_path, "r", encoding="utf-8").read()
    stamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    block = f"\n\n---\n\n{MARKER}\n\n**Auto-backfill timestamp:** {stamp}\n\n{impl}\n"

    if MARKER in md:
        md = re.sub(rf"(?s)\n\n---\n\n{re.escape(MARKER)}.*\Z", block, md)
    else:
        md = md + block

    open(md_path, "w", encoding="utf-8").write(md)
    return True

if __name__ == "__main__":
    md_path = sys.argv[1]
    impl_path = sys.argv[2]
    changed = backfill(md_path, impl_path)
    print("BACKFILL_CHANGED=" + ("1" if changed else "0"))
