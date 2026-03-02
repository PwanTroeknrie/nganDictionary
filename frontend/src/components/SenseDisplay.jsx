import React, { useState, useCallback, useEffect } from 'react';
import { ArrowRight, X, Plus } from 'lucide-react';

// --- Custom Hook for Shortcuts ---
/**
 * 处理全局键盘快捷键 (Ctrl+S/Cmd+S: Save, Ctrl+Q/Cmd+Q/Esc: Cancel, Ctrl+N/Cmd+N: Add Definition)
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
 * 标签样式的数组编辑器
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
              // 动态计算 size，确保输入框足够显示内容
              size={Math.max(item.length > 0 ? item.length : placeholder.length, 12)}
              className={tagInputBaseClasses}
            />
            {/* The delete button */}
            <button
              type="button"
              onClick={() => removeItem(index)}
              // 样式：绝对定位在右上角
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
          // 样式：圆形的、半透明的 "+" 按钮
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

 // --- Morphology Table Renderer (MODIFIED) ---
  const renderMorphologyTable = (data, caption) => {
    if (!Array.isArray(data) || data.length === 0) return null;

    const rows = data.map(row => Array.isArray(row) ? row : [String(row)]);

    return (
      <div
        // 变更: 1. 添加 overflow-x-auto (允许水平滚动)
        className="py-2 table-container bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-x-auto"
      >
        <table className="w-full Declension text-sm border-collapse">
          {caption && (
            <caption className="text-sm font-semibold text-white p-3 rounded-t-xl bg-blue-600 dark:bg-blue-400">
              {caption}
            </caption>
          )}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                // 移除了 hover 效果，因为它们在水平滚动时体验不佳
                className={
                  rowIndex % 2 === 0
                    ? 'bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 transition duration-150'
                    : 'bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 transition duration-150'
                }
              >
                {row.map((cell, cellIndex) => {
                  const isHeaderLike = rowIndex === 0 || rowIndex === 2;

                  return isHeaderLike ? (
                    <th
                      key={cellIndex}
                      // 变更: 3. 添加 whitespace-nowrap 确保表头不换行
                      className="p-3 font-semibold text-blue-600 dark:text-blue-300 text-left border-r border-gray-200 dark:border-gray-700 last:border-r-0 whitespace-nowrap"
                    >
                      {cell}
                    </th>
                  ) : (
                    // 变更: 3. 添加 whitespace-nowrap 确保单元格内容不换行
                    <td
                      key={cellIndex}
                      className="p-3 font-mono text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0 text-gray-700 dark:text-gray-300 whitespace-nowrap"
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
    dictionaryMap, // 新增：用于检查词条是否存在
    onLinkClick,    // 新增：用于处理点击跳转
}) => {
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

  // --- Check if any section is in editing mode ---
  const isEditingTitle = editingSection === 'title';
  const isEditingPronunciation = editingSection === 'pronunciation';
  const isEditingEtymology = editingSection === 'etymology';
  const isEditingTags = editingSection === 'tags';
  const isEditingDefinitions = editingSection === 'definitions';
  const isEditingDerivation = editingSection === 'derivation';

  // --- Styling Helpers ---
  const editableClasses = "group p-3 rounded-xl transition-shadow duration-200 cursor-context-menu";
  const activeClasses = "p-4 rounded-xl -m-3 shadow-2xl";
  const tagAnimationClasses = "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md";

  // Common classes for new forms
  const formWrapperClass = "space-y-4 p-4 border border-yellow-400 rounded-lg bg-yellow-50 dark:bg-yellow-900/20";
  const formInputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-800 dark:text-white dark:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
  const formTextareaClass = `${formInputClass} min-h-[80px]`;
  const formLabelClass = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";


  // --- Context Menu Handler ---
  const handleContextMenu = (e, sectionName) => {
    e.preventDefault();
    e.stopPropagation();

    if (editingSection === sectionName) {
      // 如果已经在编辑此部分，则取消编辑
      setEditingSection(null);
    } else {
      // 切换到编辑新部分
      setEditingSection(sectionName);
    }

    if (onOpenContextMenu) {
      onOpenContextMenu(e, { type: 'sense', senseId: sense.sense_id, section: sectionName });
    }
  };

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

  /**
   * Master Effect to control all editing states.
   */
  useEffect(() => {
    // 清除所有可能存在的旧状态
    setEditingTitle(null);
    setEditingPronunciation(null);
    setEditingEtymology(null);
    setEditingTags(null);
    setEditingDerivation(null);
    setEditingDefinitions([]);

    // 根据新的 editingSection 初始化状态
    switch (editingSection) {
      case 'title': startEditingTitle(); break;
      case 'pronunciation': startEditingPronunciation(); break;
      case 'etymology': startEditingEtymology(); break;
      case 'tags': startEditingTags(); break;
      case 'derivation': startEditingDerivation(); break;
      case 'definitions': startEditingDefinitions(); break;
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
    startEditingDefinitions
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
        // 过滤空字符串
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
    // 过滤掉文本和例句都为空的定义
    const cleanedDefinitions = editingDefinitions.filter(def =>
      def.text.trim() !== '' || (Array.isArray(def.examples) && def.examples.some(ex => ex.trim() !== ''))
    ).map(def => ({
        ...def,
        // 确保例句也过滤空值
        examples: Array.isArray(def.examples) ? def.examples.filter(ex => ex.trim() !== '') : [],
    }));

    if (onUpdateSense) {
      onUpdateSense(sense.sense_id, { definitions: cleanedDefinitions });
    }
    setEditingSection(null);
  }, [onUpdateSense, sense.sense_id, editingDefinitions]);

  // Master Save: Calls the correct specific save handler
  const handleMasterSave = useCallback(() => {
    switch (editingSection) {
      case 'title': saveTitle(); break;
      case 'pronunciation': savePronunciation(); break;
      case 'etymology': saveEtymology(); break;
      case 'tags': saveTags(); break;
      case 'derivation': saveDerivation(); break;
      case 'definitions': saveDefinitions(); break;
      default: break;
    }
  }, [editingSection, saveTitle, savePronunciation, saveEtymology, saveTags, saveDerivation, saveDefinitions]);


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
        // 1. 检查文档链接 (DOC: 开头)
        if (term.startsWith('DOC:')) {
            return {
                type: 'doc',
                // 紫色：能跳转 docs
                className: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800'
            };
        }

        // 2. 检查词条链接 (存在于 dictionaryMap 且不是当前词条本身)
        // 假设 dictionaryMap 是 { 'word': {...entryData} } 形式的对象
        if (dictionaryMap && dictionaryMap[term] && term !== entryWord) {
            return {
                type: 'entry',
                // 绿色：能跳转词条
                className: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 cursor-pointer hover:bg-green-200 dark:hover:bg-green-800'
            };
        }

        // 3. 默认 (不能跳转) -> 使用主题蓝色/靛青
        return {
            type: 'none',
            // 蓝色/靛青：不能跳转
            className: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
        };
    }, [dictionaryMap, entryWord]);

// --- Render ---
  return (
    <div className="entrySense mb-8" data-sense={sense.sense_id} id={`sense-${sense.sense_id}`}>
      <div className="senseCard relative border border-gray-300 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-xl">

        {/* Fused Sense Header - Editable Title */}
        <div
          className={`${editableClasses} flex flex-col md:flex-row items-start md:items-center justify-between pb-3 mb-4 ${isEditingTitle ? activeClasses : ''} border-b border-gray-200 dark:border-gray-700`}
          onContextMenu={(e) => handleContextMenu(e, 'title')}
          title="右键编辑义项标签/ID"
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
                className={`${editableClasses} ${isEditingPronunciation ? activeClasses : ''}`}
                id={`entry-section-pronunciation-${sense.sense_id}`}
                onContextMenu={(e) => handleContextMenu(e, 'pronunciation')}
                title="右键编辑 IPA"
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
                className={`${editableClasses} ${isEditingEtymology ? activeClasses : ''}`}
                id={`entry-section-etymology-${sense.sense_id}`}
                onContextMenu={(e) => handleContextMenu(e, 'etymology')}
                title="右键编辑词源"
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
                                    title={type !== 'none' ? `点击跳转到 ${term}` : '不可跳转'}
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
                className={`${editableClasses} flex flex-col pt-2 border-b border-gray-200 dark:border-gray-700 ${isEditingTags ? activeClasses : ''}`}
                onContextMenu={(e) => handleContextMenu(e, 'tags')}
                title="右键编辑标签"
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
                    {sense.tags.map((tag, index) => (
                      <li
                        key={index}
                        className={`text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full font-medium ${tagAnimationClasses}`}
                      >
                        {tag}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Definition Block - Form Editable */}
            {Array.isArray(sense.definitions) && sense.definitions.length > 0 && (
              <div
                className={`${editableClasses} ${isEditingDefinitions ? activeClasses : ''}`}
                id={`entry-section-definitions-${sense.sense_id}`}
                onContextMenu={(e) => handleContextMenu(e, 'definitions')}
                title="右键编辑释义"
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
                            <label className={formLabelClass}>定义文本</label>
                            <textarea
                              value={def.text}
                              onChange={(e) => updateDefinition(defIndex, 'text', e.target.value)}
                              rows="2"
                              className={formTextareaClass}
                              placeholder="输入定义..."
                            />
                          </div>
                          <div>
                            <label className={formLabelClass}>例句</label>
                            <div className="space-y-2">
                              {Array.isArray(def.examples) && def.examples.map((example, exIndex) => (
                                <div key={exIndex} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={example}
                                    onChange={(e) => updateExample(defIndex, exIndex, e.target.value)}
                                    className={formInputClass}
                                    placeholder="输入例句..."
                                  />
                                  <button
                                    onClick={() => removeExample(defIndex, exIndex)}
                                    className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors shadow-sm"
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
                            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                              {def.examples.map((ex, j) => (
                                <li key={j}>{ex}</li>
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
            {sense.chart_type && (
              <div className={`${editableClasses} pt-2 border-gray-200 dark:border-gray-700`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold border-l-4 border-blue-600 pl-2 mb-2 text-gray-900 dark:border-blue-500 dark:text-gray-100">
                    形态学 / Morphology
                  </h3>

                  <button
                    onClick={() => setCollapseMorphology(prev => !prev)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
                    title={collapseMorphology ? "展开形态变化" : "收起形态变化"}
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
                  <div className="overflow-x-auto">
                    {/* 调用模拟的形态学渲染函数 */}
                    {renderMorphologyTable(sense.table_data, sense.chart_type)}
                  </div>
                </div>
              </div>
            )}

            {/* Derivation Section - Editable (Form mode) */}
            {sense.derived_to?.length > 0 && (
              <div
                className={`${editableClasses} ${isEditingDerivation ? activeClasses : ''}`}
                id={`entry-section-derivation-${sense.sense_id}`}
                onContextMenu={(e) => handleContextMenu(e, 'derivation')}
                title="右键编辑派生词"
              >
                <h3 className="text-lg font-bold border-l-4 border-blue-500 pl-2 mb-2">派生词 / Derivation</h3>

                {isEditingDerivation && editingDerivation ? (
                  <div className={`w-full ${formWrapperClass}`}>
                    <ArrayEditor
                      label="派生词"
                      items={editingDerivation}
                      onChange={(newItems) => setEditingDerivation(newItems)}
                      placeholder="输入派生词..."
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
                                title={type !== 'none' ? `点击跳转到 ${term}` : '不可跳转'}
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