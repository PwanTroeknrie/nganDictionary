// docs.js - 文档渲染与文档映射功能

import { showTooltip, hideTooltip } from './ui.js';
import { toSafeBase64 } from './utils.js';

/**
 * 渲染 Markdown，构建大纲并设置滚动高亮（用于 /templates/docs.html 页面）
 */
export async function renderDocumentation() {
    const markdownPath = '/static/docs.md';
    const contentContainer = document.getElementById('docs-content-placeholder');
    const tocContainer = document.getElementById('docs-toc');

    if (!contentContainer || !tocContainer) return;

    try {
        const response = await fetch(markdownPath);
        if (!response.ok) throw new Error('Failed to load Markdown file.');
        const markdown = await response.text();

        // marked 应在全局或在页面中引入
        contentContainer.innerHTML = typeof marked !== 'undefined' ? marked.parse(markdown) : markdown;
        tocContainer.innerHTML = '';

        const headings = contentContainer.querySelectorAll('h1, h2, h3, h4');
        const path = [];
        const unescapeRegex = /\\([\\*_{}[\]()#+\-.!<>])/g;


        headings.forEach(heading => {
            const level = parseInt(heading.tagName.substring(1), 10);
            const originalHeading = heading.textContent.trim();
            const parts = originalHeading.split(' ');
            const keywordWithTags = parts.pop() || '';
            const definition = parts.join(' ').trim() || 'heading';

            // Base64 编码关键词，作为安全的唯一ID后缀
            const safeIdSuffix = toSafeBase64(keywordWithTags.replace(unescapeRegex, '$1').trim());
            // 创建锚点ID，包含释义前缀和 Base64 后缀，避免冲突
            const id = `${definition.replace(/\s+/g, '-')}-${safeIdSuffix}`;
            heading.id = id;

            const li = document.createElement('li');
            const tocItemDiv = document.createElement('div');
            tocItemDiv.classList.add('toc-item');
            tocItemDiv.style.paddingLeft = `${15 + (level - 1) * 20}px`;

            const a = document.createElement('a');
            a.href = `#${id}`;
            a.textContent = originalHeading;
            tocItemDiv.appendChild(a);
            li.appendChild(tocItemDiv);

            while (path.length > 0 && path[path.length - 1].level >= level) {
                path.pop();
            }

            const parentLi = path.length > 0 ? path[path.length - 1].element : null;
            if (parentLi) {
                let childList = parentLi.querySelector('.child-list');
                if (!childList) {
                    childList = document.createElement('ul');
                    childList.classList.add('child-list');
                    parentLi.appendChild(childList);

                    const parentTocItemDiv = parentLi.querySelector('.toc-item');
                    if (parentTocItemDiv && !parentTocItemDiv.querySelector('.toggle-icon')) {
                        const toggleButton = document.createElement('span');
                        toggleButton.classList.add('toggle-icon');
                        toggleButton.textContent = '>';
                        parentTocItemDiv.insertBefore(toggleButton, parentTocItemDiv.firstChild);

                        toggleButton.addEventListener('click', (event) => {
                            event.stopPropagation();
                            childList.classList.toggle('open');
                            toggleButton.classList.toggle('rotated');
                        });
                    }
                }
                childList.appendChild(li);
            } else {
                tocContainer.appendChild(li);
            }

            path.push({ level: level, element: li });
        });

        // 处理 URL 的 affix 参数（如果存在）
        const params = new URLSearchParams(window.location.search);
        const affix = params.get('affix');
        if (affix) {
            // 根据 Base64 编码的 affix 查找目标元素
            const targetElement = document.getElementById(affix);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                let activeLink = tocContainer.querySelector(`a[href="#${affix}"]`);
                let current = activeLink;
                while (current && current !== tocContainer) {
                    if (current.classList && current.classList.contains('child-list')) {
                        current.classList.add('open');
                        const toggle = current.parentElement.querySelector('.toggle-icon');
                        if (toggle) toggle.classList.add('rotated');
                    }
                    current = current.parentElement;
                }
            }
        }
    } catch (error) {
        console.error('Error rendering documentation:', error);
        if (contentContainer) contentContainer.innerHTML = '<p>无法加载文档内容。</p>';
    }
}

/**
 * 根据视口位置更新侧边目录高亮（用于 docs 页面）
 */
export function updateActiveLinkOnScroll() {
    const contentHeadings = Array.from(document.querySelectorAll('#docs-content-placeholder h1, #docs-content-placeholder h2, #docs-content-placeholder h3, #docs-content-placeholder h4'));
    const tocItems = document.querySelectorAll('#docs-toc .toc-item');
    let activeId = '';

    let topHeading = null;
    let minTop = Infinity;

    for (const heading of contentHeadings) {
        const rect = heading.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < minTop) {
            minTop = rect.top;
            topHeading = heading;
        }
    }

    if (topHeading) {
        activeId = topHeading.id;
    }

    tocItems.forEach(item => {
        const link = item.querySelector('a');
        item.classList.remove('active');
        if (link && link.getAttribute('href') === `#${activeId}`) {
            item.classList.add('active');
        }
    });
}

