import { useRef, useEffect, useCallback } from 'react';

/**
 * useLongPress — 长按检测 hook
 *
 * 同时支持触摸（移动端）和鼠标（桌面端 dev 测试）。
 * 500ms 按住 + 移动不超过阈值 → 触发 callback。
 * 滚动、多指触摸、移动超阈值 → 取消长按。
 *
 * @param {Function} callback  长按触发回调 (event) => void
 * @param {Object}   options
 * @param {number}   options.delay         按住时长 (ms)，默认 500
 * @param {number}   options.moveThreshold 最大移动像素，默认 10
 * @param {boolean}  options.enabled       是否启用，默认 true
 * @returns {{ onTouchStart, onTouchEnd, onTouchMove, onMouseDown, onMouseUp }}
 */
export default function useLongPress(callback, {
  delay = 500,
  moveThreshold = 10,
  enabled = true,
} = {}) {
  const timerRef = useRef(null);
  const startPosRef = useRef(null);
  const isLongPressRef = useRef(false);
  const isTouchRef = useRef(false);       // 防止触屏设备 mouse 事件二次触发
  const callbackRef = useRef(callback);
  callbackRef.current = callback;        // 保持 callback 最新，不重建设定时器

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 滚动时取消长按
  useEffect(() => {
    if (!enabled) return;
    const handleScroll = () => {
      clearTimer();
      startPosRef.current = null;
      isTouchRef.current = false;
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, [enabled, clearTimer]);

  // 组件卸载时清理
  useEffect(() => () => clearTimer(), [clearTimer]);

  // ── Touch 路径 ──────────────────────────────────────

  const onTouchStart = (e) => {
    if (!enabled) return;
    if (e.touches.length !== 1) { clearTimer(); return; } // 多指=取消
    isTouchRef.current = true;
    isLongPressRef.current = false;
    startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      callbackRef.current(e);
    }, delay);
  };

  const onTouchMove = (e) => {
    if (!startPosRef.current) return;
    const dx = e.touches[0].clientX - startPosRef.current.x;
    const dy = e.touches[0].clientY - startPosRef.current.y;
    if (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold) {
      clearTimer();
      startPosRef.current = null;
    }
  };

  const onTouchEnd = (e) => {
    clearTimer();
    if (isLongPressRef.current) {
      e.preventDefault(); // 阻止浏览器默认 contextmenu
    }
    startPosRef.current = null;
    isLongPressRef.current = false;
    // 延迟重置，确保 mouse 事件不被抑制
    setTimeout(() => { isTouchRef.current = false; }, 400);
  };

  // ── Mouse 路径（桌面端 dev 测试） ──────────────────

  const onMouseDown = (e) => {
    if (!enabled) return;
    if (isTouchRef.current) return; // 触屏产生的 mouse 事件忽略
    isLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      callbackRef.current(e);
    }, delay);
  };

  const onMouseUp = (e) => {
    if (isTouchRef.current) return;
    clearTimer();
    if (isLongPressRef.current) {
      e.preventDefault();
    }
    startPosRef.current = null;
    isLongPressRef.current = false;
  };

  return { onTouchStart, onTouchEnd, onTouchMove, onMouseDown, onMouseUp };
}
