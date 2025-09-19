// theme.js

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('theme-toggle-btn');
    const docElement = document.documentElement; // <html> 标签

    // 定义三种模式和对应的 SVG 图标
    const themes = ['system', 'light', 'dark'];
    const icons = {
        system: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h6l-2 3h12l-2-3h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/></svg>`,
        light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 9c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3zm0-7c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1V3c0-.55.45-1 1-1zm0 18c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1v-2c0-.55.45-1 1-1zm-8.07-2.93c.39-.39 1.02-.39 1.41 0l1.41 1.41c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0l-1.41-1.41c-.39-.39-.39-1.02 0-1.41zm12.73 0c.39-.39 1.02-.39 1.41 0l1.41 1.41c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0l-1.41-1.41c-.39-.39-.39-1.02 0-1.41zM4 12c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1zm18 0c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1zM5.34 5.34c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.41 1.41c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L5.34 5.34zm12.73 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39.39.39 1.02 0 1.41s-1.02.39-1.41 0z"/></svg>`,
        dark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.1 2.05c-.34.03-.68.1-1.01.2C5.9 3.11 3.11 5.9 2.25 10.09c-.9 4.37.56 8.78 4.22 11.45 3.65 2.67 8.59 2.5 12.03-.43.32-.27.53-.64.53-.99 0-.47-.28-.88-.71-1.06-3.08-1.2-5.11-4.14-5.11-7.44 0-4.42 3.58-8 8-8 .36 0 .72.03 1.07.1.5.08.99-.16 1.15-.64.21-.59-.1-1.25-.7-1.44C16.92 2.65 14.05 2 11.1 2.05z"/></svg>`
    };

    // 获取系统颜色模式
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // 应用主题的函数
    const applyTheme = (theme) => {
        let finalTheme = theme;
        if (theme === 'system') {
            finalTheme = prefersDark.matches ? 'dark' : 'light';
        }

        docElement.setAttribute('data-theme', finalTheme);
        toggleButton.innerHTML = icons[theme]; // 更新按钮图标
        localStorage.setItem('theme-preference', theme); // 保存用户选择
    };

    // 切换主题的函数
    const switchTheme = () => {
        // 从 localStorage 获取当前设置，如果不存在则默认为 'system'
        const currentTheme = localStorage.getItem('theme-preference') || 'system';
        const currentIndex = themes.indexOf(currentTheme);
        // 循环切换到下一个主题
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        applyTheme(nextTheme);
    };

    // 监听按钮点击
    toggleButton.addEventListener('click', switchTheme);

    // 监听系统颜色模式变化
    prefersDark.addEventListener('change', () => {
        const currentSetting = localStorage.getItem('theme-preference');
        // 仅当用户设置为 'system' 时，才跟随系统变化
        if (!currentSetting || currentSetting === 'system') {
            applyTheme('system');
        }
    });

    // 初始化：页面加载时应用保存的主题或系统默认主题
    applyTheme(localStorage.getItem('theme-preference') || 'system');
});