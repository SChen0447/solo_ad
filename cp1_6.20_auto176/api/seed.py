import json
import random
import os
from urllib.parse import quote
from flask import Flask
from api.models import db, Plant


PLANTS_DATA = [
    {
        "scientific_name": "Rosa chinensis",
        "common_name": "月季",
        "family": "蔷薇科",
        "genus": "蔷薇属",
        "features_text": "常绿或半常绿低矮灌木，花型多样，花色丰富，有红、粉、白、黄等色，四季开花，叶片椭圆形，边缘有锯齿，茎上有刺。",
        "distribution": ["云南", "四川", "贵州", "湖南", "湖北"],
        "habitat": {"light": 80, "water": 60, "temperature": 65},
        "image_prompt": "beautiful Rosa chinensis flower in natural habitat photography",
    },
    {
        "scientific_name": "Prunus serrulata",
        "common_name": "樱花",
        "family": "蔷薇科",
        "genus": "樱属",
        "features_text": "落叶乔木，树皮紫褐色，花先叶开放或与叶同放，花色多为白色至粉红色，花瓣5枚，花序伞形，叶片椭圆状卵形。",
        "distribution": ["浙江", "江苏", "安徽", "湖北", "湖南"],
        "habitat": {"light": 75, "water": 55, "temperature": 55},
        "image_prompt": "beautiful Prunus serrulata cherry blossom tree in natural habitat photography",
    },
    {
        "scientific_name": "Malus spectabilis",
        "common_name": "海棠",
        "family": "蔷薇科",
        "genus": "苹果属",
        "features_text": "落叶小乔木，树形峭立，花未开时红色，开后渐变粉白色，果近球形，黄色，叶片椭圆形至长椭圆形。",
        "distribution": ["河北", "山东", "陕西", "江苏", "浙江"],
        "habitat": {"light": 70, "water": 50, "temperature": 55},
        "image_prompt": "beautiful Malus spectabilis crabapple blossom in natural habitat photography",
    },
    {
        "scientific_name": "Chrysanthemum morifolium",
        "common_name": "菊花",
        "family": "菊科",
        "genus": "菊属",
        "features_text": "多年生草本植物，头状花序单生或数个集生于茎枝顶端，花色繁多，有黄、白、紫、红等，叶片卵形至披针形，边缘有粗大锯齿。",
        "distribution": ["河南", "安徽", "浙江", "广东", "四川"],
        "habitat": {"light": 85, "water": 45, "temperature": 60},
        "image_prompt": "beautiful Chrysanthemum morifolium flower in natural habitat photography",
    },
    {
        "scientific_name": "Helianthus annuus",
        "common_name": "向日葵",
        "family": "菊科",
        "genus": "向日葵属",
        "features_text": "一年生草本植物，茎直立粗壮，头状花序极大，单生茎端，舌状花黄色，管状花棕色或紫色，叶片心形或卵圆形。",
        "distribution": ["黑龙江", "吉林", "辽宁", "内蒙古", "新疆"],
        "habitat": {"light": 95, "water": 40, "temperature": 70},
        "image_prompt": "beautiful Helianthus annuus sunflower in natural habitat photography",
    },
    {
        "scientific_name": "Taraxacum mongolicum",
        "common_name": "蒲公英",
        "family": "菊科",
        "genus": "蒲公英属",
        "features_text": "多年生草本，根圆锥状，叶莲座状平展，倒卵状披针形，头状花序单生花葶顶端，瘦果具白色冠毛，随风传播。",
        "distribution": ["全国广布"],
        "habitat": {"light": 80, "water": 35, "temperature": 60},
        "image_prompt": "beautiful Taraxacum mongolicum dandelion in natural habitat photography",
    },
    {
        "scientific_name": "Glycine max",
        "common_name": "大豆",
        "family": "豆科",
        "genus": "大豆属",
        "features_text": "一年生直立草本，茎密生褐色长硬毛，三出复叶，总状花序腋生，花白色或淡紫色，荚果肥大，种子椭圆形。",
        "distribution": ["黑龙江", "吉林", "辽宁", "河北", "山东"],
        "habitat": {"light": 80, "water": 55, "temperature": 70},
        "image_prompt": "beautiful Glycine max soybean plant in natural habitat photography",
    },
    {
        "scientific_name": "Sophora japonica",
        "common_name": "槐树",
        "family": "豆科",
        "genus": "槐属",
        "features_text": "落叶乔木，树冠圆形，羽状复叶，圆锥花序顶生，花黄白色，荚果串珠状，肉质不裂，树皮灰褐色。",
        "distribution": ["河北", "山东", "河南", "陕西", "山西"],
        "habitat": {"light": 75, "water": 40, "temperature": 55},
        "image_prompt": "beautiful Sophora japonica pagoda tree in natural habitat photography",
    },
    {
        "scientific_name": "Pueraria montana",
        "common_name": "葛藤",
        "family": "豆科",
        "genus": "葛属",
        "features_text": "粗壮藤本，茎基部木质，全株被黄色长硬毛，三出复叶，总状花序腋生，花紫红色，荚果条形扁平。",
        "distribution": ["湖南", "湖北", "广东", "广西", "云南"],
        "habitat": {"light": 70, "water": 60, "temperature": 70},
        "image_prompt": "beautiful Pueraria montana kudzu vine in natural habitat photography",
    },
    {
        "scientific_name": "Bambusa multiplex",
        "common_name": "凤尾竹",
        "family": "禾本科",
        "genus": "簕竹属",
        "features_text": "灌木型竹类，竿丛生，高2-3米，节间绿色，枝条多数簇生，叶细小披针形，排成羽状，姿态优美。",
        "distribution": ["广东", "广西", "福建", "云南", "海南"],
        "habitat": {"light": 65, "water": 75, "temperature": 80},
        "image_prompt": "beautiful Bambusa multiplex bamboo grove in natural habitat photography",
    },
    {
        "scientific_name": "Phyllostachys edulis",
        "common_name": "毛竹",
        "family": "禾本科",
        "genus": "刚竹属",
        "features_text": "大型散生竹，竿高可达20米，粗可达20厘米，新竿密被细柔毛及白粉，老竿无毛，节间短，笋期3-5月。",
        "distribution": ["浙江", "福建", "江西", "湖南", "安徽"],
        "habitat": {"light": 60, "water": 80, "temperature": 65},
        "image_prompt": "beautiful Phyllostachys edulis moso bamboo forest in natural habitat photography",
    },
    {
        "scientific_name": "Oryza sativa",
        "common_name": "水稻",
        "family": "禾本科",
        "genus": "稻属",
        "features_text": "一年生禾本，秆直立，高0.5-1.5米，叶片线状披针形，圆锥花序开展，颖果长椭圆形，全球重要粮食作物。",
        "distribution": ["湖南", "湖北", "江西", "江苏", "四川"],
        "habitat": {"light": 85, "water": 90, "temperature": 80},
        "image_prompt": "beautiful Oryza sativa rice paddy field in natural habitat photography",
    },
    {
        "scientific_name": "Lilium brownii",
        "common_name": "百合",
        "family": "百合科",
        "genus": "百合属",
        "features_text": "多年生球根草本，鳞茎由鳞片层层抱合而成，花大形漏斗状，白色带淡香，叶片散生，披针形。",
        "distribution": ["湖南", "湖北", "江西", "浙江", "安徽"],
        "habitat": {"light": 60, "water": 55, "temperature": 60},
        "image_prompt": "beautiful Lilium brownii lily flower in natural habitat photography",
    },
    {
        "scientific_name": "Asparagus cochinchinensis",
        "common_name": "天门冬",
        "family": "百合科",
        "genus": "天门冬属",
        "features_text": "多年生攀援草本，块根肉质簇生，茎细长常扭曲，叶状枝2-3簇生，花淡绿色，浆果球形熟时红色。",
        "distribution": ["云南", "贵州", "四川", "广西", "广东"],
        "habitat": {"light": 50, "water": 55, "temperature": 70},
        "image_prompt": "beautiful Asparagus cochinchinensis plant in natural habitat photography",
    },
    {
        "scientific_name": "Dendrobium nobile",
        "common_name": "石斛",
        "family": "兰科",
        "genus": "石斛属",
        "features_text": "多年生附生草本，茎丛生上部稍扁而弯曲，叶革质矩圆形，总状花序具1-4朵花，花淡紫色或白色带紫红先端。",
        "distribution": ["云南", "贵州", "广西", "四川", "西藏"],
        "habitat": {"light": 55, "water": 70, "temperature": 75},
        "image_prompt": "beautiful Dendrobium nobile orchid in natural habitat photography",
    },
    {
        "scientific_name": "Cymbidium goeringii",
        "common_name": "春兰",
        "family": "兰科",
        "genus": "兰属",
        "features_text": "地生兰，假鳞茎小，叶4-7枚带形，花单朵或双朵，淡绿色带紫褐色斑，香气清幽，花期2-3月。",
        "distribution": ["浙江", "江苏", "安徽", "湖北", "湖南"],
        "habitat": {"light": 45, "water": 55, "temperature": 55},
        "image_prompt": "beautiful Cymbidium goeringii spring orchid in natural habitat photography",
    },
    {
        "scientific_name": "Phalaenopsis aphrodite",
        "common_name": "蝴蝶兰",
        "family": "兰科",
        "genus": "蝴蝶兰属",
        "features_text": "附生兰，茎短被叶鞘包被，叶肥厚肉质，花序侧生弯曲，花大色白，唇瓣三裂，中裂片先端具须，花期长。",
        "distribution": ["台湾", "云南", "海南"],
        "habitat": {"light": 50, "water": 65, "temperature": 80},
        "image_prompt": "beautiful Phalaenopsis aphrodite moth orchid in natural habitat photography",
    },
    {
        "scientific_name": "Brassica rapa",
        "common_name": "油菜",
        "family": "十字花科",
        "genus": "芸薹属",
        "features_text": "一年生或二年生草本，茎直立有分枝，基生叶大头羽状分裂，总状花序花黄色，角果线形，种子球形。",
        "distribution": ["湖北", "湖南", "安徽", "江西", "四川"],
        "habitat": {"light": 85, "water": 55, "temperature": 55},
        "image_prompt": "beautiful Brassica rapa rapeseed flower field in natural habitat photography",
    },
    {
        "scientific_name": "Raphanus sativus",
        "common_name": "萝卜",
        "family": "十字花科",
        "genus": "萝卜属",
        "features_text": "二年生草本，直根肉质长圆形或圆锥形，外皮白色或红色，基生叶羽状裂，总状花序花白色或淡紫色。",
        "distribution": ["山东", "河北", "河南", "江苏", "安徽"],
        "habitat": {"light": 75, "water": 60, "temperature": 55},
        "image_prompt": "beautiful Raphanus sativus radish plant in natural habitat photography",
    },
    {
        "scientific_name": "Capsella bursa-pastoris",
        "common_name": "荠菜",
        "family": "十字花科",
        "genus": "荠属",
        "features_text": "一年生或二年生草本，茎直立有分枝，基生叶丛生大头羽状分裂，总状花序花白色，短角果倒三角形。",
        "distribution": ["全国广布"],
        "habitat": {"light": 70, "water": 45, "temperature": 50},
        "image_prompt": "beautiful Capsella bursa-pastoris shepherd purse in natural habitat photography",
    },
    {
        "scientific_name": "Mentha haplocalyx",
        "common_name": "薄荷",
        "family": "唇形科",
        "genus": "薄荷属",
        "features_text": "多年生草本，茎直立多分枝，叶片长圆状披针形，轮伞花序腋生，花淡紫色，全株有清凉香气，揉之更浓。",
        "distribution": ["江苏", "浙江", "安徽", "江西", "河南"],
        "habitat": {"light": 75, "water": 65, "temperature": 65},
        "image_prompt": "beautiful Mentha haplocalyx mint plant in natural habitat photography",
    },
    {
        "scientific_name": "Perilla frutescens",
        "common_name": "紫苏",
        "family": "唇形科",
        "genus": "紫苏属",
        "features_text": "一年生草本，茎四棱形紫色或绿色，叶宽卵形或圆形，上面绿色或紫色，总状花序花白色至紫红色。",
        "distribution": ["江苏", "安徽", "浙江", "湖北", "四川"],
        "habitat": {"light": 70, "water": 60, "temperature": 70},
        "image_prompt": "beautiful Perilla frutescens purple perilla in natural habitat photography",
    },
    {
        "scientific_name": "Salvia miltiorrhiza",
        "common_name": "丹参",
        "family": "唇形科",
        "genus": "鼠尾草属",
        "features_text": "多年生草本，根肥厚肉质朱红色，茎四棱形有腺毛，叶奇数羽状复叶，轮伞花序花紫蓝色，根入药活血化瘀。",
        "distribution": ["山东", "河南", "陕西", "四川", "安徽"],
        "habitat": {"light": 65, "water": 45, "temperature": 60},
        "image_prompt": "beautiful Salvia miltiorrhiza danshen plant in natural habitat photography",
    },
    {
        "scientific_name": "Pulsatilla chinensis",
        "common_name": "白头翁",
        "family": "毛茛科",
        "genus": "白头翁属",
        "features_text": "多年生草本，全株被白色柔毛，基生叶三出复叶，花钟形蓝紫色，瘦果聚成头状，宿存花柱银丝状如白发。",
        "distribution": ["河北", "辽宁", "吉林", "黑龙江", "山东"],
        "habitat": {"light": 70, "water": 35, "temperature": 45},
        "image_prompt": "beautiful Pulsatilla chinensis pasque flower in natural habitat photography",
    },
    {
        "scientific_name": "Clematis florida",
        "common_name": "铁线莲",
        "family": "毛茛科",
        "genus": "铁线莲属",
        "features_text": "木质藤本，茎棕色或紫红色，节膨大，二回三出复叶，花大单生顶端，白色花瓣状萼片6枚，花期5-6月。",
        "distribution": ["浙江", "江苏", "安徽", "湖北", "湖南"],
        "habitat": {"light": 55, "water": 55, "temperature": 60},
        "image_prompt": "beautiful Clematis florida leather flower vine in natural habitat photography",
    },
    {
        "scientific_name": "Ranunculus japonicus",
        "common_name": "毛茛",
        "family": "毛茛科",
        "genus": "毛茛属",
        "features_text": "多年生草本，茎直立被柔毛，基生叶心形五角形三深裂，聚伞花序花黄色有光泽，瘦果扁平聚成头状。",
        "distribution": ["全国广布"],
        "habitat": {"light": 65, "water": 65, "temperature": 55},
        "image_prompt": "beautiful Ranunculus japonicus buttercup in natural habitat photography",
    },
    {
        "scientific_name": "Angelica sinensis",
        "common_name": "当归",
        "family": "伞形科",
        "genus": "当归属",
        "features_text": "多年生草本，根圆柱状肉质浓郁香气，茎紫红色有纵沟，叶二至三回羽状分裂，复伞形花序花白色。",
        "distribution": ["甘肃", "云南", "四川", "陕西", "湖北"],
        "habitat": {"light": 55, "water": 65, "temperature": 50},
        "image_prompt": "beautiful Angelica sinensis dong quai plant in natural habitat photography",
    },
    {
        "scientific_name": "Foeniculum vulgare",
        "common_name": "茴香",
        "family": "伞形科",
        "genus": "茴香属",
        "features_text": "多年生草本，全株有特殊香气，茎直立中空有棱，叶三至四回羽状全裂，复伞形花序花黄色，双悬果矩圆形。",
        "distribution": ["山西", "甘肃", "内蒙古", "新疆", "山东"],
        "habitat": {"light": 80, "water": 40, "temperature": 60},
        "image_prompt": "beautiful Foeniculum vulgare fennel plant in natural habitat photography",
    },
    {
        "scientific_name": "Coriandrum sativum",
        "common_name": "芫荽",
        "family": "伞形科",
        "genus": "芫荽属",
        "features_text": "一年生草本，有强烈气味，茎直立中空有细棱，基生叶一至二回羽状全裂，复伞形花序花白色或淡粉色。",
        "distribution": ["全国广布"],
        "habitat": {"light": 70, "water": 50, "temperature": 55},
        "image_prompt": "beautiful Coriandrum sativum cilantro plant in natural habitat photography",
    },
    {
        "scientific_name": "Camellia sinensis",
        "common_name": "茶树",
        "family": "山茶科",
        "genus": "山茶属",
        "features_text": "常绿灌木或小乔木，叶互生革质椭圆形，边缘有锯齿，花1-3朵腋生白色，蒴果三角球形，嫩叶制茶。",
        "distribution": ["浙江", "福建", "云南", "四川", "安徽"],
        "habitat": {"light": 60, "water": 70, "temperature": 70},
        "image_prompt": "beautiful Camellia sinensis tea plant in natural habitat photography",
    },
    {
        "scientific_name": "Ginkgo biloba",
        "common_name": "银杏",
        "family": "银杏科",
        "genus": "银杏属",
        "features_text": "落叶大乔木，树皮灰褐色深纵裂，叶扇形有二叉状脉序，秋季变金黄，球花雌雄异株，种子核果状。",
        "distribution": ["江苏", "浙江", "山东", "四川", "安徽"],
        "habitat": {"light": 75, "water": 50, "temperature": 55},
        "image_prompt": "beautiful Ginkgo biloba tree golden leaves in natural habitat photography",
    },
    {
        "scientific_name": "Bletilla striata",
        "common_name": "白芨",
        "family": "兰科",
        "genus": "白芨属",
        "features_text": "地生兰，假鳞茎扁球形富黏性，叶4-5枚狭矩圆形，花序顶生花3-8朵紫红色或粉红色，唇瓣白色带紫红。",
        "distribution": ["云南", "贵州", "四川", "广西", "湖南"],
        "habitat": {"light": 45, "water": 65, "temperature": 65},
        "image_prompt": "beautiful Bletilla striata ground orchid in natural habitat photography",
    },
    {
        "scientific_name": "Platycodon grandiflorus",
        "common_name": "桔梗",
        "family": "桔梗科",
        "genus": "桔梗属",
        "features_text": "多年生草本，根胡萝卜形肉质，茎直立有乳汁，叶轮生或对生卵形，花1至数朵顶生蓝紫色钟形，花冠5浅裂。",
        "distribution": ["辽宁", "吉林", "黑龙江", "河北", "山东"],
        "habitat": {"light": 70, "water": 45, "temperature": 55},
        "image_prompt": "beautiful Platycodon grandiflorus balloon flower in natural habitat photography",
    },
]


