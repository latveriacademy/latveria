import { MessageSquare } from "lucide-react";
import { useApp } from "../../context/AppContext";

export function FloatingChatButton() {
  const { currentTab, setCurrentTab, activeSession } = useApp();

  if (activeSession || currentTab === "chat") {
    return null;
  }

  return (
    <button
      type="button"
      className="floating-chat-btn motion-fade-in"
      onClick={() => setCurrentTab("chat")}
      aria-label="Buka Chat"
      title="Buka Chat"
    >
      <MessageSquare size={22} className="shrink-0" />
    </button>
  );
}
