import React, {useRef, useImperativeHandle, forwardRef, useState} from 'react';
import EntryDisplay from './EntryDisplay.jsx'; // 导入 EntryDisplay - 修复：添加 .jsx 扩展名以确保解析

const EntryEditor = forwardRef(({
        entry,
        isGlobalEditMode,
        onUpdateEntry,
        onUpdateSense,
        dictionaryMap,
        onLinkClick,
        docHeadingsMap,
    }, ref) => {

    // 1. **状态管理**：用于存储在全局编辑模式下 textarea 中的 JSON 字符串
    // 当 entry 变化时，初始化 state。
    const [jsonText, setJsonText] = useState(() => JSON.stringify(entry, null, 2));

    // 当 entry prop 变化时，同步更新 jsonText state，确保显示的是最新的词条
    React.useEffect(() => {
        if (entry) {
            setJsonText(JSON.stringify(entry, null, 2));
        }
    }, [entry]);


    const mainRef = useRef(null);

    useImperativeHandle(ref, () => ({
    scrollToTop() {
      if (mainRef.current) {
        mainRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    },
}));

    // 状态：用于显示保存或解析错误信息
    const [saveStatus, setSaveStatus] = useState({
        message: '',
        type: '' // 'success' 或 'error'
    });

    /**
     * **保存逻辑**：处理 JSON 文本解析和调用 onUpdateEntry
     */
    const handleGlobalSave = () => {
        setSaveStatus({ message: '', type: '' }); // 清除旧状态
        try {
            // 尝试将文本解析为 JavaScript 对象
            const newEntry = JSON.parse(jsonText);

            // 确保解析结果是一个有效的对象
            if (typeof newEntry !== 'object' || newEntry === null) {
                throw new Error("解析后的内容不是一个有效的对象。");
            }

            // 调用父组件的更新函数
            onUpdateEntry(newEntry);

            // 显示成功消息
            setSaveStatus({
                message: '词条已成功保存！',
                type: 'success'
            });

        } catch (error) {
            // 显示错误消息
            setSaveStatus({
                message: `保存失败：JSON 格式错误。${error.message}`,
                type: 'error'
            });
            console.error("JSON 解析错误:", error);
        }
    };


  if (!entry) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors">
        <p className="text-gray-500 dark:text-gray-400 text-lg">请从左侧选择一个词条进行查看或编辑。</p>
      </div>
    );
  }

  // Edit Mode: Simple full-text editor displaying the structured JSON
  const EditView = (
    <div className="p-8 min-h-full rounded-lg shadow-inner bg-gray-100 dark:bg-gray-900 transition-colors">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white font-word">{entry.word}</h1>
      <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
        全局编辑模式将当前词条简化为结构化 JSON 文本区。
      </p>
      <textarea
        // 2. 使用 value 和 onChange 控制输入
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        rows="25"
        className="w-full p-4 border border-yellow-400 rounded-lg text-gray-800 dark:text-white font-mono text-sm shadow-md scrollbar-custom bg-yellow-50 dark:bg-yellow-900/30"
      />

      {/* 状态反馈区域 */}
      {saveStatus.message && (
        <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
            saveStatus.type === 'success' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-400'
        }`}>
          {saveStatus.message}
        </div>
      )}

      {/* 3. 绑定保存函数 */}
      <button
        onClick={handleGlobalSave}
        className="mt-4 px-6 py-2 text-base font-semibold bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-all shadow-lg"
      >
        保存全部更改
      </button>
    </div>
  );

  return (
    <main
        ref={mainRef}
        className="relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-custom bg-white dark:bg-gray-900 transition-colors scroll-smooth">
        {isGlobalEditMode ? EditView : <EntryDisplay
            entry={entry}
            onUpdateEntry={onUpdateEntry}
            onUpdateSense={onUpdateSense}
            dictionaryMap={dictionaryMap}
            onLinkClick={onLinkClick}
            docHeadingsMap={docHeadingsMap}
        />}
    </main>
  );
});

export default EntryEditor;