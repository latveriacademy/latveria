import React from "react";
import {
  Check,
  Clock,
  Eye,
  GraduationCap,
  MessageSquare,
  Swords,
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
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--edge)] bg-[var(--surface)] hover:border-gold/30 transition-all shadow-sm">
      <div
        className="flex items-center gap-3 min-w-0 cursor-pointer"
        onClick={onInspect}
        title="Klik untuk melihat profil"
      >
        {friend.image ? (
          <img
            src={friend.image}
            alt={friend.name}
            className="w-11 h-11 rounded-full object-cover border border-[var(--edge)] ring-1 ring-gold/20"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[var(--surface-muted)] border border-[var(--edge)] flex items-center justify-center font-bold text-sm text-gold">
            {friend.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-[var(--ink)] truncate hover:underline">
              {friend.name}
            </span>
            <span className="inline-flex items-center px-1 py-0.2 text-[9px] font-mono rounded bg-sage/15 text-sage">
              Connected
            </span>
          </div>
          {friend.codename && (
            <p className="text-xs font-mono text-[var(--ink-muted)]">@{friend.codename}</p>
          )}
          {friend.targetUniversity && (
            <div className="flex items-center gap-1 text-[11px] text-gold/90 truncate mt-0.5">
              <GraduationCap size={12} className="shrink-0" />
              <span className="truncate">{friend.targetUniversity}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {confirmRemove ? (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={onCancelRemove}
            >
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 px-2 text-xs bg-danger text-white"
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
              className="h-8 w-8 p-0"
              title="Lihat Profil"
              onClick={onInspect}
            >
              <Eye size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 text-gold hover:text-gold"
              title="Ajak Warrior Battle"
              onClick={onBattle}
            >
              <Swords size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Kirim Pesan (DM)"
              onClick={onChat}
            >
              <MessageSquare size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted hover:text-danger"
              title="Hapus Teman"
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

export function SearchUserCard({
  user,
  onInspect,
  onSendRequest,
  isPending,
}: {
  user: SearchUserResult;
  onInspect: () => void;
  onSendRequest: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--edge)] bg-[var(--surface)] hover:border-gold/30 transition-all shadow-sm">
      <div
        className="flex items-center gap-3 min-w-0 cursor-pointer"
        onClick={onInspect}
        title="Lihat Profil"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover border border-[var(--edge)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] border border-[var(--edge)] flex items-center justify-center font-bold text-sm text-gold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[var(--ink)] truncate hover:underline">
            {user.name}
          </p>
          {user.codename && (
            <p className="text-xs font-mono text-[var(--ink-muted)]">@{user.codename}</p>
          )}
          {user.targetUniversity && (
            <p className="text-[11px] text-gold/90 truncate flex items-center gap-1 mt-0.5">
              <GraduationCap size={12} className="shrink-0" />
              <span className="truncate">{user.targetUniversity}</span>
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={onInspect}>
          Profil
        </Button>
        {user.friendshipStatus === "friends" ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded bg-sage/15 text-sage">
            <Check size={12} /> Berteman
          </span>
        ) : user.friendshipStatus === "pending_outgoing" ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded bg-gold/15 text-gold">
            <Clock size={12} /> Terkirim
          </span>
        ) : user.friendshipStatus === "pending_incoming" ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded bg-accent/20 text-accent">
            Menunggu Respon
          </span>
        ) : (
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs bg-gold text-black hover:bg-gold/90 font-medium"
            onClick={onSendRequest}
            disabled={isPending}
          >
            <UserPlus size={13} className="mr-1" />
            Hubungkan
          </Button>
        )}
      </div>
    </div>
  );
}

export function RequestItemCard({
  item,
  isIncoming,
  onInspect,
  onRespond,
  isPending,
}: {
  item: FriendshipDto;
  isIncoming: boolean;
  onInspect: () => void;
  onRespond?: (action: "accept" | "decline") => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--edge)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={onInspect}>
        {item.friend.image ? (
          <img
            src={item.friend.image}
            alt={item.friend.name}
            className="w-10 h-10 rounded-full object-cover border border-[var(--edge)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] border border-[var(--edge)] flex items-center justify-center font-bold text-sm text-gold">
            {item.friend.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[var(--ink)] truncate hover:underline">
            {item.friend.name}
          </p>
          {item.friend.codename && (
            <p className="text-xs font-mono text-[var(--ink-muted)]">@{item.friend.codename}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isIncoming && onRespond ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs text-danger"
              onClick={() => onRespond("decline")}
              disabled={isPending}
            >
              Tolak
            </Button>
            <Button
              size="sm"
              className="h-8 px-2.5 text-xs bg-sage text-black hover:bg-sage/90 font-medium"
              onClick={() => onRespond("accept")}
              disabled={isPending}
            >
              Terima
            </Button>
          </>
        ) : (
          <span className="text-xs font-mono text-gold px-2 py-1 rounded bg-gold/10 border border-gold/20">
            Menunggu
          </span>
        )}
      </div>
    </div>
  );
}
