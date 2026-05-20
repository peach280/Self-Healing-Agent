from flask import Flask,request,jsonify
from flask_cors import CORS
from groq import Groq
import hashlib 
import json
import os
import subprocess
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

CACHE_FILE = "../cache/fixes.json"
SANDBOX_DIR = "../sandbox"
api_key = os.getenv('api_key')
client = Groq(api_key=api_key)
# ── Service Map ────────────────────────────────
SERVICE_MAP = [
    "Payment_Gateway",
    "Driver_App_GPS", 
    "Central_Dispatch",
    "Promo_Engine"
]

# ── SRE System Prompt ──────────────────────────
SRE_PROMPT = """You are a Senior Site Reliability Engineer at a ride-hailing company.

You will receive corrupted JSON data from a real-time pipeline.

Service Map (you MUST blame exactly one):
- Payment_Gateway   → handles fare, total_amount, payment fields
- Driver_App_GPS    → handles pickup/dropoff datetime, coordinates
- Central_Dispatch  → handles trip_distance, passenger_count, routing
- Promo_Engine      → handles discounts, promo codes, surge pricing

STRICT Heuristics — follow these EXACTLY, no exceptions:
- RULE 1: If fare_amount < 0
    → fix: fare_amount = abs(fare_amount)
    → blame: Payment_Gateway
    → strategy: abs

- RULE 2: If tpep_dropoff_datetime <= tpep_pickup_datetime
    → fix: shift tpep_dropoff_datetime forward by +30 minutes
    → blame: Driver_App_GPS
    → strategy: time_shift

- RULE 3: If trip_distance / duration_hours > 80
    → fix: recalculate trip_distance = 80 * duration_hours * 0.9
    → blame: Central_Dispatch
    → strategy: recalculate
Examples:
RULE 1: fare_amount=-50 → fare_amount=50, blame Payment_Gateway
RULE 2: pickup=09:00, dropoff=09:00 → dropoff=09:30, blame Driver_App_GPS  
RULE 3: trip_distance=10, pickup=09:00, dropoff=09:01 → trip_distance=1.2, blame Central_Dispatch
RULE 4: discount=100, fare=20 → discount=0, blame Promo_Engine
Example for RULE 3:
Input:  trip_distance=10.0, pickup=09:00, dropoff=09:01 → speed=600mph
Action: ONLY change trip_distance = 80 * (1/60) * 0.9 = 1.2
Output: trip_distance=1.2, pickup=09:00, dropoff=09:01 (unchanged)
Blame:  Central_Dispatch

- RULE 4: If discount_amount > fare_amount
    → fix: set discount_amount = 0
    → blame: Promo_Engine
    → strategy: nullify

IMPORTANT:
- Evaluate RULE 1 first, then RULE 2, then RULE 3, then RULE 4
- Apply ONLY the FIRST rule that matches — stop immediately after
- Do NOT apply multiple rules
- Do NOT modify fields that are not mentioned in the matched rule
- NEVER blame Driver_App_GPS for speed issues
- NEVER blame Central_Dispatch for time issues
- If RULE 3 matches, only change trip_distance — do NOT touch datetime fields
- The failing_service MUST match the rule you applied

Respond ONLY in this exact JSON format (no markdown fences):
{
  "fixed_data": "the corrected JSON string",
  "failing_service": "exactly one service from the Service Map",
  "root_cause_logic": "one sentence: which rule triggered, what you changed",
  "strategy": "abs|time_shift|recalculate|nullify"
}"""

# ── Cost Constants ─────────────────────────────
GROQ_COST_PER_CALL = 0.00027  # avg cost per Groq API call in USD
DOCKER_COST_PER_RUN = 0.0005  # avg compute cost per Docker run

# ── ROI Tracking File ──────────────────────────
ROI_FILE = "../cache/roi.json"

def load_roi():
    # 1. Default structure for a fresh start
    defaults = {
        "cache_hits": 0, "llm_calls": 0, "docker_runs": 0,
        "hallucinations_blocked": 0, "money_saved": 0.0, "money_spent": 0.0
    }
    
    if os.path.exists(ROI_FILE):
        with open(ROI_FILE, "r") as f:
            try:
                data = json.load(f)
                # 2. THE FIX: Merge existing data with defaults 
                # This ensures new keys are always present
                return {**defaults, **data}
            except json.JSONDecodeError:
                return defaults
    return defaults

