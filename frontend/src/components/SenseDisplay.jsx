import React, { useState, useCallback, useEffect } from 'react';
import { ArrowRight, X, Plus } from 'lucide-react';
import useLongPress from '../hooks/useLongPress';
import { useProjectStore } from '../store/projectStore.js';

// --- Custom Hook for Shortcuts ---
/**
 * 澶勭悊鍏ㄥ眬閿洏蹇嵎閿?(Ctrl+S/Cmd+S: Save, Ctrl+Q/Cmd+Q/Esc: Cancel, Ctrl+N/Cmd+N: Add Definition)
 */
const useShortcuts = ({ editingSection, save, cancel, addDefinition}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!editingSection) return;

      // Ctrl+S or Cmd+S for Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }

      // Ctrl+Q or Cmd+Q for Cancel (or Escape)
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        cancel();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }

      // Ctrl+N or Cmd+N for New Definition (only in definitions mode)
      if (editingSection === 'definitions' && (e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (addDefinition) {
          addDefinition();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingSection, save, cancel, addDefinition]);
};

// --- Helper Components for Forms ---

/**
 * 鏍囩鏍峰紡鐨勬暟缁勭紪杈戝櫒
 */
const ArrayEditor = ({ items, onChange, label, placeholder }) => {
  const handleItemChange = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const addItem = () => {
    onChange([...items, '']);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const tagInputBaseClasses = "pl-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full text-gray-800 dark:text-white dark:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm";

  return (
    <div>
      <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">{label}</label>

      {/* Tag container */}
      <div className="flex flex-wrap gap-x-3 gap-y-4 items-center">
        {items.map((item, index) => (
          <div key={index} className="relative group">
            {/* The tag input */}
            <input
              type="text"
              value={item}
              onChange={(e) => handleItemChange(index, e.target.value)}
              placeholder={placeholder}
              // 鍔ㄦ€佽绠?size锛岀‘淇濊緭鍏ユ瓒冲鏄剧ず鍐呭
              size={Math.max(item.length > 0 ? item.length : placeholder.length, 12)}
              className={tagInputBaseClasses}
            />
            {/* The delete button */}
            <button
              type="button"
              onClick={() => removeItem(index)}
              // 鏍峰紡锛氱粷瀵瑰畾浣嶅湪鍙充笂瑙?
              className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-full -mt-1 -mr-1 opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              title="删除"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* The Add button */}
        <button
          type="button"
          onClick={addItem}
          // 鏍峰紡锛氬渾褰㈢殑銆佸崐閫忔槑鐨?"+" 鎸夐挳
          className="w-8 h-8 flex items-center justify-center bg-blue-500/30 dark:bg-blue-400/30 text-blue-700 dark:text-blue-200 rounded-full hover:bg-blue-500/50 dark:hover:bg-blue-400/50 transition-colors shadow-md"
          title="添加"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Reusable Save/Cancel buttons
 */
const FormButtons = ({ onSave, onCancel }) => (
  <div className='flex gap-2 mt-4 pt-4 border-t border-gray-300 dark:border-gray-600'>
    <button type="button" onClick={onSave} className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors shadow-sm">
      保存 (Ctrl+S)
    </button>
    <button type="button" onClick={onCancel} className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors shadow-sm">
      取消 (Ctrl+Q)
    </button>
  </div>
);

// 鈹€鈹€ Interlinear gloss parser & display 鈹€鈹€
const isGlossBlock = (text) => {
    if (!text || typeof text !== 'string') return false;
    return /^\\gla\s/m.test(text);
};

const parseGlossBlock = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    const levels = [];
    let ft = null;

    for (const line of lines) {
        const m = line.match(/^\\(gla|glb|glc|glx|ft)\s+(.*)/);
        if (!m) continue;
        const [, cmd, content] = m;

        if (cmd === 'ft') { ft = content.trim(); continue; }

        const elements = [];
        let cur = '', inBracket = false;
        for (const ch of content) {
            if (ch === '[' && !inBracket) { inBracket = true; continue; }
            if (ch === ']' && inBracket) { inBracket = false; continue; }
            if (ch === ' ' && !inBracket) { if (cur) elements.push(cur); cur = ''; }
            else cur += ch;
        }
        if (cur) elements.push(cur);

        const key = cmd === 'gla' ? 'a' : cmd === 'glb' ? 'b' : cmd === 'glc' ? 'c' : 'x';
        levels.push({ key, elements });
    }

    return { levels, ft };
};

const GlossDisplay = React.memo(({ text }) => {
    if (!isGlossBlock(text)) return null;
    const gloss = parseGlossBlock(text);
    if (!gloss.levels.length) return null;

    const colCount = Math.max(...gloss.levels.map(l => l.elements.length));
    const renderGlossElement = (level, value) => {
        if (level.key !== 'b') return value;
        return String(value).split(/([A-Z]+)/).map((part, index) => (
            /[A-Z]+/.test(part)
                ? <span key={index} className="gloss-smallcap">{part.toLowerCase()}</span>
                : part
        ));
    };

    return (
        <div className="gloss-block">
            <div className="gloss-elements">
                {Array.from({ length: colCount }, (_, colIdx) => (
                    <div key={colIdx} className="gloss-element">
                        {gloss.levels.map((level, li) => (
                            <span key={li} className={`gloss-level-${level.key}`}>
                                {renderGlossElement(level, level.elements[colIdx] || '\u00A0')}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
            {gloss.ft && <div className="gloss-ft">{gloss.ft}</div>}
        </div>
    );
});

// --- Morphology Table Renderer ---
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
    if (!runs.has(group)) {
      runs.set(group, { firstIndex: index, count: 0 });
    }
    runs.get(group).count += 1;
  });
  return runs;
};

const hasVisibleGroupLevel = (items) => (
  items.some(item => String(item?.group || '').trim())
);

const morphologyTableShellClass = 'table-container overflow-x-auto rounded-t-2xl border-b border-slate-300 bg-white transition-all duration-200 hover:-translate-y-0.5 dark:border-[#2f4054] dark:bg-[#1d2a3a]';
const morphologyTableShadowClass = 'shadow-lg hover:shadow-xl';
const morphologyCaptionClass = 'font-word rounded-t-2xl bg-[#4d9df5] p-2 text-center text-base font-bold text-white';
const morphologyHeadCellClass = 'border border-slate-300 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 dark:border-[#2f4054] dark:bg-[#1d2a3a] dark:text-[#66b6ff]';
const morphologyMergedHeadCellClass = 'border border-slate-300 bg-blue-50 px-3 py-2 text-center align-middle text-sm font-semibold text-blue-700 dark:border-[#2f4054] dark:bg-[#1d2a3a] dark:text-[#66b6ff]';
const morphologyBodyHeaderClass = 'border border-slate-300 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 dark:border-[#2f4054] dark:bg-[#1d2a3a] dark:text-[#66b6ff]';
const morphologyBodyCellClass = 'font-word border border-slate-300 bg-white px-3 py-2 text-center text-sm whitespace-nowrap text-slate-900 dark:border-[#2f4054] dark:bg-[#1d2a3a] dark:text-white';

const normalizeMorphologyTables = (schema) => {
  if (!schema) return [];
  if (Array.isArray(schema.tables) && schema.tables.length > 0) {
    return schema.tables.map((table, index) => ({
      id: table.id || `table-${index + 1}`,
      label: table.label || `子表 ${index + 1}`,
      rows: Array.isArray(table.rows) ? table.rows : [],
      columns: Array.isArray(table.columns) ? table.columns : [],
    }));
  }
  return [{
    id: 'main',
    label: schema.label || '主表',
    rows: Array.isArray(schema.rows) ? schema.rows : [],
    columns: Array.isArray(schema.columns) ? schema.columns : [],
  }];
};

const morphologyCellKey = (tables, table, row, column) => {
  const scopedKey = `${table.id}.${row.id}.${column.id}`;
  return tables.length > 1 || table.id !== 'main' ? scopedKey : `${row.id}.${column.id}`;
};

const renderOneMorphologyTable = (table, caption, options = {}) => {
  const rows = Array.isArray(table.rows) ? table.rows : [];
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const cells = Array.isArray(table.cells) ? table.cells : [];
  const hasColumnGroups = hasVisibleGroupLevel(columns);
  const hasRowGroups = hasVisibleGroupLevel(rows);
  const hasColumnLabels = columns.some(column => String(column?.label || '').trim());
  const rowHeaderCount = hasRowGroups ? 2 : 1;
  const rowRuns = rowGroupRuns(rows);

  if (!rows.length || !columns.length) return null;

  return (
    <div className={`${morphologyTableShellClass} ${options.noShadow ? '' : morphologyTableShadowClass}`}>
      <table className="w-full min-w-[560px] table-fixed border-collapse [&_tr>*:first-child]:border-l-0 [&_tr>*:last-child]:border-r-0">
        {caption && (
          <caption className={morphologyCaptionClass}>
            {caption}
          </caption>
        )}
        <colgroup>
          {Array.from({ length: rowHeaderCount }).map((_, index) => (
            <col key={`row-header-${index}`} className="w-[9rem]" />
          ))}
          {columns.map(column => <col key={column.id} />)}
        </colgroup>
        <thead>
          {hasColumnGroups && (
            <tr>
              <th className={morphologyMergedHeadCellClass} colSpan={rowHeaderCount}>
                {'\u00A0'}
              </th>
              {groupRuns(columns).map((run, index) => (
                <th key={`${run.group}-${index}`} className={morphologyMergedHeadCellClass} colSpan={run.count}>
                  {run.group || '\u00A0'}
                </th>
              ))}
            </tr>
          )}
          {hasColumnLabels && (
            <tr>
              {hasRowGroups ? (
                <>
                  <th className={morphologyHeadCellClass}>{'\u00A0'}</th>
                  <th className={morphologyHeadCellClass}>{'\u00A0'}</th>
                </>
              ) : (
                <th className={morphologyHeadCellClass}>{'\u00A0'}</th>
              )}
              {columns.map(column => (
                <th key={column.id} className={morphologyHeadCellClass}>
                  {column.label || '\u00A0'}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              {hasRowGroups && rowRuns.get(row.group || '')?.firstIndex === rowIndex && (
                <th
                  className={`${morphologyBodyHeaderClass} align-middle`}
                  rowSpan={rowRuns.get(row.group || '')?.count || 1}
                >
                  {row.group || '\u00A0'}
                </th>
              )}
              <th className={morphologyBodyHeaderClass}>
                {row.label || '\u00A0'}
              </th>
              {columns.map((column, columnIndex) => (
                <td key={column.id || columnIndex} className={morphologyBodyCellClass}>
                  {cells[rowIndex]?.[columnIndex] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const renderMorphologyTable = (morphology) => {
  const tables = Array.isArray(morphology?.tables) ? morphology.tables : [];
  if (tables.length > 0) {
    return (
      <div className="space-y-4">
        {tables.map((table, index) => renderOneMorphologyTable(
          table,
          table.caption || morphology.caption,
          { noShadow: tables.length > 1 && index === 0 }
        ))}
      </div>
    );
  }
  if (!morphology || !Array.isArray(morphology.tableData) || morphology.tableData.length === 0) return null;

  const rows = Array.isArray(morphology.rows) ? morphology.rows : [];
  const columns = Array.isArray(morphology.columns) ? morphology.columns : [];
  const cells = morphology.tableData.slice(1).map(row => row.slice(1));
  return renderOneMorphologyTable({ id: 'legacy', rows, columns, cells }, morphology.caption);
};


const buildMorphologyDraft = (sense, entryWord, generator) => {
  const existing = sense?.morphology && typeof sense.morphology === 'object'
    ? sense.morphology
    : {};
  const params = {};

  (generator?.fields || []).forEach((field) => {
    params[field.name] = field.default || '';
  });

  if (entryWord && params.stem === '') {
    params.stem = entryWord;
  }

  return {
    generator: existing.generator || generator?.id || 'noun-basic',
    version: existing.version || 1,
    params: {
      ...params,
      ...(existing.params || {}),
    },
    overrides: existing.overrides || {},
  };
};

const inferMorphologySpec = (sense, entryWord, generators) => {
  const existing = sense?.morphology && typeof sense.morphology === 'object'
    ? sense.morphology
    : {};
  if (existing.generator) {
    return existing;
  }

  const tagText = [
    sense?.displayed_tag,
    ...(Array.isArray(sense?.tags) ? sense.tags : []),
  ].filter(Boolean).join(' ').toLowerCase();
  const generator = generators.find(item =>
    (item.infer_tags || []).some(inferTag => {
      const normalized = String(inferTag || '').toLowerCase();
      return normalized && (tagText === normalized || tagText.includes(normalized));
    })
  ) || generators.find(item => {
    if (!item.infer_word_regex) return false;
    try {
      return new RegExp(item.infer_word_regex).test(entryWord || '');
    } catch {
      return false;
    }
  }) || generators.find(item => item.default) || generators[0];

  return buildMorphologyDraft(sense, entryWord, generator || { id: 'noun-basic', fields: [] });
};

const paramsWithDefaults = (spec, generator) => {
  const params = {};
  (generator?.fields || []).forEach((field) => {
    params[field.name] = field.default || '';
  });
  return {
    ...params,
    ...(spec?.params || {}),
  };
};

const renderMorphologyCell = (params, pattern) => {
  const value = String(pattern ?? '');
  const rendered = value.replace(/\{([^}]+)\}/g, (_, key) => String(params[key] ?? ''));
  if (value.includes('{')) {
    return rendered;
  }
  return `${params.stem || ''}${value}`;
};

const renderMorphologyTemplate = (template, values) => (
  String(template || '').replace(/\{([^}]+)\}/g, (_, key) => String(values[key] ?? ''))
);

const generateMorphologyTableFromSpec = (spec, generators) => {
  if (!spec || typeof spec !== 'object' || !spec.generator) {
    return { caption: '', tableData: [], tables: [] };
  }

  const generator = generators.find(item => item.id === spec.generator);
  const params = paramsWithDefaults(spec, generator);
  const schema = generator?.schema || {};
  const tables = normalizeMorphologyTables(schema);
  const endings = generator?.endings && typeof generator.endings === 'object' ? generator.endings : {};
  const captionParts = [schema.label, generator?.label].filter(Boolean);
  const fallbackCaption = captionParts.length ? captionParts.join(' · ') : 'Morphology';
  const overrides = spec.overrides && typeof spec.overrides === 'object' ? spec.overrides : {};
  const titleTemplate = spec.titleTemplate || schema.titleTemplate || '{stem} {class} {schema}';
  const titleValues = {
    ...params,
    stem: params.stem || '',
    class: generator?.label || '',
    schema: schema.label || '',
    class_id: generator?.id || '',
    schema_id: schema.id || '',
  };

  const generatedTables = tables.map((table) => {
    const cells = table.rows.map((row) => table.columns.map((column) => {
      const scopedKey = `${table.id}.${row.id}.${column.id}`;
      const legacyKey = `${row.id}.${column.id}`;
      const pattern = endings[scopedKey] ?? endings[legacyKey] ?? '';
      return renderMorphologyCell(params, pattern);
    }));

    table.rows.forEach((row, rowIndex) => {
      table.columns.forEach((column, columnIndex) => {
        const scopedKey = `${table.id}.${row.id}.${column.id}`;
        const legacyKey = `${row.id}.${column.id}`;
        const numericKey = `${rowIndex + 1}.${columnIndex + 1}`;
        if (Object.prototype.hasOwnProperty.call(overrides, scopedKey)) {
          cells[rowIndex][columnIndex] = String(overrides[scopedKey]);
        } else if (Object.prototype.hasOwnProperty.call(overrides, legacyKey)) {
          cells[rowIndex][columnIndex] = String(overrides[legacyKey]);
        } else if (Object.prototype.hasOwnProperty.call(overrides, numericKey)) {
          cells[rowIndex][columnIndex] = String(overrides[numericKey]);
        }
      });
    });

    const titleKey = `__title.${table.id}`;
    const baseCaption = renderMorphologyTemplate(titleTemplate, titleValues).trim() || fallbackCaption;
    const defaultCaption = tables.length > 1 && table.label ? `${baseCaption} · ${table.label}` : baseCaption;
    const caption = overrides[titleKey] ?? overrides.__title ?? defaultCaption;
    return {
      ...table,
      caption,
      titleKey,
      titleDefault: defaultCaption,
      cells,
      tableData: [
        ['', ...table.columns.map(column => column.label || '')],
        ...table.rows.map((row, rowIndex) => [row.label || '', ...cells[rowIndex]]),
      ],
    };
  });

  const firstTable = generatedTables[0] || { rows: [], columns: [], tableData: [] };
  return {
    caption: fallbackCaption,
    tables: generatedTables,
    tableData: firstTable.tableData || [],
    rows: firstTable.rows || [],
    columns: firstTable.columns || [],
  };
};


/**
 * SenseDisplay Component
 *
 * Displays a single "sense" (meaning) of a word entry with editing capabilities and enhanced linking.
 */
const SenseDisplay = ({
    sense,
    entryWord,
    entryTransliteration,
    onUpdateSense,
    onOpenContextMenu,
    dictionaryMap,
    onLinkClick,
    docHeadingsMap = null, // Map: abbreviation 鈫?meaning from h3/h4 headings
}) => {
  const projectId = useProjectStore(s => s.projectId);
  const canEdit = useProjectStore(s => Boolean(s.authLevel));
  // --- Component State ---
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapseDefinitions, setCollapseDefinitions] = useState(false);
  const [collapseMorphology, setCollapseMorphology] = useState(false);

  // Master editing switch
  const [editingSection, setEditingSection] = useState(null); // 'title', 'pronunciation', 'etymology', 'tags', 'definitions', 'derivation'

  // Form-specific editing states
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingPronunciation, setEditingPronunciation] = useState(null);
  const [editingEtymology, setEditingEtymology] = useState(null);
  const [editingTags, setEditingTags] = useState(null);
  const [editingDerivation, setEditingDerivation] = useState(null);
  const [editingDefinitions, setEditingDefinitions] = useState([]);
  const [editingMorphology, setEditingMorphology] = useState(null);
  const [morphologyGenerators, setMorphologyGenerators] = useState([]);
  const [morphologyStatus, setMorphologyStatus] = useState('');

  // --- Check if any section is in editing mode ---
  const isEditingTitle = editingSection === 'title';
  const isEditingPronunciation = editingSection === 'pronunciation';
  const isEditingEtymology = editingSection === 'etymology';
  const isEditingTags = editingSection === 'tags';
  const isEditingDefinitions = editingSection === 'definitions';
  const isEditingDerivation = editingSection === 'derivation';
  const isEditingMorphology = editingSection === 'morphology';

  // --- Styling Helpers ---
  const editableClasses = canEdit
    ? "group p-3 rounded-xl transition-shadow duration-200 cursor-context-menu touch-manipulation"
    : "group p-3 rounded-xl transition-shadow duration-200";
  const activeClasses = "p-4 rounded-xl -m-3 shadow-2xl";
  const tagAnimationClasses = "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md";

  // Common classes for new forms
  const formWrapperClass = "space-y-4 p-4 border border-yellow-400 rounded-lg bg-yellow-50 dark:bg-yellow-900/20";
  const formInputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-800 dark:text-white dark:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
  const formTextareaClass = `${formInputClass} min-h-[80px]`;
  const formLabelClass = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  useEffect(() => {
    let cancelled = false;

    const url = projectId
      ? `/api/projects/${projectId}/morphology/generators`
      : '/api/projects/default/morphology/generators';

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load morphology generators');
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setMorphologyGenerators(Array.isArray(data.generators) ? data.generators : []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMorphologyStatus(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const selectedMorphologyGenerator = morphologyGenerators.find(
    generator => generator.id === editingMorphology?.generator
  ) || morphologyGenerators[0];
  const displayMorphologySpec = inferMorphologySpec(sense, entryWord, morphologyGenerators);
  const generatedMorphology = generateMorphologyTableFromSpec(
    displayMorphologySpec,
    morphologyGenerators
  );
  const editingMorphologyBase = editingMorphology
    ? generateMorphologyTableFromSpec({ ...editingMorphology, overrides: {} }, morphologyGenerators)
    : { caption: '', tableData: [] };
  const editingMorphologyEffective = editingMorphology
    ? generateMorphologyTableFromSpec(editingMorphology, morphologyGenerators)
    : { caption: '', tableData: [] };


  // --- Context Menu Handler ---
  const handleContextMenu = (e, sectionName) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit) return;

    if (editingSection === sectionName) {
      handleMasterCancel();
    } else {
      // 鍒囨崲鍒扮紪杈戞柊閮ㄥ垎
      setEditingSection(sectionName);
    }

    if (onOpenContextMenu) {
      onOpenContextMenu(e, { type: 'sense', senseId: sense.sense_id, section: sectionName });
    }
  };

  // 绉诲姩绔暱鎸?= 鍙抽敭缂栬緫锛堥€氳繃 data-section 鍖哄垎 section锛?
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressHandlers = useLongPress(
    (e) => {
      const sectionName = e.currentTarget?.dataset?.section;
      if (sectionName) {
        handleContextMenu(e, sectionName);
      }
    },
    { delay: 500, moveThreshold: 10 }
  );
  // 鍖呰鍔犲叆瑙嗚鍙嶉
  const touchHandlers = {
    onTouchStart: (e) => { setIsLongPressing(true); longPressHandlers.onTouchStart(e); },
    onTouchEnd: (e) => { setIsLongPressing(false); longPressHandlers.onTouchEnd(e); },
    onTouchMove: longPressHandlers.onTouchMove,
    onMouseDown: (e) => { setIsLongPressing(true); longPressHandlers.onMouseDown(e); },
    onMouseUp: (e) => { setIsLongPressing(false); longPressHandlers.onMouseUp(e); },
  };

  // 甯﹂暱鎸夐珮浜殑 editable 绫诲悕宸ュ巶
  const longPressHighlight = isLongPressing ? 'bg-primary/10 dark:bg-primary/20' : '';

  // --- Logic for Initializing Edit States ---

  const startEditingTitle = useCallback(() => {
    setEditingTitle({
      sense_id: sense.sense_id,
      displayed_tag: sense.displayed_tag || ''
    });
  }, [sense.sense_id, sense.displayed_tag]);

  const startEditingPronunciation = useCallback(() => {
    setEditingPronunciation({ ipa: sense.ipa || '' });
  }, [sense.ipa]);

  const startEditingEtymology = useCallback(() => {
    setEditingEtymology({
      derived_from: sense.derived_from ? JSON.parse(JSON.stringify(sense.derived_from)) : [],
      description: sense.description || ''
    });
  }, [sense.derived_from, sense.description]);

  const startEditingTags = useCallback(() => {
    setEditingTags(sense.tags ? JSON.parse(JSON.stringify(sense.tags)) : []);
  }, [sense.tags]);

  const startEditingDerivation = useCallback(() => {
    setEditingDerivation(sense.derived_to ? JSON.parse(JSON.stringify(sense.derived_to)) : []);
  }, [sense.derived_to]);

  const startEditingDefinitions = useCallback(() => {
    if (sense?.definitions) {
      setEditingDefinitions(JSON.parse(JSON.stringify(sense.definitions)));
    } else {
      setEditingDefinitions([]);
    }
  }, [sense.definitions]);

  const startEditingMorphology = useCallback(() => {
    const inferredSpec = inferMorphologySpec(sense, entryWord, morphologyGenerators);
    const generator = morphologyGenerators.find(
      item => item.id === inferredSpec?.generator
    ) || morphologyGenerators[0] || { id: 'noun-basic', fields: [] };
    setEditingMorphology(buildMorphologyDraft({ ...sense, morphology: inferredSpec }, entryWord, generator));
    setMorphologyStatus('');
  }, [sense, entryWord, morphologyGenerators]);

  /**
   * Master Effect to control all editing states.
   */
  useEffect(() => {
    // 娓呴櫎鎵€鏈夊彲鑳藉瓨鍦ㄧ殑鏃х姸鎬?
    setEditingTitle(null);
    setEditingPronunciation(null);
    setEditingEtymology(null);
    setEditingTags(null);
    setEditingDerivation(null);
    setEditingDefinitions([]);
    setEditingMorphology(null);

    // 鏍规嵁鏂扮殑 editingSection 鍒濆鍖栫姸鎬?
    switch (editingSection) {
      case 'title': startEditingTitle(); break;
      case 'pronunciation': startEditingPronunciation(); break;
      case 'etymology': startEditingEtymology(); break;
      case 'tags': startEditingTags(); break;
      case 'derivation': startEditingDerivation(); break;
      case 'definitions': startEditingDefinitions(); break;
      case 'morphology': startEditingMorphology(); break;
      default:
        break;
    }
  }, [
    editingSection,
    startEditingTitle,
    startEditingPronunciation,
    startEditingEtymology,
    startEditingTags,
    startEditingDerivation,
    startEditingDefinitions,
    startEditingMorphology
  ]);

  // --- Logic for Saving and Canceling ---

  // Master Cancel: Just resets the editingSection, the useEffect handles cleanup.
  const handleMasterCancel = useCallback(() => {
    setEditingSection(null);
  }, []);

  // --- Specific Save Handlers ---
  const saveTitle = useCallback(() => {
    if (onUpdateSense && editingTitle) {
      onUpdateSense(sense.sense_id, editingTitle);
    }
    setEditingSection(null);
  }, [onUpdateSense, sense.sense_id, editingTitle]);

  const savePronunciation = useCallback(() => {
    if (onUpdateSense && editingPronunciation) {
      onUpdateSense(sense.sense_id, editingPronunciation);
    }
    setEditingSection(null);
  }, [onUpdateSense, sense.sense_id, editingPronunciation]);

  const saveEtymology = useCallback(() => {
    if (onUpdateSense && editingEtymology) {
      const cleanedEtymology = {
        ...editingEtymology,
        // 杩囨护绌哄瓧绗︿覆
        derived_from: editingEtymology.derived_from.filter(t => t.trim() !== '')
      };
      onUpdateSense(sense.sense_id, cleanedEtymology);
    }
    setEditingSection(null);
  }, [onUpdateSense, sense.sense_id, editingEtymology]);

  const saveTags = useCallback(() => {
    if (onUpdateSense && editingTags) {
      const cleanedTags = editingTags.filter(t => t.trim() !== '');
      onUpdateSense(sense.sense_id, { tags: cleanedTags });
    }
    setEditingSection(null);
  }, [onUpdateSense, sense.sense_id, editingTags]);

  const saveDerivation = useCallback(() => {
    if (onUpdateSense && editingDerivation) {
      const cleanedDerivation = editingDerivation.filter(t => t.trim() !== '');
      onUpdateSense(sense.sense_id, { derived_to: cleanedDerivation });
    }
    setEditingSection(null);
  }, [onUpdateSense, sense.sense_id, editingDerivation]);

  const saveDefinitions = useCallback(() => {
    // 杩囨护鎺夋枃鏈拰渚嬪彞閮戒负绌虹殑瀹氫箟
    const cleanedDefinitions = editingDefinitions.filter(def =>
      def.text.trim() !== '' || (Array.isArray(def.examples) && def.examples.some(ex => ex.trim() !== ''))
    ).map(def => ({
        ...def,
        // 纭繚渚嬪彞涔熻繃婊ょ┖鍊?
        examples: Array.isArray(def.examples) ? def.examples.filter(ex => ex.trim() !== '') : [],
    }));

    if (onUpdateSense) {
      onUpdateSense(sense.sense_id, { definitions: cleanedDefinitions });
    }
    setEditingSection(null);
  }, [onUpdateSense, sense.sense_id, editingDefinitions]);

  const updateMorphologyParam = useCallback((fieldName, value) => {
    setEditingMorphology(prev => ({
      ...prev,
      params: {
        ...(prev?.params || {}),
        [fieldName]: value,
      },
    }));
  }, []);

  const updateMorphologyOverride = useCallback((key, value, baseValue) => {
    setEditingMorphology(prev => {
      const nextOverrides = { ...(prev?.overrides || {}) };
      if (value === baseValue) {
        delete nextOverrides[key];
      } else {
        nextOverrides[key] = value;
      }
      return {
        ...prev,
        overrides: nextOverrides,
      };
    });
  }, []);

  const changeMorphologyGenerator = useCallback((generatorId) => {
    const generator = morphologyGenerators.find(item => item.id === generatorId);
    setEditingMorphology(buildMorphologyDraft(
      { ...sense, morphology: { generator: generatorId, params: {} } },
      entryWord,
      generator
    ));
    setMorphologyStatus('');
  }, [entryWord, morphologyGenerators, sense]);

  const saveMorphology = useCallback(() => {
    if (!editingMorphology || !onUpdateSense) return;

    onUpdateSense(sense.sense_id, {
      morphology: editingMorphology,
    });
    setCollapseMorphology(false);
    setEditingSection(null);
    setMorphologyStatus('');
  }, [editingMorphology, onUpdateSense, sense.sense_id]);

  // Master Save: Calls the correct specific save handler
  const handleMasterSave = useCallback(() => {
    switch (editingSection) {
      case 'title': saveTitle(); break;
      case 'pronunciation': savePronunciation(); break;
      case 'etymology': saveEtymology(); break;
      case 'tags': saveTags(); break;
      case 'derivation': saveDerivation(); break;
      case 'definitions': saveDefinitions(); break;
      case 'morphology': saveMorphology(); break;
      default: break;
    }
  }, [editingSection, saveTitle, savePronunciation, saveEtymology, saveTags, saveDerivation, saveDefinitions, saveMorphology]);


  // --- Definition Form-Specific Logic ---
  const addDefinition = useCallback(() => {
    setEditingDefinitions(prev => [
      ...prev,
      { text: '', examples: [] }
    ]);
  }, []);

  const removeDefinition = useCallback((index) => {
    setEditingDefinitions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateDefinition = useCallback((defIndex, field, value) => {
    setEditingDefinitions(prev => prev.map((def, i) =>
      i === defIndex ? { ...def, [field]: value } : def
    ));
  }, []);

  const addExample = useCallback((defIndex) => {
    setEditingDefinitions(prev => prev.map((def, i) => {
      if (i === defIndex) {
        const examples = Array.isArray(def.examples) ? def.examples : [];
        return { ...def, examples: [...examples, ''] };
      }
      return def;
    }));
  }, []);

  const removeExample = useCallback((defIndex, exIndex) => {
    setEditingDefinitions(prev => prev.map((def, i) => {
      if (i === defIndex) {
        return {
          ...def,
          examples: def.examples.filter((_, j) => j !== exIndex)
        };
      }
      return def;
    }));
  }, []);

  const updateExample = useCallback((defIndex, exIndex, value) => {
    setEditingDefinitions(prev => prev.map((def, i) => {
      if (i === defIndex) {
        const newExamples = [...def.examples];
        newExamples[exIndex] = value;
        return { ...def, examples: newExamples };
      }
      return def;
    }));
  }, []);

  // --- Register Shortcuts Hook ---
  useShortcuts({
    editingSection,
    save: handleMasterSave,
    cancel: handleMasterCancel,
    addDefinition: editingSection === 'definitions' ? addDefinition : null,
  });

   // --- Linking Logic (Core Requirement) ---
   const getLinkTypeAndClass = useCallback((term) => {
        // 1. DOC 閾炬帴 鈫?绱壊
        if (term.startsWith('DOC:')) {
            return {
                type: 'doc',
                className: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800/80'
            };
        }
        // 2. Entry 閾炬帴 鈫?钃濊壊
        if (dictionaryMap && dictionaryMap[term] && term !== entryWord) {
            return {
                type: 'entry',
                className: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/80'
            };
        }
        // 3. Doc 鏍囬鍖归厤 鈫?绱壊
        if (docHeadingsMap && docHeadingsMap.has(term)) {
            return {
                type: 'doc',
                className: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800/80'
            };
        }
        // 4. 鏃犺烦杞?鈫?榛樿榛戠櫧
        return {
            type: 'none',
            className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        };
    }, [dictionaryMap, entryWord, docHeadingsMap]);

// --- Render ---
  return (
    <div className="entrySense mb-8" data-sense={sense.sense_id} id={`sense-${sense.sense_id}`}>
      <div className="senseCard relative border border-gray-300 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-xl">

        {/* Fused Sense Header - Editable Title */}
        <div
          className={`${editableClasses} flex flex-col md:flex-row items-start md:items-center justify-between pb-3 mb-4 ${isEditingTitle ? activeClasses : ''} ${longPressHighlight} border-b border-gray-200 dark:border-gray-700`}
          data-section="title"
          onContextMenu={(e) => handleContextMenu(e, 'title')}
          {...touchHandlers}
          title="右键或长按编辑义项标签 / ID"
        >
          {isEditingTitle && editingTitle ? (
            <div className="w-full">
              <h4 className="text-base font-bold mb-1 text-gray-900 dark:text-white">编辑义项 ID / 标签</h4>
              <div className={formWrapperClass}>
                <div>
                  <label htmlFor={`title-sense-id-${sense.sense_id}`} className={formLabelClass}>义项 ID (Sense ID)</label>
                  <input
                    type="text"
                    id={`title-sense-id-${sense.sense_id}`}
                    className={formInputClass}
                    value={editingTitle.sense_id}
                    onChange={(e) => setEditingTitle(prev => ({ ...prev, sense_id: e.target.value }))}
                    placeholder="Sense ID (e.g., 1.1)"
                  />
                </div>
                <div>
                  <label htmlFor={`title-tag-${sense.sense_id}`} className={formLabelClass}>显示标签 (Displayed Tag)</label>
                  <input
                    type="text"
                    id={`title-tag-${sense.sense_id}`}
                    className={formInputClass}
                    value={editingTitle.displayed_tag}
                    onChange={(e) => setEditingTitle(prev => ({ ...prev, displayed_tag: e.target.value }))}
                    placeholder="Displayed Tag (e.g., n, v)"
                  />
                </div>
                <FormButtons onSave={saveTitle} onCancel={handleMasterCancel} />
              </div>
            </div>
          ) : (
            <>
              {/* LEFT SIDE: Collapse Button + Word + Transliteration */}
              <div className="flex items-center space-x-2 min-w-0">
                <button
                  onClick={() => setIsCollapsed(prev => !prev)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex-shrink-0"
                  title={isCollapsed ? "展开义项" : "收起义项"}
                >
                  <ArrowRight className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} />
                </button>

                <div className="flex items-baseline space-x-2 truncate py-1">
                  <h4
                    className="text-xl font-normal px-1 dark:text-gray-300 truncate font-word"
                    title={entryWord}
                  >
                    {entryWord}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    [{entryTransliteration}]
                  </span>
                </div>
              </div>

              {/* RIGHT SIDE: Sense Tag + Sense ID */}
              <div className="flex items-center space-x-2 flex-shrink-0 mt-1 md:mt-0">
                <i className='text-base font-bold text-blue-600 dark:text-blue-400'>{sense.displayed_tag}</i>
                <span className="text-base font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full shadow-md">
                  义项: {sense.sense_id}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Sense Details (Content to be Collapsed as whole) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0 p-0' : 'max-h-[5000px] opacity-100'}`}>
          <div className="senseDetails space-y-4 text-left">

            {/* Pronunciation Section - Editable (Form mode) */}
            {sense.ipa && (
              <div
                className={`${editableClasses} ${isEditingPronunciation ? activeClasses : ''} ${longPressHighlight}`}
                id={`entry-section-pronunciation-${sense.sense_id}`}
                data-section="pronunciation"
                onContextMenu={(e) => handleContextMenu(e, 'pronunciation')}
                {...touchHandlers}
                title="右键或长按编辑 IPA"
              >
                <h3 className="entryPronunciation text-lg font-bold border-l-4 border-blue-500 pl-2 mb-3">发音 / Pronunciation</h3>

                {isEditingPronunciation && editingPronunciation ? (
                  <div className={`w-full ${formWrapperClass}`}>
                    <div>
                      <label htmlFor={`ipa-${sense.sense_id}`} className={formLabelClass}>IPA</label>
                      <input
                        type="text"
                        id={`ipa-${sense.sense_id}`}
                        className={formInputClass}
                        value={editingPronunciation.ipa}
                        onChange={(e) => setEditingPronunciation({ ipa: e.target.value })}
                        placeholder="输入 IPA..."
                      />
                    </div>
                    <FormButtons onSave={savePronunciation} onCancel={handleMasterCancel} />
                  </div>
                ) : (
                  <p className="text-base font-mono text-gray-700 dark:text-gray-300">
                    IPA:&ensp;/{sense.ipa}/
                  </p>
                )}
              </div>
            )}

            {/* Etymology Section - Editable (Form mode) */}
            {(sense.derived_from?.length > 0 || sense.description) && (
              <div
                className={`${editableClasses} ${isEditingEtymology ? activeClasses : ''} ${longPressHighlight}`}
                id={`entry-section-etymology-${sense.sense_id}`}
                data-section="etymology"
                onContextMenu={(e) => handleContextMenu(e, 'etymology')}
                {...touchHandlers}
                title="右键或长按编辑词源"
              >
                <h3 className="text-lg font-bold border-l-4 border-blue-500 pl-2 mb-3">词源 / Etymology</h3>

                {isEditingEtymology && editingEtymology ? (
                  <div className={`w-full ${formWrapperClass}`}>
                    <ArrayEditor
                      label="来源 (Derived From)"
                      items={editingEtymology.derived_from}
                      onChange={(newItems) => setEditingEtymology(prev => ({ ...prev, derived_from: newItems }))}
                      placeholder="输入来源..."
                    />
                    <div className="mt-2">
                      <label htmlFor={`ety-desc-${sense.sense_id}`} className={formLabelClass}>结构描述 (Description)</label>
                      <textarea
                        id={`ety-desc-${sense.sense_id}`}
                        className={formTextareaClass}
                        value={editingEtymology.description}
                        onChange={(e) => setEditingEtymology(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="输入结构描述..."
                      />
                    </div>
                    <FormButtons onSave={saveEtymology} onCancel={handleMasterCancel} />
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-2">
                    {sense.derived_from?.length > 0 && (
                      <div className="derivedFrom flex flex-wrap gap-2">
                        {sense.derived_from.map((term, index) => {
                            const { type, className } = getLinkTypeAndClass(term);
                            return (
                                <span
                                    key={index}
                                    onClick={type !== 'none' ? () => onLinkClick(type, term) : undefined}
                                    className={`text-xs font-semibold mb-2 px-2 py-0.5 rounded-full whitespace-nowrap ${className} ${tagAnimationClasses}`}
                                    title={type === 'entry' ? `${term}\n跳转到词条` : type === 'doc' ? `${docHeadingsMap?.get(term)?.meaning || term}\n跳转到文档` : undefined}
                                >
                                    {term}
                                </span>
                            );
                        })}
                      </div>
                    )}
                    {sense.description && (
                      <p className="etyDiscription text-sm mt-2 text-gray-700 dark:text-gray-200">
                          {sense.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tags Block - Editable (Form mode) */}
            {sense.tags?.length > 0 && (
              <div
                className={`${editableClasses} flex flex-col pt-2 border-b border-gray-200 dark:border-gray-700 ${isEditingTags ? activeClasses : ''} ${longPressHighlight}`}
                data-section="tags"
                onContextMenu={(e) => handleContextMenu(e, 'tags')}
                {...touchHandlers}
                title="右键或长按编辑标签"
              >
                <div className='flex items-baseline gap-2'>
                  <span className="text-base font-bold text-gray-700 dark:text-gray-300">标签:</span>
                </div>

                {isEditingTags && editingTags ? (
                  <div className={`w-full mt-2 ${formWrapperClass}`}>
                    <ArrayEditor
                      label="标签"
                      items={editingTags}
                      onChange={(newItems) => setEditingTags(newItems)}
                      placeholder="输入标签..."
                    />
                    <FormButtons onSave={saveTags} onCancel={handleMasterCancel} />
                  </div>
                ) : (
                  <ol className="entryTags flex list-none p-0 m-0 gap-2 flex-wrap mt-2">
                    {sense.tags.map((tag, index) => {
                      const { type, className } = getLinkTypeAndClass(tag);
                      const buildTooltip = () => {
                        if (type === 'entry' && dictionaryMap?.[tag]) {
                          const entry = dictionaryMap[tag];
                          const firstDef = entry.senses?.[0]?.definitions?.[0]?.text || '';
                          const preview = firstDef.length > 30 ? `${firstDef.substring(0, 30)}...` : firstDef;
                          return preview ? `${tag}: ${preview}` : tag;
                        }
                        if (type === 'doc') {
                          return docHeadingsMap?.get(tag)?.meaning || tag;
                        }
                        return undefined;
                      };
                      return (
                        <li
                          key={index}
                          onClick={type !== 'none' && onLinkClick ? () => onLinkClick(type, tag) : undefined}
                          title={buildTooltip()}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${className} ${tagAnimationClasses} ${type !== 'none' ? 'cursor-pointer' : ''}`}
                        >
                          {tag}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            )}

            {/* Definition Block - Form Editable */}
            {Array.isArray(sense.definitions) && sense.definitions.length > 0 && (
              <div
                className={`${editableClasses} ${isEditingDefinitions ? activeClasses : ''} ${longPressHighlight}`}
                id={`entry-section-definitions-${sense.sense_id}`}
                data-section="definitions"
                onContextMenu={(e) => handleContextMenu(e, 'definitions')}
                {...touchHandlers}
                title="右键或长按编辑释义"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold border-l-4 border-blue-500 pl-2 mb-2">释义 / Definitions</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      onClick={() => setCollapseDefinitions(prev => !prev)}
                      title={collapseDefinitions ? "展开释义" : "收起释义"}
                    >
                      <ArrowRight className={`w-4 h-4 transition-transform ${collapseDefinitions ? 'rotate-0' : 'rotate-90'}`} />
                    </button>
                  </div>
                </div>

                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${collapseDefinitions ? 'max-h-0 opacity-0 p-0' : 'max-h-[2000px] opacity-100'}`}>
                  {isEditingDefinitions ? (
                    <div className={formWrapperClass}>
                      {editingDefinitions.map((def, defIndex) => (
                        <div key={defIndex} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-md">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-base text-gray-800 dark:text-gray-100">释义 #{defIndex + 1}</h4>
                            <button
                              onClick={() => removeDefinition(defIndex)}
                              className="px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors shadow-sm"
                            >
                              删除释义
                            </button>
                          </div>
                          <div className="mb-2">
                            <label className={formLabelClass}>释义文本</label>
                            <textarea
                              value={def.text}
                              onChange={(e) => updateDefinition(defIndex, 'text', e.target.value)}
                              rows="2"
                              className={formTextareaClass}
                              placeholder="输入释义..."
                            />
                          </div>
                          <div>
                            <label className={formLabelClass}>例句（支持 \\gla \\glb \\glc \\ft 行间标注）</label>
                            <div className="space-y-2">
                              {Array.isArray(def.examples) && def.examples.map((example, exIndex) => (
                                <div key={exIndex} className="flex gap-2 items-start">
                                  <textarea
                                    value={example}
                                    onChange={(e) => updateExample(defIndex, exIndex, e.target.value)}
                                    rows={example.includes('\\gla') ? 4 : 1}
                                    className={formTextareaClass}
                                    placeholder="输入例句..."
                                  />
                                  <button
                                    onClick={() => removeExample(defIndex, exIndex)}
                                    className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors shadow-sm flex-shrink-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => addExample(defIndex)}
                              className="mt-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs transition-colors shadow-md"
                            >
                              <Plus className="w-4 h-4 inline mr-1" /> 添加例句
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-3 border-t border-gray-300 dark:border-gray-600">
                        <button
                          onClick={addDefinition}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors shadow-md"
                        >
                          添加释义 (Ctrl+N)
                        </button>
                        <button
                          onClick={saveDefinitions}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors shadow-md"
                        >
                          保存更改 (Ctrl+S)
                        </button>
                        <button
                          onClick={handleMasterCancel} // Use master cancel
                          className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors shadow-md"
                        >
                          取消 (Ctrl+Q / Esc)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ol className="definitions list-decimal list-inside p-3 border border-gray-300 dark:border-gray-700 rounded-xl space-y-3">
                      {sense.definitions.map((def, index) => (
                        <li key={index} className="text-sm text-gray-800 dark:text-gray-200">
                          <span>{def.text}</span>
                          {def.examples && def.examples.length > 0 && (
                            <ul className="list-none ml-4 mt-2 space-y-2">
                              {def.examples.map((ex, j) => (
                                <li key={j} className="text-xs text-gray-600 dark:text-gray-400">
                                  {isGlossBlock(ex) ? (
                                    <GlossDisplay text={ex} />
                                  ) : (
                                    <span className="before:content-['·'] before:mr-1.5">{ex}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            )}

            {/* Morphology Section */}
            <div
              className={`${editableClasses} ${isEditingMorphology ? activeClasses : ''} ${longPressHighlight} pt-2 border-gray-200 dark:border-gray-700`}
              id={`entry-section-morphology-${sense.sense_id}`}
              data-section="morphology"
              onContextMenu={(e) => handleContextMenu(e, 'morphology')}
              {...touchHandlers}
              title="右键或长按编辑形态学"
            >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold border-l-4 border-blue-600 pl-2 mb-2 text-gray-900 dark:border-blue-500 dark:text-gray-100">
                    形态学 / Morphology
                  </h3>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapseMorphology(prev => !prev);
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
                    title={collapseMorphology ? "展开形态学" : "收起形态学"}
                  >
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        collapseMorphology ? "rotate-0" : "rotate-90"
                      }`}
                    />
                  </button>
                </div>

                <div
                  className={`transition-all duration-500 overflow-hidden ${
                    collapseMorphology
                      ? "max-h-0 opacity-0 p-0"
                      : "max-h-[3000px] opacity-100 pt-2"
                  }`}
                >
                  {isEditingMorphology && editingMorphology && (
                    <div
                      className={`mb-4 ${formWrapperClass}`}
                      onContextMenu={(e) => handleContextMenu(e, 'morphology')}
                    >
                      <div>
                        <label className={formLabelClass}>变格/变位类型</label>
                        <select
                          className={formInputClass}
                          value={editingMorphology.generator}
                          onChange={(e) => changeMorphologyGenerator(e.target.value)}
                        >
                          {morphologyGenerators.map(generator => (
                            <option key={generator.id} value={generator.id}>
                              {generator.label}
                            </option>
                          ))}
                        </select>
                        {selectedMorphologyGenerator?.description && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {selectedMorphologyGenerator.description}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(selectedMorphologyGenerator?.fields || []).map(field => (
                          <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                            <label className={formLabelClass}>{field.label}</label>
                            {field.type === 'textarea' ? (
                              <textarea
                                className={formTextareaClass}
                                value={editingMorphology.params?.[field.name] || ''}
                                onChange={(e) => updateMorphologyParam(field.name, e.target.value)}
                              />
                            ) : (
                              <input
                                type="text"
                                className={`${formInputClass} ${field.name === 'stem' ? 'font-word' : ''}`}
                                value={editingMorphology.params?.[field.name] || ''}
                                onChange={(e) => updateMorphologyParam(field.name, e.target.value)}
                              />
                            )}
                            {field.help && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.help}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {editingMorphologyEffective.tables?.length > 0 && (
                        <div className="space-y-3">
                          {editingMorphologyEffective.tables.map((table) => {
                            const baseTable = editingMorphologyBase.tables?.find(item => item.id === table.id) || {};
                            const hasColumnGroups = hasVisibleGroupLevel(table.columns);
                            const hasRowGroups = hasVisibleGroupLevel(table.rows);
                            const hasColumnLabels = table.columns.some(column => String(column?.label || '').trim());
                            const rowHeaderCount = hasRowGroups ? 2 : 1;
                            const rowRuns = rowGroupRuns(table.rows);
                            return (
                              <div key={table.id} className="overflow-x-auto rounded-lg border border-yellow-400 bg-yellow-100/80 dark:bg-yellow-900/30">
                                <div className="border-b border-yellow-400 bg-yellow-200/70 p-2 dark:border-yellow-700 dark:bg-yellow-800/50">
                                  <label className="block text-xs font-semibold text-yellow-950 dark:text-yellow-100">
                                    表格标题覆盖
                                  </label>
                                  <input
                                    type="text"
                                    className="font-word mt-1 w-full rounded border border-yellow-400 bg-white/90 px-2 py-1 text-center font-semibold text-gray-900 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600 dark:border-yellow-700 dark:bg-gray-900 dark:text-yellow-50"
                                    value={table.caption || ''}
                                    title={table.caption === table.titleDefault ? '自动生成标题' : `覆盖标题，原始值：${table.titleDefault}`}
                                    onChange={(e) => updateMorphologyOverride(table.titleKey, e.target.value, table.titleDefault)}
                                  />
                                </div>
                                <table className="w-full min-w-[480px] table-fixed border-collapse text-xs [&_tr>*:first-child]:border-l-0 [&_tr>*:last-child]:border-r-0">
                                  <caption className="font-word bg-yellow-300 p-1.5 text-xs font-semibold text-yellow-950 dark:bg-yellow-800 dark:text-yellow-100">
                                    {table.caption || table.label || '形态表'}
                                  </caption>
                                  <thead>
                                    {hasColumnGroups && (
                                      <tr className="border-b border-yellow-300/80 dark:border-yellow-700/80">
                                        <th className="border-r border-yellow-300/80 p-1.5 text-center text-yellow-950 dark:border-yellow-700/80 dark:text-yellow-100" colSpan={rowHeaderCount}>
                                          {'\u00A0'}
                                        </th>
                                        {groupRuns(table.columns).map((run, index) => (
                                          <th key={`${run.group}-${index}`} className="border-r border-yellow-300/80 p-1.5 text-center text-yellow-950 dark:border-yellow-700/80 dark:text-yellow-100" colSpan={run.count}>
                                            {run.group || '\u00A0'}
                                          </th>
                                        ))}
                                      </tr>
                                    )}
                                    {hasColumnLabels && (
                                      <tr className="border-b border-yellow-300/80 dark:border-yellow-700/80">
                                        {hasRowGroups ? (
                                          <>
                                            <th className="border-r border-yellow-300/80 p-1.5 text-left text-yellow-950 dark:border-yellow-700/80 dark:text-yellow-100">{'\u00A0'}</th>
                                            <th className="border-r border-yellow-300/80 p-1.5 text-left text-yellow-950 dark:border-yellow-700/80 dark:text-yellow-100">{'\u00A0'}</th>
                                          </>
                                        ) : (
                                          <th className="border-r border-yellow-300/80 p-1.5 text-left text-yellow-950 dark:border-yellow-700/80 dark:text-yellow-100">{'\u00A0'}</th>
                                        )}
                                        {table.columns.map(column => (
                                          <th key={column.id} className="border-l border-yellow-300/80 p-1.5 text-center text-yellow-950 dark:border-yellow-700/80 dark:text-yellow-100">
                                            {column.label || '\u00A0'}
                                          </th>
                                        ))}
                                      </tr>
                                    )}
                                  </thead>
                                  <tbody>
                                    {table.rows.map((row, rowIndex) => (
                                      <tr key={row.id} className="border-b border-yellow-300/80 dark:border-yellow-700/80">
                                        {hasRowGroups && rowRuns.get(row.group || '')?.firstIndex === rowIndex && (
                                          <th className="border-r border-yellow-300/80 p-1.5 text-left align-middle font-semibold text-yellow-950 dark:border-yellow-700/80 dark:text-yellow-100" rowSpan={rowRuns.get(row.group || '')?.count || 1}>
                                            {row.group || '\u00A0'}
                                          </th>
                                        )}
                                        <th className="p-1.5 text-left font-semibold text-yellow-950 dark:text-yellow-100">
                                          {row.label || '\u00A0'}
                                        </th>
                                        {table.columns.map((column, columnIndex) => {
                                          const baseValue = baseTable.cells?.[rowIndex]?.[columnIndex] || '';
                                          const cell = table.cells?.[rowIndex]?.[columnIndex] || '';
                                          const overrideKey = `${table.id}.${row.id}.${column.id}`;
                                          return (
                                            <td key={column.id} className="border-l border-yellow-300/80 p-1 dark:border-yellow-700/80">
                                              <input
                                                type="text"
                                                className="font-word w-full rounded border border-yellow-300 bg-white/90 px-1.5 py-1 text-center text-xs text-gray-900 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600 dark:border-yellow-700 dark:bg-gray-900 dark:text-yellow-50"
                                                value={cell}
                                                title={baseValue === cell ? '自动生成形式' : `覆盖写法，原始值：${baseValue}`}
                                                onChange={(e) => updateMorphologyOverride(overrideKey, e.target.value, baseValue)}
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
                      )}

                      {morphologyStatus && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{morphologyStatus}</p>
                      )}

                      <FormButtons onSave={saveMorphology} onCancel={handleMasterCancel} />
                    </div>
                  )}

                  {!isEditingMorphology && <div className="overflow-x-auto">
                    {generatedMorphology.tables?.length > 0 || generatedMorphology.tableData.length > 0 ? (
                      renderMorphologyTable(generatedMorphology)
                    ) : (
                      <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                        还没有可用的形态表元数据。右键或长按进入编辑。
                      </div>
                    )}
                  </div>}
                </div>
              </div>

            {/* Derivation Section - Editable (Form mode) */}
            {(canEdit || sense.derived_to?.length > 0) && (
              <div
                className={`${editableClasses} ${isEditingDerivation ? activeClasses : ''} ${longPressHighlight}`}
                id={`entry-section-derivation-${sense.sense_id}`}
                data-section="derivation"
                onContextMenu={(e) => handleContextMenu(e, 'derivation')}
                {...touchHandlers}
                title="右键或长按编辑派生词"
              >
                <h3 className="text-lg font-bold border-l-4 border-blue-500 pl-2 mb-2">派生词 / Derivation</h3>

                {isEditingDerivation && editingDerivation ? (
                  <div className={`w-full ${formWrapperClass}`}>
                    <ArrayEditor
                      label="派生到"
                      items={editingDerivation}
                      onChange={(newItems) => setEditingDerivation(newItems)}
                      placeholder="Enter derived word..."
                    />
                    <FormButtons onSave={saveDerivation} onCancel={handleMasterCancel} />
                  </div>
                ) : (
                  <div className="derivedTo flex flex-wrap gap-2 p-2">
                    {sense.derived_to.map((term, index) => {
                        const { type, className } = getLinkTypeAndClass(term);
                        return (
                            <span
                                key={index}
                                onClick={type !== 'none' ? () => onLinkClick(type, term) : undefined}
                                className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${className} ${tagAnimationClasses}`}
                                title={type === 'entry' ? `${term}\n跳转到词条` : type === 'doc' ? `${docHeadingsMap?.get(term)?.meaning || term}\n跳转到文档` : undefined}
                            >
                                {term}
                            </span>
                        );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SenseDisplay;
