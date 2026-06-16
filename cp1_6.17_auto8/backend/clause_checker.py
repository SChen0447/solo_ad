import re
import uuid
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class RiskClause:
    id: str
    type: str
    severity: str
    text: str
    start_index: int
    end_index: int
    description: str
    suggestion: str
    legal_basis: str


@dataclass
class Chapter:
    id: str
    title: str
    level: int
    start_index: int
    end_index: int
    children: List['Chapter']


RISK_RULES = [
    {
        'type': 'penalty',
        'severity': 'high',
        'patterns': [
            r'违约金[^\n，。；]*超过?\s*[一二三四五六七八九十\d]+\s*%',
            r'违约金[^\n，。；]*超过?\s*[一二三四五六七八九十\d]+\s*‰',
            r'逾期违约金[^\n，。；]*日[^\n，。；]*[千分之|百分之][一二三四五六七八九十\d]+',
            r'违约金[^\n，。；]*不低于?\s*[一二三四五六七八九十\d]+\s*%',
            r'惩罚性赔偿',
            r'双倍返还定金[^\n，。；]*超过?\s*[一二三四五六七八九十\d]+%'
        ],
        'description': '违约金条款约定过高，可能超出法律保护范围。根据《民法典》规定，违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。',
        'suggestion': '建议将违约金调整至合理范围（通常不超过合同总金额的30%或实际损失的130%），或明确约定以实际损失为计算基础。',
        'legal_basis': '《民法典》第五百八十五条：约定的违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。'
    },
    {
        'type': 'termination',
        'severity': 'high',
        'patterns': [
            r'甲方有权随时解除本合同',
            r'甲方可随时终止本协议',
            r'单方[^\n，。；]*解除[^\n，。；]*无需承担责任',
            r'单方[^\n，。；]*终止[^\n，。；]*不承担违约责任',
            r'无需任何理由[^\n，。；]*解除合同',
            r'一方有权随时终止合同'
        ],
        'description': '单方解约权条款显失公平，赋予一方无正当理由随时解除合同的权利而无需承担责任，严重违反合同对等原则。',
        'suggestion': '建议删除单方随时解约条款，或明确约定解除合同的具体条件和提前通知期限，同时约定解约方应承担的合理赔偿责任。',
        'legal_basis': '《民法典》第六条：民事主体从事民事活动，应当遵循公平原则，合理确定各方的权利和义务。'
    },
    {
        'type': 'disclaimer',
        'severity': 'high',
        'patterns': [
            r'概不负责',
            r'不承担任何责任',
            r'无论何种情况[^\n，。；]*不承担责任',
            r'免除一方全部责任',
            r'不对任何间接损失承担责任',
            r'不赔偿任何[^\n，。；]*损失',
            r'概不退还',
            r'不承担任何违约责任'
        ],
        'description': '免责条款不公平地免除一方应承担的基本责任，可能因违反公平原则和法律强制性规定而被认定为无效。',
        'suggestion': '建议删除此类免责条款，或合理限制免责范围（如不可抗力等法定情形），对于因故意或重大过失造成的损失不得约定免责。',
        'legal_basis': '《民法典》第五百零六条：合同中的下列免责条款无效：（一）造成对方人身损害的；（二）因故意或者重大过失造成对方财产损失的。'
    },
    {
        'type': 'penalty',
        'severity': 'medium',
        'patterns': [
            r'违约金[^\n，。；]*按日\s*[千分之|百分之][一二三四五六七八九十\d]+',
            r'逾期付款违约金[^\n，。；]*日利率',
            r'迟延履行违约金'
        ],
        'description': '违约金计算方式需注意合理性，按日计算的违约金累计可能达到较高金额。',
        'suggestion': '建议明确违约金计算上限，通常违约金总额以不超过合同未履行部分金额的30%为宜。',
        'legal_basis': '《民法典》第五百八十五条：当事人可以约定一方违约时应当根据违约情况向对方支付一定数额的违约金。'
    },
    {
        'type': 'termination',
        'severity': 'medium',
        'patterns': [
            r'提前[^\n，。；]*日通知即可解除',
            r'发生重大变化时[^\n，。；]*解除合同',
            r'根本违约[^\n，。；]*解除合同'
        ],
        'description': '解约条款需明确约定解除条件和通知程序，避免产生争议。',
        'suggestion': '建议明确约定"重大变化"、"根本违约"的具体情形，以及解除通知的送达方式和生效时间。',
        'legal_basis': '《民法典》第五百六十二条：当事人可以约定一方解除合同的事由。解除合同的事由发生时，解除权人可以解除合同。'
    },
    {
        'type': 'disclaimer',
        'severity': 'medium',
        'patterns': [
            r'不对间接损失负责',
            r'不对可得利益损失承担责任',
            r'不承担预期利润损失',
            r'不可抗力[^\n，。；]*不承担责任'
        ],
        'description': '间接损失免责条款需注意合理性，完全排除间接损失赔偿可能限制守约方的合法救济权利。',
        'suggestion': '建议明确间接损失的具体范围，或约定合理的间接损失赔偿上限。',
        'legal_basis': '《民法典》第五百八十四条：损失赔偿额应当相当于因违约所造成的损失，包括合同履行后可以获得的利益。'
    },
    {
        'type': 'other',
        'severity': 'medium',
        'patterns': [
            r'最终解释权归[^\n，。；]*所有',
            r'本合同最终解释权',
            r'[^\n，。；]*单方[^\n，。；]*变更合同',
            r'保密义务[^\n，。；]*永久',
            r'竞业限制[^\n，。；]*超过二年'
        ],
        'description': '条款内容可能违反法律规定或存在不合理限制。',
        'suggestion': '建议删除单方最终解释权条款，对合同变更应约定双方协商一致；竞业限制期限不得超过二年。',
        'legal_basis': '《民法典》第四百九十八条：对格式条款的理解发生争议的，应当按照通常理解予以解释。'
    },
    {
        'type': 'other',
        'severity': 'low',
        'patterns': [
            r'等其他[^\n，。；]*情况',
            r'等情形',
            r'由双方协商解决',
            r'视情况而定',
            r'另行约定'
        ],
        'description': '条款表述较为模糊，可能在执行过程中产生理解分歧。',
        'suggestion': '建议明确约定具体内容和处理方式，避免使用模糊表述，减少争议发生。',
        'legal_basis': '《民法典》第四百六十六条：当事人对合同条款的理解有争议的，应当依据本法第一百四十二条第一款的规定，确定争议条款的含义。'
    }
]

