from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass, field


@dataclass
class Producer:
    id: int
    company_name: str
    registration_number: str
    contact_person: str
    phone: str
    origin_description: str
    qualification_files: List[str] = field(default_factory=list)


@dataclass
class Certification:
    id: int
    producer_id: int
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer: Optional[str] = None
    certificate_number: Optional[str] = None
    reject_reason: Optional[str] = None

    def to_dict(self) -> dict:
        producer = PRODUCERS.get(self.producer_id)
        return {
            'id': self.id,
            'producer_id': self.producer_id,
            'company_name': producer.company_name if producer else '',
            'registration_number': producer.registration_number if producer else '',
            'contact_person': producer.contact_person if producer else '',
            'phone': producer.phone if producer else '',
            'origin_description': producer.origin_description if producer else '',
            'qualification_files': producer.qualification_files if producer else [],
            'status': self.status,
            'submitted_at': self.submitted_at.strftime('%Y-%m-%d %H:%M:%S'),
            'reviewed_at': self.reviewed_at.strftime('%Y-%m-%d %H:%M:%S') if self.reviewed_at else None,
            'reviewer': self.reviewer,
            'certificate_number': self.certificate_number,
            'reject_reason': self.reject_reason
        }


@dataclass
class TraceStage:
    stage_name: str
    date: str
    location: str
    operator: str
    status: str
    remarks: str
    images: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            'stage_name': self.stage_name,
            'date': self.date,
            'location': self.location,
            'operator': self.operator,
            'status': self.status,
            'remarks': self.remarks,
            'images': self.images
        }


@dataclass
class ProductTrace:
    trace_code: str
    product_name: str
    product_type: str
    producer_name: str
    stages: List[TraceStage] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            'trace_code': self.trace_code,
            'product_name': self.product_name,
            'product_type': self.product_type,
            'producer_name': self.producer_name,
            'stages': [stage.to_dict() for stage in self.stages]
        }


