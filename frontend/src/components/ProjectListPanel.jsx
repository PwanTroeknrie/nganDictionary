import React from 'react';
import clsx from 'clsx';

// 依赖的 ListIcon
const ListIcon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

const ProjectListPanel = React.memo(({
    isOpen,
    currentProject,
    setCurrentProject,
    allProjects,
    togglePanel // 用于移动端点击遮罩关闭
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

    // 2. Panel 容器类：处理定位、宽度和高度约束
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
                {/* 仅在打开时渲染内部内容，以优化性能和控制 CSS 过渡 */}
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
                                        // 更新后的高对比度样式
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

export default ProjectListPanel;