import random
import uuid
import threading
import time
from datetime import datetime, timedelta
from typing import Callable, Optional


class Device:
    def __init__(self, device_id: str, name: str, device_type: str,
                 room_id: str, room_name: str, model: str):
        self.id = device_id
        self.name = name
        self.type = device_type
        self.room_id = room_id
        self.room_name = room_name
        self.model = model
        self.status = "normal"
        self.last_maintenance = (datetime.now() - timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")
        self.is_on = True
        self.volume = 50
        self.fault_records = self._generate_fault_records()
        self.fault_start_time: Optional[float] = None

    def _generate_fault_records(self) -> list:
        records = []
        for i in range(7):
            date = (datetime.now() - timedelta(days=6 - i)).strftime("%Y-%m-%d")
            count = random.choices([0, 1, 2, 3], weights=[60, 25, 10, 5])[0]
            records.append({"date": date, "count": count})
        return records

    def to_dict(self) -> dict:
        result = {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "room_id": self.room_id,
            "room_name": self.room_name,
            "model": self.model,
            "status": self.status,
            "last_maintenance": self.last_maintenance,
            "fault_records": self.fault_records,
        }
        if self.type in ("projector", "microphone"):
            result["is_on"] = self.is_on
        if self.type == "microphone":
            result["volume"] = self.volume
        return result


class DeviceSimulator:
    def __init__(self, on_status_change: Optional[Callable] = None):
        self.devices: list[Device] = []
        self.on_status_change = on_status_change
        self._running = False
        self._timer: Optional[threading.Timer] = None
        self._init_devices()

    def _init_devices(self):
        device_configs = [
            ("dev-1", "投影仪-1", "projector", "room-1", "3楼小型会议室A", "EPSON EB-X51"),
            ("dev-2", "投影仪-2", "projector", "room-3", "5楼中型会议室C", "BenQ MH535A"),
            ("dev-3", "投影仪-3", "projector", "room-5", "8楼大型会议室E", "Sony VPL-PHZ10"),
            ("dev-4", "投影仪-4", "projector", "room-7", "10楼VIP会议室G", "Optoma UHD38"),
            ("dev-5", "麦克风-1", "microphone", "room-3", "5楼中型会议室C", "Shure MX418"),
            ("dev-6", "麦克风-2", "microphone", "room-5", "8楼大型会议室E", "Sennheiser MEG 14-40"),
            ("dev-7", "麦克风-3", "microphone", "room-6", "8楼大型会议室F", "Audio-Technica AT8035"),
            ("dev-8", "麦克风-4", "microphone", "room-7", "10楼VIP会议室G", "Beyerdynamic M 99"),
            ("dev-9", "白板-1", "whiteboard", "room-1", "3楼小型会议室A", "Smart Board M600"),
            ("dev-10", "白板-2", "whiteboard", "room-3", "5楼中型会议室C", "Promethean ActivBoard"),
            ("dev-11", "白板-3", "whiteboard", "room-5", "8楼大型会议室E", "Samsung Flip 2"),
            ("dev-12", "白板-4", "whiteboard", "room-8", "2楼培训室H", "Google Jamboard"),
        ]
        for dev_id, name, dtype, rid, rname, model in device_configs:
            self.devices.append(Device(dev_id, name, dtype, rid, rname, model))

    def start(self):
        self._running = True
        self._schedule_update()

    def stop(self):
        self._running = False
        if self._timer:
            self._timer.cancel()

    def _schedule_update(self):
        if not self._running:
            return
        self._timer = threading.Timer(1.0, self._update_loop)
        self._timer.daemon = True
        self._timer.start()

    def _update_loop(self):
        if not self._running:
            return
        self._update_all_devices()
        self._schedule_update()

    def _update_all_devices(self):
        for device in self.devices:
            old_status = device.status

            if device.status == "normal":
                roll = random.random()
                if roll < 0.02:
                    device.status = "fault"
                    device.fault_start_time = time.time()
                elif roll < 0.12:
                    device.status = "warning"

            elif device.status == "warning":
                roll = random.random()
                if roll < 0.01:
                    device.status = "fault"
                    device.fault_start_time = time.time()
                elif roll < 0.06:
                    device.status = "normal"

            elif device.status == "fault":
                if device.fault_start_time and (time.time() - device.fault_start_time) >= 30:
                    device.status = "normal"
                    device.fault_start_time = None

            if old_status != device.status and self.on_status_change:
                self._record_fault(device, old_status, device.status)
                self.on_status_change(device)

    def _record_fault(self, device: Device, old_status: str, new_status: str):
        today = datetime.now().strftime("%Y-%m-%d")
        for record in device.fault_records:
            if record["date"] == today:
                if new_status == "fault":
                    record["count"] += 1
                break

    def control_device(self, device_id: str, action: str) -> Optional[Device]:
        device = next((d for d in self.devices if d.id == device_id), None)
        if not device:
            return None

        if device.type in ("projector", "microphone"):
            if action == "turn_on":
                device.is_on = True
            elif action == "turn_off":
                device.is_on = False

        if device.type == "microphone":
            if action == "volume_up":
                device.volume = min(100, device.volume + 1)
            elif action == "volume_down":
                device.volume = max(0, device.volume - 1)

        if self.on_status_change:
            self.on_status_change(device)

        return device

    def get_all_devices(self) -> list[dict]:
        return [d.to_dict() for d in self.devices]
