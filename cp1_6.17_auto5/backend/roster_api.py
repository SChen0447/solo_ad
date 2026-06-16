import time
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

SHIFT_TYPES = ['morning', 'afternoon', 'night']
DAYS_OF_WEEK = 7


def create_empty_roster():
    roster = {}
    for day in range(DAYS_OF_WEEK):
        roster[str(day)] = {}
        for shift in SHIFT_TYPES:
            roster[str(day)][f"{shift}-{day}"] = {
                "personId": None,
                "shiftType": shift,
                "note": ""
            }
    return roster


def get_person_assigned_days(person_id, roster):
    days = 0
    night_days = 0
    for day_data in roster.values():
        for shift_data in day_data.values():
            if shift_data.get("personId") == person_id:
                days += 1
                if shift_data.get("shiftType") == "night":
                    night_days += 1
    return days, night_days


def can_assign_person(person, day_index, shift_type, roster):
    if day_index not in person.get("availableDays", []):
        return False

    day_key = str(day_index)
    if day_key in roster:
        for shift_data in roster[day_key].values():
            if shift_data.get("personId") == person["id"]:
                return False

    assigned_days, assigned_night_days = get_person_assigned_days(person["id"], roster)

    if assigned_days >= person.get("maxDaysPerWeek", 5):
        return False

    if shift_type == "night" and assigned_night_days >= person.get("maxNightDaysPerWeek", 2):
        return False

    return True


def greedy_generate_roster(people):
    roster = create_empty_roster()
    assigned_count = {p["id"]: 0 for p in people}

    day_order = list(range(DAYS_OF_WEEK))
    random.shuffle(day_order)

    shift_order = list(SHIFT_TYPES)
    random.shuffle(shift_order)

    for day in day_order:
        for shift_type in shift_order:
            shift_key = f"{shift_type}-{day}"

            candidates = []
            for person in people:
                if can_assign_person(person, day, shift_type, roster):
                    score = 0

                    if shift_type in person.get("preferredShifts", []):
                        score += 10

                    score -= assigned_count[person["id"]] * 2

                    score += random.uniform(0, 1)

                    candidates.append((score, person))

            if candidates:
                candidates.sort(key=lambda x: x[0], reverse=True)
                best_person = candidates[0][1]
                roster[str(day)][shift_key]["personId"] = best_person["id"]
                assigned_count[best_person["id"]] += 1

    return roster


def calculate_roster_score(roster, people):
    score = 0
    people_map = {p["id"]: p for p in people}

    for day_key, day_data in roster.items():
        for shift_key, shift_data in day_data.items():
            person_id = shift_data.get("personId")
            if person_id and person_id in people_map:
                person = people_map[person_id]
                shift_type = shift_data["shiftType"]
                if shift_type in person.get("preferredShifts", []):
                    score += 5

    assigned_counts = {}
    for person in people:
        days, _ = get_person_assigned_days(person["id"], roster)
        assigned_counts[person["id"]] = days

    if assigned_counts:
        min_count = min(assigned_counts.values())
        max_count = max(assigned_counts.values())
        score -= (max_count - min_count) * 3

    return score


