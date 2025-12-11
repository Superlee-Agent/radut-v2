import { motion, AnimatePresence } from "framer-motion";
import type { RegisterState } from "@/hooks/useIPRegistrationAgent";

interface RegistrationLoadingModalProps {
  registerState: RegisterState;
  isOpen: boolean;
}

const statusMessages: Record<RegisterState["status"], string> = {
  idle: "Ready to register",
  compressing: "Compressing image",
  "uploading-image": "Uploading image to IPFS",
  "creating-metadata": "Creating metadata",
  "uploading-metadata": "Uploading metadata to IPFS",
  minting: "Minting IP asset on blockchain",
  success: "Registration successful!",
  error: "Registration failed",
};

const statusEmojis: Record<RegisterState["status"], string> = {
  idle: "⏳",
  compressing: "🗜️",
  "uploading-image": "📤",
  "creating-metadata": "📝",
  "uploading-metadata": "📤",
  minting: "⛓️",
  success: "✅",
  error: "❌",
};

const StepIndicator: React.FC<{
  steps: RegisterState["status"][];
  currentStep: RegisterState["status"];
}> = ({ steps, currentStep }) => {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="space-y-2 mt-6">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${
                isCompleted
                  ? "bg-emerald-500"
                  : isCurrent
                    ? "bg-[#FF4DA6] animate-pulse"
                    : "bg-slate-600"
              }`}
            />
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                isCompleted
                  ? "text-emerald-400 line-through"
                  : isCurrent
                    ? "text-[#FF4DA6]"
                    : "text-slate-500"
              }`}
            >
              {statusMessages[step]}
            </span>
            {isCompleted && <span className="text-xs text-emerald-400">✓</span>}
          </div>
        );
      })}
    </div>
  );
};

export const RegistrationLoadingModal: React.FC<
  RegistrationLoadingModalProps
> = ({ registerState, isOpen }) => {
  const steps: RegisterState["status"][] = [
    "compressing",
    "uploading-image",
    "creating-metadata",
    "uploading-metadata",
    "minting",
  ];

  const isLoading =
    registerState.status !== "idle" &&
    registerState.status !== "success" &&
    registerState.status !== "error";

  const isError = registerState.status === "error";
  const isSuccess = registerState.status === "success";

  return (
    <AnimatePresence>
      {isOpen && (registerState.status !== "idle" || isLoading) ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={(e) => {
              if (
                isSuccess ||
                isError
              ) {
                e.currentTarget.parentElement?.remove?.();
              }
            }}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-[#FF4DA6]/30 p-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Spinner */}
            {isLoading && (
              <motion.div
                className="flex justify-center mb-6"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <div className="relative w-16 h-16">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-slate-700/30" />
                  {/* Spinning ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FF4DA6] border-r-[#FF4DA6]/50" />
                </div>
              </motion.div>
            )}

            {/* Success Checkmark */}
            {isSuccess && (
              <motion.div
                className="flex justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </motion.div>
            )}

            {/* Error Icon */}
            {isError && (
              <motion.div
                className="flex justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
              >
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </motion.div>
            )}

            {/* Status Text */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white mb-2">
                {statusEmojis[registerState.status]}{" "}
                {statusMessages[registerState.status]}
              </h3>

              {/* Progress Percentage */}
              {isLoading && (
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#FF4DA6] to-pink-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.max(10, registerState.progress)}%`,
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-[#FF4DA6] w-10 text-right">
                      {registerState.progress}%
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {isError && registerState.error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-300 font-medium">
                    {typeof registerState.error === "string"
                      ? registerState.error
                      : registerState.error?.message ||
                        "An unexpected error occurred"}
                  </p>
                </div>
              )}

              {/* Success Message */}
              {isSuccess && registerState.ipId && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-xs text-emerald-300 font-mono break-all">
                    IP ID: {registerState.ipId}
                  </p>
                  <a
                    href={`https://explorer.story.foundation/ipa/${registerState.ipId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold"
                  >
                    View on Explorer →
                  </a>
                </div>
              )}
            </div>

            {/* Steps Indicator */}
            {isLoading && <StepIndicator steps={steps} currentStep={registerState.status} />}

            {/* Close Button */}
            {(isSuccess || isError) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.2 }}
              >
                <button
                  onClick={() => {
                    const modal = document.querySelector(
                      '[data-registration-modal]',
                    ) as HTMLElement | null;
                    if (modal) {
                      modal.remove?.();
                    }
                  }}
                  className={`w-full mt-6 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                    isSuccess
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}
                >
                  {isSuccess ? "Done" : "Dismiss"}
                </button>
              </motion.div>
            )}

            {/* Tip Text */}
            {isLoading && (
              <p className="mt-6 text-center text-xs text-slate-400">
                Please keep this window open during registration.
              </p>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
