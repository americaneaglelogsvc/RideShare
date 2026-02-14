#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "Requirements" / "PROJECT_PROFILE.schema.json"

def die(msg: str, code: int = 2):
  print(msg, file=sys.stderr)
  sys.exit(code)

def read_json(path: Path):
  try:
    # tolerate UTF-8 BOM if present
    txt = path.read_text(encoding="utf-8-sig")
    return json.loads(txt)
  except Exception as e:
    die(f"Failed reading JSON: {path} :: {e}", 2)

def main():
  if not SCHEMA.exists():
    die(f"Missing required schema file: {SCHEMA}", 2)

  data = read_json(SCHEMA)

  if not isinstance(data, dict):
    die(f"PROJECT_PROFILE.schema.json must be a JSON object (got {type(data).__name__})", 2)

  # Minimal schema-shape sanity (kept intentionally light; CI gate is just “not broken”)
  missing = []
  for k in ["$schema", "type", "properties"]:
    if k not in data:
      missing.append(k)

  if missing:
    die("PROJECT_PROFILE.schema.json missing required key(s): " + ", ".join(missing), 2)

  if data.get("type") != "object":
    die("PROJECT_PROFILE.schema.json must have type=object", 2)

  print("OK: PROJECT_PROFILE.schema.json basic shape validated")
  return 0

if __name__ == "__main__":
  sys.exit(main())