import os
import random
import threading
import time
import json
import datetime
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import bcrypt
import jwt
import pandas as pd

app = Flask(__name__)
app.config['SECRET_KEY'] = 'stocksim-secret-key-2024'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

USERS_DB = {}
PORTFOLIOS_DB = {}
WATCHLIST_DB = {}

STOCKS = [
    {'symbol': 'AAPL', 'name': '苹果公司', 'base_price': 178.50},
    {'symbol': 'GOOGL', 'name': '谷歌', 'base_price': 141.20},
    {'symbol': 'MSFT', 'name': '微软', 'base_price': 378.90},
    {'symbol': 'AMZN', 'name': '亚马逊', 'base_price': 178.30},
    {'symbol': 'TSLA', 'name': '特斯拉', 'base_price': 248.50},
    {'symbol': 'META', 'name': 'Meta', 'base_price': 505.80},
    {'symbol': 'NVDA', 'name': '英伟达', 'base_price': 875.30},
    {'symbol': 'AMD', 'name': 'AMD', 'base_price': 165.40},
    {'symbol': 'NFLX', 'name': '奈飞', 'base_price': 628.40},
    {'symbol': 'DIS', 'name': '迪士尼', 'base_price': 102.30},
    {'symbol': 'BABA', 'name': '阿里巴巴', 'base_price': 78.50},
    {'symbol': 'TCEHY', 'name': '腾讯', 'base_price': 45.20},
    {'symbol': 'JD', 'name': '京东', 'base_price': 28.30},
    {'symbol': 'PDD', 'name': '拼多多', 'base_price': 132.40},
    {'symbol': 'BIDU', 'name': '百度', 'base_price': 95.60},
    {'symbol': 'NIO', 'name': '蔚来', 'base_price': 5.80},
    {'symbol': 'XPEV', 'name': '小鹏', 'base_price': 9.20},
    {'symbol': 'LI', 'name': '理想', 'base_price': 25.60},
    {'symbol': 'JPM', 'name': '摩根大通', 'base_price': 198.50},
    {'symbol': 'V', 'name': 'Visa', 'base_price': 275.30},
    {'symbol': 'MA', 'name': '万事达', 'base_price': 458.20},
    {'symbol': 'BAC', 'name': '美国银行', 'base_price': 35.80},
    {'symbol': 'WMT', 'name': '沃尔玛', 'base_price': 165.40},
    {'symbol': 'COST', 'name': '好市多', 'base_price': 725.60},
    {'symbol': 'HD', 'name': '家得宝', 'base_price': 345.20},
    {'symbol': 'PG', 'name': '宝洁', 'base_price': 158.70},
    {'symbol': 'KO', 'name': '可口可乐', 'base_price': 62.30},
    {'symbol': 'PEP', 'name': '百事', 'base_price': 172.50},
    {'symbol': 'MCD', 'name': '麦当劳', 'base_price': 285.40},
    {'symbol': 'SBUX', 'name': '星巴克', 'base_price': 92.60},
    {'symbol': 'JNJ', 'name': '强生', 'base_price': 152.30},
    {'symbol': 'UNH', 'name': '联合健康', 'base_price': 525.80},
    {'symbol': 'PFE', 'name': '辉瑞', 'base_price': 28.50},
    {'symbol': 'TMO', 'name': '赛默飞', 'base_price': 575.20},
    {'symbol': 'ABBV', 'name': '艾伯维', 'base_price': 168.90},
    {'symbol': 'XOM', 'name': '埃克森美孚', 'base_price': 104.50},
    {'symbol': 'CVX', 'name': '雪佛龙', 'base_price': 152.80},
    {'symbol': 'BP', 'name': '英国石油', 'base_price': 38.20},
    {'symbol': 'SHEL', 'name': '壳牌', 'base_price': 62.50},
    {'symbol': 'T', 'name': 'AT&T', 'base_price': 18.50},
    {'symbol': 'VZ', 'name': '威瑞森', 'base_price': 42.30},
    {'symbol': 'CMCSA', 'name': '康卡斯特', 'base_price': 45.80},
    {'symbol': 'DISCA', 'name': '探索传播', 'base_price': 12.50},
    {'symbol': 'F', 'name': '福特', 'base_price': 12.80},
    {'symbol': 'GM', 'name': '通用', 'base_price': 42.50},
    {'symbol': 'TM', 'name': '丰田', 'base_price': 205.80},
    {'symbol': 'HMC', 'name': '本田', 'base_price': 35.20},
    {'symbol': 'NSANY', 'name': '日产', 'base_price': 8.50},
    {'symbol': 'HYMTF', 'name': '现代', 'base_price': 45.80},
    {'symbol': 'INTC', 'name': '英特尔', 'base_price': 32.50}
]