/**
 * 打开文档页面（可带 affix 参数）
 * affix 参数应为文档标题中的原始关键词
 */
export function openDocumentation(affix = null) {
    let url = '/templates/docs.html';
    if (affix) {
        const unescapeRegex = /\\([\\*_{}[\]()#+\-.!<>])/g;
        const cleanAffix = affix.replace(unescapeRegex, '$1').trim();
        const parts = cleanAffix.split(' ');
        const keywordWithTags = parts.pop() || '';
        const definition = parts.join(' ').trim() || 'heading';

        // 生成与 renderDocumentation 中相同的 ID 格式
        const safeIdSuffix = toSafeBase64(keywordWithTags);
        const idToLink = `${definition.replace(/\s+/g, '-')}-${safeIdSuffix}`;

        url += `?affix=${encodeURIComponent(idToLink)}`;
    }
    window.open(url, '_blank');
}

/**
 * 解析 docs.md，返回一个映射（key -> { original, definition, base64Id }）
 */
export async function loadDocHeadingsMap() {
    const map = {};
    try {
        const response = await fetch('/static/docs.md');
        if (!response.ok) {
            console.error('Failed to load docs.md for heading mapping.');
            return map;
        }
        const markdown = await response.text();
        const headingsRegex = /^(?:###|####) (.*)/gm;
        let match;
        const unescapeRegex = /\\([\\*_{}[\]()#+\-.!<>])/g;

        while ((match = headingsRegex.exec(markdown)) !== null) {
            const originalHeading = match[1].trim();
            const parts = originalHeading.split(' ');
            const keywordWithTags = parts.pop() || '';
            const definition = parts.join(' ').trim() || 'heading';

            let mapKey = keywordWithTags.replace(unescapeRegex, '$1').trim();
            if (mapKey) {
                // 生成与 renderDocumentation 中相同的 ID 格式
                const safeIdSuffix = toSafeBase64(mapKey);
                const idToLink = `${definition.replace(/\s+/g, '-')}-${safeIdSuffix}`;

                map[mapKey] = {
                    original: originalHeading,
                    definition: definition,
                    id: idToLink
                };
            }
        }
    } catch (error) {
        console.error('Error loading or parsing docs.md:', error);
    }
    return map;
}

/**
 * 在主界面（词条详情）中，把匹配文档标题的列表项设为可点击并显示释义 tooltip。
 * headingsMap: 上面返回的 map（key -> { original, definition, id }）
 */
export function setupDocumentationLinks(headingsMap = {}) {
    if (!headingsMap || typeof headingsMap !== 'object') return;

    // 直接从 DOM 查找对应的 list 容器（避免依赖外部变量）
    const linkLists = [
        document.getElementById('type-list'),
        document.getElementById('from-list')
    ].filter(Boolean);

    linkLists.forEach(list => {
        list.querySelectorAll('li').forEach(item => {
            const itemText = item.textContent.trim();
            if (!itemText) return;

            if (headingsMap.hasOwnProperty(itemText)) {
                const docInfo = headingsMap[itemText];

                item.style.color = 'green';
                item.style.cursor = 'pointer';

                item.addEventListener('click', (event) => {
                    event.stopPropagation();
                    // 调用 openDocumentation 并传入文档ID
                    openDocumentation(docInfo.original);
                });

                if (docInfo.definition) {
                    item.addEventListener('mouseenter', (event) => {
                        showTooltip(docInfo.definition, event.clientX, event.clientY);
                    });
                    item.addEventListener('mouseleave', () => {
                        hideTooltip();
                    });
                }
            }
        });
    });
}


// 自动在 docs.html 页面上渲染目录（保持原行为）
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('docs.html')) {
        renderDocumentation().then(() => {
            const contentEl = document.querySelector('.docs-content');
            if (contentEl) {
                updateActiveLinkOnScroll();
                contentEl.addEventListener('scroll', updateActiveLinkOnScroll);
            }
        });
    }
});
