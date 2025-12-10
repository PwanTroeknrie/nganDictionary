import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// 导入所有子组件
import Header from '../components/Header.jsx';
import WordList, { buildTreeData, flattenTree } from '../components/WordList';
import EntryEditor from '../components/EntryEditor';
import HierarchyTree from '../components/HierarchyTree';

// 导入所有Hook函数
import { useShortcuts } from '../hooks/useShortcuts';

// 定义 API 的基础 URL
const API_BASE_URL = 'http://127.0.0.1:5000/api/projects';

/**
 * 词典页面组件
 * @param {object} props
 * @param {string} props.projectId - 当前选定的项目ID
 * (其他 props 略)
 */
function DictionaryPage({ projectId, isDarkMode, toggleTheme, customFont, setCustomFont }) {
    // --- 状态管理 ---
    const [entries, setEntries] = useState([]); // 原始的扁平列表数据
    const [selectedEntryId, setSelectedEntryId] = useState(null);

    const [editingSection, setEditingSection] = useState(null);
    const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
    const [isWordListOpen, setIsWordListOpen] = useState(true);
    const [isTreeOpen, setIsTreeOpen] = useState(true);
    const [isFontInputVisible, setIsFontInputVisible] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // 追踪本地是否有未保存的修改 (仅针对当前 selectedEntryId)
    const [hasLocalChanges, setHasLocalChanges] = useState(false);

    // --- Ref 绑定 ---
    const entryEditorRef = useRef(null);
    // 关键 Ref: 用于存储最新的被修改的词条对象，以便在 Entry 切换或卸载时进行保存
    const lastModifiedEntryRef = useRef(null);

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
            setSelectedEntryId(null);
            return;
        }

        try {
            // 增加指数退避逻辑
            let response;
            for (let i = 0; i < 3; i++) { // 尝试最多 3 次
                response = await fetch(`${API_BASE_URL}/${projectId}/entries`);
                if (response.ok) break;
                if (response.status === 404 && i === 0) { // 首次 404 尝试初始化
                    await initSampleData(projectId);
                    // 继续下一次循环，重新尝试获取数据
                    await new Promise(resolve => setTimeout(resolve, 500)); // 略微等待
                    continue;
                }
                if (i < 2) { // 如果不是最后一次尝试，等待并重试
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Network response was not ok after retries.');
                }
            }

            if (!response.ok) {
                throw new Error('Failed to fetch entries.');
            }

            const data = await response.json();
            setEntries(data);

            // 如果设置了 selectFirst 并且没有选中词条，则选中第一个
            if (data.length > 0 && selectFirst) {
                // 保持当前选中，如果当前选中的已被删除或不存在，则选中第一个
                if (!data.some(e => e.id === selectedEntryId)) {
                    setSelectedEntryId(data[0].id);
                }
            } else if (data.length === 0) {
                setSelectedEntryId(null);
            }
        } catch (error) {
            console.error("Failed to fetch entries:", error);
        }
    }, [projectId, selectedEntryId]);

    // 初始化示例数据 (用于首次加载或空项目)
    const initSampleData = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}/init-sample`, { method: 'POST' });
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
    }, [projectId, fetchEntries]);


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

    // 获取选中的词条对象
    const selectedEntry = useMemo(
        () => entries.find((e) => e.id === selectedEntryId),
        [entries, selectedEntryId]
    );

    // 负责将修改后的词条对象更新到本地状态 (entries) 中
    const handleEntryChange = useCallback((updatedEntry) => {
        setEntries(prevEntries =>
            prevEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
        );
        if (updatedEntry.id === selectedEntryId) {
            setHasLocalChanges(true);
            // 每次修改都将最新的未保存数据存入 Ref
            lastModifiedEntryRef.current = updatedEntry;
        }
    }, [selectedEntryId]);

    // 4. 核心保存函数 (PUT) - 提交指定的词条对象到 API
    const commitEntrySave = useCallback(async (entryToSave, isCleanup = false) => {
        if (!projectId || !entryToSave) {
            return false;
        }

        console.log(`[Save] Committing entry: ${entryToSave.word} (ID: ${entryToSave.id})`);

        const entryId = entryToSave.id;

        try {
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries/${entryId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entryToSave),
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to save entry after retries.');
                }
            }

            if (!response.ok) throw new Error('Failed to save entry.');

            const updatedEntry = await response.json();

            // 如果保存的是当前选中的词条，则清除本地修改标记
            if (entryId === selectedEntryId) {
                 setHasLocalChanges(false);
                 lastModifiedEntryRef.current = null; // 清除 Ref
            }

            // 更新本地 entries 状态
            setEntries(prevEntries =>
                prevEntries.map(e => e.id === entryId ? updatedEntry : e)
            );

            console.log(`[Save] Successful commit for ID: ${entryId}`);
            return true;

        } catch (error) {
            console.error(`[Save] Failed commit for ID: ${entryId}:`, error);
            console.error('保存失败！');
            return false;
        }
    }, [projectId, selectedEntryId]); // 依赖 selectedEntryId 用于正确清除 hasLocalChanges

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
    }, [projectId, selectedEntryId, saveIfDirty]);


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


    // 3. 创建新词条 (POST)
    const handleCreateNewEntry = useCallback(async () => {
        if (!projectId) return;

        // ⛔ 替换 window.prompt 为自定义 UI，这里暂时使用原生prompt
        const newWord = window.prompt("请输入新词条的词形 (Lemma):", "新词条");
        if (!newWord) return;

        // 基础新词条模板
        const newEntryData = {
            word: newWord,
            transliteration: newWord,
            senses: [
                {
                    sense_id: 1, // 初始 sense_id 为 1
                    displayed_tag: "new",
                    description: "新的义项描述",
                    definitions: [{ text: "新的释义", examples: [] }],
                    ipa: "", derived_from: [], tags: [], chart_type: "", table_data: [], derived_to: []
                }
            ]
        };

        try {
            // ... (API 调用和重试逻辑保持不变)
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEntryData),
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to create new entry after retries.');
                }
            }
            if (!response.ok) throw new Error('Failed to create new entry.');

            const createdEntry = await response.json();

            // 成功后重新加载数据并选中新词条
            await fetchEntries(false);
            setSelectedEntryId(createdEntry.id);

            console.log("New entry created successfully:", createdEntry);

        } catch (error) {
            console.error('Error creating new entry:', error);
            console.error('创建词条失败！请检查后端服务是否运行。');
        }
    }, [projectId, fetchEntries]);


    // 7. 删除词条 (DELETE)
    const handleDeleteEntry = async (idToDelete, word) => {
        if (!projectId || !idToDelete) return;

        // ⛔ 替换 window.confirm 为自定义 UI
        if (!window.confirm(`你确定要删除词条 "${word}" 吗？此操作不可撤销。`)) {
            return;
        }

        console.log(`Attempting to delete entry: ${idToDelete}`);
        try {
            // ... (API 调用和重试逻辑保持不变)
            let response;
            for (let i = 0; i < 3; i++) {
                response = await fetch(`${API_BASE_URL}/${projectId}/entries/${idToDelete}`, {
                    method: 'DELETE',
                });
                if (response.ok) break;
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    throw new Error('Failed to delete entry after retries.');
                }
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

        // 找到当前义项的最大 ID 并加 1
        const currentMaxId = (selectedEntry.senses || []).reduce((max, s) => {
            return Math.max(max, s.sense_id || 0);
        }, 0);
        const newSenseId = currentMaxId + 1;

        const newSenseTemplate = {
            sense_id: newSenseId,
            displayed_tag: "new",
            ipa: "",
            derived_from: [],
            description: "新的义项描述",
            tags: [],
            definitions: [{ text: "新的释义", examples: [] }],
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


    // --- (*** 新增：处理 SearchBar 的“点击跳转” ***) ---
    const handleSearchSelect = useCallback((lemma) => {
        // SearchBar 返回的是 lemma (字符串)
        // 我们用 dictionaryMap 查找对应的 entry
        const selected = dictionaryMap[lemma];

        if (selected && selected.id) {
            // 找到了！调用 setSelectedEntryId 来实现“跳转”
            setSelectedEntryId(selected.id);
            // 确保左侧列表是打开的，以便用户看到高亮
            setIsWordListOpen(true);
        } else {
            console.warn(`Search selection failed: Lemma "${lemma}" not found in dictionaryMap.`);
        }
    }, [dictionaryMap]); // 依赖 dictionaryMap

    const addDefinition = useCallback(() => {
        if (!selectedEntry) return;
        // ... (Definition adding logic should be here) ...
        console.log("Adding new definition for:", selectedEntryId);
    }, [selectedEntryId, selectedEntry]);


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
                <WordList
                    entries={flatTreeEntries}
                    selectedEntryId={selectedEntryId}
                    onSelect={setSelectedEntryId}
                    isOpen={isWordListOpen}
                    onDeleteEntry={handleDeleteEntry}
                    onAddNewEntry={handleCreateNewEntry}
                />

                {/* 中间编辑区 */}
                <EntryEditor
                    ref={entryEditorRef}
                    entry={selectedEntry}
                    isGlobalEditMode={isGlobalEditMode}
                    setEditingSection={setEditingSection}
                    onUpdateEntry={handleUpdateEntry}
                    onUpdateSense={handleUpdateSense}
                />

                {/* 右侧导航栏 */}
                <HierarchyTree
                    entry={selectedEntry}
                    isOpen={isTreeOpen}
                    onAddSense={handleAddSense}
                    onDeleteSense={handleDeleteSense}
                />
            </div>

            {/* 调试信息 (可选) */}
            <div className="fixed bottom-0 left-0 p-1 text-xs bg-red-700 text-white rounded-tr-lg" style={{ zIndex: 100 }}>
                {hasLocalChanges ? "UNSAVED CHANGES DETECTED" : "All changes saved"}
            </div>

        </div>
    );
}

export default DictionaryPage;