STOCK_PRICES = {}
KLINE_DATA = {}
ORDER_BOOK = {}

TRADING_HOURS = 6 * 3600

def init_stock_data():
    for stock in STOCKS:
        symbol = stock['symbol']
        base = stock['base_price']
        prev_close = round(base * (1 + random.uniform(-0.01, 0.01)), 2)
        open_price = round(prev_close * (1 + random.uniform(-0.005, 0.005)), 2)
        current = open_price
        high = current
        low = current
        volume = random.randint(100000, 500000)
        
        STOCK_PRICES[symbol] = {
            'symbol': symbol,
            'name': stock['name'],
            'price': current,
            'change': round(current - prev_close, 2),
            'change_percent': round((current - prev_close) / prev_close * 100, 2),
            'open': open_price,
            'high': high,
            'low': low,
            'prev_close': prev_close,
            'volume': volume
        }
        
        klines = []
        step = 300
        price = prev_close
        for t in range(0, TRADING_HOURS, step):
            open_k = round(price, 2)
            change_k = random.uniform(-0.005, 0.005) * price
            close_k = round(price + change_k, 2)
            high_k = round(max(open_k, close_k) * (1 + random.uniform(0, 0.003)), 2)
            low_k = round(min(open_k, close_k) * (1 - random.uniform(0, 0.003)), 2)
            volume_k = random.randint(5000, 20000)
            klines.append([t * 1000, open_k, close_k, high_k, low_k, volume_k])
            price = close_k
        
        KLINE_DATA[symbol] = klines
        
        asks = []
        bids = []
        for i in range(1, 6):
            asks.append({'price': round(current * (1 + i * 0.001), 2), 'quantity': random.randint(100, 1000)})
            bids.append({'price': round(current * (1 - i * 0.001), 2), 'quantity': random.randint(100, 1000)})
        ORDER_BOOK[symbol] = {'asks': asks, 'bids': bids}

