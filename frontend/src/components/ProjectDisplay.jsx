import React from 'react';
import clsx from 'clsx';

// --- 依赖的图标 (保持不变) ---
const Clock = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const HardDrive = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.14 4H7.86a2 2 0 0 0-2.41 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="18" y1="16" x2="18.01" y2="16"/></svg>;
const FileText = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;

// --- 依赖的常量 (假设已导入) ---
const PERMISSIONS = { UNAUTHORIZED: '未授权', AUTHORIZED: '已授权', CREATOR: '创建者' };
const PROJECT_CONFIG = { creator: "UserA (创建者)", created_date: "2024-09-15" };
const FILE_CARDS_DATA = [
    { name: "项目文档 (doc.md)", type: "document", extension: ".md", fileId: 101, path: "/docs",
        icon: FileText,
        lastEditTime: "2025-10-25 10:30",
        fileSize: "5.2 MB"
    },
    { name: "词典数据 (dictionary.xlsx)", type: "dictionary", extension: ".xlsx", fileId: 202, path: "/dictionary",
        icon: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21.4 15.82a24.16 24.16 0 0 0-4.6-2.5 13.5 13.5 0 0 0-6.8 0 24.16 24.16 0 0 0-4.6 2.5"/><path d="M12 21V3"/><path d="M2 12h20"/><path d="M19 19H5c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2z"/></svg>,
        lastEditTime: "2025-10-26 15:00",
        fileSize: "128 KB"
    }
];

// --- 权限操作子组件 ---
const AuthControl = React.memo(({ isAuthorized, authInput, setAuthInput, handleAuthorize }) => {
    if (!isAuthorized) {
        // 未授权状态: 显示授权输入
        return (
            <div className="flex space-x-2 mt-2 w-full md:w-auto">
                <input
                    type="password"
                    placeholder="输入授权码..."
                    value={authInput}
                    onChange={(e) => setAuthInput(e.target.value)}
                    className="flex-grow md:flex-none px-3 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 w-full md:w-40 text-sm focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <button
                    onClick={handleAuthorize}
                    className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition shadow flex-shrink-0"
                >
                    获取权限
                </button>
            </div>
        );
    }
    // 已授权状态: 显示成功信息
    return (
        <div className="text-sm text-green-600 dark:text-green-400 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mt-2 md:mt-0">
            权限已验证。
        </div>
    );
});


