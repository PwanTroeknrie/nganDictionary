import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
const Copy = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const RefreshCw = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const AlertTriangle = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const API_BASE = '/api/projects';

// 权限常量
const PERMISSIONS = {
    UNAUTHORIZED: '未授权',
    AUTHORIZED: '已授权',
    CREATOR: '创建者'
};

// auth helpers
const getStoredAuth = (pid) => {
    try {
        const s = sessionStorage.getItem(`auth_${pid}`);
        return s ? JSON.parse(s) : { code: '', level: '' };
    } catch { return { code: '', level: '' }; }
};
const setStoredAuth = (pid, code, level) => {
    sessionStorage.setItem(`auth_${pid}`, JSON.stringify({ code, level }));
};
const clearStoredAuth = (pid) => {
    sessionStorage.removeItem(`auth_${pid}`);
};

const randomCodes = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let editor = '';
    for (let i = 0; i < 8; i++) editor += chars[Math.floor(Math.random() * chars.length)];
    let identity = '';
    for (let i = 0; i < 4; i++) identity += '0123456789'[Math.floor(Math.random() * 10)];
    return { editorCode: editor, identityNumber: identity };
};

const DictionaryIcon = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21.4 15.82a24.16 24.16 0 0 0-4.6-2.5 13.5 13.5 0 0 0-6.8 0 24.16 24.16 0 0 0-4.6 2.5"/><path d="M12 21V3"/><path d="M2 12h20"/><path d="M19 19H5c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2z"/></svg>;

const formatFileCards = (files) =>
    files.map((f) => ({
        name: f.name,
        type: f.type,
        extension: f.extension,
        fileId: f.type === 'document' ? 101 : 202,
        path: f.type === 'document' ? '/docs' : '/dictionary',
        icon: f.type === 'document' ? FileText : DictionaryIcon,
        lastEditTime: f.last_modified
            ? new Date(f.last_modified).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
              })
            : 'N/A',
        fileSize: f.type === 'dictionary' ? `${f.entry_count || 0} 词条` : f.size,
    }));



