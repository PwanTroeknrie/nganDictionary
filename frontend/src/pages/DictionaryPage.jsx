import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';

// 导入所有子组件
import Header from '../components/Header.jsx';
import WordList, { buildTreeData, flattenTree } from '../components/WordList';
import EntryEditor from '../components/EntryEditor';
import HierarchyTree from '../components/HierarchyTree';

// 导入所有Hook函数
import { useShortcuts } from '../hooks/useShortcuts';
import { wordToSlug } from '../lib/slugUtils.js';

// 定义 API 的基础 URL
const API_BASE_URL = '/api/projects';

// ── auth helpers ──
const getAuthHeaders = (projectId) => {
    try {
        const stored = sessionStorage.getItem(`auth_${projectId}`);
        if (stored) {
            const { code } = JSON.parse(stored);
            if (code) return { 'X-Auth-Code': code, 'Content-Type': 'application/json' };
        }
    } catch {}
    return { 'Content-Type': 'application/json' };
};

const getAuthLevel = (projectId) => {
    try {
        const stored = sessionStorage.getItem(`auth_${projectId}`);
        if (stored) {
            const { level } = JSON.parse(stored);
            return level || '';
        }
    } catch {}
    return '';
};

/**
 * 词典页面组件
 * @param {object} props
 * @param {string} props.projectId - 当前选定的项目ID
 * (其他 props 略)
 */
