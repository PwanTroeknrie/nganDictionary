import json
import os
from sqlalchemy import create_engine, Column, Integer, Text, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from tqdm import tqdm

# --- 数据库配置 ---
# 请确保这个路径是正确的，并且文件存在或可被创建
DATABASE_URL = 'sqlite:///D:/Code/ExpCodes/ngandic/backend/ngandic.sqlite'
engine = create_engine(DATABASE_URL, echo=False)
Session = sessionmaker(bind=engine)
Base = declarative_base()


# --- 表结构 ---
class Entry(Base):
    __tablename__ = "entry"
    id = Column(Integer, primary_key=True)
    word = Column(Text)
    transliteration = Column(Text)
    senses = relationship("Sense", back_populates="entry")


class Sense(Base):
    __tablename__ = "senses"
    id = Column(Integer, primary_key=True)
    entry_id = Column(Integer, ForeignKey("entry.id"))
    sense_id = Column(Integer)
    pos = Column(Text)
    sound = Column(Text)  # 存储格式化后的 IPA 模板字符串
    etymology_text = Column(Text)
    sense_order = Column(Integer)

    entry = relationship("Entry", back_populates="senses")
    # 🚨 更新：使用 alternatives 替代 alternations
    alternatives = relationship("Alternative", back_populates="sense")
    definitions = relationship("Definition", back_populates="sense")
    derived = relationship("Derived", back_populates="sense")
    inflections = relationship("Inflection", back_populates="sense")
    sense_tags = relationship("SenseTag", back_populates="sense")


class Alternative(Base):
    # 🚨 更新：表名改为 alternatives
    __tablename__ = "alternatives"
    id = Column(Integer, primary_key=True)
    sense_id = Column(Integer, ForeignKey("senses.id"))
    # 🚨 更新：列名从 alternation 更改为 alternative
    alternative = Column(Text)  # 存储格式化后的 alternative 模板字符串
    # 🚨 更新：back_populates 使用 alternatives
    sense = relationship("Sense", back_populates="alternatives")


class Definition(Base):
    __tablename__ = "definitions"
    id = Column(Integer, primary_key=True)
    sense_id = Column(Integer, ForeignKey("senses.id"))
    text = Column(Text)
    sense = relationship("Sense", back_populates="definitions")
    examples = relationship("Example", back_populates="definition")


class Derived(Base):
    __tablename__ = "derived"
    id = Column(Integer, primary_key=True)
    sense_id = Column(Integer, ForeignKey("senses.id"))
    type = Column(Text)
    value = Column(Text)
    sense = relationship("Sense", back_populates="derived")


class Example(Base):
    __tablename__ = "examples"
    id = Column(Integer, primary_key=True)
    definition_id = Column(Integer, ForeignKey("definitions.id"))
    ex = Column(Text)  # 对应 Wiktionary JSON 的 'text' (原文)
    ft = Column(Text)  # 对应 Wiktionary JSON 的 'translation'
    src = Column(Text)  # 对应 Wiktionary JSON 的 'ref'
    gla = Column(Text)  # 对应 Wiktionary JSON 的 'roman'
    glb = Column(Text)
    glc = Column(Text)
    definition = relationship("Definition", back_populates="examples")


class Inflection(Base):
    __tablename__ = "inflection"
    id = Column(Integer, primary_key=True)
    sense_id = Column(Integer, ForeignKey("senses.id"))
    template = Column(Text)  # 存储格式化后的 inflection 模板字符串
    sense = relationship("Sense", back_populates="inflections")


class SenseTag(Base):
    __tablename__ = "sense_tags"
    id = Column(Integer, primary_key=True)
    sense_id = Column(Integer, ForeignKey("senses.id"))
    tag = Column(Text)
    sense = relationship("Sense", back_populates="sense_tags")


# 创建表
# 注意：如果表名改变（如 alternations -> alternatives），可能需要先删除旧的数据库文件或手动删除旧表
Base.metadata.create_all(engine)


# --- 辅助函数：格式化模板 ---
def format_template(name, args):
    """将模板名称和参数字典格式化为 {{name|arg1|arg2|...}} 字符串"""
    if not name:
        return ""

    args_list = []

    # 提取数字索引参数 (1, 2, 3...)
    i = 1
    while str(i) in args:
        args_list.append(str(args[str(i)]))
        i += 1

    # 提取其他命名参数 (如 'dial', 'form' 等)
    for key, value in args.items():
        # 排除常见非参数键，以及已经被数字索引捕获的键
        if not key.isdigit() and key not in ['name', 'pos', 'lang']:
            args_list.append(f"{key}={value}")

    return f"{{{{{name}|{'|'.join(args_list)}}}}}"


