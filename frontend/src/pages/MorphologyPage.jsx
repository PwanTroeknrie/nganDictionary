import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { getAuthHeaders, getStoredAuthLevel, projectStore } from '../store/projectStore.js';
import {
  ArrowLeft,
  FileText,
  Home,
  Moon,
  PanelLeftIcon,
  PanelRightIcon,
  SaveIcon,
  StatsIcon,
  Sun,
  TableIcon,
} from '../components/Icons.jsx';

const API_BASE_URL = '/api/projects';

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm [color-scheme:light] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]';
const labelClass = 'mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400';
const panelClass = 'h-full overflow-y-auto border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';
const cardClass = 'rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';
const subCardClass = 'rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60';

const makeId = (value, fallback = 'item') => {
  const text = String(value || '').trim().toLowerCase();
  const id = text.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return id || fallback;
};

const makeRows = (count) => Array.from({ length: count }, (_, index) => ({
  id: `r${index + 1}`,
  group: '',
  label: `数据行 ${index + 1}`,
}));

const makeColumns = (count) => Array.from({ length: count }, (_, index) => ({
  id: `c${index + 1}`,
  group: '',
  label: `标题列 ${index + 1}`,
}));

const makeTable = (index = 1, rowCount = 3, columnCount = 2) => ({
  id: `table-${index}`,
  label: `子表 ${index}`,
  rows: makeRows(rowCount),
  columns: makeColumns(columnCount),
});

const normalizeTables = (schema) => {
  if (!schema) return [];
  if (Array.isArray(schema.tables) && schema.tables.length > 0) {
    return schema.tables.map((table, index) => ({
      id: table.id || `table-${index + 1}`,
      label: table.label || `子表 ${index + 1}`,
      rows: Array.isArray(table.rows) && table.rows.length ? table.rows : makeRows(1),
      columns: Array.isArray(table.columns) && table.columns.length ? table.columns : makeColumns(1),
    }));
  }
  return [{
    id: 'main',
    label: schema.label || '主表',
    rows: Array.isArray(schema.rows) && schema.rows.length ? schema.rows : makeRows(1),
    columns: Array.isArray(schema.columns) && schema.columns.length ? schema.columns : makeColumns(1),
  }];
};

const normalizeConfig = (data) => ({
  categories: data?.categories?.schemas ? data.categories : { version: 1, schemas: [] },
  classes: data?.classes?.classes ? data.classes : { version: 1, classes: [] },
});

const makeEmptySchema = (index = 1) => {
  const table = makeTable(1);
  return {
    id: `schema-${index}`,
    label: `表格结构 ${index}`,
    default: index === 1,
    titleTemplate: '{stem} {class} {schema}',
    tables: [table],
    rows: table.rows,
    columns: table.columns,
  };
};

const makeEmptyClass = (schemaId, index = 1) => ({
  id: `${schemaId}-class-${index}`,
  label: `类型 ${index}`,
  schema: schemaId,
  default: false,
  infer: { tags: [], word_regex: '' },
  endings: {},
});

const tableCellKey = (tables, table, row, column) => {
  const scoped = `${table.id}.${row.id}.${column.id}`;
  return tables.length > 1 || table.id !== 'main' ? scoped : `${row.id}.${column.id}`;
};

const groupRuns = (items) => {
  const runs = [];
  items.forEach((item) => {
    const group = item.group || '';
    const last = runs[runs.length - 1];
    if (last && last.group === group) {
      last.count += 1;
    } else {
      runs.push({ group, count: 1 });
    }
  });
  return runs;
};

const rowGroupRuns = (rows) => {
  const runs = new Map();
  rows.forEach((row, index) => {
    const group = row.group || '';
    if (!runs.has(group)) runs.set(group, { firstIndex: index, count: 0 });
    runs.get(group).count += 1;
  });
  return runs;
};

const hasVisibleGroupLevel = (items) => (
  items.some(item => String(item?.group || '').trim())
);

const isEmptyHeaderItem = (item) => (
  !String(item?.group || '').trim() && !String(item?.label || '').trim()
);

