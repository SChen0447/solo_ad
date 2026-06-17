import os
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import jwt
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_login import LoginManager, current_user, login_required, login_user, logout_user
from flask_socketio import SocketIO, join_room, leave_room, send

from models import (
    Ingredient,
    Recipe,
    RecipeStep,
    ShoppingList,
    ShoppingListCollaborator,
    ShoppingListItem,
    User,
    db,
)

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
JWT_EXPIRATION_HOURS = 24

app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///recipes.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = SECRET_KEY

CORS(app, supports_credentials=True)
db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'

socketio = SocketIO(app, cors_allowed_origins='*', manage_session=False)


@login_manager.user_loader
def load_user(user_id: str) -> User:
    return User.query.get(int(user_id))


def generate_token(user: User) -> str:
    payload = {
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def decode_token(token: str) -> Dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return {}
    except jwt.InvalidTokenError:
        return {}


def get_user_from_token() -> User:
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header[7:]
    payload = decode_token(token)
    user_id = payload.get('user_id')
    return User.query.get(user_id) if user_id else None


def merge_ingredients(recipe_ids: List[int]) -> List[Dict]:
    merged: Dict[str, Tuple[float, str]] = defaultdict(lambda: (0.0, ''))

    for recipe_id in recipe_ids:
        recipe = Recipe.query.get(recipe_id)
        if not recipe:
            continue
        for ing in recipe.ingredients:
            name = ing.name.strip().lower()
            current_qty, current_unit = merged[name]
            if not current_unit:
                current_unit = ing.unit
            merged[name] = (current_qty + ing.quantity, current_unit)

    return [
        {
            'name': name.capitalize(),
            'quantity': qty,
            'unit': unit
        }
        for name, (qty, unit) in merged.items()
    ]


@app.route('/api/auth/register', methods=['POST'])
def register() -> Tuple[Dict, int]:
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': '请填写所有必填字段'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': '用户名已存在'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': '邮箱已被注册'}), 400

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = generate_token(user)
    return jsonify({'user': user.to_dict(), 'token': token}), 201


@app.route('/api/auth/login', methods=['POST'])
def login() -> Tuple[Dict, int]:
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': '邮箱或密码错误'}), 401

    login_user(user, remember=True)
    token = generate_token(user)
    return jsonify({'user': user.to_dict(), 'token': token}), 200


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout() -> Tuple[Dict, int]:
    logout_user()
    return jsonify({'message': '已退出登录'}), 200


@app.route('/api/auth/me', methods=['GET'])
def get_current_user() -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401
    return jsonify({'user': user.to_dict()}), 200


@app.route('/api/recipes', methods=['GET'])
def get_recipes() -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    recipes = Recipe.query.filter_by(user_id=user.id).order_by(Recipe.updated_at.desc()).all()
    return jsonify({'recipes': [r.to_dict(include_details=False) for r in recipes]}), 200


@app.route('/api/recipes', methods=['POST'])
def create_recipe() -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    data = request.get_json()
    title = data.get('title', '').strip()

    if not title:
        return jsonify({'error': '食谱标题不能为空'}), 400

    recipe = Recipe(
        title=title,
        description=data.get('description', ''),
        cover_image=data.get('cover_image', ''),
        difficulty=data.get('difficulty', 1),
        servings=data.get('servings', 2),
        cook_time=data.get('cook_time', 30),
        user_id=user.id
    )
    db.session.add(recipe)
    db.session.flush()

    for ing_data in data.get('ingredients', []):
        ing = Ingredient(
            name=ing_data.get('name', ''),
            quantity=float(ing_data.get('quantity', 0) or 0),
            unit=ing_data.get('unit', ''),
            recipe_id=recipe.id
        )
        db.session.add(ing)

    for idx, step_data in enumerate(data.get('steps', [])):
        step = RecipeStep(
            content=step_data.get('content', ''),
            order=step_data.get('order', idx),
            recipe_id=recipe.id
        )
        db.session.add(step)

    db.session.commit()
    return jsonify({'recipe': recipe.to_dict()}), 201


@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id: int) -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    recipe = Recipe.query.get(recipe_id)
    if not recipe or recipe.user_id != user.id:
        return jsonify({'error': '食谱不存在或无权限'}), 404

    return jsonify({'recipe': recipe.to_dict()}), 200


@app.route('/api/recipes/<int:recipe_id>', methods=['PUT'])
def update_recipe(recipe_id: int) -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    recipe = Recipe.query.get(recipe_id)
    if not recipe or recipe.user_id != user.id:
        return jsonify({'error': '食谱不存在或无权限'}), 404

    data = request.get_json()

    recipe.title = data.get('title', recipe.title).strip()
    recipe.description = data.get('description', recipe.description)
    recipe.cover_image = data.get('cover_image', recipe.cover_image)
    recipe.difficulty = data.get('difficulty', recipe.difficulty)
    recipe.servings = data.get('servings', recipe.servings)
    recipe.cook_time = data.get('cook_time', recipe.cook_time)
    recipe.updated_at = datetime.utcnow()

    Ingredient.query.filter_by(recipe_id=recipe_id).delete()
    for ing_data in data.get('ingredients', []):
        ing = Ingredient(
            name=ing_data.get('name', ''),
            quantity=float(ing_data.get('quantity', 0) or 0),
            unit=ing_data.get('unit', ''),
            recipe_id=recipe.id
        )
        db.session.add(ing)

    RecipeStep.query.filter_by(recipe_id=recipe_id).delete()
    for idx, step_data in enumerate(data.get('steps', [])):
        step = RecipeStep(
            content=step_data.get('content', ''),
            order=step_data.get('order', idx),
            recipe_id=recipe.id
        )
        db.session.add(step)

    db.session.commit()
    return jsonify({'recipe': recipe.to_dict()}), 200


