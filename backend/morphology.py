import json
import os
from copy import deepcopy
from typing import Any, Dict, List, Tuple


DEFAULT_CATEGORIES: Dict[str, Any] = {
    "version": 1,
    "schemas": [
        {
            "id": "noun-declension",
            "label": "名词变格",
            "default": True,
            "titleTemplate": "{stem} {class} {schema}",
            "tables": [
                {
                    "id": "main",
                    "label": "主表",
                    "columns": [
                        {"id": "sg", "group": "数", "label": "单数"},
                        {"id": "pl", "group": "数", "label": "复数"},
                    ],
                    "rows": [
                        {"id": "nom", "group": "格", "label": "主格"},
                        {"id": "acc", "group": "格", "label": "宾格"},
                        {"id": "gen", "group": "格", "label": "属格"},
                    ],
                }
            ],
            "columns": [
                {"id": "sg", "group": "数", "label": "单数"},
                {"id": "pl", "group": "数", "label": "复数"},
            ],
            "rows": [
                {"id": "nom", "group": "格", "label": "主格"},
                {"id": "acc", "group": "格", "label": "宾格"},
                {"id": "gen", "group": "格", "label": "属格"},
            ],
        }
    ],
}


DEFAULT_CLASSES: Dict[str, Any] = {
    "version": 1,
    "classes": [
        {
            "id": "noun-basic",
            "label": "基础名词类",
            "schema": "noun-declension",
            "default": True,
            "infer": {
                "tags": ["noun", "n", "名词"],
                "word_regex": "",
            },
            "endings": {
                "nom.sg": "",
                "nom.pl": "i",
                "acc.sg": "on",
                "acc.pl": "in",
                "gen.sg": "os",
                "gen.pl": "om",
            },
        }
    ],
}


def _normalize_schema_tables(schema: Dict[str, Any]) -> List[Dict[str, Any]]:
    tables = schema.get("tables")
    if isinstance(tables, list) and tables:
        normalized_tables: List[Dict[str, Any]] = []
        for index, table in enumerate(tables):
            if not isinstance(table, dict):
                continue
            normalized_tables.append({
                "id": table.get("id") or f"table-{index + 1}",
                "label": table.get("label") or f"子表 {index + 1}",
                "columns": table.get("columns") if isinstance(table.get("columns"), list) else [],
                "rows": table.get("rows") if isinstance(table.get("rows"), list) else [],
            })
        if normalized_tables:
            return normalized_tables

    return [{
        "id": "main",
        "label": schema.get("label", "主表"),
        "columns": schema.get("columns") if isinstance(schema.get("columns"), list) else [],
        "rows": schema.get("rows") if isinstance(schema.get("rows"), list) else [],
    }]


def load_morphology_config(base_data_dir: str, project_id: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    project_dir = os.path.join(base_data_dir, project_id)
    categories = _read_json_file(
        os.path.join(project_dir, "morphology_categories.json"),
        DEFAULT_CATEGORIES,
    )
    classes = _read_json_file(
        os.path.join(project_dir, "morphology_classes.json"),
        DEFAULT_CLASSES,
    )
    return categories, classes


def save_morphology_config(
    base_data_dir: str,
    project_id: str,
    categories: Dict[str, Any],
    classes: Dict[str, Any],
) -> None:
    project_dir = os.path.join(base_data_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    _write_json_file(os.path.join(project_dir, "morphology_categories.json"), categories)
    _write_json_file(os.path.join(project_dir, "morphology_classes.json"), classes)


def list_generators(base_data_dir: str, project_id: str) -> List[Dict[str, Any]]:
    categories, classes = load_morphology_config(base_data_dir, project_id)
    schemas = {
        schema.get("id"): schema
        for schema in categories.get("schemas", [])
        if isinstance(schema, dict) and schema.get("id")
    }

    generators: List[Dict[str, Any]] = []
    for class_config in classes.get("classes", []):
        if not isinstance(class_config, dict):
            continue
        schema = schemas.get(class_config.get("schema"))
        if not schema:
            continue
        infer = class_config.get("infer") if isinstance(class_config.get("infer"), dict) else {}
        tables = _normalize_schema_tables(schema)
        first_table = tables[0] if tables else {"columns": [], "rows": []}
        generators.append({
            "id": class_config.get("id", ""),
            "label": class_config.get("label", class_config.get("id", "")),
            "description": class_config.get("description", ""),
            "default": bool(class_config.get("default")),
            "schema_default": bool(schema.get("default")),
            "infer_tags": infer.get("tags", []),
            "infer_word_regex": infer.get("word_regex", ""),
            "schema": {
                "id": schema.get("id", ""),
                "label": schema.get("label", ""),
                "titleTemplate": schema.get("titleTemplate", "{stem} {class} {schema}"),
                "tables": tables,
                "columns": first_table.get("columns", []),
                "rows": first_table.get("rows", []),
            },
            "endings": class_config.get("endings", {}),
            "fields": [
                {"name": "stem", "type": "text", "label": "词干", "default": ""},
            ],
        })

    return generators


def _read_json_file(path: str, default_value: Dict[str, Any]) -> Dict[str, Any]:
    if not os.path.exists(path):
        return deepcopy(default_value)
    try:
        with open(path, "r", encoding="utf-8") as f:
            value = json.load(f)
    except (OSError, json.JSONDecodeError):
        return deepcopy(default_value)
    return value if isinstance(value, dict) else deepcopy(default_value)


def _write_json_file(path: str, value: Dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write("\n")
