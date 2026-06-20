from flask import Blueprint, request, jsonify
from datetime import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from 智能标签服务.ClassifierService import classify_content

ticket_bp = Blueprint('tickets', __name__)

tickets = []
next_id = 1

def init_sample_data():
    global tickets, next_id
    sample_tickets = [
        {
            'id': 1,
            'customerName': '张三',
            'category': '功能建议',
            'description': '希望能增加批量导出功能，方便我们进行数据分析。目前只能单个导出，效率太低了。',
            'attachmentUrl': '',
            'status': '待处理',
            'priority': '中',
            'keywords': ['批量导出', '数据分析'],
            'createdAt': '2024-01-15T10:30:00'
        },
        {
            'id': 2,
            'customerName': '李四',
            'category': '缺陷报告',
            'description': '登录页面在Safari浏览器上无法正常显示，按钮点击没有反应，客户投诉严重。',
            'attachmentUrl': 'https://example.com/screenshot.png',
            'status': '处理中',
            'priority': '紧急',
            'keywords': ['登录', 'Safari', '浏览器兼容性'],
            'createdAt': '2024-01-15T11:20:00'
        },
        {
            'id': 3,
            'customerName': '王五',
            'category': '服务投诉',
            'description': '客服响应太慢了，等了两天才回复，问题还没解决。',
            'attachmentUrl': '',
            'status': '待处理',
            'priority': '高',
            'keywords': ['客服', '响应速度', '服务态度'],
            'createdAt': '2024-01-15T14:00:00'
        },
        {
            'id': 4,
            'customerName': '赵六',
            'category': '功能建议',
            'description': '建议增加深色模式，晚上使用时眼睛很疲劳。',
            'attachmentUrl': '',
            'status': '已完成',
            'priority': '低',
            'keywords': ['深色模式', 'UI优化'],
            'createdAt': '2024-01-14T09:15:00'
        },
        {
            'id': 5,
            'customerName': '孙七',
            'category': '缺陷报告',
            'description': '数据导出时偶尔会出现中文乱码问题，需要重新导出好几次才能正常。',
            'attachmentUrl': '',
            'status': '待处理',
            'priority': '中',
            'keywords': ['数据导出', '中文乱码'],
            'createdAt': '2024-01-14T16:45:00'
        },
    ]
    tickets = sample_tickets
    next_id = 6

init_sample_data()

@ticket_bp.route('/api/tickets', methods=['POST'])
def create_ticket():
    global next_id
    data = request.get_json()
    
    if not data or 'customerName' not in data or 'category' not in data or 'description' not in data:
        return jsonify({'error': '缺少必要字段'}), 400
    
    classification = classify_content(data['description'], data['category'])
    
    ticket = {
        'id': next_id,
        'customerName': data['customerName'],
        'category': data['category'],
        'description': data['description'],
        'attachmentUrl': data.get('attachmentUrl', ''),
        'status': '待处理',
        'priority': classification['priority'],
        'keywords': classification['keywords'],
        'createdAt': datetime.now().isoformat()
    }
    
    tickets.append(ticket)
    next_id += 1
    
    return jsonify(ticket), 201

@ticket_bp.route('/api/tickets', methods=['GET'])
def get_tickets():
    status = request.args.get('status')
    customer = request.args.get('customer')
    
    filtered_tickets = tickets
    
    if status:
        filtered_tickets = [t for t in filtered_tickets if t['status'] == status]
    
    if customer:
        filtered_tickets = [t for t in filtered_tickets if customer.lower() in t['customerName'].lower()]
    
    return jsonify(filtered_tickets), 200

@ticket_bp.route('/api/tickets/<int:ticket_id>', methods=['GET'])
def get_ticket(ticket_id):
    ticket = next((t for t in tickets if t['id'] == ticket_id), None)
    
    if not ticket:
        return jsonify({'error': '工单不存在'}), 404
    
    return jsonify(ticket), 200

@ticket_bp.route('/api/tickets/<int:ticket_id>', methods=['PUT'])
def update_ticket(ticket_id):
    ticket = next((t for t in tickets if t['id'] == ticket_id), None)
    
    if not ticket:
        return jsonify({'error': '工单不存在'}), 404
    
    data = request.get_json()
    
    if 'status' in data:
        ticket['status'] = data['status']
    
    return jsonify(ticket), 200

@ticket_bp.route('/api/tickets/stats', methods=['GET'])
def get_ticket_stats():
    total = len(tickets)
    pending = len([t for t in tickets if t['status'] == '待处理'])
    
    categories = ['功能建议', '缺陷报告', '服务投诉', '其他']
    by_category = []
    for cat in categories:
        count = len([t for t in tickets if t['category'] == cat])
        by_category.append({'name': cat, 'value': count})
    
    priorities = ['紧急', '高', '中', '低']
    by_priority = []
    for pri in priorities:
        count = len([t for t in tickets if t['priority'] == pri])
        by_priority.append({'name': pri, 'value': count})
    
    return jsonify({
        'total': total,
        'pending': pending,
        'byCategory': by_category,
        'byPriority': by_priority
    }), 200
