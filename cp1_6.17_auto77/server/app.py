import base64
import io
import time
import random
import math
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


class ImagePreprocessor:
    @staticmethod
    def to_grayscale(image_data):
        return {'status': 'grayscaled', 'method': 'luminosity'}

    @staticmethod
    def binarize(grayscale_data):
        return {'status': 'binarized', 'threshold': 128, 'method': 'otsu'}

    @staticmethod
    def deskew(binarized_data):
        angle = random.uniform(-2.5, 2.5)
        if abs(angle) < 0.5:
            angle = 0.0
        return {'status': 'deskewed', 'corrected_angle': round(angle, 2)}


class MockOCR:
    PRESET_TABLES = [
        {
            'description': '销售数据表',
            'rows': [
                ['日期', '产品名称', '数量', '单价', '销售额', '销售员'],
                ['2024-01-15', '笔记本电脑', '25', '5999', '149975', '张三'],
                ['2024-01-16', '无线鼠标', '120', '89', '10680', '李四'],
                ['2024-01-17', '机械键盘', '45', '399', '17955', '王五'],
                ['2024-01-18', '显示器27寸', '18', '1899', '34182', '张三'],
                ['2024-01-19', 'USB-C数据线', '200', '29', '5800', '李四'],
                ['2024-01-20', '蓝牙耳机', '60', '299', '17940', '王五'],
                ['2024-01-21', '路由器', '32', '459', '14688', '张三'],
            ]
        },
        {
            'description': '员工考勤表',
            'rows': [
                ['员工编号', '姓名', '部门', '出勤天数', '请假天数', '加班小时', '迟到次数'],
                ['E001', '陈明', '研发部', '21', '0', '8', '0'],
                ['E002', '李华', '市场部', '20', '1', '4', '2'],
                ['E003', '王芳', '财务部', '21', '0', '0', '0'],
                ['E004', '刘伟', '研发部', '19', '2', '12', '1'],
                ['E005', '赵静', '人事部', '21', '0', '2', '0'],
                ['E006', '孙强', '销售部', '20', '1', '6', '3'],
            ]
        },
        {
            'description': '库存管理表',
            'rows': [
                ['SKU编号', '商品名称', '分类', '当前库存', '安全库存', '在途数量', '供应商'],
                ['SKU1001', 'A4打印纸', '办公用品', '500', '200', '1000', '晨光文具'],
                ['SKU1002', '签字笔(黑)', '办公用品', '850', '300', '500', '得力集团'],
                ['SKU1003', '文件夹', '办公用品', '230', '100', '300', '齐心办公'],
                ['SKU2001', '咖啡胶囊', '饮品', '420', '150', '600', '雀巢中国'],
                ['SKU2002', '瓶装矿泉水', '饮品', '780', '300', '1200', '农夫山泉'],
                ['SKU3001', '显示器支架', '电子配件', '85', '50', '100', '乐歌股份'],
            ]
        },
        {
            'description': '学生成绩表',
            'rows': [
                ['学号', '姓名', '语文', '数学', '英语', '物理', '化学', '总分'],
                ['20240101', '周子轩', '92', '98', '88', '95', '90', '463'],
                ['20240102', '林诗涵', '95', '85', '96', '82', '88', '446'],
                ['20240103', '黄浩然', '78', '92', '80', '96', '94', '440'],
                ['20240104', '吴欣怡', '88', '76', '92', '78', '82', '416'],
                ['20240105', '郑俊杰', '85', '90', '78', '88', '86', '427'],
                ['20240106', '何雨萱', '90', '82', '94', '76', '80', '422'],
            ]
        },
        {
            'description': '财务报表',
            'rows': [
                ['月份', '营业收入', '营业成本', '毛利润', '运营费用', '净利润'],
                ['2024-01', '¥285,600', '¥142,800', '¥142,800', '¥68,500', '¥74,300'],
                ['2024-02', '¥312,400', '¥156,200', '¥156,200', '¥72,300', '¥83,900'],
                ['2024-03', '¥298,900', '¥149,450', '¥149,450', '¥70,800', '¥78,650'],
                ['2024-04', '¥345,200', '¥172,600', '¥172,600', '¥78,900', '¥93,700'],
                ['2024-05', '¥367,800', '¥183,900', '¥183,900', '¥82,400', '¥101,500'],
            ]
        }
    ]

    @staticmethod
    def recognize_table(file_name, rotation_angle):
        time.sleep(random.uniform(0.8, 2.0))

        selected = random.choice(MockOCR.PRESET_TABLES)
        table_data = [row[:] for row in selected['rows']]

        if rotation_angle and rotation_angle % 180 != 0:
            rotated = list(zip(*table_data[::-1]))
            table_data = [list(r) for r in rotated]

        result = {
            'description': selected['description'],
            'confidence': round(random.uniform(92.5, 99.2), 1),
            'row_count': len(table_data),
            'col_count': len(table_data[0]) if table_data else 0,
            'table_data': table_data
        }

        return result


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'Table OCR Service'})


@app.route('/api/recognize', methods=['POST'])
def recognize():
    try:
        data = request.get_json()
        if not data or 'files' not in data:
            return jsonify({'error': '缺少文件数据'}), 400

        files = data['files']
        if not files:
            return jsonify({'error': '文件列表为空'}), 400

        all_tables = []

        for file_info in files:
            file_name = file_info.get('name', 'unknown')
            file_type = file_info.get('type', '')
            rotation = file_info.get('rotation', 0)
            base64_data = file_info.get('content', '')

            if base64_data.startswith('data:'):
                base64_data = base64_data.split(',', 1)[1]

            try:
                file_bytes = base64.b64decode(base64_data)
                file_size = len(file_bytes)
            except Exception:
                file_size = 0

            preprocessor = ImagePreprocessor()
            step1 = preprocessor.to_grayscale(base64_data)
            step2 = preprocessor.binarize(step1)
            step3 = preprocessor.deskew(step2)

            rotation_adjusted = rotation + (step3['corrected_angle'] if step3['corrected_angle'] else 0)

            ocr_result = MockOCR.recognize_table(file_name, rotation_adjusted)

            ocr_result['file'] = {
                'name': file_name,
                'type': file_type,
                'size': file_size,
                'original_rotation': rotation,
                'rotation_adjusted': round(rotation_adjusted, 2)
            }
            ocr_result['preprocessing'] = {
                'grayscale': step1,
                'binarization': step2,
                'deskew': step3
            }

            all_tables.append(ocr_result)

        merged_data = []
        for idx, table in enumerate(all_tables):
            table_data = table['table_data']
            if idx == 0:
                merged_data.extend(table_data)
            else:
                merged_data.extend(table_data[1:])

        return jsonify({
            'success': True,
            'message': f'成功识别 {len(all_tables)} 个文件',
            'tables': all_tables,
            'merged_data': merged_data
        })

    except Exception as e:
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


if __name__ == '__main__':
    print('=' * 50)
    print('  表格识别 OCR 服务启动中...')
    print('  监听地址: http://localhost:5000')
    print('=' * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