def update_stock_prices():
    while True:
        for symbol in STOCK_PRICES:
            data = STOCK_PRICES[symbol]
            change_percent = random.uniform(-0.02, 0.02)
            new_price = round(data['price'] * (1 + change_percent), 2)
            data['price'] = new_price
            data['change'] = round(new_price - data['prev_close'], 2)
            data['change_percent'] = round((new_price - data['prev_close']) / data['prev_close'] * 100, 2)
            data['high'] = max(data['high'], new_price)
            data['low'] = min(data['low'], new_price)
            data['volume'] += random.randint(1000, 5000)
            
            asks = []
            bids = []
            for i in range(1, 6):
                asks.append({'price': round(new_price * (1 + i * 0.001), 2), 'quantity': random.randint(100, 1000)})
                bids.append({'price': round(new_price * (1 - i * 0.001), 2), 'quantity': random.randint(100, 1000)})
            ORDER_BOOK[symbol] = {'asks': asks, 'bids': bids}
            
            socketio.emit('stock_update', {
                'symbol': symbol,
                'price': new_price,
                'change': data['change'],
                'change_percent': data['change_percent'],
                'volume': data['volume']
            })
        
        time.sleep(5)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['email']
        except:
            return jsonify({'error': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    if email in USERS_DB:
        return jsonify({'error': 'User already exists'}), 400
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    USERS_DB[email] = {'password': hashed, 'email': email}
    PORTFOLIOS_DB[email] = {'cash': 1000000, 'holdings': {}}
    WATCHLIST_DB[email] = []
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = USERS_DB.get(email)
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = jwt.encode({
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'token': token, 'email': email}), 200

@app.route('/api/quote/<symbol>', methods=['GET'])
def get_quote(symbol):
    symbol = symbol.upper()
    if symbol not in STOCK_PRICES:
        return jsonify({'error': 'Stock not found'}), 404
    data = STOCK_PRICES[symbol].copy()
    data['order_book'] = ORDER_BOOK[symbol]
    return jsonify(data)

@app.route('/api/market', methods=['GET'])
def get_market():
    query = request.args.get('q', '').lower()
    result = []
    for stock in STOCKS:
        symbol = stock['symbol']
        data = STOCK_PRICES[symbol]
        if query in symbol.lower() or query in stock['name'].lower():
            result.append(data)
        if not query:
            result.append(data)
    return jsonify(result[:50])

@app.route('/api/kline/<symbol>', methods=['GET'])
def get_kline(symbol):
    symbol = symbol.upper()
    if symbol not in KLINE_DATA:
        return jsonify({'error': 'Stock not found'}), 404
    return jsonify(KLINE_DATA[symbol])

@app.route('/api/order', methods=['POST'])
@token_required
def place_order(current_user):
    data = request.get_json()
    symbol = data.get('symbol', '').upper()
    order_type = data.get('type')
    price = float(data.get('price', 0))
    quantity = int(data.get('quantity', 0))
    
    if symbol not in STOCK_PRICES:
        return jsonify({'error': 'Stock not found'}), 404
    
    if order_type not in ['buy', 'sell']:
        return jsonify({'error': 'Invalid order type'}), 400
    
    if price <= 0 or quantity <= 0:
        return jsonify({'error': 'Invalid price or quantity'}), 400
    
    portfolio = PORTFOLIOS_DB[current_user]
    total_cost = price * quantity
    
    if order_type == 'buy':
        if portfolio['cash'] < total_cost:
            return jsonify({'error': 'Insufficient funds'}), 400
        portfolio['cash'] -= total_cost
        if symbol not in portfolio['holdings']:
            portfolio['holdings'][symbol] = {'quantity': 0, 'cost_basis': 0}
        holding = portfolio['holdings'][symbol]
        total_quantity = holding['quantity'] + quantity
        holding['cost_basis'] = (holding['cost_basis'] * holding['quantity'] + total_cost) / total_quantity
        holding['quantity'] = total_quantity
    else:
        if symbol not in portfolio['holdings'] or portfolio['holdings'][symbol]['quantity'] < quantity:
            return jsonify({'error': 'Insufficient shares'}), 400
        portfolio['cash'] += total_cost
        portfolio['holdings'][symbol]['quantity'] -= quantity
        if portfolio['holdings'][symbol]['quantity'] == 0:
            del portfolio['holdings'][symbol]
    
    return jsonify({
        'message': 'Order executed',
        'symbol': symbol,
        'type': order_type,
        'price': price,
        'quantity': quantity,
        'total': total_cost
    }), 200

@app.route('/api/portfolio', methods=['GET'])
@token_required
def get_portfolio(current_user):
    portfolio = PORTFOLIOS_DB[current_user]
    holdings = []
    total_value = 0
    total_cost = 0
    
    for symbol, holding in portfolio['holdings'].items():
        if symbol in STOCK_PRICES:
            current_price = STOCK_PRICES[symbol]['price']
            market_value = holding['quantity'] * current_price
            cost_value = holding['quantity'] * holding['cost_basis']
            profit = market_value - cost_value
            profit_percent = (profit / cost_value * 100) if cost_value > 0 else 0
            
            holdings.append({
                'symbol': symbol,
                'name': STOCK_PRICES[symbol]['name'],
                'quantity': holding['quantity'],
                'cost_basis': round(holding['cost_basis'], 2),
                'current_price': current_price,
                'market_value': round(market_value, 2),
                'profit': round(profit, 2),
                'profit_percent': round(profit_percent, 2)
            })
            total_value += market_value
            total_cost += cost_value
    
    total_assets = portfolio['cash'] + total_value
    today_pl = sum(h['profit'] for h in holdings) * random.uniform(0.01, 0.05)
    
    return jsonify({
        'cash': round(portfolio['cash'], 2),
        'holdings': holdings,
        'total_value': round(total_value, 2),
        'total_assets': round(total_assets, 2),
        'total_cost': round(total_cost, 2),
        'total_profit': round(total_value - total_cost, 2),
        'total_profit_percent': round(((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0, 2),
        'today_pl': round(today_pl, 2)
    })

@app.route('/api/watchlist', methods=['GET'])
@token_required
def get_watchlist(current_user):
    symbols = WATCHLIST_DB[current_user]
    result = []
    for symbol in symbols:
        if symbol in STOCK_PRICES:
            result.append(STOCK_PRICES[symbol])
    result.sort(key=lambda x: x['price'], reverse=True)
    return jsonify(result)

@app.route('/api/watchlist', methods=['POST'])
@token_required
def add_watchlist(current_user):
    data = request.get_json()
    symbol = data.get('symbol', '').upper()
    
    if symbol not in STOCK_PRICES:
        return jsonify({'error': 'Stock not found'}), 404
    
    if len(WATCHLIST_DB[current_user]) >= 20:
        return jsonify({'error': 'Watchlist is full (max 20)'}), 400
    
    if symbol not in WATCHLIST_DB[current_user]:
        WATCHLIST_DB[current_user].append(symbol)
    
    return jsonify({'message': 'Added to watchlist'})

@app.route('/api/watchlist/<symbol>', methods=['DELETE'])
@token_required
def remove_watchlist(current_user, symbol):
    symbol = symbol.upper()
    if symbol in WATCHLIST_DB[current_user]:
        WATCHLIST_DB[current_user].remove(symbol)
    return jsonify({'message': 'Removed from watchlist'})

@socketio.on('connect')
def handle_connect():
    emit('connected', {'message': 'Connected to StockSim'})

if __name__ == '__main__':
    init_stock_data()
    price_thread = threading.Thread(target=update_stock_prices, daemon=True)
    price_thread.start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