// --- 2. App Header Component (固定头部) ---
const AppHeader = ({
    isDarkMode, toggleTheme,
    isLeftPanelOpen, toggleLeftPanel,
    isRightPanelOpen, toggleRightPanel,
    navigate, projectId,
    currentPermission,
    statusClasses
}) => {
    return (
        <header className="fixed top-0 left-0 w-full z-20 bg-white dark:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700 shadow-lg h-16">
            <div className="max-w-full mx-auto flex justify-between items-center p-4 h-full">

                <div className="flex items-center space-x-4">
                    <button onClick={toggleLeftPanel} className={clsx("p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]", isLeftPanelOpen ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600')} title="切换项目列表">
                        <ListIcon className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-extrabold text-gray-800 dark:text-blue-400 items-center space-x-2 hidden md:flex">
                        <span className="text-3xl">🗂️</span>
                        <span className="text-xl italic font-semibold text-gray-600 dark:text-gray-400">项目管理中心</span>
                    </h1>
                    <div className="relative hidden sm:block ml-8">
                        <input type="text" placeholder="搜索项目..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-64 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow" />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
                    </div>
                </div>

                <div className="flex space-x-3 items-center">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusClasses}`}>{currentPermission}</span>

                    <button onClick={() => navigate("/docs")} className="p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600" title="文档页面">
                        <FileText className="w-5 h-5" />
                    </button>

                    <button onClick={() => navigate(`/dictionary?project=${projectId || 'default'}`)} className="p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600" title="词典页面">
                        <Home className="w-5 h-5" />
                    </button>

                    <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-lg" title="切换主题">
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    <button onClick={toggleRightPanel} className={clsx("p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]", isRightPanelOpen ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600')} title="切换右侧面板">
                        <Columns className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="sm:hidden fixed top-16 left-0 right-0 px-4 pb-4 z-10">
                <div className="relative">
                    <input type="text" placeholder="搜索项目..." className="w-full pl-12 pr-4 py-3 rounded-2xl text-gray-900 dark:text-gray-300 dark:bg-gray-700/20 backdrop-blur-sm shadow-xl border border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 transition-all" />
                    <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
                </div>
            </div>
        </header>
    );
};


// --- 3. Debug Hook (保留原样) ---
const useDebugPermission = (setPermission) => {
    useEffect(() => {
        window.setAppPermission = (level) => {
            const normalizedLevel = level.toUpperCase();
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
        return () => { delete window.setAppPermission; };
    }, [setPermission]);
};


// --- 4. Reusable File Card Component (文件卡片组件) ---
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

    const lastParenIndex = file.name.lastIndexOf('(');
    let title = file.name;
    let extensionDisplay = '';
    if (lastParenIndex !== -1 && file.name.endsWith(')')) {
        title = file.name.substring(0, lastParenIndex).trim();
        extensionDisplay = file.name.substring(lastParenIndex);
    }

    return (
        <div className="flex flex-col p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-6 mb-6">
                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shadow-inner">
                    <Icon className="w-10 h-10"/>
                </div>
                <div className="flex flex-col justify-between flex-grow">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 flex flex-wrap items-baseline">
                        <span>{title}</span>
                        {extensionDisplay && <span className="ml-2 text-sm italic font-medium text-gray-500 dark:text-gray-400">{extensionDisplay}</span>}
                    </h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p className="flex items-center"><Clock className="w-3 h-3 mr-1 text-gray-400 dark:text-gray-500"/><span>最后编辑: {file.lastEditTime}</span></p>
                        <p className="flex items-center"><HardDrive className="w-3 h-3 mr-1 text-gray-400 dark:text-gray-500"/><span>文件大小: {file.fileSize}</span></p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col space-y-3 pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => handleAction('enter', file.fileId, file.path)} className={clsx(actionClass, enterButtonClass)} title={!isUnauthorized ? '进入编辑/预览页面' : '进入只读预览页面'}>
                    {enterButtonText}
                </button>

                {permission === PERMISSIONS.CREATOR && (
                    <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => handleAction('upload', file.fileId)} className={clsx(actionClass, 'bg-yellow-500 text-white hover:bg-yellow-600')} title="上传新文件或更新现有文件">
                            上传
                        </button>
                        <button onClick={() => handleAction('download', file.fileId)} className={clsx(actionClass, 'bg-blue-500 text-white hover:bg-blue-600')} title="下载当前文件">
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
    isOpen, currentProject, setCurrentProject, allProjects, togglePanel, onCreateClick
}) => {
    const Scrim = (
        <div className={clsx("fixed inset-0 bg-black/50 z-20 sm:hidden transition-opacity duration-300", {
            'opacity-100 pointer-events-auto': isOpen, 'opacity-0 pointer-events-none': !isOpen,
        })} onClick={togglePanel} />
    );

    const containerClasses = clsx(
        "flex-shrink-0 z-30 transition-all duration-300",
        "fixed top-16 left-0",
        { 'w-full': isOpen, 'w-0': !isOpen, 'h-[calc(100vh-4rem)]': isOpen },
        "sm:relative sm:top-auto sm:left-auto sm:h-full",
        { 'sm:w-64': isOpen, 'sm:w-0': !isOpen },
        { 'bg-gray-100 dark:bg-gray-800': isOpen, 'sm:border-r sm:border-gray-200 sm:dark:border-gray-800': isOpen }
    );

    const contentClasses = clsx(
        "h-full overflow-y-auto p-4 transition-opacity duration-300 scrollbar-custom",
        { 'opacity-100 pointer-events-auto': isOpen, 'opacity-0 pointer-events-none': !isOpen }
    );

    return (
        <>
            {Scrim}
            <aside className={containerClasses}>
                {isOpen && (
                    <div className={contentClasses}>
                        <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-600">
                            项目列表 ({allProjects.length}) 🗂️
                        </h2>
                        <button type="button" className="w-full bg-blue-500 text-white py-2 rounded-xl mb-4 hover:bg-blue-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5" onClick={onCreateClick}>
                            + 创建新项目
                        </button>
                        <ul className="space-y-1">
                            {allProjects.map(project => (
                                <li key={project.id} className={clsx(
                                    "p-3 rounded-xl cursor-pointer transition-colors shadow-sm flex flex-col transform hover:scale-[1.01]",
                                    project.name === currentProject
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                )} onClick={() => setCurrentProject(project.name)}>
                                    <div className="flex items-center space-x-2 text-sm font-medium">
                                        <ListIcon className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{project.name}</span>
                                    </div>
                                    {project.created_at && (
                                        <span className="text-xs mt-1 ml-6 opacity-60">
                                            {new Date(project.created_at).toLocaleString('zh-CN', {
                                                year: 'numeric', month: '2-digit', day: '2-digit'
                                            })}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </aside>
        </>
    );
});


// --- 5.5 Create Project Modal Component (创建项目模态框) ---
const CreateProjectModal = React.memo(({ isOpen, onClose, onCreated, isDarkMode }) => {
    const [phase, setPhase] = useState('form'); // 'form' | 'success'
    const [projectName, setProjectName] = useState('');
    const [editorCode, setEditorCode] = useState('');
    const [identityNumber, setIdentityNumber] = useState('');
    const [result, setResult] = useState(null);
    const [creating, setCreating] = useState(false);
    const [copiedField, setCopiedField] = useState('');

    // Initialize random codes when modal opens
    useEffect(() => {
        if (isOpen) {
            const codes = randomCodes();
            setEditorCode(codes.editorCode);
            setIdentityNumber(codes.identityNumber);
            setProjectName('');
            setPhase('form');
            setResult(null);
            setCopiedField('');
        }
    }, [isOpen]);

    const adminCode = editorCode + identityNumber;

    const handleRegenerate = () => {
        const codes = randomCodes();
        setEditorCode(codes.editorCode);
        setIdentityNumber(codes.identityNumber);
    };

    const handleCreate = async () => {
        if (!projectName.trim()) return;
        setCreating(true);
        try {
            const r = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: projectName.trim(),
                    editor_code: editorCode,
                    identity_number: identityNumber
                })
            });
            if (r.ok) {
                const data = await r.json();
                setResult(data);
                setPhase('success');
            } else {
                const err = await r.json();
                alert('创建失败: ' + (err.error || '未知错误'));
            }
        } catch {
            alert('创建请求失败，请检查网络连接');
        } finally {
            setCreating(false);
        }
    };

    const handleCopy = async (text, field) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Fallback for non-HTTPS or denied permission
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopiedField(field);
        setTimeout(() => setCopiedField(''), 2000);
    };

    const handleConfirmAndClose = () => {
        if (result) {
            onCreated(result);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => { if (phase !== 'success') onClose(); }}
            />

            {/* Modal card */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">

                {/* ── FORM PHASE ── */}
                {phase === 'form' && (
                    <>
                        <div className="px-6 pt-6 pb-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">创建新项目</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                设置项目名称与授权码，授权码创建后无法修改
                            </p>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            {/* Project Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    项目名称 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && projectName.trim()) handleCreate();
                                        if (e.key === 'Escape') onClose();
                                    }}
                                    placeholder="输入项目名称..."
                                    autoFocus
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-all"
                                />
                            </div>

                            {/* Editor Code */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    编辑码 (editor_code)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editorCode}
                                        onChange={(e) => setEditorCode(e.target.value)}
                                        placeholder="8位随机字符"
                                        maxLength={20}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRegenerate}
                                        className="px-3 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                                        title="重新生成随机码"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Identity Number */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    身份编号 (identity_number)
                                </label>
                                <input
                                    type="text"
                                    value={identityNumber}
                                    onChange={(e) => setIdentityNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="4位数字"
                                    maxLength={4}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-all"
                                />
                            </div>

                            {/* Computed Admin Code (read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    管理码 (admin_code) <span className="text-xs font-normal text-gray-400">= 编辑码 + 身份编号</span>
                                </label>
                                <input
                                    type="text"
                                    value={adminCode}
                                    readOnly
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-mono cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!projectName.trim() || creating}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                            >
                                {creating ? '创建中...' : '创建项目'}
                            </button>
                        </div>
                    </>
                )}

                {/* ── SUCCESS PHASE ── */}
                {phase === 'success' && result && (
                    <>
                        <div className="px-6 pt-6 pb-2">
                            <h2 className="text-xl font-bold text-green-600 dark:text-green-400">
                                项目创建成功
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                项目 <span className="font-semibold text-gray-800 dark:text-gray-200">{result.project_id}</span> 已创建
                            </p>
                        </div>

                        {/* Warning banner */}
                        <div className="mx-6 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl flex items-start space-x-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>请立即保存这些授权码！</strong>关闭此窗口后将无法再次查看。建议复制到安全位置。
                            </p>
                        </div>

                        {/* Code display rows */}
                        <div className="px-6 py-4 space-y-3">
                            {[
                                { label: '项目 ID', value: result.project_id, key: 'project_id' },
                                { label: '管理码 (admin_code)', value: result.admin_code, key: 'admin_code', mono: true },
                                { label: '编辑码 (editor_code)', value: result.editor_code, key: 'editor_code', mono: true },
                                { label: '身份编号', value: result.identity_number, key: 'identity_number', mono: true },
                            ].map(({ label, value, key, mono }) => (
                                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                                        <span className={clsx("text-sm font-semibold text-gray-900 dark:text-gray-100 truncate", mono && "font-mono tracking-wider")}>
                                            {value}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(value, key)}
                                        className={clsx(
                                            "ml-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0",
                                            copiedField === key
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        )}
                                    >
                                        {copiedField === key ? '已复制' : '复制'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={handleConfirmAndClose}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
                            >
                                确认并进入项目
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});


// --- 6. Project Main Content Component (项目主内容区) ---
const ProjectMainContent = React.memo(({
    currentProject, projectInfo, permission, statusClasses, isCreator,
    authInput, setAuthInput, handleAuthorize, handleCardAction,
    handleDeleteProject, fileCards, PERMISSIONS
}) => {
    const isAuthorized = permission !== PERMISSIONS.UNAUTHORIZED;

    return (
        <main className="flex-grow p-8 space-y-8 overflow-y-auto">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-stretch space-y-4 md:space-y-0 md:space-x-6">
                    <div className="flex items-start space-x-6 flex-grow">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 dark:text-gray-400 text-sm">项目封面</span>
                        </div>
                        <div className="flex-grow">
                            <h2 className="text-3xl font-bold mb-2">{currentProject}</h2>
                            <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                                <p>创建者: <span className="font-medium text-gray-800 dark:text-gray-200">{projectInfo.creator}</span></p>
                                <p>创建日期: {projectInfo.created_date}</p>
                            </div>
                        </div>
                    </div>

                    <div className={clsx("flex flex-col items-start md:items-end justify-between min-w-48", "pt-4 md:pt-0 border-t md:border-t-0 border-gray-200 dark:border-gray-700")}>
                        <div className="flex flex-col items-start md:items-end w-full space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                当前项目权限:
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${statusClasses}`}>{permission}</span>
                            </p>
                            {isCreator && (
                                <button onClick={handleDeleteProject} className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition shadow-md" title="删除整个项目">
                                    删除项目
                                </button>
                            )}
                        </div>

                        {!isAuthorized ? (
                            <div className="flex space-x-2 mt-2">
                                <input type="password" placeholder="输入授权码..." value={authInput}
                                    onChange={(e) => setAuthInput(e.target.value)}
                                    className="px-3 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 w-40 text-sm focus:ring-blue-500 focus:border-blue-500 transition-all" />
                                <button onClick={handleAuthorize} className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition shadow">
                                    获取权限
                                </button>
                            </div>
                        ) : (
                            <div className="text-sm text-green-600 dark:text-green-400 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                权限已验证。
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(fileCards ?? []).map((file) => (
                    <FileCard key={file.fileId} file={file} permission={permission} handleAction={handleCardAction} />
                ))}
            </div>
        </main>
    );
});


