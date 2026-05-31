import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 检测当前环境是否支持触摸
 * 仅可在浏览器环境中调用（useEffect / 事件回调内）
 */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}

/**
 * useIsTouchDevice — 响应式触摸检测 hook
 * 首屏后返回正确值（SSR 安全）
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);
  return isTouch;
}

/**
 * 从触摸或鼠标事件中统一提取坐标
 * @param {TouchEvent|MouseEvent} e
 * @returns {{ clientX: number, clientY: number, pageX: number, pageY: number } | null}
 */
export function getTouchPosition(e) {
  if (e.touches && e.touches.length > 0) {
    return {
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
      pageX: e.touches[0].pageX,
      pageY: e.touches[0].pageY,
    };
  }
  if (e.changedTouches && e.changedTouches.length > 0) {
    return {
      clientX: e.changedTouches[0].clientX,
      clientY: e.changedTouches[0].clientY,
      pageX: e.changedTouches[0].pageX,
      pageY: e.changedTouches[0].pageY,
    };
  }
  if (typeof e.clientX === 'number') {
    return {
      clientX: e.clientX,
      clientY: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
    };
  }
  return null;
}

/**
 * useSwipe — 轻量滑动手势检测
 * 为 Phase 2 字典页面板滑动预留
 *
 * @param {React.RefObject} ref      监听的目标元素 ref
 * @param {Object}         options
 * @param {number}         options.threshold  最小滑动距离 (px)，默认 50
 * @param {Function}       options.onSwipeLeft
 * @param {Function}       options.onSwipeRight
 * @param {Function}       options.onSwipeUp
 * @param {Function}       options.onSwipeDown
 */
export function useSwipe(ref, {
  threshold = 50,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
} = {}) {
  const startRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const pos = getTouchPosition(e);
    if (pos) {
      startRef.current = { x: pos.clientX, y: pos.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!startRef.current) return;
    const pos = getTouchPosition(e);
    if (!pos) return;
    const dx = pos.clientX - startRef.current.x;
    const dy = pos.clientY - startRef.current.y;
    startRef.current = null;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平滑动
      if (dx > 0 && onSwipeRight) onSwipeRight();
      else if (dx < 0 && onSwipeLeft) onSwipeLeft();
    } else {
      if (dy > 0 && onSwipeDown) onSwipeDown();
      else if (dy < 0 && onSwipeUp) onSwipeUp();
    }
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchEnd]);
}
