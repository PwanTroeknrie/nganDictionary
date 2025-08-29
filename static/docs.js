/**
 * 渲染 Markdown，构建一个与主界面样式一致的、向下展开的树状大纲，并设置滚动高亮。
 */
async function renderDocumentation() {
    const markdownPath = '/static/docs.md';
    const contentContainer = document.getElementById('docs-content-placeholder');
    const tocContainer = document.getElementById('docs-toc');

    try {
        const response = await fetch(markdownPath);
        if (!response.ok) throw new Error('Failed to load Markdown file.');
        const markdown = await response.text();

        contentContainer.innerHTML = marked.parse(markdown);
        tocContainer.innerHTML = '';

        const headings = contentContainer.querySelectorAll('h1, h2, h3, h4');
        const path = [];

        headings.forEach(heading => {
            const level = parseInt(heading.tagName.substring(1), 10);
            const id = heading.textContent.trim().toLowerCase().replace(/\s+/g, '-').replace(/<w>/g, 'w');
            heading.id = id;

            // 1. 创建列表项 <li>
            const li = document.createElement('li');

            // 2. 创建可点击的行 <div class="toc-item">
            const tocItemDiv = document.createElement('div');
            tocItemDiv.classList.add('toc-item');

            // 根据层级添加 padding-left 实现缩进
            tocItemDiv.style.paddingLeft = `${15 + (level - 1) * 20}px`;

            const a = document.createElement('a');
            a.href = `#${id}`;
            a.textContent = heading.textContent;
            tocItemDiv.appendChild(a);
            li.appendChild(tocItemDiv);

            // 3. 回溯路径，找到正确的父级 <li>
            while (path.length > 0 && path[path.length - 1].level >= level) {
                path.pop();
            }

            let parentLi = path.length > 0 ? path[path.length - 1].element : null;

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

        // 4. 处理 URL 参数，滚动到指定位置并展开父级
        const params = new URLSearchParams(window.location.search);
        const affix = params.get('affix');
        if (affix) {
            // 需要使用原始标题来生成 ID
            const cleanAffixId = affix.trim().toLowerCase().replace(/\s+/g, '-').replace(/<w>/g, 'w');
            const targetElement = document.getElementById(cleanAffixId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                let activeLink = tocContainer.querySelector(`a[href="#${cleanAffixId}"]`);
                let current = activeLink;
                while (current && current !== tocContainer) {
                    if (current.classList.contains('child-list')) {
                        current.classList.add('open');
                        const toggle = current.parentElement.querySelector('.toggle-icon');
                        if(toggle) toggle.classList.add('rotated');
                    }
                    current = current.parentElement;
                }
            }
        }
    } catch (error) {
        console.error('Error rendering documentation:', error);
        contentContainer.innerHTML = '<p>无法加载文档内容。</p>';
    }
}


/**
 * 根据滚动位置更新大纲中的高亮链接
 */
function updateActiveLinkOnScroll() {
    const contentHeadings = Array.from(document.querySelectorAll('#docs-content-placeholder h1, #docs-content-placeholder h2, #docs-content-placeholder h3, #docs-content-placeholder h4'));
    const tocItems = document.querySelectorAll('#docs-toc .toc-item');
    let activeId = '';

    // 找到当前视口中最顶部的标题
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

    // 更新大纲 div 的 active 状态
    tocItems.forEach(item => {
        const link = item.querySelector('a');
        item.classList.remove('active');
        if (link && link.getAttribute('href') === `#${activeId}`) {
            item.classList.add('active');
        }
    });
}

/**
 * Opens the documentation for a specific affix or the main documentation page.
 * @param {string} [affix=null] - The affix to link to, e.g., 'ma', 'memper'.
 */
export function openDocumentation(affix = null) {
    let url = '/templates/docs.html';

    if (affix) {
        url += `?affix=${encodeURIComponent(affix)}`;
    }

    window.open(url, '_blank');
}

// 只有在新页面加载时才渲染文档
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
