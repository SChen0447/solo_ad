from typing import Dict, List, Tuple
from database import db, Idea


class MatrixEngine:
    def __init__(self):
        self.max_score = 100.0
        self.min_score = 0.0

    def calculate_importance(self, idea: Idea, weight: float) -> float:
        likes_count = len(idea.likes)
        votes_count = len(idea.votes)
        avg_rating = (sum(idea.votes.values()) / votes_count) if votes_count > 0 else 0

        likes_factor = min(likes_count * 2.5, 40)
        votes_factor = min(votes_count * 2, 30)
        rating_factor = (avg_rating / 5.0) * 30 if avg_rating > 0 else 0

        raw_score = likes_factor + votes_factor + rating_factor
        weighted_score = (raw_score / 100.0) * (weight / 10.0) * 100

        return max(self.min_score, min(self.max_score, weighted_score))

    def calculate_urgency(self, idea: Idea, weight: float) -> float:
        comments_count = len(idea.comments)
        votes_count = len(idea.votes)
        time_decay = max(0, 1 - (idea.created_at - (idea.created_at - 3600)) / 86400)

        comments_factor = min(comments_count * 3, 35)
        votes_factor = min(votes_count * 2.5, 35)
        activity_factor = comments_factor + votes_factor
        time_factor = time_decay * 30

        raw_score = activity_factor + time_factor
        weighted_score = (raw_score / 100.0) * (weight / 10.0) * 100

        return max(self.min_score, min(self.max_score, weighted_score))

    def calculate_matrix_coordinates(self, idea: Idea) -> Tuple[float, float]:
        weights = db.get_weights()
        importance_weight = weights["importance_weight"]
        urgency_weight = weights["urgency_weight"]

        importance = self.calculate_importance(idea, importance_weight)
        urgency = self.calculate_urgency(idea, urgency_weight)

        return urgency, importance

    def recalculate_all(self) -> List[Dict]:
        updated_ideas = []
        for idea in db.get_all_ideas():
            matrix_x, matrix_y = self.calculate_matrix_coordinates(idea)
            db.update_matrix_position(idea.id, matrix_x, matrix_y)
            db.update_scores(idea.id, matrix_y, matrix_x)
            updated_ideas.append(db.idea_to_dict(idea))
        return updated_ideas

    def get_quadrant(self, matrix_x: float, matrix_y: float) -> str:
        if matrix_x >= 50 and matrix_y >= 50:
            return "important_urgent"
        elif matrix_x < 50 and matrix_y >= 50:
            return "important_not_urgent"
        elif matrix_x >= 50 and matrix_y < 50:
            return "not_important_urgent"
        else:
            return "not_important_not_urgent"


engine = MatrixEngine()
