import os
import sys
import io
import zipfile
import time
from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from models import init_db, Project, Component, Version

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ui-collab-secret-key'
CORS(app, resources={r'/*': {'origins': '*'}})
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

init_db()

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json() or {}
    name = data.get('name', f'未命名项目-{datetime.now().strftime("%Y%m%d%H%M%S")}')
    project = Project.create(name)
    default_components = [
        {'type': 'Button', 'name': '默认按钮', 'width': 120, 'height': 44, 'x': 100, 'y': 100,
         'styles': {'backgroundColor': '#89b4fa', 'color': '#1e1e2e', 'borderRadius': '8px', 'fontSize': '14px', 'fontWeight': '600'},
         'props': {'text': '按钮', 'variant': 'primary'}},
        {'type': 'Input', 'name': '文本输入框', 'width': 280, 'height': 44, 'x': 100, 'y': 200,
         'styles': {'backgroundColor': '#45475a', 'color': '#cdd6f4', 'borderRadius': '8px', 'fontSize': '14px', 'border': '1px solid #585b70'},
         'props': {'placeholder': '请输入内容', 'type': 'text'}},
        {'type': 'Card', 'name': '卡片容器', 'width': 320, 'height': 200, 'x': 500, 'y': 100,
         'styles': {'backgroundColor': '#313244', 'color': '#cdd6f4', 'borderRadius': '12px', 'padding': '20px', 'boxShadow': '0 4px 12px rgba(0,0,0,0.2)'},
         'props': {'title': '卡片标题'}},
        {'type': 'Modal', 'name': '模态框', 'width': 480, 'height': 300, 'x': 100, 'y': 450,
         'styles': {'backgroundColor': '#313244', 'color': '#cdd6f4', 'borderRadius': '16px', 'padding': '24px', 'boxShadow': '0 8px 32px rgba(0,0,0,0.4)'},
         'props': {'title': '模态框标题', 'showClose': True}}
    ]
    for comp in default_components:
        Component.create(project.id, comp['type'], comp['name'], comp['x'], comp['y'],
                         comp['width'], comp['height'], comp['styles'], comp['props'])
    Version.create(project.id, 'system')
    return jsonify(project.to_dict()), 201

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.get_by_id(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    components = [c.to_dict() for c in Component.get_by_project(project_id)]
    return jsonify({
        'project': project.to_dict(),
        'components': components
    })

@app.route('/api/projects/<project_id>/components', methods=['GET'])
def get_components(project_id):
    components = [c.to_dict() for c in Component.get_by_project(project_id)]
    return jsonify(components)

@app.route('/api/projects/<project_id>/components', methods=['POST'])
def add_component(project_id):
    project = Project.get_by_id(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    data = request.get_json() or {}
    component = Component.create(
        project_id,
        data.get('type', 'Button'),
        data.get('name', '新组件'),
        data.get('x', 100),
        data.get('y', 100),
        data.get('width', 200),
        data.get('height', 100),
        data.get('styles', {}),
        data.get('props', {})
    )
    Version.create(project_id, data.get('author', 'unknown'))
    socketio.emit('component:added', {'component': component.to_dict(), 'projectId': project_id}, room=project_id)
    return jsonify(component.to_dict()), 201

@app.route('/api/components/<component_id>', methods=['PUT'])
def update_component(component_id):
    data = request.get_json() or {}
    component = Component.update(component_id, **data)
    if not component:
        return jsonify({'error': '组件不存在'}), 404
    Version.create(component.project_id, data.get('author', 'unknown'))
    socketio.emit('component:updated', {'component': component.to_dict(), 'projectId': component.project_id}, room=component.project_id)
    return jsonify(component.to_dict())

@app.route('/api/components/<component_id>', methods=['DELETE'])
def delete_component(component_id):
    component = Component.get_by_id(component_id)
    if not component:
        return jsonify({'error': '组件不存在'}), 404
    success = Component.delete(component_id)
    if success:
        Version.create(component.project_id, 'unknown')
        socketio.emit('component:deleted', {'componentId': component_id, 'projectId': component.project_id}, room=component.project_id)
    return jsonify({'success': success})

@app.route('/api/projects/<project_id>/versions', methods=['GET'])
def get_versions(project_id):
    versions = [v.to_dict() for v in Version.get_by_project(project_id)]
    return jsonify(versions)

@app.route('/api/versions/<version_id>/restore', methods=['POST'])
def restore_version(version_id):
    success = Version.restore(version_id)
    if not success:
        return jsonify({'error': '版本不存在'}), 404
    version = Version.get_by_id(version_id)
    socketio.emit('version:restored', {'projectId': version.project_id, 'versionId': version_id}, room=version.project_id)
    return jsonify({'success': True})

def generate_component_code(component):
    type_map = {
        'Button': 'button',
        'Input': 'input',
        'Card': 'div',
        'Modal': 'div'
    }
    tag = type_map.get(component['type'], 'div')
    component_name = component['name'] or component['type']
    safe_name = ''.join(c if c.isalnum() or c == '_' else '_' for c in component_name)
    if not safe_name[0].isalpha():
        safe_name = 'Comp_' + safe_name
    
    jsx_content = f'''import React from 'react';
import styles from './{safe_name}.module.css';

export interface {safe_name}Props {{
  text?: string;
  placeholder?: string;
  type?: string;
  title?: string;
  showClose?: boolean;
  variant?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}}

export const {safe_name}: React.FC<{safe_name}Props> = ({{
  text = '{component.get('props', {}).get('text', '')}',
  placeholder = '{component.get('props', {}).get('placeholder', '')}',
  type = '{component.get('props', {}).get('type', 'text')}',
  title = '{component.get('props', {}).get('title', '')}',
  showClose = {str(component.get('props', {}).get('showClose', False)).lower()},
  variant = '{component.get('props', {}).get('variant', 'primary')}',
  children,
  onClick,
}}) => {{
'''
    
    if component['type'] == 'Button':
        jsx_content += f'''  return (
    <{tag} className={{styles.{safe_name}}} onClick={{onClick}}>
      {{text || children}}
    </{tag}>
  );
}};
'''
    elif component['type'] == 'Input':
        jsx_content += f'''  return (
    <{tag}
      className={{styles.{safe_name}}}
      type={{type}}
      placeholder={{placeholder}}
    />
  );
}};
'''
    elif component['type'] == 'Card':
        jsx_content += f'''  return (
    <{tag} className={{styles.{safe_name}}}>
      {{title && <h3 className={{styles.{safe_name}Title}}>{{title}}</h3>}}
      <div className={{styles.{safe_name}Content}}>
        {{children}}
      </div>
    </{tag}>
  );
}};
'''
    elif component['type'] == 'Modal':
        jsx_content += f'''  return (
    <{tag} className={{styles.{safe_name}}}>
      {{title && (
        <div className={{styles.{safe_name}Header}}>
          <h3 className={{styles.{safe_name}Title}}>{{title}}</h3>
          {{showClose && <button className={{styles.{safe_name}Close}}>×</button>}}
        </div>
      )}}
      <div className={{styles.{safe_name}Body}}>
        {{children}}
      </div>
    </{tag}>
  );
}};
'''
    else:
        jsx_content += f'''  return (
    <{tag} className={{styles.{safe_name}}}>
      {{children || title}}
    </{tag}>
  );
}};
'''
    
    jsx_content += f'''
export default {safe_name};
'''
    
    styles_content = f'''.{safe_name} {{
'''
    for key, value in (component.get('styles') or {}).items():
        css_key = ''.join(['-' + c.lower() if c.isupper() else c for c in key]).lstrip('-')
        styles_content += f'  {css_key}: {value};\n'
    
    default_styles = {
        'width': f"{component['width']}px",
        'height': f"{component['height']}px",
        'display': 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
        'box-sizing': 'border-box',
        'cursor': 'pointer',
        'transition': 'all 0.2s ease',
    }
    for key, value in default_styles.items():
        has_key = any(
            ''.join(['-' + c.lower() if c.isupper() else c for c in k]).lstrip('-') == key
            for k in (component.get('styles') or {}).keys()
        )
        if not has_key:
            styles_content += f'  {key}: {value};\n'
    
    styles_content += '}\n'
    styles_content += f'''
.{safe_name}:hover {{
  opacity: 0.9;
}}

.{safe_name}:active {{
  transform: scale(0.98);
}}
'''
    
    if component['type'] in ('Card', 'Modal'):
        styles_content += f'''
.{safe_name}Title {{
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
}}

.{safe_name}Content, .{safe_name}Body {{
  flex: 1;
}}
'''
    
    if component['type'] == 'Modal':
        styles_content += f'''
.{safe_name}Header {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}}

.{safe_name}Close {{
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: inherit;
  padding: 0;
  line-height: 1;
}}
'''
    
    return jsx_content, styles_content, safe_name

@app.route('/api/projects/<project_id>/export', methods=['POST'])
def export_project(project_id):
    project = Project.get_by_id(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    
    components = Component.get_by_project(project_id)
    time.sleep(0.5)
    
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        index_content = "// 组件库入口文件\nexport * from './components';\n"
        zf.writestr('index.ts', index_content)
        
        barrel_content = "// 组件模块导出\n"
        for comp in components:
            comp_dict = comp.to_dict()
            _, _, safe_name = generate_component_code(comp_dict)
            barrel_content += f"export {{ {safe_name}, type {safe_name}Props }} from './{safe_name}';\n"
        zf.writestr('components/index.ts', barrel_content)
        
        for comp in components:
            comp_dict = comp.to_dict()
            jsx_content, styles_content, safe_name = generate_component_code(comp_dict)
            zf.writestr(f'components/{safe_name}/{safe_name}.tsx', jsx_content)
            zf.writestr(f'components/{safe_name}/{safe_name}.module.css', styles_content)
        
        readme_content = f'''# {project.name} 组件库

基于 React + TypeScript + CSS Modules 的 UI 组件库。

## 安装依赖

```bash
npm install
```

## 使用组件

```tsx
import {{ {components[0].name if components else 'Component'} }} from './components';

function App() {{
  return <{components[0].name if components else 'Component'} />;
}}
```

## 组件列表

'''
        for comp in components:
            readme_content += f'- **{comp.name}** ({comp.type}): {comp.width}x{comp.height}\n'
        
        zf.writestr('README.md', readme_content)
    
    memory_file.seek(0)
    safe_project_name = ''.join(c if c.isalnum() or c in '-_' else '_' for c in project.name)
    return send_file(
        memory_file,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'{safe_project_name}_components.zip'
    )

@socketio.on('join:project')
def handle_join_project(data):
    project_id = data.get('projectId')
    user_id = data.get('userId')
    username = data.get('username', '匿名用户')
    if project_id:
        join_room(project_id)
        emit('user:joined', {'userId': user_id, 'username': username, 'projectId': project_id}, room=project_id)

@socketio.on('leave:project')
def handle_leave_project(data):
    project_id = data.get('projectId')
    user_id = data.get('userId')
    username = data.get('username', '匿名用户')
    if project_id:
        leave_room(project_id)
        emit('user:left', {'userId': user_id, 'username': username, 'projectId': project_id}, room=project_id)

@socketio.on('cursor:move')
def handle_cursor_move(data):
    project_id = data.get('projectId')
    if project_id:
        emit('cursor:update', data, room=project_id, include_self=False)

@socketio.on('component:drag')
def handle_component_drag(data):
    project_id = data.get('projectId')
    if project_id:
        emit('component:dragupdate', data, room=project_id, include_self=False)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
