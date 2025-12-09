import React, {
  ChangeEvent,
  Dispatch,
  FormEvent,
  KeyboardEvent,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FlyingImageAnimation from "@/components/ip/imagine/FlyingImageAnimation";
import {
  RemixImage,
  type PreviewImage,
  type PreviewImagesState,
} from "@/components/ip/remix";
import type { Creation } from "@/context/CreationContext";

type IpImagineInputProps = {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  waiting: boolean;
  previewImages: PreviewImagesState;
  setPreviewImages: Dispatch<SetStateAction<PreviewImagesState>>;
  uploadRef: MutableRefObject<HTMLInputElement | null>;
  handleImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => Promise<void> | void;
  inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  toolsOpen: boolean;
  setToolsOpen: Dispatch<SetStateAction<boolean>>;
  suggestions: string[];
  setSuggestions: Dispatch<SetStateAction<string[]>>;
  attachmentLoading?: boolean;
  onRemixRegisterWarning?: () => void;
  onAddRemixImage?: () => void;
  creationMode?: "image" | "video";
  setCreationMode?: Dispatch<SetStateAction<"image" | "video">>;
  resultUrl?: string | null;
  resultUrls?: string[];
  creations?: Creation[];
};

const IpImagineInput = ({
  input,
  setInput,
  waiting,
  previewImages,
  setPreviewImages,
  uploadRef,
  handleImage,
  onSubmit,
  inputRef,
  handleKeyDown,
  toolsOpen,
  setToolsOpen,
  suggestions,
  setSuggestions,
  attachmentLoading = false,
  onRemixRegisterWarning,
  onAddRemixImage,
  creationMode = "image",
  setCreationMode = () => {},
  resultUrl = null,
  resultUrls = [],
  creations = [],
}: IpImagineInputProps) => {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showFlyingAnimation, setShowFlyingAnimation] = useState(false);
  const galleryButtonRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  return (
    <form
      className="chat-input flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-[1.45rem] py-2.5 sm:py-3 md:py-3.5 border-t-0 md:border-t md:border-[#FF4DA6]/10 bg-slate-950/60 md:bg-gradient-to-r md:from-slate-950/60 md:via-[#FF4DA6]/5 md:to-slate-950/60 flex-none sticky bottom-0 z-10 backdrop-blur-xl transition-all duration-300"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const isRemixWithRegister =
          previewImages.remixImage && input.toLowerCase().includes("register");
        if (isRemixWithRegister) {
          onRemixRegisterWarning?.();
        } else {
          setShowFlyingAnimation(true);
          setTimeout(() => {
            void onSubmit();
          }, 100);
        }
      }}
      autoComplete="off"
    >
      {/* Gallery Button - Always visible */}
      <div ref={galleryButtonRef} className="mr-2 flex items-center relative">
        <button
          type="button"
          onClick={() => {
            navigate("/ip-imagine/result");
          }}
          disabled={!resultUrl && !waiting && creations.length === 0}
          className={`flex-shrink-0 p-2 sm:p-1.5 rounded-lg active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4DA6]/30 ${
            waiting || resultUrl || creations.length > 0
              ? "text-[#FF4DA6] bg-[#FF4DA6]/10"
              : "text-[#FF4DA6] hover:bg-[#FF4DA6]/10"
          }`}
          aria-label="View creations and results"
          title="Creation Results"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 sm:h-5 sm:w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM11 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM11 12a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" />
          </svg>
        </button>

        {/* Pink Box with Stacking Effect - Only shows after generation starts */}
        <AnimatePresence>
          {waiting || resultUrl ? (
            <div
              className="absolute inset-0 -translate-x-[10%] pointer-events-none"
              style={{ perspective: "1000px" }}
            >
              {/* Stacked layers for multiple results */}
              {resultUrls.slice(0, 3).map((url, index) => (
                <motion.div
                  key={`stack-${index}`}
                  className="absolute inset-0 rounded-lg overflow-hidden bg-[#FF4DA6]/20 border border-[#FF4DA6]/30 hover:border-[#FF4DA6]/50 pointer-events-none"
                  initial={{ opacity: 0, y: 0, rotateZ: 0 }}
                  animate={{
                    opacity: 0.7 - index * 0.15,
                    y: index * 4,
                    rotateZ: index * 2,
                    transition: { delay: index * 0.05 },
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    zIndex: -index,
                  }}
                >
                  <motion.img
                    src={url}
                    alt="Generation result thumbnail"
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              ))}

              {/* Loading box - shows on top */}
              {waiting && (
                <motion.div
                  key="loading-box"
                  className="absolute inset-0 rounded-lg overflow-hidden bg-[#FF4DA6]/20 border border-[#FF4DA6]/30 hover:border-[#FF4DA6]/50 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    zIndex: resultUrls.length,
                  }}
                >
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-[#FF4DA6]/20"
                    animate={{
                      backgroundColor: [
                        "rgba(255, 77, 166, 0.2)",
                        "rgba(255, 77, 166, 0.3)",
                        "rgba(255, 77, 166, 0.2)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg
                      className="h-6 w-6 text-[#FF4DA6] animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeOpacity="0.15"
                        strokeWidth="3"
                      />
                      <path
                        d="M22 12a10 10 0 00-10-10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.div>
                </motion.div>
              )}

              {/* Current result on top */}
              {resultUrl && !waiting && (
                <motion.div
                  key="current-result"
                  className="absolute inset-0 rounded-lg overflow-hidden bg-[#FF4DA6]/20 border border-[#FF4DA6]/30 hover:border-[#FF4DA6]/50 pointer-events-none"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    zIndex: resultUrls.length,
                  }}
                >
                  <motion.img
                    src={resultUrl}
                    alt="Generation result thumbnail"
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.div>
              )}
            </div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex flex-col gap-2 bg-slate-900/60 rounded-2xl pl-2 pr-4 py-2 focus-within:ring-2 focus-within:ring-[#FF4DA6]/30 transition-all duration-300">
        <RemixImage
          previewImages={previewImages}
          setPreviewImages={setPreviewImages}
          onAddImageClick={onAddRemixImage}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-file-input-btn
            data-tour-upload
            disabled={attachmentLoading}
            className={`flex-shrink-0 p-2 sm:p-1.5 rounded-lg active:scale-95 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4DA6]/30 ${attachmentLoading ? "text-slate-400 bg-slate-800/30 cursor-wait" : "text-[#FF4DA6] hover:bg-[#FF4DA6]/20"}`}
            onClick={() => uploadRef.current?.click()}
            onPointerDown={(event) => event.preventDefault()}
            aria-label="Add attachment"
          >
            {attachmentLoading ? (
              <svg
                className="h-5 w-5 animate-spin text-[#FF4DA6]"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity="0.15"
                  strokeWidth="3"
                />
                <path
                  d="M22 12a10 10 0 00-10-10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )}
          </button>

          <textarea
            ref={inputRef as any}
            data-chat-input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder={
              !isInputFocused
                ? "Type to create…"
                : creationMode === "video"
                  ? "Type to make video…"
                  : "Type to make image…"
            }
            disabled={waiting}
            className="flex-1 resize-none px-4 py-0 bg-transparent text-white placeholder:text-slate-400 min-h-[40px] max-h-32 overflow-y-auto focus:outline-none font-medium text-[0.97rem] disabled:opacity-50"
          />
        </div>

        {isInputFocused && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center gap-2 px-2 py-2"
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCreationMode("image")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${creationMode === "image" ? "bg-slate-700 text-white" : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"}`}
              aria-pressed={creationMode === "image"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Image
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCreationMode("video")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 relative ${creationMode === "video" ? "bg-[#FF4DA6] text-white" : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"}`}
              aria-pressed={creationMode === "video"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Video
              <span className="text-xs ml-1 px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
                Coming Soon
              </span>
            </button>
          </motion.div>
        )}

        {suggestions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-1.5 px-4 py-2 border-t border-slate-700/50"
          >
            <p className="text-xs text-slate-400 font-medium">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion + index}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setInput(suggestion);
                    setSuggestions([]);
                    inputRef.current?.focus?.();
                  }}
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-[#FF4DA6]/20 to-[#FF4DA6]/10 text-[#FF4DA6] rounded-lg hover:from-[#FF4DA6]/30 hover:to-[#FF4DA6]/20 transition-all duration-200 hover:scale-105 cursor-pointer font-medium border border-[#FF4DA6]/20 hover:border-[#FF4DA6]/40"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>

      <button
        type="submit"
        data-tour-submit
        disabled={
          waiting ||
          (!input.trim() &&
            !previewImages.remixImage &&
            !previewImages.additionalImage)
        }
        className="flex-shrink-0 p-2.5 sm:p-2 rounded-lg bg-[#FF4DA6]/20 text-[#FF4DA6] hover:bg-[#FF4DA6]/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4DA6]/30"
        aria-label="Send message"
        onPointerDown={(event) => event.preventDefault()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M2.94 2.94a1.5 1.5 0 012.12 0L17 14.88V17a1 1 0 01-1 1h-2.12L2.94 5.06a1.5 1.5 0 010-2.12z" />
        </svg>
      </button>

      <FlyingImageAnimation
        isActive={showFlyingAnimation}
        targetRef={galleryButtonRef}
        onComplete={() => setShowFlyingAnimation(false)}
      />
    </form>
  );
};

export default IpImagineInput;
