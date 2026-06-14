import React, { useCallback, useState, useMemo } from 'react';
import { ArrowRightIcon, XIcon, ChevronRightIcon } from 'lucide-react';


// --- 璇嶆潯鍒楄〃娓叉煋缁勪欢 (WordListItem) (淇濇寔涓嶅彉) ---
const WordListItem = React.memo(({
    entry,
    selectedEntrySlug,
    onSelect,
    onDeleteEntry,
    canEdit = false,
    isCollapsed,
    onToggleCollapse,
    hasChildren
}) => {
  const isSelected = entry.slug === selectedEntrySlug;

  // 鎻愬彇棣栨潯閲婁箟鐢ㄤ簬鎮仠鎻愮ず
  const firstDefText = useMemo(() => {
    const defs = entry.senses?.[0]?.definitions;
    if (defs && defs.length > 0) return defs[0].text;
    return null;
  }, [entry.senses]);

  // 娓叉煋缂╄繘锛屽熀浜?entry.level 灞炴€?
  const indentStyle = {
    paddingLeft: `${entry.level * 8 + 12}px`, // 姣忓眰澧炲姞 16px 缂╄繘
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
            {/* 鎶樺彔鎸夐挳 */}
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
                // 鍗犱綅绗︼紝淇濇寔瀵归綈
                <span className="flex-shrink-0 mr-1 w-6 h-4" style={{ paddingLeft: entry.level > 0 ? '6px' : '0px' }}></span>
            )}

            <span
                className={`font-medium truncate px-1 font-word ${isSelected ? 'text-blue-800 dark:text-blue-100' : 'text-gray-800 dark:text-gray-300'}`}
            >
                {entry.word}
            </span>

            {/* 鎮仠閲婁箟 tooltip */}
            {firstDefText && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                    <span className="block max-w-64 px-2.5 py-1.5 text-xs leading-relaxed text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 whitespace-normal break-words">
                        {firstDefText.length > 60 ? `${firstDefText.slice(0, 60)}...` : firstDefText}
                    </span>
                </span>
            )}
        </div>

      {/* Delete Entry Button */}
      {canEdit && (
        <button
          type="button"
          onClick={handleDelete}
          className="p-1 rounded-full text-red-500 hover:bg-red-200 dark:hover:bg-red-800 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0 mr-1"
          title={`删除词条 ${entry.word}`}
          aria-label={`删除词条 ${entry.word}`}
        >
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});


