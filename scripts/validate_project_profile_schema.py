import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
schema_path = ROOT / "Requirements" / "PROJECT_PROFILE.schema.json"

if not schema_path.exists():
    print(f"Missing required schema file: {schema_path}")
    sys.exit(2)

try:
    txt = schema_path.read_text(encoding="utf-8-sig")
    data = json.loads(txt)
except Exception as e:
    print(f"Schema validation failed for {schema_path}: {e}")
    sys.exit(2)

# Basic sanity checks (stdlib-only; avoids CI surprises)
if not isinstance(data, dict):
    print(f"Schema validation failed for {schema_path}: root must be a JSON object")
    sys.exit(2)

if "\" not in data or "type" not in data:
    print(f"Schema validation failed for {schema_path}: missing required keys (\, type)")
    sys.exit(2)

print(f"OK: {schema_path} is valid JSON and has required keys.")
