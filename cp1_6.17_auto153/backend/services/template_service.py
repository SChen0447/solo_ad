"""
模板服务模块
负责模板渲染和占位符替换

调用关系：
- routes/template_routes.py 调用此服务生成文档
- 数据流向：模板内容 + 数据 → template_service → 渲染后文档
"""

import re
from datetime import datetime
from typing import Dict, Any


class TemplateService:
    """模板服务"""

    PLACEHOLDER_PATTERN = r"\{\{(\w+)\}\}"

    @staticmethod
    def render(template_content: str, data: Dict[str, Any]) -> str:
        """
        渲染模板，替换占位符
        
        Args:
            template_content: 模板内容，包含 {{placeholder}} 格式的占位符
            data: 占位符数据字典
            
        Returns:
            渲染后的文档内容
        """
        result = template_content

        default_data = TemplateService._get_default_data()
        merged_data = {**default_data, **data}

        def replace_placeholder(match):
            key = match.group(1)
            return str(merged_data.get(key, match.group(0)))

        result = re.sub(TemplateService.PLACEHOLDER_PATTERN, replace_placeholder, result)

        return result

    @staticmethod
    def _get_default_data() -> Dict[str, Any]:
        """获取默认占位符数据"""
        return {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "year": datetime.now().strftime("%Y"),
            "month": datetime.now().strftime("%m"),
            "day": datetime.now().strftime("%d"),
            "author": "系统",
            "version": "1.0",
            "title": "未命名文档",
            "content": "",
        }

    @staticmethod
    def extract_placeholders(template_content: str) -> list:
        """
        提取模板中的所有占位符
        
        Args:
            template_content: 模板内容
            
        Returns:
            占位符名称列表
        """
        placeholders = re.findall(TemplateService.PLACEHOLDER_PATTERN, template_content)
        return list(set(placeholders))

    @staticmethod
    def validate_template(template_content: str) -> Dict[str, Any]:
        """
        验证模板是否有效
        
        Args:
            template_content: 模板内容
            
        Returns:
            验证结果
        """
        placeholders = TemplateService.extract_placeholders(template_content)
        has_content = "content" in placeholders

        return {
            "valid": True,
            "placeholders": placeholders,
            "hasContentPlaceholder": has_content,
            "placeholderCount": len(placeholders),
        }


template_service = TemplateService()
