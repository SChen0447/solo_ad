from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import time
import random
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp'}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

history_db = {}
analysis_cache = {}

job_suggestions = [
    "前端开发工程师", "后端开发工程师", "全栈开发工程师",
    "Python开发工程师", "Java开发工程师", "JavaScript开发工程师",
    "数据分析师", "数据科学家", "机器学习工程师",
    "产品经理", "UI设计师", "UX设计师",
    "软件测试工程师", "DevOps工程师", "运维工程师",
    "数据库管理员", "网络安全工程师", "架构师",
    "移动开发工程师", "iOS开发工程师", "Android开发工程师"
]

skill_database = {
    "前端开发工程师": ["JavaScript", "TypeScript", "React", "Vue", "HTML", "CSS"],
    "后端开发工程师": ["Python", "Java", "Node.js", "SQL", "REST API", "系统设计"],
    "全栈开发工程师": ["JavaScript", "Python", "React", "Node.js", "SQL", "DevOps"],
    "Python开发工程师": ["Python", "Django", "Flask", "SQL", "数据结构", "算法"],
    "数据分析师": ["Python", "SQL", "Excel", "统计学", "数据可视化", "机器学习"],
    "数据科学家": ["Python", "机器学习", "深度学习", "统计学", "SQL", "TensorFlow"],
    "产品经理": ["需求分析", "项目管理", "用户研究", "数据分析", "原型设计", "沟通协调"],
    "UI设计师": ["Figma", "Sketch", "Photoshop", "设计规范", "用户体验", "响应式设计"]
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_mock_analysis(job_title, bio_text=""):
    skills = skill_database.get(job_title, ["编程能力", "沟通能力", "项目经验", "学历背景", "证书资质", "行业经验"])
    
    user_scores = []
    missing_skills = []
    
    for skill in skills:
        score = random.randint(40, 95)
        user_scores.append({"name": skill, "score": score})
        if score < 60:
            missing_skills.append(skill)
    
    overall_score = int(sum(s["score"] for s in user_scores) / len(user_scores))
    
    if bio_text:
        bio_boost = min(10, len(bio_text) // 100)
        overall_score = min(100, overall_score + bio_boost)
    
    suggestions = []
    
    if overall_score < 50:
        suggestions.append({
            "severity": "high",
            "title": "简历内容严重不足",
            "description": "您的简历缺少大量关键信息，建议补充工作经历、项目经验和技能详情。"
        })
    elif overall_score < 75:
        suggestions.append({
            "severity": "medium",
            "title": "简历内容需要优化",
            "description": "简历基本信息完整，但与目标岗位要求还有差距，建议突出相关经验。"
        })
    
    for skill in missing_skills:
        severity = "high" if skill in ["Python", "JavaScript", "Java", "SQL", "React"] else "medium"
        suggestions.append({
            "severity": severity,
            "title": f"缺少{skill}相关经验",
            "description": f"目标岗位要求{skill}技能，建议在简历中添加相关项目经历或自学证书。"
        })
    
    suggestions.append({
        "severity": "low",
        "title": "优化简历排版",
        "description": "建议使用简洁的简历模板，突出关键词，控制在1-2页。"
    })
    
    suggestions.append({
        "severity": "low",
        "title": "添加量化成果",
        "description": "在描述项目经历时，尽量使用数字来量化成果，如提升效率30%、用户增长50%等。"
    })
    
    return {
        "job_title": job_title,
        "skills": user_scores,
        "missing_skills": missing_skills,
        "overall_score": overall_score,
        "suggestions": suggestions,
        "extracted_info": {
            "name": "张同学",
            "education": "本科",
            "experience_years": random.randint(0, 8),
            "projects_count": random.randint(2, 10)
        }
    }


@app.route('/api/upload', methods=['POST'])
def upload_resume():
    if 'file' not in request.files:
        return jsonify({"error": "未找到文件"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "文件名为空"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "不支持的文件格式，请上传PDF或图片文件"}), 400
    
    if file.content_length and file.content_length > MAX_CONTENT_LENGTH:
        return jsonify({"error": "文件大小超过10MB限制"}), 400
    
    file_id = str(uuid.uuid4())
    filename = secure_filename(f"{file_id}_{file.filename}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    file_size = os.path.getsize(filepath)
    if file_size > MAX_CONTENT_LENGTH:
        os.remove(filepath)
        return jsonify({"error": "文件大小超过10MB限制"}), 400
    
    return jsonify({
        "file_id": file_id,
        "filename": file.filename,
        "message": "上传成功"
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_resume():
    data = request.get_json()
    file_id = data.get('file_id')
    job_title = data.get('job_title', '')
    bio_text = data.get('bio_text', '')
    
    if not file_id:
        return jsonify({"error": "缺少file_id"}), 400
    
    time.sleep(random.uniform(0.5, 2.0))
    
    analysis = generate_mock_analysis(job_title or "前端开发工程师", bio_text)
    analysis_id = str(uuid.uuid4())
    analysis["analysis_id"] = analysis_id
    analysis["created_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    
    analysis_cache[analysis_id] = analysis
    history_db[analysis_id] = analysis
    
    return jsonify(analysis)


@app.route('/api/history', methods=['GET'])
def get_history():
    history_list = []
    for analysis_id, data in history_db.items():
        history_list.append({
            "analysis_id": analysis_id,
            "job_title": data.get("job_title", ""),
            "overall_score": data.get("overall_score", 0),
            "created_at": data.get("created_at", "")
        })
    history_list.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify(history_list)


@app.route('/api/history/<analysis_id>', methods=['GET'])
def get_analysis_detail(analysis_id):
    if analysis_id in analysis_cache:
        return jsonify(analysis_cache[analysis_id])
    elif analysis_id in history_db:
        return jsonify(history_db[analysis_id])
    return jsonify({"error": "未找到分析记录"}), 404


@app.route('/api/suggestions', methods=['GET'])
def get_job_suggestions():
    query = request.args.get('q', '').lower()
    if query:
        filtered = [job for job in job_suggestions if query in job.lower()]
    else:
        filtered = job_suggestions
    return jsonify({"suggestions": filtered[:8]})


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
