import random
import string
import time
from typing import Dict, List, Optional, Set


class Player:
    def __init__(self, player_id: str, nickname: str, sid: str):
        self.id = player_id
        self.nickname = nickname
        self.sid = sid
        self.score: int = 0
        self.round_score: int = 0
        self.is_ready: bool = False
        self.is_drawer: bool = False
        self.correct_this_round: bool = False

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'nickname': self.nickname,
            'score': self.score,
            'roundScore': self.round_score,
            'isReady': self.is_ready,
            'isDrawer': self.is_drawer,
        }


EASY_WORDS = [
    '西瓜', '雨伞', '苹果', '太阳', '月亮', '星星', '花朵', '大树', '小鱼', '小鸟',
    '猫咪', '狗狗', '房子', '汽车', '飞机', '轮船', '火车', '书本', '铅笔', '橡皮',
    '桌子', '椅子', '杯子', '碗筷', '门锁', '窗户', '桥梁', '道路', '山峰', '河流',
    '雪花', '雨滴', '彩虹', '云朵', '闪电', '风车', '灯笼', '蜡烛', '钥匙', '钟表',
    '眼镜', '帽子', '鞋子', '围巾', '手套', '裙子', '裤子', '衬衫', '领带', '腰带',
    '面包', '牛奶', '鸡蛋', '米饭', '面条', '饺子', '汤圆', '月饼', '粽子', '蛋糕',
    '篮球', '足球', '网球', '乒乓球', '跳绳', '风筝', '秋千', '滑梯', '摇马', '积木',
    '冰箱', '电视', '手机', '电脑', '相机', '耳机', '音箱', '风扇', '空调', '台灯',
    '沙发', '床铺', '衣柜', '书架', '花瓶', '画框', '镜子', '地毯', '窗帘', '枕头',
]

MEDIUM_WORDS = [
    '过山车', '手电筒', '望远镜', '红绿灯', '冰淇淋', '巧克力', '棒棒糖', '棉花糖',
    '热气球', '摩天轮', '旋转木马', '碰碰车', '跷跷板', '滑板车', '独轮车', '三轮车',
    '消防车', '救护车', '警车', '坦克', '潜艇', '火箭', '卫星', '雷达', '天线', '电池',
    '充电器', '计算器', '打印机', '扫描仪', '投影仪', '显微镜', '温度计', '血压计',
    '听诊器', '注射器', '创可贴', '轮椅', '拐杖', '假牙', '眼镜蛇', '变色龙', '啄木鸟',
    '猫头鹰', '企鹅', '海豚', '鲸鱼', '章鱼', '水母', '螃蟹', '龙虾', '蜗牛', '蝴蝶',
    '蜻蜓', '萤火虫', '七星瓢虫', '向日葵', '蒲公英', '仙人掌', '含羞草', '薰衣草',
    '玫瑰花', '百合花', '牡丹花', '康乃馨', '杜鹃花', '茉莉花', '桂花', '荷花', '梅花',
    '樱花', '桃花', '梨花', '杏花', '苹果树', '椰子树', '香蕉', '菠萝', '草莓', '樱桃',
]

HARD_WORDS = [
    '守株待兔', '掩耳盗铃', '画蛇添足', '井底之蛙', '狐假虎威', '亡羊补牢', '刻舟求剑',
    '叶公好龙', '坐井观天', '对牛弹琴', '杯弓蛇影', '画龙点睛', '望梅止渴', '指鹿为马',
    '纸上谈兵', '胸有成竹', '卧薪尝胆', '破釜沉舟', '四面楚歌', '草船借箭', '三顾茅庐',
    '完璧归赵', '负荆请罪', '毛遂自荐', '闻鸡起舞', '投笔从戎', '约法三章', '萧规曹随',
    '运筹帷幄', '决胜千里', '出奇制胜', '声东击西', '围魏救赵', '暗度陈仓', '欲擒故纵',
    '釜底抽薪', '调虎离山', '抛砖引玉', '打草惊蛇', '指桑骂槐', '假痴不癫', '上屋抽梯',
    '空城计', '苦肉计', '连环计', '美人计', '走为上计', '拔苗助长', '杞人忧天',
    '班门弄斧', '一箭双雕', '百发百中', '朝三暮四', '自相矛盾', '滥竽充数',
    '南辕北辙', '买椟还珠', '鹬蚌相争', '螳螂捕蝉', '黔驴技穷', '塞翁失马',
    '精卫填海', '愚公移山', '夸父追日', '女娲补天', '后羿射日', '嫦娥奔月',
    '大禹治水', '铁杵成针', '水滴石穿', '绳锯木断', '闻一知十', '举一反三',
]

WORD_BANK = {
    'easy': list(EASY_WORDS),
    'medium': list(MEDIUM_WORDS),
    'hard': list(HARD_WORDS),
}

DIFFICULTY_ORDER = ['easy', 'medium', 'hard']