CHAPTER_PATTERNS = [
    r'^(第[一二三四五六七八九十百]+章)\s*[、．. ]*(.+)',
    r'^(第[一二三四五六七八九十百]+节)\s*[、．. ]*(.+)',
    r'^([一二三四五六七八九十]+)\s*[、．. ](.+)',
    r'^(\d+)\s*[、．. ](.+)',
    r'^(\d+\.\d+)\s*[、．. ]*(.+)',
    r'^(\d+\.\d+\.\d+)\s*[、．. ]*(.+)',
]


def parse_chapters(content: str) -> List[Chapter]:
    chapters: List[Chapter] = []
    chapter_stack: List[Chapter] = []

    lines = content.split('\n')
    current_pos = 0

    for line in lines:
        line_start = current_pos
        line_end = current_pos + len(line) + 1
        stripped_line = line.strip()

        matched = False
        for idx, pattern in enumerate(CHAPTER_PATTERNS):
            match = re.match(pattern, stripped_line)
            if match:
                level = idx
                title = stripped_line
                chapter_id = str(uuid.uuid4())

                new_chapter = Chapter(
                    id=chapter_id,
                    title=title,
                    level=level,
                    start_index=line_start,
                    end_index=line_end,
                    children=[]
                )

                while chapter_stack and chapter_stack[-1].level >= level:
                    chapter_stack.pop()

                if chapter_stack:
                    chapter_stack[-1].children.append(new_chapter)
                else:
                    chapters.append(new_chapter)

                chapter_stack.append(new_chapter)
                matched = True
                break

        if not matched and chapter_stack:
            chapter_stack[-1].end_index = line_end

        current_pos = line_end

    for ch in chapter_stack:
        ch.end_index = current_pos

    if not chapters:
        default_chapter = Chapter(
            id=str(uuid.uuid4()),
            title='合同全文',
            level=0,
            start_index=0,
            end_index=len(content),
            children=[]
        )
        chapters.append(default_chapter)

    return chapters


