from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import uuid
import os
from werkzeug.utils import secure_filename

from models import (
    PRODUCT_TRACES,
    CERTIFICATIONS,
    PRODUCERS,
    Producer,
    Certification
)

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/trace/<code>', methods=['GET'])
def get_trace(code):
    trace = PRODUCT_TRACES.get(code)
    if trace:
        return jsonify({
            'success': True,
            'data': trace.to_dict()
        })
    return jsonify({
        'success': False,
        'message': '未找到该追溯码对应的产品信息，请确认追溯码是否正确。'
    }), 404


@app.route('/cert/apply', methods=['POST'])
def apply_cert():
    try:
        form_data = request.form

        company_name = form_data.get('company_name', '').strip()
        registration_number = form_data.get('registration_number', '').strip()
        contact_person = form_data.get('contact_person', '').strip()
        phone = form_data.get('phone', '').strip()
        origin_description = form_data.get('origin_description', '').strip()

        if not all([company_name, registration_number, contact_person, phone, origin_description]):
            return jsonify({
                'success': False,
                'message': '请填写所有必填项'
            }), 400

        if len(origin_description) > 500:
            return jsonify({
                'success': False,
                'message': '产地描述不能超过500字'
            }), 400

        uploaded_files = []
        files = request.files.getlist('qualification_files')
        if len(files) > 5:
            return jsonify({
                'success': False,
                'message': '最多只能上传5个资质文件'
            }), 400

        for f in files:
            if f and allowed_file(f.filename):
                if f.content_length and f.content_length > MAX_CONTENT_LENGTH:
                    return jsonify({
                        'success': False,
                        'message': '单个文件大小不能超过5MB'
                    }), 400
                filename = secure_filename(f.filename)
                file_ext = filename.rsplit('.', 1)[1].lower()
                unique_name = f"{uuid.uuid4().hex}.{file_ext}"
                f.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_name))
                uploaded_files.append(filename)

        producer_id = max(PRODUCERS.keys(), default=0) + 1
        producer = Producer(
            id=producer_id,
            company_name=company_name,
            registration_number=registration_number,
            contact_person=contact_person,
            phone=phone,
            origin_description=origin_description,
            qualification_files=uploaded_files
        )
        PRODUCERS[producer_id] = producer

        cert_id = max(CERTIFICATIONS.keys(), default=0) + 1
        certification = Certification(
            id=cert_id,
            producer_id=producer_id,
            status='pending',
            submitted_at=datetime.now()
        )
        CERTIFICATIONS[cert_id] = certification

        return jsonify({
            'success': True,
            'message': '认证申请提交成功，请等待审核',
            'data': {
                'cert_id': cert_id,
                'status': 'pending'
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'提交失败：{str(e)}'
        }), 500


@app.route('/cert/list', methods=['GET'])
def list_certs():
    status_filter = request.args.get('status', None)
    result = []
    for cert in sorted(CERTIFICATIONS.values(), key=lambda x: x.submitted_at, reverse=True):
        if status_filter and cert.status != status_filter:
            continue
        result.append(cert.to_dict())
    return jsonify({
        'success': True,
        'data': result
    })


@app.route('/cert/approve', methods=['POST'])
def approve_cert():
    try:
        data = request.get_json()
        cert_id = data.get('cert_id')
        action = data.get('action')
        reviewer = data.get('reviewer', '系统管理员')
        reject_reason = data.get('reject_reason', None)

        if cert_id not in CERTIFICATIONS:
            return jsonify({
                'success': False,
                'message': '认证申请不存在'
            }), 404

        if action not in ['approve', 'reject']:
            return jsonify({
                'success': False,
                'message': '无效的操作类型'
            }), 400

        certification = CERTIFICATIONS[cert_id]

        if action == 'approve':
            certification.status = 'approved'
            certification.certificate_number = f"CERT{datetime.now().strftime('%Y%m%d%H%M%S')}"
        else:
            certification.status = 'rejected'
            certification.reject_reason = reject_reason

        certification.reviewed_at = datetime.now()
        certification.reviewer = reviewer

        return jsonify({
            'success': True,
            'message': f"审核{'通过' if action == 'approve' else '拒绝'}成功",
            'data': certification.to_dict()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'审核失败：{str(e)}'
        }), 500


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'message': '服务运行正常',
        'timestamp': datetime.now().isoformat()
    })


if __name__ == '__main__':
    print('=' * 60)
    print('农产品溯源与产地认证系统 - 后端服务启动中...')
    print('测试追溯码：')
    print('  202401010001 - 有机大米（已完成全流程）')
    print('  202401010002 - 新疆阿克苏冰糖心苹果（入库待确认）')
    print('  202401010003 - 云南普洱古树茶（已完成全流程）')
    print('=' * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
