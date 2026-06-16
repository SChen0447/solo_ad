from PIL import Image, ImageDraw, ImageFont
import os
import random
import math

STYLE_PRESETS = {
    'minimal_white': {
        'name': '简约白',
        'bg_color': '#FFFFFF',
        'primary_color': '#333333',
        'accent_color': '#E74C3C',
        'secondary_color': '#666666',
    },
    'gradient_neon': {
        'name': '渐变霓虹',
        'bg_color_1': '#667EEA',
        'bg_color_2': '#764BA2',
        'primary_color': '#FFFFFF',
        'accent_color': '#F093FB',
        'secondary_color': '#E0E0FF',
    },
    'vintage_newspaper': {
        'name': '复古报纸',
        'bg_color': '#F5EFE0',
        'primary_color': '#2C2C2C',
        'accent_color': '#8B0000',
        'secondary_color': '#5C5C5C',
    },
    'dark_tech': {
        'name': '暗黑科技',
        'bg_color': '#0D0D0D',
        'primary_color': '#FFFFFF',
        'accent_color': '#00FF88',
        'secondary_color': '#888888',
    },
}

SIZE_PRESETS = {
    'instagram': {
        'name': 'Instagram',
        'width': 1080,
        'height': 1080,
        'sub': '方形 1080×1080',
    },
    'twitter': {
        'name': 'Twitter',
        'width': 1500,
        'height': 500,
        'sub': '横幅 1500×500',
    },
    'linkedin': {
        'name': 'LinkedIn',
        'width': 1584,
        'height': 396,
        'sub': '头图 1584×396',
    },
}


