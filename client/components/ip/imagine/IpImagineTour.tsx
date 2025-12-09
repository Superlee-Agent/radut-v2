import { motion, AnimatePresence } from "framer-motion";
import type { TourStep } from "@/hooks/useIpImagineTour";

interface IpImagineTourProps {
  tourStep: TourStep;
  targetElementRect: DOMRect | null;
  onNext: () => void;
  onSkip: () => void;
}

const tourContent: Record<
  Exclude<TourStep, null>,
  { instruction: string; arrow: string }
> = {
  upload: {
    instruction: "↑ Click to upload or select an image",
    arrow: "↑",
  },
  input: {
    instruction: "↓ Describe what you want to create or remix",
    arrow: "↓",
  },
  submit: {
    instruction: "→ Click to generate your IP asset",
    arrow: "→",
  },
};

export function IpImagineTour({
  tourStep,
  targetElementRect,
  onNext,
  onSkip,
}: IpImagineTourProps) {
  const isActive = tourStep !== null;
  const content = tourStep && tourContent[tourStep];

  return (
    <AnimatePresence>
      {isActive && targetElementRect && content && (
        <motion.div
          key="tour-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50"
        >
          {/* Backdrop overlay */}
          <motion.div
            className="absolute inset-0 bg-black/40 pointer-events-auto cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onSkip}
          />

          {/* Highlight ring around target element */}
          <motion.div
            className="absolute border-2 border-[#FF4DA6] rounded-lg pointer-events-none"
            style={{
              left: targetElementRect.left - 8,
              top: targetElementRect.top - 8,
              width: targetElementRect.width + 16,
              height: targetElementRect.height + 16,
            }}
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(255, 77, 166, 0.7)",
                "0 0 0 20px rgba(255, 77, 166, 0)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />

          {/* Centered instruction label */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="text-white font-semibold text-lg bg-[#FF4DA6] px-4 py-2 rounded-lg whitespace-nowrap"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              {content.instruction}
            </motion.div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="absolute bottom-8 right-8 flex gap-3 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              Skip
            </button>
            <button
              onClick={onNext}
              className="px-4 py-2 bg-[#FF4DA6] hover:bg-[#FF4DA6]/80 text-white rounded-lg font-semibold transition-colors"
            >
              {tourStep === "submit" ? "Done" : "Next Step →"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