def generate_mock_traces() -> dict:
    traces = {}
    mock_data = [
        {
            'trace_code': '202401010001',
            'product_name': '有机大米',
            'product_type': '粮食作物',
            'producer_name': '黑龙江五常绿源农业有限公司',
            'stages': [
                TraceStage(
                    stage_name='种植',
                    date='2024-04-15 08:30:00',
                    location='黑龙江省五常市山河镇太平村',
                    operator='张建国',
                    status='completed',
                    remarks='选用优质稻花香2号稻种，采用传统人工插秧方式，全程不使用化学农药和化肥，使用农家有机肥。',
                    images=[
                        'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400',
                        'https://images.unsplash.com/photo-1595503240812-7286aaf8a6e4?w=400',
                        'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='加工',
                    date='2024-10-20 14:20:00',
                    location='五常市绿源稻米加工厂',
                    operator='李志强',
                    status='completed',
                    remarks='采用低温碾米工艺，保留大米营养成分，经过色选机筛选，去除异色粒，确保米质均匀。',
                    images=[
                        'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
                        'https://images.unsplash.com/photo-1618220528978-b879439bd173?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='质检',
                    date='2024-10-22 09:45:00',
                    location='五常市农产品质量检测中心',
                    operator='王晓燕',
                    status='completed',
                    remarks='经检测，农药残留未检出，重金属含量符合国家标准，蛋白质含量7.2g/100g，直链淀粉含量16.8%，达到优质一级大米标准。',
                    images=[
                        'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400',
                        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400',
                        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='运输',
                    date='2024-10-25 06:00:00',
                    location='五常市 - 北京市冷链物流专线',
                    operator='陈明远',
                    status='completed',
                    remarks='使用恒温冷藏车运输，全程温度控制在15-20℃，相对湿度60-70%，GPS全程定位追踪，运输时长约18小时。',
                    images=[
                        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
                        'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='入库',
                    date='2024-10-26 08:30:00',
                    location='北京市朝阳区生鲜配送中心A区12号库',
                    operator='刘建国',
                    status='completed',
                    remarks='货物验收合格，数量5000袋，每袋5kg，存放于恒温仓库，保质期12个月，入库批次号RK20241026001。',
                    images=[
                        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400',
                        'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400',
                        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400'
                    ]
                )
            ]
        },
        {
            'trace_code': '202401010002',
            'product_name': '新疆阿克苏冰糖心苹果',
            'product_type': '新鲜水果',
            'producer_name': '新疆阿克苏红旗坡果业合作社',
            'stages': [
                TraceStage(
                    stage_name='种植',
                    date='2024-04-10 10:00:00',
                    location='新疆阿克苏市红旗坡农场',
                    operator='买买提·吐尔逊',
                    status='completed',
                    remarks='种植海拔1100米以上，昼夜温差大，日照充足，采用天山雪水灌溉，自然挂果成熟，不催熟不打蜡。',
                    images=[
                        'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
                        'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='加工',
                    date='2024-11-05 11:30:00',
                    location='阿克苏红旗坡果品加工厂',
                    operator='阿依古丽·库尔班',
                    status='completed',
                    remarks='人工采摘精选，按果径80-85mm、85-90mm分级，清洗后冷风干燥，无菌包装车间封装，全程质量追溯。',
                    images=[
                        'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400',
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
                        'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='质检',
                    date='2024-11-07 10:15:00',
                    location='阿克苏地区农产品检验检测中心',
                    operator='周丽娜',
                    status='completed',
                    remarks='糖度检测平均值18.2°Bx，冰糖心形成率92%，农残检测全部合格，符合绿色食品A级标准。',
                    images=[
                        'https://images.unsplash.com/photo-1610832958506-aa16e062fc44?w=400',
                        'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='运输',
                    date='2024-11-10 04:00:00',
                    location='阿克苏 - 上海冷链空运专线',
                    operator='库尔班·阿卜杜拉',
                    status='completed',
                    remarks='采用航空冷链运输，温度控制在0-4℃，全程冷链不断链，运输时长约6小时，到达上海虹桥机场。',
                    images=[
                        'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400',
                        'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='入库',
                    date='2024-11-10 16:30:00',
                    location='上海市浦东新区农产品冷链中心B3库区',
                    operator='陈志明',
                    status='pending',
                    remarks='正在办理入库手续，预计1小时内完成。',
                    images=[
                        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400'
                    ]
                )
            ]
        },
        {
            'trace_code': '202401010003',
            'product_name': '云南普洱古树茶',
            'product_type': '茶叶',
            'producer_name': '云南西双版纳易武古茶山茶业有限公司',
            'stages': [
                TraceStage(
                    stage_name='种植',
                    date='2024-03-28 07:30:00',
                    location='云南省西双版纳州易武镇麻黑古茶山',
                    operator='岩三囡',
                    status='completed',
                    remarks='采摘300年以上古树茶树鲜叶，一芽二叶标准，清晨露水未干时采摘，竹篓盛装，避免挤压发热。',
                    images=[
                        'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400',
                        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400',
                        'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='加工',
                    date='2024-03-28 18:00:00',
                    location='易武古镇传统制茶工坊',
                    operator='刀美英',
                    status='completed',
                    remarks='传统手工炒制：萎凋→杀青→揉捻→晒青→蒸压→干燥，每道工序手工完成，保留古树茶本真风味。',
                    images=[
                        'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=400',
                        'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400',
                        'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='质检',
                    date='2024-04-02 14:00:00',
                    location='云南省茶叶质量监督检验中心',
                    operator='李茶香',
                    status='completed',
                    remarks='普洱茶生茶，水浸出物含量48.5%，茶多酚含量28.3%，符合GB/T 22111-2008地理标志产品普洱茶标准。',
                    images=[
                        'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400',
                        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='运输',
                    date='2024-04-05 09:00:00',
                    location='西双版纳 - 广州陆运专线',
                    operator='张师傅',
                    status='completed',
                    remarks='恒温恒湿货车运输，温度20-25℃，湿度50-60%，避免异味污染，全程防震包装。',
                    images=[
                        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
                        'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400'
                    ]
                ),
                TraceStage(
                    stage_name='入库',
                    date='2024-04-07 11:20:00',
                    location='广州市荔湾区南方茶叶市场仓储中心',
                    operator='黄建国',
                    status='completed',
                    remarks='入库验收：357g茶饼×1000饼，包装完好无破损，存放于专业茶仓，适宜长期陈化。',
                    images=[
                        'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400',
                        'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
                        'https://images.unsplash.com/photo-1563822249366-3efb22b48522?w=400'
                    ]
                )
            ]
        }
    ]

    for item in mock_data:
        traces[item['trace_code']] = ProductTrace(
            trace_code=item['trace_code'],
            product_name=item['product_name'],
            product_type=item['product_type'],
            producer_name=item['producer_name'],
            stages=item['stages']
        )
    return traces


PRODUCERS: dict = {
    1: Producer(
        id=1,
        company_name='黑龙江五常绿源农业有限公司',
        registration_number='91230100MA12345678',
        contact_person='张建国',
        phone='13800138001',
        origin_description='公司位于黑龙江省五常市山河镇太平村，拥有水田面积5000亩，地处五常大米核心产区，土壤肥沃，水源来自龙凤山灌区，水质优良无污染。',
        qualification_files=['营业执照.pdf', '有机认证证书.pdf', '土地承包合同.pdf']
    ),
    2: Producer(
        id=2,
        company_name='新疆阿克苏红旗坡果业合作社',
        registration_number='93652900MA87654321',
        contact_person='买买提·吐尔逊',
        phone='13900139002',
        origin_description='合作社位于阿克苏市红旗坡农场，拥有果园面积2000亩，地处塔克拉玛干沙漠北缘，昼夜温差大，日照时间长，是冰糖心苹果的正宗产地。',
        qualification_files=['合作社营业执照.pdf', '绿色食品认证.pdf', '产地证明.pdf']
    ),
    3: Producer(
        id=3,
        company_name='云南西双版纳易武古茶山茶业有限公司',
        registration_number='91532800MA13579246',
        contact_person='岩三囡',
        phone='13700137003',
        origin_description='公司位于西双版纳易武古镇，拥有古茶园面积800亩，古茶树树龄均在100年以上，其中300年以上古树占40%，是易武正山普洱茶的核心产区。',
        qualification_files=['营业执照.pdf', '古树茶认证.pdf', '地理标志证明商标.pdf']
    )
}

CERTIFICATIONS: dict = {
    1: Certification(
        id=1,
        producer_id=1,
        status='approved',
        submitted_at=datetime(2024, 2, 15, 10, 30, 0),
        reviewed_at=datetime(2024, 2, 20, 14, 0, 0),
        reviewer='管理员王芳',
        certificate_number='CERT202402200001'
    ),
    2: Certification(
        id=2,
        producer_id=2,
        status='pending',
        submitted_at=datetime(2024, 11, 8, 9, 0, 0)
    ),
    3: Certification(
        id=3,
        producer_id=3,
        status='pending',
        submitted_at=datetime(2024, 11, 10, 16, 45, 0)
    ),
    4: Certification(
        id=4,
        producer_id=1,
        status='rejected',
        submitted_at=datetime(2024, 10, 1, 11, 0, 0),
        reviewed_at=datetime(2024, 10, 5, 9, 30, 0),
        reviewer='管理员李明',
        reject_reason='资质文件不完整，请补充土地使用证及近三年质检报告。'
    )
}

PRODUCT_TRACES = generate_mock_traces()
