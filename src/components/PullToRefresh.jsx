import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const containerRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);

  const REFRESH_THRESHOLD = 80;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (container.scrollTop !== 0 || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;

      if (distance > 0) {
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= REFRESH_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }
      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
      {pullDistance > 0 && (
        <motion.div
          className="flex justify-center items-center py-4"
          animate={{ opacity: pullDistance / REFRESH_THRESHOLD }}
        >
          <RefreshCw
            className="w-5 h-5 text-amber-600"
            style={{
              transform: `rotate(${(pullDistance / REFRESH_THRESHOLD) * 360}deg)`,
            }}
          />
        </motion.div>
      )}
      <div style={{ transform: `translateY(${pullDistance / 2}px)` }}>
        {children}
      </div>
    </div>
  );
}