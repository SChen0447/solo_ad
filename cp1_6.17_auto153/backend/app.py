"""
Flask 应用主入口文件

数据流向总览：
前端请求 → app.py(路由分发) → routes/*_routes.py → services/*_service.py → models.py(数据模型)
                                                      ↓
                                            storage_service(存储)
                                                      ↓
                                            JSON文件持久化

模块调用关系：
- app.py: 注册所有蓝图路由，配置CORS，启动服务
- routes/: API路由层，接收HTTP请求，调用服务层
- services/: 业务逻辑层，实现核心功能
- models.py: 数据模型定义
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS

from routes.document_routes import document_bp
from routes.diff_routes import diff_bp
from routes.template_routes import template_bp
from routes.merge_routes import merge_bp


def create_app():
    app = Flask(__name__)

    CORS(app)

    app.register_blueprint(document_bp)
    app.register_blueprint(diff_bp)
    app.register_blueprint(template_bp)
    app.register_blueprint(merge_bp)

    @app.route("/api/health")
    def health_check():
        return {"status": "ok", "message": "Markdown Diff API is running"}

    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Not found"}, 404

    @app.errorhandler(500)
    def internal_error(e):
        return {"error": "Internal server error"}, 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