def get_font(size, bold=False):
    font_paths = [
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/System/Library/Fonts/PingFang.ttc',
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_gradient(width, height, color1, color2, direction='vertical'):
    base = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(base)
    rgb1 = hex_to_rgb(color1)
    rgb2 = hex_to_rgb(color2)
    if direction == 'vertical':
        for y in range(height):
            r = int(rgb1[0] + (rgb2[0] - rgb1[0]) * y / height)
            g = int(rgb1[1] + (rgb2[1] - rgb1[1]) * y / height)
            b = int(rgb1[2] + (rgb2[2] - rgb1[2]) * y / height)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    else:
        for x in range(width):
            r = int(rgb1[0] + (rgb2[0] - rgb1[0]) * x / width)
            g = int(rgb1[1] + (rgb2[1] - rgb1[1]) * x / width)
            b = int(rgb1[2] + (rgb2[2] - rgb1[2]) * x / width)
            draw.line([(x, 0), (x, height)], fill=(r, g, b))
    return base


def wrap_text(text, font, max_width, draw):
    lines = []
    current_line = ''
    for char in text:
        test_line = current_line + char
        bbox = draw.textbbox((0, 0), test_line, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width or current_line == '':
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = char
    if current_line:
        lines.append(current_line)
    return lines


def draw_decorations(draw, width, height, style, density, accent_color, is_square):
    if density <= 0:
        return
    random.seed(style)
    count_map = {1: 5, 2: 12, 3: 25}
    count = count_map.get(density, 0)
    accent_rgb = hex_to_rgb(accent_color)
    for _ in range(count):
        shape_type = random.randint(0, 2)
        x = random.randint(0, width)
        y = random.randint(0, height)
        size = random.randint(2, max(8, int(min(width, height) * 0.015)))
        if shape_type == 0:
            draw.ellipse([x - size, y - size, x + size, y + size],
                         fill=(*accent_rgb, 40), outline=None)
        elif shape_type == 1:
            line_w = random.randint(1, 3)
            angle = random.uniform(0, 2 * math.pi)
            length = random.randint(20, 80)
            end_x = x + int(math.cos(angle) * length)
            end_y = y + int(math.sin(angle) * length)
            draw.line([(x, y), (end_x, end_y)], fill=(*accent_rgb, 60), width=line_w)
        else:
            s = size * 2
            draw.rectangle([x - s, y - s, x + s, y + s],
                           fill=None, outline=(*accent_rgb, 50), width=1)


def draw_border_decor(draw, width, height, accent_color):
    accent_rgb = hex_to_rgb(accent_color)
    margin = int(min(width, height) * 0.04)
    draw.rectangle(
        [margin, margin, width - margin, height - margin],
        fill=None, outline=(*accent_rgb, 80), width=2
    )
    corner_size = int(min(width, height) * 0.025)
    corners = [
        (margin, margin),
        (width - margin - corner_size, margin),
        (margin, height - margin - corner_size),
        (width - margin - corner_size, height - margin - corner_size),
    ]
    for (cx, cy) in corners:
        draw.rectangle([cx, cy, cx + corner_size, cy + corner_size],
                       fill=accent_rgb)


def generate_image(theme, style_key, size_key, adjustments=None):
    style = STYLE_PRESETS.get(style_key, STYLE_PRESETS['minimal_white'])
    size = SIZE_PRESETS.get(size_key, SIZE_PRESETS['instagram'])
    width, height = size['width'], size['height']
    is_square = (width == height)

    title_size_adjust = 0
    title_color = style['primary_color']
    bg_color = style.get('bg_color', '#FFFFFF')
    decoration_density = 1

    if adjustments:
        title_size_adjust = adjustments.get('title_size', 0)
        title_color = adjustments.get('title_color', title_color)
        bg_color = adjustments.get('bg_color', bg_color)
        decoration_density = adjustments.get('decoration_density', decoration_density)

    base_title_size = int(min(width, height) * 0.08)
    base_sub_size = int(min(width, height) * 0.035)
    title_size = base_title_size + title_size_adjust * 4
    sub_size = base_sub_size + title_size_adjust * 2

    if style_key == 'gradient_neon':
        img = create_gradient(width, height,
                              style.get('bg_color_1', '#667EEA'),
                              style.get('bg_color_2', '#764BA2'),
                              'horizontal' if is_square else 'vertical')
    else:
        bg_rgb = hex_to_rgb(bg_color)
        img = Image.new('RGB', (width, height), bg_rgb)

    draw = ImageDraw.Draw(img, 'RGBA')

    draw_decorations(draw, width, height, style_key, decoration_density,
                     style['accent_color'], is_square)

    accent_rgb = hex_to_rgb(style['accent_color'])
    bar_w = int(min(width, height) * 0.15)
    bar_h = max(4, int(min(width, height) * 0.008))
    center_x = width // 2
    center_y = height // 2

    title_font = get_font(title_size, bold=True)
    sub_font = get_font(sub_size)

    theme_text = theme.strip()
    parts = theme_text.split(' - ', 1)
    if len(parts) == 2:
        main_title, sub_title = parts[0], parts[1]
    else:
        main_title, sub_title = theme_text, ''

    max_text_w = int(width * 0.8)
    title_lines = wrap_text(main_title, title_font, max_text_w, draw)
    sub_lines = wrap_text(sub_title, sub_font, max_text_w, draw) if sub_title else []

    line_spacing_title = int(title_size * 1.3)
    line_spacing_sub = int(sub_size * 1.4)

    total_title_h = len(title_lines) * line_spacing_title
    total_sub_h = len(sub_lines) * line_spacing_sub
    gap = int(min(width, height) * 0.04)
    bar_gap = int(min(width, height) * 0.03)

    total_h = total_title_h + bar_gap + bar_h + (gap + total_sub_h if sub_lines else 0)
    current_y = center_y - total_h // 2

    title_rgb = hex_to_rgb(title_color)
    sub_rgb = hex_to_rgb(style.get('secondary_color', style['primary_color']))

    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        tw = bbox[2] - bbox[0]
        tx = (width - tw) // 2
        draw.text((tx, current_y), line, fill=title_rgb, font=title_font)
        current_y += line_spacing_title

    current_y += bar_gap
    draw.rectangle(
        [center_x - bar_w // 2, current_y, center_x + bar_w // 2, current_y + bar_h],
        fill=accent_rgb
    )
    current_y += bar_h + gap

    for line in sub_lines:
        bbox = draw.textbbox((0, 0), line, font=sub_font)
        tw = bbox[2] - bbox[0]
        tx = (width - tw) // 2
        draw.text((tx, current_y), line, fill=sub_rgb, font=sub_font)
        current_y += line_spacing_sub

    draw_border_decor(draw, width, height, style['accent_color'])

    return img
