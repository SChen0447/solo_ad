from flask import Flask, jsonify, request
from flask_cors import CORS
from models import Building, Floor, Room, Door, Window, Facility


def create_building_data() -> Building:
    building = Building(name="智慧办公楼", center=(0, 1.5, 0))

    floor1 = Floor(level=1, name="一层大厅", elevation=0.0)
    floor1.rooms = [
        Room(
            id="r101", name="大厅", floor=1,
            corners=[(-15, -10), (15, -10), (15, 10), (-15, 10)],
            height=4.0, color="#4a5568", is_corridor=False
        ),
        Room(
            id="r102", name="前台接待区", floor=1,
            corners=[(-15, -10), (-8, -10), (-8, 10), (-15, 10)],
            height=4.0, color="#5a6578"
        ),
        Room(
            id="r103", name="休息区", floor=1,
            corners=[(8, -10), (15, -10), (15, 0), (8, 0)],
            height=4.0, color="#4a5a78"
        ),
        Room(
            id="r104", name="咖啡区", floor=1,
            corners=[(8, 0), (15, 0), (15, 10), (8, 10)],
            height=4.0, color="#4a5a78"
        ),
        Room(
            id="r105", name="东走廊", floor=1,
            corners=[(-8, -10), (8, -10), (8, -6), (-8, -6)],
            height=4.0, color="#3a4a5b", is_corridor=True
        ),
        Room(
            id="r106", name="西走廊", floor=1,
            corners=[(-8, 6), (8, 6), (8, 10), (-8, 10)],
            height=4.0, color="#3a4a5b", is_corridor=True
        ),
        Room(
            id="r107", name="楼梯间", floor=1,
            corners=[(-6, -2), (-2, -2), (-2, 2), (-6, 2)],
            height=4.0, color="#2a3a4b", is_staircase=True
        ),
        Room(
            id="r108", name="电梯间", floor=1,
            corners=[(2, -2), (6, -2), (6, 2), (2, 2)],
            height=4.0, color="#2a3a4b", is_staircase=True
        ),
    ]
    floor1.doors = [
        Door(id="d101", position=(-8, -8, 0), width=1.5, height=2.2, rotation=0),
        Door(id="d102", position=(0, -10, 0), width=2.0, height=2.5, rotation=1.57),
        Door(id="d103", position=(8, -8, 0), width=1.5, height=2.2, rotation=0),
        Door(id="d104", position=(-8, 8, 0), width=1.5, height=2.2, rotation=0),
        Door(id="d105", position=(8, 8, 0), width=1.5, height=2.2, rotation=0),
        Door(id="d106", position=(-4, -2, 0), width=1.2, height=2.2, rotation=1.57),
        Door(id="d107", position=(4, -2, 0), width=1.2, height=2.2, rotation=1.57),
    ]
    floor1.windows = [
        Window(id="w101", position=(-15, -5, 2), width=2.5, height=2.0, rotation=0),
        Window(id="w102", position=(-15, 5, 2), width=2.5, height=2.0, rotation=0),
        Window(id="w103", position=(15, -5, 2), width=2.5, height=2.0, rotation=3.14),
        Window(id="w104", position=(15, 5, 2), width=2.5, height=2.0, rotation=3.14),
    ]
    floor1.facilities = [
        Facility(id="f101", name="消防栓1号", type="fire_hydrant", category="fire",
                 floor=1, position=(-12, 0, 1.0), status="normal",
                 last_maintenance="2024-03-15", description="一楼大厅西侧消防栓"),
        Facility(id="f102", name="配电箱1号", type="distribution_box", category="electrical",
                 floor=1, position=(12, -5, 1.5), status="normal",
                 last_maintenance="2024-02-20", description="一楼东侧配电箱"),
        Facility(id="f103", name="安全出口A", type="emergency_exit", category="fire",
                 floor=1, position=(0, -9.7, 1.5), status="normal",
                 last_maintenance="2024-01-10", description="一楼南侧安全出口"),
        Facility(id="f104", name="电梯1号", type="elevator", category="electrical",
                 floor=1, position=(4, 0, 1.5), status="normal",
                 last_maintenance="2024-04-01", description="客用电梯"),
        Facility(id="f105", name="消防喷淋泵", type="sprinkler_pump", category="fire",
                 floor=1, position=(-12, -8, 0.5), status="normal",
                 last_maintenance="2024-03-20", description="喷淋系统主泵"),
        Facility(id="f106", name="空调主机组", type="air_conditioner", category="hvac",
                 floor=1, position=(12, 8, 0.8), status="normal",
                 last_maintenance="2024-04-10", description="一楼中央空调机组"),
    ]

    floor2 = Floor(level=2, name="二层办公区", elevation=4.0)
    floor2.rooms = [
        Room(
            id="r201", name="开放办公区A", floor=2,
            corners=[(-15, -10), (0, -10), (0, -2), (-15, -2)],
            height=3.2, color="#5a6a85"
        ),
        Room(
            id="r202", name="开放办公区B", floor=2,
            corners=[(0, -10), (15, -10), (15, -2), (0, -2)],
            height=3.2, color="#5a6a85"
        ),
        Room(
            id="r203", name="会议室A", floor=2,
            corners=[(-15, 2), (-8, 2), (-8, 10), (-15, 10)],
            height=3.2, color="#6a7a95"
        ),
        Room(
            id="r204", name="会议室B", floor=2,
            corners=[(-8, 2), (0, 2), (0, 10), (-8, 10)],
            height=3.2, color="#6a7a95"
        ),
        Room(
            id="r205", name="经理办公室", floor=2,
            corners=[(0, 2), (10, 2), (10, 10), (0, 10)],
            height=3.2, color="#7a8aa5"
        ),
        Room(
            id="r206", name="储藏室", floor=2,
            corners=[(10, 2), (15, 2), (15, 6), (10, 6)],
            height=3.2, color="#4a5a75"
        ),
        Room(
            id="r207", name="主走廊", floor=2,
            corners=[(-15, -2), (15, -2), (15, 2), (-15, 2)],
            height=3.2, color="#3a4a65", is_corridor=True
        ),
        Room(
            id="r208", name="楼梯间", floor=2,
            corners=[(-6, -2), (-2, -2), (-2, 2), (-6, 2)],
            height=3.2, color="#2a3a4b", is_staircase=True
        ),
        Room(
            id="r209", name="电梯间", floor=2,
            corners=[(2, -2), (6, -2), (6, 2), (2, 2)],
            height=3.2, color="#2a3a4b", is_staircase=True
        ),
    ]
    floor2.doors = [
        Door(id="d201", position=(-8, -2, 0), width=1.5, height=2.0, rotation=0),
        Door(id="d202", position=(0, -2, 0), width=1.5, height=2.0, rotation=0),
        Door(id="d203", position=(8, -2, 0), width=1.5, height=2.0, rotation=0),
        Door(id="d204", position=(-12, 2, 0), width=1.5, height=2.0, rotation=3.14),
        Door(id="d205", position=(-4, 2, 0), width=1.2, height=2.0, rotation=3.14),
        Door(id="d206", position=(5, 2, 0), width=1.5, height=2.0, rotation=3.14),
        Door(id="d207", position=(12, 2, 0), width=1.0, height=2.0, rotation=3.14),
        Door(id="d208", position=(-4, -2, 0), width=1.2, height=2.0, rotation=1.57),
        Door(id="d209", position=(4, -2, 0), width=1.2, height=2.0, rotation=1.57),
    ]
    floor2.windows = [
        Window(id="w201", position=(-15, -6, 1.6), width=3.0, height=2.0, rotation=0),
        Window(id="w202", position=(-15, 6, 1.6), width=2.5, height=2.0, rotation=0),
        Window(id="w203", position=(15, -6, 1.6), width=3.0, height=2.0, rotation=3.14),
        Window(id="w204", position=(15, 6, 1.6), width=2.5, height=2.0, rotation=3.14),
        Window(id="w205", position=(-7, -10, 1.6), width=2.5, height=2.0, rotation=1.57),
        Window(id="w206", position=(7, -10, 1.6), width=2.5, height=2.0, rotation=1.57),
    ]
    floor2.facilities = [
        Facility(id="f201", name="消防栓2号", type="fire_hydrant", category="fire",
                 floor=2, position=(-13, 0, 1.0), status="normal",
                 last_maintenance="2024-03-15", description="二楼西侧消防栓"),
        Facility(id="f202", name="消防栓3号", type="fire_hydrant", category="fire",
                 floor=2, position=(13, 0, 1.0), status="normal",
                 last_maintenance="2024-03-15", description="二楼东侧消防栓"),
        Facility(id="f203", name="配电箱2号", type="distribution_box", category="electrical",
                 floor=2, position=(-13, -7, 1.5), status="normal",
                 last_maintenance="2024-02-20", description="二楼西区配电箱"),
        Facility(id="f204", name="配电箱3号", type="distribution_box", category="electrical",
                 floor=2, position=(13, -7, 1.5), status="warning",
                 last_maintenance="2023-11-10", description="二楼东区配电箱，需维护"),
        Facility(id="f205", name="安全出口B", type="emergency_exit", category="fire",
                 floor=2, position=(-10, -9.7, 1.5), status="normal",
                 last_maintenance="2024-01-10", description="二楼西南侧安全出口"),
        Facility(id="f206", name="电梯2号", type="elevator", category="electrical",
                 floor=2, position=(4, 0, 1.5), status="normal",
                 last_maintenance="2024-04-01", description="客用电梯"),
        Facility(id="f207", name="打印机区", type="printer_station", category="electrical",
                 floor=2, position=(12, 4, 1.0), status="normal",
                 last_maintenance="2024-03-05", description="打印复印一体机"),
        Facility(id="f208", name="空调回风系统", type="hvac_return", category="hvac",
                 floor=2, position=(0, -6, 0.5), status="normal",
                 last_maintenance="2024-04-08", description="二楼回风系统"),
    ]

    floor3 = Floor(level=3, name="三层研发区", elevation=7.2)
    floor3.rooms = [
        Room(
            id="r301", name="实验室A", floor=3,
            corners=[(-15, -10), (-5, -10), (-5, -2), (-15, -2)],
            height=3.2, color="#5a7a8a"
        ),
        Room(
            id="r302", name="实验室B", floor=3,
            corners=[(-5, -10), (5, -10), (5, -2), (-5, -2)],
            height=3.2, color="#5a7a8a"
        ),
        Room(
            id="r303", name="研发办公区", floor=3,
            corners=[(5, -10), (15, -10), (15, -2), (5, -2)],
            height=3.2, color="#6a8a9a"
        ),
        Room(
            id="r304", name="服务器机房", floor=3,
            corners=[(-15, 2), (-8, 2), (-8, 10), (-15, 10)],
            height=3.2, color="#2a3a4a"
        ),
        Room(
            id="r305", name="档案室", floor=3,
            corners=[(-8, 2), (-2, 2), (-2, 10), (-8, 10)],
            height=3.2, color="#4a5a6a"
        ),
        Room(
            id="r306", name="培训室", floor=3,
            corners=[(2, 2), (15, 2), (15, 10), (2, 10)],
            height=3.2, color="#6a7a9a"
        ),
        Room(
            id="r307", name="主走廊", floor=3,
            corners=[(-15, -2), (15, -2), (15, 2), (-15, 2)],
            height=3.2, color="#3a4a65", is_corridor=True
        ),
        Room(
            id="r308", name="楼梯间", floor=3,
            corners=[(-6, -2), (-2, -2), (-2, 2), (-6, 2)],
            height=3.2, color="#2a3a4b", is_staircase=True
        ),
        Room(
            id="r309", name="电梯间", floor=3,
            corners=[(2, -2), (6, -2), (6, 2), (2, 2)],
            height=3.2, color="#2a3a4b", is_staircase=True
        ),
    ]
    floor3.doors = [
        Door(id="d301", position=(-10, -2, 0), width=1.8, height=2.0, rotation=0),
        Door(id="d302", position=(0, -2, 0), width=1.5, height=2.0, rotation=0),
        Door(id="d303", position=(10, -2, 0), width=1.5, height=2.0, rotation=0),
        Door(id="d304", position=(-12, 2, 0), width=1.5, height=2.0, rotation=3.14),
        Door(id="d305", position=(-5, 2, 0), width=1.2, height=2.0, rotation=3.14),
        Door(id="d306", position=(8, 2, 0), width=1.8, height=2.0, rotation=3.14),
        Door(id="d307", position=(-4, -2, 0), width=1.2, height=2.0, rotation=1.57),
        Door(id="d308", position=(4, -2, 0), width=1.2, height=2.0, rotation=1.57),
    ]
    floor3.windows = [
        Window(id="w301", position=(-15, -6, 1.6), width=2.5, height=2.0, rotation=0),
        Window(id="w302", position=(-15, 6, 1.6), width=2.0, height=2.0, rotation=0),
        Window(id="w303", position=(15, -6, 1.6), width=2.5, height=2.0, rotation=3.14),
        Window(id="w304", position=(15, 6, 1.6), width=2.5, height=2.0, rotation=3.14),
        Window(id="w305", position=(0, -10, 1.6), width=2.5, height=2.0, rotation=1.57),
    ]
    floor3.facilities = [
        Facility(id="f301", name="消防栓4号", type="fire_hydrant", category="fire",
                 floor=3, position=(-13, 0, 1.0), status="normal",
                 last_maintenance="2024-03-15", description="三楼西侧消防栓"),
        Facility(id="f302", name="消防栓5号", type="fire_hydrant", category="fire",
                 floor=3, position=(13, 0, 1.0), status="normal",
                 last_maintenance="2024-03-15", description="三楼东侧消防栓"),
        Facility(id="f303", name="总配电箱", type="main_distribution", category="electrical",
                 floor=3, position=(-13, 7, 1.5), status="normal",
                 last_maintenance="2024-02-20", description="主楼总配电控制"),
        Facility(id="f304", name="服务器机柜A", type="server_rack", category="electrical",
                 floor=3, position=(-12, 5, 1.5), status="normal",
                 last_maintenance="2024-04-05", description="主服务器机柜"),
        Facility(id="f305", name="安全出口C", type="emergency_exit", category="fire",
                 floor=3, position=(0, -9.7, 1.5), status="normal",
                 last_maintenance="2024-01-10", description="三楼南侧安全出口"),
        Facility(id="f306", name="电梯3号", type="elevator", category="electrical",
                 floor=3, position=(4, 0, 1.5), status="normal",
                 last_maintenance="2024-04-01", description="客用电梯"),
        Facility(id="f307", name="实验室排风系统", type="exhaust_system", category="hvac",
                 floor=3, position=(-10, -6, 0.5), status="normal",
                 last_maintenance="2024-03-10", description="实验室专用排风"),
        Facility(id="f308", name="精密空调", type="precision_ac", category="hvac",
                 floor=3, position=(-13, 3, 0.8), status="normal",
                 last_maintenance="2024-04-12", description="机房专用精密空调"),
        Facility(id="f309", name="消防气体灭火", type="gas_suppression", category="fire",
                 floor=3, position=(-9, 7, 0.5), status="normal",
                 last_maintenance="2024-02-28", description="机房气体灭火系统"),
    ]

    building.floors = [floor1, floor2, floor3]
    return building


