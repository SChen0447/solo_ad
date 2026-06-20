import uuid
import time
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

share_store = {}

MARKET_TEMPLATES = {
    "技术创新": {
        "exec_summary": "{name}致力于通过前沿技术突破，在{market}赛道中打造差异化竞争优势。项目以\"{vision}\"为核心驱动力，面向{users}等目标群体，构建技术壁垒与网络效应。",
        "market_analysis": "当前{market}领域正处于快速发展期，市场规模预计未来三年复合增长率超过25%。主要竞争对手尚未形成绝对头部效应，{users}群体对创新技术方案的接受度持续提升。技术迭代周期缩短为差异化切入提供了窗口期。",
        "product_desc": "产品基于自主技术架构，面向{users}的核心痛点提供解决方案。通过模块化设计实现快速迭代，以数据驱动的智能算法提升用户体验，构建平台级技术能力。初期聚焦核心功能场景，逐步扩展至全链条覆盖。",
        "business_model": "采用SaaS订阅+增值服务的混合商业模式。基础功能免费获取用户，高级功能按月/年订阅收费。同时开放API接口，通过生态合作获取渠道分成收入。预计12个月内实现付费转化率8%-12%。",
        "finance_forecast": "基于初始投资{investment}万元，月固定成本{cost}元，月增长率{growth}%的假设，项目前6个月处于投入期，预计第9个月实现单月盈亏平衡。关键财务假设包括：获客成本随规模效应递减、客单价随功能迭代稳步提升、固定成本占比逐步优化。"
    },
    "消费升级": {
        "exec_summary": "{name}聚焦消费升级趋势，以\"{vision}\"为使命，深耕{market}赛道，精准服务{users}等高价值消费群体的品质生活需求。",
        "market_analysis": "消费升级浪潮下，{users}群体对品质、体验和个性化的需求快速增长。{market}赛道市场规模超千亿，且线上渗透率仍有大幅提升空间。消费者品牌忠诚度逐步向体验忠诚度转移，为新品牌崛起创造机遇。",
        "product_desc": "产品以用户体验为核心设计理念，为{users}提供一站式品质消费解决方案。通过精选供应链、个性化推荐和社群运营，打造差异化消费体验。强调视觉设计、交互流畅度和内容质量，构建品牌认知与情感连接。",
        "business_model": "采用DTC（直接面向消费者）模式，通过自营电商+社交电商双渠道运营。收入来源包括商品销售差价、会员订阅费和品牌合作收入。通过社群裂变降低获客成本，会员体系提升复购率和LTV。",
        "finance_forecast": "基于初始投资{investment}万元，月固定成本{cost}元，月增长率{growth}%的假设，消费类项目通常在第6-8个月实现单月盈利。关键假设包括：复购率稳定在35%以上、客单价月均提升2-3%、供应链成本随采购量增大而优化。"
    },
    "产业互联": {
        "exec_summary": "{name}以\"{vision}\"为指引，深耕{market}赛道，通过数字化连接与协同效率提升，服务{users}等产业参与方的核心诉求。",
        "market_analysis": "产业互联网正从信息化向智能化演进，{users}等参与方对降本增效的数字化工具需求旺盛。{market}赛道市场空间巨大，但数字化渗透率普遍不足20%。政策支持与基础设施完善为产业互联项目提供了良好的发展环境。",
        "product_desc": "产品打造产业协同平台，连接{users}等多方参与者，实现信息流、资金流、物流的高效协同。核心功能包括：供需智能匹配、全流程可视化管理、数据驱动的决策辅助。以开放平台策略构建产业生态。",
        "business_model": "采用平台交易佣金+SaaS工具收费的混合模式。交易撮合收取1-3%服务费，数字化工具按企业规模分层定价。增值服务包括供应链金融、数据分析报告等。预期平台网络效应将推动交易量指数级增长。",
        "finance_forecast": "基于初始投资{investment}万元，月固定成本{cost}元，月增长率{growth}%的假设，产业互联项目通常需要较长的市场培育期。预计前8个月以拓展合作方为主，第10-12个月交易量将显著提升。关键假设包括平台入驻率月增15%、交易佣金率稳定、客户生命周期价值持续增长。"
    },
    "社会公益": {
        "exec_summary": "{name}以\"{vision}\"为初心，在{market}领域探索可持续的社会价值创造模式，服务{users}等群体，实现社会效益与组织发展的良性循环。",
        "market_analysis": "社会公益领域正在经历从传统慈善向社会创新的转型，{users}等群体对专业化、透明化的公益服务需求日益增长。{market}赛道在政策鼓励与社会关注的双重推动下，蕴含着巨大的社会价值创造空间。ESG投资理念的普及也为公益项目带来了新的资金来源。",
        "product_desc": "产品构建社会公益创新平台，为{users}提供精准帮扶与能力赋能服务。通过数字化手段提升公益资源配置效率，实现捐赠方与受助方的直接连接与透明追踪。核心功能包括：需求智能匹配、项目进展可视化、影响力数据量化。",
        "business_model": "采用公益+商业的混合运营模式。核心公益服务免费提供，通过增值服务（如影响力评估报告、企业CSR咨询）实现收入。同时探索社会影响力债券、政府购买服务等创新融资渠道。目标在实现社会效益的同时确保组织财务可持续性。",
        "finance_forecast": "基于初始投资{investment}万元，月固定成本{cost}元，月增长率{growth}%的假设，公益项目财务模型以可持续运营为目标。前期以基金资助和企业赞助为主要收入来源，中期逐步发展增值服务收入。关键假设包括资助收入稳定性、增值服务转化率和运营成本控制效率。"
    }
}


