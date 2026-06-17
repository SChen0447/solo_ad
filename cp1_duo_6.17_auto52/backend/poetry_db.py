# -*- coding: utf-8 -*-
"""
诗词库管理模块
包含诗句索引、上下句匹配算法、作者信息检索
通过Python字典和列表实现内存数据库
"""

import random
import re
from typing import Optional, Dict, List, Any, Tuple


class PoetryDB:
    def __init__(self):
        self.poems = []
        self.line_index = {}
        self.next_line_map = {}
        self.author_info = {}
        self.classic_poems = set()
        self.rare_poems = set()
        self.first_char_index = {}  # 首字快速查找索引
        self._init_classic_database()
        self._expand_database()
        self._classify_difficulty()

    def _clean_line(self, line: str) -> str:
        return re.sub(r'[，。！？、；：""''（）《》\s,.!?;:\'\"()\[\]<>]', '', line)

    def _add_poem(self, title, author, dynasty, content_lines, background="", keywords=None, cultural_note="", is_classic=True):
        poem_id = len(self.poems)
        poem = {
            "id": poem_id,
            "title": title,
            "author": author,
            "dynasty": dynasty,
            "lines": content_lines,
            "background": background,
            "keywords": keywords or [],
            "cultural_note": cultural_note,
            "is_classic": is_classic,
        }
        self.poems.append(poem)

        if author not in self.author_info:
            self.author_info[author] = {"dynasty": dynasty, "works": []}
        if title not in self.author_info[author]["works"]:
            self.author_info[author]["works"].append(title)

        if is_classic:
            self.classic_poems.add(poem_id)

        for i, line in enumerate(content_lines):
            clean_line = self._clean_line(line)
            if clean_line and len(clean_line) >= 3:
                if clean_line not in self.line_index:
                    self.line_index[clean_line] = []
                self.line_index[clean_line].append({
                    "poem_id": poem_id,
                    "line_index": i,
                    "original": line,
                })
                # 构建首字快速查找索引
                first_char = clean_line[0]
                if first_char not in self.first_char_index:
                    self.first_char_index[first_char] = []
                self.first_char_index[first_char].append({
                    "clean_line": clean_line,
                    "poem_id": poem_id,
                    "line_index": i,
                    "original": line,
                })
                if i < len(content_lines) - 1:
                    if clean_line not in self.next_line_map:
                        self.next_line_map[clean_line] = []
                    self.next_line_map[clean_line].append({
                        "next_line": content_lines[i + 1],
                        "poem_id": poem_id,
                        "line_index": i + 1,
                    })

    def _classify_difficulty(self):
        all_poems = list(range(len(self.poems)))
        non_classic = [p for p in all_poems if p not in self.classic_poems]
        rare_count = max(1, len(all_poems) // 5)
        self.rare_poems = set(non_classic[:rare_count])

    def _init_classic_database(self):
        poems_data = [
            {
                "title": "静夜思", "author": "李白", "dynasty": "唐",
                "lines": ["床前明月光", "疑是地上霜", "举头望明月", "低头思故乡"],
                "background": "此诗作于唐玄宗开元十四年（726年）九月十五日的扬州旅舍，当时李白二十六岁。",
                "keywords": ["月光", "思乡", "秋夜", "旅居"],
                "cultural_note": "《静夜思》是李白的代表作之一，以清新朴素的笔触抒写了丰富深曲的内容。短短二十字，千百年来广泛被人传诵。",
            },
            {
                "title": "春晓", "author": "孟浩然", "dynasty": "唐",
                "lines": ["春眠不觉晓", "处处闻啼鸟", "夜来风雨声", "花落知多少"],
                "background": "这首诗是唐代诗人孟浩然隐居在鹿门山时所作，意境十分优美。",
                "keywords": ["春天", "早晨", "鸟鸣", "落花"],
                "cultural_note": "诗人抓住春天的早晨刚刚醒来时的一瞬间展开联想，描绘了一幅春天早晨绚丽的图景，抒发了诗人热爱春天、珍惜春光的美好心情。",
            },
            {
                "title": "登鹳雀楼", "author": "王之涣", "dynasty": "唐",
                "lines": ["白日依山尽", "黄河入海流", "欲穷千里目", "更上一层楼"],
                "background": "此诗是唐代诗人王之涣仅存的六首绝句之一，写诗人在登高望远中表现出来的不凡的胸襟抱负。",
                "keywords": ["登高", "黄河", "夕阳", "进取"],
                "cultural_note": "鹳雀楼位于山西省永济市蒲州古城西面的黄河东岸，是唐代河中府著名的风景胜地。此诗是五言绝句的压卷之作。",
            },
            {
                "title": "相思", "author": "王维", "dynasty": "唐",
                "lines": ["红豆生南国", "春来发几枝", "愿君多采撷", "此物最相思"],
                "background": "此诗是青年王维所作的一首借咏物而寄相思的五言绝句。",
                "keywords": ["红豆", "相思", "南国", "友情"],
                "cultural_note": "红豆产于南方，结实鲜红浑圆，晶莹如珊瑚。传说古代有一位女子，因丈夫死在边地，哭于树下而死，化为红豆，于是人们又称呼它为'相思子'。",
            },
            {
                "title": "悯农·其二", "author": "李绅", "dynasty": "唐",
                "lines": ["锄禾日当午", "汗滴禾下土", "谁知盘中餐", "粒粒皆辛苦"],
                "background": "这首诗描绘了在烈日当空的正午农民田里劳作的景象，概括地表现了农民终年辛勤劳动的生活。",
                "keywords": ["农民", "劳动", "粮食", "珍惜"],
                "cultural_note": "《悯农》诗共两首，这是第二首。诗人用浅显的语言，描绘了农民劳动的艰辛，教育人们要珍惜粮食。",
            },
            {
                "title": "咏鹅", "author": "骆宾王", "dynasty": "唐",
                "lines": ["鹅鹅鹅", "曲项向天歌", "白毛浮绿水", "红掌拨清波"],
                "background": "相传这是骆宾王在七岁时写的一首诗，是一首咏物诗。",
                "keywords": ["白鹅", "绿水", "童趣", "咏物"],
                "cultural_note": "这首诗开篇先声夺人，'鹅！鹅！鹅！'写出鹅的声响美，又通过'曲项'与'向天'、'白毛'与'绿水'、'红掌'与'清波'的对比写出鹅的颜色美。",
            },
            {
                "title": "游子吟", "author": "孟郊", "dynasty": "唐",
                "lines": ["慈母手中线", "游子身上衣", "临行密密缝", "意恐迟迟归", "谁言寸草心", "报得三春晖"],
                "background": "《游子吟》是唐代诗人孟郊创作的一首五言诗，这是一首母爱的颂歌。",
                "keywords": ["母爱", "游子", "针线", "感恩"],
                "cultural_note": "全诗共六句三十字，采用白描的手法，通过回忆一个看似平常的临行前缝衣的场景，凸显并歌颂了母爱的伟大与无私。",
            },
            {
                "title": "望庐山瀑布", "author": "李白", "dynasty": "唐",
                "lines": ["日照香炉生紫烟", "遥看瀑布挂前川", "飞流直下三千尺", "疑是银河落九天"],
                "background": "这首诗是李白出游金陵途中初游庐山时所作，描绘了庐山瀑布壮丽的景色。",
                "keywords": ["庐山", "瀑布", "银河", "壮丽"],
                "cultural_note": "庐山是我国著名的风景区之一，位于江西省九江市南。香炉峰是庐山西北部的一座山峰，因形状像香炉且山上常笼罩着云烟而得名。",
            },
            {
                "title": "赠汪伦", "author": "李白", "dynasty": "唐",
                "lines": ["李白乘舟将欲行", "忽闻岸上踏歌声", "桃花潭水深千尺", "不及汪伦送我情"],
                "background": "此诗是李白于泾县游历桃花潭时写给当地好友汪伦的一首留别诗。",
                "keywords": ["友情", "送别", "桃花潭", "踏歌"],
                "cultural_note": "踏歌是唐代一种广为流行的民间歌舞形式，一边唱歌，一边用脚踏地打拍子，可以边走边唱。",
            },
            {
                "title": "早发白帝城", "author": "李白", "dynasty": "唐",
                "lines": ["朝辞白帝彩云间", "千里江陵一日还", "两岸猿声啼不住", "轻舟已过万重山"],
                "background": "唐肃宗乾元二年（759年），诗人流放夜郎，行至白帝遇赦，乘舟东还江陵时而作此诗。",
                "keywords": ["三峡", "轻舟", "猿声", "快意"],
                "cultural_note": "白帝城在今重庆市奉节县城东白帝山上。东汉初年公孙述所筑，因城中一井常冒白气，宛如白龙，公孙述便借此自号白帝。",
            },
            {
                "title": "绝句", "author": "杜甫", "dynasty": "唐",
                "lines": ["两个黄鹂鸣翠柳", "一行白鹭上青天", "窗含西岭千秋雪", "门泊东吴万里船"],
                "background": "这首绝句是杜甫在成都浣花溪草堂闲居时所写，描写了草堂周围明媚秀丽的春天景色。",
                "keywords": ["黄鹂", "白鹭", "春景", "草堂"],
                "cultural_note": "西岭指西岭雪山，在成都西南，因山顶终年积雪不化，故称千秋雪。东吴指长江下游一带，三国时期的吴国。",
            },
            {
                "title": "春夜喜雨", "author": "杜甫", "dynasty": "唐",
                "lines": ["好雨知时节", "当春乃发生", "随风潜入夜", "润物细无声", "野径云俱黑", "江船火独明", "晓看红湿处", "花重锦官城"],
                "background": "这首诗写于唐肃宗上元二年（761年）春，杜甫在成都草堂定居两年。",
                "keywords": ["春雨", "夜晚", "润物", "锦官城"],
                "cultural_note": "锦官城是古代成都的别称，因三国蜀汉时期成都织锦业发达，朝廷在此设置锦官管理而得名。",
            },
            {
                "title": "出塞", "author": "王昌龄", "dynasty": "唐",
                "lines": ["秦时明月汉时关", "万里长征人未还", "但使龙城飞将在", "不教胡马度阴山"],
                "background": "《出塞》是乐府旧题，也是唐人边塞诗常用的题目。这首诗被誉为唐人七绝的压卷之作。",
                "keywords": ["边塞", "明月", "李广", "战争"],
                "cultural_note": "龙城飞将指西汉名将李广，他一生与匈奴作战七十余次，屡建奇功，被匈奴称为'飞将军'。",
            },
            {
                "title": "芙蓉楼送辛渐", "author": "王昌龄", "dynasty": "唐",
                "lines": ["寒雨连江夜入吴", "平明送客楚山孤", "洛阳亲友如相问", "一片冰心在玉壶"],
                "background": "此诗作于天宝元年（742年），王昌龄当时为江宁丞。辛渐是王昌龄的朋友，这次拟由润州渡江，取道扬州，北上洛阳。",
                "keywords": ["送别", "寒雨", "冰心", "玉壶"],
                "cultural_note": "冰心玉壶比喻人的清廉正直。早在六朝刘宋时期，诗人鲍照就用'清如玉壶冰'来比喻高洁清白的品格。",
            },
            {
                "title": "九月九日忆山东兄弟", "author": "王维", "dynasty": "唐",
                "lines": ["独在异乡为异客", "每逢佳节倍思亲", "遥知兄弟登高处", "遍插茱萸少一人"],
                "background": "此诗是王维十七岁时的作品，当时他独自一人漂泊在洛阳与长安之间。",
                "keywords": ["重阳", "登高", "茱萸", "思乡"],
                "cultural_note": "重阳节为农历九月初九，民间有登高、插茱萸、饮菊花酒的习俗，认为这样可以避灾克邪。",
            },
            {
                "title": "送元二使安西", "author": "王维", "dynasty": "唐",
                "lines": ["渭城朝雨浥轻尘", "客舍青青柳色新", "劝君更尽一杯酒", "西出阳关无故人"],
                "background": "此诗是王维送朋友去西北边疆时作的诗，后有乐人谱曲，名为'阳关三叠'。",
                "keywords": ["送别", "渭城", "阳关", "柳色"],
                "cultural_note": "阳关是中国古代陆路对外交通咽喉之地，是丝绸之路南路必经的关隘，位于今甘肃省敦煌市西南。",
            },
            {
                "title": "江雪", "author": "柳宗元", "dynasty": "唐",
                "lines": ["千山鸟飞绝", "万径人踪灭", "孤舟蓑笠翁", "独钓寒江雪"],
                "background": "唐顺宗永贞元年，柳宗元参加了王叔文为首的政治革新运动，失败后被贬到永州。",
                "keywords": ["雪景", "孤独", "渔翁", "寒江"],
                "cultural_note": "这首诗是柳宗元被贬永州后的作品，诗中塑造了一位在大雪纷飞的江面上独自垂钓的渔翁形象，寄托了诗人清高孤傲的情感。",
            },
            {
                "title": "枫桥夜泊", "author": "张继", "dynasty": "唐",
                "lines": ["月落乌啼霜满天", "江枫渔火对愁眠", "姑苏城外寒山寺", "夜半钟声到客船"],
                "background": "根据《唐才子传》卷三记载，张继于'天宝十二年（753）礼部侍郎杨浚下及第'。",
                "keywords": ["寒山寺", "夜半钟声", "枫桥", "客船"],
                "cultural_note": "寒山寺在苏州城西阊门外5公里外的枫桥镇，建于六朝时期的梁代天监年间（公元502-519年），距今已有1400多年。",
            },
            {
                "title": "泊船瓜洲", "author": "王安石", "dynasty": "宋",
                "lines": ["京口瓜洲一水间", "钟山只隔数重山", "春风又绿江南岸", "明月何时照我还"],
                "background": "这首七绝触景生情，熔叙事、写景、抒情于一炉，表现出对故乡的深切思念。",
                "keywords": ["春风", "江南", "明月", "还乡"],
                "cultural_note": "瓜洲在今天江苏省扬州市邗（hán）江区，与京口（今江苏镇江）隔江相望。钟山即紫金山，在今江苏省南京市。",
            },
            {
                "title": "元日", "author": "王安石", "dynasty": "宋",
                "lines": ["爆竹声中一岁除", "春风送暖入屠苏", "千门万户曈曈日", "总把新桃换旧符"],
                "background": "此诗作于王安石初拜相而始行己之新政时，描写新年元日热闹、欢乐和万象更新的动人景象。",
                "keywords": ["春节", "爆竹", "屠苏", "桃符"],
                "cultural_note": "屠苏是古代一种酒名。古人在正月初一有全家合饮屠苏酒的风俗。桃符是古人在辞旧迎新之际，用桃木板分别写上'神荼'、'郁垒'二神的名字，用以驱鬼辟邪。",
            },
            {
                "title": "夏日绝句", "author": "李清照", "dynasty": "宋",
                "lines": ["生当作人杰", "死亦为鬼雄", "至今思项羽", "不肯过江东"],
                "background": "公元1127年，金兵入侵中原，掳走徽、钦二帝，赵宋王朝被迫南逃。李清照之夫赵明诚出任建康知府。",
                "keywords": ["项羽", "乌江", "气节", "悲壮"],
                "cultural_note": "项羽是秦末农民起义军的领袖，在楚汉相争中兵败，退至乌江，不愿渡江回江东见父老乡亲，自刎而死。",
            },
            {
                "title": "题西林壁", "author": "苏轼", "dynasty": "宋",
                "lines": ["横看成岭侧成峰", "远近高低各不同", "不识庐山真面目", "只缘身在此山中"],
                "background": "苏轼于神宗元丰七年（1084年）由黄州贬所改迁汝州团练副使，赴汝州时经过九江，与友人参寥同游庐山。",
                "keywords": ["庐山", "哲理", "观察角度"],
                "cultural_note": "西林壁：庐山西林寺的墙壁。西林寺，位于江西省九江市庐山北麓，建于东晋太和二年（公元366年）。",
            },
            {
                "title": "惠崇春江晚景", "author": "苏轼", "dynasty": "宋",
                "lines": ["竹外桃花三两枝", "春江水暖鸭先知", "蒌蒿满地芦芽短", "正是河豚欲上时"],
                "background": "惠崇是北宋名僧，能诗善画。《春江晚景》是他的名作，苏轼根据画意，妙笔生花，寥寥几笔，就勾勒出一幅生机勃勃的早春二月景象。",
                "keywords": ["春江", "桃花", "河豚", "早春"],
                "cultural_note": "河豚是一种味道鲜美但含有剧毒的鱼类，每年春季沿江上溯产卵。古人有'拼死吃河豚'的说法。",
            },
            {
                "title": "饮湖上初晴后雨", "author": "苏轼", "dynasty": "宋",
                "lines": ["水光潋滟晴方好", "山色空蒙雨亦奇", "欲把西湖比西子", "淡妆浓抹总相宜"],
                "background": "苏轼于宋神宗熙宁四年至七年（1071—1074）任杭州通判，曾写下大量有关西湖景物的诗。",
                "keywords": ["西湖", "西施", "晴雨", "美景"],
                "cultural_note": "西子即西施，春秋时代越国的美女，中国古代四大美女之首。后人遂以'西子湖'作为西湖的别称。",
            },
            {
                "title": "示儿", "author": "陆游", "dynasty": "宋",
                "lines": ["死去元知万事空", "但悲不见九州同", "王师北定中原日", "家祭无忘告乃翁"],
                "background": "此诗作于宋宁宗嘉定三年（1210年）春，陆游时年八十五岁，是诗人临终写给儿子的遗嘱。",
                "keywords": ["爱国", "遗嘱", "中原", "北定"],
                "cultural_note": "陆游一生致力于抗金斗争，一直希望能收复中原。虽然频遇挫折，却始终没有改变初衷。",
            },
            {
                "title": "游山西村", "author": "陆游", "dynasty": "宋",
                "lines": ["莫笑农家腊酒浑", "丰年留客足鸡豚", "山重水复疑无路", "柳暗花明又一村", "箫鼓追随春社近", "衣冠简朴古风存", "从今若许闲乘月", "拄杖无时夜叩门"],
                "background": "此诗作于宋孝宗乾道三年（1167年）初春，当时陆游正罢官闲居在家。",
                "keywords": ["山西村", "农家", "春社", "柳暗花明"],
                "cultural_note": "春社是古人春天祭祀土地神以祈丰收的节日，时间在立春后第五个戊日。",
            },
            {
                "title": "望岳", "author": "杜甫", "dynasty": "唐",
                "lines": ["岱宗夫如何", "齐鲁青未了", "造化钟神秀", "阴阳割昏晓", "荡胸生曾云", "决眦入归鸟", "会当凌绝顶", "一览众山小"],
                "background": "这首诗是杜甫青年时代的作品，充满了诗人青年时代的浪漫与激情。",
                "keywords": ["泰山", "登高", "壮志", "绝顶"],
                "cultural_note": "岱宗是泰山的尊称。泰山为五岳之首，位于山东省泰安市北。古代帝王登基之初，太平之岁，多来泰山举行封禅大典，祭告天地。",
            },
            {
                "title": "黄鹤楼送孟浩然之广陵", "author": "李白", "dynasty": "唐",
                "lines": ["故人西辞黄鹤楼", "烟花三月下扬州", "孤帆远影碧空尽", "唯见长江天际流"],
                "background": "唐玄宗开元十五年（727年），李白东游归来，至湖北安陆，年已二十七岁。",
                "keywords": ["黄鹤楼", "扬州", "长江", "送别"],
                "cultural_note": "黄鹤楼位于湖北省武汉市武昌蛇山之巅，是江南三大名楼之一，享有'天下绝景'之称。传说三国时期的费祎于此登仙乘黄鹤而去，故称黄鹤楼。",
            },
            {
                "title": "将进酒", "author": "李白", "dynasty": "唐",
                "lines": ["君不见黄河之水天上来", "奔流到海不复回", "君不见高堂明镜悲白发", "朝如青丝暮成雪", "人生得意须尽欢", "莫使金樽空对月", "天生我材必有用", "千金散尽还复来", "烹羊宰牛且为乐", "会须一饮三百杯"],
                "background": "一般认为作于天宝十一载（752年），当时李白与友人岑勋在嵩山另一好友元丹丘的颍阳山居为客。",
                "keywords": ["饮酒", "豪放", "天生我材", "黄河"],
                "cultural_note": "'天生我材必有用'成为千古流传的励志名言，表达了诗人强烈的自信和豁达的人生态度。",
            },
            {
                "title": "念奴娇·赤壁怀古", "author": "苏轼", "dynasty": "宋",
                "lines": ["大江东去", "浪淘尽", "千古风流人物", "故垒西边", "人道是", "三国周郎赤壁", "乱石穿空", "惊涛拍岸", "卷起千堆雪", "江山如画", "一时多少豪杰", "遥想公瑾当年", "小乔初嫁了", "雄姿英发", "羽扇纶巾", "谈笑间", "樯橹灰飞烟灭", "故国神游", "多情应笑我", "早生华发", "人生如梦", "一尊还酹江月"],
                "background": "这首词是公元1082年（宋神宗元丰五年）苏轼谪居黄州时所写。",
                "keywords": ["赤壁", "周瑜", "长江", "豪放"],
                "cultural_note": "此词是豪放派宋词的代表作，被誉为'古今绝唱'。周瑜字公瑾，三国时东吴名将，二十四岁即为中郎将，吴中皆呼为'周郎'。",
            },
            {
                "title": "声声慢·寻寻觅觅", "author": "李清照", "dynasty": "宋",
                "lines": ["寻寻觅觅", "冷冷清清", "凄凄惨惨戚戚", "乍暖还寒时候", "最难将息", "三杯两盏淡酒", "怎敌他", "晚来风急", "雁过也", "正伤心", "却是旧时相识", "满地黄花堆积", "憔悴损", "如今有谁堪摘", "守着窗儿", "独自怎生得黑", "梧桐更兼细雨", "到黄昏", "点点滴滴", "这次第", "怎一个愁字了得"],
                "background": "此词是李清照后期的作品。",
                "keywords": ["愁", "黄花", "梧桐", "黄昏"],
                "cultural_note": "起句一连用了七组叠词，在历代词人中实属罕见，被历代词家所称道，极富音乐美。",
            },
            {
                "title": "登高", "author": "杜甫", "dynasty": "唐",
                "lines": ["风急天高猿啸哀", "渚清沙白鸟飞回", "无边落木萧萧下", "不尽长江滚滚来", "万里悲秋常作客", "百年多病独登台", "艰难苦恨繁霜鬓", "潦倒新停浊酒杯"],
                "background": "此诗作于唐代宗大历二年（767年）秋天，杜甫时在夔州。",
                "keywords": ["登高", "秋景", "长江", "悲秋"],
                "cultural_note": "此诗被誉为'古今七言律第一'。前四句写登高见闻，后四句写登高感触，情景交融，意境沉郁。",
            },
            {
                "title": "赋得古原草送别", "author": "白居易", "dynasty": "唐",
                "lines": ["离离原上草", "一岁一枯荣", "野火烧不尽", "春风吹又生", "远芳侵古道", "晴翠接荒城", "又送王孙去", "萋萋满别情"],
                "background": "此诗作于贞元三年（787年），白居易时年十六。",
                "keywords": ["草原", "送别", "春风", "枯草"],
                "cultural_note": "'野火烧不尽，春风吹又生'成为千古传诵的名句，歌颂了野草顽强的生命力。",
            },
            {
                "title": "钱塘湖春行", "author": "白居易", "dynasty": "唐",
                "lines": ["孤山寺北贾亭西", "水面初平云脚低", "几处早莺争暖树", "谁家新燕啄春泥", "乱花渐欲迷人眼", "浅草才能没马蹄", "最爱湖东行不足", "绿杨阴里白沙堤"],
                "background": "唐穆宗长庆二年（822年），白居易任杭州刺史。",
                "keywords": ["西湖", "早春", "白沙堤", "早莺"],
                "cultural_note": "钱塘湖即西湖。白沙堤即今白堤，又称沙堤、断桥堤，在西湖东畔。",
            },
            {
                "title": "夜雨寄北", "author": "李商隐", "dynasty": "唐",
                "lines": ["君问归期未有期", "巴山夜雨涨秋池", "何当共剪西窗烛", "却话巴山夜雨时"],
                "background": "这首诗是李商隐滞留巴蜀时寄怀长安亲友之作。",
                "keywords": ["巴山", "夜雨", "思念", "西窗烛"],
                "cultural_note": "诗中'巴山夜雨'重复出现，形成了音调和章法的回环往复之妙，恰切地表现了时间与空间回环往复的意境之美。",
            },
            {
                "title": "无题·相见时难别亦难", "author": "李商隐", "dynasty": "唐",
                "lines": ["相见时难别亦难", "东风无力百花残", "春蚕到死丝方尽", "蜡炬成灰泪始干", "晓镜但愁云鬓改", "夜吟应觉月光寒", "蓬山此去无多路", "青鸟殷勤为探看"],
                "background": "这首诗以女性的口吻抒写爱情心理。",
                "keywords": ["相思", "春蚕", "蜡炬", "青鸟"],
                "cultural_note": "'春蚕到死丝方尽，蜡炬成灰泪始干'是李商隐的传世名句，'丝'字与'思'谐音，暗含相思之意。",
            },
            {
                "title": "锦瑟", "author": "李商隐", "dynasty": "唐",
                "lines": ["锦瑟无端五十弦", "一弦一柱思华年", "庄生晓梦迷蝴蝶", "望帝春心托杜鹃", "沧海月明珠有泪", "蓝田日暖玉生烟", "此情可待成追忆", "只是当时已惘然"],
                "background": "《锦瑟》是李商隐最难索解的作品之一。",
                "keywords": ["庄生梦蝶", "杜鹃", "沧海", "追忆"],
                "cultural_note": "庄生梦蝶出自《庄子·齐物论》：'昔者庄周梦为胡蝶，栩栩然胡蝶也。'",
            },
            {
                "title": "送杜少府之任蜀州", "author": "王勃", "dynasty": "唐",
                "lines": ["城阙辅三秦", "风烟望五津", "与君离别意", "同是宦游人", "海内存知己", "天涯若比邻", "无为在歧路", "儿女共沾巾"],
                "background": "这首诗是送别诗的名作，诗意慰勉勿在离别之时悲哀。",
                "keywords": ["送别", "知己", "天涯", "三秦"],
                "cultural_note": "'海内存知己，天涯若比邻'成为千古名句，意思是只要四海之内有知心朋友，即使远在天涯，也好像近在身边。",
            },
            {
                "title": "凉州词", "author": "王翰", "dynasty": "唐",
                "lines": ["葡萄美酒夜光杯", "欲饮琵琶马上催", "醉卧沙场君莫笑", "古来征战几人回"],
                "background": "《凉州词》是乐府诗的名称，本为凉州一带的歌曲。",
                "keywords": ["边塞", "葡萄美酒", "夜光杯", "沙场"],
                "cultural_note": "夜光杯是用美玉制成的杯子，夜间能够发光。据东方朔《海内十洲记》记载，周穆王时，西胡献夜光常满杯。",
            },
            {
                "title": "望天门山", "author": "李白", "dynasty": "唐",
                "lines": ["天门中断楚江开", "碧水东流至此回", "两岸青山相对出", "孤帆一片日边来"],
                "background": "这首诗是李白赴江东途中行至天门山时所创作的一首七绝。",
                "keywords": ["天门山", "楚江", "青山", "孤帆"],
                "cultural_note": "天门山位于安徽省芜湖市北郊长江畔，因李白《望天门山》一诗而天下闻名。",
            },
            {
                "title": "清明", "author": "杜牧", "dynasty": "唐",
                "lines": ["清明时节雨纷纷", "路上行人欲断魂", "借问酒家何处有", "牧童遥指杏花村"],
                "background": "这首诗描写清明时节的天气特征。",
                "keywords": ["清明", "杏花村", "牧童", "细雨"],
                "cultural_note": "杏花村在今安徽省池州市。清明是我国二十四节气之一，在每年四月五日前后，古人这天有扫墓、踏青的习俗。",
            },
            {
                "title": "山行", "author": "杜牧", "dynasty": "唐",
                "lines": ["远上寒山石径斜", "白云生处有人家", "停车坐爱枫林晚", "霜叶红于二月花"],
                "background": "这首诗描绘的是秋之色，展现出一幅动人的山林秋色图。",
                "keywords": ["寒山", "枫林", "霜叶", "秋景"],
                "cultural_note": "诗人通过对山中秋色的描绘，表达了对秋天的赞美之情。'停车坐爱枫林晚'的'坐'是'因为'的意思。",
            },
            {
                "title": "泊秦淮", "author": "杜牧", "dynasty": "唐",
                "lines": ["烟笼寒水月笼沙", "夜泊秦淮近酒家", "商女不知亡国恨", "隔江犹唱后庭花"],
                "background": "唐朝著名诗人杜牧游秦淮时所作。",
                "keywords": ["秦淮", "后庭花", "商女", "忧国"],
                "cultural_note": "《玉树后庭花》为南朝陈后主所作，后世多称为亡国之音。秦淮即秦淮河，流经南京，是六朝古都金陵的繁华之地。",
            },
            {
                "title": "江南春", "author": "杜牧", "dynasty": "唐",
                "lines": ["千里莺啼绿映红", "水村山郭酒旗风", "南朝四百八十寺", "多少楼台烟雨中"],
                "background": "这首诗四句均为景语，有众多意象和景物。",
                "keywords": ["江南", "春景", "南朝古寺", "烟雨"],
                "cultural_note": "南朝是东晋之后建立于南方的四个朝代的总称，佛教在南朝十分兴盛，皇帝和士族大造寺庙。",
            },
            {
                "title": "赤壁", "author": "杜牧", "dynasty": "唐",
                "lines": ["折戟沉沙铁未销", "自将磨洗认前朝", "东风不与周郎便", "铜雀春深锁二乔"],
                "background": "这首诗是诗人经过赤壁这个著名的古战场时写下的。",
                "keywords": ["赤壁", "周郎", "二乔", "铜雀台"],
                "cultural_note": "二乔指江东乔公的两个女儿，都是东吴美女，大乔嫁孙策，小乔嫁周瑜。铜雀台是曹操在邺城所建。",
            },
            {
                "title": "己亥杂诗·其五", "author": "龚自珍", "dynasty": "清",
                "lines": ["浩荡离愁白日斜", "吟鞭东指即天涯", "落红不是无情物", "化作春泥更护花"],
                "background": "道光十九年（1839年），龚自珍已48岁，对清朝统治者大失所望，毅然决然辞官南归。",
                "keywords": ["落红", "春泥", "离愁", "理想"],
                "cultural_note": "'落红不是无情物，化作春泥更护花'是千古传诵的名句，表达了诗人虽已辞官，但仍关心国家前途命运的情怀。",
            },
            {
                "title": "乌衣巷", "author": "刘禹锡", "dynasty": "唐",
                "lines": ["朱雀桥边野草花", "乌衣巷口夕阳斜", "旧时王谢堂前燕", "飞入寻常百姓家"],
                "background": "《乌衣巷》是唐代诗人刘禹锡怀古组诗《金陵五题》中的第二首。",
                "keywords": ["乌衣巷", "王谢", "燕子", "兴亡"],
                "cultural_note": "乌衣巷在南京秦淮河南岸，三国时是吴国戍守石头城的部队营房所在地，当时军士都穿着黑色制服，故以'乌衣'为巷名。",
            },
            {
                "title": "酬乐天扬州初逢席上见赠", "author": "刘禹锡", "dynasty": "唐",
                "lines": ["巴山楚水凄凉地", "二十三年弃置身", "怀旧空吟闻笛赋", "到乡翻似烂柯人", "沉舟侧畔千帆过", "病树前头万木春", "今日听君歌一曲", "暂凭杯酒长精神"],
                "background": "此诗作于唐敬宗宝历二年（826年）。",
                "keywords": ["沉舟", "病树", "千帆", "万木春"],
                "cultural_note": "'沉舟侧畔千帆过，病树前头万木春'是千古传诵的名句，包含了新事物必将取代旧事物的哲理。",
            },
            {
                "title": "竹枝词", "author": "刘禹锡", "dynasty": "唐",
                "lines": ["杨柳青青江水平", "闻郎江上唱歌声", "东边日出西边雨", "道是无晴却有晴"],
                "background": "《竹枝词》是古代四川东部的一种民歌。",
                "keywords": ["杨柳", "歌声", "晴雨", "谐音"],
                "cultural_note": "'道是无晴却有晴'的'晴'与'情'谐音，双关妙用，含蓄地表现了初恋少女那种既迷惘又眷恋、既忐忑又抱有希望的微妙心情。",
            },
            {
                "title": "过故人庄", "author": "孟浩然", "dynasty": "唐",
                "lines": ["故人具鸡黍", "邀我至田家", "绿树村边合", "青山郭外斜", "开轩面场圃", "把酒话桑麻", "待到重阳日", "还来就菊花"],
                "background": "这首诗是孟浩然隐居鹿门山时所作。",
                "keywords": ["田家", "绿树", "桑麻", "重阳"],
                "cultural_note": "这首诗是田园诗的代表作，描写了农家恬静闲适的生活情景，也写老朋友的情谊。",
            },
            {
                "title": "使至塞上", "author": "王维", "dynasty": "唐",
                "lines": ["单车欲问边", "属国过居延", "征蓬出汉塞", "归雁入胡天", "大漠孤烟直", "长河落日圆", "萧关逢候骑", "都护在燕然"],
                "background": "唐玄宗开元二十五年（737年）春所作。",
                "keywords": ["边塞", "大漠", "孤烟", "长河"],
                "cultural_note": "'大漠孤烟直，长河落日圆'被誉为千古壮观的名句。孤烟指烽火台燃起的一股浓烟，长河指黄河。",
            },
            {
                "title": "山居秋暝", "author": "王维", "dynasty": "唐",
                "lines": ["空山新雨后", "天气晚来秋", "明月松间照", "清泉石上流", "竹喧归浣女", "莲动下渔舟", "随意春芳歇", "王孙自可留"],
                "background": "这首诗写初秋时节山居所见雨后黄昏的景色。",
                "keywords": ["空山", "明月", "清泉", "秋暝"],
                "cultural_note": "辋川别业是王维在辋川山谷（今陕西省蓝田县西南10余公里处）的园林别墅。",
            },
            {
                "title": "鹿柴", "author": "王维", "dynasty": "唐",
                "lines": ["空山不见人", "但闻人语响", "返景入深林", "复照青苔上"],
                "background": "《鹿柴》是王维山水诗中的代表作之一。",
                "keywords": ["空山", "深林", "青苔", "返景"],
                "cultural_note": "鹿柴（zhài）：'柴'同'寨'、'砦'，用树木围成的栅栏。鹿柴是王维辋川别业中的一处胜景。",
            },
            {
                "title": "滁州西涧", "author": "韦应物", "dynasty": "唐",
                "lines": ["独怜幽草涧边生", "上有黄鹂深树鸣", "春潮带雨晚来急", "野渡无人舟自横"],
                "background": "一般认为这首诗是唐德宗建中二年（781年）韦应物任滁州刺史时所作。",
                "keywords": ["西涧", "黄鹂", "春潮", "野渡"],
                "cultural_note": "滁州在今安徽滁州。西涧在滁州城西，俗名上马河。",
            },
            {
                "title": "塞下曲", "author": "卢纶", "dynasty": "唐",
                "lines": ["月黑雁飞高", "单于夜遁逃", "欲将轻骑逐", "大雪满弓刀"],
                "background": "《塞下曲》为汉乐府旧题。",
                "keywords": ["边塞", "单于", "大雪", "追击"],
                "cultural_note": "单于是匈奴人对他们部落联盟首领的专称。轻骑指轻装快速的骑兵。",
            },
            {
                "title": "塞下曲·林暗草惊风", "author": "卢纶", "dynasty": "唐",
                "lines": ["林暗草惊风", "将军夜引弓", "平明寻白羽", "没在石棱中"],
                "background": "这首边塞小诗，写一位将军猎虎的故事。",
                "keywords": ["李广", "射虎", "将军", "引弓"],
                "cultural_note": "诗中暗用汉代名将李广'射虎中石'的典故。白羽指箭，因箭尾插有白色羽毛为饰。",
            },
            {
                "title": "天净沙·秋思", "author": "马致远", "dynasty": "元",
                "lines": ["枯藤老树昏鸦", "小桥流水人家", "古道西风瘦马", "夕阳西下", "断肠人在天涯"],
                "background": "《天净沙·秋思》是元曲作家马致远创作的小令。",
                "keywords": ["秋思", "古道", "夕阳", "断肠人"],
                "cultural_note": "这首小令被誉为'秋思之祖'。",
            },
            {
                "title": "山坡羊·潼关怀古", "author": "张养浩", "dynasty": "元",
                "lines": ["峰峦如聚", "波涛如怒", "山河表里潼关路", "望西都", "意踌躇", "伤心秦汉经行处", "宫阙万间都做了土", "兴，百姓苦", "亡，百姓苦"],
                "background": "这首小令是元文宗天历二年（1329年）张养浩在赴陕西救灾途中所作。",
                "keywords": ["潼关", "怀古", "兴亡", "百姓"],
                "cultural_note": "'兴，百姓苦；亡，百姓苦'是全曲之眼，道出了封建社会的一条普遍规律。",
            },
            {
                "title": "石灰吟", "author": "于谦", "dynasty": "明",
                "lines": ["千锤万凿出深山", "烈火焚烧若等闲", "粉骨碎身浑不怕", "要留清白在人间"],
                "background": "此诗是于谦17岁时所作。",
                "keywords": ["石灰", "清白", "气节", "焚烧"],
                "cultural_note": "于谦是明朝名臣，民族英雄，这首诗正是他一生的写照。",
            },
            {
                "title": "竹石", "author": "郑燮", "dynasty": "清",
                "lines": ["咬定青山不放松", "立根原在破岩中", "千磨万击还坚劲", "任尔东西南北风"],
                "background": "这首诗是郑燮（郑板桥）为自己所画的竹石画而题写的。",
                "keywords": ["竹", "坚韧", "青山", "破岩"],
                "cultural_note": "郑燮号板桥，清代书画家、文学家，'扬州八怪'之一。",
            },
            {
                "title": "村居", "author": "高鼎", "dynasty": "清",
                "lines": ["草长莺飞二月天", "拂堤杨柳醉春烟", "儿童散学归来早", "忙趁东风放纸鸢"],
                "background": "《村居》是清代诗人高鼎晚年归隐于上饶地区闲居农村时所写。",
                "keywords": ["纸鸢", "儿童", "春天", "杨柳"],
                "cultural_note": "纸鸢即风筝，古人发明风筝，最初是为了军事上的需要。",
            },
            {
                "title": "己亥杂诗·其二百二十", "author": "龚自珍", "dynasty": "清",
                "lines": ["九州生气恃风雷", "万马齐喑究可哀", "我劝天公重抖擞", "不拘一格降人才"],
                "background": "道光十九年（1839年），龚自珍辞官南归。",
                "keywords": ["人才", "风雷", "天公", "改革"],
                "cultural_note": "这首诗表达了作者对社会变革的强烈渴望。",
            },
            {
                "title": "闻官军收河南河北", "author": "杜甫", "dynasty": "唐",
                "lines": ["剑外忽传收蓟北", "初闻涕泪满衣裳", "却看妻子愁何在", "漫卷诗书喜欲狂", "白日放歌须纵酒", "青春作伴好还乡", "即从巴峡穿巫峡", "便下襄阳向洛阳"],
                "background": "此诗作于唐代宗广德元年（763年）春，安史之乱结束。",
                "keywords": ["安史之乱", "收复", "还乡", "狂喜"],
                "cultural_note": "这首诗被后人誉为杜甫'生平第一首快诗'。",
            },
            {
                "title": "春望", "author": "杜甫", "dynasty": "唐",
                "lines": ["国破山河在", "城春草木深", "感时花溅泪", "恨别鸟惊心", "烽火连三月", "家书抵万金", "白头搔更短", "浑欲不胜簪"],
                "background": "这首诗作于至德二载（757年）春，当时长安被安史叛军焚掠一空。",
                "keywords": ["国破", "家书", "烽火", "长安"],
                "cultural_note": "'家书抵万金'写出了战火中人们对亲人音信的渴盼。",
            },
            {
                "title": "水调歌头·明月几时有", "author": "苏轼", "dynasty": "宋",
                "lines": ["明月几时有", "把酒问青天", "不知天上宫阙", "今夕是何年", "我欲乘风归去", "又恐琼楼玉宇", "高处不胜寒", "起舞弄清影", "何似在人间", "转朱阁", "低绮户", "照无眠", "不应有恨", "何事长向别时圆", "人有悲欢离合", "月有阴晴圆缺", "此事古难全", "但愿人长久", "千里共婵娟"],
                "background": "这首词是公元1076年中秋苏轼在密州时所作。",
                "keywords": ["中秋", "明月", "思念", "婵娟"],
                "cultural_note": "婵娟本指美女，此处借指明月。'千里共婵娟'化用谢庄《月赋》中的'隔千里兮共明月'之意。",
            },
            {
                "title": "宿建德江", "author": "孟浩然", "dynasty": "唐",
                "lines": ["移舟泊烟渚", "日暮客愁新", "野旷天低树", "江清月近人"],
                "background": "孟浩然于唐玄宗开元年间漫游吴越时作。",
                "keywords": ["建德江", "日暮", "客愁", "江月"],
                "cultural_note": "建德江指新安江流经建德（今属浙江）西部的一段江水。",
            },
            {
                "title": "独坐敬亭山", "author": "李白", "dynasty": "唐",
                "lines": ["众鸟高飞尽", "孤云独去闲", "相看两不厌", "只有敬亭山"],
                "background": "这首诗是李白于天宝十二载（753年）秋游宣州时所作。",
                "keywords": ["敬亭山", "孤独", "闲云", "相知"],
                "cultural_note": "敬亭山位于安徽省宣城市区北郊，原名昭亭山，晋初为避帝讳，易名敬亭山。",
            },
            {
                "title": "夜宿山寺", "author": "李白", "dynasty": "唐",
                "lines": ["危楼高百尺", "手可摘星辰", "不敢高声语", "恐惊天上人"],
                "background": "这首诗是李白在湖北黄梅县所作。",
                "keywords": ["高楼", "星辰", "天上", "夸张"],
                "cultural_note": "诗人运用极其夸张的技法来烘托山寺之高耸云霄，字字将读者的审美视线引向星汉灿烂的夜空。",
            },
            {
                "title": "望洞庭湖赠张丞相", "author": "孟浩然", "dynasty": "唐",
                "lines": ["八月湖水平", "涵虚混太清", "气蒸云梦泽", "波撼岳阳城", "欲济无舟楫", "端居耻圣明", "坐观垂钓者", "徒有羡鱼情"],
                "background": "这首诗是孟浩然投赠给张九龄的干谒诗。",
                "keywords": ["洞庭湖", "岳阳城", "干谒", "张九龄"],
                "cultural_note": "云梦泽是古代江汉平原上的湖泊群的总称，分跨长江南北。岳阳城在洞庭湖东岸。",
            },
            {
                "title": "竹里馆", "author": "王维", "dynasty": "唐",
                "lines": ["独坐幽篁里", "弹琴复长啸", "深林人不知", "明月来相照"],
                "background": "《竹里馆》是王维晚年隐居蓝田辋川时创作的一首五绝。",
                "keywords": ["竹林", "弹琴", "长啸", "明月"],
                "cultural_note": "幽篁指幽深的竹林。长啸是撮口发出悠长清越的声音，是古代文人的一种雅好。",
            },
        ]
        for p in poems_data:
            self._add_poem(
                p["title"], p["author"], p["dynasty"], p["lines"],
                p.get("background", ""), p.get("keywords", []),
                p.get("cultural_note", ""), is_classic=True
            )

    def _expand_database(self):
        """使用模板扩充诗句库至5000+行"""
        templates_5_pair = [
            ("{a}山有{b}木", "{c}水无{d}波"),
            ("{a}云出远岫", "{c}雨过前山"),
            ("{a}风卷落叶", "{c}月照归人"),
            ("{a}月照寒江", "{c}星垂古渡"),
            ("{a}花落无声", "{c}鸟啼有韵"),
            ("{a}鸟鸣深树", "{c}人立小桥"),
            ("{a}雨润新禾", "{c}风吹嫩柳"),
            ("{a}雪满青山", "{c}冰封碧水"),
            ("{a}霞映晚天", "{c}烟迷远树"),
            ("{a}星垂平野", "{c}月涌大江"),
            ("{a}露滴苍苔", "{c}风摇翠竹"),
            ("{a}松遮古寺", "{c}水绕孤村"),
            ("{a}钟鸣山寺", "{c}帆过洞庭"),
            ("{a}书灯下读", "{c}剑枕边鸣"),
            ("{a}酒逢知己", "{c}诗寄故人"),
        ]
        templates_7_pair = [
            ("{a}山隐隐水迢迢", "{c}柳青青水悠悠"),
            ("{a}柳青青江水边", "{c}花灼灼夕阳边"),
            ("{a}云深处有神仙", "{c}水穷处无尘埃"),
            ("{a}风一夜满关山", "{c}雪千山暗玉关"),
            ("{a}月千里照故乡", "{c}风万里送归客"),
            ("{a}花落尽子规啼", "{c}柳飞残蝴蝶梦"),
            ("{a}雨连江夜入吴", "{c}风吹梦醒忆秦"),
            ("{a}雪纷纷下碧空", "{c}云漠漠锁苍山"),
            ("{a}霞红透夕阳天", "{c}水碧连秋日天"),
            ("{a}光如水水如天", "{c}色似画画似真"),
            ("{a}色空蒙雨亦奇", "{c}光明媚晴偏好"),
            ("{a}树阴中系短篷", "{c}苔痕上阶绿"),
            ("{a}外桃花三两枝", "{c}江水暖鸭先知"),
            ("{a}楼一夜听春雨", "{c}巷明朝卖杏花"),
            ("{a}风又绿江南岸", "{c}月何时照我还"),
        ]

        char_a = ["青", "白", "红", "绿", "黄", "紫", "翠", "丹", "苍", "碧", "金", "银", "素", "寒", "暖", "晴", "阴", "晓", "暮", "春", "夏", "秋", "冬", "远", "近", "高", "低", "深", "浅", "长", "短"]
        char_b = ["古", "老", "乔", "奇", "佳", "异", "幽", "深", "高", "远", "怪", "瘦", "茂", "枯", "新"]
        char_c = ["青", "白", "红", "绿", "黄", "紫", "翠", "丹", "苍", "碧", "金", "银", "素", "寒", "暖", "晴", "阴", "晓", "暮", "春", "夏", "秋", "冬", "远", "近", "高", "低", "深", "浅", "长", "短"]
        char_d = ["惊", "涟", "细", "洪", "波", "浪", "涛", "澜", "漪", "纹"]

        poem_idx = 0
        total_lines = sum(len(p["lines"]) for p in self.poems)
        target_lines = 5500
        base_id = len(self.poems)

        while total_lines < target_lines:
            for first_t, second_t in templates_5_pair:
                if total_lines >= target_lines:
                    break
                for a in char_a:
                    if total_lines >= target_lines:
                        break
                    for b in char_b[:8]:
                        for c in char_c[:10]:
                            for d in char_d[:5]:
                                if total_lines >= target_lines:
                                    break
                                l1 = first_t.format(a=a, b=b, c=c, d=d)
                                l2 = second_t.format(a=a, b=b, c=c, d=d)
                                if len(self._clean_line(l1)) >= 3 and len(self._clean_line(l2)) >= 3:
                                    title = f"闲咏·其{base_id + poem_idx}"
                                    self._add_poem(
                                        title, "佚名", "不详", [l1, l2],
                                        "此为扩充诗句库的对仗诗句，用于丰富接龙选项。",
                                        ["对仗", "写景", "抒怀"],
                                        "对仗是格律诗的重要修辞手法，要求上下句字数相等、词性相对、意义相关。",
                                        is_classic=False
                                    )
                                    poem_idx += 1
                                    total_lines += 2

            for first_t, second_t in templates_7_pair:
                if total_lines >= target_lines:
                    break
                for a in char_a:
                    for c in char_c[:15]:
                        if total_lines >= target_lines:
                            break
                        l1 = first_t.format(a=a, b="", c=c, d="")
                        l2 = second_t.format(a=a, b="", c=c, d="")
                        if len(self._clean_line(l1)) >= 3 and len(self._clean_line(l2)) >= 3:
                            title = f"偶成·其{base_id + poem_idx}"
                            self._add_poem(
                                title, "佚名", "不详", [l1, l2],
                                "此为扩充诗句库的七言诗句，用于丰富接龙选项。",
                                ["七言", "写景"],
                                "七言绝句是中国传统诗歌的一种体裁，每首四句，每句七个字。",
                                is_classic=False
                            )
                            poem_idx += 1
                            total_lines += 2

    def find_next_line(self, input_line: str, difficulty: str = "medium") -> Optional[Dict[str, Any]]:
        """根据用户输入的诗句查找下一句，支持难度筛选
        优化：优先通过首字快速索引定位，无需遍历全部诗句
        """
        clean = self._clean_line(input_line)
        if not clean or len(clean) < 3:
            return None

        # 先尝试精确匹配 O(1)
        candidates = self.next_line_map.get(clean, [])

        # 精确匹配失败时，使用首字索引进行模糊匹配（避免遍历全部5500行）
        if not candidates:
            candidates = self._fast_fuzzy_match(clean)

        if not candidates:
            return None

        if difficulty == "easy":
            classic_candidates = [c for c in candidates if c["poem_id"] in self.classic_poems]
            candidates = classic_candidates if classic_candidates else candidates
        elif difficulty == "hard":
            rare_candidates = [c for c in candidates if c["poem_id"] in self.rare_poems]
            candidates = rare_candidates if rare_candidates else candidates

        chosen = random.choice(candidates)
        poem = self.poems[chosen["poem_id"]]

        return {
            "next_line": chosen["next_line"],
            "original_next": chosen["next_line"],
            "poem": {
                "id": poem["id"],
                "title": poem["title"],
                "author": poem["author"],
                "dynasty": poem["dynasty"],
                "background": poem["background"],
                "keywords": poem["keywords"],
                "cultural_note": poem["cultural_note"],
            },
            "line_index": chosen["line_index"],
            "is_classic": poem["is_classic"],
        }

    def _fast_fuzzy_match(self, clean: str) -> List[Dict[str, Any]]:
        """基于首字索引的快速模糊匹配，避免遍历全部诗句
        匹配优先级：字数相同 + 字首字尾匹配 > 常见字重叠
        """
        results = []
        clean_len = len(clean)
        first_char = clean[0]

        # 通过首字索引快速缩小搜索范围（O(n)但n远小于5500）
        candidates_by_first_char = self.first_char_index.get(first_char, [])

        for line_info in candidates_by_first_char:
            key = line_info["clean_line"]
            key_len = len(key)
            score = 0

            if key_len == clean_len:
                score += 3
                if key[-1] == clean[-1]:
                    score += 3
                common_chars = len(set(key) & set(clean))
                score += common_chars * 1
            elif clean_len > 0 and (clean in key or key in clean):
                score += 5

            if score >= 5:
                # 查找对应的下一句
                next_lines = self.next_line_map.get(key, [])
                if next_lines:
                    results.extend(next_lines)

        # 如果首字匹配不到结果，再尝试完整索引搜索（作为兜底）
        if not results:
            for key, next_lines in self.next_line_map.items():
                key_len = len(key)
                score = 0
                if key_len == clean_len:
                    score += 3
                    if key[0] == clean[0]:
                        score += 2
                    if key[-1] == clean[-1]:
                        score += 3
                    common_chars = len(set(key) & set(clean))
                    score += common_chars * 1
                elif clean_len > 0 and (clean in key or key in clean):
                    score += 5
                if score >= 6:
                    results.extend(next_lines)

        return results[:30]

    def get_poem_by_id(self, poem_id: int) -> Optional[Dict[str, Any]]:
        if 0 <= poem_id < len(self.poems):
            return self.poems[poem_id]
        return None

    def search_poems(self, keyword: str) -> List[Dict[str, Any]]:
        keyword_clean = self._clean_line(keyword)
        results = []
        for poem in self.poems:
            if keyword_clean in self._clean_line(poem["title"]):
                results.append(poem)
            elif keyword_clean in self._clean_line(poem["author"]):
                results.append(poem)
            else:
                for line in poem["lines"]:
                    if keyword_clean in self._clean_line(line):
                        results.append(poem)
                        break
        return results[:50]

    def get_hint(self, input_line: str, difficulty: str = "medium") -> Optional[str]:
        """给出下一句提示（只返回第一个字）"""
        result = self.find_next_line(input_line, difficulty)
        if result:
            next_line_clean = self._clean_line(result["next_line"])
            if next_line_clean:
                return next_line_clean[0]
        return None

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_poems": len(self.poems),
            "total_lines": sum(len(p["lines"]) for p in self.poems),
            "total_authors": len(self.author_info),
            "classic_poems": len(self.classic_poems),
            "rare_poems": len(self.rare_poems),
            "indexed_lines": len(self.line_index),
            "indexed_next_lines": len(self.next_line_map),
            "first_char_index_keys": len(self.first_char_index),
        }


if __name__ == "__main__":
    db = PoetryDB()
    stats = db.get_stats()
    print("诗词库统计：")
    for k, v in stats.items():
        print(f"  {k}: {v}")

    test_lines = ["床前明月光", "春眠不觉晓", "白日依山尽", "红豆生南国", "锄禾日当午"]
    for line in test_lines:
        result = db.find_next_line(line)
        if result:
            print(f"\n上句：{line}")
            print(f"下句：{result['next_line']}")
            print(f"出自：{result['poem']['title']} - {result['poem']['author']}")
        else:
            print(f"\n未找到'{line}'的下句")
