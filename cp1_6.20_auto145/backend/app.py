import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS

import routes
from websocket import socketio, setup_websocket_handlers, start_stats_background_thread, broadcast_new_answer, broadcast_survey_closed
import models


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'survey-collaboration-platform-secret-key-2024'

    CORS(app, resources={
        r"/api/*": {"origins": "*"},
        r"/socket.io/*": {"origins": "*"}
    })

    app.register_blueprint(routes.bp)

    socketio.init_app(app, cors_allowed_origins="*")
    setup_websocket_handlers()
    start_stats_background_thread(app)

    @app.route('/health', methods=['GET'])
    def health_check():
        return {'status': 'ok', 'service': 'survey-platform-backend'}

    return app


app = create_app()


@app.after_request
def after_request_hook(response):
    try:
        from flask import request as flask_request
        path = flask_request.path
        method = flask_request.method
        if method == 'POST' and '/responses' in path and response.status_code in (200, 201):
            import json
            try:
                resp_data = json.loads(response.get_data(as_text=True))
                if resp_data.get('success') and 'response' in resp_data:
                    parts = path.strip('/').split('/')
                    if len(parts) >= 3:
                        sid = parts[2]
                        broadcast_new_answer(sid, resp_data['response'])
            except Exception:
                pass
        if method == 'DELETE' and '/api/surveys/' in path and response.status_code in (200, 204):
            parts = path.strip('/').split('/')
            if len(parts) >= 3:
                sid = parts[2]
                broadcast_survey_closed(sid, reason='deleted')
        if method == 'POST' and '/close' in path and response.status_code in (200, 201):
            import json
            try:
                resp_data = json.loads(response.get_data(as_text=True))
                if resp_data.get('success'):
                    parts = path.strip('/').split('/')
                    if len(parts) >= 3:
                        sid = parts[2]
                        broadcast_survey_closed(sid, reason='closed')
            except Exception:
                pass
    except Exception:
        pass
    return response


if __name__ == '__main__':
    print('=' * 60)
    print('  Survey Collaboration Platform Backend')
    print('  Starting server on http://localhost:5000')
    print('  WebSocket enabled on port 5000')
    print('=' * 60)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
