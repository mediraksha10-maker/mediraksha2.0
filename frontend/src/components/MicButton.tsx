import React from "react";
import { Mic, MicOff } from "lucide-react";

/* ─── Props ─── */
interface MicButtonProps {
  /** Called when the user clicks the button */
  onClick: () => void;
  /** Whether the mic is actively recording */
  isListening: boolean;
  /** Disable the button (e.g. while the bot is typing) */
  disabled?: boolean;
}

/**
 * MicButton
 *
 * A purely presentational component that renders the microphone toggle button.
 * It contains NO business logic — all behaviour is controlled via props.
 */
const MicButton: React.FC<MicButtonProps> = ({ onClick, isListening, disabled = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={isListening ? "Stop recording" : "Speak your symptoms (Hindi / English)"}
      aria-label={isListening ? "Stop recording" : "Start voice input"}
      className={[
        /* base */
        "relative p-2 rounded-xl transition-all duration-200 cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-40",
        /* state-driven colours */
        isListening
          ? "bg-rose-500 text-white shadow-md shadow-rose-200 hover:bg-rose-600"
          : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200",
      ].join(" ")}
    >
      {/* Pulsing ring visible only while listening */}
      {isListening && (
        <span className="absolute inset-0 rounded-xl animate-ping bg-rose-400 opacity-40 pointer-events-none" />
      )}

      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
};

export default MicButton;