def analyze_risks(content: str) -> List[Dict[str, Any]]:
    risks: List[RiskClause] = []
    found_positions = set()

    for rule in RISK_RULES:
        for pattern in rule['patterns']:
            matches = list(re.finditer(pattern, content))
            for match in matches:
                start, end = match.span()

                overlap = False
                for pos in found_positions:
                    if not (end <= pos[0] or start >= pos[1]):
                        overlap = True
                        break

                if overlap:
                    continue

                found_positions.add((start, end))

                matched_text = match.group(0)
                if len(matched_text) < 20:
                    context_start = max(0, start - 30)
                    context_end = min(len(content), end + 30)
                    display_text = content[context_start:context_end].strip()
                else:
                    display_text = matched_text

                risk = RiskClause(
                    id=str(uuid.uuid4()),
                    type=rule['type'],
                    severity=rule['severity'],
                    text=display_text,
                    start_index=start,
                    end_index=end,
                    description=rule['description'],
                    suggestion=rule['suggestion'],
                    legal_basis=rule['legal_basis']
                )
                risks.append(risk)

    risks.sort(key=lambda x: x.start_index)
    return [r.__dict__ for r in risks]


def calculate_score(content: str, risks: List[Dict[str, Any]]) -> Dict[str, Any]:
    base_score = 100
    high_count = sum(1 for r in risks if r['severity'] == 'high')
    medium_count = sum(1 for r in risks if r['severity'] == 'medium')
    low_count = sum(1 for r in risks if r['severity'] == 'low')

    penalty_high = high_count * 8
    penalty_medium = medium_count * 4
    penalty_low = low_count * 1
    total_penalty = penalty_high + penalty_medium + penalty_low

    legal_basis_penalty = 0
    fairness_penalty = 0
    precision_penalty = 0

    for risk in risks:
        if risk['type'] in ['penalty', 'disclaimer']:
            legal_basis_penalty += 3 if risk['severity'] == 'high' else 1.5
        if risk['type'] in ['termination', 'disclaimer']:
            fairness_penalty += 4 if risk['severity'] == 'high' else 2
        if risk['type'] == 'other':
            precision_penalty += 2 if risk['severity'] == 'high' else 1

    total = max(20, base_score - total_penalty)
    legal_basis = max(30, 100 - legal_basis_penalty - high_count * 2)
    fairness = max(30, 100 - fairness_penalty - high_count * 2)
    precision = max(40, 100 - precision_penalty - low_count * 1.5)

    def get_score_detail(score: float) -> str:
        if score >= 85:
            return '表现优秀，符合相关法律要求'
        elif score >= 70:
            return '整体良好，存在少量可优化空间'
        elif score >= 60:
            return '基本合规，建议针对问题条款进行调整'
        else:
            return '存在较大问题，建议重点审查修改'

    return {
        'total': round(total),
        'legalBasis': round(legal_basis),
        'fairness': round(fairness),
        'precision': round(precision),
        'details': {
            'legalBasis': get_score_detail(legal_basis),
            'fairness': get_score_detail(fairness),
            'precision': get_score_detail(precision)
        }
    }


def chapter_to_dict(chapter: Chapter) -> Dict[str, Any]:
    return {
        'id': chapter.id,
        'title': chapter.title,
        'level': chapter.level,
        'startIndex': chapter.start_index,
        'endIndex': chapter.end_index,
        'children': [chapter_to_dict(c) for c in chapter.children]
    }
