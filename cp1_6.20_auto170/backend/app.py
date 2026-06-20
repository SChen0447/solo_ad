import base64
import io
import json
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

PALETTE = [
    (0, 0, 0),
    (255, 255, 255),
    (255, 0, 0),
    (0, 255, 0),
    (0, 0, 255),
    (255, 255, 0),
    (255, 0, 255),
    (255, 165, 0),
    (139, 69, 19),
    (136, 136, 136),
]

ACTION_TEMPLATES = {
    "idle": {
        "name": "站立",
        "frameCount": 2,
        "offsets": [
            {"head": (0, 0), "body": (0, 0), "leftArm": (0, 0), "rightArm": (0, 0), "leftLeg": (0, 0), "rightLeg": (0, 0)},
            {"head": (0, -1), "body": (0, -1), "leftArm": (0, -1), "rightArm": (0, -1), "leftLeg": (0, 0), "rightLeg": (0, 0)},
        ],
        "delays": [500, 500],
    },
    "walk": {
        "name": "行走",
        "frameCount": 4,
        "offsets": [
            {"head": (0, 0), "body": (0, 0), "leftArm": (0, 0), "rightArm": (0, 0), "leftLeg": (0, 0), "rightLeg": (0, 0)},
            {"head": (0, -1), "body": (0, 0), "leftArm": (-1, 0), "rightArm": (1, 0), "leftLeg": (2, 0), "rightLeg": (-1, 0)},
            {"head": (0, 0), "body": (0, 0), "leftArm": (0, 0), "rightArm": (0, 0), "leftLeg": (0, 0), "rightLeg": (0, 0)},
            {"head": (0, -1), "body": (0, 0), "leftArm": (1, 0), "rightArm": (-1, 0), "leftLeg": (-1, 0), "rightLeg": (2, 0)},
        ],
        "delays": [200, 200, 200, 200],
    },
    "attack": {
        "name": "攻击",
        "frameCount": 3,
        "offsets": [
            {"head": (0, 0), "body": (0, 0), "leftArm": (0, -4), "rightArm": (0, -3), "leftLeg": (0, 0), "rightLeg": (0, 0)},
            {"head": (0, 0), "body": (0, 0), "leftArm": (5, 0), "rightArm": (5, -1), "leftLeg": (0, 0), "rightLeg": (1, 0)},
            {"head": (0, 0), "body": (0, 0), "leftArm": (0, 0), "rightArm": (0, 0), "leftLeg": (0, 0), "rightLeg": (0, 0)},
        ],
        "delays": [150, 100, 250],
    },
    "cast": {
        "name": "施法",
        "frameCount": 4,
        "offsets": [
            {"head": (0, 0), "body": (0, 0), "leftArm": (0, -4), "rightArm": (0, -4), "leftLeg": (0, 0), "rightLeg": (0, 0)},
            {"head": (0, 0), "body": (0, 0), "leftArm": (-1, -5), "rightArm": (1, -5), "leftLeg": (0, 0), "rightLeg": (0, 0)},
            {"head": (0, -1), "body": (0, 0), "leftArm": (-2, -6), "rightArm": (2, -6), "leftLeg": (0, 0), "rightLeg": (0, 0)},
            {"head": (0, 0), "body": (0, 0), "leftArm": (0, 0), "rightArm": (0, 0), "leftLeg": (0, 0), "rightLeg": (0, 0)},
        ],
        "delays": [300, 300, 200, 200],
    },
    "hurt": {
        "name": "受伤",
        "frameCount": 2,
        "offsets": [
            {"head": (-2, 0), "body": (-2, 0), "leftArm": (-2, 0), "rightArm": (-2, 0), "leftLeg": (-1, 0), "rightLeg": (-1, 0)},
            {"head": (0, 0), "body": (0, 0), "leftArm": (0, 0), "rightArm": (0, 0), "leftLeg": (0, 0), "rightLeg": (0, 0)},
        ],
        "delays": [200, 300],
    },
}

PART_POSITIONS = {
    "head": (24, 8),
    "body": (24, 24),
    "leftArm": (16, 24),
    "rightArm": (32, 24),
    "leftLeg": (22, 40),
    "rightLeg": (30, 40),
}