// --- 涓荤粍浠? 璇嶆潯鍒楄〃瀹瑰櫒 ---
const WordList = ({
  entries = [],
  selectedEntrySlug,
  onSelect,
  isOpen,
  onDeleteEntry,
  onAddNewEntry,
  canEdit = false,
}) => {
  const widthClass = isOpen ? 'w-full sm:w-64' : 'w-0';
  // 瀛樺偍鎶樺彔鐘舵€侊細 key 鏄?entry.slug, value 鏄?true (鎶樺彔) 鎴?false (灞曞紑)
  const [collapsedState, setCollapsedState] = useState({});

  const isAllCollapsed = useMemo(() => {
    // 鍙湁褰?collapsedState 鐨勯暱搴︾瓑浜?entries 鏁扮粍涓?'hasChildren' 璇嶆潯鐨勬暟閲忔椂锛屾墠鑰冭檻鍏ㄩ儴鎶樺彔
    // 鎴栬€呮洿绠€鍗曞湴锛屾鏌ユ槸鍚︽墍鏈夋湁瀛愯妭鐐圭殑璇嶆潯閮借鏍囪涓烘姌鍙?
    return entries.length > 0 &&
           entries.filter(e => e.hasChildren).every(e => collapsedState[e.slug]);
  }, [entries, collapsedState]);

  const handleToggleAll = useCallback(() => {
    if (isAllCollapsed) {
      // 濡傛灉鍏ㄩ儴鎶樺彔锛屽垯灞曞紑鎵€鏈夋湁瀛愯妭鐐圭殑椤?(璁剧疆涓?false)
      setCollapsedState({}); // 娓呯┖鐘舵€佸嵆鍙睍寮€鎵€鏈?
    } else {
      // 鍚﹀垯锛屾姌鍙犳墍鏈夋湁瀛愯妭鐐圭殑椤?(璁剧疆涓?true)
      const newCollapsedState = entries
        .filter(e => e.hasChildren)
        .reduce((acc, entry) => {
          acc[entry.slug] = true; // true 琛ㄧず鎶樺彔
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

  // 杩囨护鍚庣殑鍒楄〃 (鍙樉绀烘湭鎶樺彔鐨勫瓙鑺傜偣)
  const filteredEntries = useMemo(() => {
    const list = [];
    let shouldSkipChildren = false;

    for (const entry of entries) {
        // 1. 妫€鏌ュ綋鍓嶈妭鐐规槸鍚︽槸鏌愪釜宸叉姌鍙犵埗鑺傜偣鐨勫瓙鑺傜偣
        if (shouldSkipChildren) {
            // 濡傛灉褰撳墠鑺傜偣鐨?level <= 鐖惰妭鐐?level锛屽垯璺宠繃缁撴潫 (鍥犱负鎴戜滑鏄互娣卞害浼樺厛閬嶅巻)
            if (entry.level <= shouldSkipChildren.level) {
                shouldSkipChildren = false;
            } else {
                // 浠嶇劧鏄瓙鑺傜偣锛岃烦杩囨覆鏌?
                continue;
            }
        }

        // 2. 妫€鏌ュ綋鍓嶈妭鐐规槸鍚﹂渶瑕佽鎶樺彔
        const isCollapsed = collapsedState[entry.slug];
        if (isCollapsed && entry.hasChildren) {
            // 濡傛灉鎶樺彔锛岃缃?shouldSkipChildren 鏍囧織
            shouldSkipChildren = entry;
        }

        // 3. 娓叉煋褰撳墠鑺傜偣
        list.push(
            <WordListItem
                key={entry.treeKey || entry.slug}
                entry={entry}
                selectedEntrySlug={selectedEntrySlug}
                onSelect={onSelect}
                onDeleteEntry={onDeleteEntry}
                canEdit={canEdit}
                isCollapsed={isCollapsed}
                onToggleCollapse={handleToggleCollapse}
                hasChildren={entry.hasChildren}
            />
        );
    }
    return list;
  }, [entries, selectedEntrySlug, onSelect, onDeleteEntry, canEdit, collapsedState, handleToggleCollapse]);


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

      {canEdit && (
        <button
          type="button"
          className="w-full bg-blue-500 text-white py-2 rounded-xl mb-4 hover:bg-blue-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          onClick={onAddNewEntry}
        >
          + 添加新词条
        </button>
      )}

      <div>
        {filteredEntries}
      </div>
    </div>
  );
};

export default WordList;

// --- 鏍戝舰缁撴瀯杈呭姪鍑芥暟 (Tree Helper Functions) ---

// buildTreeData 淇濇寔涓嶅彉 (鍥犱负瀹冩纭湴鏋勫缓浜?DAG 缁撴瀯)
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

// 淇鍚庣殑 flattenTree锛氫娇鐢?visited Set 瑙ｅ喅 DAG 缁撴瀯瀵艰嚧鐨?Key 鍐茬獊
export function flattenTree(rootNodes, treeData, dictionaryData) {
    const list = [];

    const traverse = (nodes, level = 0, path = []) => {
        nodes.forEach(lemma => {
            if (path.includes(lemma)) {
                return;
            }

            const entry = dictionaryData[lemma];
            const children = treeData[lemma];

            if (entry) {
                const nodePath = [...path, lemma];

                list.push({
                    ...entry,
                    word: lemma,
                    id: entry.slug,
                    treeKey: `${entry.slug}:${nodePath.join('>')}`,
                    level: level,
                    hasChildren: !!(children && children.length > 0)
                });

                if (children && children.length > 0) {
                    traverse(children, level + 1, nodePath);
                }
            }
        });
    };

    traverse(rootNodes);
    return list;
}