def save_roi(roi):
    with open(ROI_FILE, "w") as f:
        json.dump(roi, f, indent=2)


def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE,'r') as f:
            content = f.read().strip()
            if not content:
                return {} 
            return json.loads(content)
    return {}

def save_cache(cache):
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE,'w') as f:
            return json.dump(cache,f,indent=2)
cache = load_cache()
    
def generate_hash(domain, source_content, error_signature):
    hash_input = domain
    if source_content:
        hash_input += source_content
    if error_signature:
        hash_input += error_signature
    return hashlib.md5(hash_input.encode()).hexdigest()
def build_validation_script(domain, fixed_data):

    if domain == "DATA_PIPELINE":
        return f"""
import pytest
import json
from datetime import datetime

fixed = {fixed_data}

def test_R1_fare_non_negative():
    assert fixed["fare_amount"] >= 0, f"fare_amount {{fixed['fare_amount']}} is negative"

def test_R2_duration_positive():
    pickup  = datetime.fromisoformat(fixed["tpep_pickup_datetime"])
    dropoff = datetime.fromisoformat(fixed["tpep_dropoff_datetime"])
    duration = (dropoff - pickup).total_seconds()
    assert duration > 0, f"duration {{duration}}s is not positive"

def test_R3_speed_limit():
    pickup  = datetime.fromisoformat(fixed["tpep_pickup_datetime"])
    dropoff = datetime.fromisoformat(fixed["tpep_dropoff_datetime"])
    duration_hours = (dropoff - pickup).total_seconds() / 3600
    speed = fixed["trip_distance"] / duration_hours
    assert speed <= 80, f"speed {{speed:.1f}} mph exceeds 80 mph limit"
"""

    elif domain == "MEDICAL_WORKFLOW_ANALYSIS":
        return f"""
import pytest
import ast

# The AI-generated clinical summary or workflow script
source = '''{fixed_data}'''

def test_M1_syntax_valid():
    try:
        ast.parse(source)
    except SyntaxError as e:
        pytest.fail(f"Critical: AI-generated workflow contains syntax errors: {{e}}")

def test_M2_clinical_safety_libraries():
    
    # Example Siemens/Clinical allowed libraries
    allowed = {{"dicom_utils", "siemens_rad_lib", "datetime", "json", "pydantic", "re"}}
    
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = node.names if isinstance(node, ast.Import) else [ast.alias(name=node.module, asname=None)]
            for alias in names:
                if alias.name:
                    lib = alias.name.split(".")[0]
                    assert lib in allowed, f"Safety Violation: Unauthorized or hallucinated library detected: {{lib}}"

def test_M3_no_pii_leakage_functions():
    
    forbidden_calls = {{"print", "export_raw", "upload_unencrypted"}}
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            assert node.func.id not in forbidden_calls, f"Compliance Risk: Forbidden function call '{{node.func.id}}' detected."

def test_M4_enforce_structured_reporting():
    assert len(source.strip()) > 50, "Validation Failed: Clinical output is too sparse or empty."
    """
def run_docker_sandbox(domain, fixed_data):

    # ── We write the test — not the AI ─────────────
    validation_script = build_validation_script(domain, fixed_data)
  
    print(validation_script)
    test_file = os.path.join(SANDBOX_DIR, "test_fix.py")
    try:
        with open(test_file, "w") as f:
            f.write(validation_script)
    except Exception as e:
        print(e)

    try:
        print("Docker sandbox running the fix")
        result = subprocess.run(
            [
                "docker", "run", "--rm",
                "--memory", "128m",
                "--cpus", "0.5",
                "-v", f"{os.path.abspath(SANDBOX_DIR)}:/app",
                "healer",
                "pytest", "/app/test_fix.py", "-v"
            ],
            capture_output=True,
            text=True,
            timeout=60
        )

        return {
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "passed": result.returncode == 0
        }

    except subprocess.TimeoutExpired:
        print("error")
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": "Docker timed out after 60s",
            "passed": False
        }
