import React, { useState, useEffect } from "react";
import { Plus, Trash2, MessageSquareQuote } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel, PanelHeader } from "../../components/ui/dashboard";

interface AffirmationItem {
  id: string;
  affirmation: string;
  author?: string | null;
  active: boolean;
}

export function AdminAffirmations() {
  const [affirmations, setAffirmations] = useState<AffirmationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [adding, setAdding] = useState(false);

  const loadAffirmations = async () => {
    setLoading(true);
    try {
      const data = await api<AffirmationItem[]>("/admin/affirmations");
      setAffirmations(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffirmations();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/affirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: window.location.origin },
        body: JSON.stringify({ affirmation: text.trim(), author: author.trim() || undefined }),
      });
      if (res.ok) {
        setText("");
        setAuthor("");
        await loadAffirmations();
      }
    } catch {
      alert("Gagal menambahkan afirmasi.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus afirmasi ini?")) return;
    try {
      await fetch(`/api/admin/affirmations/${id}`, {
        method: "DELETE",
        headers: { Origin: window.location.origin },
      });
      setAffirmations((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Gagal menghapus.");
    }
  };

  return (
    <div className="motion-page-enter">
      <PageHeading
        title="Afirmasi Pembina"
        description="Kelola pesan afirmasi dan motivasi belajar yang muncul di dashboard peserta."
      />

      <Panel style={{ marginBottom: 24 }}>
        <PanelHeader title="Tambah Afirmasi Baru" />
        <form onSubmit={handleAdd} style={{ padding: 20, display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
            Teks Afirmasi
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Contoh: Fokus pada pemahaman esensial hari ini."
              required
              style={{
                minHeight: 40,
                padding: "0 12px",
                border: "1px solid var(--edge)",
                borderRadius: 4,
                background: "var(--bg)",
                color: "var(--ink)",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}>
            Penulis / Sumber (Opsional)
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Contoh: Catatan Pembina Latveria"
              style={{
                minHeight: 40,
                padding: "0 12px",
                border: "1px solid var(--edge)",
                borderRadius: 4,
                background: "var(--bg)",
                color: "var(--ink)",
              }}
            />
          </label>
          <div>
            <Button disabled={adding} type="submit">
              <Plus size={15} /> {adding ? "Menyimpan…" : "Simpan Afirmasi"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelHeader title="Daftar Afirmasi Aktif">
          <span style={{ fontSize: 13, color: "var(--soft-ink)" }}>{affirmations.length} pesan</span>
        </PanelHeader>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--soft-ink)" }}>Memuat…</div>
        ) : affirmations.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--soft-ink)" }}>Belum ada pesan afirmasi.</div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {affirmations.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--edge)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <MessageSquareQuote size={18} style={{ color: "var(--accent-gold)", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                      "{a.affirmation}"
                    </p>
                    <span style={{ fontSize: 12, color: "var(--soft-ink)", fontFamily: "var(--font-mono)" }}>
                      — {a.author || "Anonim"}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} title="Hapus afirmasi">
                  <Trash2 size={15} style={{ color: "#ef4444" }} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
