import os
import json
import time
import uuid
import random
import io
import base64
from datetime import datetime
from typing import Dict, List, Optional

from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
import csv
from io import StringIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'analytics-collab-secret'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

projects: Dict[str, Dict] = {}
users: Dict[str, Dict] = {}
project_data: Dict[str, Dict] = {}

USER_COLORS = [
    '#569cd6',
    '#c586c0',
    '#dcdcaa',
    '#f44747',
    '#6a9955',
    '#ce9178',
]

DEFAULT_CODE = """# 数据分析项目
# 在此编写您的R代码

# 示例：计算统计数据
data <- c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
mean_val <- mean(data)
sd_val <- sd(data)

cat("平均值:", mean_val, "\\n")
cat("标准差:", sd_val, "\\n")

# 示例：创建数据框
df <- data.frame(
    name = c("Alice", "Bob", "Charlie", "Diana"),
    age = c(25, 30, 35, 28),
    score = c(85, 92, 78, 95)
)

print(df)
"""


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})


@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        project_id = request.form.get('project_id', 'default')

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'Only CSV files are allowed'}), 400

        content = file.read().decode('utf-8')
        csv_data = parse_csv(content)

        if project_id not in project_data:
            project_data[project_id] = {}

        project_data[project_id][file.filename] = {
            'filename': file.filename,
            'columns': csv_data['columns'],
            'column_types': csv_data['column_types'],
            'rows': csv_data['rows'],
            'total_rows': csv_data['total_rows'],
            'upload_time': datetime.now().isoformat()
        }

        return jsonify({
            'success': True,
            'filename': file.filename,
            'columns': csv_data['columns'],
            'column_types': csv_data['column_types'],
            'rows': csv_data['rows'],
            'total_rows': csv_data['total_rows']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/datasets/<project_id>', methods=['GET'])
def get_datasets(project_id):
    datasets = project_data.get(project_id, {})
    return jsonify({
        'datasets': list(datasets.keys()),
        'data': datasets
    })


@app.route('/api/dataset/<project_id>/<filename>', methods=['GET'])
def get_dataset(project_id, filename):
    if project_id not in project_data or filename not in project_data[project_id]:
        return jsonify({'error': 'Dataset not found'}), 404
    return jsonify(project_data[project_id][filename])


def parse_csv(content: str) -> Dict:
    f = StringIO(content)
    reader = csv.reader(f)
    rows = list(reader)

    if len(rows) == 0:
        return {'columns': [], 'column_types': [], 'rows': [], 'total_rows': 0}

    columns = rows[0]
    data_rows = rows[1:] if len(rows) > 1 else []

    column_types = infer_column_types(columns, data_rows)
    display_rows = data_rows[:100]

    return {
        'columns': columns,
        'column_types': column_types,
        'rows': [dict(zip(columns, row)) for row in display_rows],
        'total_rows': len(data_rows)
    }


def infer_column_types(columns: List[str], rows: List[List[str]]) -> List[str]:
    types = []
    for i in range(len(columns)):
        col_values = [row[i] for row in rows if i < len(row) and row[i]]
        col_type = 'string'

        if len(col_values) > 0:
            is_numeric = True
            is_date = True
            for val in col_values[:20]:
                try:
                    float(val)
                except ValueError:
                    is_numeric = False
                    break

            if not is_numeric:
                date_formats = [
                    '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y',
                    '%Y-%m-%d %H:%M:%S', '%d-%m-%Y'
                ]
                is_date = False
                for fmt in date_formats:
                    try:
                        datetime.strptime(col_values[0], fmt)
                        is_date = True
                        break
                    except ValueError:
                        continue

            if is_numeric:
                col_type = 'number'
            elif is_date:
                col_type = 'date'

        types.append(col_type)

    return types


def execute_r_code(code: str, project_id: str) -> Dict:
    time.sleep(0.3)

    output_lines = []
    html_output = None
    error = None

    try:
        lines = code.split('\n')
        output_lines.append(f'> R 代码执行中...')
        output_lines.append(f'> 共 {len(lines)} 行代码')
        output_lines.append('')

        output_lines.append('[1] "执行成功"')
        output_lines.append('')
        output_lines.append('--- 模拟输出 ---')
        output_lines.append(f'mean_val = 5.5')
        output_lines.append(f'sd_val = 3.02765')
        output_lines.append('')
        output_lines.append('   name age score')
        output_lines.append('1  Alice  25    85')
        output_lines.append('2    Bob  30    92')
        output_lines.append('3 Charlie  35    78')
        output_lines.append('4  Diana  28    95')
        output_lines.append('')
        output_lines.append('> 执行完成')

        if 'plot' in code.lower() or 'hist' in code.lower():
            html_output = generate_mock_plot()

    except Exception as e:
        error = f'Error: {str(e)}'

    return {
        'text': '\n'.join(output_lines),
        'html': html_output,
        'error': error,
        'duration': 0.3
    }


def generate_mock_plot() -> str:
    import base64
    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#ffffff"/>
  <line x1="60" y1="250" x2="380" y2="250" stroke="#333" stroke-width="1"/>
  <line x1="60" y1="50" x2="60" y2="250" stroke="#333" stroke-width="1"/>
  <rect x="80" y="180" width="40" height="70" fill="#569cd6" opacity="0.8"/>
  <rect x="140" y="120" width="40" height="130" fill="#c586c0" opacity="0.8"/>
  <rect x="200" y="100" width="40" height="150" fill="#dcdcaa" opacity="0.8"/>
  <rect x="260" y="150" width="40" height="100" fill="#6a9955" opacity="0.8"/>
  <rect x="320" y="80" width="40" height="170" fill="#ce9178" opacity="0.8"/>
  <text x="100" y="270" text-anchor="middle" font-size="12" fill="#333">A</text>
  <text x="160" y="270" text-anchor="middle" font-size="12" fill="#333">B</text>
  <text x="220" y="270" text-anchor="middle" font-size="12" fill="#333">C</text>
  <text x="280" y="270" text-anchor="middle" font-size="12" fill="#333">D</text>
  <text x="340" y="270" text-anchor="middle" font-size="12" fill="#333">E</text>
  <text x="200" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">模拟图表</text>
</svg>'''
    encoded = base64.b64encode(svg_content.encode()).decode()
    return f'<img src="data:image/svg+xml;base64,{encoded}" alt="Plot"/>'


@socketio.on('join_project')
def handle_join_project(data):
    project_id = data.get('project_id', 'default')
    user_id = data.get('user_id')
    username = data.get('username', '匿名用户')

    if not user_id:
        user_id = str(uuid.uuid4())

    join_room(project_id)

    if project_id not in projects:
        projects[project_id] = {
            'id': project_id,
            'code': DEFAULT_CODE,
            'users': {},
            'files': ['main.R'],
            'current_file': 'main.R'
        }

    color = random.choice(USER_COLORS)
    user_data = {
        'id': user_id,
        'username': username,
        'color': color,
        'cursor': {'line': 0, 'column': 0},
        'selection': None,
        'last_active': time.time()
    }

    projects[project_id]['users'][user_id] = user_data
    users[request.sid] = {'user_id': user_id, 'project_id': project_id}

    emit('user_joined', {
        'user': user_data,
        'users': list(projects[project_id]['users'].values())
    }, room=project_id)

    emit('project_state', {
        'code': projects[project_id]['code'],
        'users': list(projects[project_id]['users'].values()),
        'files': projects[project_id]['files'],
        'current_file': projects[project_id]['current_file']
    }, room=request.sid)


@socketio.on('leave_project')
def handle_leave_project(data):
    project_id = data.get('project_id', 'default')
    user_id = data.get('user_id')

    if project_id in projects and user_id in projects[project_id]['users']:
        del projects[project_id]['users'][user_id]
        leave_room(project_id)

        emit('user_left', {
            'user_id': user_id,
            'users': list(projects[project_id]['users'].values())
        }, room=project_id)


@socketio.on('code_change')
def handle_code_change(data):
    project_id = data.get('project_id', 'default')
    user_id = data.get('user_id')
    new_code = data.get('code', '')
    changes = data.get('changes', [])

    if project_id in projects:
        projects[project_id]['code'] = new_code

        emit('code_update', {
            'code': new_code,
            'user_id': user_id,
            'changes': changes
        }, room=project_id, include_self=False)


@socketio.on('cursor_change')
def handle_cursor_change(data):
    project_id = data.get('project_id', 'default')
    user_id = data.get('user_id')
    cursor = data.get('cursor', {})
    selection = data.get('selection')

    if project_id in projects and user_id in projects[project_id]['users']:
        projects[project_id]['users'][user_id]['cursor'] = cursor
        projects[project_id]['users'][user_id]['selection'] = selection
        projects[project_id]['users'][user_id]['last_active'] = time.time()

        emit('cursor_update', {
            'user_id': user_id,
            'cursor': cursor,
            'selection': selection
        }, room=project_id, include_self=False)


@socketio.on('run_code')
def handle_run_code(data):
    project_id = data.get('project_id', 'default')
    code = data.get('code', '')
    user_id = data.get('user_id')

    result = execute_r_code(code, project_id)

    emit('code_result', {
        'result': result,
        'user_id': user_id
    }, room=request.sid)


@socketio.on('add_file')
def handle_add_file(data):
    project_id = data.get('project_id', 'default')
    filename = data.get('filename', '')

    if project_id in projects and filename:
        if filename not in projects[project_id]['files']:
            projects[project_id]['files'].append(filename)
            emit('file_added', {
                'filename': filename,
                'files': projects[project_id]['files']
            }, room=project_id)


@socketio.on('delete_file')
def handle_delete_file(data):
    project_id = data.get('project_id', 'default')
    filename = data.get('filename', '')

    if project_id in projects and filename in projects[project_id]['files']:
        projects[project_id]['files'].remove(filename)
        emit('file_deleted', {
            'filename': filename,
            'files': projects[project_id]['files']
        }, room=project_id)


@socketio.on('disconnect')
def handle_disconnect():
    user_info = users.get(request.sid)
    if user_info:
        project_id = user_info['project_id']
        user_id = user_info['user_id']

        if project_id in projects and user_id in projects[project_id]['users']:
            del projects[project_id]['users'][user_id]

            emit('user_left', {
                'user_id': user_id,
                'users': list(projects[project_id]['users'].values())
            }, room=project_id)

        del users[request.sid]


if __name__ == '__main__':
    print('Starting Analytics Collab server...')
    print('REST API: http://localhost:5000')
    print('WebSocket: ws://localhost:5000')
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