def generate_color_histogram():
    r_bins = [random.uniform(0.02, 0.25) for _ in range(8)]
    g_bins = [random.uniform(0.02, 0.25) for _ in range(8)]
    b_bins = [random.uniform(0.02, 0.25) for _ in range(8)]
    r_sum = sum(r_bins)
    g_sum = sum(g_bins)
    b_bins_sum = sum(b_bins)
    r_bins = [round(v / r_sum, 4) for v in r_bins]
    g_bins = [round(v / g_sum, 4) for v in g_bins]
    b_bins = [round(v / b_bins_sum, 4) for v in b_bins]
    return r_bins + g_bins + b_bins


def build_image_urls(scientific_name, image_prompt):
    base = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image"
    urls = []
    prompts = [
        f"{image_prompt}",
        f"{scientific_name} close up macro botanical photography",
        f"{scientific_name} leaves and stem detail nature photography",
    ]
    for p in prompts:
        encoded = quote(p)
        urls.append(f"{base}?prompt={encoded}&image_size=square")
    return urls


def seed():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///plants.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    with app.app_context():
        db.create_all()

        if Plant.query.first() is not None:
            print("Database already seeded, skipping.")
            return

        for data in PLANTS_DATA:
            image_urls = build_image_urls(data["scientific_name"], data["image_prompt"])
            histogram = generate_color_histogram()

            plant = Plant(
                scientific_name=data["scientific_name"],
                common_name=data["common_name"],
                family=data["family"],
                genus=data["genus"],
                features_text=data["features_text"],
                distribution_json=json.dumps(data["distribution"], ensure_ascii=False),
                habitat_json=json.dumps(data["habitat"], ensure_ascii=False),
                image_urls_json=json.dumps(image_urls, ensure_ascii=False),
                color_histogram_json=json.dumps(histogram),
            )
            db.session.add(plant)

        db.session.commit()
        print(f"Seeded {len(PLANTS_DATA)} plants successfully.")


if __name__ == "__main__":
    seed()