# --- 通用插入函数 (修订版，接受 session 参数) ---
def insert_recursive(obj, session):
    if not isinstance(obj, dict) or not obj.get("word"):
        return None

    # 1. 创建 Entry
    entry_data = {
        "word": obj.get("word"),
        "transliteration": None
    }
    entry = Entry(**entry_data)

    session.add(entry)
    session.flush()  # 保持 flush 以确保 entry.id 可用

    # 提取顶层信息，以供所有 Sense 使用
    top_pos = obj.get("pos")
    top_etymology_text = obj.get("etymology_text")

    # 2. 格式化 Sound 字段: "{{grc|IPA}}"
    formatted_sounds = []
    if "sounds" in obj and isinstance(obj["sounds"], list):
        for sound_item in obj["sounds"]:
            if "ipa" in sound_item:
                # 使用 obj.get("lang_code", "grc") 替代硬编码 "grc" 更灵活
                formatted_sounds.append(f"{{{{{obj.get('lang_code', 'grc')}|{sound_item['ipa']}}}}}")
    sound_text = " ".join(formatted_sounds)

    # 3. 遍历并创建 Senses
    senses_list = []
    if "senses" in obj and isinstance(obj["senses"], list):
        for idx, s in enumerate(obj["senses"]):
            sense_data = {
                "entry_id": entry.id,
                "sense_id": s.get("id", idx + 1),
                "pos": s.get("pos", top_pos),
                "sound": sound_text,
                "etymology_text": top_etymology_text,
                "sense_order": idx + 1
            }

            sense = Sense(**sense_data)
            session.add(sense)
            session.flush()
            senses_list.append(sense)

            # 3.1 处理 Definitions (来自 glosses 字段)
            if "glosses" in s and isinstance(s["glosses"], list):
                for gloss_text in s["glosses"]:
                    definition = Definition(sense_id=sense.id, text=gloss_text)
                    session.add(definition)
                    session.flush()

                    # 3.1.1 处理 Examples (关联到 Definition)
                    if "examples" in s and isinstance(s["examples"], list):
                        for ex in s["examples"]:
                            # 🚨 按照您的要求映射字段
                            ex_data = {
                                "ex": ex.get("text"),  # Wiktionary 'text' (原文) -> ex
                                "ft": ex.get("translation"),  # Wiktionary 'translation' -> ft
                                "src": ex.get("ref"),  # Wiktionary 'ref' -> src
                                "gla": ex.get("roman"),  # Wiktionary 'roman' -> gla
                                "glb": ex.get("glb"),
                                "glc": ex.get("glc"),
                            }

                            if ex_data.get("ex") or ex_data.get("ft"):
                                session.add(Example(definition_id=definition.id, **ex_data))

            # 3.2 处理 SenseTag (来自 tags 字段)
            if "tags" in s and isinstance(s["tags"], list):
                for tag in s["tags"]:
                    session.add(SenseTag(sense_id=sense.id, tag=tag))

    # 4. 处理 Inflection (来自 inflection_templates, 关联到第一个 Sense)
    first_sense = senses_list[0] if senses_list else None
    if first_sense and "inflection_templates" in obj and isinstance(obj["inflection_templates"], list):
        for template in obj["inflection_templates"]:
            name = template.get("name")
            args = template.get("args", {})
            formatted_template = format_template(name, args)
            if formatted_template:
                session.add(Inflection(sense_id=first_sense.id, template=formatted_template))

    # 5. 处理 Alternative (来自 forms 中 tags 包含 "alternative" 的条目, 关联到第一个 Sense)
    if first_sense and "forms" in obj and isinstance(obj["forms"], list):
        for form_item in obj["forms"]:
            if "tags" in form_item and "alternative" in form_item["tags"]:
                # 格式化为 {{alternative|form|tags}}
                alt_name = "alternative"
                alt_args = {"1": form_item.get("form"), "2": ", ".join(form_item.get("tags", []))}
                formatted_alternation = format_template(alt_name, alt_args)

                # 🚨 使用 Alternative 类，并使用新的列名 'alternative'
                session.add(Alternative(sense_id=first_sense.id, alternative=formatted_alternation))

    # 6. 处理顶层的 Derived 字段 (关联到第一个 Sense)
    if first_sense and "derived" in obj and isinstance(obj["derived"], list):
        for item in obj["derived"]:
            session.add(
                Derived(
                    sense_id=first_sense.id,
                    type=item.get("type"),
                    value=item.get("word")
                )
            )

    return entry


# --- 导入 JSONL 并显示进度条 ---
# 🚨 更新 JSONL 文件名
jsonl_file = "kaikki.org-dictionary-AncientGreek.jsonl"
try:
    with open(jsonl_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
except FileNotFoundError:
    print(f"错误：找不到文件 {jsonl_file}。请确保文件存在。")
    exit()

# 使用一个总的 Session 并在外部提交，提高性能
global_session = Session()
for line in tqdm(lines, desc="导入 JSONL"):
    try:
        data = json.loads(line)
        # 传递 global_session
        insert_recursive(data, global_session)
    except Exception as e:
        print(f"\n跳过一条异常记录: {e}")
        # 遇到错误时，回滚整个全局 session
        global_session.rollback()

global_session.commit()
global_session.close()
print("全部数据导入完成！")