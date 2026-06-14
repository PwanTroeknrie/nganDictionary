import pandas as pd
import json
import os
from typing import List, Dict, Any
import re


class DictionaryExcelConverter:
    """
    负责将复杂的词典 JSON 结构（包含词条、义项、定义、例句、表格等）
    与扁平的 Excel 表格格式之间进行相互转换。
    """

    def __init__(self):
        # 定义Excel中预期的列，用于参考，但在转换逻辑中并未严格检查
        self.required_columns = [
            'id', 'slug', 'word', 'transliteration', 'sense_id', 'displayed_tag',
            'ipa', 'derived_from', 'description', 'tags', 'definitions',
            'chart_type', 'morphology', 'derived_to'
        ]

    def json_to_excel(self, json_data: List[Dict], excel_path: str) -> None:
        """
        将 JSON 数据转换为 Excel 格式。
        每个词条的每个义项 (sense) 转换为 Excel 中的一行。
        """
        flattened_data = []

        for entry in json_data:
            # 提取词条的基础信息
            base_info = {
                'id': entry['id'],
                'slug': entry.get('slug', ''),
                'word': entry['word'],
                'transliteration': entry['transliteration']
            }

            # 遍历并扁平化每个义项
            for sense in entry['senses']:
                row_data = base_info.copy()
                row_data.update({
                    'sense_id': sense['sense_id'],
                    'displayed_tag': sense.get('displayed_tag', ''),  # 使用 .get() 确保键存在
                    'ipa': sense.get('ipa', ''),
                    # 列表转换为分号分隔的字符串
                    'derived_from': self._list_to_string(sense.get('derived_from', [])),
                    'description': sense.get('description', ''),
                    'tags': self._list_to_string(sense.get('tags', [])),
                    # 复杂结构序列化 (新逻辑)
                    'definitions': self._serialize_definitions(sense.get('definitions', [])),
                    'chart_type': sense.get('chart_type', ''),
                    'morphology': self._serialize_morphology(sense.get('morphology', {})),
                    'derived_to': self._list_to_string(sense.get('derived_to', []))
                })
                flattened_data.append(row_data)

        # 创建 DataFrame 并保存为 Excel
        df = pd.DataFrame(flattened_data)
        # 确保列顺序与预期一致
        columns_to_use = [col for col in self.required_columns if col in df.columns]
        df = df[columns_to_use]

        df.to_excel(excel_path, index=False, engine='openpyxl')
        print(f"成功将JSON数据导出到: {excel_path}")

    def excel_to_json(self, excel_path: str) -> List[Dict]:
        """
        将 Excel 数据转换回 JSON 格式。
        按词条 ID (id) 重新聚合所有义项 (sense)。
        """
        if not os.path.exists(excel_path):
            raise FileNotFoundError(f"Excel文件不存在: {excel_path}")

        # 读取 Excel 文件
        df = pd.read_excel(excel_path, engine='openpyxl')
        # 将所有 NaN 替换为空字符串，简化后续处理
        df = df.fillna('')

        # 按词条ID分组
        json_data = []

        for entry_id in df['id'].unique():
            # 筛选出当前词条ID对应的所有行（即所有义项）
            entry_rows = df[df['id'] == entry_id]

            # 使用第一行作为词条的基础信息
            first_row = entry_rows.iloc[0]

            entry = {
                # 确保 ID 是整数
                'id': int(entry_id) if pd.notna(entry_id) and entry_id != '' else None,
                'word': first_row['word'],
                'transliteration': first_row['transliteration'],
                'senses': []
            }
            # 保留 slug 字段（如果存在）
            if 'slug' in first_row and str(first_row['slug']).strip():
                entry['slug'] = str(first_row['slug']).strip()

            # 处理每个义项
            for _, row in entry_rows.iterrows():
                sense_id = row['sense_id']
                sense = {
                    # 确保 sense_id 是整数
                    'sense_id': int(sense_id) if pd.notna(sense_id) and sense_id != '' else None,
                    'displayed_tag': row['displayed_tag'],
                    'ipa': row['ipa'],
                    # 字符串反序列化为列表
                    'derived_from': self._string_to_list(row['derived_from']),
                    'description': row['description'],
                    'tags': self._string_to_list(row['tags']),
                    # 复杂结构反序列化 (新逻辑)
                    'definitions': self._deserialize_definitions(row['definitions']),
                    'chart_type': row['chart_type'],
                    'morphology': self._deserialize_morphology(row.get('morphology', '')),
                    'derived_to': self._string_to_list(row['derived_to'])
                }
                entry['senses'].append(sense)

            json_data.append(entry)

        return json_data

    def _list_to_string(self, data_list: List) -> str:
        """将列表转换为分号和空格分隔的字符串 (e.g., "tag1; tag2; tag3")"""
        if not data_list:
            return ""
        # 确保所有项都是字符串以便于 join
        return "; ".join(str(item) for item in data_list)

    def _string_to_list(self, data_string: Any) -> List:
        """将分号分隔的字符串转换回列表"""
        s = str(data_string).strip()
        if not s or s == 'nan':
            return []
        # 分隔符是 "; "，但 split(";") 后 strip() 也可以接受
        return [item.strip() for item in s.split(";") if item.strip()]

    def _serialize_definitions(self, definitions: List[Dict]) -> str:
        """
        [新逻辑] 序列化 definitions 数组。
        格式: text1 | ex1 | ex2 || text2 | ex3 || text3
        """
        if not definitions:
            return ""

        definition_strings = []
        for definition in definitions:
            definition_text = definition.get('text', '').strip()
            if not definition_text:
                continue

            # 1. 以定义文本开始
            definition_parts = [definition_text]

            # 2. 如果存在例句，则将例句也作为后续部分添加
            examples = definition.get('examples', [])
            if examples:
                # 将所有例句添加到 parts 列表，每个例句都会在后面通过 DEFINITION_PART_SEP 分隔
                definition_parts.extend(str(ex).strip() for ex in examples if str(ex).strip())

            # 使用 DEFINITION_PART_SEP ( | ) 连接定义文本和例句
            definition_strings.append(" | ".join(definition_parts))

        # 使用 " || " ( || ) 分隔不同的定义项
        return " || ".join(definition_strings)

    def _deserialize_definitions(self, definitions_str: Any) -> List[Dict]:
        """
        [新逻辑] 将字符串反序列化为 definitions 数组。
        格式: text1 | ex1 | ex2 || text2 | ex3 || text3
        """
        s = str(definitions_str).strip()
        if not s or s == 'nan':
            return []

        definitions = []

        # 1. 使用 " || " 分隔不同的定义项
        for definition_part in s.split(" || "):
            definition_part = definition_part.strip()
            if not definition_part:
                continue

            # 2. 使用 DEFINITION_PART_SEP 分割文本和例句部分
            parts = [p.strip() for p in definition_part.split(" | ")]

            # 3. 第一个部分是定义文本
            text = parts[0] if parts else ""

            # 4. 剩余的部分是例句
            examples = [p for p in parts[1:] if p]  # 过滤空字符串

            definition = {
                'text': text,
                'examples': examples
            }

            # 只有当提取出非空文本时才添加
            if definition['text']:
                definitions.append(definition)

        return definitions

    def _serialize_morphology(self, morphology: Dict) -> str:
        if not morphology:
            return ""
        return json.dumps(morphology, ensure_ascii=False)

    def _deserialize_morphology(self, morphology_str: Any) -> Dict:
        s = str(morphology_str).strip()
        if not s or s == 'nan':
            return {}
        try:
            value = json.loads(s)
        except json.JSONDecodeError:
            return {}
        return value if isinstance(value, dict) else {}

    def validate_json_structure(self, json_data: List[Dict]) -> bool:
        """验证JSON数据结构是否符合预期"""
        required_keys = ['id', 'word', 'transliteration', 'senses']
        optional_keys = ['slug']
        sense_required_keys = [
            'sense_id', 'displayed_tag', 'ipa', 'derived_from', 'description',
            'tags', 'definitions', 'chart_type', 'morphology', 'derived_to'
        ]

        # 检查是否为列表
        if not isinstance(json_data, list):
            print("错误: 顶级JSON数据不是列表。")
            return False

        for entry in json_data:
            if not isinstance(entry, dict):
                print("错误: 词条不是字典类型。")
                return False

            # 检查词条级别的必需字段
            for key in required_keys:
                if key not in entry:
                    print(f"错误: 词条缺少必需字段: {key}")
                    return False

            if not isinstance(entry.get('senses'), list):
                print(f"错误: 词条 {entry.get('word', entry.get('id'))} 的 'senses' 不是列表。")
                return False

            # 检查义项级别的必需字段
            for sense in entry.get('senses', []):
                if not isinstance(sense, dict):
                    print(f"错误: 词条 {entry.get('word', entry.get('id'))} 中的义项不是字典类型。")
                    return False

                for key in sense_required_keys:
                    if key not in sense:
                        print(f"错误: 词条 {entry.get('word', entry.get('id'))} 的义项缺少必需字段: {key}")
                        return False

                # 额外的类型检查，例如 definitions 必须是列表
                if not isinstance(sense.get('definitions'), list):
                    print(f"错误: 义项 {sense.get('sense_id')} 的 'definitions' 不是列表。")
                    return False

        return True


# 独立的转换函数，便于在其他地方调用
def convert_json_to_excel(json_file_path: str, excel_file_path: str):
    """将JSON文件转换为Excel文件"""
    with open(json_file_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)

    converter = DictionaryExcelConverter()
    converter.json_to_excel(json_data, excel_file_path)


def convert_excel_to_json(excel_file_path: str, json_file_path: str):
    """将Excel文件转换为JSON文件"""
    converter = DictionaryExcelConverter()
    json_data = converter.excel_to_json(excel_file_path)

    with open(json_file_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    convert_excel_to_json("../user_data/default/dictionary.xlsx", "../user_data/default/cache.json")
