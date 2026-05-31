import React, { useState, useEffect, useRef, useCallback, forwardRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm"; // 启用 Markdown 扩展，如表格、删除线
import rehypeHighlight from "rehype-highlight"; // 启用代码高亮
import CodeMirror from "@uiw/react-codemirror"; // 👈 CodeMirror 引入
import { markdown } from "@codemirror/lang-markdown";
import {githubLight} from '@ddietr/codemirror-themes/github-light'
import {githubDark} from '@ddietr/codemirror-themes/github-dark'
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";



import { useNavigate, useSearchParams } from 'react-router-dom';

// ... (I. ICON and HEADER DEFINITIONS 保持不变) ...
const createIcon = (d) => (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d={d}/></svg>;

const Sun = createIcon("M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41");
const Moon = createIcon("M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z");
const Edit = createIcon("M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z");
const Eye = createIcon("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z");
const Search = createIcon("M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35");
const ListIcon = createIcon("M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01");
const Columns = createIcon("M12 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8M2 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2");
const Home = createIcon("M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");
const FileText = createIcon("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 13h4M10 17h4M10 9h4");
const TypeIcon = createIcon("M4 7V4h16v3M9 20h6M12 4v16");


const Header = ({
    isDarkMode, toggleTheme,
    isGlobalEditMode, toggleGlobalEditMode,
    isWordListOpen, toggleLeftPanel,
    isTreeOpen, toggleRightPanel,
    customFont, setCustomFont,
    isFontInputVisible, setIsFontInputVisible
}) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 w-full z-20 bg-white dark:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4 h-16">
        {/* LEFT SECTION */}
        <div className="flex items-center space-x-4">
          {/* Wordlist Toggle (Mapped to DocPage Left Panel) */}
          <button
            onClick={toggleLeftPanel}
            className={`p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
              isWordListOpen
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title="内容大纲 (收起/展开)"
          >
            <ListIcon className="w-5 h-5" />
          </button>

          <h1 className="text-xl font-extrabold text-gray-800 dark:text-blue-400 items-center space-x-2 hidden md:flex">
            <span className="text-3xl">📄</span>
            <span>文档页面</span>
          </h1>

          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="搜索文档内容..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-64 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex space-x-3 items-center">
          {isFontInputVisible && (
            <input
              type="text"
              value={customFont}
              onChange={(e) => setCustomFont(e.target.value)}
              placeholder="输入字体名称..."
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-full w-36 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          )}

          <button
            onClick={() => setIsFontInputVisible(prev => !prev)}
            className={`p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
              isFontInputVisible
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title="设置自定义字体"
          >
            <TypeIcon className="w-5 h-5" />
          </button>

          {/* DocPage doesn't navigate to itself, use a placeholder */}
          <button
            onClick={() => navigate("/docs")}
            className="p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] bg-blue-500 text-white" // Highlight Doc button
            title="文档页面"
          >
            <FileText className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate("/dictionary")}
            className="p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
            title="返回词典主页"
          >
            <Home className="w-5 h-5" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-lg"
            title="切换主题"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleGlobalEditMode}
            className={`p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
              isGlobalEditMode
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            title={isGlobalEditMode ? "退出全局编辑模式" : "进入全局编辑模式"}
          >
            {isGlobalEditMode ? <Eye className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
          </button>

          {/* Structure Nav Toggle (Mapped to DocPage Right Panel) */}
          <button
            onClick={toggleRightPanel}
            className={`p-2 rounded-full transition-all flex items-center justify-center text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
              isTreeOpen
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title="代码编辑区 (收起/展开)"
          >
            <Columns className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating Search Bar (Only visible on small screens) */}
      <div className="sm:hidden fixed top-20 left-0 right-0 px-4 pb-4 z-10">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索词条..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl text-gray-900 dark:text-gray-300 dark:bg-gray-700/20 backdrop-blur-sm shadow-xl border border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 transition-all"
          />
          <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
        </div>
      </div>
    </header>
  );
};


// ... (II. 辅助函数和组件定义 保持不变) ...

/**
 * 实用函数：防抖 (Debounce)
 */
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

/**
 * 实用函数：提取 Markdown 标题结构 (用于判断是否需要刷新 TOC)
 */
