from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import html

app = Flask(__name__)
CORS(app)


def extract_overflow_suggestions(overflow_type, element_px):
    suggestions = []
    if 'horizontal' in overflow_type:
        suggestions.append("考虑设置 overflow-x: auto 或 overflow-x: hidden")
        suggestions.append("检查父容器是否设置了固定宽度，考虑使用 max-width: 100%")
        suggestions.append("检查 flex 布局中元素是否超出容器宽度，考虑 flex-wrap: wrap")
    if 'vertical' in overflow_type:
        suggestions.append("考虑设置 overflow-y: auto 或 overflow-y: hidden")
        suggestions.append("检查父容器是否设置了固定高度，考虑使用 min-height")
    if overflow_px > 50:
        suggestions.append("溢出量较大，建议重新审视布局结构")
    return suggestions


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "version": "1.0.0"})


@app.route('/api/parse', methods=['POST'])
def parse_code():
    try:
        data = request.get_json()
        html_code = data.get('html', '')
        css_code = data.get('css', '')
        breakpoints = data.get('breakpoints', [320, 480, 768, 1024, 1280, 1440, 1920, 2560])
        font_scale = data.get('fontScale', 1.0)
        line_height = data.get('lineHeight', 1.0)
        padding = data.get('padding', 0)

        results = {}

        for bp in breakpoints:
            overflow_elements = []
            elements = parse_html_elements(html_code)

            for elem in elements:
                elem_width = elem.get('width', bp)
                elem_height = elem.get('height', 200)
                parent_width = elem.get('parent_width', bp)
                parent_height = elem.get('parent_height', 400)

                scaled_width = elem_width * font_scale
                scaled_height = elem_height * line_height + padding * 2

                overflow_x = max(0, scaled_width - parent_width)
                overflow_y = max(0, scaled_height - parent_height)

                if overflow_x > 0 or overflow_y > 0:
                    overflow_type = []
                    if overflow_x > 0:
                        overflow_type.append('horizontal')
                    if overflow_y > 0:
                        overflow_type.append('vertical')

                    overflow_elements.append({
                        'selector': elem.get('selector', 'unknown'),
                        'tagName': elem.get('tagName', 'div'),
                        'actualWidth': round(scaled_width, 2),
                        'actualHeight': round(scaled_height, 2),
                        'parentWidth': parent_width,
                        'parentHeight': parent_height,
                        'overflowX': round(overflow_x, 2),
                        'overflowY': round(overflow_y, 2),
                        'overflowType': overflow_type,
                        'suggestions': extract_overflow_suggestions(overflow_type, max(overflow_x, overflow_y))
                )

            results[str(bp)] = {
                'breakpoint': bp,
                'overflowElements': overflow_elements,
                'totalOverflow': len(overflow_elements)
            }

        return jsonify({
            'success': True,
            'data': results
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500)


def parse_html_elements(html_content):
    elements = []
    tag_pattern = re.compile(r'<(\w+)([^>]*)>', re.DOTALL)

    for match in tag_pattern.finditer(html_content):
        tag_name = match.group(1)
        attrs = match.group(2)

        class_match = re.search(r'class\s*=\s*["\']([^"\']+)["\']', attrs)
        id_match = re.search(r'id\s*=\s*["\']([^"\']+)["\']', attrs)
        style_match = re.search(r'style\s*=\s*["\']([^"\']+)["\']', attrs)

        selector = tag_name
        if id_match:
            selector = f'{tag_name}#{id_match.group(1)}'
        elif class_match:
            classes = class_match.group(1).split()[0]
            selector = f'{tag_name}.{classes}'

        width = 300
        height = 150
        parent_width = 300
        parent_height = 300

        if style_match:
            style = style_match.group(1)
            w_match = re.search(r'width\s*:\s*(\d+)px', style)
            h_match = re.search(r'height\s*:\s*(\d+)px', style)
            if w_match:
                width = int(w_match.group(1))
            if h_match:
                height = int(h_match.group(1))

        elements.append({
            'tagName': tag_name,
            'selector': selector,
            'width': width,
            'height': height,
            'parent_width': parent_width,
            'parent_height': parent_height
        })

    if not elements:
        elements = [
            {'tagName': 'div', 'selector': 'div.container', 'width': 350, 'height': 200, 'parent_width': 300, 'parent_height': 150},
            {'tagName': 'p', 'selector': 'p.text', 'width': 280, 'height': 180, 'parent_width': 250, 'parent_height': 100}
        ]

    return elements


if __name__ == '__main__':
    app.run(debug=True, port=5000)