@app.route("/api/generate-planbook", methods=["POST"])
def generate_planbook():
    data = request.json
    project_name = data.get("projectName", "")
    vision = data.get("vision", "")
    market_position = data.get("marketPosition", "技术创新")
    target_users = data.get("targetUsers", [])
    finance_params = data.get("financeParams", {
        "initialInvestment": 100,
        "monthlyFixedCost": 50000,
        "monthlyGrowthRate": 5,
    })

    template = MARKET_TEMPLATES.get(market_position, MARKET_TEMPLATES["技术创新"])

    users_str = "、".join(target_users) if target_users else "目标用户"
    investment = finance_params.get("initialInvestment", 100)
    cost = finance_params.get("monthlyFixedCost", 50000)
    growth = finance_params.get("monthlyGrowthRate", 5)

    fill_args = {
        "name": project_name,
        "vision": vision,
        "market": market_position,
        "users": users_str,
        "investment": investment,
        "cost": cost,
        "growth": growth,
    }

    chapters = [
        {"title": "执行摘要", "content": template["exec_summary"].format(**fill_args)},
        {"title": "市场分析", "content": template["market_analysis"].format(**fill_args)},
        {"title": "产品描述", "content": template["product_desc"].format(**fill_args)},
        {"title": "商业模式", "content": template["business_model"].format(**fill_args)},
        {"title": "财务预测", "content": template["finance_forecast"].format(**fill_args)},
    ]

    result = {
        "projectName": project_name,
        "vision": vision,
        "marketPosition": market_position,
        "targetUsers": target_users,
        "chapters": chapters,
        "financeParams": finance_params,
    }

    return jsonify(result)


@app.route("/api/generate-pdf", methods=["POST"])
def generate_pdf():
    data = request.json
    project_name = data.get("projectName", "商业计划书")
    chapters = data.get("chapters", [])

    html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body {{ font-family: SimSun, serif; padding: 40px; color: #1f2937; }}
  h1 {{ color: #1e3a5f; text-align: center; margin-bottom: 8px; }}
  h2 {{ color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin-top: 30px; }}
  p {{ line-height: 1.8; margin: 8px 0; }}
</style></head><body>
<h1>{project_name}</h1>
"""
    for ch in chapters:
        html_content += f"<h2>{ch['title']}</h2>"
        for line in ch["content"].split("\n"):
            html_content += f"<p>{line}</p>"
    html_content += "</body></html>"

    try:
        import pdfkit
        pdf_filename = f"{project_name}_商业计划书.pdf"
        pdf_path = f"/tmp/{pdf_filename}"
        pdfkit.from_string(html_content, pdf_path)
        pdf_url = f"/static/{pdf_filename}"
    except Exception:
        pdf_url = ""

    share_uuid = str(uuid.uuid4())
    share_url = f"http://localhost:5173/share/{share_uuid}"
    share_store[share_uuid] = {
        "data": data,
        "created_at": time.time(),
        "expires_in": 72 * 3600,
    }

    return jsonify({"pdfUrl": pdf_url, "shareUrl": share_url})


@app.route("/api/share/<share_uuid>", methods=["GET"])
def get_share(share_uuid):
    entry = share_store.get(share_uuid)
    if not entry:
        return jsonify({"error": "分享链接不存在"}), 404

    if time.time() - entry["created_at"] > entry["expires_in"]:
        del share_store[share_uuid]
        return jsonify({"error": "分享链接已过期"}), 410

    return jsonify(entry["data"])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
