// theme.js
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('theme-toggle-btn');
    const docElement = document.documentElement; // <html>

    // 三种模式
    const modes = ['system', 'light', 'dark'];

    // 图标（表示模式）
    const icons = {
        system: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h6l-2 3h12l-2-3h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/></svg>`,
        light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 9c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3zm0-7c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1V3c0-.55.45-1 1-1zm0 18c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1v-2c0-.55.45-1 1-1zm-8.07-2.93c.39-.39 1.02-.39 1.41 0l1.41 1.41c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0l-1.41-1.41c-.39-.39-.39-1.02 0-1.41zm12.73 0c.39-.39 1.02-.39 1.41 0l1.41 1.41c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0l-1.41-1.41c-.39-.39-.39-1.02 0-1.41zM4 12c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1zm18 0c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1zM5.34 5.34c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.41 1.41c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L5.34 5.34zm12.73 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0z"/></svg>`,
        dark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.1 2.05c-.34.03-.68.1-1.01.2C5.9 3.11 3.11 5.9 2.25 10.09c-.9 4.37.56 8.78 4.22 11.45 3.65 2.67 8.59 2.5 12.03-.43.32-.27.53-.64.53-.99 0-.47-.28-.88-.71-1.06-3.08-1.2-5.11-4.14-5.11-7.44 0-4.42 3.58-8 8-8 .36 0 .72.03 1.07.1.5.08.99-.16 1.15-.64.21-.59-.1-1.25-.7-1.44C16.92 2.65 14.05 2 11.1 2.05z"/></svg>`
    };

    // 系统深色模式监听
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // 应用模式（mode = system/light/dark）
    const applyTheme = (mode) => {
        let finalTheme = mode === 'system'
            ? (prefersDark.matches ? 'dark' : 'light')
            : mode;

        // 设置 HTML 属性，驱动 CSS
        docElement.setAttribute('data-theme', finalTheme);

        // 按钮图标显示模式，而不是最终状态
        toggleButton.innerHTML = icons[mode];

        // 保存用户模式
        localStorage.setItem('theme-preference', mode);

        console.log(`Mode: ${mode}, Final applied: ${finalTheme}`);
    };

    // 切换模式
    const switchMode = () => {
        const currentMode = localStorage.getItem('theme-preference') || 'system';
        const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
        applyTheme(nextMode);
    };

    // 监听按钮点击
    toggleButton.addEventListener('click', switchMode);

    // 监听系统主题变化，仅在 system 模式下有效
    prefersDark.addEventListener('change', () => {
        const currentMode = localStorage.getItem('theme-preference') || 'system';
        if (currentMode === 'system') applyTheme('system');
    });

    // 初始化：没有用户设置时，强制写入 system
    let savedMode = localStorage.getItem('theme-preference');
    if (!savedMode) {
        savedMode = 'system';
        localStorage.setItem('theme-preference', 'system');
    }
    applyTheme(savedMode);
});
