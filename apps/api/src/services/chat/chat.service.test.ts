import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConversations, getDmMessages, sendDmMessage } from "./chat.service";
import { encryptDmText } from "./chat-crypto.service";

// Mock DB
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("../../lib/db", () => ({
  getDb: () => mockDb,
}));

vi.mock("./chat-ws.manager", () => ({
  broadcastGlobalMessage: vi.fn(),
  broadcastDmMessage: vi.fn(),
  broadcastMessageUpdated: vi.fn(),
  broadcastMessageDeleted: vi.fn(),
  notifyDmRead: vi.fn(),
}));

describe("Chat Service (At-rest Encryption)", () => {
  const senderId = "user-alice";
  const recipientId = "user-bob";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHAT_ENCRYPTION_KEY = "test-secret-key-32-chars-minimum-latveria!!";
  });

  it("encrypts DM message text at-rest upon inserting into DB while returning plaintext", async () => {
    let insertedValues: unknown = null;

    // Mock sender user lookup
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi
          .fn()
          .mockResolvedValueOnce([
            { id: senderId, name: "Alice", image: null, role: "user", codename: "alice" },
          ]),
      }),
    });

    // Mock recipient user lookup
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi
          .fn()
          .mockResolvedValueOnce([
            { id: recipientId, name: "Bob", image: null, role: "user", codename: "bob" },
          ]),
      }),
    });

    // Mock insert
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockImplementation((val) => {
        insertedValues = val;
        return {
          returning: vi.fn().mockResolvedValueOnce([
            {
              id: "msg-uuid-1",
              senderId,
              recipientId,
              message: val.message,
              mediaUrl: val.mediaUrl,
              createdAt: new Date(),
            },
          ]),
        };
      }),
    });

    const plainText = "Rahasia strategi TPS dan Literasi";
    const result = await sendDmMessage(senderId, recipientId, plainText);

    // Hasil yang dikembalikan ke pemanggil adalah plaintext
    expect(result.message).toBe(plainText);

    // Nilai yang disimpan ke database harus terenkripsi dengan prefix enc:v1:
    expect(insertedValues).not.toBeNull();
    const inserted = insertedValues as { message: string };
    expect(inserted.message).not.toBe(plainText);
    expect(inserted.message.startsWith("enc:v1:")).toBe(true);
  });

  it("decrypts encrypted DM messages when reading history via getDmMessages", async () => {
    const rawPlaintext = "Pesan rahasia nomor 42";
    const cipherInDb = encryptDmText(rawPlaintext, senderId, recipientId);

    // Mock select messages
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        innerJoin: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  id: "msg-123",
                  senderId,
                  senderName: "Alice",
                  senderImage: null,
                  senderRole: "user",
                  senderCodename: "alice",
                  recipientId,
                  message: cipherInDb,
                  mediaUrl: null,
                  isEdited: false,
                  editedAt: null,
                  isDeleted: false,
                  createdAt: new Date(),
                  readAt: null,
                },
              ]),
            }),
          }),
        }),
      }),
    });

    // Mock markDmAsRead update
    mockDb.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([]),
      }),
    });

    const messages = await getDmMessages(recipientId, senderId);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toBe(rawPlaintext);
  });

  it("decrypts the latest message preview in getConversations", async () => {
    const secretSummary = "Sampai ketemu di tryout!";
    const cipherInDb = encryptDmText(secretSummary, senderId, recipientId);

    // 1. Mock select DM messages
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          orderBy: vi.fn().mockResolvedValueOnce([
            {
              id: "msg-conv-1",
              senderId,
              recipientId,
              message: cipherInDb,
              mediaUrl: null,
              createdAt: new Date(),
              readAt: null,
            },
          ]),
        }),
      }),
    });

    // 2. Mock select friendships
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([]),
      }),
    });

    // 3. Mock select contact user profiles
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi
          .fn()
          .mockResolvedValueOnce([
            { id: senderId, name: "Alice", image: null, role: "user", codename: "alice" },
          ]),
      }),
    });

    const conversations = await getConversations(recipientId);
    expect(conversations).toHaveLength(1);
    expect(conversations[0].lastMessage).toBe(secretSummary);
  });
});