class Room:
    ROUND_DURATION = 30
    TOTAL_ROUNDS = 3

    def __init__(self, room_id: str, owner_id: str):
        self.room_id = room_id
        self.owner_id = owner_id
        self.players: Dict[str, Player] = {}
        self.drawer_order: List[str] = []
        self.current_drawer_index: int = 0
        self.current_word: str = ''
        self.round_number: int = 0
        self.total_rounds: int = self.TOTAL_ROUNDS
        self.difficulty: str = 'easy'
        self.time_left: int = self.ROUND_DURATION
        self.phase: str = 'waiting'
        self.correct_count: int = 0
        self.used_words: Dict[str, Set[str]] = {
            'easy': set(), 'medium': set(), 'hard': set()
        }
        self.draw_history: List[dict] = []
        self.timer_ref = None

    def add_player(self, player: Player) -> None:
        self.players[player.id] = player

    def remove_player(self, player_id: str) -> Optional[Player]:
        if player_id in self.players:
            p = self.players.pop(player_id)
            if player_id in self.drawer_order:
                self.drawer_order.remove(player_id)
            return p
        return None

    def get_player_list(self) -> List[dict]:
        return [p.to_dict() for p in self.players.values()]

    def get_word(self) -> str:
        pool = WORD_BANK[self.difficulty]
        used = self.used_words[self.difficulty]
        available = [w for w in pool if w not in used]
        if not available:
            used.clear()
            available = list(pool)
        word = random.choice(available)
        used.add(word)
        return word

    def start_game(self) -> dict:
        self.drawer_order = list(self.players.keys())
        random.shuffle(self.drawer_order)
        self.current_drawer_index = 0
        self.round_number = 0
        for p in self.players.values():
            p.score = 0
            p.round_score = 0
        return self.next_round()

    def next_round(self) -> dict:
        if self.current_drawer_index >= len(self.drawer_order):
            round_diff_idx = (self.round_number // len(self.drawer_order)) % len(DIFFICULTY_ORDER)
            self.difficulty = DIFFICULTY_ORDER[round_diff_idx]
            self.current_drawer_index = 0

        self.round_number += 1

        if self.round_number > self.total_rounds * len(self.drawer_order):
            return {'phase': 'gameEnd', 'players': self.get_player_list()}

        round_diff_idx = (self.round_number - 1) // len(self.drawer_order)
        if round_diff_idx < len(DIFFICULTY_ORDER):
            self.difficulty = DIFFICULTY_ORDER[round_diff_idx]
        else:
            self.difficulty = DIFFICULTY_ORDER[-1]

        drawer_id = self.drawer_order[self.current_drawer_index]
        self.current_drawer_index += 1

        for p in self.players.values():
            p.is_drawer = False
            p.correct_this_round = False
            p.round_score = 0
        self.players[drawer_id].is_drawer = True

        self.current_word = self.get_word()
        self.time_left = self.ROUND_DURATION
        self.correct_count = 0
        self.draw_history = []
        self.phase = 'drawing'

        return {
            'phase': 'roundStart',
            'roundNumber': self.round_number,
            'drawer': drawer_id,
            'word': self.current_word,
            'timeLeft': self.time_left,
            'difficulty': self.difficulty,
        }

    def submit_guess(self, player_id: str, content: str) -> Optional[dict]:
        if self.phase != 'drawing':
            return None
        if not content or not content.strip():
            return None
        player = self.players.get(player_id)
        if not player or player.is_drawer or player.correct_this_round:
            return None

        is_correct = content.strip() == self.current_word

        if is_correct:
            player.correct_this_round = True
            self.correct_count += 1
            guesser_score = max(100 - (self.correct_count - 1) * 10, 50)
            player.score += guesser_score
            player.round_score = guesser_score

            drawer = next((p for p in self.players.values() if p.is_drawer), None)
            if drawer:
                drawer_assist = min(30, 120 - drawer.round_score) if drawer.round_score < 120 else 0
                drawer.round_score += drawer_assist
                drawer.score += drawer_assist

        now = time.localtime()
        time_str = f'{now.tm_min:02d}:{now.tm_sec:02d}'

        return {
            'playerId': player_id,
            'nickname': player.nickname,
            'content': content.strip(),
            'isCorrect': is_correct,
            'time': time_str,
        }

    def round_end(self) -> dict:
        self.phase = 'roundEnd'
        for p in self.players.values():
            if p.is_drawer:
                p.score += p.round_score
        return {
            'word': self.current_word,
            'players': self.get_player_list(),
        }

    def all_guessed(self) -> bool:
        guessers = [p for p in self.players.values() if not p.is_drawer]
        return all(p.correct_this_round for p in guessers) if guessers else False


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.player_room: Dict[str, str] = {}
        self.player_sid: Dict[str, str] = {}

    def create_room(self, owner_id: str, nickname: str, sid: str) -> tuple:
        room_id = ''.join(random.choices(string.digits, k=6))
        while room_id in self.rooms:
            room_id = ''.join(random.choices(string.digits, k=6))
        room = Room(room_id, owner_id)
        player = Player(owner_id, nickname, sid)
        room.add_player(player)
        self.rooms[room_id] = room
        self.player_room[owner_id] = room_id
        self.player_sid[owner_id] = sid
        return room_id, player

    def join_room(self, room_id: str, player_id: str, nickname: str, sid: str) -> Optional[tuple]:
        room = self.rooms.get(room_id)
        if not room:
            return None
        player = Player(player_id, nickname, sid)
        room.add_player(player)
        self.player_room[player_id] = room_id
        self.player_sid[player_id] = sid
        return room, player

    def leave_room(self, player_id: str) -> Optional[Room]:
        room_id = self.player_room.pop(player_id, None)
        if not room_id:
            return None
        self.player_sid.pop(player_id, None)
        room = self.rooms.get(room_id)
        if not room:
            return None
        room.remove_player(player_id)
        if not room.players:
            del self.rooms[room_id]
        return room

    def get_room(self, room_id: str) -> Optional[Room]:
        return self.rooms.get(room_id)

    def get_room_by_player(self, player_id: str) -> Optional[Room]:
        room_id = self.player_room.get(player_id)
        if room_id:
            return self.rooms.get(room_id)
        return None

    def get_sid(self, player_id: str) -> Optional[str]:
        return self.player_sid.get(player_id)
