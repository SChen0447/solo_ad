from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import random
import math
import time
from datetime import datetime, timedelta
from asteroid_generator import generate_asteroid_field, ORE_TYPES, ALLOY_RECIPES

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

PLAYERS_FILE = os.path.join(DATA_DIR, 'players.json')
MARKET_FILE = os.path.join(DATA_DIR, 'market.json')
ORDERS_FILE = os.path.join(DATA_DIR, 'orders.json')


def load_json(filepath, default):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return default
    return default


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_default_player(pid):
    return {
        'id': pid,
        'name': f'Pilot_{pid[:6]}',
        'level': 1,
        'credits': 100,
        'cargo_capacity': 10,
        'engine_speed': 1.0,
        'smelt_efficiency': 1.0,
        'cargo': {},
        'ingots': {},
        'unlocked_alloys': [],
        'unlocked_upgrades': [],
        'total_earned': 0,
        'total_mined': 0,
        'last_save': datetime.now().isoformat(),
    }


def generate_market_prices():
    market = load_json(MARKET_FILE, {'prices': {}, 'history': {}, 'last_update': 0})
    now = time.time()

    if now - market.get('last_update', 0) < 3600 and market.get('prices'):
        return market

    base_prices = {
        'iron': 5, 'copper': 10, 'silver': 20, 'gold': 50, 'crystal': 100,
        'bronze': 40, 'electrum': 100, 'stellarite': 250, 'dark_matter': 500,
    }

    orders = load_json(ORDERS_FILE, [])
    sell_pressure = {}
    for order in orders:
        if order.get('status') == 'filled':
            item = order.get('item', '')
            sell_pressure[item] = sell_pressure.get(item, 0) + order.get('amount', 0)

    new_prices = {}
    for item, base in base_prices.items():
        pressure = sell_pressure.get(item, 0)
        volatility = random.uniform(0.85, 1.15)
        demand_factor = max(0.6, 1.0 - pressure * 0.02)
        new_prices[item] = round(base * volatility * demand_factor, 2)

        history = market.get('history', {}).get(item, [])
        history.append({'price': new_prices[item], 'timestamp': now})
        if len(history) > 168:
            history = history[-168:]
        if 'history' not in market:
            market['history'] = {}
        market['history'][item] = history

    market['prices'] = new_prices
    market['last_update'] = now
    save_json(MARKET_FILE, market)
    return market


def clean_expired_orders():
    orders = load_json(ORDERS_FILE, [])
    now = time.time()
    changed = False
    for order in orders:
        if order.get('status') == 'pending' and now - order.get('created_at', 0) > 86400:
            order['status'] = 'expired'
            players = load_json(PLAYERS_FILE, {})
            pid = order.get('player_id', '')
            if pid in players:
                refund = round(order.get('amount', 0) * order.get('price', 0) * 0.95, 2)
                players[pid]['credits'] = players[pid].get('credits', 0) + refund
                save_json(PLAYERS_FILE, players)
            changed = True
    if changed:
        save_json(ORDERS_FILE, orders)


@app.route('/api/player/<pid>', methods=['GET'])
def get_player(pid):
    players = load_json(PLAYERS_FILE, {})
    if pid not in players:
        players[pid] = get_default_player(pid)
        save_json(PLAYERS_FILE, players)
    return jsonify(players[pid])


@app.route('/api/player/<pid>', methods=['POST'])
def save_player(pid):
    players = load_json(PLAYERS_FILE, {})
    data = request.json or {}
    if pid not in players:
        players[pid] = get_default_player(pid)
    for key in ('level', 'credits', 'cargo_capacity', 'engine_speed', 'smelt_efficiency',
                'cargo', 'ingots', 'unlocked_alloys', 'unlocked_upgrades',
                'total_earned', 'total_mined', 'name'):
        if key in data:
            players[pid][key] = data[key]
    players[pid]['last_save'] = datetime.now().isoformat()
    save_json(PLAYERS_FILE, players)
    return jsonify({'status': 'ok', 'player': players[pid]})


@app.route('/api/asteroids', methods=['GET'])
def get_asteroids():
    seed = request.args.get('seed', type=int, default=42)
    count = request.args.get('count', type=int, default=15)
    field = generate_asteroid_field(count=count, seed=seed)
    return jsonify(field)


@app.route('/api/market', methods=['GET'])
def get_market():
    market = generate_market_prices()
    return jsonify({
        'prices': market['prices'],
        'history': market.get('history', {}),
        'last_update': market.get('last_update', 0),
    })


@app.route('/api/market/sell', methods=['POST'])
def sell_order():
    data = request.json or {}
    pid = data.get('player_id', '')
    item = data.get('item', '')
    amount = data.get('amount', 0)
    price = data.get('price', 0)

    if not pid or not item or amount <= 0:
        return jsonify({'error': 'Invalid parameters'}), 400

    market = generate_market_prices()
    current_price = market['prices'].get(item, 0)
    fee = round(amount * current_price * 0.05, 2)
    net = round(amount * current_price - fee, 2)

    players = load_json(PLAYERS_FILE, {})
    if pid not in players:
        return jsonify({'error': 'Player not found'}), 404

    inventory = players[pid].get('ingots', {})
    available = inventory.get(item, 0)
    if available < amount:
        return jsonify({'error': 'Insufficient inventory'}), 400

    inventory[item] = available - amount
    players[pid]['credits'] = players[pid].get('credits', 0) + net
    players[pid]['total_earned'] = players[pid].get('total_earned', 0) + net
    players[pid]['ingots'] = inventory
    save_json(PLAYERS_FILE, players)

    orders = load_json(ORDERS_FILE, [])
    orders.append({
        'id': f'order_{len(orders):04d}',
        'player_id': pid,
        'item': item,
        'amount': amount,
        'price': current_price,
        'fee': fee,
        'net': net,
        'status': 'filled',
        'created_at': time.time(),
    })
    save_json(ORDERS_FILE, orders)

    return jsonify({'status': 'ok', 'net': net, 'fee': fee, 'price': current_price})


