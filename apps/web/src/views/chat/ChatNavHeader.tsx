import { Globe, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";

export interface ChatNavHeaderProps {
  activeTab: "global" | "dm";
  onTabChange: (tab: "global" | "dm") => void;
  hasUnreadDm: boolean;
}

export function ChatNavHeader({ activeTab, onTabChange, hasUnreadDm }: ChatNavHeaderProps) {
  return (
    <>
      {/* Desktop Tabs Header */}
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-[var(--edge)] pb-3 shrink-0">
        <Tabs value={activeTab} onValueChange={(val) => onTabChange(val as "global" | "dm")}>
          <TabsList className="bg-[var(--surface-subtle)] border border-[var(--edge)] p-1">
            <TabsTrigger
              value="global"
              className="text-xs data-[state=active]:bg-[var(--gold)] data-[state=active]:text-black"
            >
              <Globe className="size-3.5 mr-1" />
              <span>Saluran Global</span>
            </TabsTrigger>
            <TabsTrigger
              value="dm"
              className="text-xs data-[state=active]:bg-[var(--gold)] data-[state=active]:text-black relative"
            >
              <Users className="size-3.5 mr-1" />
              <span>Chat</span>
              {hasUnreadDm && (
                <span className="size-2 rounded-full bg-[var(--gold)] animate-pulse ml-1" />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mobile Header */}
      <div
        className="md:hidden shrink-0 bg-[var(--surface-subtle)] border-b border-[var(--edge)] px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 flex items-center justify-between gap-2 shadow-xs z-10"
        data-testid="mobile-chat-header"
      >
        <div className="flex items-center gap-1 flex-1 bg-[var(--surface-elevated)] p-1 rounded-md border border-[var(--edge)]">
          <button
            type="button"
            onClick={() => onTabChange("global")}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-serif font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "global"
                ? "bg-[var(--gold)] text-black shadow-xs"
                : "text-[var(--text-muted,#9ca3af)] hover:text-[var(--text-main,#f3f4f6)] opacity-90"
            }`}
          >
            <Globe className="size-3.5" />
            <span>Saluran Global</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("dm")}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-serif font-bold transition-all flex items-center justify-center gap-1.5 relative cursor-pointer ${
              activeTab === "dm"
                ? "bg-[var(--gold)] text-black shadow-xs"
                : "text-[var(--text-muted,#9ca3af)] hover:text-[var(--text-main,#f3f4f6)] opacity-90"
            }`}
          >
            <Users className="size-3.5" />
            <span>Chat</span>
            {hasUnreadDm && (
              <span
                className={`size-2 rounded-full ${
                  activeTab === "dm" ? "bg-black" : "bg-red-500"
                } animate-pulse ml-1`}
              />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
