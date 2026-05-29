import React, { useCallback, useState, useMemo } from 'react';
import { ArrowRightIcon, XIcon, ChevronRightIcon } from 'lucide-react';


// --- 词条列表渲染组件 (WordListItem) (保持不变) ---
const WordListItem = React.memo(({
    entry,
    selectedEntrySlug,
    onSelect,
    onDeleteEntry,
    isCollapsed,
    onToggleCollapse,
    hasChildren
}) => {
  const isSelected = entry.slug === selectedEntrySlug;

  // 提取首条释义用于悬停提示
  const firstDefText = useMemo(() => {
    const defs = entry.senses?.[0]?.definitions;
    if (defs && defs.length > 0) return defs[0].text;
    return null;
  }, [entry.senses]);

  // 渲染缩进，基于 entry.level 属性
  const indentStyle = {
    paddingLeft: `${entry.level * 8 + 12}px`, // 每层增加 16px 缩进
  };

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (typeof onDeleteEntry === 'function') {
      onDeleteEntry(entry.slug, entry.word);
    }
  }, [entry.slug, entry.word, onDeleteEntry]);

  const handleSelect = useCallback(() => {
    onSelect(entry.slug);
  }, [entry.slug, onSelect]);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    if (hasChildren && onToggleCollapse) {
        onToggleCollapse(entry.slug);
    }
  }, [entry.slug, onToggleCollapse, hasChildren]);

  if (!entry.word) return null;

  return (
    <div
      style={indentStyle}
      className={`group py-1.5 rounded-xl cursor-pointer transition-all flex justify-between items-center transform hover:scale-[1.01] relative ${
        isSelected
          ? 'bg-blue-200 dark:bg-blue-900 shadow-inner ring-2 ring-blue-500/50 dark:ring-blue-400/50'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={handleSelect}
    >
        <div className="flex items-center flex-grow min-w-0">
            {/* 折叠按钮 */}
            {hasChildren ? (
                <button
                    onClick={handleToggle}
                    className="flex-shrink-0 mr-1 p-1 -ml-1 transition-transform duration-200 hover:text-blue-600 dark:hover:text-blue-400"
                    style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                    title={isCollapsed ? '展开子词条' : '折叠子词条'}
                    aria-expanded={!isCollapsed}
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            ) : (
                // 占位符，保持对齐
                <span className="flex-shrink-0 mr-1 w-6 h-4" style={{ paddingLeft: entry.level > 0 ? '6px' : '0px' }}></span>
            )}

            <span
                className={`font-medium truncate px-1 font-word ${isSelected ? 'text-blue-800 dark:text-blue-100' : 'text-gray-800 dark:text-gray-300'}`}
            >
                {entry.word}
            </span>

            {/* 悬停释义 tooltip */}
            {firstDefText && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                    <span className="block max-w-64 px-2.5 py-1.5 text-xs leading-relaxed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 whitespace-normal break-words">
                        {firstDefText.length > 60 ? firstDefText.slice(0, 60) + '…' : firstDefText}
                    </span>
                </span>
            )}
        </div>

      {/* Delete Entry Button */}
      <button
        type="button"
        onClick={handleDelete}
        className="p-1 rounded-full text-red-500 hover:bg-red-200 dark:hover:bg-red-800 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0 mr-1"
        title={`删除词条 ${entry.word}`}
        aria-label={`删除词条 ${entry.word}`}
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
});


// --- 主组件: 词条列表容器 ---
const WordList = ({
  entries = [],
  selectedEntrySlug,
  onSelect,
  isOpen,
  onDeleteEntry,
  onAddNewEntry,
}) => {
  const widthClass = isOpen ? 'w-full sm:w-64' : 'w-0';
  // 存储折叠状态： key 是 entry.slug, value 是 true (折叠) 或 false (展开)
  const [collapsedState, setCollapsedState] = useState({});

  const isAllCollapsed = useMemo(() => {
    // 只有当 collapsedState 的长度等于 entries 数组中 'hasChildren' 词条的数量时，才考虑全部折叠
    // 或者更简单地，检查是否所有有子节点的词条都被标记为折叠
    return entries.length > 0 &&
           entries.filter(e => e.hasChildren).every(e => collapsedState[e.slug]);
  }, [entries, collapsedState]);

  const handleToggleAll = useCallback(() => {
    if (isAllCollapsed) {
      // 如果全部折叠，则展开所有有子节点的项 (设置为 false)
      setCollapsedState({}); // 清空状态即可展开所有
    } else {
      // 否则，折叠所有有子节点的项 (设置为 true)
      const newCollapsedState = entries
        .filter(e => e.hasChildren)
        .reduce((acc, entry) => {
          acc[entry.slug] = true; // true 表示折叠
          return acc;
        }, {});
      setCollapsedState(newCollapsedState);
    }
  }, [isAllCollapsed, entries]);


  const handleToggleCollapse = useCallback((entrySlug) => {
    setCollapsedState(prev => ({
        ...prev,
        [entrySlug]: !prev[entrySlug]
    }));
  }, []);

  // 过滤后的列表 (只显示未折叠的子节点)
  const filteredEntries = useMemo(() => {
    const list = [];
    let shouldSkipChildren = false;

    for (const entry of entries) {
        // 1. 检查当前节点是否是某个已折叠父节点的子节点
        if (shouldSkipChildren) {
            // 如果当前节点的 level <= 父节点 level，则跳过结束 (因为我们是以深度优先遍历)
            if (entry.level <= shouldSkipChildren.level) {
                shouldSkipChildren = false;
            } else {
                // 仍然是子节点，跳过渲染
                continue;
            }
        }

        // 2. 检查当前节点是否需要被折叠
        const isCollapsed = collapsedState[entry.slug];
        if (isCollapsed && entry.hasChildren) {
            // 如果折叠，设置 shouldSkipChildren 标志
            shouldSkipChildren = entry;
        }

        // 3. 渲染当前节点
        list.push(
            <WordListItem
                key={entry.slug}
                entry={entry}
                selectedEntrySlug={selectedEntrySlug}
                onSelect={onSelect}
                onDeleteEntry={onDeleteEntry}
                isCollapsed={isCollapsed}
                onToggleCollapse={handleToggleCollapse}
                hasChildren={entry.hasChildren}
            />
        );
    }
    return list;
  }, [entries, selectedEntrySlug, onSelect, onDeleteEntry, collapsedState, handleToggleCollapse]);


  return (
    <div
      className={`${widthClass} p-4 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto scrollbar-custom h-full flex-shrink-0 transition-all duration-300 ${isOpen ? 'block' : 'hidden'}`}
    >
      <div className="flex items-center justify-between border-b pb-2 mb-3 border-gray-200 dark:border-gray-600">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
          词汇列表 ({entries.length})
        </h2>

        <button
            onClick={handleToggleAll}
            className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
            title={isAllCollapsed ? '全部展开' : '全部折叠'}
            aria-expanded={!isAllCollapsed}
        >
            <ArrowRightIcon
                className={`w-5 h-5 transition-transform duration-200 ${isAllCollapsed ? 'rotate-0' : 'rotate-90'}`}
            />
        </button>
      </div>

      <button
        type="button"
        className="w-full bg-blue-500 text-white py-2 rounded-xl mb-4 hover:bg-blue-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        onClick={onAddNewEntry} // 绑定到创建函数
      >
        + 添加新词条
      </button>

      <div>
        {filteredEntries}
      </div>
    </div>
  );
};

export default WordList;

// --- 树形结构辅助函数 (Tree Helper Functions) ---

// buildTreeData 保持不变 (因为它正确地构建了 DAG 结构)
export function buildTreeData(dictionaryData) {
    const treeData = {};
    const reverseTreeData = {};
    const hasParent = new Set();

    for (const lemma in dictionaryData) {
        const entry = dictionaryData[lemma];

        const fromWords = (entry.senses || [])
                            .flatMap(s => s.derived_from || [])
                            .filter((value, index, self) => self.indexOf(value) === index);

        if (fromWords && Array.isArray(fromWords)) {
            fromWords.forEach(fromWord => {
                if (dictionaryData[fromWord]) {
                    if (!treeData[fromWord]) {
                        treeData[fromWord] = [];
                    }
                    if (!treeData[fromWord].includes(lemma)) {
                        treeData[fromWord].push(lemma);
                    }

                    if (!reverseTreeData[lemma]) {
                        reverseTreeData[lemma] = [];
                    }
                    if (!reverseTreeData[lemma].includes(fromWord)) {
                        reverseTreeData[lemma].push(fromWord);
                    }

                    hasParent.add(lemma);
                }
            });
        }
    }

    const rootNodes = Object.keys(dictionaryData).filter(lemma => !hasParent.has(lemma)).sort();

    function sortTree(nodes) {
        nodes.sort((a, b) => a.localeCompare(b));
        nodes.forEach(node => {
            if (treeData[node]) {
                sortTree(treeData[node]);
            }
        });
    }

    sortTree(rootNodes);
    return { treeData, reverseTreeData, rootNodes };
}

// 修复后的 flattenTree：使用 visited Set 解决 DAG 结构导致的 Key 冲突
export function flattenTree(rootNodes, treeData, dictionaryData) {
    const list = [];
    const visited = new Set(); // 核心：跟踪已添加到列表的词条 lemma，保证唯一性

    const traverse = (nodes, level = 0) => {
        nodes.forEach(lemma => {
            // 检查：如果当前词语已经被访问过（已被添加到列表中），则跳过
            if (visited.has(lemma)) {
                return;
            }

            const entry = dictionaryData[lemma];
            const children = treeData[lemma];

            if (entry) {
                // 标记为已访问，防止后续路径（多父节点）再次渲染它
                visited.add(lemma);

                list.push({
                    ...entry,
                    word: lemma,
                    id: entry.slug, // 最终 key 的来源，使用 slug
                    level: level,
                    hasChildren: !!(children && children.length > 0)
                });

                // 递归处理子节点
                if (children && children.length > 0) {
                    traverse(children, level + 1);
                }
            }
        });
    };

    traverse(rootNodes);
    return list;
}