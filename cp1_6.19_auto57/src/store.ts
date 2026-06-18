import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LayerType = 'bone' | 'muscle' | 'vessel'

export interface PartInfo {
  id: string
  name: string
  nameEn: string
  type: LayerType
  description: string
  data: Record<string, string>
}

interface AppState {
  boneVisible: boolean
  muscleVisible: boolean
  vesselVisible: boolean
  boneOpacity: number
  muscleOpacity: number
  vesselOpacity: number
  slicePosition: number
  selectedPartId: string | null
  partsDatabase: PartInfo[]

  toggleLayer: (layer: LayerType) => void
  setLayerOpacity: (layer: LayerType, opacity: number) => void
  setSlicePosition: (position: number) => void
  setSelectedPart: (partId: string | null) => void
  getPartById: (partId: string) => PartInfo | undefined
}

const PARTS_DATABASE: PartInfo[] = [
  {
    id: 'skull',
    name: '颅骨',
    nameEn: 'Skull',
    type: 'bone',
    description: '颅骨是构成头部的骨性结构，由23块骨头组成（不包括3对听小骨），保护大脑和头部感觉器官。',
    data: { '重量': '约 800g', '骨块数量': '23块（不含听小骨）', '主要功能': '保护大脑、支撑面部结构' },
  },
  {
    id: 'mandible',
    name: '下颌骨',
    nameEn: 'Mandible',
    type: 'bone',
    description: '下颌骨是面部最大、最强的骨骼，构成下巴并支撑下排牙齿，是颅骨中唯一可活动的骨头。',
    data: { '长度': '约 22cm', '特点': '唯一可活动的颅骨', '功能': '咀嚼、言语' },
  },
  {
    id: 'spine',
    name: '脊柱',
    nameEn: 'Vertebral Column',
    type: 'bone',
    description: '脊柱由24块椎骨、骶骨和尾骨组成，是人体的中轴骨，支撑躯干并保护脊髓。',
    data: { '椎骨数量': '24块（不含骶尾骨）', '长度': '约 70-75cm', '生理弯曲': '4个（颈曲、胸曲、腰曲、骶曲）' },
  },
  {
    id: 'ribcage',
    name: '胸廓',
    nameEn: 'Rib Cage',
    type: 'bone',
    description: '胸廓由12对肋骨、胸骨和胸椎构成，保护心肺等重要器官，并参与呼吸运动。',
    data: { '肋骨数量': '12对（24根）', '容积': '约 5-6升', '功能': '保护心肺、辅助呼吸' },
  },
  {
    id: 'sternum',
    name: '胸骨',
    nameEn: 'Sternum',
    type: 'bone',
    description: '胸骨是位于胸前壁正中的扁骨，分为胸骨柄、胸骨体和剑突三部分，与锁骨和上7对肋骨相连。',
    data: { '长度': '约 17cm', '分部': '柄、体、剑突', '连接': '与锁骨及7对肋软骨相连' },
  },
  {
    id: 'clavicle',
    name: '锁骨',
    nameEn: 'Clavicle',
    type: 'bone',
    description: '锁骨是连接胸骨与肩胛骨的S形长骨，支持上肢活动，是人体最常发生骨折的骨之一。',
    data: { '长度': '约 15cm', '形状': 'S形双弯曲', '功能': '支撑肩胛带、保护血管神经' },
  },
  {
    id: 'scapula',
    name: '肩胛骨',
    nameEn: 'Scapula',
    type: 'bone',
    description: '肩胛骨是位于背部的三角形扁骨，与锁骨和肱骨构成肩关节，是上肢运动的重要支点。',
    data: { '形状': '三角形扁骨', '主要结构': '肩胛冈、肩峰、喙突', '功能': '参与肩关节各方向运动' },
  },
  {
    id: 'humerus',
    name: '肱骨',
    nameEn: 'Humerus',
    type: 'bone',
    description: '肱骨是上臂的长骨，近端与肩胛骨形成肩关节，远端与尺骨、桡骨形成肘关节。',
    data: { '长度': '约 30-35cm', '类型': '长骨', '功能': '上肢运动的主要杠杆' },
  },
  {
    id: 'pelvis',
    name: '骨盆',
    nameEn: 'Pelvis',
    type: 'bone',
    description: '骨盆由髋骨（髂骨、坐骨、耻骨）、骶骨和尾骨构成，支撑体重并保护盆腔脏器。',
    data: { '组成': '2髋骨+骶骨+尾骨', '功能': '承重、保护盆腔器官', '特点': '男女形态差异明显' },
  },

  {
    id: 'trapezius',
    name: '斜方肌',
    nameEn: 'Trapezius',
    type: 'muscle',
    description: '斜方肌是项部和背部浅层的扁肌，呈三角形，左右相合呈斜方形，负责肩胛骨的运动。',
    data: { '起点': '上项线、枕外隆凸、项韧带、C7-T12棘突', '止点': '锁骨外侧1/3、肩峰、肩胛冈', '功能': '上提、下降、内收肩胛骨' },
  },
  {
    id: 'pectoralis-major',
    name: '胸大肌',
    nameEn: 'Pectoralis Major',
    type: 'muscle',
    description: '胸大肌是胸前壁浅层的扇形阔肌，覆盖胸廓前壁大部分，是上肢运动的重要肌肉。',
    data: { '起点': '锁骨内侧半、胸骨、上6肋软骨', '止点': '肱骨大结节嵴', '功能': '内收、内旋、前屈肩关节' },
  },
  {
    id: 'deltoid',
    name: '三角肌',
    nameEn: 'Deltoid',
    type: 'muscle',
    description: '三角肌是肩部的倒三角形肌肉，覆盖肩关节，使肩部呈现圆隆外形，是肌肉注射的常用部位。',
    data: { '起点': '锁骨外侧1/3、肩峰、肩胛冈', '止点': '肱骨三角肌粗隆', '功能': '外展、前屈、后伸肩关节' },
  },
  {
    id: 'biceps-brachii',
    name: '肱二头肌',
    nameEn: 'Biceps Brachii',
    type: 'muscle',
    description: '肱二头肌位于上臂前侧，有长、短两头，是最著名的上肢肌肉之一，主要负责屈肘。',
    data: { '起点': '长头：盂上结节；短头：喙突', '止点': '桡骨粗隆', '功能': '屈肘关节、前臂旋后、协助屈肩' },
  },
  {
    id: 'triceps-brachii',
    name: '肱三头肌',
    nameEn: 'Triceps Brachii',
    type: 'muscle',
    description: '肱三头肌位于上臂后侧，有长头、外侧头和内侧头三个头，与肱二头肌拮抗。',
    data: { '起点': '长头：盂下结节；外侧头/内侧头：肱骨后面', '止点': '尺骨鹰嘴', '功能': '伸肘关节、长头可协助伸肩' },
  },
  {
    id: 'latissimus-dorsi',
    name: '背阔肌',
    nameEn: 'Latissimus Dorsi',
    type: 'muscle',
    description: '背阔肌是全身最大的阔肌，位于背下部和胸侧部，呈三角形，是\"背肌之王\"。',
    data: { '起点': '下6胸椎棘突、全部腰椎棘突、骶正中嵴、髂嵴后部', '止点': '肱骨小结节嵴', '功能': '后伸、内收、内旋肩关节（引体向上）' },
  },
  {
    id: 'rectus-abdominis',
    name: '腹直肌',
    nameEn: 'Rectus Abdominis',
    type: 'muscle',
    description: '腹直肌是位于腹前壁正中线两侧的带状长肌，被3-4条腱划分隔，是核心肌群的重要组成。',
    data: { '起点': '耻骨联合、耻骨结节', '止点': '第5-7肋软骨前面、剑突', '功能': '前屈脊柱、压缩腹腔、协助呼吸' },
  },
  {
    id: 'obliques',
    name: '腹外斜肌',
    nameEn: 'External Oblique',
    type: 'muscle',
    description: '腹外斜肌是腹前外侧壁浅层的阔肌，肌纤维由外上斜向内下，参与形成腹直肌鞘和腹股沟韧带。',
    data: { '起点': '下8肋骨外面', '止点': '髂嵴前部、白线、腹股沟韧带', '功能': '侧屈、旋转脊柱、压缩腹腔' },
  },
  {
    id: 'sternocleidomastoid',
    name: '胸锁乳突肌',
    nameEn: 'Sternocleidomastoid',
    type: 'muscle',
    description: '胸锁乳突肌是颈部最明显的肌肉，斜行于颈部两侧，是重要的体表标志。',
    data: { '起点': '胸骨柄前面、锁骨内侧端', '止点': '颞骨乳突、上项线外侧1/2', '功能': '一侧收缩头转向对侧；两侧收缩头后仰' },
  },

  {
    id: 'aorta',
    name: '主动脉',
    nameEn: 'Aorta',
    type: 'vessel',
    description: '主动脉是体循环的动脉主干，是人体最粗大的动脉，从左心室发出，依次分为升主动脉、主动脉弓和降主动脉。',
    data: { '直径': '约 2.5-3.5cm（根部）', '全长': '约 40-45cm', '血流量': '约 5L/min（静息状态）' },
  },
  {
    id: 'superior-vena-cava',
    name: '上腔静脉',
    nameEn: 'Superior Vena Cava',
    type: 'vessel',
    description: '上腔静脉是收集上半身静脉血的粗大静脉干，由左右头臂静脉汇合而成，注入右心房。',
    data: { '直径': '约 2cm', '长度': '约 7cm', '功能': '收集膈以上静脉血回心' },
  },
  {
    id: 'carotid-artery',
    name: '颈总动脉',
    nameEn: 'Common Carotid Artery',
    type: 'vessel',
    description: '颈总动脉是头颈部的动脉主干，右侧发自头臂干，左侧直接起自主动脉弓，在甲状软骨上缘分为颈内、外动脉。',
    data: { '直径': '约 6-8mm', '搏动点': '甲状软骨外侧可触及', '功能': '供应头颈部血液' },
  },
  {
    id: 'jugular-vein',
    name: '颈内静脉',
    nameEn: 'Internal Jugular Vein',
    type: 'vessel',
    description: '颈内静脉是头颈部静脉回流的主干，在颅底颈静脉孔处续接乙状窦，与锁骨下静脉合成头臂静脉。',
    data: { '直径': '约 1-1.5cm', '位置': '颈动脉鞘内，颈总动脉外侧', '功能': '收集颅内和面部静脉血' },
  },
  {
    id: 'subclavian-artery',
    name: '锁骨下动脉',
    nameEn: 'Subclavian Artery',
    type: 'vessel',
    description: '锁骨下动脉是供应上肢和部分胸壁的动脉主干，左侧起自主动脉弓，右侧起自头臂干，第一肋外缘续为腋动脉。',
    data: { '直径': '约 8-10mm', '主要分支': '椎动脉、胸廓内动脉、甲状颈干', '功能': '供应上肢、胸壁、部分脑部血液' },
  },
  {
    id: 'pulmonary-artery',
    name: '肺动脉干',
    nameEn: 'Pulmonary Trunk',
    type: 'vessel',
    description: '肺动脉干是肺循环的动脉主干，起自右心室，在主动脉弓下方分为左右肺动脉，输送乏氧血至肺部进行气体交换。',
    data: { '直径': '约 3cm（根部）', '长度': '约 5cm', '特点': '是人体唯一输送乏氧血的动脉' },
  },
  {
    id: 'brachial-artery',
    name: '肱动脉',
    nameEn: 'Brachial Artery',
    type: 'vessel',
    description: '肱动脉是上臂的动脉主干，在大圆肌腱下缘续接腋动脉，至肘窝分为桡动脉和尺动脉，是测量血压的常用部位。',
    data: { '直径': '约 4-5mm', '搏动点': '肘窝肱二头肌肌腱内侧', '功能': '供应上臂和前臂血液' },
  },
  {
    id: 'coronary-artery',
    name: '冠状动脉',
    nameEn: 'Coronary Artery',
    type: 'vessel',
    description: '冠状动脉是供应心脏本身血液的动脉，有左、右两支，起自升主动脉根部的主动脉窦，其病变导致冠心病。',
    data: { '直径': '约 2-4mm', '主要分支': '左前降支、左回旋支、右冠状动脉', '功能': '供应心肌血液（静息时占心输出量4%-5%）' },
  },
]

