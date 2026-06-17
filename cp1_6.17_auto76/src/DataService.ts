import axios from 'axios';

export interface RoomData {
  id: string;
  name: string;
  floor: number;
  corners: number[][];
  height: number;
  color: string;
  is_corridor: boolean;
  is_staircase: boolean;
}

export interface DoorData {
  id: string;
  position: number[];
  width: number;
  height: number;
  rotation: number;
}

export interface WindowData {
  id: string;
  position: number[];
  width: number;
  height: number;
  rotation: number;
}

export interface FacilityData {
  id: string;
  name: string;
  type: string;
  category: string;
  floor: number;
  position: number[];
  status: string;
  last_maintenance: string;
  description: string;
}

export interface FloorData {
  level: number;
  name: string;
  elevation: number;
  rooms: RoomData[];
  doors: DoorData[];
  windows: WindowData[];
  facilities: FacilityData[];
}

export interface BuildingData {
  name: string;
  center: number[];
  floors: FloorData[];
}

export class DataService {
  private baseUrl: string = '/api';

  async getBuilding(): Promise<BuildingData> {
    try {
      const response = await axios.get(`${this.baseUrl}/building`);
      return response.data;
    } catch (error) {
      console.warn('Backend not available, using mock data');
      return this.getMockBuildingData();
    }
  }