// --- 7. Main App Component (主应用组件) ---
export default function Homepage({ isDarkMode, toggleTheme }) {
    const navigate = useNavigate();

    // --- UI State ---
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelToOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // --- Data State ---
    const [projects, setProjects] = useState([]);            // {id, name, entry_count, created_at, owner, ...}
    const [currentProjectId, setCurrentProjectId] = useState(null);
    const [permission, setPermission] = useState(PERMISSIONS.UNAUTHORIZED);
    const [authInput, setAuthInput] = useState('');
    const [fileMetadata, setFileMetadata] = useState([]);

    const isCreator = permission === PERMISSIONS.CREATOR;
    const allProjectItems = projects.map(p => ({ id: p.id, name: p.name, created_at: p.created_at }));
    const allProjectNames = projects.map(p => p.name);
    const currentProjectName = projects.find(p => p.id === currentProjectId)?.name || (allProjectNames[0] || '');

    useDebugPermission(setPermission);

    // --- Fetch/refresh projects ---
    const refreshProjects = useCallback(async (selectId = null) => {
        try {
            const r = await fetch(API_BASE);
            if (r.ok) {
                const data = await r.json();
                const list = (data.projects || []).map(p => ({
                    id: p.id, name: p.name || p.id, entry_count: p.entry_count || 0,
                    created_at: p.created_at || '', owner: p.owner || 'unknown'
                }));
                setProjects(list);
                if (selectId) {
                    setCurrentProjectId(selectId);
                } else if (list.length > 0 && !currentProjectId) {
                    setCurrentProjectId(list[0].id);
                }
                // Restore saved auth levels for current project
                const targetId = selectId || (list.length > 0 && !currentProjectId ? list[0].id : null);
                if (targetId) {
                    const stored = getStoredAuth(targetId);
                    if (stored.level) {
                        setPermission(stored.level === 'admin' ? PERMISSIONS.CREATOR : PERMISSIONS.AUTHORIZED);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to fetch projects:', e);
        }
    }, [currentProjectId]);

    const fetchProjects = useCallback(() => refreshProjects(), [refreshProjects]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const fetchFileMetadata = useCallback(async (pid) => {
        if (!pid) return;
        try {
            const r = await fetch(`${API_BASE}/${pid}/files`);
            if (r.ok) {
                const data = await r.json();
                setFileMetadata(data.files || []);
            }
        } catch (e) {
            console.error('Failed to fetch file metadata:', e);
            setFileMetadata([]);
        }
    }, []);

    useEffect(() => {
        if (currentProjectId) {
            fetchFileMetadata(currentProjectId);
        } else {
            setFileMetadata([]);
        }
    }, [currentProjectId, fetchFileMetadata]);

    // --- Theme ---
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    const toggleLeftPanel = () => setIsLeftPanelOpen(prev => !prev);
    const toggleRightPanel = () => setIsRightPanelToOpen(prev => !prev);

    // --- Authorization (real API) ---
    const handleAuthorize = async () => {
        const code = authInput.trim();
        if (!code) return;
        const pid = currentProjectId;
        if (!pid) { alert('请先选择一个项目'); return; }
        try {
            const r = await fetch(`${API_BASE}/${pid}/authorize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            if (r.ok) {
                const data = await r.json();
                const newPerm = data.level === 'admin' ? PERMISSIONS.CREATOR : PERMISSIONS.AUTHORIZED;
                setPermission(newPerm);
                setStoredAuth(pid, code, data.level);
                alert(`授权成功！当前权限: ${newPerm}`);
            } else {
                alert("授权码不正确，请重试。");
                setPermission(PERMISSIONS.UNAUTHORIZED);
                clearStoredAuth(pid);
            }
        } catch { alert('授权请求失败'); }
        setAuthInput('');
    };

    // --- Card Action Logic ---
    const handleCardAction = useCallback((actionType, fileId, path) => {
        const pid = currentProjectId;
        const auth = getStoredAuth(pid);

        if (actionType === 'enter') {
            if (path === '/dictionary') {
                navigate(`/dictionary?project=${pid}`);
            } else if (path === '/docs') {
                navigate(`/docs?project=${pid}`);
            } else {
                navigate(path);
            }
            return;
        }
        if (actionType === 'download') {
            if (fileId === 101) {
                // Download docs.md — use direct link for proper .md extension
                const a = document.createElement('a');
                a.href = `${API_BASE}/${pid}/docs/download`;
                a.download = `${pid}_docs.md`;
                a.click();
            } else {
                // Download dictionary Excel
                fetch(`${API_BASE}/${pid}/export/excel`, { headers: { 'X-Auth-Code': auth.code } })
                    .then(r => { if (r.ok) return r.blob(); throw new Error('Failed'); })
                    .then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `${pid}_dictionary.xlsx`; a.click();
                        URL.revokeObjectURL(url);
                    })
                    .catch(() => alert('下载失败，需要授权'));
            }
            return;
        }
        if (actionType === 'upload') {
            const input = document.createElement('input');
            input.type = 'file';
            if (fileId === 101) {
                input.accept = '.md,.txt';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const fd = new FormData(); fd.append('file', file);
                    try {
                        const r = await fetch(`${API_BASE}/${pid}/docs/upload`, {
                            method: 'POST', headers: { 'X-Auth-Code': auth.code }, body: fd
                        });
                        if (r.ok) { const d = await r.json(); alert(d.message); fetchFileMetadata(pid); }
                        else alert('上传文档失败，需要编辑权限');
                    } catch { alert('上传请求失败'); }
                };
            } else {
                input.accept = '.xlsx,.xls';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const fd = new FormData(); fd.append('file', file);
                    try {
                        const r = await fetch(`${API_BASE}/${pid}/import/excel`, {
                            method: 'POST', headers: { 'X-Auth-Code': auth.code }, body: fd
                        });
                        if (r.ok) { const d = await r.json(); alert(d.message); fetchFileMetadata(pid); }
                        else alert('上传失败，需要管理权限');
                    } catch { alert('上传请求失败'); }
                };
            }
            input.click();
            return;
        }
    }, [navigate, currentProjectId, fetchFileMetadata]);

    const handleDeleteProject = async () => {
        if (!isCreator) return;
        const pid = currentProjectId;
        if (!window.confirm(`确定要删除项目 "${currentProjectName}" 吗？此操作不可撤销。`)) return;
        const auth = getStoredAuth(pid);
        try {
            const r = await fetch(`${API_BASE}/${pid}`, {
                method: 'DELETE', headers: { 'X-Auth-Code': auth.code }
            });
            if (r.ok) {
                alert('项目删除成功');
                clearStoredAuth(pid);
                setPermission(PERMISSIONS.UNAUTHORIZED);
                fetchProjects();
            } else {
                alert('删除失败，需要管理码授权');
            }
        } catch { alert('删除请求失败'); }
    };

    // --- Handle new project created ---
    const handleProjectCreated = useCallback((result) => {
        setStoredAuth(result.project_id, result.admin_code, 'admin');
        setShowCreateModal(false);
        refreshProjects(result.project_id);
    }, [refreshProjects]);

    // Current project info
    const currentProj = projects.find(p => p.id === currentProjectId) || {};
    const projectInfo = {
        creator: currentProj.owner || 'unknown',
        created_date: currentProj.created_at
            ? new Date(currentProj.created_at).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
              })
            : 'N/A',
        entry_count: currentProj.entry_count || 0
    };

    const statusClasses = {
        [PERMISSIONS.UNAUTHORIZED]: 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300',
        [PERMISSIONS.AUTHORIZED]: 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300',
        [PERMISSIONS.CREATOR]: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300',
    }[permission] || '';

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <AppHeader
                isDarkMode={isDarkMode} toggleTheme={toggleTheme}
                isLeftPanelOpen={isLeftPanelOpen} toggleLeftPanel={toggleLeftPanel}
                isRightPanelOpen={isRightPanelOpen} toggleRightPanel={toggleRightPanel}
                navigate={navigate} projectId={currentProjectId}
                currentPermission={permission}
                statusClasses={statusClasses}
            />

            <div className="flex flex-grow overflow-hidden mt-16">
                <ProjectListPanel
                    isOpen={isLeftPanelOpen}
                    currentProject={currentProjectName}
                    setCurrentProject={(name) => {
                        const p = projects.find(x => x.name === name);
                        if (p) {
                            setCurrentProjectId(p.id);
                            const stored = getStoredAuth(p.id);
                            if (stored.level === 'admin') setPermission(PERMISSIONS.CREATOR);
                            else if (stored.level === 'editor') setPermission(PERMISSIONS.AUTHORIZED);
                            else setPermission(PERMISSIONS.UNAUTHORIZED);
                        }
                    }}
                    allProjects={allProjectItems}
                    togglePanel={toggleLeftPanel}
                    onCreateClick={() => setShowCreateModal(true)}
                />

                <ProjectMainContent
                    currentProject={currentProjectName}
                    projectInfo={projectInfo}
                    permission={permission}
                    statusClasses={statusClasses}
                    isCreator={isCreator}
                    authInput={authInput}
                    setAuthInput={setAuthInput}
                    handleAuthorize={handleAuthorize}
                    handleCardAction={handleCardAction}
                    handleDeleteProject={handleDeleteProject}
                    fileCards={formatFileCards(fileMetadata)}
                    PERMISSIONS={PERMISSIONS}
                />

                <div className={clsx("flex-shrink-0 transition-all duration-300",
                    isRightPanelOpen ? 'sm:w-64 w-full' : 'w-0',
                    isRightPanelOpen ? 'sm:border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800' : ''
                )}>
                    {isRightPanelOpen && (
                        <div className="h-full overflow-y-auto p-4 text-sm">
                            <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-white">结构导航</h2>
                            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                <li># 项目概述</li>
                                <li># 文件列表</li>
                                <li># 团队成员</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={handleProjectCreated}
                isDarkMode={isDarkMode}
            />
        </div>
    );
}
