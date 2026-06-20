import random
import re


def _estimate_technical_accuracy(question, answer):
    score = 50
    if len(answer) < 10:
        return 20
    if len(answer) > 200:
        score += 15
    elif len(answer) > 100:
        score += 10
    elif len(answer) > 50:
        score += 5
    tech_keywords = [
        "原理", "机制", "架构", "优化", "算法", "框架", "协议",
        "性能", "缓存", "索引", "事务", "组件", "渲染", "编译",
        "异步", "并发", "分布式", "微服务", "容器", "接口",
        "模型", "范式", "规范", "策略", "模式",
    ]
    for kw in tech_keywords:
        if kw in answer:
            score += 3
    sentences = re.split(r'[。！？；]', answer)
    sentences = [s.strip() for s in sentences if s.strip()]
    if len(sentences) >= 4:
        score += 10
    elif len(sentences) >= 2:
        score += 5
    return min(score, 100)


def _estimate_logical_expression(answer):
    score = 40
    logic_markers = [
        "首先", "其次", "然后", "最后", "因此", "所以",
        "因为", "由于", "不过", "但是", "然而", "另外",
        "例如", "比如", "总的来说", "综上", "具体来说",
        "一方面", "另一方面", "相比之下",
    ]
    for marker in logic_markers:
        if marker in answer:
            score += 5
    sentences = re.split(r'[。！？；]', answer)
    sentences = [s.strip() for s in sentences if s.strip()]
    if len(sentences) >= 3:
        score += 10
    elif len(sentences) >= 2:
        score += 5
    if "第一" in answer or "1." in answer or "一是" in answer:
        score += 5
    return min(score, 100)


def _estimate_completeness(question, answer):
    score = 40
    if len(answer) < 20:
        return 25
    if len(answer) >= 300:
        score += 20
    elif len(answer) >= 150:
        score += 15
    elif len(answer) >= 80:
        score += 10
    completeness_markers = [
        "总结", "概括", "总的来说", "整体", "全面",
        "不仅", "还有", "此外", "同时", "另外",
    ]
    for marker in completeness_markers:
        if marker in answer:
            score += 3
    if "优点" in answer and "缺点" in answer:
        score += 8
    if "优势" in answer and "劣势" in answer:
        score += 8
    return min(score, 100)


def _generate_strengths(scores, position):
    position_name = {
        "frontend": "前端开发",
        "backend": "后端开发",
        "pm": "产品经理",
        "data_analyst": "数据分析",
    }.get(position, "")

    strengths = []
    if scores["technical_accuracy"] >= 70:
        strengths.append(f"在{position_name}技术概念理解上表现良好，能够准确使用专业术语")
    elif scores["technical_accuracy"] >= 50:
        strengths.append("对相关技术概念有基本理解，部分术语使用恰当")

    if scores["logical_expression"] >= 70:
        strengths.append("回答逻辑清晰，条理分明，使用了恰当的连接词组织内容")
    elif scores["logical_expression"] >= 50:
        strengths.append("表达有一定的逻辑性，建议增加更多过渡词提升连贯性")

    if scores["completeness"] >= 70:
        strengths.append("回答较为全面，能够从多个角度分析问题")
    elif scores["completeness"] >= 50:
        strengths.append("覆盖了问题的主要方面，可以进一步补充细节")

    if not strengths:
        strengths.append("能够对问题做出回应，建议增加更多细节和深度分析")

    return "；".join(strengths)


def _generate_improvements(scores):
    improvements = []
    if scores["technical_accuracy"] < 60:
        improvements.append("建议加强对核心技术概念的理解，多阅读官方文档和技术博客")
    elif scores["technical_accuracy"] < 80:
        improvements.append("技术理解已达到一定水平，可以通过实际项目实践进一步深化")

    if scores["logical_expression"] < 60:
        improvements.append("建议使用'首先、其次、最后'等逻辑连接词，使回答更有条理")
    elif scores["logical_expression"] < 80:
        improvements.append("逻辑表达可以进一步提升，尝试在回答前先梳理要点框架")

    if scores["completeness"] < 60:
        improvements.append("回答不够完整，建议从多个维度展开分析，如优缺点对比、场景举例等")
    elif scores["completeness"] < 80:
        improvements.append("可以适当增加实际案例和具体数据来增强回答的说服力")

    if not improvements:
        improvements.append("整体表现优秀！可以尝试挑战更高难度的问题，提升回答的深度和广度")

    return "；".join(improvements)


def score_answer(question, answer, position):
    technical = _estimate_technical_accuracy(question, answer)
    logical = _estimate_logical_expression(answer)
    completeness = _estimate_completeness(question, answer)

    variance = random.randint(-5, 5)
    technical = max(0, min(100, technical + variance))
    logical = max(0, min(100, logical + variance))
    completeness = max(0, min(100, completeness + variance))

    overall = round(technical * 0.4 + logical * 0.3 + completeness * 0.3)

    scores = {
        "technical_accuracy": technical,
        "logical_expression": logical,
        "completeness": completeness,
    }

    return {
        "scores": scores,
        "overall_score": overall,
        "feedback": {
            "strengths": _generate_strengths(scores, position),
            "improvements": _generate_improvements(scores),
        },
    }
