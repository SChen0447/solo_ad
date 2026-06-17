import uuid
from datetime import datetime, timedelta
from typing import Optional

class Room:
    def __init__(self, room_id: str, name: str, floor: int, capacity: int, facilities: list):
        self.id = room_id
        self.name = name
        self.floor = floor
        self.capacity = capacity
        self.facilities = facilities

class Booking:
    def __init__(self, booking_id: str, room_id: str, title: str,
                 start_time: datetime, end_time: datetime,
                 attendees: int, notes: str = ""):
        self.id = booking_id
        self.room_id = room_id
        self.title = title
        self.start_time = start_time
        self.end_time = end_time
        self.attendees = attendees
        self.notes = notes

class RoomManager:
    def __init__(self):
        self.rooms: list[Room] = []
        self.bookings: list[Booking] = []
        self._init_rooms()

    def _init_rooms(self):
        room_data = [
            ("room-1", "小型会议室A", 3, 6, ["projector", "whiteboard"]),
            ("room-2", "小型会议室B", 3, 8, ["whiteboard", "phone"]),
            ("room-3", "中型会议室C", 5, 12, ["projector", "whiteboard", "phone"]),
            ("room-4", "中型会议室D", 5, 15, ["projector", "phone"]),
            ("room-5", "大型会议室E", 8, 30, ["projector", "whiteboard", "phone"]),
            ("room-6", "大型会议室F", 8, 40, ["projector", "whiteboard", "phone"]),
            ("room-7", "VIP会议室G", 10, 10, ["projector", "whiteboard", "phone"]),
            ("room-8", "培训室H", 2, 20, ["projector", "whiteboard"]),
        ]
        for rid, name, floor, cap, fac in room_data:
            self.rooms.append(Room(rid, name, floor, cap, fac))

    def get_all_rooms(self) -> list[dict]:
        now = datetime.now()
        result = []
        for room in self.rooms:
            room_bookings = [b for b in self.bookings if b.room_id == room.id]
            current = None
            for b in room_bookings:
                if b.start_time <= now < b.end_time:
                    current = b
                    break

            today_bookings = [
                b for b in room_bookings
                if b.start_time.date() == now.date()
            ]

            if current:
                status = "busy"
            elif any(b.start_time > now for b in today_bookings):
                status = "partial"
            else:
                status = "free"

            room_dict = {
                "id": room.id,
                "name": room.name,
                "floor": room.floor,
                "capacity": room.capacity,
                "facilities": room.facilities,
                "status": status,
            }
            if current:
                room_dict["currentBooking"] = {
                    "booking_id": current.id,
                    "title": current.title,
                    "endTime": current.end_time.isoformat(),
                }
            result.append(room_dict)
        return result

    def check_conflict(self, room_id: str, start_time: datetime, end_time: datetime,
                       exclude_booking_id: Optional[str] = None) -> bool:
        for b in self.bookings:
            if b.room_id != room_id:
                continue
            if exclude_booking_id and b.id == exclude_booking_id:
                continue
            if start_time < b.end_time and end_time > b.start_time:
                return True
        return False

    def create_booking(self, room_id: str, title: str, start_time: datetime,
                       end_time: datetime, attendees: int, notes: str = "") -> Optional[Booking]:
        if self.check_conflict(room_id, start_time, end_time):
            return None

        room = next((r for r in self.rooms if r.id == room_id), None)
        if not room:
            return None
        if attendees > room.capacity:
            return None

        booking = Booking(
            booking_id=str(uuid.uuid4()),
            room_id=room_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            attendees=attendees,
            notes=notes,
        )
        self.bookings.append(booking)
        return booking

    def cancel_booking(self, booking_id: str) -> bool:
        for i, b in enumerate(self.bookings):
            if b.id == booking_id:
                self.bookings.pop(i)
                return True
        return False

    def get_booking_history(self, room_id: Optional[str] = None) -> list[dict]:
        result = []
        for b in self.bookings:
            if room_id and b.room_id != room_id:
                continue
            result.append({
                "id": b.id,
                "room_id": b.room_id,
                "title": b.title,
                "start_time": b.start_time.isoformat(),
                "end_time": b.end_time.isoformat(),
                "attendees": b.attendees,
                "notes": b.notes,
            })
        return result

    def get_room_by_id(self, room_id: str) -> Optional[Room]:
        return next((r for r in self.rooms if r.id == room_id), None)
