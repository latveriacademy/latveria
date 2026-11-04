import { GraduationCap, Loader2 } from "lucide-react";
import type { FriendUserDto } from "@latveria/shared";
import { Button } from "../../components/ui/button";
import { AppDialog } from "../../components/app-dialog";

export interface StartChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingFriends: boolean;
  friendsList: FriendUserDto[];
  onSelectFriend: (friend: FriendUserDto) => void;
}

export function StartChatDialog({
  open,
  onOpenChange,
  loadingFriends,
  friendsList,
  onSelectFriend,
}: StartChatDialogProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mulai Obrolan Baru"
      description="Pilih salah satu teman belajar Anda untuk membuka ruang percakapan privat."
    >
      <div className="max-h-[60vh] overflow-y-auto divide-y divide-[var(--edge)] -mx-6 px-6">
        {loadingFriends ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
            <Loader2 className="size-5 animate-spin text-[var(--gold)]" />
            <span>Memuat daftar teman…</span>
          </div>
        ) : friendsList.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-xs text-[var(--ink-muted)]">
            <p>Belum ada teman terhubung.</p>
            <p className="text-[11px]">
              Tambahkan teman pejuang UTBK lainnya melalui tab <b>Daftar Teman</b> atau Dossier
              siswa.
            </p>
          </div>
        ) : (
          friendsList.map((friend) => (
            <div
              key={friend.id}
              className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-9 rounded-full overflow-hidden bg-[var(--surface-subtle)] border border-[var(--edge)] flex items-center justify-center text-xs font-serif font-bold text-[var(--gold)] shrink-0">
                  {friend.image ? (
                    <img src={friend.image} alt={friend.name} className="size-full object-cover" />
                  ) : (
                    friend.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-serif font-bold text-xs truncate text-[var(--ink)]">
                    {friend.name}
                  </p>
                  {friend.targetUniversity && (
                    <p className="text-[10px] text-[var(--ink-muted)] truncate flex items-center gap-1">
                      <GraduationCap className="size-2.5" />
                      <span>{friend.targetUniversity}</span>
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => onSelectFriend(friend)}
                className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 text-xs h-7 px-3 shrink-0"
              >
                Obrolan
              </Button>
            </div>
          ))
        )}
      </div>
    </AppDialog>
  );
}