// --- FileCard Component (保持不变，但优化了文件名解析) ---
const FileCard = React.memo(({ file, permission, handleAction }) => {
    const Icon = file.icon;
    const isUnauthorized = permission === PERMISSIONS.UNAUTHORIZED;

    const actionClass = 'w-full py-2 rounded-lg font-medium transition text-sm shadow';

    let enterButtonText = '进入预览';
    let enterButtonClass = 'bg-gray-400 text-white hover:bg-gray-500';

    if (!isUnauthorized) {
        enterButtonText = file.type === 'dictionary' ? '进入编辑' : '进入编辑/预览';
        enterButtonClass = 'bg-green-500 text-white hover:bg-green-600';
    }

    // 优化文件名和扩展名提取逻辑：匹配 (xxx.ext) 格式
    const match = file.name.match(/^(.*?)\s*(\(.*?\))$/);
    const title = match ? match[1].trim() : file.name;
    const extensionDisplay = match ? match[2] : '';

    return (
        <div className="flex flex-col p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-6 mb-6">
                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shadow-inner">
                    <Icon className="w-10 h-10"/>
                </div>
                <div className="flex flex-col justify-between flex-grow">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 flex flex-wrap items-baseline">
                        <span>{title}</span>
                        {extensionDisplay && (
                            <span className="ml-2 text-sm italic font-medium text-gray-500 dark:text-gray-400">
                                {extensionDisplay}
                            </span>
                        )}
                    </h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-gray-400 dark:text-gray-500"/>
                            <span>最后编辑: {file.lastEditTime}</span>
                        </p>
                        <p className="flex items-center">
                            <HardDrive className="w-3 h-3 mr-1 text-gray-400 dark:text-gray-500"/>
                            <span>文件大小: {file.fileSize}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col space-y-3 pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={() => handleAction('enter', file.fileId, file.path)}
                    className={clsx(actionClass, enterButtonClass)}
                    title={!isUnauthorized ? '进入编辑/预览页面' : '进入只读预览页面'}
                >
                    {enterButtonText}
                </button>
                {permission === PERMISSIONS.CREATOR && (
                    <div className="grid grid-cols-2 gap-3">
                         <button
                            onClick={() => handleAction('upload', file.fileId)}
                            className={clsx(actionClass, 'bg-yellow-500 text-white hover:bg-yellow-600')}
                            title="上传新文件或更新现有文件"
                        >
                            上传
                        </button>
                        <button
                            onClick={() => handleAction('download', file.fileId)}
                            className={clsx(actionClass, 'bg-blue-500 text-white hover:bg-blue-600')}
                            title="下载当前文件"
                        >
                            下载
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});


// --- ProjectDisplay Component Definition (主内容组件定义) ---
const ProjectDisplay = React.memo(({
    currentProject,
    permission,
    statusClasses,
    isCreator,
    authInput,
    setAuthInput,
    handleAuthorize,
    handleCardAction,
    handleDeleteProject,
    PERMISSIONS
}) => {
    const isAuthorized = permission !== PERMISSIONS.UNAUTHORIZED;

    return (
        // ❌ 移除最外层 main 上的 overflow-y-auto，将滚动交给父组件控制
        <main className="flex-grow space-y-8 p-4 md:p-8">

            {/* 1. 项目信息和授权区域 */}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">

                {/* 容器: 小屏幕 flex-col / md 屏幕 flex-row */}
                <div className="flex flex-col md:flex-row md:items-stretch space-y-4 md:space-y-0 md:space-x-6">

                    {/* A. 图像 + 元信息 */}
                    <div className="flex items-start space-x-6 flex-grow">

                        {/* 1.1 项目封面占位符 */}
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 dark:text-gray-400 text-sm">项目封面</span>
                        </div>

                        {/* 1.2 项目元信息 */}
                        <div className="flex-grow">
                            <h2 className="text-3xl font-bold mb-2">{currentProject}</h2>
                            <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                                <p>创建者: <span className="font-medium text-gray-800 dark:text-gray-200">{PROJECT_CONFIG.creator}</span></p>
                                <p>创建日期: {PROJECT_CONFIG.created_date}</p>
                            </div>
                        </div>
                    </div>

                    {/* B. 权限操作区域 */}
                    <div className={clsx(
                        // 修正：移除 min-w-48，在小屏幕上左对齐，大屏幕上右对齐
                        "flex flex-col items-start md:items-end justify-between w-full md:w-auto",
                        "pt-4 md:pt-0 border-t md:border-t-0 border-gray-200 dark:border-gray-700"
                    )}>

                        {/* 顶部: 状态和删除按钮 */}
                        <div className="flex flex-col items-start md:items-end w-full space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                当前项目权限:
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${statusClasses}`}>{permission}</span>
                            </p>

                            {/* 创建者删除按钮 */}
                            {isCreator && (
                                <button
                                    onClick={handleDeleteProject}
                                    className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition shadow-md w-full md:w-auto" // 修复：小屏幕下按钮占满宽度
                                    title="删除整个项目"
                                >
                                    删除项目
                                </button>
                            )}
                        </div>

                        {/* 底部: 授权输入/成功信息 (使用提取的子组件) */}
                        <AuthControl
                            isAuthorized={isAuthorized}
                            authInput={authInput}
                            setAuthInput={setAuthInput}
                            handleAuthorize={handleAuthorize}
                        />
                    </div>
                </div>
            </div>

            {/* 2. 文件卡片区域 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {FILE_CARDS_DATA.map((file) => (
                    <FileCard
                        key={file.fileId}
                        file={file}
                        permission={permission}
                        handleAction={handleCardAction}
                    />
                ))}
            </div>
        </main>
    );
});

export default ProjectDisplay;