const STORAGE_KEY = 'anatomy-3d-visualizer-state'

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      boneVisible: true,
      muscleVisible: true,
      vesselVisible: true,
      boneOpacity: 1,
      muscleOpacity: 0.85,
      vesselOpacity: 0.9,
      slicePosition: 100,
      selectedPartId: null,
      partsDatabase: PARTS_DATABASE,

      toggleLayer: (layer) =>
        set((state) => {
          switch (layer) {
            case 'bone':
              return { boneVisible: !state.boneVisible }
            case 'muscle':
              return { muscleVisible: !state.muscleVisible }
            case 'vessel':
              return { vesselVisible: !state.vesselVisible }
          }
        }),

      setLayerOpacity: (layer, opacity) =>
        set(() => {
          switch (layer) {
            case 'bone':
              return { boneOpacity: opacity }
            case 'muscle':
              return { muscleOpacity: opacity }
            case 'vessel':
              return { vesselOpacity: opacity }
          }
        }),

      setSlicePosition: (position) => set({ slicePosition: position }),

      setSelectedPart: (partId) => set({ selectedPartId: partId }),

      getPartById: (partId) => {
        return get().partsDatabase.find((p) => p.id === partId)
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        boneVisible: state.boneVisible,
        muscleVisible: state.muscleVisible,
        vesselVisible: state.vesselVisible,
        boneOpacity: state.boneOpacity,
        muscleOpacity: state.muscleOpacity,
        vesselOpacity: state.vesselOpacity,
        slicePosition: state.slicePosition,
      }),
    },
  ),
)