def build_prompt(domain, incident_type, source_content, error_signature):
    if domain == "DATA_PIPELINE":
        # print(source_content)
        return f"""{SRE_PROMPT}
    

Corrupted Data:
{source_content}

Error Signature:
{error_signature if error_signature else "No error message provided"}

Before responding, calculate:
1. Is fare_amount < 0?
2. Is tpep_dropoff_datetime <= tpep_pickup_datetime?
3. Calculate speed = trip_distance / ((dropoff - pickup).total_seconds() / 3600). Is speed > 80?
4. Is discount_amount > fare_amount?

Apply the FIRST rule that matches."""

    elif domain == "MEDICAL_WORKFLOW_ANALYSIS":
        
        return f"""
    System: You are a Senior Clinical Software Architect at Siemens Healthineers. 
    Your task is to fix Python scripts used in Ultrasound/AI-Rad Companion workflows.
    Strictly adhere to medical software safety standards.

    [CONSTRAINTS]:
    1. USE ONLY the following allowed libraries: dicom_utils, siemens_rad_lib, datetime, json, pydantic, re.
    2. PROHIBITED: Do not use print(), requests, or any external networking libraries.
    3. LOGIC: All timestamps must ensure pickup < dropoff (Clinical Timeline Safety).
    4. FORMAT: Respond ONLY with a valid JSON object. No markdown, no "```json" blocks.
    
    IMPORTANT:
    - Evaluate RULE 1 first, then RULE 2, then RULE 3, then RULE 4
    - Apply ONLY the FIRST rule that matches — stop immediately after

    [SOURCE CODE]:
    {source_content}

    [EXECUTION ERROR]:
    {error_signature if error_signature else "Deterministic validation failed in Docker Sandbox."}

    [RESPONSE SCHEMA]:
    {{
    "fixed_data": "The corrected Python code string (escaped for JSON)",
    "failing_service": "MEDICAL_WORKFLOW_ANALYSIS",
    "root_cause_logic": "Explain the specific violation (e.g., PII risk, library hallucination, or timeline drift)",
    "strategy": "Describe the deterministic fix applied"
    }}
    """

def call_llm(domain, incident_type, source_content, error_signature):
    prompt = build_prompt(domain, incident_type, source_content, error_signature)
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )

        raw = response.choices[0].message.content.strip()
        
        # 1. Cleaning logic: Remove any text before/after the JSON
        # This looks for the first '{' and last '}'
        start_idx = raw.find('{')
        end_idx = raw.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            raw = raw[start_idx:end_idx + 1]
        
        print("Cleaned raw response:", raw)

        # 2. Defensive Loading
        if not raw:
            raise ValueError("Empty response from Groq")

        return json.loads(raw)

    except (json.JSONDecodeError, ValueError, Exception) as e:
        print(f"SRE Critical Error: LLM Output Validation Failed - {e}")
        
        # 3. Fallback: Return a valid JSON object so the backend doesn't crash
        return {
            "fixed_data": source_content, # Return original data if fix fails
            "failing_service": "SYSTEM_ERROR",
            "root_cause_logic": f"LLM parsing failed: {str(e)}",
            "strategy": "fallback_noop"
        }
@app.route("/stats", methods=["GET"])
def stats():
    roi = load_roi()
    return jsonify({
        "total_healed":           len(cache),
        "cache_hits":             roi.get("cache_hits", 0),
        "llm_calls":              roi.get("llm_calls", 0),
        "docker_runs":            roi.get("docker_runs", 0),
        "hallucinations_blocked": roi.get("hallucinations_blocked", 0),
        "money_saved":            round(roi.get("money_saved", 0.0), 6),
        "money_spent":            round(roi.get("money_spent", 0.0), 6),
    })
@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    counts = {service: 0 for service in SERVICE_MAP}
    
    for entry in cache.values():
        service = entry.get("failing_service")
        if service in counts:
            counts[service] += 1

    return jsonify({
        "leaderboard": [
            {"service": k, "heals": v} 
            for k, v in sorted(counts.items(), key=lambda x: x[1], reverse=True)
        ]
    })
