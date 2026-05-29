from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import base64
import re
import pandas as pd
import math
from typing import Dict, List
from db import (
    init_db, get_entries, create_entry, update_entry, delete_entry, word_exists,
    load_project_config, save_project_config, verify_project_code, delete_project,
    get_all_projects, migrate_from_json, migrate_config_from_file
)

app = Flask(__name__)
CORS(app)

BASE_DATA_DIR = os.environ.get('BASE_DATA_DIR', './user_data')


def word_to_slug(word: str) -> str:
    return base64.urlsafe_b64encode(word.encode('utf-8')).decode('ascii').rstrip('=')


def _heading_id(text: str) -> str:
    definition = text.strip()
    safe_keyword = re.sub(r'\\([\\*_{}\[\]()#+\-.!<>])', r'\1', definition)
    suffix = base64.urlsafe_b64encode(safe_keyword.encode('utf-8')).decode('ascii').rstrip('=')[:10]
    return definition.replace(' ', '-') + '-' + suffix


def _human_size(bytes_val: int) -> str:
    if bytes_val == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB"]
    i = min(int(math.log(bytes_val, 1024)), 3)
    return f"{bytes_val / (1024 ** i):.1f} {units[i]}"


def _get_auth_code() -> str:
    """Extract authorization code from request header."""
    return request.headers.get('X-Auth-Code', '')


def _check_auth(project_id: str, required: str = 'editor') -> str:
    """Check authorization. Returns permission level or aborts with error.
    required: 'editor' (for editing entries) or 'admin' (for delete project / upload)
    Returns '' if guest, 'editor' or 'admin' if authorized.
    """
    code = _get_auth_code()
    level = verify_project_code(project_id, code) if code else ''

    if required == 'admin' and level != 'admin':
        return ''
    if required == 'editor' and level not in ('editor', 'admin'):
        return ''
    return level


def _require_auth(project_id: str, required: str = 'editor'):
    """Require authorization or return 401."""
    level = _check_auth(project_id, required)
    if not level:
        return jsonify({'error': '需要授权码才能执行此操作'}), 401
    return None


# ── project APIs ────────────────────────────────────────────────

@app.route('/api/projects', methods=['GET'])
def list_projects():
    try:
        db_projects = get_all_projects()

        # Include legacy projects from user_data not yet in DB
        db_ids = {p['id'] for p in db_projects}
        if os.path.exists(BASE_DATA_DIR):
            for project_id in os.listdir(BASE_DATA_DIR):
                project_dir = os.path.join(BASE_DATA_DIR, project_id)
                if not os.path.isdir(project_dir) or project_id in db_ids:
                    continue
                config = load_project_config(project_id)
                info = config.get('project_info', {})
                if info.get('id'):
                    db_projects.append({
                        'id': project_id,
                        'name': info.get('name', project_id),
                        'owner': info.get('owner_id', 'unknown'),
                        'created_at': info.get('created_at', ''),
                        'has_admin_code': False,
                        'has_editor_code': False,
                        'entry_count': 0
                    })

        return jsonify({'projects': db_projects})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects', methods=['POST'])