app = Flask(__name__)
CORS(app)

building = create_building_data()


def room_to_dict(room: Room) -> dict:
    return {
        "id": room.id,
        "name": room.name,
        "floor": room.floor,
        "corners": [list(c) for c in room.corners],
        "height": room.height,
        "color": room.color,
        "is_corridor": room.is_corridor,
        "is_staircase": room.is_staircase,
    }


def door_to_dict(door: Door) -> dict:
    return {
        "id": door.id,
        "position": list(door.position),
        "width": door.width,
        "height": door.height,
        "rotation": door.rotation,
    }


def window_to_dict(window: Window) -> dict:
    return {
        "id": window.id,
        "position": list(window.position),
        "width": window.width,
        "height": window.height,
        "rotation": window.rotation,
    }


def facility_to_dict(facility: Facility) -> dict:
    return {
        "id": facility.id,
        "name": facility.name,
        "type": facility.type,
        "category": facility.category,
        "floor": facility.floor,
        "position": list(facility.position),
        "status": facility.status,
        "last_maintenance": facility.last_maintenance,
        "description": facility.description,
    }


def floor_to_dict(floor: Floor) -> dict:
    return {
        "level": floor.level,
        "name": floor.name,
        "elevation": floor.elevation,
        "rooms": [room_to_dict(r) for r in floor.rooms],
        "doors": [door_to_dict(d) for d in floor.doors],
        "windows": [window_to_dict(w) for w in floor.windows],
        "facilities": [facility_to_dict(f) for f in floor.facilities],
    }


