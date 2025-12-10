import React, { useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';

// --- 0. Icon Definitions (图标定义) ---
// Header Icons
const Sun = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></svg>;
const Moon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const Search = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const ListIcon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const Columns = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/><path d="M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>;
const Home = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const FileText = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
const Clock = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const HardDrive = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.14 4H7.86a2 2 0 0 0-2.41 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="18" y1="16" x2="18.01" y2="16"/></svg>;

// --- 1. Mock Data and Permission Mapping (模拟数据和权限映射) ---
const PROJECT_CONFIG = {
    name: "Alpha 项目",
    creator: "UserA (创建者)",
    created_date: "2024-09-15",
    auth_password: "123",  // 授权密码
    is_creator: true       // 模拟当前用户是创建者
};

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

// 权限常量
const PERMISSIONS = {
    UNAUTHORIZED: '未授权',
    AUTHORIZED: '已授权',
    CREATOR: '创建者'
};


// --- 2. App Header Component (固定头部) ---
const AppHeader = ({
    isDarkMode, toggleTheme,
    isLeftPanelOpen, toggleLeftPanel,
    isRightPanelOpen, toggleRightPanel,
    navigate,
    currentPermission,
    statusClasses
}) => {
    return (
        // Header 使用 fixed top-0, 确保其固定
        <header className="fixed top-0 left-0 w-full z-20 bg-white dark:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700 shadow-lg h-16">
            <div className="max-w-full mx-auto flex justify-between items-center p-4 h-full">

                {/* 左侧区域: 左侧面板开关 & 标题 & 搜索 */}
                <div className="flex items-center space-x-4">

                    {/* 左侧面板 (项目列表) 开关 */}
                    <button
                        onClick={toggleLeftPanel}
                        className={clsx(
                            "p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]",
                            isLeftPanelOpen
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                        )}
                        title="切换项目列表"
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>

                    {/* 标题 */}
                    <h1 className="text-2xl font-extrabold text-gray-800 dark:text-blue-400 items-center space-x-2 hidden md:flex">
                        <span className="text-3xl">🗂️</span>
                        <span className="text-xl italic font-semibold text-gray-600 dark:text-gray-400">项目管理中心</span>
                    </h1>

                    {/* 桌面端搜索栏 */}
                    <div className="relative hidden sm:block ml-8">
                        <input
                            type="text"
                            placeholder="搜索项目..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-64 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
                    </div>
                </div>


                {/* 右侧区域: 权限, 导航 & 主题开关 & 右侧面板开关 */}
                <div className="flex space-x-3 items-center">

                    {/* 权限状态 */}
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusClasses}`}>
                        {currentPermission}
                    </span>

                    {/* 导航到文档页面 */}
                    <button
                        onClick={() => navigate("/docs", 101)}
                        className="p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                        title="文档页面"
                    >
                        <FileText className="w-5 h-5" />
                    </button>

                    {/* 导航到词典页面 */}
                    <button
                        onClick={() => navigate("/dictionary", 202)}
                        className="p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                        title="词典页面"
                    >
                        <Home className="w-5 h-5" />
                    </button>

                    {/* 主题开关 */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-lg"
                        title="切换主题"
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* 右侧面板 (结构导航) 开关 */}
                    <button
                        onClick={toggleRightPanel}
                        className={clsx(
                            "p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]",
                            isRightPanelOpen
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                        )}
                        title="切换右侧面板"
                    >
                        <Columns className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 浮动搜索栏 (仅移动端) */}
            <div className="sm:hidden fixed top-16 left-0 right-0 px-4 pb-4 z-10">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="搜索项目..."
                        className="w-full pl-12 pr-4 py-3 rounded-2xl text-gray-900 dark:text-gray-300 dark:bg-gray-700/20 backdrop-blur-sm shadow-xl border border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 transition-all"
                    />
                    <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
                </div>
            </div>
        </header>
    );
};


// --- 3. Mock Navigation/Debug Hook (模拟导航/调试钩子) ---

// 模拟导航功能
const useNavigate = () => (path, fileId) => {
    console.log(`✅ 正在导航到编辑页: ${path}?file=${fileId}`);
    alert(`成功导航到 ${path}，操作文件 ID: ${fileId}`);
};

// 调试权限切换钩子
const useDebugPermission = (setPermission) => {
    useEffect(() => {
        window.setAppPermission = (level) => {
            const normalizedLevel = level.toUpperCase();
            // 根据英文键名查找对应的中文值
            const permValue = PERMISSIONS[Object.keys(PERMISSIONS).find(key => key.toUpperCase() === normalizedLevel)];

            if (permValue) {
                setPermission(permValue);
                console.log(`[DEBUG] 权限已切换到: ${permValue}`);
                alert(`[DEBUG] 权限已切换到: ${permValue}`);
            } else {
                console.error(`[DEBUG] 无效的权限级别: ${level}。请使用 ${Object.keys(PERMISSIONS).join(', ')}。`);
            }
        };

        console.log("--- 调试命令已启用 ---");
        console.log("在控制台输入命令切换权限视图，例如:");
        console.log(`setAppPermission('UNAUTHORIZED')`);
        console.log(`setAppPermission('AUTHORIZED')`);
        console.log(`setAppPermission('CREATOR')`);

        return () => {
            delete window.setAppPermission;
        };
    }, [setPermission]);
};


// --- 4. Reusable File Card Component (文件卡片组件) ---
const FileCard = React.memo(({ file, permission, handleAction }) => {
    const Icon = file.icon;
    const isUnauthorized = permission === PERMISSIONS.UNAUTHORIZED;

    const actionClass = 'w-full py-2 rounded-lg font-medium transition text-sm shadow';

    let enterButtonText = '进入预览';
    let enterButtonClass = 'bg-gray-400 text-white hover:bg-gray-500'; // 默认未授权颜色

    if (!isUnauthorized) {
        // 已授权/创建者状态: 绿色按钮，显示 "进入编辑"
        enterButtonText = file.type === 'dictionary' ? '进入编辑' : '进入编辑/预览';
        enterButtonClass = 'bg-green-500 text-white hover:bg-green-600';
    }

    // 逻辑上分离主标题和扩展名后缀
    const lastParenIndex = file.name.lastIndexOf('(');
    let title = file.name;
    let extensionDisplay = '';

    if (lastParenIndex !== -1 && file.name.endsWith(')')) {
        title = file.name.substring(0, lastParenIndex).trim();
        extensionDisplay = file.name.substring(lastParenIndex);
    }


    return (
        <div className="flex flex-col p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">

            {/* 顶部布局: 大图标 + 标题/状态 */}
            <div className="flex space-x-6 mb-6">

                {/* 左侧: 大图标区域 */}
                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-xl
                            bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shadow-inner">
                    <Icon className="w-10 h-10"/>
                </div>

                {/* 右侧: 标题和状态信息 */}
                <div className="flex flex-col justify-between flex-grow">

                    {/* 标题 */}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 flex flex-wrap items-baseline">
                        <span>{title}</span>
                        {extensionDisplay && (
                            <span className="ml-2 text-sm italic font-medium text-gray-500 dark:text-gray-400">
                                {extensionDisplay}
                            </span>
                        )}
                    </h3>

                    {/* 文件状态信息 (最后编辑时间和文件大小) */}
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

            {/* 按钮区域 */}
            <div className="flex flex-col space-y-3 pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
                {/* 1. 进入 (主要操作) - 始终可点击 (预览/编辑) */}
                <button
                    onClick={() => handleAction('enter', file.fileId, file.path)}
                    className={clsx(actionClass, enterButtonClass)}
                    title={!isUnauthorized ? '进入编辑/预览页面' : '进入只读预览页面'}
                >
                    {enterButtonText}
                </button>

                {/* 2. 上传/下载 (仅创建者) */}
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


// --- 5. Project List Panel Component (左侧项目列表边栏) ---
const ProjectListPanel = React.memo(({
    isOpen,
    currentProject,
    setCurrentProject,
    allProjects,
    togglePanel // 确保接收 togglePanel 用于移动端关闭
}) => {

    // 1. Scrim/Backdrop for mobile overlay (移动端背景遮罩)
    const Scrim = (
        <div
            className={clsx(
                // 仅在移动端显示遮罩 (sm:hidden)
                "fixed inset-0 bg-black/50 z-20 sm:hidden transition-opacity duration-300",
                {
                    'opacity-100 pointer-events-auto': isOpen,
                    'opacity-0 pointer-events-none': !isOpen,
                }
            )}
            onClick={togglePanel} // 点击外部关闭
        />
    );

    // 2. Panel 容器类：处理定位、宽度和高度约束 (保持原有的响应式逻辑)
    const containerClasses = clsx(
        "flex-shrink-0 z-30 transition-all duration-300",

        // 移动端 (fixed, 高度约束为视口高度减去 4rem header)
        "fixed top-16 left-0",
        {
            'w-full': isOpen,
            'w-0': !isOpen,
            'h-[calc(100vh-4rem)]': isOpen // 约束高度
        },

        // 桌面端 (sm+ relative, 占据 flex 容器的全部高度)
        "sm:relative sm:top-auto sm:left-auto sm:h-full",
        {
            'sm:w-64': isOpen,
            'sm:w-0': !isOpen,
        },
        // 背景和边框
        {
            'bg-gray-100 dark:bg-gray-800': isOpen,
            'sm:border-r sm:border-gray-200 sm:dark:border-gray-800': isOpen,
        }
    );

    // 3. 内部内容类：应用 padding, 溢出和可见性
    const contentClasses = clsx(
        // overflow-y-auto 实现独立的滚动条
        "h-full overflow-y-auto p-4 transition-opacity duration-300 scrollbar-custom",
        {
            'opacity-100 pointer-events-auto': isOpen,
            'opacity-0 pointer-events-none': !isOpen,
        }
    );

    return (
        <>
            {/* 遮罩 */}
            {Scrim}

            {/* 项目列表侧边栏 */}
            <aside className={containerClasses}>
                {isOpen && (
                    <div className={contentClasses}>
                        <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-600">
                            项目列表 ({allProjects.length}) 🗂️
                        </h2>

                        <button
                            type="button"
                            className="w-full bg-blue-500 text-white py-2 rounded-xl mb-4 hover:bg-blue-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            onClick={() => alert("模拟: 创建新项目")}
                        >
                            + 创建新项目
                        </button>

                        <ul className="space-y-1">
                            {allProjects.map(project => (
                                <li
                                    key={project}
                                    className={clsx(
                                        "p-3 rounded-xl cursor-pointer transition-colors shadow-sm flex items-center space-x-2 text-sm font-medium transform hover:scale-[1.01] truncate",
                                        // 应用用户请求的新样式
                                        project === currentProject
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    )}
                                    onClick={() => setCurrentProject(project)}
                                >
                                    <ListIcon className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{project}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </aside>
        </>
    );
});


// --- 6. Project Main Content Component (项目主内容区) ---
const ProjectMainContent = React.memo(({
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
        // 关键变化: 添加 overflow-y-auto 实现独立滚动
        <main className={clsx(
            "flex-grow p-8 space-y-8 overflow-y-auto"
        )}>

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
                        "flex flex-col items-start md:items-end justify-between min-w-48",
                        // 逻辑修复: 仅在布局堆叠 (md以下) 时显示分割线和顶部边距
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
                                    className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition shadow-md"
                                    title="删除整个项目"
                                >
                                    删除项目
                                </button>
                            )}
                        </div>

                        {/* 底部: 授权输入/成功信息 */}
                        {!isAuthorized ? (
                            // 未授权状态: 显示授权输入
                            <div className="flex space-x-2 mt-2">
                                <input
                                    type="password"
                                    placeholder="输入授权码..."
                                    value={authInput}
                                    onChange={(e) => setAuthInput(e.target.value)}
                                    className="px-3 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 w-40 text-sm focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                                <button
                                    onClick={handleAuthorize}
                                    className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition shadow"
                                >
                                    获取权限
                                </button>
                            </div>
                        ) : (
                            // 已授权状态: 显示成功信息
                            <div className="text-sm text-green-600 dark:text-green-400 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                权限已验证。
                            </div>
                        )}

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
            {/* 底部占位符已移除 */}
        </main>
    );
});


// --- 7. Main App Component (主应用组件) ---
export default function Homepage() {
    const navigate = useNavigate();

    // --- UI State (UI 状态) ---
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelToOpen] = useState(false);

    // --- Project/Permission State (项目/权限状态) ---
    const [currentProject, setCurrentProject] = useState(PROJECT_CONFIG.name);
    const [permission, setPermission] = useState(PERMISSIONS.UNAUTHORIZED);
    const [authInput, setAuthInput] = useState('');

    const isCreator = permission === PERMISSIONS.CREATOR;

    // 模拟所有项目列表
    const allProjects = ['Alpha 项目', 'Beta 项目', 'Gamma 项目'];


    useDebugPermission(setPermission);

    // --- Theme/Panel Toggle Logic (主题/面板切换逻辑) ---
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);
    const toggleLeftPanel = () => setIsLeftPanelOpen(prev => !prev);
    const toggleRightPanel = () => setIsRightPanelToOpen(prev => !prev);


    // --- Authorization Logic (授权逻辑) ---
    const handleAuthorize = () => {
        if (authInput === PROJECT_CONFIG.auth_password) {
            // 根据是否是创建者来设定权限
            const newPermission = PROJECT_CONFIG.is_creator ? PERMISSIONS.CREATOR : PERMISSIONS.AUTHORIZED;
            setPermission(newPermission);
            alert(`授权成功！当前权限: ${newPermission}`);
        } else {
            alert("授权码不正确，请重试。");
            setPermission(PERMISSIONS.UNAUTHORIZED);
        }
        setAuthInput('');
    };

    // --- Card Action Logic (卡片操作逻辑) ---
    const handleCardAction = useCallback((actionType, fileId, path) => {
        if (actionType === 'enter') {
             navigate(path, fileId);
             return;
        }

        if (actionType === 'upload' || actionType === 'download') {
            if (permission === PERMISSIONS.CREATOR) {
                 alert(`模拟执行 ${actionType} 文件操作: 文件 ID ${fileId}`);
            } else {
                 alert(`权限不足。只有创建者才能执行 ${actionType} 操作！`);
            }
            return;
        }

    }, [navigate, permission]);

    const handleDeleteProject = () => {
        if (!isCreator) return;
        console.log(`🚨 警告: 尝试删除整个项目 ${currentProject}`);
        alert(`警告: 模拟删除操作。项目 ${currentProject} 将被删除（在真实应用中请使用自定义模态框进行确认）`);
    };

    // 权限状态对应的 Tailwind CSS 类
    const statusClasses = {
        [PERMISSIONS.UNAUTHORIZED]: 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300',
        [PERMISSIONS.AUTHORIZED]: 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300',
        [PERMISSIONS.CREATOR]: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300',
    }[permission] || '';

    return (
        // 根容器: h-screen flex flex-col 实现固定头部和内容区的高度自动填充
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

            {/* 1. 顶部固定头部 */}
            <AppHeader
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                isLeftPanelOpen={isLeftPanelOpen}
                toggleLeftPanel={toggleLeftPanel}
                isRightPanelOpen={isRightPanelOpen}
                toggleRightPanel={toggleRightPanel}
                navigate={navigate}
                currentPermission={permission}
                statusClasses={statusClasses}
            />

            {/* 2. 主内容区域容器: flex-grow + mt-16 占据屏幕剩余高度，并启用水平 flex 布局 */}
            <div className="flex flex-grow overflow-hidden mt-16">

                {/* 左侧边栏: 项目列表面板 */}
                <ProjectListPanel
                    isOpen={isLeftPanelOpen}
                    currentProject={currentProject}
                    setCurrentProject={setCurrentProject}
                    allProjects={allProjects}
                    togglePanel={toggleLeftPanel}
                />

                {/* 项目主内容区（提取出的组件） */}
                <ProjectMainContent
                    currentProject={currentProject}
                    permission={permission}
                    statusClasses={statusClasses}
                    isCreator={isCreator}
                    authInput={authInput}
                    setAuthInput={setAuthInput}
                    handleAuthorize={handleAuthorize}
                    handleCardAction={handleCardAction}
                    handleDeleteProject={handleDeleteProject}
                    PERMISSIONS={PERMISSIONS}
                />

                {/* 右侧面板占位符 */}
                {/* 保持右侧面板的容器，但将其宽度设为 0，防止内容溢出 */}
                <div className={clsx("flex-shrink-0 transition-all duration-300",
                    isRightPanelOpen ? 'sm:w-64 w-full' : 'w-0',
                    isRightPanelOpen ? 'sm:border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800' : ''
                )}>
                    {isRightPanelOpen && (
                        <div className="h-full overflow-y-auto p-4 text-sm">
                            <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-white">结构导航</h2>
                            {/* 模拟导航内容 */}
                            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                <li># 项目概述</li>
                                <li># 文件列表</li>
                                <li># 团队成员</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}