const tableShellClass = 'overflow-x-auto rounded-t-2xl border-b border-slate-300 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:border-[#2f4054] dark:bg-[#1d2a3a]';
const tableCaptionClass = 'font-word rounded-t-2xl bg-[#4d9df5] p-2 text-center text-base font-bold text-white';
const tableHeadClass = 'border border-slate-300 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 dark:border-[#2f4054] dark:bg-[#1d2a3a] dark:text-[#66b6ff]';
const tableMergedHeadClass = 'border border-slate-300 bg-blue-50 px-3 py-2 text-center align-middle text-sm font-semibold text-blue-700 dark:border-[#2f4054] dark:bg-[#1d2a3a] dark:text-[#66b6ff]';
const tableRowHeadClass = 'border border-slate-300 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 dark:border-[#2f4054] dark:bg-[#1d2a3a] dark:text-[#66b6ff]';
const tableCellClass = 'font-word border border-slate-300 bg-white px-3 py-2 text-center text-sm whitespace-nowrap text-slate-900 dark:border-[#2f4054] dark:bg-[#1d2a3a] dark:text-white';

const renderTemplate = (template, values) => (
  String(template || '').replace(/\{([^}]+)\}/g, (_, key) => String(values[key] ?? ''))
);

const renderStaticTable = (schema, classItem, stem = 'stem') => {
  const tables = normalizeTables(schema);
  const endings = classItem?.endings || {};

  if (!schema || !classItem) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">选择或创建一个 class 后即可预览表格。</p>;
  }

  return (
    <div className="space-y-4">
      {tables.map((table) => {
        const hasColumnGroups = hasVisibleGroupLevel(table.columns);
        const hasRowGroups = hasVisibleGroupLevel(table.rows);
        const hasColumnLabels = table.columns.some(column => String(column?.label || '').trim());
        const rowHeaderCount = hasRowGroups ? 2 : 1;
        const rowRuns = rowGroupRuns(table.rows);
        const caption = renderTemplate(schema.titleTemplate || '{stem} {class} {schema}', {
          stem,
          class: classItem.label || '',
          class_id: classItem.id || '',
          schema: schema.label || '',
          schema_id: schema.id || '',
          table: table.label || '',
          table_id: table.id || '',
        }).trim() || table.label || '形态表';
        return (
        <div key={table.id} className={tableShellClass}>
          <table className="w-full min-w-[560px] table-fixed border-collapse [&_tr>*:first-child]:border-l-0 [&_tr>*:last-child]:border-r-0">
            <caption className={tableCaptionClass}>
              {caption}
            </caption>
            <thead>
              {hasColumnGroups && (
                <tr>
                  <th className={tableMergedHeadClass} colSpan={rowHeaderCount}>
                    {'\u00A0'}
                  </th>
                  {groupRuns(table.columns).map((run, index) => (
                    <th key={`${run.group}-${index}`} className={tableMergedHeadClass} colSpan={run.count}>
                      {run.group || '\u00A0'}
                    </th>
                  ))}
                </tr>
              )}
              {hasColumnLabels && (
                <tr>
                  {hasRowGroups ? (
                    <>
                      <th className={tableHeadClass}>{'\u00A0'}</th>
                      <th className={tableHeadClass}>{'\u00A0'}</th>
                    </>
                  ) : (
                    <th className={tableHeadClass}>{'\u00A0'}</th>
                  )}
                  {table.columns.map(column => (
                    <th key={column.id} className={tableHeadClass}>
                      {column.label || '\u00A0'}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={row.id}>
                  {hasRowGroups && rowRuns.get(row.group || '')?.firstIndex === rowIndex && (
                    <th className={`${tableRowHeadClass} align-middle`} rowSpan={rowRuns.get(row.group || '')?.count || 1}>
                      {row.group || '\u00A0'}
                    </th>
                  )}
                  <th className={tableRowHeadClass}>
                    {row.label || '\u00A0'}
                  </th>
                  {table.columns.map(column => {
                    const key = tableCellKey(tables, table, row, column);
                    const fallbackKey = `${row.id}.${column.id}`;
                    const pattern = endings[key] ?? endings[fallbackKey] ?? '';
                    const value = String(pattern).includes('{stem}') ? String(pattern).replaceAll('{stem}', stem) : `${stem}${pattern}`;
                    return (
                      <td key={column.id} className={tableCellClass}>
                        {pattern ? value : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        );
      })}
    </div>
  );
};

export default function MorphologyPage({ isDarkMode, toggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = new URLSearchParams(location.search).get('project') || 'default';
  const authLevel = getStoredAuthLevel(projectId);
  const canEdit = Boolean(authLevel);

  const [categories, setCategories] = useState({ version: 1, schemas: [] });
  const [classesConfig, setClassesConfig] = useState({ version: 1, classes: [] });
  const [selection, setSelection] = useState({ type: 'schema', id: '' });
  const [expandedSchemas, setExpandedSchemas] = useState({});
  const [activeTableId, setActiveTableId] = useState('');
  const [status, setStatus] = useState('');
  const [testWord, setTestWord] = useState('');
  const [testTags, setTestTags] = useState('名词, n');
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    projectStore.setProject(projectId, authLevel);
  }, [projectId, authLevel]);

  const loadConfig = useCallback(async () => {
    setStatus('正在加载形态表元数据...');
    try {
      const response = await fetch(`${API_BASE_URL}/${projectId}/morphology/config`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加载形态表元数据失败');
      const normalized = normalizeConfig(data);
      const firstSchema = normalized.categories.schemas?.[0];
      setCategories(normalized.categories);
      setClassesConfig(normalized.classes);
      setSelection(firstSchema ? { type: 'schema', id: firstSchema.id } : { type: 'schema', id: '' });
      setActiveTableId(normalizeTables(firstSchema)[0]?.id || '');
      setExpandedSchemas(Object.fromEntries((normalized.categories.schemas || []).map(schema => [schema.id, true])));
      setStatus('');
    } catch (error) {
      setStatus(error.message);
    }
  }, [projectId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const schemas = categories.schemas || [];
  const classes = classesConfig.classes || [];
  const selectedClass = selection.type === 'class' ? classes.find(item => item.id === selection.id) : null;
  const selectedSchema = selection.type === 'schema'
    ? schemas.find(schema => schema.id === selection.id)
    : schemas.find(schema => schema.id === selectedClass?.schema);
  const selectedTables = normalizeTables(selectedSchema);
  const activeTable = selectedTables.find(table => table.id === activeTableId) || selectedTables[0];

  useEffect(() => {
    if (selectedTables.length && !selectedTables.some(table => table.id === activeTableId)) {
      setActiveTableId(selectedTables[0].id);
    }
  }, [activeTableId, selectedTables]);

  const classesBySchema = useMemo(() => {
    const grouped = {};
    for (const schema of schemas) grouped[schema.id] = [];
    for (const item of classes) {
      if (!grouped[item.schema]) grouped[item.schema] = [];
      grouped[item.schema].push(item);
    }
    return grouped;
  }, [classes, schemas]);

  const previewClass = selectedClass || classesBySchema[selectedSchema?.id]?.[0] || null;
  const previewSchema = schemas.find(schema => schema.id === previewClass?.schema) || selectedSchema;

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const schemaResults = schemas
      .filter(schema => `${schema.label || ''} ${schema.id || ''}`.toLowerCase().includes(query))
      .map(schema => ({ type: 'schema', id: schema.id, label: schema.label || '未命名 schema', subtitle: 'Schema' }));
    const classResults = classes
      .filter(item => `${item.label || ''} ${item.id || ''}`.toLowerCase().includes(query))
      .map(item => ({
        type: 'class',
        id: item.id,
        label: item.label || '未命名 class',
        subtitle: schemas.find(schema => schema.id === item.schema)?.label || '未命名 schema',
        schemaId: item.schema,
      }));
    return [...schemaResults, ...classResults].slice(0, 8);
  }, [classes, schemas, searchQuery]);

  const inferClassForTest = useMemo(() => {
    const tags = testTags.split(',').map(tag => tag.trim()).filter(Boolean);
    const scopedClasses = selectedSchema ? classes.filter(item => item.schema === selectedSchema.id) : classes;

    return scopedClasses.find(item => {
      const inferTags = item.infer?.tags || [];
      if (inferTags.some(tag => tags.includes(tag))) return true;
      if (item.infer?.word_regex) {
        try {
          return new RegExp(item.infer.word_regex).test(testWord);
        } catch {
          return false;
        }
      }
      return false;
    }) || scopedClasses.find(item => item.default) || scopedClasses[0] || null;
  }, [classes, selectedSchema, testTags, testWord]);

  const selectSearchResult = (result) => {
    if (result.schemaId) setExpandedSchemas(prev => ({ ...prev, [result.schemaId]: true }));
    setSelection({ type: result.type, id: result.id });
    setSearchQuery(result.label);
    setIsSearchFocused(false);
  };

  const saveConfig = async () => {
    if (!canEdit) return;
    setStatus('正在保存形态表元数据...');
    try {
      const response = await fetch(`${API_BASE_URL}/${projectId}/morphology/config`, {
        method: 'PUT',
        headers: getAuthHeaders(projectId),
        body: JSON.stringify({ categories, classes: classesConfig }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存形态表元数据失败');
      setStatus('已保存。');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const updateSchema = (schemaId, patch) => {
    if (!canEdit) return;
    setCategories(prev => ({
      ...prev,
      schemas: prev.schemas.map(schema => schema.id === schemaId ? { ...schema, ...patch } : schema),
    }));
  };

  const updateClass = (classId, patch) => {
    if (!canEdit) return;
    setClassesConfig(prev => ({
      ...prev,
      classes: prev.classes.map(item => item.id === classId ? { ...item, ...patch } : item),
    }));
  };

  const updateSchemaTables = (schemaId, tables) => {
    const first = tables[0] || makeTable(1);
    updateSchema(schemaId, { tables, rows: first.rows, columns: first.columns });
  };

  const renameSchema = (oldId, nextId) => {
    if (!canEdit || !oldId || !nextId || oldId === nextId) return;
    updateSchema(oldId, { id: nextId });
    setClassesConfig(prev => ({
      ...prev,
      classes: prev.classes.map(item => item.schema === oldId ? { ...item, schema: nextId } : item),
    }));
    setExpandedSchemas(prev => {
      const next = { ...prev, [nextId]: prev[oldId] ?? true };
      delete next[oldId];
      return next;
    });
    setSelection(current => current.type === 'schema' && current.id === oldId ? { type: 'schema', id: nextId } : current);
  };

  const renameClass = (oldId, nextId) => {
    if (!canEdit || !oldId || !nextId || oldId === nextId) return;
    updateClass(oldId, { id: nextId });
    setSelection(current => current.type === 'class' && current.id === oldId ? { type: 'class', id: nextId } : current);
  };

  const addSchema = () => {
    if (!canEdit) return;
    const schema = makeEmptySchema(schemas.length + 1);
    setCategories(prev => ({ ...prev, schemas: [...prev.schemas, schema] }));
    setExpandedSchemas(prev => ({ ...prev, [schema.id]: true }));
    setSelection({ type: 'schema', id: schema.id });
    setActiveTableId(schema.tables[0].id);
  };

  const removeSchema = (schemaId) => {
    if (!canEdit) return;
    const nextSchemas = schemas.filter(schema => schema.id !== schemaId);
    setCategories(prev => ({ ...prev, schemas: nextSchemas }));
    setClassesConfig(prev => ({ ...prev, classes: prev.classes.filter(item => item.schema !== schemaId) }));
    setSelection(nextSchemas[0] ? { type: 'schema', id: nextSchemas[0].id } : { type: 'schema', id: '' });
  };

  const addClass = (schemaId) => {
    if (!canEdit || !schemaId) return;
    const nextClass = makeEmptyClass(schemaId, (classesBySchema[schemaId]?.length || 0) + 1);
    setClassesConfig(prev => ({ ...prev, classes: [...prev.classes, nextClass] }));
    setExpandedSchemas(prev => ({ ...prev, [schemaId]: true }));
    setSelection({ type: 'class', id: nextClass.id });
  };

  const removeClass = (classId) => {
    if (!canEdit) return;
    const removed = classes.find(item => item.id === classId);
    setClassesConfig(prev => ({ ...prev, classes: prev.classes.filter(item => item.id !== classId) }));
    setSelection({ type: 'schema', id: removed?.schema || selectedSchema?.id || '' });
  };

  const initializeFirstSchema = () => {
    if (!canEdit) return;
    const schema = {
      ...makeEmptySchema(1),
      id: 'noun-declension',
      label: '名词变格',
      default: true,
    };
    const cls = {
      ...makeEmptyClass(schema.id, 1),
      id: 'noun-basic',
      label: '基础名词类',
      default: true,
      infer: { tags: ['noun', 'n', '名词'], word_regex: '' },
    };
    setCategories({ version: 1, schemas: [schema] });
    setClassesConfig({ version: 1, classes: [cls] });
    setExpandedSchemas({ [schema.id]: true });
    setSelection({ type: 'schema', id: schema.id });
    setActiveTableId(schema.tables[0].id);
    setStatus('已在本地初始化。点击保存后写入元数据文件。');
  };

  const updateTable = (tableId, patch) => {
    if (!selectedSchema) return;
    const tables = selectedTables.map(table => table.id === tableId ? { ...table, ...patch } : table);
    updateSchemaTables(selectedSchema.id, tables);
  };

  const addTable = () => {
    if (!selectedSchema) return;
    const table = makeTable(selectedTables.length + 1);
    updateSchemaTables(selectedSchema.id, [...selectedTables, table]);
    setActiveTableId(table.id);
  };

  const removeTable = (tableId) => {
    if (!selectedSchema || selectedTables.length <= 1) return;
    const nextTables = selectedTables.filter(table => table.id !== tableId);
    updateSchemaTables(selectedSchema.id, nextTables);
    setActiveTableId(nextTables[0]?.id || '');
  };

  const resizeTable = (table, rowCount, columnCount) => {
    const nextRows = Array.from({ length: Math.max(1, Number(rowCount) || 1) }, (_, index) => (
      table.rows?.[index] || { id: `r${index + 1}`, group: '', label: `数据行 ${index + 1}` }
    ));
    const nextColumns = Array.from({ length: Math.max(1, Number(columnCount) || 1) }, (_, index) => (
      table.columns?.[index] || { id: `c${index + 1}`, group: '', label: `标题列 ${index + 1}` }
    ));
    updateTable(table.id, { rows: nextRows, columns: nextColumns });
  };

  const updateRow = (table, index, patch) => {
    const rows = [...(table.rows || [])];
    rows[index] = { ...rows[index], id: rows[index]?.id || `r${index + 1}`, ...patch };
    updateTable(table.id, { rows: rows.filter(row => !isEmptyHeaderItem(row)) });
  };

  const updateColumn = (table, index, patch) => {
    const columns = [...(table.columns || [])];
    columns[index] = { ...columns[index], id: columns[index]?.id || `c${index + 1}`, ...patch };
    updateTable(table.id, { columns: columns.filter(column => !isEmptyHeaderItem(column)) });
  };

  const updateInferTags = (classItem, value) => {
    updateClass(classItem.id, {
      infer: {
        ...(classItem.infer || {}),
        tags: value.split(',').map(item => item.trim()).filter(Boolean),
      },
    });
  };

  const updateEnding = (classItem, key, value) => {
    updateClass(classItem.id, {
      endings: {
        ...(classItem.endings || {}),
        [key]: value,
      },
    });
  };

  const renderSchemaEditor = () => {
    if (!selectedSchema) {
      return (
        <div className={cardClass}>
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
            还没有 schema。请先在左侧栏创建一个 schema。
          </div>
        </div>
      );
    }

    return (
      <section className={cardClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">Schema</p>
            <h2 className="text-xl font-semibold">表格结构</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              schema 决定 class 共用的表格形状。一个 schema 可以包含多个子表，适合古希腊语动词这种一词多表的系统。
            </p>
          </div>
          {canEdit && (
            <button onClick={() => removeSchema(selectedSchema.id)} className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" title="删除 schema">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label>
            <span className={labelClass}>显示名称</span>
            <input className={inputClass} value={selectedSchema.label || ''} onChange={event => updateSchema(selectedSchema.id, { label: event.target.value })} disabled={!canEdit} />
          </label>
          <label className="md:col-span-2">
            <span className={labelClass}>表格顶部标题模板</span>
            <input
              className={inputClass}
              value={selectedSchema.titleTemplate || '{stem} {class} {schema}'}
              onChange={event => updateSchema(selectedSchema.id, { titleTemplate: event.target.value })}
              disabled={!canEdit}
              placeholder="{stem} {class} {schema}"
            />
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">子表</h3>
            {canEdit && (
              <button onClick={addTable} className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                新增子表
              </button>
            )}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedTables.map(table => (
              <button
                key={table.id}
                onClick={() => setActiveTableId(table.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeTable?.id === table.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'}`}
              >
                {table.label || '未命名子表'}
              </button>
            ))}
          </div>

          {activeTable && (
            <div className={subCardClass}>
              <div className="flex items-start justify-between gap-4">
                <div className="grid flex-1 gap-4 md:grid-cols-2">
                  <label>
                    <span className={labelClass}>子表名称</span>
                    <input className={inputClass} value={activeTable.label || ''} onChange={event => updateTable(activeTable.id, { label: event.target.value })} disabled={!canEdit} />
                  </label>
                  <label>
                    <span className={labelClass}>数据行数量</span>
                    <input className={inputClass} type="number" min="1" max="40" value={activeTable.rows?.length || 1} onChange={event => resizeTable(activeTable, event.target.value, activeTable.columns?.length || 1)} disabled={!canEdit} />
                  </label>
                  <label>
                    <span className={labelClass}>标题列数量</span>
                    <input className={inputClass} type="number" min="1" max="40" value={activeTable.columns?.length || 1} onChange={event => resizeTable(activeTable, activeTable.rows?.length || 1, event.target.value)} disabled={!canEdit} />
                  </label>
                </div>
                {canEdit && selectedTables.length > 1 && (
                  <button onClick={() => removeTable(activeTable.id)} className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" title="删除子表">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-3 text-sm font-semibold">横向标题，最多两层</h4>
                  <div className="space-y-2">
                    {(activeTable.columns || []).map((column, index) => (
                      <div key={column.id || index} className="grid grid-cols-2 gap-2">
                        <input className={inputClass} value={column.group || ''} onChange={event => updateColumn(activeTable, index, { group: event.target.value })} disabled={!canEdit} placeholder="上层标题" />
                        <input className={inputClass} value={column.label || ''} onChange={event => updateColumn(activeTable, index, { label: event.target.value })} disabled={!canEdit} placeholder="标题" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 text-sm font-semibold">纵向标题，最多两层</h4>
                  <div className="space-y-2">
                    {(activeTable.rows || []).map((row, index) => (
                      <div key={row.id || index} className="grid grid-cols-2 gap-2">
                        <input className={inputClass} value={row.group || ''} onChange={event => updateRow(activeTable, index, { group: event.target.value })} disabled={!canEdit} placeholder="上层标题" />
                        <input className={inputClass} value={row.label || ''} onChange={event => updateRow(activeTable, index, { label: event.target.value })} disabled={!canEdit} placeholder="标题" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderClassEditor = () => {
    if (!selectedClass || !selectedSchema) return renderSchemaEditor();

    return (
      <section className={cardClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">Class</p>
            <h2 className="text-xl font-semibold">变格/变位类型</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              class 负责判断词属于哪一类，并填写 schema 每个格子的词尾。词尾可以写普通后缀，也可以写含 {'{stem}'} 的完整模板。
            </p>
          </div>
          {canEdit && (
            <button onClick={() => removeClass(selectedClass.id)} className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" title="删除 class">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label>
            <span className={labelClass}>显示名称</span>
            <input className={inputClass} value={selectedClass.label || ''} onChange={event => updateClass(selectedClass.id, { label: event.target.value })} disabled={!canEdit} />
          </label>
          <label>
            <span className={labelClass}>所属 Schema</span>
            <select className={inputClass} value={selectedClass.schema} onChange={event => updateClass(selectedClass.id, { schema: event.target.value })} disabled={!canEdit}>
              {schemas.map(schema => <option key={schema.id} value={schema.id}>{schema.label || '未命名 schema'}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={Boolean(selectedClass.default)} onChange={event => updateClass(selectedClass.id, { default: event.target.checked })} disabled={!canEdit} />
            作为该 schema 的默认类型
          </label>
          <label>
            <span className={labelClass}>通过词性标签推断</span>
            <input className={inputClass} value={(selectedClass.infer?.tags || []).join(', ')} onChange={event => updateInferTags(selectedClass, event.target.value)} disabled={!canEdit} placeholder="名词, n" />
          </label>
          <label>
            <span className={labelClass}>通过词形正则推断</span>
            <input className={inputClass} value={selectedClass.infer?.word_regex || ''} onChange={event => updateClass(selectedClass.id, { infer: { ...(selectedClass.infer || {}), word_regex: event.target.value } })} disabled={!canEdit} placeholder=".*a$" />
          </label>
        </div>

        <div className="mt-5 space-y-5">
          {selectedTables.map(table => {
            const hasColumnGroups = hasVisibleGroupLevel(table.columns);
            const hasRowGroups = hasVisibleGroupLevel(table.rows);
            const hasColumnLabels = table.columns.some(column => String(column?.label || '').trim());
            const rowHeaderCount = hasRowGroups ? 2 : 1;
            const rowRuns = rowGroupRuns(table.rows);
            return (
            <div key={table.id} className={tableShellClass}>
              <table className="w-full min-w-[560px] table-fixed border-collapse [&_tr>*:first-child]:border-l-0 [&_tr>*:last-child]:border-r-0">
                <caption className={tableCaptionClass}>
                  {table.label || '未命名子表'}
                </caption>
                <thead>
                  {hasColumnGroups && (
                    <tr>
                      <th className={`${tableHeadClass} text-center`} colSpan={rowHeaderCount}>
                        {'\u00A0'}
                      </th>
                      {groupRuns(table.columns).map((run, index) => (
                        <th key={`${run.group}-${index}`} className={`${tableHeadClass} text-center`} colSpan={run.count}>
                          {run.group || '\u00A0'}
                        </th>
                      ))}
                    </tr>
                  )}
                  {hasColumnLabels && (
                    <tr>
                      {hasRowGroups ? (
                        <>
                          <th className={tableHeadClass}>{'\u00A0'}</th>
                          <th className={tableHeadClass}>{'\u00A0'}</th>
                        </>
                      ) : (
                        <th className={tableHeadClass}>{'\u00A0'}</th>
                      )}
                      {table.columns.map(column => (
                        <th key={column.id} className={tableHeadClass}>
                          {column.label || '\u00A0'}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={row.id}>
                      {hasRowGroups && rowRuns.get(row.group || '')?.firstIndex === rowIndex && (
                        <th className={`${tableRowHeadClass} align-middle`} rowSpan={rowRuns.get(row.group || '')?.count || 1}>
                          {row.group || '\u00A0'}
                        </th>
                      )}
                      <th className={tableRowHeadClass}>
                        {row.label || '\u00A0'}
                      </th>
                      {table.columns.map(column => {
                        const key = tableCellKey(selectedTables, table, row, column);
                        return (
                          <td key={key} className="border border-slate-300 bg-white p-1 dark:border-[#2f4054] dark:bg-[#1d2a3a]">
                            <input
                              className="font-word w-full rounded border border-transparent bg-transparent px-2 py-2 text-center text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#4d9df5] focus:bg-blue-50 focus:outline-none dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#23364a]"
                              value={selectedClass.endings?.[key] || ''}
                              onChange={event => updateEnding(selectedClass, key, event.target.value)}
                              disabled={!canEdit}
                              placeholder="-"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })}
        </div>
      </section>
    );
  };

  const navButtonClass = 'rounded-full p-1.5 transition-colors sm:p-2';
  const navIconClass = 'h-4 w-4 sm:h-5 sm:w-5';
  const renderSearchBox = (isMobile = false) => (
    <div className={isMobile ? 'fixed left-0 right-0 top-14 z-10 px-3 pb-3 pt-2 lg:hidden sm:top-16 sm:px-4' : 'relative hidden min-w-[260px] max-w-md flex-1 lg:block'}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-full border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:bg-gray-800"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onKeyDown={event => {
            if (event.key === 'Enter' && searchResults[0]) selectSearchResult(searchResults[0]);
            if (event.key === 'Escape') setIsSearchFocused(false);
          }}
          placeholder="搜索 schema / class..."
        />
        {isSearchFocused && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            {searchResults.length > 0 ? searchResults.map(result => (
              <button
                key={`${result.type}:${result.id}`}
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectSearchResult(result)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{result.label}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{result.subtitle}</span>
                </span>
                <span className="ml-3 rounded bg-gray-100 px-2 py-0.5 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">{result.type}</span>
              </button>
            )) : (
              <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">没有匹配的 schema 或 class</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen flex-col bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 ${isDarkMode ? 'dark' : ''}`}>
      <header className="fixed left-0 top-0 z-20 w-full border-b border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-1 px-2 sm:h-16 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <button onClick={() => setIsLeftOpen(value => !value)} className={`${navButtonClass} ${isLeftOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-200' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`} title="左侧 Schema 栏">
              <PanelLeftIcon className={navIconClass} />
            </button>
            <button onClick={() => navigate(`/dictionary?project=${projectId}`)} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="返回词典">
              <ArrowLeft className={navIconClass} />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <TableIcon className={`${navIconClass} text-blue-600 dark:text-blue-300`} />
              <h1 className="hidden truncate text-lg font-bold xl:block">形态表管理</h1>
              <span className="hidden rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300 xl:inline">{projectId}</span>
            </div>
          </div>

          {renderSearchBox(false)}

          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            {canEdit && (
            <button onClick={saveConfig} className={`${navButtonClass} bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600`} title="保存">
                <SaveIcon className={navIconClass} />
              </button>
            )}
            <button onClick={() => navigate(`/stats?project=${projectId}`)} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="数据统计">
              <StatsIcon className={navIconClass} />
            </button>
            <button onClick={() => navigate('/home')} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="主页">
              <Home className={navIconClass} />
            </button>
            <button onClick={() => navigate(`/docs?project=${projectId}`)} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="文档">
              <FileText className={navIconClass} />
            </button>
            <button onClick={toggleTheme} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="主题">
              {isDarkMode ? <Sun className={navIconClass} /> : <Moon className={navIconClass} />}
            </button>
            <button onClick={() => setIsRightOpen(value => !value)} className={`${navButtonClass} ${isRightOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-200' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`} title="右侧测试预览">
              <PanelRightIcon className={navIconClass} />
            </button>
          </div>
        </div>
      </header>
      {renderSearchBox(true)}

      <div className="flex min-h-0 flex-1 overflow-hidden bg-gray-200 pt-28 dark:bg-gray-950 lg:pt-16">
        {isLeftOpen && (
          <aside className={`${panelClass} w-[280px] flex-shrink-0 border-r`}>
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">表格结构</h2>
                {canEdit && (
                  <button onClick={addSchema} className="rounded-full p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40" title="新建 schema">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="p-3">
              {schemas.length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
                  <p>还没有 schema。</p>
                  {canEdit && (
                    <button onClick={initializeFirstSchema} className="mt-3 inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                      <Check className="h-4 w-4" />
                      初始化
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {schemas.map(schema => {
                    const schemaClasses = classesBySchema[schema.id] || [];
                    const expanded = expandedSchemas[schema.id] ?? true;
                    const schemaSelected = selection.type === 'schema' && selection.id === schema.id;
                    return (
                      <div key={schema.id}>
                        <div className={`group flex items-center gap-1 rounded px-2 py-1.5 ${schemaSelected ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-100' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                          <button onClick={() => setExpandedSchemas(prev => ({ ...prev, [schema.id]: !expanded }))} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10" title={expanded ? '折叠' : '展开'}>
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <button onClick={() => setSelection({ type: 'schema', id: schema.id })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            <Folder className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate text-sm font-medium">{schema.label || '未命名 schema'}</span>
                          </button>
                          {canEdit && (
                            <button onClick={() => addClass(schema.id)} className="rounded p-1 text-blue-600 opacity-0 hover:bg-blue-50 group-hover:opacity-100 dark:text-blue-300 dark:hover:bg-blue-950/40" title="新建 class">
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {expanded && (
                          <div className="ml-7 mt-1 space-y-1">
                            {schemaClasses.map(item => {
                              const classSelected = selection.type === 'class' && selection.id === item.id;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => setSelection({ type: 'class', id: item.id })}
                                  className={`flex w-full min-w-0 items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${classSelected ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-100' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                  <BookOpen className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{item.label || '未命名 class'}</span>
                                </button>
                              );
                            })}
                            {schemaClasses.length === 0 && (
                              <p className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">这个 schema 里还没有 class。</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="h-full min-w-0 flex-1 overflow-y-auto p-5">
          {status && (
            <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-100">
              {status}
            </div>
          )}
          {selection.type === 'class' ? renderClassEditor() : renderSchemaEditor()}
        </main>

        {isRightOpen && (
          <aside className={`${panelClass} w-[360px] flex-shrink-0 border-l p-4`}>
            <section className={subCardClass}>
              <h2 className="text-sm font-semibold">测试自动判断</h2>
              <label className="mt-3 block">
                <span className={labelClass}>词形</span>
                <input className={`${inputClass} font-word`} value={testWord} onChange={event => setTestWord(event.target.value)} placeholder="输入词根或词条" />
              </label>
              <label className="mt-3 block">
                <span className={labelClass}>词性标签</span>
                <input className={inputClass} value={testTags} onChange={event => setTestTags(event.target.value)} placeholder="名词, n" />
              </label>
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
                命中的 class：<span className="font-semibold">{inferClassForTest?.label || '未命名 class'}</span>
              </div>
            </section>

            <section className={`${subCardClass} mt-4`}>
              <h2 className="mb-3 text-sm font-semibold">实时预览</h2>
              {renderStaticTable(previewSchema, previewClass, testWord || 'stem')}
            </section>

            <section className={`${subCardClass} mt-4 text-sm text-gray-600 dark:text-gray-300`}>
              <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">说明</h2>
              <p><strong>Schema</strong> 是表格结构文件夹，决定一组 class 共用哪些子表、标题列和数据行。</p>
              <p className="mt-2"><strong>Class</strong> 是具体变格/变位类型，负责匹配词条，并给每个格子填写词尾。</p>
              <p className="mt-2">古希腊语这类系统可以把每个 tense / mood / voice 组合做成一个子表；每个格子会按表格顺序和标题配置保存。</p>
              <p className="mt-2">数据库和缓存只保存这些元数据，真正表格在词条页实时生成。</p>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
