"""
差异计算服务模块
负责计算两份文档之间的差异

调用关系：
- routes/diff_routes.py 调用此服务计算差异
- 数据流向：文档内容 → diff_service → 差异结果 → 返回前端
"""

import difflib
from typing import List, Dict, Any


class DiffService:
    """差异计算服务"""

    @staticmethod
    def compute_line_diff(left_content: str, right_content: str) -> Dict[str, Any]:
        """
        计算行级差异
        
        Args:
            left_content: 左侧（基准）文档内容
            right_content: 右侧（比较）文档内容
            
        Returns:
            包含左右两侧差异行的字典
        """
        left_lines = left_content.split("\n")
        right_lines = right_content.split("\n")

        diff = difflib.SequenceMatcher(None, left_lines, right_lines)

        left_result: List[Dict[str, Any]] = []
        right_result: List[Dict[str, Any]] = []
        left_line_num = 1
        right_line_num = 1
        total_diff_lines = 0

        for tag, i1, i2, j1, j2 in diff.get_opcodes():
            if tag == "equal":
                for k in range(i2 - i1):
                    left_result.append({
                        "type": "unchanged",
                        "content": left_lines[i1 + k],
                        "lineNumber": left_line_num,
                        "originalLineNumber": right_line_num,
                    })
                    right_result.append({
                        "type": "unchanged",
                        "content": right_lines[j1 + k],
                        "lineNumber": right_line_num,
                        "originalLineNumber": left_line_num,
                    })
                    left_line_num += 1
                    right_line_num += 1

            elif tag == "replace":
                left_count = i2 - i1
                right_count = j2 - j1
                total_diff_lines += max(left_count, right_count)

                max_len = max(left_count, right_count)
                for k in range(max_len):
                    if k < left_count:
                        left_result.append({
                            "type": "modified",
                            "content": left_lines[i1 + k],
                            "lineNumber": left_line_num,
                        })
                    else:
                        left_result.append({
                            "type": "modified",
                            "content": "",
                            "lineNumber": None,
                        })

                    if k < right_count:
                        right_result.append({
                            "type": "modified",
                            "content": right_lines[j1 + k],
                            "lineNumber": right_line_num,
                        })
                    else:
                        right_result.append({
                            "type": "modified",
                            "content": "",
                            "lineNumber": None,
                        })

                    if k < left_count:
                        left_line_num += 1
                    if k < right_count:
                        right_line_num += 1

            elif tag == "delete":
                count = i2 - i1
                total_diff_lines += count
                for k in range(count):
                    left_result.append({
                        "type": "removed",
                        "content": left_lines[i1 + k],
                        "lineNumber": left_line_num,
                    })
                    right_result.append({
                        "type": "removed",
                        "content": "",
                        "lineNumber": None,
                    })
                    left_line_num += 1

            elif tag == "insert":
                count = j2 - j1
                total_diff_lines += count
                for k in range(count):
                    left_result.append({
                        "type": "added",
                        "content": "",
                        "lineNumber": None,
                    })
                    right_result.append({
                        "type": "added",
                        "content": right_lines[j1 + k],
                        "lineNumber": right_line_num,
                    })
                    right_line_num += 1

        return {
            "leftLines": left_result,
            "rightLines": right_result,
            "totalDiffLines": total_diff_lines,
        }

    @staticmethod
    def get_diff_stats(left_content: str, right_content: str) -> Dict[str, int]:
        """
        获取差异统计信息
        
        Returns:
            包含新增、删除、修改行数的统计
        """
        diff_result = DiffService.compute_line_diff(left_content, right_content)
        right_lines = diff_result["rightLines"]

        added = sum(1 for line in right_lines if line["type"] == "added")
        removed = sum(1 for line in diff_result["leftLines"] if line["type"] == "removed")
        modified = sum(1 for line in right_lines if line["type"] == "modified")

        return {
            "added": added,
            "removed": removed,
            "modified": modified,
            "total": added + removed + modified,
        }


diff_service = DiffService()
