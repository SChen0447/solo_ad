from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    recipes = db.relationship('Recipe', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    shopping_lists = db.relationship('ShoppingList', backref='owner', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'avatar': self.username[0].upper()
        }


class Recipe(db.Model):
    __tablename__ = 'recipes'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(128), nullable=False, index=True)
    description = db.Column(db.Text)
    cover_image = db.Column(db.String(512))
    difficulty = db.Column(db.Integer, default=1)
    rating = db.Column(db.Float, default=0.0)
    rating_count = db.Column(db.Integer, default=0)
    servings = db.Column(db.Integer, default=2)
    cook_time = db.Column(db.Integer, default=30)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    ingredients = db.relationship('Ingredient', backref='recipe', lazy='dynamic', cascade='all, delete-orphan')
    steps = db.relationship('RecipeStep', backref='recipe', lazy='dynamic', cascade='all, delete-orphan', order_by='RecipeStep.order')

    def to_dict(self, include_details: bool = True) -> dict:
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'cover_image': self.cover_image,
            'difficulty': self.difficulty,
            'rating': round(self.rating) if self.rating_count > 0 else 0,
            'rating_count': self.rating_count,
            'servings': self.servings,
            'cook_time': self.cook_time,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'author': self.author.to_dict()
        }
        if include_details:
            data['ingredients'] = [ing.to_dict() for ing in self.ingredients]
            data['steps'] = [step.to_dict() for step in self.steps]
        return data


class Ingredient(db.Model):
    __tablename__ = 'ingredients'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False, index=True)
    quantity = db.Column(db.Float, default=0.0)
    unit = db.Column(db.String(16), default='')
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit
        }


class RecipeStep(db.Model):
    __tablename__ = 'recipe_steps'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    order = db.Column(db.Integer, default=0)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'content': self.content,
            'order': self.order
        }


class ShoppingList(db.Model):
    __tablename__ = 'shopping_lists'

    id = db.Column(db.Integer, primary_key=True)
    share_code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    name = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    items = db.relationship('ShoppingListItem', backref='shopping_list', lazy='dynamic', cascade='all, delete-orphan')
    collaborators = db.relationship('ShoppingListCollaborator', backref='shopping_list', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'share_code': self.share_code,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'owner': self.owner.to_dict(),
            'items': [item.to_dict() for item in self.items],
            'collaborators': [col.to_dict() for col in self.collaborators]
        }


class ShoppingListItem(db.Model):
    __tablename__ = 'shopping_list_items'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False, index=True)
    quantity = db.Column(db.Float, default=0.0)
    unit = db.Column(db.String(16), default='')
    checked = db.Column(db.Boolean, default=False)
    note = db.Column(db.String(256), default='')
    shopping_list_id = db.Column(db.Integer, db.ForeignKey('shopping_lists.id'), nullable=False)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'checked': self.checked,
            'note': self.note
        }


class ShoppingListCollaborator(db.Model):
    __tablename__ = 'shopping_list_collaborators'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shopping_list_id = db.Column(db.Integer, db.ForeignKey('shopping_lists.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user': self.user.to_dict(),
            'joined_at': self.joined_at.isoformat()
        }
