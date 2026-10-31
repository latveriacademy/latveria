import React from "react";
import {
  Check,
  Eye,
  GraduationCap,
  MessageSquare,
  Swords,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import type { FriendUserDto, FriendshipDto } from "@latveria/shared";
import { Button } from "../../components/ui/button";

export interface SearchUserResult extends FriendUserDto {
  friendshipStatus?: "none" | "pending_incoming" | "pending_outgoing" | "friends";
}

export function FriendItemCard({
  friend,
  onInspect,
  onBattle,
  onChat,
  onRemove,
  isRemoving,
  confirmRemove,
  onCancelRemove,
  onConfirmRemove,
}: {
  friend: FriendUserDto;
  onInspect: () => void;
  onBattle: () => void;
  onChat: () => void;
  onRemove: () => void;
  isRemoving: boolean;
  confirmRemove: boolean;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--edge-strong)] hover:shadow-xs group min-w-0">
      {/* Identity Block */}
      <div
        className="flex items-center gap-3 min-w-0 cursor-pointer"
        onClick={onInspect}
        title="Klik untuk membuka dossier profil"
      >
        <div className="relative shrink-0">
          {friend.image ? (
            <img
              src={friend.image}
              alt={friend.name}
              className="size-11 sm:size-12 rounded-full object-cover border-2 border-[var(--edge)] ring-1 ring-[var(--gold)]/20"
            />
          ) : (
            <div className="size-11 sm:size-12 rounded-full bg-[var(--surface-subtle)] border-2 border-[var(--edge)] flex items-center justify-center font-serif font-bold text-sm text-[var(--gold)]">
              {friend.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 bg-sage text-black rounded-full p-0.5 border-2 border-[var(--surface)]">
            <UserCheck size={10} strokeWidth={2.5} />
          </span>
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-serif font-bold text-sm sm:text-base text-[var(--ink)] truncate group-hover:text-[var(--gold)] transition-colors">
              {friend.name}
            </span>
            {friend.codename && (
              <span className="text-[11px] font-mono text-[var(--ink-muted)]">
                @{friend.codename}
              </span>
            )}
          </div>
          {friend.targetUniversity ? (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--gold)] truncate">
              <GraduationCap size={12} className="shrink-0" />
              <span className="truncate">{friend.targetUniversity}</span>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--ink-muted)] italic">
              Target kampus belum disetel
            </span>
          )}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-[var(--edge)] w-full justify-end">
        {confirmRemove ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-danger font-mono">Hapus?</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={onCancelRemove}
            >
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs px-2.5 bg-danger text-white hover:bg-danger/90"
              onClick={onConfirmRemove}
              disabled={isRemoving}
            >
              Putus
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
              title="Buka Profil"
              onClick={onInspect}
            >
              <Eye size={13} className="mr-1" />
              <span className="hidden sm:inline">Profil</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs text-[var(--gold)] hover:border-[var(--gold)]"
              title="Ajak Duel Battle"
              onClick={onBattle}
            >
              <Swords size={13} className="mr-1" />
              <span>Duel</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 px-2.5 text-xs bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-medium"
              title="Kirim Pesan Chat"
              onClick={onChat}
            >
              <MessageSquare size={13} className="mr-1" />
              <span>Chat</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-danger/70 hover:text-danger hover:bg-danger/10"
              title="Putus Hubungan"
              onClick={onRemove}
            >
              <UserX size={14} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function RequestItemCard({
  request,
  onAccept,
  onDecline,
  isProcessing,
  onInspect,
}: {
  request: FriendshipDto;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing: boolean;
  onInspect?: () => void;
}) {
  const user = request.friend;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)]">
      <div
        className="flex items-center gap-3 min-w-0 cursor-pointer"
        onClick={onInspect}
        title="Klik untuk melihat profil"
      >
        <div className="size-11 rounded-full bg-[var(--surface-subtle)] border-2 border-[var(--edge)] flex items-center justify-center font-serif font-bold text-sm text-[var(--gold)] shrink-0">
          {user.image ? (
            <img src={user.image} alt={user.name} className="size-full rounded-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-serif font-bold text-sm text-[var(--ink)] truncate hover:text-[var(--gold)] transition-colors">
              {user.name}
            </span>
            {user.codename && (
              <span className="text-[11px] font-mono text-[var(--ink-muted)]">
                @{user.codename}
              </span>
            )}
          </div>
          {user.targetUniversity ? (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--gold)] truncate">
              <GraduationCap size={12} className="shrink-0" />
              <span className="truncate">{user.targetUniversity}</span>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--ink-muted)] italic">
              Mengajakmu terhubung di Latveria
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={onDecline}
          disabled={isProcessing}
        >
          Tolak
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-8 px-3 text-xs bg-sage text-black hover:bg-sage/90 font-medium"
          onClick={onAccept}
          disabled={isProcessing}
        >
          <Check size={13} className="mr-1" />
          Terima
        </Button>
      </div>
    </div>
  );
}

export function SearchUserCard({
  user,
  onInspect,
  onConnect,
  isProcessing,
  onChat,
}: {
  user: SearchUserResult;
  onInspect: () => void;
  onConnect: () => void;
  isProcessing: boolean;
  onChat?: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--edge-strong)]">
      <div
        className="flex items-center gap-3 min-w-0 cursor-pointer"
        onClick={onInspect}
        title="Klik untuk membuka profil"
      >
        <div className="size-11 rounded-full bg-[var(--surface-subtle)] border-2 border-[var(--edge)] flex items-center justify-center font-serif font-bold text-sm text-[var(--gold)] shrink-0">
          {user.image ? (
            <img src={user.image} alt={user.name} className="size-full rounded-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-serif font-bold text-sm text-[var(--ink)] truncate hover:text-[var(--gold)] transition-colors">
              {user.name}
            </span>
            {user.codename && (
              <span className="text-[11px] font-mono text-[var(--ink-muted)]">
                @{user.codename}
              </span>
            )}
          </div>
          {user.targetUniversity ? (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--gold)] truncate">
              <GraduationCap size={12} className="shrink-0" />
              <span className="truncate">{user.targetUniversity}</span>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--ink-muted)] italic">
              Pejuang UTBK Latveria
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {user.friendshipStatus === "friends" ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded bg-sage/15 text-sage border border-sage/30">
              <Check size={11} strokeWidth={2.5} /> Berteman
            </span>
            {onChat && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-[var(--gold)]"
                onClick={onChat}
              >
                <MessageSquare size={13} className="mr-1" />
                Chat
              </Button>
            )}
          </div>
        ) : user.friendshipStatus === "pending_outgoing" ? (
          <span className="px-2.5 py-1 text-xs font-mono rounded bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30">
            Terkirim
          </span>
        ) : user.friendshipStatus === "pending_incoming" ? (
          <span className="px-2.5 py-1 text-xs font-mono rounded bg-accent/20 text-accent border border-accent/30 animate-pulse">
            Menunggu Responmu
          </span>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-8 px-3 text-xs bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 font-medium"
            onClick={onConnect}
            disabled={isProcessing}
          >
            <UserPlus size={13} className="mr-1" />
            Hubungkan
          </Button>
        )}
      </div>
    </div>
  );
}