  async getFloor(floorLevel: number): Promise<FloorData | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/floor/${floorLevel}`);
      return response.data;
    } catch (error) {
      const building = this.getMockBuildingData();
      return building.floors.find(f => f.level === floorLevel) || null;
    }
  }

  async getFacilities(floor?: number, category?: string): Promise<FacilityData[]> {
    try {
      const params: Record<string, string | number> = {};
      if (floor !== undefined) params.floor = floor;
      if (category) params.category = category;
      
      const response = await axios.get(`${this.baseUrl}/facilities`, { params });
      return response.data.facilities;
    } catch (error) {
      const building = this.getMockBuildingData();
      let facilities: FacilityData[] = [];
      for (const f of building.floors) {
        if (floor !== undefined && f.level !== floor) continue;
        for (const fac of f.facilities) {
          if (category && fac.category !== category) continue;
          facilities.push(fac);
        }
      }
      return facilities;
    }
  }

  async getFacility(facilityId: string): Promise<FacilityData | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/facility/${facilityId}`);
      return response.data;
    } catch (error) {
      const building = this.getMockBuildingData();
      for (const f of building.floors) {
        for (const fac of f.facilities) {
          if (fac.id === facilityId) return fac;
        }
      }
      return null;
    }
  }

  async getRoomEntry(roomId: string): Promise<{ room_id: string; position: number[]; floor: number } | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/rooms/entry/${roomId}`);
      return response.data;
    } catch (error) {
      const building = this.getMockBuildingData();
      for (const f of building.floors) {
        for (const room of f.rooms) {
          if (room.id === roomId) {
            const corners = room.corners;
            if (corners.length >= 2) {
              const entryX = (corners[0][0] + corners[1][0]) / 2;
              const entryZ = corners[0][1] + 1.0;
              const entryY = f.elevation + 1.7;
              return { room_id: roomId, position: [entryX, entryY, entryZ], floor: f.level };
            }
          }
        }
      }
      return null;
    }
  }

  async getFloorsList(): Promise<{ level: number; name: string; elevation: number }[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/floors`);
      return response.data.floors;
    } catch (error) {
      const building = this.getMockBuildingData();
      return building.floors.map(f => ({ level: f.level, name: f.name, elevation: f.elevation }));
    }
  }

  private getMockBuildingData(): BuildingData {
    return {
      name: '智慧办公楼',
      center: [0, 1.5, 0],
      floors: [
        {
          level: 1,
          name: '一层大厅',
          elevation: 0,
          rooms: [
            { id: 'r101', name: '大厅', floor: 1, corners: [[-15, -10], [15, -10], [15, 10], [-15, 10]], height: 4.0, color: '#4a5568', is_corridor: false, is_staircase: false },
            { id: 'r102', name: '前台接待区', floor: 1, corners: [[-15, -10], [-8, -10], [-8, 10], [-15, 10]], height: 4.0, color: '#5a6578', is_corridor: false, is_staircase: false },
            { id: 'r103', name: '休息区', floor: 1, corners: [[8, -10], [15, -10], [15, 0], [8, 0]], height: 4.0, color: '#4a5a78', is_corridor: false, is_staircase: false },
            { id: 'r104', name: '咖啡区', floor: 1, corners: [[8, 0], [15, 0], [15, 10], [8, 10]], height: 4.0, color: '#4a5a78', is_corridor: false, is_staircase: false },
            { id: 'r105', name: '东走廊', floor: 1, corners: [[-8, -10], [8, -10], [8, -6], [-8, -6]], height: 4.0, color: '#3a4a5b', is_corridor: true, is_staircase: false },
            { id: 'r106', name: '西走廊', floor: 1, corners: [[-8, 6], [8, 6], [8, 10], [-8, 10]], height: 4.0, color: '#3a4a5b', is_corridor: true, is_staircase: false },
            { id: 'r107', name: '楼梯间', floor: 1, corners: [[-6, -2], [-2, -2], [-2, 2], [-6, 2]], height: 4.0, color: '#2a3a4b', is_corridor: false, is_staircase: true },
            { id: 'r108', name: '电梯间', floor: 1, corners: [[2, -2], [6, -2], [6, 2], [2, 2]], height: 4.0, color: '#2a3a4b', is_corridor: false, is_staircase: true },
          ],
          doors: [
            { id: 'd101', position: [-8, -8, 0], width: 1.5, height: 2.2, rotation: 0 },
            { id: 'd102', position: [0, -10, 0], width: 2.0, height: 2.5, rotation: 1.57 },
            { id: 'd103', position: [8, -8, 0], width: 1.5, height: 2.2, rotation: 0 },
            { id: 'd104', position: [-8, 8, 0], width: 1.5, height: 2.2, rotation: 0 },
            { id: 'd105', position: [8, 8, 0], width: 1.5, height: 2.2, rotation: 0 },
          ],
          windows: [
            { id: 'w101', position: [-15, -5, 2], width: 2.5, height: 2.0, rotation: 0 },
            { id: 'w102', position: [-15, 5, 2], width: 2.5, height: 2.0, rotation: 0 },
            { id: 'w103', position: [15, -5, 2], width: 2.5, height: 2.0, rotation: 3.14 },
            { id: 'w104', position: [15, 5, 2], width: 2.5, height: 2.0, rotation: 3.14 },
          ],
          facilities: [
            { id: 'f101', name: '消防栓1号', type: 'fire_hydrant', category: 'fire', floor: 1, position: [-12, 0, 1.0], status: 'normal', last_maintenance: '2024-03-15', description: '一楼大厅西侧消防栓' },
            { id: 'f102', name: '配电箱1号', type: 'distribution_box', category: 'electrical', floor: 1, position: [12, -5, 1.5], status: 'normal', last_maintenance: '2024-02-20', description: '一楼东侧配电箱' },
            { id: 'f103', name: '安全出口A', type: 'emergency_exit', category: 'fire', floor: 1, position: [0, -9.7, 1.5], status: 'normal', last_maintenance: '2024-01-10', description: '一楼南侧安全出口' },
            { id: 'f104', name: '电梯1号', type: 'elevator', category: 'electrical', floor: 1, position: [4, 0, 1.5], status: 'normal', last_maintenance: '2024-04-01', description: '客用电梯' },
            { id: 'f105', name: '消防喷淋泵', type: 'sprinkler_pump', category: 'fire', floor: 1, position: [-12, -8, 0.5], status: 'normal', last_maintenance: '2024-03-20', description: '喷淋系统主泵' },
            { id: 'f106', name: '空调主机组', type: 'air_conditioner', category: 'hvac', floor: 1, position: [12, 8, 0.8], status: 'normal', last_maintenance: '2024-04-10', description: '一楼中央空调机组' },
          ],
        },
        {
          level: 2,
          name: '二层办公区',
          elevation: 4.0,
          rooms: [
            { id: 'r201', name: '开放办公区A', floor: 2, corners: [[-15, -10], [0, -10], [0, -2], [-15, -2]], height: 3.2, color: '#5a6a85', is_corridor: false, is_staircase: false },
            { id: 'r202', name: '开放办公区B', floor: 2, corners: [[0, -10], [15, -10], [15, -2], [0, -2]], height: 3.2, color: '#5a6a85', is_corridor: false, is_staircase: false },
            { id: 'r203', name: '会议室A', floor: 2, corners: [[-15, 2], [-8, 2], [-8, 10], [-15, 10]], height: 3.2, color: '#6a7a95', is_corridor: false, is_staircase: false },
            { id: 'r204', name: '会议室B', floor: 2, corners: [[-8, 2], [0, 2], [0, 10], [-8, 10]], height: 3.2, color: '#6a7a95', is_corridor: false, is_staircase: false },
            { id: 'r205', name: '经理办公室', floor: 2, corners: [[0, 2], [10, 2], [10, 10], [0, 10]], height: 3.2, color: '#7a8aa5', is_corridor: false, is_staircase: false },
            { id: 'r206', name: '储藏室', floor: 2, corners: [[10, 2], [15, 2], [15, 6], [10, 6]], height: 3.2, color: '#4a5a75', is_corridor: false, is_staircase: false },
            { id: 'r207', name: '主走廊', floor: 2, corners: [[-15, -2], [15, -2], [15, 2], [-15, 2]], height: 3.2, color: '#3a4a65', is_corridor: true, is_staircase: false },
            { id: 'r208', name: '楼梯间', floor: 2, corners: [[-6, -2], [-2, -2], [-2, 2], [-6, 2]], height: 3.2, color: '#2a3a4b', is_corridor: false, is_staircase: true },
            { id: 'r209', name: '电梯间', floor: 2, corners: [[2, -2], [6, -2], [6, 2], [2, 2]], height: 3.2, color: '#2a3a4b', is_corridor: false, is_staircase: true },
          ],
          doors: [],
          windows: [],
          facilities: [
            { id: 'f201', name: '消防栓2号', type: 'fire_hydrant', category: 'fire', floor: 2, position: [-13, 0, 1.0], status: 'normal', last_maintenance: '2024-03-15', description: '二楼西侧消防栓' },
            { id: 'f202', name: '消防栓3号', type: 'fire_hydrant', category: 'fire', floor: 2, position: [13, 0, 1.0], status: 'normal', last_maintenance: '2024-03-15', description: '二楼东侧消防栓' },
            { id: 'f203', name: '配电箱2号', type: 'distribution_box', category: 'electrical', floor: 2, position: [-13, -7, 1.5], status: 'normal', last_maintenance: '2024-02-20', description: '二楼西区配电箱' },
            { id: 'f204', name: '配电箱3号', type: 'distribution_box', category: 'electrical', floor: 2, position: [13, -7, 1.5], status: 'warning', last_maintenance: '2023-11-10', description: '二楼东区配电箱，需维护' },
            { id: 'f205', name: '安全出口B', type: 'emergency_exit', category: 'fire', floor: 2, position: [-10, -9.7, 1.5], status: 'normal', last_maintenance: '2024-01-10', description: '二楼西南侧安全出口' },
            { id: 'f206', name: '电梯2号', type: 'elevator', category: 'electrical', floor: 2, position: [4, 0, 1.5], status: 'normal', last_maintenance: '2024-04-01', description: '客用电梯' },
            { id: 'f207', name: '打印机区', type: 'printer_station', category: 'electrical', floor: 2, position: [12, 4, 1.0], status: 'normal', last_maintenance: '2024-03-05', description: '打印复印一体机' },
            { id: 'f208', name: '空调回风系统', type: 'hvac_return', category: 'hvac', floor: 2, position: [0, -6, 0.5], status: 'normal', last_maintenance: '2024-04-08', description: '二楼回风系统' },
          ],
        },
        {
          level: 3,
          name: '三层研发区',
          elevation: 7.2,
          rooms: [
            { id: 'r301', name: '实验室A', floor: 3, corners: [[-15, -10], [-5, -10], [-5, -2], [-15, -2]], height: 3.2, color: '#5a7a8a', is_corridor: false, is_staircase: false },
            { id: 'r302', name: '实验室B', floor: 3, corners: [[-5, -10], [5, -10], [5, -2], [-5, -2]], height: 3.2, color: '#5a7a8a', is_corridor: false, is_staircase: false },
            { id: 'r303', name: '研发办公区', floor: 3, corners: [[5, -10], [15, -10], [15, -2], [5, -2]], height: 3.2, color: '#6a8a9a', is_corridor: false, is_staircase: false },
            { id: 'r304', name: '服务器机房', floor: 3, corners: [[-15, 2], [-8, 2], [-8, 10], [-15, 10]], height: 3.2, color: '#2a3a4a', is_corridor: false, is_staircase: false },
            { id: 'r305', name: '档案室', floor: 3, corners: [[-8, 2], [-2, 2], [-2, 10], [-8, 10]], height: 3.2, color: '#4a5a6a', is_corridor: false, is_staircase: false },
            { id: 'r306', name: '培训室', floor: 3, corners: [[2, 2], [15, 2], [15, 10], [2, 10]], height: 3.2, color: '#6a7a9a', is_corridor: false, is_staircase: false },
            { id: 'r307', name: '主走廊', floor: 3, corners: [[-15, -2], [15, -2], [15, 2], [-15, 2]], height: 3.2, color: '#3a4a65', is_corridor: true, is_staircase: false },
            { id: 'r308', name: '楼梯间', floor: 3, corners: [[-6, -2], [-2, -2], [-2, 2], [-6, 2]], height: 3.2, color: '#2a3a4b', is_corridor: false, is_staircase: true },
            { id: 'r309', name: '电梯间', floor: 3, corners: [[2, -2], [6, -2], [6, 2], [2, 2]], height: 3.2, color: '#2a3a4b', is_corridor: false, is_staircase: true },
          ],
          doors: [],
          windows: [],
          facilities: [
            { id: 'f301', name: '消防栓4号', type: 'fire_hydrant', category: 'fire', floor: 3, position: [-13, 0, 1.0], status: 'normal', last_maintenance: '2024-03-15', description: '三楼西侧消防栓' },
            { id: 'f302', name: '消防栓5号', type: 'fire_hydrant', category: 'fire', floor: 3, position: [13, 0, 1.0], status: 'normal', last_maintenance: '2024-03-15', description: '三楼东侧消防栓' },
            { id: 'f303', name: '总配电箱', type: 'main_distribution', category: 'electrical', floor: 3, position: [-13, 7, 1.5], status: 'normal', last_maintenance: '2024-02-20', description: '主楼总配电控制' },
            { id: 'f304', name: '服务器机柜A', type: 'server_rack', category: 'electrical', floor: 3, position: [-12, 5, 1.5], status: 'normal', last_maintenance: '2024-04-05', description: '主服务器机柜' },
            { id: 'f305', name: '安全出口C', type: 'emergency_exit', category: 'fire', floor: 3, position: [0, -9.7, 1.5], status: 'normal', last_maintenance: '2024-01-10', description: '三楼南侧安全出口' },
            { id: 'f306', name: '电梯3号', type: 'elevator', category: 'electrical', floor: 3, position: [4, 0, 1.5], status: 'normal', last_maintenance: '2024-04-01', description: '客用电梯' },
            { id: 'f307', name: '实验室排风系统', type: 'exhaust_system', category: 'hvac', floor: 3, position: [-10, -6, 0.5], status: 'normal', last_maintenance: '2024-03-10', description: '实验室专用排风' },
            { id: 'f308', name: '精密空调', type: 'precision_ac', category: 'hvac', floor: 3, position: [-13, 3, 0.8], status: 'normal', last_maintenance: '2024-04-12', description: '机房专用精密空调' },
            { id: 'f309', name: '消防气体灭火', type: 'gas_suppression', category: 'fire', floor: 3, position: [-9, 7, 0.5], status: 'normal', last_maintenance: '2024-02-28', description: '机房气体灭火系统' },
          ],
        },
      ],
    };
  }
}