const getHeadingStructure = (markdownText) => {
    return markdownText
        .split('\n')
        .filter(line => line.match(/^#{1,4}\s/))
        .map(line => line.trim())
        .join('|'); // 用分隔符连接所有标题行
};


// 工具函数 (URL安全 Base64)
const toSafeBase64 = (str) => {
    // 兼容中文字符
    return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};
const unescapeRegex = /\\([\\*_{}[\]()#+\-.!<>])/g;


/**
 * 格式化文档标题并生成唯一ID
 */
const processHeadingText = (text, tagName) => {
    const level = parseInt(tagName.substring(1), 10);
    const originalHeading = text.trim();

    // 假设最后一个词（可能包含括号）是关键词，前面是描述
    // 实际上，这里只提取完整的文本作为ID生成的基础
    const definition = originalHeading;

    const safeKeyword = definition.replace(unescapeRegex, '$1').trim();
    const safeIdSuffix = toSafeBase64(safeKeyword).substring(0, 10); // 截断避免过长
    const id = definition.replace(/\s+/g, '-') + '-' + safeIdSuffix;

    return { original: originalHeading, id, level };
};


/**
 * 自定义标题组件：生成ID和存储引用
 */
const CustomHeading = forwardRef(({ level, children, onHeadingParsed, ...rest }, ref) => {
    const tagName = `h${level}`;

    const localRef = useRef(null);
    const innerRef = ref || localRef;

    // 递归提取子节点文本（处理嵌套元素，例如 <em>, <code>）
    const getTextFromChildren = (ch) => {
        return React.Children.toArray(ch).map(c => {
            if (typeof c === 'string' || typeof c === 'number') return String(c);
            if (React.isValidElement(c) && c.props && c.props.children) {
                return getTextFromChildren(c.props.children);
            }
            return '';
        }).join('');
    };

    const text = getTextFromChildren(children);

    // 仅在文本内容不为空时处理
    if (!text.trim()) {
        return React.createElement(tagName, { ...rest }, children);
    }

    const headingInfo = processHeadingText(text, tagName);

    // 确保组件被渲染后，其信息被发送出去
    useEffect(() => {
        // 使用 innerRef.current 确保我们发送的是实际的 DOM 元素
        if (typeof onHeadingParsed === 'function' && innerRef.current) {
            onHeadingParsed(headingInfo, innerRef.current);
        }
    }, [headingInfo.id, onHeadingParsed, innerRef]); // 依赖项调整

    return React.createElement(
        tagName,
        { id: headingInfo.id, ref: innerRef, className: `mt-8 mb-4 border-b pb-1 text-gray-900 dark:text-gray-100 ${tagName}`, ...rest },
        children
    );
});


/**
 * 目录递归渲染组件 (使用 memo 优化性能)
 */
const RenderTocItem = memo(({ item, activeHeadingId, setActiveHeadingId, expandAll }) => {
    const isActive = item.id === activeHeadingId;
    const [isOpen, setIsOpen] = useState(expandAll);
    const hasChildren = item.children && item.children.length > 0;

    // 自动展开父级 (用于 deep link)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const affix = params.get('affix');
        if (affix && (item.id === affix || (item.children && item.children.some(child => child.id === affix)))) {
             setIsOpen(true);
        }
    }, [item.children, item.id]);

    const handleLinkClick = (e) => {
        e.preventDefault();
        const targetElement = document.getElementById(item.id);
        if (targetElement) {
            const main = document.querySelector('main.overflow-y-auto');
            if (main) {
                const offset = targetElement.getBoundingClientRect().top + main.scrollTop - 80;
                main.scrollTo({ top: offset, behavior: 'smooth' });
            } else {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            setActiveHeadingId(item.id);
        }
        const newUrl = `${window.location.origin}${window.location.pathname}?affix=${item.id}`;
        window.history.pushState(null, '', newUrl);
    };

    return (
        <li key={item.id} className="text-sm">
            <div
                className={`flex items-center py-1 rounded-md cursor-pointer transition-colors ${
                    isActive ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={{ paddingLeft: (10 + (item.level - 1) * 15) + 'px' }}
                onClick={handleLinkClick}
            >
                {hasChildren && (
                     <span
                        className="toggle-icon mr-1 transition-transform duration-200 flex-shrink-0"
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                     >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                     </span>
                )}
                <span className="flex-grow truncate">
                    {item.original}
                </span>
            </div>
            {hasChildren && (
                <ul className={`list-none p-0 transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    {item.children.map(child => (
                        <RenderTocItem
                            key={child.id}
                            item={child}
                            activeHeadingId={activeHeadingId}
                            setActiveHeadingId={setActiveHeadingId}
                            expandAll={expandAll}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
});


// =================================================================
// III. 主页面组件 DocPage
// =================================================================

const fallbackMarkdown = `# 欢迎使用 Ngandic 文档编辑器

请从左侧选择一个项目，开始编辑文档。

> 提示：在项目管理中心点击"进入编辑/预览"来加载项目文档。
`;

export default function DocPage({ isDarkMode, toggleTheme, customFont = '', setCustomFont }) {
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('project') || 'default';

    // 状态管理
    const [editorSource, setEditorSource] = useState('');
    const [toc, setToc] = useState([]);
    const [activeHeadingId, setActiveHeadingId] = useState(null);
    const [isLeftOpen, setIsLeftOpen] = useState(true);
    const [isRightOpen, setIsRightOpen] = useState(true);
    const [isFontInputVisible, setIsFontInputVisible] = useState(false);
    const [docLoading, setDocLoading] = useState(true);
    const [docError, setDocError] = useState('');
    const [tocExpandAll, setTocExpandAll] = useState(true);
    const [tocKey, setTocKey] = useState(0);

    // Resizing State
    const [rightPanelWidth, setRightPanelWidth] = useState(400); // 默认像素宽度

    // Refs for layout control and TOC management
    const containerRef = useRef(null);
    const headingRefs = useRef({}); // 存储标题 DOM 引用 { id: DOMElement }
    const flatHeadings = useRef([]); // 存储标题解析信息 { id, original, level }
    const headingStructureRef = useRef(getHeadingStructure(''));

    // Resizing constants
    const MIN_WIDTH = 250;

    // --- 拖动调整大小逻辑 (即时生效，无动画) ---
    // 统一移动处理 (支持鼠标 + 触摸)
    const handleMove = useCallback((e) => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        // 从鼠标或触摸事件中提取 clientX
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX;
        if (clientX == null) return;
        const newWidth = containerRect.right - clientX;
        const clampedWidth = Math.max(MIN_WIDTH, newWidth);
        setRightPanelWidth(clampedWidth);
    }, []);

    // 统一结束处理 (鼠标 + 触摸)
    const handleEnd = useCallback(() => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, [handleMove]);

    // 鼠标拖拽
    const handleMouseDown = (e) => {
        if (!isRightOpen) return;
        e.preventDefault();
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    // 触摸拖拽 (移动端)
    const handleTouchStart = (e) => {
        if (!isRightOpen) return;
        if (e.touches.length !== 1) return; // 仅单指拖拽
        e.preventDefault();
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
        document.body.style.userSelect = 'none';
    };


    // --- 标题解析回调和TOC构建 ---

    // 实际构建 TOC 的函数
    const buildToc = useCallback(() => {
        // 1. 去重并按文档顺序排序
        const uniqueFlatToc = Array.from(new Set(flatHeadings.current.map(h => h.id)))
            .map(id => flatHeadings.current.find(h => h.id === id))
            .filter(Boolean);

        // 排序逻辑：根据 DOM 位置排序，确保顺序正确
        uniqueFlatToc.sort((a, b) => {
            const refA = headingRefs.current[a.id];
            const refB = headingRefs.current[b.id];
            if (refA && refB) {
                // Node.DOCUMENT_POSITION_FOLLOWING (4) means B follows A, so A comes after B (1)
                const pos = refA.compareDocumentPosition(refB);
                return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
            }
            return 0;
        });

        // 2. 建立层级结构
        const buildHierarchicalToc = (flatToc) => {
            const root = { level: 0, children: [] };
            const stack = [root];

            flatToc.forEach(item => {
                const node = { ...item, children: [] };
                while (stack.length > 1 && stack[stack.length - 1].level >= node.level) {
                    stack.pop();
                }
                const parent = stack[stack.length - 1];
                parent.children.push(node);
                stack.push(node);
            });
            return root.children;
        };

        setToc(buildHierarchicalToc(uniqueFlatToc));

        // 3. 处理 URL affix 滚动逻辑
        const params = new URLSearchParams(window.location.search);
        const affix = params.get('affix');
        if (affix) {
            setTimeout(() => {
                const targetElement = headingRefs.current[affix];
                if (targetElement) {
                    const main = document.querySelector('main.overflow-y-auto');
                    if (main) {
                        const offset = targetElement.getBoundingClientRect().top + main.scrollTop - 80;
                        main.scrollTo({ top: offset, behavior: 'smooth' });
                    } else {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    setActiveHeadingId(affix);
                }
            }, 500);
        }
    }, []);

    // 使用防抖包装 buildToc
    const debouncedBuildToc = useCallback(debounce(buildToc, 250), [buildToc]);

    // ReactMarkdown 渲染时，CustomHeading 组件调用此函数
    const handleHeadingParsed = useCallback((headingInfo, domElement) => {
        headingRefs.current[headingInfo.id] = domElement;

        const exists = flatHeadings.current.some(h => h.id === headingInfo.id);
        if (!exists) {
             flatHeadings.current.push(headingInfo);
        }
    }, []);


    // --- 编辑器内容变更处理 (已修改为接收 CodeMirror 的 value) ---
    const handleEditorChange = (value) => {
        const newSource = value;
        setEditorSource(newSource);

        const newHeadingStructure = getHeadingStructure(newSource);

        // 只有当标题结构发生变化时，才触发 TOC 重新构建
        if (newHeadingStructure !== headingStructureRef.current) {
            headingStructureRef.current = newHeadingStructure;

            // 清理旧的 TOC 元数据，为新的解析做准备
            flatHeadings.current = [];
            headingRefs.current = {};

            debouncedBuildToc(); // 触发防抖后的 TOC 构建
        }
    };


    // --- 效果 hooks ---
    // 滚动高亮 Intersection Observer 绑定逻辑
    useEffect(() => {
        // Intersection Observer 配置：在标题进入视口顶部 80px 时激活
        const observer = new IntersectionObserver(
            (entries) => {
                let currentActiveId = null;
                // 1. 找到所有当前进入视口（或接近视口顶部）的标题
                const visibleHeadings = entries
                    .filter(entry => entry.isIntersecting)
                    .map(entry => ({
                        id: entry.target.id,
                        top: entry.boundingClientRect.top // 相对视口顶部的距离
                    }))
                    // 2. 排序：将靠近视口顶部的元素排在前面（即 top 值较小的）
                    .sort((a, b) => a.top - b.top);

                // 3. 选取最靠上的那个作为当前激活 ID
                if (visibleHeadings.length > 0) {
                    // 只选取第一个元素（离视口顶部最近的）
                    currentActiveId = visibleHeadings[0].id;
                }

                if (currentActiveId && currentActiveId !== activeHeadingId) {
                    setActiveHeadingId(currentActiveId);
                }
            },
            // rootMargin: 使得只有当标题进入距离顶部 80px - 视口底部 85% 之间的区域时才触发
            { root: null, rootMargin: '-80px 0px -85% 0px', threshold: 0 }
        );

        // 观察所有已注册的标题 DOM 元素
        Object.values(headingRefs.current).forEach(heading => {
            if (heading) observer.observe(heading);
        });

        // Cleanup: 在组件卸载或 TOC 重新构建前断开连接
        return () => { observer.disconnect(); };
    }, [toc.length, activeHeadingId]); // 当 TOC 结构变化时重新绑定


    // --- 文档加载 ---
    const fetchDocument = useCallback(async () => {
        setDocLoading(true);
        setDocError('');
        // Clear previous TOC state before loading new content
        flatHeadings.current = [];
        headingRefs.current = {};
        try {
            const r = await fetch(`/api/projects/${projectId}/docs`);
            if (r.ok) {
                const data = await r.json();
                setEditorSource(data.content || '');
            } else {
                throw new Error('加载失败');
            }
        } catch (e) {
            console.error('Failed to fetch document:', e);
            setDocError('加载文档失败');
            setEditorSource(fallbackMarkdown);
        } finally {
            setDocLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchDocument();
    }, [fetchDocument]);

    useEffect(() => {
        if (editorSource) {
            headingStructureRef.current = getHeadingStructure(editorSource);
            const timer = setTimeout(() => buildToc(), 300);
            return () => clearTimeout(timer);
        }
    }, [editorSource, buildToc]);

    // --- 布局控制和样式计算 ---
    const toggleGlobalEditMode = () => console.log("Global Edit Mode toggle is inactive on DocPage.");
    const toggleLeftPanel = () => setIsLeftOpen(prev => !prev);
    const toggleRightPanel = () => setIsRightOpen(prev => {
        if (!prev) {
            // Re-initialize width when opening
            setRightPanelWidth(400);
        }
        return !prev;
    });

    const tocWidth = isLeftOpen ? '256px' : '0px'; // 64 * 4
    const editorWidth = isRightOpen ? `${rightPanelWidth}px` : '0px';

    const componentMap = {
        h1: (props) => <CustomHeading level={1} onHeadingParsed={handleHeadingParsed} {...props} />,
        h2: (props) => <CustomHeading level={2} onHeadingParsed={handleHeadingParsed} {...props} />,
        h3: (props) => <CustomHeading level={3} onHeadingParsed={handleHeadingParsed} {...props} />,
        h4: (props) => <CustomHeading level={4} onHeadingParsed={handleHeadingParsed} {...props} />,
    };


    return (
        <div
            ref={containerRef} // Added ref for resize calculation
            className={`doc-page-layout min-h-screen ${isDarkMode ? 'dark' : ''} font-sans`}
        >
            {/* 注入自定义字体样式和 CodeMirror 样式 */}
            <style jsx global>{` 
                /* 仅保留与 CodeMirror 主题无关的全局样式 */
                
                /* 为 rehype-highlight 添加基础的背景样式 (保持不变) */
                .prose pre {
                    background-color: #f3f4f6; 
                    padding: 1rem;
                    border-radius: 0.5rem;
                    overflow-x: auto;
                }
                .dark .prose pre {
                    background-color: #1f2937; 
                }
                :root {
                    font-family: ${customFont || 'Inter, sans-serif'};
                }
            `}</style>

            {/* --- 顶部 Header (复用组件) --- (保持不变) */}
            <Header
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                isGlobalEditMode={false}
                toggleGlobalEditMode={toggleGlobalEditMode}
                isWordListOpen={isLeftOpen}
                toggleLeftPanel={toggleLeftPanel}
                isTreeOpen={isRightOpen}
                toggleRightPanel={toggleRightPanel}
                customFont={customFont}
                setCustomFont={setCustomFont}
                isFontInputVisible={isFontInputVisible}
                setIsFontInputVisible={setIsFontInputVisible}
            />

            {/* --- B. 三列布局容器 (从 Header 底部开始) --- */}
            <div className="flex flex-grow overflow-hidden pt-16 h-screen">

                {/* --- 左侧 TOC 侧边栏 --- (保持不变) */}
                <aside
                    className={`flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-hidden`}
                    style={{ width: tocWidth }}
                >
                    <div className={`p-4 h-full overflow-y-auto scrollbar-custom transition-opacity duration-300 ${isLeftOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">内容大纲</h3>
                            <button
                                onClick={() => { setTocExpandAll(prev => !prev); setTocKey(k => k + 1); }}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                                title={tocExpandAll ? '全部折叠' : '全部展开'}
                            >
                                <svg className="w-4 h-4 transition-transform duration-200" style={{ transform: tocExpandAll ? 'rotate(90deg)' : 'rotate(0deg)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </div>
                        <nav>
                            <ul key={tocKey} className="list-none p-0">
                                {toc.map(item => (
                                    <RenderTocItem
                                        key={item.id}
                                        item={item}
                                        activeHeadingId={activeHeadingId}
                                        setActiveHeadingId={setActiveHeadingId}
                                        expandAll={tocExpandAll}
                                    />
                                ))}
                            </ul>
                        </nav>
                    </div>
                </aside>

                {/* --- 中间 内容显示区 (实时渲染结果) --- */}
                <main
                    className={`flex-grow overflow-y-auto bg-white dark:bg-gray-800 p-8 scrollbar-custom`}
                >
                    <div className="max-w-3xl mx-auto">
                        {docLoading && (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-gray-500 dark:text-gray-400 animate-pulse">加载文档中...</p>
                            </div>
                        )}
                        {!docLoading && docError && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mb-4">
                                <p>{docError}</p>
                                <button onClick={fetchDocument} className="underline mt-1 text-sm">重试</button>
                            </div>
                        )}
                        {!docLoading && (
                        <div className="prose dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={componentMap}
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                            >
                                {editorSource}
                            </ReactMarkdown>
                        </div>
                        )}
                    </div>
                </main>

                {/* --- 可拖动分割线 (即时生效) --- (保持不变) */}
                {isRightOpen && (
                    <div
                        className="w-2 cursor-col-resize bg-gray-300 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors duration-150 flex-shrink-0 z-10 touch-none"
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                        title="拖动调整编辑区大小"
                    ></div>
                )}

           <aside
                    // CodeMirror 的背景色由其主题控制
                    className={`flex-shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-hidden`}
                    style={{ width: editorWidth }}
                >
                    {/* 移除 h3 标题，只保留 CodeMirror 容器 */}
                    <div className={`scrollbar-custom h-full flex flex-col ${isRightOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                        {/* 确保 CodeMirror 的父容器占满剩余空间并具有相对定位 */}
                        <div className="flex-grow relative h-full overflow-hidden">
                            <CodeMirror
                                key={isDarkMode ? 'dark' : 'light'}
                                value={editorSource}
                                height="100%"
                                theme={isDarkMode ? githubDark : githubLight}
                                className="w-full h-full cm-fill-container"
                                extensions={[
                                    markdown({
                                        codeLanguages: (info) => {
                                            if (info === "js" || info === "javascript") return javascript();
                                            else if (info === "css" || info === "css2") return css();
                                            else if (info === "python" || info === "py") return python();
                                            return null;
                                        }
                                    }),
                                ]}
                                onChange={(value) => handleEditorChange(value)}
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}