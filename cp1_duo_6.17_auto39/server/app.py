from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from html.parser import HTMLParser

app = Flask(__name__)
CORS(app)


class StyleExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.styles = []
        self.in_style = False
        self.current_style = []

    def handle_starttag(self, tag, attrs):
        if tag == 'style':
            self.in_style = True
            self.current_style = []

    def handle_endtag(self, tag):
        if tag == 'style' and self.in_style:
            self.in_style = False
            self.styles.append(''.join(self.current_style))

    def handle_data(self, data):
        if self.in_style:
            self.current_style.append(data)


def extract_inline_styles(html):
    style_pattern = re.compile(r'style\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
    return style_pattern.findall(html)


def extract_style_tags(html):
    parser = StyleExtractor()
    parser.feed(html)
    return parser.styles


def parse_css_dimensions(css_text):
    dimensions = {}
    width_pattern = re.compile(r'([^{}]+)\s*\{\s*[^}]*?width\s*:\s*([^;}]+)', re.IGNORECASE)
    height_pattern = re.compile(r'([^{}]+)\s*\{\s*[^}]*?height\s*:\s*([^;}]+)', re.IGNORECASE)
    overflow_pattern = re.compile(r'([^{}]+)\s*\{\s*[^}]*?overflow\s*:\s*([^;}]+)', re.IGNORECASE)

    for match in width_pattern.finditer(css_text):
        selector = match.group(1).strip()
        dimensions.setdefault(selector, {})['width'] = match.group(2).strip()

    for match in height_pattern.finditer(css_text):
        selector = match.group(1).strip()
        dimensions.setdefault(selector, {})['height'] = match.group(2).strip()

    for match in overflow_pattern.finditer(css_text):
        selector = match.group(1).strip()
        dimensions.setdefault(selector, {})['overflow'] = match.group(2).strip()

    return dimensions


def generate_suggestion(overflow_direction, element_info):
    suggestions = []
    if 'horizontal' in overflow_direction:
        suggestions.append('考虑设置 width: 100% 或 max-width: 100% 限制元素宽度')
        suggestions.append('检查 padding/margin 是否使用了固定像素值，尝试改用相对单位')
        suggestions.append('使用 box-sizing: border-box 确保内边距包含在宽度内')
    if 'vertical' in overflow_direction:
        suggestions.append('考虑设置 overflow: auto 或 overflow: hidden 处理纵向溢出')
        suggestions.append('检查子元素高度是否超出父容器限制')
    if not suggestions:
        suggestions.append('检查元素尺寸和父容器约束关系')
    return suggestions


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Layout Diagnostic Server is running'}), 200


@app.route('/api/parse', methods=['POST'])
def parse_code():
    try:
        data = request.get_json()
        html_code = data.get('html', '')
        css_code = data.get('css', '')
        viewport_width = data.get('viewportWidth', 1024)
        font_scale = data.get('fontScale', 1.0)
        line_height_scale = data.get('lineHeightScale', 1.0)
        container_padding = data.get('containerPadding', 0)

        all_css = css_code
        style_tag_css = extract_style_tags(html_code)
        for style_css in style_tag_css:
            all_css += '\n' + style_css

        inline_styles = extract_inline_styles(html_code)

        css_dimensions = parse_css_dimensions(all_css)

        element_pattern = re.compile(r'<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>', re.IGNORECASE)
        class_pattern = re.compile(r'class\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
        id_pattern = re.compile(r'id\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
        style_pattern = re.compile(r'style\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)

        overflow_elements = []
        matches = list(element_pattern.finditer(html_code))

        for idx, match in enumerate(matches):
            tag = match.group(1).lower()
            attrs = match.group(2)

            if tag in ('script', 'style', 'meta', 'link', 'br', 'hr', 'img', 'input'):
                continue

            selector_parts = [tag]
            id_match = id_pattern.search(attrs)
            if id_match:
                selector_parts.append(f'#{id_match.group(1)}')

            class_match = class_pattern.search(attrs)
            if class_match:
                classes = class_match.group(1).split()
                for cls in classes:
                    selector_parts.append(f'.{cls}')

            selector = ''.join(selector_parts) if len(selector_parts) > 1 else tag

            inline_style = ''
            style_match = style_pattern.search(attrs)
            if style_match:
                inline_style = style_match.group(1)

            width_val = None
            height_val = None
            overflow_val = None

            for sel, dims in css_dimensions.items():
                sel_clean = sel.strip()
                if (selector.endswith(sel_clean) or 
                    sel_clean in selector or 
                    (class_match and any(f'.{c}' == sel_clean for c in class_match.group(1).split()))):
                    if 'width' in dims:
                        width_val = dims['width']
                    if 'height' in dims:
                        height_val = dims['height']
                    if 'overflow' in dims:
                        overflow_val = dims['overflow']

            if inline_style:
                w_match = re.search(r'width\s*:\s*([^;]+)', inline_style, re.IGNORECASE)
                if w_match:
                    width_val = w_match.group(1).strip()
                h_match = re.search(r'height\s*:\s*([^;]+)', inline_style, re.IGNORECASE)
                if h_match:
                    height_val = h_match.group(1).strip()
                o_match = re.search(r'overflow\s*:\s*([^;]+)', inline_style, re.IGNORECASE)
                if o_match:
                    overflow_val = o_match.group(1).strip()

            parent_width = viewport_width - (container_padding * 2)
            parent_height = viewport_width * 0.75

            effective_width = parent_width
            effective_height = 200

            if width_val:
                px_match = re.match(r'(\d+(?:\.\d+)?)\s*px', width_val)
                percent_match = re.match(r'(\d+(?:\.\d+)?)\s*%', width_val)
                if px_match:
                    effective_width = float(px_match.group(1))
                elif percent_match:
                    effective_width = parent_width * (float(percent_match.group(1)) / 100)

            if height_val:
                px_match = re.match(r'(\d+(?:\.\d+)?)\s*px', height_val)
                percent_match = re.match(r'(\d+(?:\.\d+)?)\s*%', height_val)
                if px_match:
                    effective_height = float(px_match.group(1))
                elif percent_match:
                    effective_height = parent_height * (float(percent_match.group(1)) / 100)

            adjusted_effective_width = effective_width * (1 + (font_scale - 1) * 0.3)
            adjusted_effective_height = effective_height * line_height_scale

            overflow_directions = []
            overflow_x = 0
            overflow_y = 0

            if adjusted_effective_width > parent_width:
                overflow_x = round(adjusted_effective_width - parent_width, 1)
                overflow_directions.append('horizontal')

            if adjusted_effective_height > parent_height:
                overflow_y = round(adjusted_effective_height - parent_height, 1)
                overflow_directions.append('vertical')

            if overflow_directions and (not overflow_val or overflow_val in ('visible', 'auto', 'scroll')):
                overflow_elements.append({
                    'selector': selector,
                    'tag': tag,
                    'actualWidth': round(adjusted_effective_width, 1),
                    'actualHeight': round(adjusted_effective_height, 1),
                    'parentWidth': round(parent_width, 1),
                    'parentHeight': round(parent_height, 1),
                    'overflowX': overflow_x,
                    'overflowY': overflow_y,
                    'overflowDirection': ', '.join(overflow_directions),
                    'suggestions': generate_suggestion(overflow_directions, {
                        'width': width_val,
                        'height': height_val
                    }),
                    'index': idx
                })

        return jsonify({
            'success': True,
            'overflowElements': overflow_elements,
            'totalElements': len(matches),
            'viewportWidth': viewport_width,
            'cssDimensions': css_dimensions,
            'inlineStylesCount': len(inline_styles),
            'styleTagsCount': len(style_tag_css)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
