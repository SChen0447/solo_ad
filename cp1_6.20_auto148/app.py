from flask import Flask
from flask_cors import CORS
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'src', '服务'))

from 工单管理服务.TicketService import ticket_bp
from 智能标签服务.ClassifierService import classifier_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(ticket_bp)
app.register_blueprint(classifier_bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    return {'status': 'ok', 'message': '服务运行正常'}

if __name__ == '__main__':
    print('🚀 工单管理系统后端服务启动中...')
    print('📋 API文档:')
    print('   POST   /api/tickets       - 创建工单')
    print('   GET    /api/tickets       - 获取工单列表')
    print('   GET    /api/tickets/:id   - 获取工单详情')
    print('   PUT    /api/tickets/:id   - 更新工单状态')
    print('   GET    /api/tickets/stats - 获取统计数据')
    print('   POST   /api/classify      - 智能分类')
    print('   GET    /api/health        - 健康检查')
    print('')
    print('🌐 服务地址: http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
