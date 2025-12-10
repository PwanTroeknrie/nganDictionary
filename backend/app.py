from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import yaml
from datetime import datetime
import pandas as pd
import math
from typing import Dict, List, Any

app = Flask(__name__)
CORS(app)

# 基础数据目录
BASE_DATA_DIR = './user_data'


def ensure_project_dir(project_id: str):
    """确保项目目录存在"""
    project_dir = os.path.join(BASE_DATA_DIR, project_id)
    os.makedirs(project_dir, exist_ok=True)
    return project_dir


def get_cache_path(project_id: str) -> str:
    """获取cache.json文件路径"""
    project_dir = ensure_project_dir(project_id)
    return os.path.join(project_dir, 'cache.json')


def get_config_path(project_id: str) -> str:
    """获取config.yaml文件路径"""
    project_dir = ensure_project_dir(project_id)
    return os.path.join(project_dir, 'config.yaml')


def clean_data_for_json(obj):
    """递归清理数据，确保所有值都是JSON可序列化的"""
    if obj is None:
        return ""
    elif isinstance(obj, (int, float)):
        # 处理NaN和Infinity
        if math.isnan(obj) or math.isinf(obj):
            return ""
        return obj
    elif isinstance(obj, str):
        return obj
    elif isinstance(obj, dict):
        return {k: clean_data_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_data_for_json(item) for item in obj]
    else:
        return str(obj)


def load_entries(project_id: str) -> List[Dict]:
    """加载项目的词条数据"""
    cache_path = get_cache_path(project_id)
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 清理数据确保JSON可序列化
                return clean_data_for_json(data)
        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {e}")
            return []
    return []


def save_entries(project_id: str, entries: List[Dict]):
    """保存词条数据到cache.json"""
    cache_path = get_cache_path(project_id)
    # 清理数据确保JSON可序列化
    cleaned_entries = clean_data_for_json(entries)
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_entries, f, ensure_ascii=False, indent=2)


def load_project_config(project_id: str) -> Dict:
    """加载项目配置"""
    config_path = get_config_path(project_id)
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    return {}


def save_project_config(project_id: str, config: Dict):
    """保存项目配置"""
    config_path = get_config_path(project_id)
    with open(config_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, allow_unicode=True, default_flow_style=False)


# === 项目管理 API ===

@app.route('/api/projects', methods=['GET'])
def list_projects():
    """获取所有项目列表"""
    try:
        projects = []
        if os.path.exists(BASE_DATA_DIR):
            for project_id in os.listdir(BASE_DATA_DIR):
                config_path = os.path.join(BASE_DATA_DIR, project_id, 'config.yaml')
                if os.path.exists(config_path):
                    try:
                        with open(config_path, 'r', encoding='utf-8') as f:
                            config = yaml.safe_load(f)
                            project_info = config.get('project_info', {})
                            projects.append({
                                'id': project_id,
                                'name': project_info.get('name', project_id),
                                'has_password': project_info.get('has_password', False),
                                'created_at': project_info.get('created_at'),
                                'owner_id': project_info.get('owner_id', 'unknown')
                            })
                    except Exception as e:
                        print(f"加载项目 {project_id} 配置失败: {e}")
                        continue
        return jsonify({'projects': projects})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects', methods=['POST'])
