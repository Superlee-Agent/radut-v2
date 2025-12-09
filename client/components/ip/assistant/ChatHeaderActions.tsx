import type { FC } from "react";

type ChatHeaderActionsProps = {
  guestMode: boolean;
  onToggleGuest: () => void;
  walletButtonText: string;
  walletButtonDisabled: boolean;
  onWalletClick: () => void;
  connectedAddressLabel?: string | null;
  onTryDemo?: () => void;
  demoMode?: boolean;
  showGuest?: boolean;
  isWalletConnected?: boolean;
};

const ChatHeaderActions: FC<ChatHeaderActionsProps> = ({
  guestMode,
  onToggleGuest,
  walletButtonText,
  walletButtonDisabled,
  onWalletClick,
  connectedAddressLabel,
  onTryDemo,
  demoMode,
  showGuest = true,
  isWalletConnected = false,
}) => (
  <>
    {connectedAddressLabel ? (
      <span className="hidden text-xs font-medium text-[#FF4DA6]/80 sm:inline">
        {connectedAddressLabel}
      </span>
    ) : null}
    <div className="flex items-center gap-2">
      {onTryDemo && (
        <button
          type="button"
          onClick={onTryDemo}
          className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4DA6]/40 ${
            demoMode
              ? "bg-[#FF4DA6] text-white hover:bg-[#ff77c2]"
              : "text-[#FF4DA6] hover:bg-[#FF4DA6]/15"
          }`}
          title={demoMode ? "Exit Guest Mode" : "Enter Guest Mode"}
        >
          <span className="inline-flex items-center gap-2">
            {demoMode && (
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            )}
            <span>Guest</span>
          </span>
        </button>
      )}
      {showGuest && (
        <button
          type="button"
          aria-pressed={guestMode}
          onClick={onToggleGuest}
          disabled={isWalletConnected}
          title={
            isWalletConnected
              ? "Disconnect wallet to enable guest mode"
              : "Toggle guest mode"
          }
          className={
            "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4DA6]/40 " +
            (isWalletConnected
              ? "text-[#FF4DA6]/50 cursor-not-allowed opacity-50"
              : guestMode
                ? "bg-[#FF4DA6] text-white hover:bg-[#ff77c2]"
                : "text-[#FF4DA6] hover:bg-[#FF4DA6]/15")
          }
        >
          Guest
        </button>
      )}
      <button
        type="button"
        onClick={onWalletClick}
        disabled={walletButtonDisabled}
        className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-[#FF4DA6] transition-colors duration-200 hover:bg-[#FF4DA6]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4DA6]/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {walletButtonText}
      </button>
    </div>
  </>
);

export default ChatHeaderActions;
