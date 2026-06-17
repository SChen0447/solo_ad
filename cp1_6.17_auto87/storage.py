import uuid
from datetime import datetime
from typing import Dict, List, Optional

submissions: Dict[str, List[Dict]] = {}
comments: Dict[str, List[Dict]] = {}
student_names: Dict[str, str] = {
    "stu_001": "张三",
    "stu_002": "李四",
    "stu_003": "王五",
    "stu_004": "赵六",
    "stu_005": "钱七"
}
unread_comments: Dict[str, int] = {}


def init_sample_data():
    from grader import grade_code
    sample_codes = {
        "stu_001": [
            "def add(a, b):\n    return a + b",
            "def add(a, b):\n    return a - b",
            "def add(a, b):\n    return a + b",
        ],
        "stu_002": [
            "def add(a, b):\n    return a + b",
            "def add(a, b):\n    return a + b",
        ],
        "stu_003": [
            "def add(a, b)\n    return a + b",
        ],
        "stu_004": [
            "def add(a, b):\n    return a + b",
            "def add(a, b):\n    return a * b",
            "def add(a, b):\n    return a + b",
            "def add(a, b):\n    return a + b",
        ],
        "stu_005": [
            "def add(a, b):\n    return a + b",
        ],
    }
    for student_id, codes in sample_codes.items():
        for code in codes:
            result = grade_code(code)
            save_submission(student_id, code, result)


def save_submission(student_id: str, code: str, grade_result: Dict) -> Dict:
    submission = {
        "id": str(uuid.uuid4()),
        "student_id": student_id,
        "student_name": student_names.get(student_id, "未知学生"),
        "code": code,
        "score": grade_result["score"],
        "test_cases": grade_result["test_cases"],
        "feedback": grade_result["feedback"],
        "submitted_at": datetime.now().isoformat()
    }
    if student_id not in submissions:
        submissions[student_id] = []
    submissions[student_id].append(submission)
    return submission


def get_submissions(student_id: Optional[str] = None) -> List[Dict]:
    if student_id:
        return submissions.get(student_id, [])
    all_subs = []
    for subs in submissions.values():
        all_subs.extend(subs)
    return all_subs


def get_latest_submissions() -> List[Dict]:
    latest = []
    for student_id, subs in submissions.items():
        if subs:
            latest.append(subs[-1])
    return latest


def get_history(student_id: str, limit: int = 6) -> List[Dict]:
    subs = submissions.get(student_id, [])
    return subs[-limit:]


def get_submission_by_id(submission_id: str) -> Optional[Dict]:
    for subs in submissions.values():
        for sub in subs:
            if sub["id"] == submission_id:
                return sub
    return None


def add_comment(submission_id: str, author: str, content: str) -> Dict:
    comment = {
        "id": str(uuid.uuid4()),
        "submission_id": submission_id,
        "author": author,
        "content": content,
        "created_at": datetime.now().isoformat()
    }
    if submission_id not in comments:
        comments[submission_id] = []
    comments[submission_id].append(comment)
    sub = get_submission_by_id(submission_id)
    if sub:
        sid = sub["student_id"]
        unread_comments[sid] = unread_comments.get(sid, 0) + 1
    return comment


def get_comments(submission_id: str) -> List[Dict]:
    return comments.get(submission_id, [])


def get_unread_count(student_id: str) -> int:
    return unread_comments.get(student_id, 0)


def clear_unread(student_id: str):
    unread_comments[student_id] = 0


def get_all_students() -> List[Dict]:
    result = []
    for sid, name in student_names.items():
        subs = submissions.get(sid, [])
        latest = subs[-1] if subs else None
        result.append({
            "id": sid,
            "name": name,
            "latest_score": latest["score"] if latest else None,
            "latest_submitted_at": latest["submitted_at"] if latest else None,
            "submission_count": len(subs)
        })
    return result