def backtrack_optimize(roster, people, max_iterations=50):
    best_roster = roster
    best_score = calculate_roster_score(roster, people)

    people_map = {p["id"]: p for p in people}
    all_shift_slots = []
    for day in range(DAYS_OF_WEEK):
        for shift_type in SHIFT_TYPES:
            all_shift_slots.append((day, shift_type))

    for _ in range(max_iterations):
        new_roster = {day_key: {k: v.copy() for k, v in day_data.items()}
                      for day_key, day_data in best_roster.items()}

        slot1, slot2 = random.sample(all_shift_slots, 2)
        day1, shift1 = slot1
        day2, shift2 = slot2

        key1 = f"{shift1}-{day1}"
        key2 = f"{shift2}-{day2}"

        person1 = new_roster[str(day1)][key1]["personId"]
        person2 = new_roster[str(day2)][key2]["personId"]

        if person1 == person2:
            continue

        if person1:
            p1 = people_map.get(person1)
            if p1 and not can_assign_person(p1, day2, shift2, new_roster):
                if day2 not in p1.get("availableDays", []):
                    continue

        if person2:
            p2 = people_map.get(person2)
            if p2 and not can_assign_person(p2, day1, shift1, new_roster):
                if day1 not in p2.get("availableDays", []):
                    continue

        new_roster[str(day1)][key1]["personId"] = person2
        new_roster[str(day2)][key2]["personId"] = person1

        valid = True
        if person2:
            p2 = people_map.get(person2)
            if p2:
                days, night_days = get_person_assigned_days(person2, new_roster)
                if days > p2.get("maxDaysPerWeek", 5):
                    valid = False
                if shift1 == "night" and night_days > p2.get("maxNightDaysPerWeek", 2):
                    valid = False

        if valid and person1:
            p1 = people_map.get(person1)
            if p1:
                days, night_days = get_person_assigned_days(person1, new_roster)
                if days > p1.get("maxDaysPerWeek", 5):
                    valid = False
                if shift2 == "night" and night_days > p1.get("maxNightDaysPerWeek", 2):
                    valid = False

        if not valid:
            continue

        new_score = calculate_roster_score(new_roster, people)

        if new_score > best_score:
            best_score = new_score
            best_roster = new_roster

    return best_roster


@app.route('/api/roster/generate', methods=['POST'])
def generate_roster():
    start_time = time.time()

    try:
        data = request.get_json()
        people = data.get('people', [])

        if not people:
            return jsonify({
                "success": False,
                "message": "人员列表不能为空"
            }), 400

        best_roster = None
        best_score = float('-inf')

        num_attempts = 5
        for _ in range(num_attempts):
            roster = greedy_generate_roster(people)
            roster = backtrack_optimize(roster, people, max_iterations=30)
            score = calculate_roster_score(roster, people)

            if score > best_score:
                best_score = score
                best_roster = roster

            elapsed = time.time() - start_time
            if elapsed > 2.5:
                break

        result_roster = {}
        for day_key, day_data in best_roster.items():
            result_roster[int(day_key)] = day_data

        elapsed_time = time.time() - start_time

        return jsonify({
            "success": True,
            "roster": result_roster,
            "score": best_score,
            "generationTime": round(elapsed_time, 3)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"生成排班失败: {str(e)}"
        }), 500


@app.route('/api/roster/adjust', methods=['POST'])
def adjust_roster():
    try:
        data = request.get_json()
        roster = data.get('roster', {})
        people = data.get('people', [])

        if not roster:
            return jsonify({
                "success": False,
                "message": "排班数据不能为空"
            }), 400

        people_map = {p["id"]: p for p in people}
        issues = []

        for day_key, day_data in roster.items():
            day_index = int(day_key) if isinstance(day_key, str) else day_key
            daily_assignments = set()

            for shift_key, shift_data in day_data.items():
                person_id = shift_data.get("personId")
                if person_id:
                    if person_id in daily_assignments:
                        issues.append(f"第{day_index + 1}天: {person_id} 被安排了多个班次")
                    daily_assignments.add(person_id)

                    person = people_map.get(person_id)
                    if person:
                        if day_index not in person.get("availableDays", []):
                            issues.append(f"第{day_index + 1}天: {person.get('name', person_id)} 当天不可用")

        for person in people:
            days, night_days = get_person_assigned_days(person["id"], roster)
            if days > person.get("maxDaysPerWeek", 5):
                issues.append(f"{person['name']}: 超过最大排班天数")
            if night_days > person.get("maxNightDaysPerWeek", 2):
                issues.append(f"{person['name']}: 超过最大夜班天数")

        score = calculate_roster_score(roster, people)

        return jsonify({
            "success": True,
            "valid": len(issues) == 0,
            "issues": issues,
            "score": score,
            "message": "排班已保存" if len(issues) == 0 else "排班存在一些问题"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"保存排班失败: {str(e)}"
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "排班服务运行正常"
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
