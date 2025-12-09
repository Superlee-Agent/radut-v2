import { useEffect, useRef } from "react";

interface FlyingImageAnimationProps {
  isActive: boolean;
  targetRef: React.RefObject<HTMLElement>;
  onComplete?: () => void;
}

const FlyingImageAnimation = ({
  isActive,
  targetRef,
  onComplete,
}: FlyingImageAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Clean up when animation is disabled
      if (animationRef.current) {
        animationRef.current.cancel();
        animationRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!targetRef.current || !containerRef.current) return;

    // Calculate animation trajectory from current position to target
    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = targetRef.current.getBoundingClientRect();

    const startX = containerRect.left + containerRect.width / 2;
    const startY = containerRect.top + containerRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Play animation
    try {
      animationRef.current = containerRef.current.animate(
        [
          {
            transform: "translate(0, 0) scale(1)",
            opacity: "1",
          },
          {
            transform: `translate(${deltaX}px, ${deltaY}px) scale(0.3)`,
            opacity: "0",
          },
        ],
        {
          duration: 800,
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          fill: "forwards",
        },
      );

      // Call onComplete callback after animation finishes
      timerRef.current = setTimeout(() => {
        onComplete?.();
      }, 800);
    } catch (error) {
      console.warn("[FlyingImageAnimation] Animation failed:", error);
      onComplete?.();
    }

    // Cleanup function
    return () => {
      if (animationRef.current) {
        animationRef.current.cancel();
        animationRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, targetRef, onComplete]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#FF4DA6] to-[#FF4DA6]/60 border-2 border-[#FF4DA6] shadow-lg flex items-center justify-center">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
    </div>
  );
};

export default FlyingImageAnimation;