def create_project():
    """创建新项目"""
    try:
        data = request.json
        project_name = data.get('name', '未命名项目')
        has_password = data.get('has_password', False)
        password = data.get('password', '')

        # 生成项目ID（基于名称）
        project_id = project_name.lower().replace(' ', '_').replace('/', '_')

        # 检查项目是否已存在
        project_dir = os.path.join(BASE_DATA_DIR, project_id)
        if os.path.exists(project_dir):
            return jsonify({'error': '项目已存在'}), 400

        # 创建项目配置
        config = {
            'project_info': {
                'id': project_id,
                'name': project_name,
                'owner_id': 'user123',
                'has_password': has_password,
                'password_hash': password,
                'created_at': datetime.utcnow().isoformat()
            },
            'access_control': {
                'allowed_users': []
            }
        }

        save_project_config(project_id, config)

        # 创建空的词条数据
        save_entries(project_id, [])

        return jsonify({
            'project_id': project_id,
            'message': '项目创建成功'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/verify', methods=['POST'])
def verify_project_password(project_id: str):
    """验证项目密码"""
    try:
        data = request.json
        password = data.get('password', '')

        config = load_project_config(project_id)
        if not config:
            return jsonify({'error': '项目不存在'}), 404

        project_info = config.get('project_info', {})

        # 简化密码验证
        if project_info.get('has_password', False):
            if password != project_info.get('password_hash', ''):
                return jsonify({'error': '密码错误'}), 401

        return jsonify({
            'access_granted': True,
            'message': '验证成功'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# === 词条数据 API ===

@app.route('/api/projects/<project_id>/entries', methods=['GET'])
def get_entries(project_id: str):
    """获取所有词条"""
    try:
        entries = load_entries(project_id)
        return jsonify(entries)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/entries', methods=['POST'])
def create_entry(project_id: str):
    """创建新词条"""
    try:
        new_entry = request.json
        entries = load_entries(project_id)

        # 生成新ID
        new_id = max([entry.get('id', 0) for entry in entries], default=0) + 1
        new_entry['id'] = new_id

        # 确保每个sense都有chart_type字段
        for sense in new_entry.get('senses', []):
            sense.setdefault('chart_type', '')

        entries.append(new_entry)
        save_entries(project_id, entries)

        return jsonify(new_entry), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/entries/<int:entry_id>', methods=['PUT'])
def update_entry(project_id: str, entry_id: int):
    """更新词条"""
    try:
        updated_entry = request.json
        entries = load_entries(project_id)

        # 确保chart_type字段存在且不是NaN
        for sense in updated_entry.get('senses', []):
            sense.setdefault('chart_type', '')

        # 找到并更新词条
        for i, entry in enumerate(entries):
            if entry.get('id') == entry_id:
                entries[i] = updated_entry
                save_entries(project_id, entries)
                return jsonify(updated_entry)

        return jsonify({'error': '词条不存在'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(project_id: str, entry_id: int):
    """删除词条"""
    try:
        entries = load_entries(project_id)
        entries = [entry for entry in entries if entry.get('id') != entry_id]
        save_entries(project_id, entries)

        return jsonify({'message': '词条删除成功'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# === 示例数据初始化 ===

@app.route('/api/projects/<project_id>/init-sample', methods=['POST'])
def init_sample_data(project_id: str):
    """初始化示例数据"""
    try:
        sample_entries = [
            {
                "id": 1,
                "word": "测试词",
                "transliteration": "ceshici",
                "senses": [
                    {
                        "sense_id": 1,
                        "displayed_tag": "noun",
                        "ipa": "测试词",
                        "derived_from": ["root"],
                        "description": "测试描述",
                        "tags": ["noun", "test"],
                        "definitions": [
                            {
                                "text": "这是一个测试定义",
                                "examples": ["这是一个测试例句"]
                            }
                        ],
                        "chart_type": "",
                        "table_data": [],
                        "derived_to": []
                    }
                ]
            }
        ]

        save_entries(project_id, sample_entries)
        return jsonify({
            'message': '示例数据初始化成功',
            'entries_count': len(sample_entries)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# === 文件导出导入 API ===

@app.route('/api/projects/<project_id>/export/excel', methods=['GET'])
def export_to_excel(project_id: str):
    """导出为Excel文件"""
    try:
        entries = load_entries(project_id)

        # 转换为扁平化结构
        flattened_data = []
        for entry in entries:
            for sense in entry.get('senses', []):
                row_data = {
                    'id': entry['id'],
                    'word': entry['word'],
                    'transliteration': entry.get('transliteration', ''),
                    'sense_id': sense['sense_id'],
                    'displayed_tag': sense['displayed_tag'],
                    'ipa': sense['ipa'],
                    'derived_from': '; '.join(sense['derived_from']),
                    'description': sense['description'],
                    'tags': '; '.join(sense['tags']),
                    'definitions': format_definitions(sense['definitions']),
                    'chart_type': sense.get('chart_type', ''),
                    'table_data': format_table_data(sense.get('table_data', [])),
                    'derived_to': '; '.join(sense['derived_to'])
                }
                flattened_data.append(row_data)

        # 创建DataFrame并保存为Excel
        df = pd.DataFrame(flattened_data)

        # 确保所有列都是字符串类型，避免NaN问题
        for col in df.columns:
            df[col] = df[col].astype(str).replace('nan', '')

        excel_path = os.path.join(BASE_DATA_DIR, project_id, 'export.xlsx')
        df.to_excel(excel_path, index=False, engine='openpyxl')

        return send_file(excel_path, as_attachment=True, download_name=f'{project_id}_dictionary.xlsx')

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/import/excel', methods=['POST'])
def import_from_excel(project_id: str):
    """从Excel文件导入"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': '只支持Excel文件'}), 400

        # 保存上传的文件
        import_path = os.path.join(BASE_DATA_DIR, project_id, 'import.xlsx')
        file.save(import_path)

        # 读取Excel并转换为JSON格式
        df = pd.read_excel(import_path)

        # 处理NaN值
        df = df.fillna('')

        entries = excel_to_json_format(df)

        # 保存数据
        save_entries(project_id, entries)

        # 清理临时文件
        if os.path.exists(import_path):
            os.remove(import_path)

        return jsonify({
            'message': '导入成功',
            'entries_count': len(entries)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# === 工具函数 ===

def format_definitions(definitions: List[Dict]) -> str:
    """格式化definitions为字符串"""
    if not definitions:
        return ""

    definition_texts = []
    for definition in definitions:
        text = definition.get('text', '')
        examples = definition.get('examples', [])
        if examples:
            text += f" (例句: {'; '.join(examples)})"
        definition_texts.append(text)

    return ' | '.join(definition_texts)


def format_table_data(table_data: List[List]) -> str:
    """格式化table_data为字符串"""
    if not table_data:
        return ""

    table_texts = []
    for row in table_data:
        row_text = ' | '.join(str(cell) for cell in row)
        table_texts.append(row_text)

    return ' || '.join(table_texts)


def excel_to_json_format(df: pd.DataFrame) -> List[Dict]:
    """将Excel数据转换回JSON格式"""
    entries = []
    processed_ids = set()

    # 确保所有列都存在
    required_columns = ['id', 'word', 'sense_id', 'displayed_tag', 'ipa']
    for col in required_columns:
        if col not in df.columns:
            df[col] = ''

    for entry_id in df['id'].unique():
        if entry_id in processed_ids or entry_id == '':
            continue

        try:
            entry_rows = df[df['id'] == entry_id]
            first_row = entry_rows.iloc[0]

            entry = {
                'id': int(float(entry_id)) if str(entry_id).replace('.', '').isdigit() else len(entries) + 1,
                'word': str(first_row['word']),
                'transliteration': str(first_row.get('transliteration', '')),
                'senses': []
            }

            for _, row in entry_rows.iterrows():
                sense = {
                    'sense_id': int(float(row['sense_id'])) if str(row['sense_id']).replace('.', '').isdigit() else 1,
                    'displayed_tag': str(row['displayed_tag']),
                    'ipa': str(row.get('ipa', '')),
                    'derived_from': [item.strip() for item in str(row.get('derived_from', '')).split(';') if
                                     item.strip()],
                    'description': str(row.get('description', '')),
                    'tags': [item.strip() for item in str(row.get('tags', '')).split(';') if item.strip()],
                    'definitions': parse_definitions(str(row.get('definitions', ''))),
                    'chart_type': str(row.get('chart_type', '')),
                    'table_data': parse_table_data(str(row.get('table_data', ''))),
                    'derived_to': [item.strip() for item in str(row.get('derived_to', '')).split(';') if item.strip()]
                }
                entry['senses'].append(sense)

            entries.append(entry)
            processed_ids.add(entry_id)
        except Exception as e:
            print(f"处理词条 {entry_id} 时出错: {e}")
            continue

    return entries


def parse_definitions(definitions_str: str) -> List[Dict]:
    """解析definitions字符串"""
    if not definitions_str or definitions_str == 'nan':
        return []

    definitions = []
    for definition_part in definitions_str.split(' | '):
        text = definition_part
        examples = []

        # 简单解析例句（如果有）
        if ' (例句: ' in definition_part:
            text, examples_part = definition_part.split(' (例句: ', 1)
            examples = [ex.strip() for ex in examples_part.rstrip(')').split(';')]

        definitions.append({
            'text': text.strip(),
            'examples': examples
        })

    return definitions


def parse_table_data(table_data_str: str) -> List[List]:
    """解析table_data字符串"""
    if not table_data_str or table_data_str == 'nan':
        return []

    table_data = []
    for row_str in table_data_str.split(' || '):
        row = [cell.strip() for cell in row_str.split(' | ')]
        table_data.append(row)

    return table_data


if __name__ == '__main__':
    # 确保基础目录存在
    os.makedirs(BASE_DATA_DIR, exist_ok=True)

    # 运行开发服务器
    app.run(debug=True, host='0.0.0.0', port=5000)