@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id: int) -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    recipe = Recipe.query.get(recipe_id)
    if not recipe or recipe.user_id != user.id:
        return jsonify({'error': '食谱不存在或无权限'}), 404

    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'message': '删除成功'}), 200


@app.route('/api/recipes/<int:recipe_id>/rating', methods=['POST'])
def rate_recipe(recipe_id: int) -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    recipe = Recipe.query.get(recipe_id)
    if not recipe or recipe.user_id != user.id:
        return jsonify({'error': '食谱不存在或无权限'}), 404

    data = request.get_json()
    rating = data.get('rating', 0)

    if rating < 1 or rating > 5:
        return jsonify({'error': '评分必须在1-5之间'}), 400

    recipe.rating = ((recipe.rating * recipe.rating_count) + rating) / (recipe.rating_count + 1)
    recipe.rating_count += 1
    db.session.commit()

    return jsonify({'recipe': recipe.to_dict(include_details=False)}), 200


@app.route('/api/shopping-list/generate', methods=['POST'])
def generate_shopping_list() -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    data = request.get_json()
    recipe_ids = data.get('recipe_ids', [])

    if not recipe_ids:
        return jsonify({'error': '请选择至少一个食谱'}), 400

    for rid in recipe_ids:
        recipe = Recipe.query.get(rid)
        if not recipe or recipe.user_id != user.id:
            return jsonify({'error': f'食谱 {rid} 不存在或无权限'}), 404

    merged_ingredients = merge_ingredients(recipe_ids)
    share_code = uuid.uuid4().hex[:8]

    recipes = Recipe.query.filter(Recipe.id.in_(recipe_ids)).all()
    list_name = f"购物清单 - {', '.join([r.title for r in recipes[:2]])}"
    if len(recipes) > 2:
        list_name += f" 等{len(recipes)}道菜"

    shopping_list = ShoppingList(
        name=list_name,
        share_code=share_code,
        user_id=user.id
    )
    db.session.add(shopping_list)
    db.session.flush()

    for ing in merged_ingredients:
        item = ShoppingListItem(
            name=ing['name'],
            quantity=ing['quantity'],
            unit=ing['unit'],
            shopping_list_id=shopping_list.id
        )
        db.session.add(item)

    db.session.commit()
    return jsonify({'shopping_list': shopping_list.to_dict()}), 201


@app.route('/api/shopping-list/<share_code>', methods=['GET'])
def get_shopping_list(share_code: str) -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    shopping_list = ShoppingList.query.filter_by(share_code=share_code).first()
    if not shopping_list:
        return jsonify({'error': '清单不存在'}), 404

    return jsonify({'shopping_list': shopping_list.to_dict()}), 200


@app.route('/api/shopping-list/<share_code>/items/<int:item_id>', methods=['PUT'])
def update_shopping_item(share_code: str, item_id: int) -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    shopping_list = ShoppingList.query.filter_by(share_code=share_code).first()
    if not shopping_list:
        return jsonify({'error': '清单不存在'}), 404

    item = ShoppingListItem.query.get(item_id)
    if not item or item.shopping_list_id != shopping_list.id:
        return jsonify({'error': '清单项不存在'}), 404

    data = request.get_json()
    item.checked = data.get('checked', item.checked)
    item.note = data.get('note', item.note)
    shopping_list.updated_at = datetime.utcnow()
    db.session.commit()

    socketio.emit('item_updated', {
        'list_id': shopping_list.id,
        'item': item.to_dict(),
        'user': user.to_dict()
    }, room=f'list_{share_code}')

    return jsonify({'item': item.to_dict()}), 200


@app.route('/api/shopping-list/<share_code>/join', methods=['POST'])
def join_shopping_list(share_code: str) -> Tuple[Dict, int]:
    user = get_user_from_token()
    if not user:
        return jsonify({'error': '未登录'}), 401

    shopping_list = ShoppingList.query.filter_by(share_code=share_code).first()
    if not shopping_list:
        return jsonify({'error': '清单不存在'}), 404

    if shopping_list.user_id == user.id:
        return jsonify({'shopping_list': shopping_list.to_dict()}), 200

    existing = ShoppingListCollaborator.query.filter_by(
        shopping_list_id=shopping_list.id,
        user_id=user.id
    ).first()

    if not existing:
        collaborator = ShoppingListCollaborator(
            shopping_list_id=shopping_list.id,
            user_id=user.id
        )
        db.session.add(collaborator)
        db.session.commit()

    return jsonify({'shopping_list': shopping_list.to_dict()}), 200


@socketio.on('join_list')
def handle_join_list(data: Dict) -> None:
    share_code = data.get('share_code')
    user = data.get('user')
    if share_code:
        join_room(f'list_{share_code}')
        send({
            'type': 'user_joined',
            'user': user,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'list_{share_code}')


@socketio.on('leave_list')
def handle_leave_list(data: Dict) -> None:
    share_code = data.get('share_code')
    user = data.get('user')
    if share_code:
        leave_room(f'list_{share_code}')
        send({
            'type': 'user_left',
            'user': user,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'list_{share_code}')


@socketio.on('item_update')
def handle_item_update(data: Dict) -> None:
    share_code = data.get('share_code')
    item = data.get('item')
    user = data.get('user')
    if share_code and item:
        socketio.emit('item_updated', {
            'item': item,
            'user': user,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'list_{share_code}')


with app.app_context():
    db.create_all()


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