@app.route('/api/market/list_order', methods=['POST'])
def list_order():
    data = request.json or {}
    pid = data.get('player_id', '')
    item = data.get('item', '')
    amount = data.get('amount', 0)
    ask_price = data.get('price', 0)

    if not pid or not item or amount <= 0 or ask_price <= 0:
        return jsonify({'error': 'Invalid parameters'}), 400

    fee = round(amount * ask_price * 0.05, 2)

    players = load_json(PLAYERS_FILE, {})
    if pid not in players:
        return jsonify({'error': 'Player not found'}), 404

    inventory = players[pid].get('ingots', {})
    available = inventory.get(item, 0)
    if available < amount:
        return jsonify({'error': 'Insufficient inventory'}), 400

    if players[pid].get('credits', 0) < fee:
        return jsonify({'error': 'Insufficient credits for fee'}), 400

    inventory[item] = available - amount
    players[pid]['credits'] = players[pid].get('credits', 0) - fee
    players[pid]['ingots'] = inventory
    save_json(PLAYERS_FILE, players)

    orders = load_json(ORDERS_FILE, [])
    orders.append({
        'id': f'order_{len(orders):04d}',
        'player_id': pid,
        'item': item,
        'amount': amount,
        'price': ask_price,
        'fee': fee,
        'net': 0,
        'status': 'pending',
        'created_at': time.time(),
    })
    save_json(ORDERS_FILE, orders)

    return jsonify({'status': 'ok', 'order_id': orders[-1]['id'], 'fee': fee})


@app.route('/api/upgrade', methods=['POST'])
def upgrade_ship():
    data = request.json or {}
    pid = data.get('player_id', '')
    upgrade_type = data.get('type', '')

    players = load_json(PLAYERS_FILE, {})
    if pid not in players:
        return jsonify({'error': 'Player not found'}), 404

    player = players[pid]
    upgrade_costs = {
        'cargo': {'base': 100, 'mult': 1.5, 'field': 'cargo_capacity', 'delta': 5},
        'engine': {'base': 150, 'mult': 1.6, 'field': 'engine_speed', 'delta': 0.15},
        'smelter': {'base': 200, 'mult': 1.7, 'field': 'smelt_efficiency', 'delta': -0.10},
    }

    if upgrade_type not in upgrade_costs:
        return jsonify({'error': 'Invalid upgrade type'}), 400

    cfg = upgrade_costs[upgrade_type]
    level = len([u for u in player.get('unlocked_upgrades', []) if u.startswith(upgrade_type)])
    cost = round(cfg['base'] * (cfg['mult'] ** level))

    if player.get('credits', 0) < cost:
        return jsonify({'error': 'Insufficient credits', 'cost': cost}), 400

    player['credits'] -= cost
    if upgrade_type == 'smelter':
        player[cfg['field']] = max(0.1, player.get(cfg['field'], 1.0) + cfg['delta'])
    else:
        player[cfg['field']] = player.get(cfg['field'], 0) + cfg['delta']
    player.setdefault('unlocked_upgrades', []).append(f'{upgrade_type}_{level + 1}')
    players[pid] = player
    save_json(PLAYERS_FILE, players)

    return jsonify({'status': 'ok', 'player': player, 'cost': cost})


@app.route('/api/unlock_alloy', methods=['POST'])
def unlock_alloy():
    data = request.json or {}
    pid = data.get('player_id', '')
    alloy_name = data.get('alloy', '')

    if alloy_name not in ALLOY_RECIPES:
        return jsonify({'error': 'Invalid alloy'}), 400

    players = load_json(PLAYERS_FILE, {})
    if pid not in players:
        return jsonify({'error': 'Player not found'}), 404

    player = players[pid]
    if alloy_name in player.get('unlocked_alloys', []):
        return jsonify({'error': 'Already unlocked'}), 400

    cost = ALLOY_RECIPES[alloy_name]['unlock_cost']
    if player.get('credits', 0) < cost:
        return jsonify({'error': 'Insufficient credits', 'cost': cost}), 400

    player['credits'] -= cost
    player.setdefault('unlocked_alloys', []).append(alloy_name)
    players[pid] = player
    save_json(PLAYERS_FILE, players)

    return jsonify({'status': 'ok', 'player': player, 'recipe': ALLOY_RECIPES[alloy_name]})


@app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    players = load_json(PLAYERS_FILE, {})
    entries = []
    for pid, p in players.items():
        entries.append({
            'id': pid,
            'name': p.get('name', 'Unknown'),
            'level': p.get('level', 1),
            'credits': p.get('credits', 0),
            'total_earned': p.get('total_earned', 0),
            'total_mined': p.get('total_mined', 0),
        })
    entries.sort(key=lambda x: x['total_earned'], reverse=True)
    return jsonify(entries[:50])


@app.route('/api/ore_types', methods=['GET'])
def get_ore_types():
    return jsonify(ORE_TYPES)


@app.route('/api/alloy_recipes', methods=['GET'])
def get_alloy_recipes():
    return jsonify(ALLOY_RECIPES)


if __name__ == '__main__':
    generate_market_prices()
    app.run(host='0.0.0.0', port=5000, debug=True)
