import React from 'react';
import clsx from 'clsx';
// 假设这些图标已在 Icons.jsx 中定义
import { ListIcon, Search, FileText, Home, Moon, Columns, Sun } from './Icons.jsx'; 
// import {useNavigate} from "react-router-dom"; // navigate 作为 prop 传入，无需在此导入

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
        // Header 使用 fixed top-0, 确保其固定。
        // 移除 h-16，让其高度自适应 (flex-col + 搜索栏)
        <header className="fixed h-16 top-0 left-0 w-full z-20 bg-white dark:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700 shadow-lg">
            
            {/* 1. 主导航栏 (h-16) */}
            <div className="max-w-full mx-auto flex justify-between items-center p-4 h-16">

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

            {/* 2. 移动端搜索栏：移除 fixed/top-16，让它在 Header 内部自然向下排列。 */}
            <div className="sm:hidden px-4 pb-4"> 
                <div className="relative">
                    <input
                        type="text"
                        placeholder="搜索项目..."
                        // backdrop-blur-sm shadow-xl 只有在 Header 背景是半透明时才有效果
                        className="w-full pl-12 pr-4 py-3 rounded-2xl text-gray-900 dark:text-gray-300 dark:bg-gray-700/20 shadow-lg border border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 transition-all"
                    />
                    <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
                </div>
            </div>
        </header>
    );
};

export default AppHeader;