EQUIPMENTS = [
    {
        "id": "sword",
        "name": "铁剑",
        "type": "weapon",
        "attack": 12,
        "defense": 0,
        "iconBase64": _create_weapon_icon("sword"),
        "frameOverlayData": [
            {
                "targetPart": "rightArm",
                "pixels": _create_sword_overlay(),
            }
        ],
    },
    {
        "id": "staff",
        "name": "法杖",
        "type": "weapon",
        "attack": 8,
        "defense": 0,
        "iconBase64": _create_weapon_icon("staff"),
        "frameOverlayData": [
            {
                "targetPart": "rightArm",
                "pixels": _create_staff_overlay(),
            }
        ],
    },
    {
        "id": "bow",
        "name": "长弓",
        "type": "weapon",
        "attack": 10,
        "defense": 0,
        "iconBase64": _create_weapon_icon("bow"),
        "frameOverlayData": [
            {
                "targetPart": "leftArm",
                "pixels": _create_bow_overlay(),
            }
        ],
    },
    {
        "id": "helmet",
        "name": "铁头盔",
        "type": "armor",
        "attack": 0,
        "defense": 8,
        "iconBase64": _create_armor_icon("helmet"),
        "frameOverlayData": [
            {
                "targetPart": "head",
                "pixels": _create_helmet_overlay(),
            }
        ],
    },
    {
        "id": "chestplate",
        "name": "胸甲",
        "type": "armor",
        "attack": 0,
        "defense": 12,
        "iconBase64": _create_armor_icon("chestplate"),
        "frameOverlayData": [
            {
                "targetPart": "body",
                "pixels": _create_chestplate_overlay(),
            }
        ],
    },
    {
        "id": "boots",
        "name": "铁靴",
        "type": "armor",
        "attack": 0,
        "defense": 5,
        "iconBase64": _create_armor_icon("boots"),
        "frameOverlayData": [
            {
                "targetPart": "leftLeg",
                "pixels": _create_boots_overlay(),
            },
            {
                "targetPart": "rightLeg",
                "pixels": _create_boots_overlay(),
            }
        ],
    },
]


def _empty_matrix():
    return [[-1] * 16 for _ in range(16)]


