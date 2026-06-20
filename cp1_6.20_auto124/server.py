import csv
import io
import re
from datetime import datetime
from flask import Flask, request, jsonify
import requests as http_requests

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

def infer_type(values):
    date_patterns = [
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S",
        "%d-%m-%Y", "%m-%d-%Y",
    ]
    number_count = 0
    date_count = 0
    total = 0
    for v in values:
        if v is None or v.strip() == "":
            continue
        total += 1
        try:
            float(v)
            number_count += 1
            continue
        except ValueError:
            pass
        parsed = False
        for pat in date_patterns:
            try:
                datetime.strptime(v.strip(), pat)
                date_count += 1
                parsed = True
                break
            except ValueError:
                continue
    if total == 0:
        return "string"
    if number_count == total:
        return "number"
    if date_count == total:
        return "date"
    return "string"

@app.route("/api/parse-csv", methods=["POST"])
def parse_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    stream = io.TextIOWrapper(file.stream, encoding="utf-8")
    reader = csv.DictReader(stream)
    columns = reader.fieldnames or []
    rows = []
    raw_columns = {col: [] for col in columns}
    for row in reader:
        parsed_row = {}
        for col in columns:
            val = row.get(col, "")
            raw_columns[col].append(val)
            parsed_row[col] = val
        rows.append(parsed_row)
    column_types = {}
    for col in columns:
        column_types[col] = infer_type(raw_columns[col])
    for row in rows:
        for col in columns:
            if column_types[col] == "number":
                try:
                    row[col] = float(row[col])
                    if row[col].is_integer():
                        row[col] = int(row[col])
                except (ValueError, TypeError):
                    pass
    return jsonify({
        "columns": columns,
        "rows": rows,
        "columnTypes": column_types,
    })

@app.route("/api/proxy", methods=["GET"])
def proxy():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "No url provided"}), 400
    try:
        resp = http_requests.get(url, timeout=10)
        resp.raise_for_status()
        try:
            data = resp.json()
        except ValueError:
            data = resp.text
    except http_requests.RequestException as e:
        return jsonify({"error": str(e)}), 502
    fetched_at = datetime.utcnow().isoformat() + "Z"
    return jsonify({
        "data": data,
        "fetchedAt": fetched_at,
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)