def create_project_route():
    try:
        data = request.json
        project_name = data.get('name', '未命名项目')
        admin_code = data.get('admin_code', '')
        editor_code = data.get('editor_code', '')

        project_id = project_name.lower().replace(' ', '_').replace('/', '_')

        config = {
            'project_info': {
                'id': project_id,
                'name': project_name,
                'owner_id': 'creator',
                'has_password': bool(admin_code),
                'password_hash': admin_code,
                'created_at': pd.Timestamp.now().isoformat()
            },
            'access_control': {'allowed_users': []},
            'admin_code': admin_code,
            'editor_code': editor_code
        }
        save_project_config(project_id, config)
        # Also ensure project dir exists for doc/ and exports
        os.makedirs(os.path.join(BASE_DATA_DIR, project_id), exist_ok=True)

        return jsonify({
            'project_id': project_id,
            'message': '项目创建成功',
            'admin_code': admin_code,
            'editor_code': editor_code
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/authorize', methods=['POST'])
def authorize_project(project_id: str):
    """Verify an authorization code and return permission level."""
    try:
        data = request.json
        code = data.get('code', '')
        level = verify_project_code(project_id, code)
        if not level:
            return jsonify({'error': '授权码不正确'}), 401
        return jsonify({
            'level': level,
            'code': code,
            'message': '授权成功'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project_route(project_id: str):
    """Delete a project (requires admin code)."""
    auth_err = _require_auth(project_id, 'admin')
    if auth_err:
        return auth_err
    try:
        ok = delete_project(project_id)
        if not ok:
            return jsonify({'error': '项目不存在'}), 404
        return jsonify({'message': '项目删除成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── file metadata ──────────────────────────────────────────────

@app.route('/api/projects/<project_id>/files', methods=['GET'])
def get_file_metadata(project_id: str):
    try:
        project_dir = os.path.join(BASE_DATA_DIR, project_id)
        if not os.path.isdir(project_dir):
            return jsonify({'error': '项目不存在'}), 404

        entry_count = len(get_entries(project_id))
        files = []

        for fname, ftype, fext, fdisp in [
            ('docs.md', 'document', '.md', '项目文档 (docs.md)'),
            ('dictionary.xlsx', 'dictionary', '.xlsx', '词典数据 (dictionary.xlsx)'),
        ]:
            fpath = os.path.join(project_dir, fname)
            exists = os.path.isfile(fpath)
            st = os.stat(fpath) if exists else None
            file_obj = {
                'name': fdisp,
                'type': ftype,
                'extension': fext,
                'size_bytes': st.st_size if st else 0,
                'size': _human_size(st.st_size) if st else '0 B',
                'last_modified': pd.Timestamp.fromtimestamp(st.st_mtime).isoformat() if st else None,
                'exists': exists,
            }
            if ftype == 'dictionary':
                file_obj['entry_count'] = entry_count
            files.append(file_obj)

        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── entry APIs ──────────────────────────────────────────────────

@app.route('/api/projects/<project_id>/entries', methods=['GET'])
def get_entries_route(project_id: str):
    try:
        entries = get_entries(project_id)
        return jsonify(entries)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/entries', methods=['POST'])
def create_entry_route(project_id: str):
    auth_err = _require_auth(project_id, 'editor')
    if auth_err:
        return auth_err
    try:
        new_entry = request.json
        word = new_entry.get('word', '')
        slug = word_to_slug(word)

        if word_exists(project_id, word):
            return jsonify({'error': f'词条 "{word}" 已存在'}), 409

        new_entry['slug'] = slug
        for sense in new_entry.get('senses', []):
            sense.setdefault('chart_type', '')

        result = create_entry(project_id, new_entry)
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/entries/<string:slug>', methods=['PUT'])
def update_entry_route(project_id: str, slug: str):
    auth_err = _require_auth(project_id, 'editor')
    if auth_err:
        return auth_err
    try:
        updated_entry = request.json
        for sense in updated_entry.get('senses', []):
            sense.setdefault('chart_type', '')

        new_word = updated_entry.get('word', '')
        if new_word:
            new_slug = word_to_slug(new_word)
            if word_exists(project_id, new_word, exclude_slug=slug):
                return jsonify({'error': f'词条 "{new_word}" 已存在'}), 409
            updated_entry['slug'] = new_slug

        result = update_entry(project_id, slug, updated_entry)
        if result is None:
            return jsonify({'error': '词条不存在'}), 404

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/entries/<string:slug>', methods=['DELETE'])
def delete_entry_route(project_id: str, slug: str):
    auth_err = _require_auth(project_id, 'editor')
    if auth_err:
        return auth_err
    try:
        ok = delete_entry(project_id, slug)
        if not ok:
            return jsonify({'error': '词条不存在'}), 404
        return jsonify({'message': '词条删除成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/init-sample', methods=['POST'])
def init_sample_data(project_id: str):
    auth_err = _require_auth(project_id, 'editor')
    if auth_err:
        return auth_err
    try:
        sample = {
            "word": "测试词",
            "transliteration": "ceshici",
            "senses": [{
                "sense_id": 1,
                "displayed_tag": "noun",
                "ipa": "测试词",
                "derived_from": ["root"],
                "description": "测试描述",
                "tags": ["noun", "test"],
                "definitions": [{"text": "这是一个测试定义", "examples": ["这是一个测试例句"]}],
                "chart_type": "",
                "table_data": [],
                "derived_to": []
            }]
        }
        sample['slug'] = word_to_slug(sample['word'])

        if not word_exists(project_id, sample['word']):
            create_entry(project_id, sample)

        return jsonify({'message': '示例数据初始化成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Excel export/import ─────────────────────────────────────────

@app.route('/api/projects/<project_id>/export/excel', methods=['GET'])
def export_to_excel(project_id: str):
    # Export requires at least editor access (to download data)
    auth_err = _require_auth(project_id, 'editor')
    if auth_err:
        return auth_err
    try:
        entries = get_entries(project_id)
        flattened = []
        for entry in entries:
            for sense in entry.get('senses', []):
                row = {
                    'id': entry['id'],
                    'slug': entry.get('slug', ''),
                    'word': entry['word'],
                    'transliteration': entry.get('transliteration', ''),
                    'sense_id': sense['sense_id'],
                    'displayed_tag': sense['displayed_tag'],
                    'ipa': sense['ipa'],
                    'derived_from': '; '.join(sense['derived_from']),
                    'description': sense['description'],
                    'tags': '; '.join(sense['tags']),
                    'definitions': _format_definitions(sense['definitions']),
                    'chart_type': sense.get('chart_type', ''),
                    'table_data': _format_table_data(sense.get('table_data', [])),
                    'derived_to': '; '.join(sense['derived_to'])
                }
                flattened.append(row)

        df = pd.DataFrame(flattened)
        for col in df.columns:
            df[col] = df[col].astype(str).replace('nan', '')

        os.makedirs(os.path.join(BASE_DATA_DIR, project_id), exist_ok=True)
        excel_path = os.path.join(BASE_DATA_DIR, project_id, 'dictionary.xlsx')
        df.to_excel(excel_path, index=False, engine='openpyxl')

        return send_file(excel_path, as_attachment=True,
                         download_name=f'{project_id}_dictionary.xlsx')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/import/excel', methods=['POST'])
def import_from_excel(project_id: str):
    # Import requires admin access
    auth_err = _require_auth(project_id, 'admin')
    if auth_err:
        return auth_err
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': '只支持Excel文件'}), 400

        os.makedirs(os.path.join(BASE_DATA_DIR, project_id), exist_ok=True)
        import_path = os.path.join(BASE_DATA_DIR, project_id, 'import.xlsx')
        file.save(import_path)

        df = pd.read_excel(import_path)
        df = df.fillna('')

        entries = _excel_to_entries(df)

        created = 0
        for entry_data in entries:
            word = entry_data.get('word', '')
            if word and not word_exists(project_id, word):
                entry_data['slug'] = word_to_slug(word)
                create_entry(project_id, entry_data)
                created += 1

        if os.path.exists(import_path):
            os.remove(import_path)

        return jsonify({'message': f'导入成功，新增 {created} 条词条'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Excel helpers ───────────────────────────────────────────────

def _format_definitions(definitions: List[Dict]) -> str:
    if not definitions:
        return ""
    parts = []
    for d in definitions:
        text = d.get('text', '')
        exs = d.get('examples', [])
        if exs:
            text += f" (例句: {'; '.join(exs)})"
        parts.append(text)
    return ' | '.join(parts)


def _format_table_data(table_data: List[List]) -> str:
    if not table_data:
        return ""
    return ' || '.join(' | '.join(str(c) for c in row) for row in table_data)


def _excel_to_entries(df: pd.DataFrame) -> List[Dict]:
    entries = []
    processed = set()

    for entry_id in df['id'].unique():
        if entry_id in processed or entry_id == '':
            continue
        try:
            rows = df[df['id'] == entry_id]
            first = rows.iloc[0]
            entry = {
                'word': str(first['word']),
                'transliteration': str(first.get('transliteration', '')),
                'senses': []
            }
            if 'slug' in first and str(first['slug']).strip():
                entry['slug'] = str(first['slug']).strip()

            for _, row in rows.iterrows():
                sense = {
                    'sense_id': _safe_int(row['sense_id']),
                    'displayed_tag': str(row.get('displayed_tag', '')),
                    'ipa': str(row.get('ipa', '')),
                    'derived_from': [s.strip() for s in str(row.get('derived_from', '')).split(';') if s.strip()],
                    'description': str(row.get('description', '')),
                    'tags': [s.strip() for s in str(row.get('tags', '')).split(';') if s.strip()],
                    'definitions': _parse_definitions(str(row.get('definitions', ''))),
                    'chart_type': str(row.get('chart_type', '')),
                    'table_data': _parse_table_data(str(row.get('table_data', ''))),
                    'derived_to': [s.strip() for s in str(row.get('derived_to', '')).split(';') if s.strip()]
                }
                entry['senses'].append(sense)
            entries.append(entry)
            processed.add(entry_id)
        except Exception as e:
            print(f"Error processing entry {entry_id}: {e}")
            continue
    return entries


def _parse_definitions(s: str) -> List[Dict]:
    if not s or s == 'nan':
        return []
    defs = []
    for part in s.split(' | '):
        text = part
        examples = []
        if ' (例句: ' in part:
            text, ex_part = part.split(' (例句: ', 1)
            examples = [e.strip() for e in ex_part.rstrip(')').split(';')]
        defs.append({'text': text.strip(), 'examples': examples})
    return defs


def _parse_table_data(s: str) -> List[List]:
    if not s or s == 'nan':
        return []
    return [[c.strip() for c in row.split(' | ')] for row in s.split(' || ')]


def _safe_int(val) -> int:
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 1


# ── document CRUD ──────────────────────────────────────────────

@app.route('/api/projects/<project_id>/docs', methods=['GET'])
def get_document(project_id: str):
    try:
        project_dir = os.path.join(BASE_DATA_DIR, project_id)
        if not os.path.isdir(project_dir):
            return jsonify({'error': '项目不存在'}), 404
        doc_path = os.path.join(project_dir, 'docs.md')
        if not os.path.isfile(doc_path):
            os.makedirs(project_dir, exist_ok=True)
            with open(doc_path, 'w', encoding='utf-8') as f:
                f.write('')
        with open(doc_path, 'r', encoding='utf-8') as f:
            content = f.read()
        last_modified = pd.Timestamp.fromtimestamp(os.stat(doc_path).st_mtime).isoformat()
        return jsonify({'content': content, 'last_modified': last_modified})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/docs', methods=['PUT'])
def save_document(project_id: str):
    auth_err = _require_auth(project_id, 'editor')
    if auth_err:
        return auth_err
    try:
        data = request.json
        content = data.get('content', '')
        if not isinstance(content, str):
            return jsonify({'error': '缺少文档内容'}), 400
        project_dir = os.path.join(BASE_DATA_DIR, project_id)
        os.makedirs(project_dir, exist_ok=True)
        doc_path = os.path.join(project_dir, 'docs.md')
        with open(doc_path, 'w', encoding='utf-8') as f:
            f.write(content)
        last_modified = pd.Timestamp.fromtimestamp(os.stat(doc_path).st_mtime).isoformat()
        return jsonify({'message': '文档保存成功', 'last_modified': last_modified})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/docs/download', methods=['GET'])
def download_document(project_id: str):
    try:
        project_dir = os.path.join(BASE_DATA_DIR, project_id)
        doc_path = os.path.join(project_dir, 'docs.md')
        if not os.path.isfile(doc_path):
            os.makedirs(project_dir, exist_ok=True)
            with open(doc_path, 'w', encoding='utf-8') as f:
                f.write('')
        return send_file(doc_path, as_attachment=True,
                         download_name=f'{project_id}_docs.md',
                         mimetype='text/markdown')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<project_id>/docs/upload', methods=['POST'])
def upload_document(project_id: str):
    auth_err = _require_auth(project_id, 'editor')
    if auth_err:
        return auth_err
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        if not file.filename.endswith(('.md', '.txt')):
            return jsonify({'error': '只支持 Markdown (.md) 文件'}), 400
        project_dir = os.path.join(BASE_DATA_DIR, project_id)
        os.makedirs(project_dir, exist_ok=True)
        doc_path = os.path.join(project_dir, 'docs.md')
        file.save(doc_path)
        return jsonify({'message': '文档上传成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── doc headings ───────────────────────────────────────────────

@app.route('/api/projects/<project_id>/docs/headings', methods=['GET'])
def get_doc_headings(project_id: str):
    try:
        project_dir = os.path.join(BASE_DATA_DIR, project_id)
        doc_path = os.path.join(project_dir, 'docs.md')
        headings = []
        if os.path.isfile(doc_path):
            with open(doc_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    text = None
                    if line.startswith('#### '):
                        text = line[5:].strip()
                    elif line.startswith('### '):
                        text = line[4:].strip()
                    if text:
                        # Remove markdown escapes (e.g. \<w\> → <w>)
                        text = text.replace('\\<', '<').replace('\\>', '>')
                        level = 4 if line.startswith('#### ') else 3
                        headings.append({
                            'text': text,
                            'level': level,
                            'id': _heading_id(text)
                        })
        return jsonify({'headings': headings})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── startup ─────────────────────────────────────────────────────

os.makedirs(BASE_DATA_DIR, exist_ok=True)
init_db()

for pid in os.listdir(BASE_DATA_DIR):
    project_dir = os.path.join(BASE_DATA_DIR, pid)
    if not os.path.isdir(project_dir):
        continue
    if migrate_config_from_file(pid):
        print(f"Migrated config for {pid}")
    cache_path = os.path.join(project_dir, 'cache.json')
    if os.path.exists(cache_path):
        count = migrate_from_json(pid)
        if count > 0:
            print(f"Migrated {count} entries from {pid}/cache.json")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