function DictionaryPage({ isDarkMode, toggleTheme, customFont, setCustomFont }) {
    // --- URL 同步 ---
    const { slug: urlSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // projectId from query param (?project=xxx) or fallback to 'default'
    const projectId = new URLSearchParams(location.search).get('project') || 'default';
    const authLevel = getAuthLevel(projectId);
    const isReadOnly = !authLevel;  // guest = read-only

    // --- 状态管理 ---
    const [entries, setEntries] = useState([]);
    const [selectedEntrySlug, setSelectedEntrySlug] = useState(urlSlug || null);
    const [fetchError, setFetchError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [editingSection, setEditingSection] = useState(null);
    const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
    const [isWordListOpen, setIsWordListOpen] = useState(true);
    const [isTreeOpen, setIsTreeOpen] = useState(true);
    const [isFontInputVisible, setIsFontInputVisible] = useState(false);

    // 追踪本地是否有未保存的修改 (仅针对当前 selectedEntryId)
    const [hasLocalChanges, setHasLocalChanges] = useState(false);
    const [docHeadings, setDocHeadings] = useState([]);
    const [showNewEntryModal, setShowNewEntryModal] = useState(false);
    const [newEntryWord, setNewEntryWord] = useState('');
    const [newEntryTranslit, setNewEntryTranslit] = useState('');

    // --- Ref 绑定 ---
    const entryEditorRef = useRef(null);
    const lastModifiedEntryRef = useRef(null);
    // 保存时用的 slug（DB 中当前的 slug），和显示用的 selectedEntrySlug 解耦
    const savedSlugRef = useRef(null);

     // --- 配置: 头部按钮可见性控制 (您可以修改这些值来控制按钮显示) ---
    const buttonVisibility = {
        homeNav: true,             // 主页导航 (新)
        docNav: true,              // 文档导航 (新)
        wordlistToggle: true,      // 词条列表开关
        fontInputToggle: true,     // 字体输入开关
        editModeToggle: true,      // 编辑模式开关
        hierarchyTreeToggle: true, // 层级树开关
        themeToggle: true,         // 主题切换开关
    };

    // 核心数据获取函数
    const fetchEntries = useCallback(async (selectFirst = true) => {
        if (!projectId) {
            setEntries([]);
            setSelectedEntrySlug(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setFetchError('');
        try {
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries`);
                if (response.ok) break;
                if (response.status === 404 && i === 0) {
                    await initSampleData(projectId);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    continue;
                }
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setEntries(data);
            console.log(`[DictionaryPage] Loaded ${data.length} entries for project "${projectId}"`);

            if (data.length > 0 && selectFirst) {
                setSelectedEntrySlug(prev => {
                    if (!data.some(e => e.slug === prev)) {
                        return data[0].slug;
                    }
                    return prev;
                });
            } else if (data.length === 0) {
                setSelectedEntrySlug(null);
            }
        } catch (error) {
            console.error("[DictionaryPage] Failed to fetch entries:", error);
            setFetchError(`加载失败: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    // 初始化示例数据 (用于首次加载或空项目)
    const initSampleData = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}/init-sample`, {
                method: 'POST',
                headers: getAuthHeaders(id)
            });
            if (!response.ok) {
                throw new Error('Failed to initialize sample data');
            }
            console.log('Sample data initialized successfully.');
        } catch (error) {
            console.error('Error during sample data initialization:', error);
        }
    };


    // --- useEffect: 当 projectId 变化时获取数据 ---
    useEffect(() => {
        fetchEntries();
        fetch(`${API_BASE_URL}/${projectId}/docs/headings`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setDocHeadings(data.headings || []))
            .catch(() => setDocHeadings([]));
    }, [projectId, fetchEntries]);

    // 获取选中的词条对象 (必须在此声明，后续 useEffect/handleEntryChange 依赖它)
    const selectedEntry = useMemo(
        () => entries.find((e) => e.slug === selectedEntrySlug),
        [entries, selectedEntrySlug]
    );

    // 选中词条变化时同步 savedSlugRef（仅在无本地修改时）
    useEffect(() => {
        if (!hasLocalChanges && selectedEntry) {
            savedSlugRef.current = selectedEntry.slug;
        }
    }, [selectedEntry, hasLocalChanges]);


    // --- 派生状态 (树状构建) ---
    const { flatTreeEntries, dictionaryMap } = useMemo(() => {
        // 1. 将 entries 数组转换为以 word/lemma 为键的 Object Map
        const dictionaryMap = entries.reduce((acc, entry) => {
            if (entry.word) {
                acc[entry.word] = entry;
            }
            return acc;
        }, {});

        if (Object.keys(dictionaryMap).length === 0) {
            return { flatTreeEntries: [], dictionaryMap };
        }

        // 2. 构建树状结构
        const { rootNodes, treeData } = buildTreeData(dictionaryMap);

        // 3. 将树状结构转换为带 level 的扁平列表
        const flatList = flattenTree(rootNodes, treeData, dictionaryMap);

        return { flatTreeEntries: flatList, dictionaryMap };
    }, [entries]); // 依赖原始 entries 列表

    // doc heading map: abbreviation → {meaning, id} (for tag linking)
    const docHeadingsMap = useMemo(() => {
        const map = new Map();
        for (const h of docHeadings) {
            const text = h.text;
            const lastSpace = text.lastIndexOf(' ');
            if (lastSpace > 0) {
                const meaning = text.substring(0, lastSpace).trim();
                const abbrev = text.substring(lastSpace + 1).trim();
                const entry = { meaning, id: h.id };
                if (abbrev && !map.has(abbrev)) map.set(abbrev, entry);
                if (meaning && !map.has(meaning)) map.set(meaning, { meaning, id: h.id });
            }
            if (!map.has(text)) map.set(text, { meaning: text, id: h.id });
        }
        return map;
    }, [docHeadings]);

    // 处理标签点击跳转
    const handleLinkClick = useCallback((type, term) => {
        if (type === 'entry' && dictionaryMap[term]) {
            setSelectedEntrySlug(dictionaryMap[term].slug);
        } else if (type === 'doc') {
            const hInfo = docHeadingsMap.get(term);
            const affix = hInfo?.id || '';
            window.open(`/docs?project=${projectId}&affix=${affix}`, '_blank');
        }
    }, [dictionaryMap, projectId, docHeadingsMap]);

    // 负责将修改后的词条对象更新到本地状态 (entries) 中
    const handleEntryChange = useCallback((updatedEntry) => {
        setEntries(prevEntries =>
            prevEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
        );
        setHasLocalChanges(true);
        lastModifiedEntryRef.current = updatedEntry;
        // 如果 slug 变了（word 被修改），更新 URL
        if (updatedEntry.slug !== selectedEntrySlug) {
            setSelectedEntrySlug(updatedEntry.slug);
        }
    }, [selectedEntrySlug]);

    // 4. 核心保存函数 (PUT) - 提交指定的词条对象到 API
    const commitEntrySave = useCallback(async (entryToSave, isCleanup = false) => {
        if (!projectId || !entryToSave) {
            return false;
        }

        // 用 DB 中当前的 slug 发请求（不是可能已变化的新 slug）
        const urlSlug = savedSlugRef.current || entryToSave.slug;

        console.log(`[Save] Committing entry: ${entryToSave.word} (urlSlug: ${urlSlug}, newSlug: ${entryToSave.slug})`);

        try {
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries/${urlSlug}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(projectId),
                    body: JSON.stringify(entryToSave),
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to save entry after retries.');
                }
            }

            if (response.status === 401) {
                alert('授权已过期或无效，请返回项目页面重新授权');
                return false;
            }
            if (!response.ok) {
                alert(`保存失败: HTTP ${response.status}`);
                return false;
            }

            const updatedEntry = await response.json();

            // 同步 DB 中的 slug
            savedSlugRef.current = updatedEntry.slug;
            if (updatedEntry.slug !== selectedEntrySlug) {
                setSelectedEntrySlug(updatedEntry.slug);
            }

            setHasLocalChanges(false);
            lastModifiedEntryRef.current = null;

            // 用 id 匹配更新本地 entries
            setEntries(prevEntries =>
                prevEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
            );

            console.log(`[Save] Successful: slug=${updatedEntry.slug}`);
            return true;

        } catch (error) {
            console.error(`[Save] Failed:`, error);
            alert(`保存失败: ${error.message}`);
            return false;
        }
    }, [projectId, selectedEntrySlug]);

    // 5. 触发保存 (Ctrl+S 或手动按钮)
    const saveDefinitions = useCallback(async () => {
        if (hasLocalChanges && selectedEntry) {
            console.log("Saving Entry via Ctrl+S or Button:", selectedEntry.word);
            await commitEntrySave(selectedEntry);
            setEditingSection(null); // 如果保存成功，退出编辑状态
        } else {
            console.log("No local changes detected. Manual save skipped.");
        }
    }, [hasLocalChanges, selectedEntry, commitEntrySave]);

    const saveTempEdit = saveDefinitions; // 快捷键保存，与 saveDefinitions 相同

    // 6. 自动清理保存函数 (用于 Entry 切换和组件卸载)
    const saveIfDirty = useCallback(async () => {
        // 只有当 hasLocalChanges 为 true 且 Ref 中有数据时，才进行自动保存
        if (hasLocalChanges && lastModifiedEntryRef.current) {
            console.log("[Cleanup Save] Detected local changes on entry switch/unmount. Saving...");
            // 使用 Ref 中的数据进行保存，确保保存的是切换前的状态
            await commitEntrySave(lastModifiedEntryRef.current, true);
        } else {
            console.log("[Cleanup Save] No dirty state detected for current entry.");
        }
    }, [hasLocalChanges, commitEntrySave]);

    // --- 核心 Effect: 监听 Entry 切换和组件卸载 ---
    useEffect(() => {
        // Cleanup function: runs right before the effect runs again (due to dependency change)
        // OR when the component unmounts.
        return () => {
            // 当 Entry 切换、项目切换或组件卸载时，自动保存上一个 Entry 的修改
            saveIfDirty();
        };
    }, [projectId, selectedEntrySlug, saveIfDirty]);

    // --- Effect: URL slug 变化时同步到状态（浏览器前进/后退 / 直接输入 URL）---
    useEffect(() => {
        if (urlSlug && urlSlug !== selectedEntrySlug) {
            setSelectedEntrySlug(urlSlug);
        }
    }, [urlSlug]);

    // --- Effect: selectedEntrySlug 变化时同步到浏览器 URL ---
    useEffect(() => {
        if (selectedEntrySlug && selectedEntrySlug !== urlSlug) {
            // 保留 project 查询参数和 hash
            navigate(`/dictionary/${selectedEntrySlug}${location.search}${location.hash}`, { replace: true });
        }
    }, [selectedEntrySlug]);

    // --- Effect: URL hash 变化时滚动到对应 sense ---
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.slice(1); // 去掉 #
            // 延迟等待 DOM 渲染完成
            const timer = setTimeout(() => {
                const el = document.getElementById(id);
                if (el) {
                    const mainContent = document.querySelector('main.flex-1');
                    if (mainContent) {
                        const elRect = el.getBoundingClientRect();
                        const containerRect = mainContent.getBoundingClientRect();
                        mainContent.scrollTo({
                            top: mainContent.scrollTop + elRect.top - containerRect.top - 20,
                            behavior: 'smooth'
                        });
                    }
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [location.hash, selectedEntrySlug]);


    // --- 事件处理器 (UI) ---
    const toggleGlobalEditMode = useCallback(() => setIsGlobalEditMode((prev) => !prev), []);
    const toggleLeftPanel = useCallback(() => setIsWordListOpen((prev) => !prev), []);
    const toggleRightPanel = useCallback(() => setIsTreeOpen((prev) => !prev), []);

    // 1. 更新主词条字段 (Word, Transliteration)
    const handleUpdateEntry = useCallback((payload) => {
        if (!selectedEntry) return;

        // Payload 包含要更新的主字段，如 { word: '新词', transliteration: 'xin ci' }
        const updatedEntry = {
            ...selectedEntry,
            ...payload
        };

        // 如果 word 变更了，重算 slug
        if (payload.word && payload.word !== selectedEntry.word) {
            updatedEntry.slug = wordToSlug(payload.word);
        }

        handleEntryChange(updatedEntry);
        console.log("Main entry fields updated locally. Press save (Ctrl+S) to commit.");

    }, [selectedEntry, handleEntryChange]);

    // 2. 更新单个义项 (Sense) 字段
    const handleUpdateSense = useCallback((senseId, payload) => {
        if (!selectedEntry) return;

        const newSenses = selectedEntry.senses.map(sense => {
            if (sense.sense_id === senseId) {
                // 合并新的字段 (payload 可能是 { tags: [...] } 或 { description: '...' })
                return {
                    ...sense,
                    ...payload
                };
            }
            console.log(`触发成功${payload}`);
            return sense;
        });

        const updatedEntry = {
            ...selectedEntry,
            senses: newSenses
        };

        handleEntryChange(updatedEntry);
        console.log(`Sense #${senseId} updated locally. Press save (Ctrl+S) to commit.`);

    }, [selectedEntry, handleEntryChange]);


    // 3. 创建新词条 — 打开模态框
    const handleCreateNewEntry = useCallback(() => {
        if (!projectId) return;
        if (isReadOnly) { alert('需要授权码才能创建词条'); return; }
        setNewEntryWord('');
        setNewEntryTranslit('');
        setShowNewEntryModal(true);
    }, [projectId, isReadOnly]);

    // 3b. 模态框确认 — 实际提交
    const handleSubmitNewEntry = useCallback(async () => {
        const word = newEntryWord.trim();
        if (!word) return;

        const transliteration = newEntryTranslit.trim() || word;

        const newEntryData = {
            word,
            transliteration,
            senses: [
                {
                    sense_id: 1,
                    displayed_tag: "new",
                    ipa: "ˈfɪl.ər",
                    description: "（请编辑义项描述）",
                    definitions: [{ text: "（请编辑释义内容）", examples: ["（请编辑例句）"] }],
                    tags: ["待编辑"],
                    derived_from: [],
                    derived_to: [],
                    chart_type: "",
                    table_data: []
                }
            ]
        };

        setShowNewEntryModal(false);

        try {
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries`, {
                    method: 'POST',
                    headers: getAuthHeaders(projectId),
                    body: JSON.stringify(newEntryData),
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to create new entry after retries.');
                }
            }
            if (response.status === 401) {
                alert('需要授权码才能创建词条');
                return;
            }
            if (!response.ok) throw new Error('Failed to create new entry.');

            const createdEntry = await response.json();
            await fetchEntries(false);
            setSelectedEntrySlug(createdEntry.slug);
            console.log("New entry created successfully:", createdEntry);
        } catch (error) {
            console.error('Error creating new entry:', error);
            alert('创建词条失败！请检查后端服务是否运行。');
        }
    }, [newEntryWord, newEntryTranslit, projectId, fetchEntries]);


    // 7. 删除词条 (DELETE)
    const handleDeleteEntry = async (slugToDelete, word) => {
        if (!projectId || !slugToDelete) return;
        if (isReadOnly) { alert('需要授权码才能删除词条'); return; }

        // ⛔ 替换 window.confirm 为自定义 UI
        if (!window.confirm(`你确定要删除词条 "${word}" 吗？此操作不可撤销。`)) {
            return;
        }

        console.log(`Attempting to delete entry: ${slugToDelete}`);
        try {
            // ... (API 调用和重试逻辑保持不变)
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries/${slugToDelete}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(projectId),
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to delete entry after retries.');
                }
            }
            if (response.status === 401) {
                alert('需要授权码才能删除词条');
                return;
            }
            if (!response.ok) throw new Error('Failed to delete entry.');


            // 成功后重新获取数据以正确更新树状结构和选中状态
            await fetchEntries();

            console.log("Entry deleted successfully");

        } catch (error) {
            console.error("Delete failed:", error);
            console.error('删除失败！');
        }
    };

    // 8. 添加义项 (只修改本地状态)
    const handleAddSense = () => {
        if (!selectedEntry) return;
        if (isReadOnly) { alert('需要授权码才能编辑'); return; }

        // 找到当前义项的最大 ID 并加 1
        const currentMaxId = (selectedEntry.senses || []).reduce((max, s) => {
            return Math.max(max, s.sense_id || 0);
        }, 0);
        const newSenseId = currentMaxId + 1;

        const newSenseTemplate = {
            sense_id: newSenseId,
            displayed_tag: "new",
            ipa: "ˈfɪl.ər",
            derived_from: [],
            description: "（请编辑义项描述）",
            tags: ["待编辑"],
            definitions: [{ text: "（请编辑释义内容）", examples: ["（请编辑例句）"] }],
            chart_type: "",
            table_data: [],
            derived_to: []
        };

        const updatedEntry = {
            ...selectedEntry,
            senses: [...(selectedEntry.senses || []), newSenseTemplate]
        };

        handleEntryChange(updatedEntry);
        console.log(`Sense #${newSenseId} added locally. Press save (Ctrl+S) to commit.`);
    };

    // 9. 删除义项 (只修改本地状态)
    const handleDeleteSense = (senseIdToDelete) => {
        if (!selectedEntry || !senseIdToDelete) return;
        if (isReadOnly) { alert('需要授权码才能删除义项'); return; }

        // ⛔ 替换 window.confirm 为自定义 UI
        if (!window.confirm("你确定要删除这个义项吗？(需要保存后生效)")) {
            return;
        }

        const updatedEntry = {
            ...selectedEntry,
            senses: selectedEntry.senses.filter(s => s.sense_id !== senseIdToDelete)
        };

        handleEntryChange(updatedEntry);
        console.log("Sense deleted locally. Press save (Ctrl+S) to commit.");
    };


    // --- (*** 新增：处理 SearchBar 的”点击跳转” ***) ---
    const handleSearchSelect = useCallback((lemma) => {
        // SearchBar 返回的是 lemma (字符串)
        // 我们用 dictionaryMap 查找对应的 entry
        const selected = dictionaryMap[lemma];

        if (selected && selected.slug) {
            // 找到了！调用 setSelectedEntrySlug 来实现”跳转”
            setSelectedEntrySlug(selected.slug);
            // 确保左侧列表是打开的，以便用户看到高亮
            setIsWordListOpen(true);
        } else {
            console.warn(`Search selection failed: Lemma “${lemma}” not found in dictionaryMap.`);
        }
    }, [dictionaryMap]); // 依赖 dictionaryMap

    const addDefinition = useCallback(() => {
        if (!selectedEntry) return;
        // ... (Definition adding logic should be here) ...
        console.log("Adding new definition for:", selectedEntrySlug);
    }, [selectedEntrySlug, selectedEntry]);


    // --- 快捷键 Hook 调用 ---
    useShortcuts({
        editingSection,
        saveDefinitions, // 使用新的快捷键保存函数
        saveTempEdit,
        addDefinition,
        scrollToTop: () => entryEditorRef.current?.scrollToTop()
    });

    // --- 渲染 ---
    return (
        <div className="flex flex-col h-screen antialiased bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors">

            {/* 1. 顶部栏 */}
            <Header
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                isGlobalEditMode={isGlobalEditMode}
                toggleGlobalEditMode={toggleGlobalEditMode}
                isWordListOpen={isWordListOpen}
                toggleLeftPanel={toggleLeftPanel}
                isTreeOpen={isTreeOpen}
                toggleRightPanel={toggleRightPanel}
                customFont={customFont}
                setCustomFont={setCustomFont}
                isFontInputVisible={isFontInputVisible}
                setIsFontInputVisible={setIsFontInputVisible}
                entries={entries}
                onSearchSelect={handleSearchSelect}
                buttonVisibility={buttonVisibility}
            />

            {/* 2. 主内容区 (3 栏布局) */}
            <div className="flex flex-1 overflow-hidden pt-14">

                {/* 左侧栏 */}
                {fetchError ? (
                    <div className="w-full sm:w-64 p-4 border-r border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center gap-2">
                        <span className="text-red-600 dark:text-red-400 text-sm text-center">{fetchError}</span>
                        <button onClick={() => fetchEntries()} className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">重试</button>
                    </div>
                ) : (
                <WordList
                    entries={flatTreeEntries}
                    selectedEntrySlug={selectedEntrySlug}
                    onSelect={setSelectedEntrySlug}
                    isOpen={isWordListOpen}
                    onDeleteEntry={handleDeleteEntry}
                    onAddNewEntry={handleCreateNewEntry}
                />
                )}

                {/* 中间编辑区 */}
                <EntryEditor
                    ref={entryEditorRef}
                    entry={selectedEntry}
                    isGlobalEditMode={isGlobalEditMode}
                    setEditingSection={setEditingSection}
                    onUpdateEntry={handleUpdateEntry}
                    onUpdateSense={handleUpdateSense}
                    dictionaryMap={dictionaryMap}
                    onLinkClick={handleLinkClick}
                    docHeadingsMap={docHeadingsMap}
                />

                {/* 右侧导航栏 */}
                <HierarchyTree
                    entry={selectedEntry}
                    isOpen={isTreeOpen}
                    onAddSense={handleAddSense}
                    onDeleteSense={handleDeleteSense}
                />
            </div>

            {/* 底部状态栏 */}
            <div className={clsx(
                    'fixed bottom-0 left-0 p-1.5 text-xs text-white rounded-tr-lg flex items-center gap-2 z-[100]',
                    isReadOnly ? 'bg-red-600' : hasLocalChanges ? 'bg-yellow-600' : 'bg-green-600'
                )}>
                <span>
                    {isReadOnly ? '访客（只读）' : hasLocalChanges ? '未保存' : '已保存'}
                </span>
                {authLevel && (
                    <span className="opacity-80">| {authLevel === 'admin' ? '管理员' : '编辑者'}</span>
                )}
            </div>

            {/* 新建词条模态框 */}
            {showNewEntryModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowNewEntryModal(false)}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                        <div className="px-6 pt-6 pb-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">新建词条</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">填写词形和音译以创建新词条</p>
                        </div>

                        <div className="px-6 py-4 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    词形 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newEntryWord}
                                    onChange={(e) => {
                                        setNewEntryWord(e.target.value);
                                        if (!newEntryTranslit || newEntryTranslit === newEntryWord) {
                                            setNewEntryTranslit(e.target.value);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newEntryWord.trim()) handleSubmitNewEntry();
                                        if (e.key === 'Escape') setShowNewEntryModal(false);
                                    }}
                                    placeholder="输入词形 (Lemma)..."
                                    autoFocus
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    音译 / 转写
                                </label>
                                <input
                                    type="text"
                                    value={newEntryTranslit}
                                    onChange={(e) => setNewEntryTranslit(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newEntryWord.trim()) handleSubmitNewEntry();
                                        if (e.key === 'Escape') setShowNewEntryModal(false);
                                    }}
                                    placeholder="输入音译 (默认同词形)..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewEntryModal(false)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmitNewEntry}
                                disabled={!newEntryWord.trim()}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                            >
                                创建词条
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default DictionaryPage;