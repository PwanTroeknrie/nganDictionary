import sqlite3
import json
import os
import shutil
from typing import Dict, List, Optional

DB_PATH = os.environ.get('DB_PATH',
    os.path.join(os.path.dirname(__file__), 'ngandic.sqlite'))


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


_DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), 'ngandic.sqlite')
_DEFAULT_DATA_DIR = os.path.join(os.path.dirname(__file__), 'user_data')


def init_db():
    """Create tables and add missing columns/indexes (idempotent).
    On first run in Docker (env DB_PATH differs from default), copies
    the seed database and user_data to the volume-backed location.
    """
    # First-run migration: copy seed data to volume-backed path
    if DB_PATH != _DEFAULT_DB_PATH and not os.path.exists(DB_PATH):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        if os.path.exists(_DEFAULT_DB_PATH):
            shutil.copy2(_DEFAULT_DB_PATH, DB_PATH)
    base_data_dir = os.environ.get('BASE_DATA_DIR', '')
    if base_data_dir and base_data_dir != _DEFAULT_DATA_DIR and not os.path.exists(base_data_dir):
        if os.path.exists(_DEFAULT_DATA_DIR):
            shutil.copytree(_DEFAULT_DATA_DIR, base_data_dir)
        else:
            os.makedirs(base_data_dir, exist_ok=True)

    conn = get_db()
    conn.execute("""CREATE TABLE IF NOT EXISTS project (
        id INTEGER PRIMARY KEY, lang TEXT UNIQUE, owner TEXT, created_at TEXT,
        password_hash TEXT, access_type TEXT, allowed_users TEXT, config TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS entry (
        id INTEGER PRIMARY KEY, word TEXT, transliteration TEXT,
        project_id TEXT, slug TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS senses (
        id INTEGER PRIMARY KEY, entry_id INTEGER, sense_id INTEGER,
        pos TEXT, sound TEXT, etymology_text TEXT, chart_type TEXT DEFAULT '',
        sense_order INTEGER)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS sense_tags (
        id INTEGER PRIMARY KEY, sense_id INTEGER, tag TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS derived (
        id INTEGER PRIMARY KEY, sense_id INTEGER, type TEXT, value TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS definitions (
        id INTEGER PRIMARY KEY, sense_id INTEGER, text TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS examples (
        id INTEGER PRIMARY KEY, definition_id INTEGER, ex TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS inflection (
        id INTEGER PRIMARY KEY, sense_id INTEGER, template TEXT, spec TEXT DEFAULT '')""")
    conn.execute("""CREATE TABLE IF NOT EXISTS alternatives (
        id INTEGER PRIMARY KEY, sense_id INTEGER, value TEXT)""")
    try:
        conn.execute("ALTER TABLE entry ADD COLUMN slug TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE senses ADD COLUMN chart_type TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE inflection ADD COLUMN spec TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    conn.execute("CREATE INDEX IF NOT EXISTS idx_entry_project_id ON entry(project_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_entry_slug ON entry(slug)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_senses_entry_id ON senses(entry_id)")
    conn.commit()
    conn.close()


# ── project config ──────────────────────────────────────────────

def load_project_config(project_id: str) -> Dict:
    """Load project config from DB, or return defaults."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM project WHERE lang = ?", (project_id,)
    ).fetchone()
    conn.close()

    if not row:
        return {
            'project_info': {
                'id': project_id,
                'name': project_id,
                'owner_id': 'unknown',
                'has_password': False,
                'password_hash': '',
                'created_at': ''
            },
            'access_control': {'allowed_users': []}
        }

    allowed_users = []
    if row['allowed_users']:
        try:
            allowed_users = json.loads(row['allowed_users'])
        except json.JSONDecodeError:
            pass

    config_extra = {}
    if row['config']:
        try:
            config_extra = json.loads(row['config'])
        except json.JSONDecodeError:
            pass

    return {
        'project_info': {
            'id': project_id,
            'name': config_extra.get('name', project_id),
            'owner_id': row['owner'],
            'has_password': bool(row['password_hash']),
            'password_hash': row['password_hash'] or '',
            'created_at': row['created_at'] or ''
        },
        'access_control': {'allowed_users': allowed_users},
        'editor_code': config_extra.get('editor_code', ''),
        'admin_code': row['password_hash'] or ''
    }


def save_project_config(project_id: str, config: Dict):
    """Upsert project config into DB.
    config may include 'editor_code' and 'admin_code' keys for authorization.
    """
    conn = get_db()
    info = config.get('project_info', {})
    access = config.get('access_control', {})

    owner = info.get('owner_id', 'unknown')
    created_at = info.get('created_at', '')
    password_hash = info.get('password_hash', '')
    allowed_users = json.dumps(access.get('allowed_users', []), ensure_ascii=False)

    # Store editor_code in config JSON, admin_code in password_hash
    editor_code = config.get('editor_code', '')
    admin_code = config.get('admin_code', '')
    if not password_hash and admin_code:
        password_hash = admin_code

    config_json = json.dumps({
        'name': info.get('name', project_id),
        'editor_code': editor_code
    }, ensure_ascii=False)

    existing = conn.execute(
        "SELECT id FROM project WHERE lang = ?", (project_id,)
    ).fetchone()

    if existing:
        conn.execute(
            """UPDATE project
               SET owner = ?, password_hash = ?, created_at = ?,
                   allowed_users = ?, config = ?
               WHERE lang = ?""",
            (owner, password_hash, created_at, allowed_users, config_json, project_id)
        )
    else:
        conn.execute(
            """INSERT INTO project (lang, owner, created_at, password_hash, access_type, allowed_users, config)
               VALUES (?, ?, ?, ?, 'private', ?, ?)""",
            (project_id, owner, created_at, password_hash, allowed_users, config_json)
        )

    conn.commit()
    conn.close()


def verify_project_code(project_id: str, code: str) -> str:
    """Verify an authorization code. Returns 'admin', 'editor', or '' (guest)."""
    if not code:
        return ''
    config = load_project_config(project_id)
    if code == config.get('admin_code', ''):
        return 'admin'
    if code == config.get('editor_code', '') and code:
        return 'editor'
    return ''


def delete_project(project_id: str) -> bool:
    """Delete a project and all its entries. Returns True if successful."""
    conn = get_db()
    try:
        # Cascade delete all entries for this project
        entry_rows = conn.execute(
            "SELECT id FROM entry WHERE project_id = ?", (project_id,)
        ).fetchall()
        for er in entry_rows:
            _delete_entry_children(conn, er['id'])
        conn.execute("DELETE FROM entry WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM project WHERE lang = ?", (project_id,))
        conn.commit()
        ok = conn.total_changes > 0
        conn.close()
        return ok
    except Exception:
        conn.rollback()
        conn.close()
        raise


def get_all_projects() -> List[Dict]:
    """List all projects with entry counts."""
    conn = get_db()
    rows = conn.execute(
        """SELECT p.*, (SELECT COUNT(*) FROM entry e WHERE e.project_id = p.lang) as entry_count
           FROM project p ORDER BY p.lang"""
    ).fetchall()
    projects = []
    for row in rows:
        config_extra = {}
        if row['config']:
            try:
                config_extra = json.loads(row['config'])
            except json.JSONDecodeError:
                pass
        projects.append({
            'id': row['lang'],
            'name': config_extra.get('name', row['lang']),
            'owner': row['owner'],
            'created_at': row['created_at'] or '',
            'has_admin_code': bool(row['password_hash']),
            'has_editor_code': bool(config_extra.get('editor_code', '')),
            'entry_count': row['entry_count']
        })
    conn.close()
    return projects


# ── entry CRUD ──────────────────────────────────────────────────

def get_entries(project_id: str) -> List[Dict]:
    """Fetch all entries for a project with bulk JOINs (7 queries total, not 2000+)."""
    conn = get_db()

    # 1. All entries
    entry_rows = conn.execute(
        "SELECT * FROM entry WHERE project_id = ? ORDER BY id", (project_id,)
    ).fetchall()
    if not entry_rows:
        conn.close()
        return []

    entry_ids = [r['id'] for r in entry_rows]
    placeholders = ','.join('?' * len(entry_ids))

    # 2. All senses for these entries
    sense_rows = conn.execute(
        f"SELECT * FROM senses WHERE entry_id IN ({placeholders}) ORDER BY entry_id, sense_order, sense_id",
        entry_ids
    ).fetchall()

    if not sense_rows:
        conn.close()
        return [_make_entry(r, []) for r in entry_rows]

    sense_db_ids = [r['id'] for r in sense_rows]
    s_placeholders = ','.join('?' * len(sense_db_ids))

    # 3-5. All child data in bulk queries
    tags_rows = conn.execute(
        f"SELECT * FROM sense_tags WHERE sense_id IN ({s_placeholders})", sense_db_ids
    ).fetchall()

    derived_rows = conn.execute(
        f"SELECT * FROM derived WHERE sense_id IN ({s_placeholders})", sense_db_ids
    ).fetchall()

    inf_rows = conn.execute(
        f"SELECT * FROM inflection WHERE sense_id IN ({s_placeholders})", sense_db_ids
    ).fetchall()

    def_rows = conn.execute(
        f"SELECT * FROM definitions WHERE sense_id IN ({s_placeholders})", sense_db_ids
    ).fetchall()

    def_ids = [r['id'] for r in def_rows]
    ex_rows = []
    if def_ids:
        d_placeholders = ','.join('?' * len(def_ids))
        ex_rows = conn.execute(
            f"SELECT * FROM examples WHERE definition_id IN ({d_placeholders})", def_ids
        ).fetchall()

    conn.close()

    # Index child data by parent ID
    tags_by_sense = _group_by(tags_rows, 'sense_id')
    derived_by_sense = _group_by(derived_rows, 'sense_id')
    inf_by_sense = {r['sense_id']: r for r in inf_rows}
    defs_by_sense = _group_by(def_rows, 'sense_id')
    ex_by_def = _group_by(ex_rows, 'definition_id')
    senses_by_entry = _group_by(sense_rows, 'entry_id')

    entries = []
    for er in entry_rows:
        senses = []
        for sr in senses_by_entry.get(er['id'], []):
            senses.append(_build_sense(sr, tags_by_sense, derived_by_sense,
                                       inf_by_sense, defs_by_sense, ex_by_def))
        entries.append(_make_entry(er, senses))
    return entries


def get_entry_by_slug(project_id: str, slug: str) -> Optional[Dict]:
    """Fetch a single entry by slug (uses bulk loading, still fast)."""
    # For simplicity, load all entries and filter. The bulk approach is fast enough.
    entries = get_entries(project_id)
    for e in entries:
        if e['slug'] == slug:
            return e
    return None


def create_entry(project_id: str, data: Dict) -> Dict:
    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO entry (word, transliteration, project_id, slug) VALUES (?, ?, ?, ?)",
            (data.get('word', ''), data.get('transliteration', ''), project_id, data.get('slug', ''))
        )
        entry_id = cursor.lastrowid
        for i, s in enumerate(data.get('senses', [])):
            _insert_sense(conn, entry_id, s, sense_order=i + 1)

        conn.commit()
        row = conn.execute("SELECT * FROM entry WHERE id = ?", (entry_id,)).fetchone()
        result = _assemble_entry(conn, row)
        conn.close()
        return result
    except Exception:
        conn.rollback()
        conn.close()
        raise


def update_entry(project_id: str, slug: str, data: Dict) -> Optional[Dict]:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM entry WHERE project_id = ? AND slug = ?",
            (project_id, slug)
        ).fetchone()
        if not row:
            conn.close()
            return None

        entry_id = row['id']
        new_word = data.get('word', '')
        new_slug = data.get('slug', '')
        conn.execute(
            "UPDATE entry SET word = ?, transliteration = ?, slug = ? WHERE id = ?",
            (new_word, data.get('transliteration', ''), new_slug, entry_id)
        )

        _delete_entry_children(conn, entry_id)
        for i, s in enumerate(data.get('senses', [])):
            _insert_sense(conn, entry_id, s, sense_order=i + 1)

        conn.commit()
        row = conn.execute("SELECT * FROM entry WHERE id = ?", (entry_id,)).fetchone()
        result = _assemble_entry(conn, row)
        conn.close()
        return result
    except Exception:
        conn.rollback()
        conn.close()
        raise


def delete_entry(project_id: str, slug: str) -> bool:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id FROM entry WHERE project_id = ? AND slug = ?",
            (project_id, slug)
        ).fetchone()
        if not row:
            conn.close()
            return False

        _delete_entry_children(conn, row['id'])
        conn.execute("DELETE FROM entry WHERE id = ?", (row['id'],))
        conn.commit()
        conn.close()
        return True
    except Exception:
        conn.rollback()
        conn.close()
        raise


def word_exists(project_id: str, word: str, exclude_slug: Optional[str] = None) -> bool:
    """Check if a word already exists in the project."""
    conn = get_db()
    if exclude_slug:
        row = conn.execute(
            "SELECT 1 FROM entry WHERE project_id = ? AND word = ? AND slug != ?",
            (project_id, word, exclude_slug)
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT 1 FROM entry WHERE project_id = ? AND word = ?",
            (project_id, word)
        ).fetchone()
    conn.close()
    return row is not None


# ── internal helpers ────────────────────────────────────────────

def _group_by(rows, key):
    """Group a list of sqlite3.Row objects by a column key."""
    result = {}
    for r in rows:
        k = r[key]
        result.setdefault(k, []).append(r)
    return result


def _make_entry(entry_row, senses):
    return {
        'id': entry_row['id'],
        'word': entry_row['word'] or '',
        'transliteration': entry_row['transliteration'] or '',
        'slug': entry_row['slug'] or '',
        'senses': senses
    }


def _build_sense(sr, tags_by_sense, derived_by_sense, inf_by_sense, defs_by_sense, ex_by_def):
    sid = sr['id']

    tags = [r['tag'] for r in tags_by_sense.get(sid, [])]

    derived = derived_by_sense.get(sid, [])
    derived_from = [r['value'] for r in derived if r['type'] == 'from']
    derived_to = [r['value'] for r in derived if r['type'] == 'to']

    morphology = {}
    inf = inf_by_sense.get(sid)
    if inf and 'spec' in inf.keys() and inf['spec']:
        try:
            morphology = json.loads(inf['spec'])
        except json.JSONDecodeError:
            pass

    definitions = []
    for dr in defs_by_sense.get(sid, []):
        exs = [e['ex'] or '' for e in ex_by_def.get(dr['id'], [])]
        definitions.append({'text': dr['text'] or '', 'examples': exs})

    return {
        'sense_id': sr['sense_id'],
        'displayed_tag': sr['pos'] or '',
        'ipa': sr['sound'] or '',
        'description': sr['etymology_text'] or '',
        'tags': tags,
        'derived_from': derived_from,
        'derived_to': derived_to,
        'definitions': definitions,
        'chart_type': sr['chart_type'] or '',
        'morphology': morphology
    }


# legacy alias for backward compatibility
def _assemble_entry(conn, entry_row):
    """Used by create_entry/update_entry for single-entry assembly after insert."""
    sid = entry_row['id']
    sense_rows = conn.execute(
        "SELECT * FROM senses WHERE entry_id = ? ORDER BY sense_order, sense_id", (sid,)
    ).fetchall()
    senses = []
    for sr in sense_rows:
        senses.append(_assemble_sense(conn, sr))
    return _make_entry(entry_row, senses)


def _assemble_sense(conn, sense_row):
    sid = sense_row['id']
    tags = [r['tag'] for r in conn.execute("SELECT tag FROM sense_tags WHERE sense_id = ?", (sid,)).fetchall()]
    derived = conn.execute("SELECT type, value FROM derived WHERE sense_id = ?", (sid,)).fetchall()
    derived_from = [r['value'] for r in derived if r['type'] == 'from']
    derived_to = [r['value'] for r in derived if r['type'] == 'to']
    morphology = {}
    inf = conn.execute("SELECT * FROM inflection WHERE sense_id = ?", (sid,)).fetchone()
    if inf and 'spec' in inf.keys() and inf['spec']:
        try:
            morphology = json.loads(inf['spec'])
        except json.JSONDecodeError:
            pass
    definitions = []
    for dr in conn.execute("SELECT * FROM definitions WHERE sense_id = ?", (sid,)).fetchall():
        exs = [e['ex'] or '' for e in conn.execute("SELECT ex FROM examples WHERE definition_id = ?", (dr['id'],)).fetchall()]
        definitions.append({'text': dr['text'] or '', 'examples': exs})
    return {
        'sense_id': sense_row['sense_id'],
        'displayed_tag': sense_row['pos'] or '',
        'ipa': sense_row['sound'] or '',
        'description': sense_row['etymology_text'] or '',
        'tags': tags, 'derived_from': derived_from, 'derived_to': derived_to,
        'definitions': definitions, 'chart_type': sense_row['chart_type'] or '',
        'morphology': morphology
    }


def _insert_sense(conn: sqlite3.Connection, entry_id: int, data: Dict, sense_order: int):
    cur = conn.execute(
        """INSERT INTO senses (entry_id, sense_id, pos, sound, etymology_text, chart_type, sense_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            entry_id,
            data.get('sense_id', 1),
            data.get('displayed_tag', ''),
            data.get('ipa', ''),
            data.get('description', ''),
            data.get('chart_type', ''),
            sense_order
        )
    )
    sid = cur.lastrowid

    # tags
    for tag in data.get('tags', []):
        conn.execute("INSERT INTO sense_tags (sense_id, tag) VALUES (?, ?)", (sid, tag))

    # derived_from
    for v in data.get('derived_from', []):
        conn.execute("INSERT INTO derived (sense_id, type, value) VALUES (?, 'from', ?)", (sid, v))

    # derived_to
    for v in data.get('derived_to', []):
        conn.execute("INSERT INTO derived (sense_id, type, value) VALUES (?, 'to', ?)", (sid, v))

    # morphology spec -> inflection
    morphology = data.get('morphology', {})
    if morphology:
        conn.execute(
            "INSERT INTO inflection (sense_id, template, spec) VALUES (?, ?, ?)",
            (
                sid,
                '',
                json.dumps(morphology, ensure_ascii=False) if morphology else ''
            )
        )

    # definitions + examples
    for d in data.get('definitions', []):
        cur2 = conn.execute(
            "INSERT INTO definitions (sense_id, text) VALUES (?, ?)",
            (sid, d.get('text', ''))
        )
        did = cur2.lastrowid
        for ex in d.get('examples', []):
            conn.execute("INSERT INTO examples (definition_id, ex) VALUES (?, ?)", (did, ex))


def _delete_entry_children(conn: sqlite3.Connection, entry_id: int):
    """Cascade-delete all child rows for an entry."""
    sense_rows = conn.execute(
        "SELECT id FROM senses WHERE entry_id = ?", (entry_id,)
    ).fetchall()
    for sr in sense_rows:
        sid = sr['id']
        # delete examples via definitions
        def_rows = conn.execute(
            "SELECT id FROM definitions WHERE sense_id = ?", (sid,)
        ).fetchall()
        for dr in def_rows:
            conn.execute("DELETE FROM examples WHERE definition_id = ?", (dr['id'],))
        conn.execute("DELETE FROM definitions WHERE sense_id = ?", (sid,))
        conn.execute("DELETE FROM sense_tags WHERE sense_id = ?", (sid,))
        conn.execute("DELETE FROM derived WHERE sense_id = ?", (sid,))
        conn.execute("DELETE FROM inflection WHERE sense_id = ?", (sid,))
        conn.execute("DELETE FROM alternatives WHERE sense_id = ?", (sid,))
    conn.execute("DELETE FROM senses WHERE entry_id = ?", (entry_id,))


# ── config file migration ─────────────────────────────────────

def migrate_config_from_file(project_id: str) -> bool:
    """Import config.yaml or config.toml into DB. Returns True if migrated."""
    base = os.path.join(os.path.dirname(__file__), 'user_data', project_id)
    candidates = [
        os.path.join(base, 'config.yaml'),
        os.path.join(base, 'config.toml'),
    ]
    config_path = None
    for p in candidates:
        if os.path.exists(p):
            config_path = p
            break
    if not config_path:
        return False

    # Check if DB already has this project
    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM project WHERE lang = ?", (project_id,)
    ).fetchone()
    conn.close()
    if existing:
        return False  # already migrated

    # Parse config file
    config_data = {}
    if config_path.endswith('.yaml') or config_path.endswith('.yml'):
        try:
            import yaml
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = yaml.safe_load(f) or {}
        except Exception:
            pass
    elif config_path.endswith('.toml'):
        try:
            import tomllib
            with open(config_path, 'rb') as f:
                config_data = tomllib.load(f)
        except Exception:
            try:
                import tomli
                with open(config_path, 'rb') as f:
                    config_data = tomli.load(f)
            except Exception:
                pass

    name = config_data.get('name', project_id)
    password_hash = config_data.get('password', '')
    created_at = config_data.get('created', '')
    description = config_data.get('description', '')

    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO project (lang, owner, created_at, password_hash, access_type, allowed_users, config)
               VALUES (?, ?, ?, ?, 'private', '[]', ?)""",
            (project_id, 'user123', created_at or '', password_hash or '',
             json.dumps({'name': name, 'description': description}, ensure_ascii=False))
        )
        conn.commit()
        conn.close()

        # Rename config file to .bak
        bak = config_path + '.bak'
        if os.path.exists(bak):
            os.remove(bak)
        os.rename(config_path, bak)
        return True
    except Exception:
        conn.rollback()
        conn.close()
        raise


# ── data migration ──────────────────────────────────────────────

def migrate_from_json(project_id: str) -> int:
    """Import cache.json entries into SQLite. Backs up cache.json after success."""
    json_path = os.path.join(os.path.dirname(__file__), 'user_data', project_id, 'cache.json')
    if not os.path.exists(json_path):
        return 0

    with open(json_path, 'r', encoding='utf-8') as f:
        entries = json.load(f)

    conn = get_db()
    try:
        count = 0
        for entry_data in entries:
            slug = entry_data.get('slug', '')
            if slug:
                existing = conn.execute(
                    "SELECT 1 FROM entry WHERE project_id = ? AND slug = ?",
                    (project_id, slug)
                ).fetchone()
                if existing:
                    continue

            cursor = conn.execute(
                "INSERT INTO entry (word, transliteration, project_id, slug) VALUES (?, ?, ?, ?)",
                (entry_data.get('word', ''), entry_data.get('transliteration', ''),
                 project_id, slug)
            )
            entry_id = cursor.lastrowid
            for i, s in enumerate(entry_data.get('senses', [])):
                _insert_sense(conn, entry_id, s, sense_order=i + 1)
            count += 1

        conn.commit()

        # backup cache.json after successful migration
        bak_path = json_path + '.bak'
        if os.path.exists(bak_path):
            os.remove(bak_path)
        os.rename(json_path, bak_path)

        conn.close()
        return count
    except Exception:
        conn.rollback()
        conn.close()
        raise
