import React, { useState, useCallback, useEffect } from 'react';
import SenseDisplay from './SenseDisplay'; // 导入 SenseDisplay

// (假设) onUpdateSense 是从父组件传递下来的
const EntryDisplay = ({ entry, onUpdateEntry, onUpdateSense }) => {

    // --- 状态管理 ---
    const [editingSection, setEditingSection] = useState(null); // 'mainWord'
    const [editingWordData, setEditingWordData] = useState(null); // { word, transliteration }

    const isEditingMainWord = editingSection === 'mainWord';

    // --- 样式定义 ---
    // 从 SenseDisplay 复制过来的样式，用于保持表单外观一致
    const formWrapperClass = "space-y-4 p-4 border border-yellow-400 rounded-lg bg-yellow-50 dark:bg-yellow-900/20";
    const formInputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-gray-800 dark:text-white dark:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
    const formLabelClass = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

    // 原始样式
    const editableClasses = "group p-3 rounded-xl transition-shadow duration-200 cursor-context-menu";
    const activeClasses = "p-4 rounded-xl -m-3 shadow-2xl ring-2 ring-blue-400"; // 激活时使用蓝色外框

    // --- 事件处理 ---

    // 取消编辑
    const handleCancel = useCallback(() => {
        setEditingSection(null);
        setEditingWordData(null);
    }, []);

    // 保存主词条
    const handleSave = useCallback(() => {
        if (onUpdateEntry && editingWordData) {
            // 调用父组件的更新函数
            onUpdateEntry(editingWordData);
        }
        handleCancel(); // 退出编辑模式
    }, [onUpdateEntry, editingWordData, handleCancel]);

    // 右键单击主词条区域
    const handleMainWordContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isEditingMainWord) {
            // 如果已经在编辑，则取消
            handleCancel();
        } else {
            // 开始编辑
            setEditingSection('mainWord');
            // 初始化表单数据
            setEditingWordData({
                word: entry.word,
                transliteration: entry.transliteration,
            });
        }
    };

    // 处理表单输入变化
    const handleWordDataChange = (field, value) => {
        setEditingWordData(prev => ({ ...prev, [field]: value }));
    };



    // --- 键盘快捷键 (仅在编辑主词条时激活) ---
    useEffect(() => {
        if (!isEditingMainWord) return;

        const handleKey = (e) => {
            // 捕捉 Enter 键 (不带 Shift，因为 Shift+Enter 通常用于换行)
            if (e.key === 'Enter' && !e.shiftKey) {
                // 阻止默认的表单提交行为
                e.preventDefault();
                handleSave();
            }
            // 捕捉 Escape 键
            else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        // 绑定到 document，确保在输入框内也能捕获
        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('keydown', handleKey);
        };
    }, [isEditingMainWord, handleSave, handleCancel]);


    return (
        <div className="wordEntry p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-900 rounded-lg shadow-xl font-serif text-gray-800 dark:text-gray-200 transition-colors min-h-full">

            {/* Word Header - Main Display */}
            <div
                className={`wordHeader ${editableClasses} ${isEditingMainWord ? activeClasses : ''}`}
                onContextMenu={handleMainWordContextMenu}
                title="右键编辑主词条 (Word & Transliteration)"
            >
                {isEditingMainWord && editingWordData ? (
                    // 变更：编辑视图 (表单模式)
                    <div className="w-full">
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">编辑主词条 / 转写</h3>
                        <div className={formWrapperClass}>
                            {/* Word Input */}
                            <div>
                                <label htmlFor="main-word" className={formLabelClass}>主词条 (Word)</label>
                                <input
                                    id="main-word"
                                    type="text"
                                    className={formInputClass}
                                    value={editingWordData.word}
                                    onChange={(e) => handleWordDataChange('word', e.target.value)}
                                />
                            </div>

                            {/* Transliteration Input */}
                            <div>
                                <label htmlFor="main-translit" className={formLabelClass}>转写 (Transliteration)</label>
                                <input
                                    id="main-translit"
                                    type="text"
                                    className={formInputClass}
                                    value={editingWordData.transliteration}
                                    onChange={(e) => handleWordDataChange('transliteration', e.target.value)}
                                />
                            </div>

                            {/* Save/Cancel Buttons */}
                            <div className='flex gap-2 mt-4 pt-4 border-t border-gray-300 dark:border-gray-600'>
                                <button onClick={handleSave} className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors shadow-sm" title="按 Enter 保存">
                                    保存
                                </button>
                                <button onClick={handleCancel} className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors shadow-sm" title="按 Escape 取消">
                                    取消
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Display View
                    <div className="flex flex-wrap items-end gap-x-4">
                        <h2
                            className="text-5xl font-extrabold text-blue-600 dark:text-blue-400 font-word"
                        >
                            {entry.word}
                        </h2>
                        <p className="text-xl text-gray-500 dark:text-gray-400">
                            &lt;{entry.transliteration}&gt;
                        </p>
                    </div>
                )}
            </div>
            <hr className="m-2 -translate-y-2 border-blue-200 dark:border-blue-900"/>
            {/* Senses List */}
            <>
                {entry.senses.map((sense) => (
                <SenseDisplay
                    key={sense.sense_id}
                    sense={sense}
                    entryWord={entry.word}
                    entryTransliteration={entry.transliteration}
                    onUpdateSense={onUpdateSense}
                />
            ))}
            </>
        </div>
    );
};

export default EntryDisplay;