def _create_weapon_icon(weapon_type):
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    if weapon_type == "sword":
        draw.rectangle([14, 2, 17, 20], fill=(192, 192, 192, 255))
        draw.rectangle([10, 20, 21, 23], fill=(139, 69, 19, 255))
        draw.rectangle([14, 23, 17, 30], fill=(139, 69, 19, 255))
    elif weapon_type == "staff":
        draw.rectangle([14, 2, 17, 28], fill=(139, 69, 19, 255))
        draw.ellipse([10, 0, 21, 8], fill=(0, 0, 255, 255))
        draw.ellipse([12, 2, 19, 6], fill=(100, 100, 255, 255))
    elif weapon_type == "bow":
        draw.arc([8, 4, 20, 28], start=270, end=90, fill=(139, 69, 19, 255), width=2)
        draw.line([14, 4, 14, 28], fill=(200, 200, 200, 255), width=1)
        draw.rectangle([12, 12, 16, 18], fill=(139, 69, 19, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _create_armor_icon(armor_type):
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    if armor_type == "helmet":
        draw.rectangle([8, 6, 23, 18], fill=(128, 128, 128, 255))
        draw.rectangle([6, 18, 25, 22], fill=(128, 128, 128, 255))
        draw.rectangle([12, 12, 19, 16], fill=(0, 0, 0, 255))
    elif armor_type == "chestplate":
        draw.rectangle([6, 4, 25, 24], fill=(128, 128, 128, 255))
        draw.rectangle([2, 8, 6, 20], fill=(128, 128, 128, 255))
        draw.rectangle([25, 8, 29, 20], fill=(128, 128, 128, 255))
        draw.rectangle([10, 10, 21, 16], fill=(96, 96, 96, 255))
    elif armor_type == "boots":
        draw.rectangle([4, 16, 13, 28], fill=(128, 128, 128, 255))
        draw.rectangle([18, 16, 27, 28], fill=(128, 128, 128, 255))
        draw.rectangle([2, 24, 14, 30], fill=(128, 128, 128, 255))
        draw.rectangle([16, 24, 28, 30], fill=(128, 128, 128, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _create_sword_overlay():
    m = _empty_matrix()
    for row in range(4):
        for col in range(7, 9):
            m[row][col] = 1
    for col in range(6, 10):
        m[4][col] = 8
    for row in range(5, 8):
        for col in range(7, 9):
            m[row][col] = 8
    return m


def _create_staff_overlay():
    m = _empty_matrix()
    for row in range(8):
        m[row][7] = 8
        m[row][8] = 8
    m[0][6] = 4
    m[0][7] = 4
    m[0][8] = 4
    m[0][9] = 4
    m[1][6] = 4
    m[1][9] = 4
    m[2][6] = 4
    m[2][9] = 4
    return m


def _create_bow_overlay():
    m = _empty_matrix()
    for row in range(6):
        m[row][5] = 8
    for row in range(2, 8):
        m[row][9] = 8
    for row in range(1, 9):
        m[row][7] = 1
    return m


def _create_helmet_overlay():
    m = _empty_matrix()
    for col in range(4, 12):
        m[0][col] = 9
        m[1][col] = 9
        m[2][col] = 9
    for col in range(3, 13):
        m[3][col] = 9
    m[2][6] = 0
    m[2][7] = 0
    m[2][9] = 0
    m[2][10] = 0
    return m


def _create_chestplate_overlay():
    m = _empty_matrix()
    for row in range(3, 10):
        for col in range(3, 13):
            m[row][col] = 9
    for col in range(1, 4):
        m[4][col] = 9
        m[5][col] = 9
    for col in range(12, 15):
        m[4][col] = 9
        m[5][col] = 9
    for row in range(4, 8):
        for col in range(5, 11):
            m[row][col] = 9
    return m


def _create_boots_overlay():
    m = _empty_matrix()
    for col in range(4, 12):
        m[13][col] = 9
        m[14][col] = 9
        m[15][col] = 9
    for col in range(2, 12):
        m[14][col] = 9
        m[15][col] = 9
    return m


def _draw_part_on_frame(frame_img, part_matrix, base_x, base_y, offset_x, offset_y):
    for row in range(16):
        for col in range(16):
            color_idx = part_matrix[row][col]
            if color_idx < 0 or color_idx >= len(PALETTE):
                continue
            px = base_x + col + offset_x
            py = base_y + row + offset_y
            if 0 <= px < 64 and 0 <= py < 64:
                frame_img.putpixel((px, py), PALETTE[color_idx] + (255,))


def _merge_overlay(part_matrix, overlay):
    result = [row[:] for row in part_matrix]
    for row in range(min(len(overlay), 16)):
        for col in range(min(len(overlay[row]), 16)):
            if overlay[row][col] >= 0:
                result[row][col] = overlay[row][col]
    return result


@app.route("/api/equipments", methods=["GET"])
def get_equipments():
    return jsonify({"equipments": EQUIPMENTS})


@app.route("/api/compose-sprite", methods=["POST"])
def compose_sprite():
    data = request.get_json()
    parts = data.get("parts", {})
    equipment_ids = data.get("equipmentIds", [])
    action_id = data.get("actionTemplateId", "idle")

    template = ACTION_TEMPLATES.get(action_id, ACTION_TEMPLATES["idle"])
    frame_count = template["frameCount"]
    offsets = template["offsets"]
    delays = template["delays"]

    overlays_by_part = {}
    for eq in EQUIPMENTS:
        if eq["id"] in equipment_ids:
            for overlay in eq["frameOverlayData"]:
                target = overlay["targetPart"]
                if target not in overlays_by_part:
                    overlays_by_part[target] = []
                overlays_by_part[target].append(overlay["pixels"])

    merged_parts = {}
    for part_name in ["head", "body", "leftArm", "rightArm", "leftLeg", "rightLeg"]:
        part_data = parts.get(part_name, _empty_matrix())
        if part_name in overlays_by_part:
            for ov in overlays_by_part[part_name]:
                part_data = _merge_overlay(part_data, ov)
        merged_parts[part_name] = part_data

    frames = []
    for frame_idx in range(frame_count):
        frame_img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        frame_offsets = offsets[frame_idx] if frame_idx < len(offsets) else offsets[0]
        for part_name in ["leftLeg", "rightLeg", "body", "leftArm", "rightArm", "head"]:
            if part_name not in merged_parts:
                continue
            bx, by = PART_POSITIONS[part_name]
            ox, oy = frame_offsets.get(part_name, (0, 0))
            _draw_part_on_frame(frame_img, merged_parts[part_name], bx, by, ox, oy)
        frames.append(frame_img)

    sprite_width = 64 * frame_count + (frame_count - 1)
    sprite_sheet = Image.new("RGBA", (sprite_width, 64), (0, 0, 0, 0))
    x_offset = 0
    for frame_img in frames:
        sprite_sheet.paste(frame_img, (x_offset, 0))
        x_offset += 65

    buf = io.BytesIO()
    sprite_sheet.save(buf, format="PNG")
    sprite_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return jsonify({
        "spriteSheetBase64": sprite_base64,
        "frameCount": frame_count,
        "frameWidth": 64,
        "frameHeight": 64,
        "frameDelays": delays,
        "actionName": template["name"],
    })


@app.route("/api/export-gif", methods=["POST"])
def export_gif():
    data = request.get_json()
    parts = data.get("parts", {})
    equipment_ids = data.get("equipmentIds", [])
    action_id = data.get("actionTemplateId", "idle")
    character_name = data.get("characterName", "角色")

    template = ACTION_TEMPLATES.get(action_id, ACTION_TEMPLANTS["idle"])
    frame_count = template["frameCount"]
    offsets = template["offsets"]
    delays = template["delays"]

    overlays_by_part = {}
    for eq in EQUIPMENTS:
        if eq["id"] in equipment_ids:
            for overlay in eq["frameOverlayData"]:
                target = overlay["targetPart"]
                if target not in overlays_by_part:
                    overlays_by_part[target] = []
                overlays_by_part[target].append(overlay["pixels"])

    merged_parts = {}
    for part_name in ["head", "body", "leftArm", "rightArm", "leftLeg", "rightLeg"]:
        part_data = parts.get(part_name, _empty_matrix())
        if part_name in overlays_by_part:
            for ov in overlays_by_part[part_name]:
                part_data = _merge_overlay(part_data, ov)
        merged_parts[part_name] = part_data

    frames = []
    for frame_idx in range(frame_count):
        frame_img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        frame_offsets = offsets[frame_idx] if frame_idx < len(offsets) else offsets[0]
        for part_name in ["leftLeg", "rightLeg", "body", "leftArm", "rightArm", "head"]:
            if part_name not in merged_parts:
                continue
            bx, by = PART_POSITIONS[part_name]
            ox, oy = frame_offsets.get(part_name, (0, 0))
            _draw_part_on_frame(frame_img, merged_parts[part_name], bx, by, ox, oy)
        frames.append(frame_img)

    buf = io.BytesIO()
    frames[0].save(
        buf,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=delays,
        loop=0,
        transparency=0,
        disposal=2,
    )
    gif_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    ts = int(time.time())
    filename = f"{character_name}_{template['name']}_Animation_{ts}.gif"

    return jsonify({
        "gifBase64": gif_base64,
        "filename": filename,
    })


@app.route("/api/export-spritesheet", methods=["POST"])
def export_spritesheet():
    data = request.get_json()
    parts = data.get("parts", {})
    equipment_ids = data.get("equipmentIds", [])
    action_id = data.get("actionTemplateId", "idle")
    character_name = data.get("characterName", "角色")

    template = ACTION_TEMPLATES.get(action_id, ACTION_TEMPLATES["idle"])
    frame_count = template["frameCount"]
    offsets = template["offsets"]

    overlays_by_part = {}
    for eq in EQUIPMENTS:
        if eq["id"] in equipment_ids:
            for overlay in eq["frameOverlayData"]:
                target = overlay["targetPart"]
                if target not in overlays_by_part:
                    overlays_by_part[target] = []
                overlays_by_part[target].append(overlay["pixels"])

    merged_parts = {}
    for part_name in ["head", "body", "leftArm", "rightArm", "leftLeg", "rightLeg"]:
        part_data = parts.get(part_name, _empty_matrix())
        if part_name in overlays_by_part:
            for ov in overlays_by_part[part_name]:
                part_data = _merge_overlay(part_data, ov)
        merged_parts[part_name] = part_data

    frames = []
    for frame_idx in range(frame_count):
        frame_img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        frame_offsets = offsets[frame_idx] if frame_idx < len(offsets) else offsets[0]
        for part_name in ["leftLeg", "rightLeg", "body", "leftArm", "rightArm", "head"]:
            if part_name not in merged_parts:
                continue
            bx, by = PART_POSITIONS[part_name]
            ox, oy = frame_offsets.get(part_name, (0, 0))
            _draw_part_on_frame(frame_img, merged_parts[part_name], bx, by, ox, oy)
        frames.append(frame_img)

    sprite_width = 64 * frame_count + (frame_count - 1)
    sprite_sheet = Image.new("RGBA", (sprite_width, 64), (255, 255, 255, 255))
    x_offset = 0
    for frame_img in frames:
        sprite_sheet.paste(frame_img, (x_offset, 0), frame_img)
        x_offset += 65

    buf = io.BytesIO()
    sprite_sheet.save(buf, format="PNG")
    sheet_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    ts = int(time.time())
    filename = f"{character_name}_{template['name']}_SpriteSheet_{ts}.png"

    return jsonify({
        "spriteSheetBase64": sheet_base64,
        "filename": filename,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
