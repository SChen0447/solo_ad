import random
import string
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict

THEME_COLORS = [
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#10B981',
    '#F59E0B'
]


@dataclass
class Question:
    id: str
    content: str
    color: str
    is_starred: bool = False
    is_for_vote: bool = False
    votes_agree: int = 0
    votes_disagree: int = 0
    voted_students: set = field(default_factory=set)
    created_at: float = field(default_factory=time.time)


@dataclass
class Course:
    code: str
    name: str
    status: str = 'waiting'
    questions: List[Question] = field(default_factory=list)
    qa_start_time: Optional[float] = None
    qa_duration: int = 300
    vote_active: bool = False
    vote_questions: List[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)

    def get_remaining_time(self) -> int:
        if self.qa_start_time is None or self.status != 'qa_active':
            return 0
        elapsed = time.time() - self.qa_start_time
        remaining = self.qa_duration - elapsed
        return max(0, int(remaining))


class VoteManager:
    def __init__(self):
        self.courses: Dict[str, Course] = {}
        self.question_id_counter: int = 0

    def generate_course_code(self) -> str:
        while True:
            code = ''.join(random.choices(string.digits, k=6))
            if code not in self.courses:
                return code

    def generate_question_id(self) -> str:
        self.question_id_counter += 1
        return f'q_{self.question_id_counter}_{int(time.time() * 1000)}'

    def create_course(self, name: str) -> Course:
        code = self.generate_course_code()
        course = Course(code=code, name=name)
        self.courses[code] = course
        return course

    def get_course(self, code: str) -> Optional[Course]:
        return self.courses.get(code)

    def start_qa_session(self, code: str) -> Optional[Course]:
        course = self.courses.get(code)
        if not course:
            return None
        course.status = 'qa_active'
        course.qa_start_time = time.time()
        course.vote_active = False
        course.vote_questions = []
        for q in course.questions:
            q.votes_agree = 0
            q.votes_disagree = 0
            q.voted_students.clear()
            q.is_starred = False
            q.is_for_vote = False
        course.questions = []
        return course

    def end_qa_session(self, code: str) -> Optional[Course]:
        course = self.courses.get(code)
        if not course:
            return None
        course.status = 'vote_active'
        course.vote_active = True
        course.qa_start_time = None
        return course

    def add_question(self, code: str, content: str) -> Optional[Question]:
        course = self.courses.get(code)
        if not course or course.status != 'qa_active':
            return None
        if len(content) > 200:
            content = content[:200]
        qid = self.generate_question_id()
        color = random.choice(THEME_COLORS)
        question = Question(id=qid, content=content, color=color)
        course.questions.append(question)
        return question

    def star_question(self, code: str, question_id: str, starred: bool) -> Optional[Question]:
        course = self.courses.get(code)
        if not course:
            return None
        for q in course.questions:
            if q.id == question_id:
                q.is_starred = starred
                return q
        return None

    def mark_for_vote(self, code: str, question_id: str, for_vote: bool) -> Optional[Question]:
        course = self.courses.get(code)
        if not course:
            return None
        for q in course.questions:
            if q.id == question_id:
                q.is_for_vote = for_vote
                if for_vote and question_id not in course.vote_questions:
                    course.vote_questions.append(question_id)
                elif not for_vote and question_id in course.vote_questions:
                    course.vote_questions.remove(question_id)
                return q
        return None

    def submit_vote(self, code: str, question_id: str, student_id: str, agree: bool) -> Optional[Dict[str, Any]]:
        course = self.courses.get(code)
        if not course or not course.vote_active:
            return None
        for q in course.questions:
            if q.id == question_id:
                if student_id in q.voted_students:
                    return None
                q.voted_students.add(student_id)
                if agree:
                    q.votes_agree += 1
                else:
                    q.votes_disagree += 1
                total = q.votes_agree + q.votes_disagree
                agree_pct = (q.votes_agree / total * 100) if total > 0 else 0
                disagree_pct = (q.votes_disagree / total * 100) if total > 0 else 0
                return {
                    'question_id': question_id,
                    'votes_agree': q.votes_agree,
                    'votes_disagree': q.votes_disagree,
                    'agree_pct': agree_pct,
                    'disagree_pct': disagree_pct,
                    'total_votes': total
                }
        return None

    def get_vote_results(self, code: str) -> Optional[Dict[str, Any]]:
        course = self.courses.get(code)
        if not course:
            return None

        vote_questions = []
        for qid in course.vote_questions:
            for q in course.questions:
                if q.id == qid:
                    total = q.votes_agree + q.votes_disagree
                    vote_questions.append({
                        'id': q.id,
                        'content': q.content,
                        'votes_agree': q.votes_agree,
                        'votes_disagree': q.votes_disagree,
                        'total_votes': total,
                        'agree_pct': (q.votes_agree / total * 100) if total > 0 else 0,
                        'disagree_pct': (q.votes_disagree / total * 100) if total > 0 else 0,
                        'color': q.color,
                        'is_starred': q.is_starred
                    })
                    break

        vote_questions.sort(key=lambda x: x['votes_agree'] - x['votes_disagree'], reverse=True)

        all_questions = []
        for q in course.questions:
            total = q.votes_agree + q.votes_disagree
            all_questions.append({
                'id': q.id,
                'content': q.content,
                'votes_agree': q.votes_agree,
                'votes_disagree': q.votes_disagree,
                'total_votes': total,
                'agree_pct': (q.votes_agree / total * 100) if total > 0 else 0,
                'disagree_pct': (q.votes_disagree / total * 100) if total > 0 else 0,
                'color': q.color,
                'is_starred': q.is_starred,
                'is_for_vote': q.is_for_vote
            })

        all_questions.sort(key=lambda x: x['votes_agree'] - x['votes_disagree'], reverse=True)

        return {
            'course_code': code,
            'course_name': course.name,
            'vote_questions': vote_questions,
            'all_questions': all_questions,
            'status': course.status
        }

    def to_dict(self, code: str) -> Optional[Dict[str, Any]]:
        course = self.courses.get(code)
        if not course:
            return None
        return {
            'code': course.code,
            'name': course.name,
            'status': course.status,
            'remaining_time': course.get_remaining_time(),
            'questions': [
                {
                    'id': q.id,
                    'content': q.content,
                    'color': q.color,
                    'is_starred': q.is_starred,
                    'is_for_vote': q.is_for_vote,
                    'votes_agree': q.votes_agree,
                    'votes_disagree': q.votes_disagree
                }
                for q in course.questions
            ],
            'vote_active': course.vote_active,
            'vote_questions': course.vote_questions
        }
