from datetime import datetime, date
from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from models import db, User, Plan, Item, Expense, Settlement
import os
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///travel_planner.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, resources={r"/*": {"origins": "*"}})
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*", manage_session=False)

UNSPLASH_IMAGES = [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop'
]


def get_current_user():
    user_id = session.get('user_id')
    if user_id:
        return User.query.get(user_id)
    return None


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': '邮箱已被注册'}), 400
    
    user = User(
        email=data['email'],
        name=data['name']
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    session['user_id'] = user.id
    return jsonify(user.to_dict())


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': '邮箱或密码错误'}), 401
    
    user.online = True
    db.session.commit()
    session['user_id'] = user.id
    return jsonify(user.to_dict())


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    user = get_current_user()
    if user:
        user.online = False
        db.session.commit()
    session.clear()
    return jsonify({'message': '已登出'})


@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    return jsonify(user.to_dict())


@app.route('/api/plans', methods=['GET'])
def get_plans():
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    return jsonify([plan.to_dict() for plan in user.plans])


@app.route('/api/plans', methods=['POST'])
def create_plan():
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    data = request.json
    plan = Plan(
        name=data['name'],
        description=data.get('description', ''),
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date(),
        total_budget=data.get('total_budget', 0),
        cover_image=random.choice(UNSPLASH_IMAGES),
        created_by=user.id
    )
    plan.members.append(user)
    db.session.add(plan)
    db.session.commit()
    
    return jsonify(plan.to_dict(include_details=True))


@app.route('/api/plans/<int:plan_id>', methods=['GET'])
def get_plan(plan_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限访问该计划'}), 403
    
    return jsonify(plan.to_dict(include_details=True))


@app.route('/api/plans/<int:plan_id>', methods=['PUT'])
def update_plan(plan_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    data = request.json
    if 'name' in data:
        plan.name = data['name']
    if 'description' in data:
        plan.description = data['description']
    if 'start_date' in data:
        plan.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if 'end_date' in data:
        plan.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    if 'total_budget' in data:
        plan.total_budget = data['total_budget']
    
    db.session.commit()
    
    socketio.emit('plan_updated', plan.to_dict(include_details=True), room=f'plan_{plan_id}')
    return jsonify(plan.to_dict(include_details=True))


@app.route('/api/plans/<int:plan_id>/members', methods=['POST'])
def add_member(plan_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    data = request.json
    member_email = data.get('email')
    member = User.query.filter_by(email=member_email).first()
    
    if not member:
        return jsonify({'error': '用户不存在'}), 404
    
    if member in plan.members:
        return jsonify({'error': '用户已在计划中'}), 400
    
    plan.members.append(member)
    db.session.commit()
    
    socketio.emit('plan_updated', plan.to_dict(include_details=True), room=f'plan_{plan_id}')
    return jsonify(plan.to_dict(include_details=True))


@app.route('/api/plans/<int:plan_id>/items', methods=['POST'])
def create_item(plan_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    data = request.json
    max_order = db.session.query(db.func.max(Item.order)).filter_by(plan_id=plan_id).scalar() or 0
    
    item = Item(
        plan_id=plan_id,
        type=data['type'],
        title=data['title'],
        description=data.get('description', ''),
        date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
        time=datetime.strptime(data['time'], '%H:%M').time() if data.get('time') else None,
        location=data.get('location', ''),
        cost=data.get('cost', 0),
        responsible_id=data.get('responsible_id'),
        order=max_order + 1
    )
    db.session.add(item)
    db.session.commit()
    
    socketio.emit('item_created', item.to_dict(), room=f'plan_{plan_id}')
    return jsonify(item.to_dict())


@app.route('/api/plans/<int:plan_id>/items/<int:item_id>', methods=['PUT'])
def update_item(plan_id, item_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    item = Item.query.get_or_404(item_id)
    if item.plan_id != plan_id:
        return jsonify({'error': '项目不属于该计划'}), 400
    
    data = request.json
    if 'type' in data:
        item.type = data['type']
    if 'title' in data:
        item.title = data['title']
    if 'description' in data:
        item.description = data['description']
    if 'date' in data:
        item.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    if 'time' in data:
        item.time = datetime.strptime(data['time'], '%H:%M').time() if data['time'] else None
    if 'location' in data:
        item.location = data['location']
    if 'cost' in data:
        item.cost = data['cost']
    if 'responsible_id' in data:
        item.responsible_id = data['responsible_id']
    if 'order' in data:
        item.order = data['order']
    
    db.session.commit()
    
    socketio.emit('item_updated', item.to_dict(), room=f'plan_{plan_id}')
    return jsonify(item.to_dict())


@app.route('/api/plans/<int:plan_id>/items/<int:item_id>', methods=['DELETE'])
def delete_item(plan_id, item_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    item = Item.query.get_or_404(item_id)
    if item.plan_id != plan_id:
        return jsonify({'error': '项目不属于该计划'}), 400
    
    db.session.delete(item)
    db.session.commit()
    
    socketio.emit('item_deleted', {'id': item_id}, room=f'plan_{plan_id}')
    return jsonify({'message': '项目已删除'})


@app.route('/api/plans/<int:plan_id>/items/reorder', methods=['POST'])
def reorder_items(plan_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    data = request.json
    item_orders = data.get('items', [])
    
    for item_data in item_orders:
        item = Item.query.get(item_data['id'])
        if item and item.plan_id == plan_id:
            item.order = item_data['order']
    
    db.session.commit()
    
    socketio.emit('items_reordered', {'items': item_orders}, room=f'plan_{plan_id}')
    return jsonify({'message': '排序已更新'})


@app.route('/api/plans/<int:plan_id>/expenses', methods=['POST'])
def create_expense(plan_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    data = request.json
    expense = Expense(
        plan_id=plan_id,
        title=data['title'],
        amount=round(data['amount'], 2),
        currency=data.get('currency', 'CNY'),
        paid_by=data['paid_by'],
        split_type=data.get('split_type', 'equal'),
        splits=data.get('splits', {})
    )
    db.session.add(expense)
    db.session.commit()
    
    socketio.emit('expense_created', expense.to_dict(), room=f'plan_{plan_id}')
    return jsonify(expense.to_dict())


@app.route('/api/plans/<int:plan_id>/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(plan_id, expense_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    expense = Expense.query.get_or_404(expense_id)
    if expense.plan_id != plan_id:
        return jsonify({'error': '费用不属于该计划'}), 400
    
    db.session.delete(expense)
    db.session.commit()
    
    socketio.emit('expense_deleted', {'id': expense_id}, room=f'plan_{plan_id}')
    return jsonify({'message': '费用已删除'})


@app.route('/api/plans/<int:plan_id>/settlements', methods=['POST'])
def create_settlements(plan_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    data = request.json
    settlements_data = data.get('settlements', [])
    
    settlements = []
    for s_data in settlements_data:
        settlement = Settlement(
            plan_id=plan_id,
            from_user_id=s_data['from_user_id'],
            to_user_id=s_data['to_user_id'],
            amount=round(s_data['amount'], 2)
        )
        db.session.add(settlement)
        settlements.append(settlement)
    
    for expense in plan.expenses:
        expense.settled = True
    
    db.session.commit()
    
    settlement_dicts = [s.to_dict() for s in settlements]
    socketio.emit('settlements_created', {'settlements': settlement_dicts}, room=f'plan_{plan_id}')
    return jsonify(settlement_dicts)


@app.route('/api/plans/<int:plan_id>/settlements/<int:settlement_id>/complete', methods=['POST'])
def complete_settlement(plan_id, settlement_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': '未登录'}), 401
    
    plan = Plan.query.get_or_404(plan_id)
    if user not in plan.members:
        return jsonify({'error': '无权限修改该计划'}), 403
    
    settlement = Settlement.query.get_or_404(settlement_id)
    if settlement.plan_id != plan_id:
        return jsonify({'error': '结算不属于该计划'}), 400
    
    settlement.completed = True
    settlement.completed_at = datetime.utcnow()
    db.session.commit()
    
    socketio.emit('settlement_completed', settlement.to_dict(), room=f'plan_{plan_id}')
    return jsonify(settlement.to_dict())


@socketio.on('join_plan')
def handle_join_plan(data):
    plan_id = data.get('plan_id')
    user_id = data.get('user_id')
    if plan_id and user_id:
        join_room(f'plan_{plan_id}')
        user = User.query.get(user_id)
        if user:
            user.online = True
            db.session.commit()
            emit('user_status_changed', {'user_id': user_id, 'online': True}, room=f'plan_{plan_id}')


@socketio.on('leave_plan')
def handle_leave_plan(data):
    plan_id = data.get('plan_id')
    user_id = data.get('user_id')
    if plan_id and user_id:
        leave_room(f'plan_{plan_id}')
        user = User.query.get(user_id)
        if user:
            user.online = False
            db.session.commit()
            emit('user_status_changed', {'user_id': user_id, 'online': False}, room=f'plan_{plan_id}')


@socketio.on('disconnect')
def handle_disconnect():
    pass


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
