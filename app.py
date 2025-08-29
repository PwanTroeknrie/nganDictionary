from flask import Flask, render_template, request, jsonify
import pandas as pd
import json
import os

app = Flask(__name__, static_folder='static')

# 文件路径
DICTIONARY_FILE_JSON = 'dictionary.json'
DICTIONARY_FILE_EXCEL = 'dictionary.xlsx'

# 全局变量
dictionary_data = {}


def excel_to_json():
    """
    每次启动时从 Excel 生成 JSON 文件
    """
    global dictionary_data
    try:
        if not os.path.exists(DICTIONARY_FILE_EXCEL):
            print(f"警告：找不到 {DICTIONARY_FILE_EXCEL} 文件。将创建一个空 JSON 文件。")
            dictionary_data = {}
            save_json()
            return

        df = pd.read_excel(DICTIONARY_FILE_EXCEL, sheet_name='Dictionary', index_col=0)
        parsed_data = {}
        for lemma, row in df.iterrows():
            parsed_entry = {}
            for column in df.columns:
                value = row[column]
                if isinstance(value, str):
                    parsed_entry[column] = [item.strip() for item in value.split(';')]
                else:
                    parsed_entry[column] = [str(value)] if pd.notna(value) else []
            parsed_data[lemma] = parsed_entry

        # 保存到 JSON
        with open(DICTIONARY_FILE_JSON, 'w', encoding='utf-8') as f:
            json.dump(parsed_data, f, ensure_ascii=False, indent=4)

        dictionary_data = parsed_data
        print("已从 Excel 生成 JSON 并加载到内存！")
    except Exception as e:
        print(f"从 Excel 生成 JSON 时出错: {e}")
        dictionary_data = {}


def save_json():
    """
    保存内存数据到 JSON
    """
    try:
        with open(DICTIONARY_FILE_JSON, 'w', encoding='utf-8') as f:
            json.dump(dictionary_data, f, ensure_ascii=False, indent=4)
        print("词典数据已保存到 JSON。")
    except Exception as e:
        print(f"保存 JSON 时出错: {e}")


def json_to_excel():
    """
    从 JSON 覆盖 Excel
    """
    print("\n正在从 JSON 写入 Excel...")
    try:
        with open(DICTIONARY_FILE_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)

        df_data = []
        for lemma, entry in data.items():
            row = {'Lemma': lemma}
            for key, value in entry.items():
                row[key] = '; '.join(map(str, value)) if isinstance(value, list) else str(value)
            df_data.append(row)

        all_columns = ['Lemma', 'Type', 'Meaning', 'From', 'Explanation', 'To']
        if not df_data:
            df = pd.DataFrame(columns=all_columns).set_index('Lemma')
        else:
            df = pd.DataFrame(df_data).set_index('Lemma')

        df.to_excel(DICTIONARY_FILE_EXCEL, sheet_name='Dictionary', index=True)
        print(f"词典数据已写入 {DICTIONARY_FILE_EXCEL}！")
    except Exception as e:
        print(f"写入 Excel 时出错: {e}")

@app.route('/')
@app.route('/entry/<word>')
def home(word=None):
    return render_template('index.html')

# 新增的路由，用于处理对 /templates/docs.html 的请求
@app.route('/templates/docs.html')
def docs():
    """
    专门渲染 docs.html 的路由。
    Flask 会在 templates 文件夹中寻找这个文件。
    """
    return render_template('docs.html')

# 正常的 API 路由
@app.route('/get_data')
def get_data():
    initial_entry = next(iter(dictionary_data), None)
    return jsonify({
        'data': dictionary_data,
        'initialEntry': initial_entry
    })

@app.route('/save_entry', methods=['POST'])
def save_entry():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400

        lemma = data.get('lemma')
        entry = data.get('entry')

        if not lemma or not entry:
            return jsonify({'success': False, 'message': 'Invalid data'}), 400

        dictionary_data[lemma] = entry
        save_json()
        return jsonify({'success': True, 'message': 'Entry saved successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/delete_entry', methods=['POST'])
def delete_entry():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400

        lemma = data.get('lemma')
        if not lemma:
            return jsonify({'success': False, 'message': 'Lemma is required.'}), 400

        if lemma in dictionary_data:
            del dictionary_data[lemma]
            save_json()
            return jsonify({'success': True, 'message': 'Entry deleted successfully.'})
        else:
            return jsonify({'success': False, 'message': 'Entry not found.'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/save_on_exit', methods=['POST'])
def save_on_exit():
    """
    接收来自前端的请求，将 JSON 数据保存回 Excel
    """
    try:
        json_to_excel()
        return jsonify({'success': True, 'message': 'Data saved to Excel.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':

    excel_to_json()

    # 使用 try...finally 确保在程序退出时能将数据保存到 Excel
    try:
        app.run(debug=True)
    finally:
        print("程序即将关闭...")
        json_to_excel()