@app.route("/api/building", methods=["GET"])
def get_building():
    data = {
        "name": building.name,
        "center": list(building.center),
        "floors": [floor_to_dict(f) for f in building.floors],
    }
    return jsonify(data)


@app.route("/api/floor/<int:floor_level>", methods=["GET"])
def get_floor(floor_level: int):
    for floor in building.floors:
        if floor.level == floor_level:
            return jsonify(floor_to_dict(floor))
    return jsonify({"error": "Floor not found"}), 404


@app.route("/api/facilities", methods=["GET"])
def get_facilities():
    floor_filter = request.args.get("floor", type=int)
    category_filter = request.args.get("category", type=str)
    
    all_facilities = []
    for floor in building.floors:
        if floor_filter and floor.level != floor_filter:
            continue
        for facility in floor.facilities:
            if category_filter and facility.category != category_filter:
                continue
            all_facilities.append(facility_to_dict(facility))
    
    return jsonify({"facilities": all_facilities})


@app.route("/api/facility/<facility_id>", methods=["GET"])
def get_facility(facility_id: str):
    for floor in building.floors:
        for facility in floor.facilities:
            if facility.id == facility_id:
                return jsonify(facility_to_dict(facility))
    return jsonify({"error": "Facility not found"}), 404


@app.route("/api/rooms/entry/<room_id>", methods=["GET"])
def get_room_entry(room_id: str):
    for floor in building.floors:
        for room in floor.rooms:
            if room.id == room_id:
                corners = room.corners
                if len(corners) >= 2:
                    entry_x = (corners[0][0] + corners[1][0]) / 2
                    entry_z = corners[0][1] + 1.0
                    entry_y = floor.elevation + 1.7
                    return jsonify({
                        "room_id": room_id,
                        "position": [entry_x, entry_y, entry_z],
                        "floor": floor.level,
                    })
    return jsonify({"error": "Room not found"}), 404


@app.route("/api/floors", methods=["GET"])
def get_floors_list():
    floors_list = [
        {"level": f.level, "name": f.name, "elevation": f.elevation}
        for f in building.floors
    ]
    return jsonify({"floors": floors_list})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
