from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import re
import io
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)


def extract_name(text):
    lines = text.strip().split('\n')
    name_patterns = [
        r'^姓\s*名[:：]\s*(.+)',
        r'^Name[:：]\s*(.+)',
    ]
    for line in lines[:10]:
        for pattern in name_patterns:
            match = re.search(pattern, line.strip())
            if match:
                return match.group(1).strip()
    if lines:
        first_line = lines[0].strip()
        if len(first_line) <= 10 and not re.search(r'[@|@|\d]', first_line):
            return first_line
    return "未知姓名"


def extract_email(text):
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    match = re.search(pattern, text)
    return match.group(0) if match else ""


def extract_phone(text):
    patterns = [
        r'1[3-9]\d{9}',
        r'\d{3,4}[-\s]?\d{7,8}',
        r'电\s*话[:：]\s*([\d\s-]+)',
        r'手\s*机[:：]\s*([\d\s-]+)',
        r'Phone[:：]\s*([\d\s-]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            phone = match.group(1) if match.groups() else match.group(0)
            return phone.strip()
    return ""


def extract_date_range(text):
    patterns = [
        r'(\d{4}[\.\-/年]\s*\d{1,2}[\.\-/月]?)\s*[-~至到]\s*(\d{4}[\.\-/年]\s*\d{1,2}[\.\-/月]?|至今|现在)',
        r'(\d{4})\s*[-~至到]\s*(\d{4}|至今|现在)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip(), match.group(2).strip()
    return None, None


def extract_section(text, section_names):
    lines = text.split('\n')
    section_start = -1
    section_end = len(lines)
    
    all_sections = [
        '工作', '工作经验', '工作经历', '从业经历', '职业经历', 'Work Experience', 'Experience',
        '教育', '教育背景', '教育经历', 'Education', '学历',
        '项目', '项目经验', '项目经历', 'Projects', 'Project',
        '技能', '专业技能', '技术栈', 'Skills', 'Skill', '技术',
        '个人信息', '基本信息', '联系方式', 'Personal', 'Profile',
    ]
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        for name in section_names:
            if re.match(r'^[=\-\s]*' + re.escape(name) + r'[=\-\s:：]*$', stripped) or \
               stripped.startswith(name) or stripped.endswith(name):
                section_start = i + 1
                break
        if section_start >= 0:
            break
    
    if section_start < 0:
        return ""
    
    for i in range(section_start, len(lines)):
        stripped = lines[i].strip()
        if i > section_start:
            for sec in all_sections:
                if re.match(r'^[=\-\s]*' + re.escape(sec) + r'[=\-\s:：]*$', stripped) or \
                   (stripped.startswith(sec) and len(stripped) < 20):
                    section_end = i
                    return '\n'.join(lines[section_start:section_end]).strip()
    
    return '\n'.join(lines[section_start:section_end]).strip()


def parse_work_experience(section_text):
    experiences = []
    if not section_text:
        return experiences
    
    blocks = re.split(r'\n\s*\n', section_text.strip())
    
    for block in blocks:
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if not lines:
            continue
        
        company = ""
        position = ""
        start_date = ""
        end_date = ""
        description = []
        highlights = []
        
        first_line = lines[0]
        start_date, end_date = extract_date_range(first_line)
        
        if start_date:
            remaining = re.sub(r'(\d{4}[\.\-/年]\s*\d{0,2}[\.\-/月]?)\s*[-~至到]\s*(\d{4}[\.\-/年]\s*\d{0,2}[\.\-/月]?|至今|现在)[\s,，]*', '', first_line).strip()
        else:
            remaining = first_line
        
        parts = re.split(r'[\s,，/／|｜\-]+', remaining, maxsplit=1)
        if len(parts) >= 1:
            company = parts[0].strip()
        if len(parts) >= 2:
            position = parts[1].strip()
        
        for line in lines[1:]:
            line_stripped = line.strip()
            if re.match(r'^[-•●○▪▸◆·]', line_stripped) or re.match(r'^\d+[\.、)]', line_stripped):
                clean_line = re.sub(r'^[-•●○▪▸◆·\s]+', '', line_stripped)
                clean_line = re.sub(r'^\d+[\.、)]\s*', '', clean_line)
                if any(keyword in clean_line for keyword in ['提升', '优化', '实现', '完成', '主导', '负责', '获得', '通过', '降低', '增加']):
                    highlights.append(clean_line)
                else:
                    description.append(clean_line)
            elif line_stripped:
                if not position and (any(k in line_stripped for k in ['工程师', '经理', '主管', '专员', '总监', '设计师', '开发'])):
                    position = line_stripped
                elif not company and len(line_stripped) < 30:
                    company = line_stripped
                else:
                    if any(keyword in line_stripped for keyword in ['提升', '优化', '实现', '完成', '主导', '负责', '获得', '通过', '降低', '增加']):
                        highlights.append(line_stripped)
                    else:
                        description.append(line_stripped)
        
        if company or position:
            experiences.append({
                "company": company,
                "position": position,
                "startDate": start_date,
                "endDate": end_date,
                "description": description,
                "highlights": highlights
            })
    
    return experiences


def parse_education(section_text):
    education = []
    if not section_text:
        return education
    
    lines = [l.strip() for l in section_text.split('\n') if l.strip()]
    current = None
    
    for line in lines:
        start_date, end_date = extract_date_range(line)
        if start_date or current is None:
            if current and (current.get('school') or current.get('degree')):
                education.append(current)
            current = {
                "school": "",
                "degree": "",
                "major": "",
                "startDate": start_date or "",
                "endDate": end_date or "",
                "description": ""
            }
            remaining = line
            if start_date:
                remaining = re.sub(r'(\d{4}[\.\-/年]\s*\d{0,2}[\.\-/月]?)\s*[-~至到]\s*(\d{4}[\.\-/年]\s*\d{0,2}[\.\-/月]?|至今|现在)[\s,，]*', '', line).strip()
            
            parts = re.split(r'[\s,，/／|｜\-]+', remaining)
            for part in parts:
                part = part.strip()
                if not part:
                    continue
                if any(k in part for k in ['大学', '学院', '学校', 'University', 'College', 'Institute']):
                    current['school'] = part
                elif any(k in part for k in ['学士', '硕士', '博士', '本科', '研究生', '大专', 'Bachelor', 'Master', 'PhD', 'Doctor']):
                    current['degree'] = part
                elif any(k in part for k in ['专业', '工程', '管理', '计算机', '科学', '技术']):
                    current['major'] = part
        else:
            if current:
                if not current['school'] and any(k in line for k in ['大学', '学院', '学校', 'University', 'College']):
                    current['school'] = line
                elif not current['degree'] and any(k in line for k in ['学士', '硕士', '博士', '本科', '研究生']):
                    current['degree'] = line
                elif not current['major']:
                    current['major'] = line
                else:
                    current['description'] = line if not current['description'] else current['description'] + ' ' + line
    
    if current and (current.get('school') or current.get('degree')):
        education.append(current)
    
    return education


def parse_projects(section_text):
    projects = []
    if not section_text:
        return projects
    
    blocks = re.split(r'\n\s*\n', section_text.strip())
    
    for block in blocks:
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if not lines:
            continue
        
        name = ""
        role = ""
        start_date = ""
        end_date = ""
        description = []
        tech_stack = []
        
        first_line = lines[0]
        start_date, end_date = extract_date_range(first_line)
        
        if start_date:
            remaining = re.sub(r'(\d{4}[\.\-/年]\s*\d{0,2}[\.\-/月]?)\s*[-~至到]\s*(\d{4}[\.\-/年]\s*\d{0,2}[\.\-/月]?|至今|现在)[\s,，]*', '', first_line).strip()
        else:
            remaining = first_line
        
        parts = re.split(r'[\s,，/／|｜\-]+', remaining, maxsplit=1)
        if len(parts) >= 1:
            name = parts[0].strip()
        if len(parts) >= 2:
            role = parts[1].strip()
        
        for line in lines[1:]:
            line_stripped = line.strip()
            tech_match = re.search(r'[技技]?术\s*栈[:：]\s*(.+)', line_stripped)
            if tech_match:
                techs = re.split(r'[,，、/／|｜\s]+', tech_match.group(1).strip())
                tech_stack = [t for t in techs if t]
                continue
            
            if re.match(r'^[-•●○▪▸◆·]', line_stripped) or re.match(r'^\d+[\.、)]', line_stripped):
                clean_line = re.sub(r'^[-•●○▪▸◆·\s]+', '', line_stripped)
                clean_line = re.sub(r'^\d+[\.、)]\s*', '', clean_line)
                description.append(clean_line)
            elif any(k in line_stripped for k in ['负责', '开发', '设计', '实现', '参与', '主导']) and not role:
                role = line_stripped
            elif line_stripped:
                if not name or len(name) < 3:
                    name = line_stripped
                else:
                    description.append(line_stripped)
        
        if name:
            projects.append({
                "name": name,
                "role": role,
                "startDate": start_date,
                "endDate": end_date,
                "description": description,
                "techStack": tech_stack
            })
    
    return projects


def parse_skills(section_text, full_text):
    skills = set()
    
    tech_keywords = [
        'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
        'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Spring Boot',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server', 'Elasticsearch',
        'Docker', 'Kubernetes', 'K8s', 'AWS', '阿里云', '腾讯云', 'Linux', 'Git', 'Nginx',
        'HTML', 'CSS', 'SCSS', 'Less', 'Webpack', 'Vite', 'Rollup',
        'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
        '微服务', '分布式', '高并发', '性能优化', '敏捷开发', 'DevOps', 'CI/CD',
    ]
    
    text_to_search = (section_text + " " + full_text).lower()
    
    for keyword in tech_keywords:
        if keyword.lower() in text_to_search:
            skills.add(keyword)
    
    if section_text:
        lines = section_text.split('\n')
        for line in lines:
            line = line.strip()
            line = re.sub(r'^[技技]?能\s*[:：]\s*', '', line)
            line = re.sub(r'^专业技能\s*[:：]\s*', '', line)
            
            separators = r'[,，、/／|｜\s]+'
            items = re.split(separators, line)
            for item in items:
                item = item.strip()
                if len(item) >= 2 and len(item) <= 30:
                    if not re.match(r'^[0-9]+$', item):
                        skills.add(item)
    
    return sorted(list(skills))


def parse_address(text):
    patterns = [
        r'地\s*址[:：]\s*(.+)',
        r'Address[:：]\s*(.+)',
        r'居\s*住\s*地[:：]\s*(.+)',
        r'(北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆|苏州|天津|长沙|郑州|青岛|宁波|厦门|合肥|福州|济南|大连|沈阳|哈尔滨)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip() if match.groups() else match.group(0)
    return ""


def parse_age(text):
    patterns = [
        r'年\s*龄[:：]\s*(\d+)\s*岁?',
        r'Age[:：]\s*(\d+)',
        r'(\d{4})\s*年\s*\d{1,2}\s*月\s*[出生]',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            val = match.group(1)
            if pattern == patterns[2]:
                try:
                    birth_year = int(val)
                    current_year = datetime.now().year
                    return str(current_year - birth_year)
                except:
                    pass
            return val
    return ""


@app.route('/parse', methods=['POST'])
def parse_resume():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "缺少简历文本"}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({"error": "简历文本为空"}), 400
        
        name = extract_name(text)
        email = extract_email(text)
        phone = extract_phone(text)
        address = parse_address(text)
        age = parse_age(text)
        
        work_section = extract_section(text, ['工作', '工作经验', '工作经历', '从业经历', '职业经历', 'Work Experience', 'Experience'])
        education_section = extract_section(text, ['教育', '教育背景', '教育经历', 'Education', '学历'])
        project_section = extract_section(text, ['项目', '项目经验', '项目经历', 'Projects', 'Project'])
        skill_section = extract_section(text, ['技能', '专业技能', '技术栈', 'Skills', 'Skill', '技术'])
        
        work_experience = parse_work_experience(work_section)
        education = parse_education(education_section)
        projects = parse_projects(project_section)
        skills = parse_skills(skill_section, text)
        
        if not work_experience and not education and not projects:
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            if len(lines) > 3:
                work_experience = parse_work_experience('\n\n'.join(lines[2:]))
        
        result = {
            "personalInfo": {
                "name": name,
                "email": email,
                "phone": phone,
                "address": address,
                "age": age,
                "avatar": "",
                "title": ""
            },
            "workExperience": work_experience,
            "education": education,
            "projects": projects,
            "skills": skills
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": f"解析失败: {str(e)}"}), 500


@app.route('/export', methods=['POST'])
def export_pdf():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "缺少导出数据"}), 400
        
        resume_data = data.get('resumeData', {})
        theme = data.get('theme', {})
        module_order = data.get('moduleOrder', [])
        
        result = {
            "status": "success",
            "message": "导出配置已接收",
            "data": {
                "resumeData": resume_data,
                "theme": theme,
                "moduleOrder": module_order,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": f"导出失败: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
