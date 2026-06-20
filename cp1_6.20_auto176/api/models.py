import json
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Plant(db.Model):
    __tablename__ = "plants"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    scientific_name = db.Column(db.String(200), nullable=False)
    common_name = db.Column(db.String(200), nullable=False)
    family = db.Column(db.String(100), nullable=False)
    genus = db.Column(db.String(100), nullable=False)
    features_text = db.Column(db.Text, nullable=True)
    distribution_json = db.Column(db.Text, nullable=True)
    habitat_json = db.Column(db.Text, nullable=True)
    image_urls_json = db.Column(db.Text, nullable=True)
    color_histogram_json = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "scientific_name": self.scientific_name,
            "common_name": self.common_name,
            "family": self.family,
            "genus": self.genus,
            "features_text": self.features_text,
            "distribution": json.loads(self.distribution_json) if self.distribution_json else [],
            "habitat": json.loads(self.habitat_json) if self.habitat_json else {},
            "image_urls": json.loads(self.image_urls_json) if self.image_urls_json else [],
            "color_histogram": json.loads(self.color_histogram_json) if self.color_histogram_json else [],
        }