@app.route("/heal",methods=["POST"])
def heal():
    roi = load_roi()
    data = request.json
    domain = data.get("domain","")
    incident_type = data.get("incident_type","")
    source_content = data.get("source_content","")
    error_signature = data.get("error_signature", "")
    if not domain or not source_content:
        return jsonify({"error":"domain and source_content are required"}),400
    unique_id = generate_hash(domain,source_content,error_signature)
    if unique_id is None:
        return jsonify({"error":"provide at least source_content or error_signature"}),400
    if unique_id in cache:
        cache[unique_id]["hits"] = cache[unique_id].get("hits", 0) + 1
        save_cache(cache)
        roi["cache_hits"]   += 1
        roi["money_saved"]  += (GROQ_COST_PER_CALL + DOCKER_COST_PER_RUN)
        save_roi(roi)
        return jsonify({
            "status": "CACHE_HIT",
            "hash": unique_id,
            "failing_service": cache[unique_id].get("failing_service"),
            "root_cause_logic":cache[unique_id].get("explanation"),
            "result":          cache[unique_id],
        })
        
    # ── Groq call ──────────────────────────────────
    print("LLM generating fix...")
    groq_result = call_llm(domain, incident_type, source_content, error_signature)
    roi["llm_calls"] += 1
    roi["money_spent"] += GROQ_COST_PER_CALL
    # print("First fix")
    # print(groq_result)
    # ── Docker Guardrail — Attempt 1 ───────────────
    sandbox = run_docker_sandbox(domain,groq_result["fixed_data"])
    roi["docker_runs"] += 1
    roi["money_spent"] += DOCKER_COST_PER_RUN
    save_roi(roi)

    if sandbox["passed"]:
        # Save to cache only if Docker confirms fix works
        cache[unique_id] = {
            "domain": domain,
            "fixed_data": groq_result.get("fixed_data", ""),
            "explanation": groq_result.get("root_cause_logic", ""),
            "strategy": groq_result.get("strategy", ""),
            "failing_service": groq_result.get("failing_service", ""),
            "pytest_script": groq_result.get("pytest_script", ""),
            "hits": 0
        }
        save_cache(cache)

        return jsonify({
        "status": "HEALED",
        "hash": unique_id,
        "attempt": 1,
        "failing_service": groq_result.get("failing_service"),
        "root_cause_logic": groq_result.get("root_cause_logic"),
        "result": groq_result,
        "sandbox": sandbox
        })

    # ── Docker failed — Self Correction attempt ─────
    correction_prompt = f"""Your previous fix failed the pytest validation.

Original Problem:
{source_content}

Your Previous Fix:
{groq_result['fixed_data']}


Docker Error:
{sandbox['stderr'] or sandbox['stdout']}

Fix the solution. Return same JSON format."""

    groq_result_v2 = call_llm(domain, incident_type, correction_prompt, error_signature)
    roi["llm_calls"] += 1
    roi["money_spent"] += GROQ_COST_PER_CALL
    # print("Second fix")
    # print(groq_result_v2)
    # ── Docker Guardrail — Attempt 2 ───────────────
    sandbox_v2 = run_docker_sandbox(domain,groq_result_v2["fixed_data"])
    roi["docker_runs"] += 1
    roi["money_spent"] += DOCKER_COST_PER_RUN
    save_roi(roi)
    if sandbox_v2["passed"]:
        cache[unique_id] = {
            "domain": domain,
            "fixed_data": groq_result_v2.get("fixed_data", ""),
            "explanation": groq_result_v2.get("root_cause_logic", ""),
            "strategy": groq_result_v2.get("strategy", ""),
            "failing_service": groq_result_v2.get("failing_service", ""),
            "pytest_script": groq_result_v2.get("pytest_script", ""),
            "hits": 0
        }
        save_cache(cache)

        return jsonify({
        "status": "HEALED",
        "hash": unique_id,
        "attempt": 2,
        "failing_service": groq_result_v2.get("failing_service"),
        "root_cause_logic": groq_result_v2.get("root_cause_logic"),
        "result": groq_result_v2,
        "sandbox": sandbox
        })

    # ── Both attempts failed ────────────────────────
    roi["hallucinations_blocked"] += 1
    save_roi(roi)
    return jsonify({
        "status": "BLOCKED",
        "hash": unique_id,
        "attempt": 2,
        "result": groq_result_v2,
        "sandbox": sandbox_v2,
        "message": "Hallucination detected — both attempts failed Docker validation"
    })
if __name__ == "__main__":
    app.run(debug=True, port=5000)
    

