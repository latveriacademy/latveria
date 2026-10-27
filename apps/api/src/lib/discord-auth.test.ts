import { describe, expect, it, vi } from "vitest";
import { discordAuthEnabled, verifyDiscordGuildMembership } from "./auth";

describe("Discord Authentication & Guild Restriction", () => {
  it("reports discord auth status based on env configuration", () => {
    const originalId = process.env.DISCORD_CLIENT_ID;
    const originalSecret = process.env.DISCORD_CLIENT_SECRET;

    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.DISCORD_CLIENT_SECRET;
    expect(discordAuthEnabled()).toBe(false);

    process.env.DISCORD_CLIENT_ID = "test-client-id";
    process.env.DISCORD_CLIENT_SECRET = "test-client-secret";
    expect(discordAuthEnabled()).toBe(true);

    if (originalId) process.env.DISCORD_CLIENT_ID = originalId;
    else delete process.env.DISCORD_CLIENT_ID;
    if (originalSecret) process.env.DISCORD_CLIENT_SECRET = originalSecret;
    else delete process.env.DISCORD_CLIENT_SECRET;
  });

  it("verifies discord guild membership successfully when user belongs to target guild", async () => {
    const originalGuild = process.env.DISCORD_GUILD_ID;
    process.env.DISCORD_GUILD_ID = "target-guild-123";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { id: "other-guild-456", name: "Other Server" },
          { id: "target-guild-123", name: "Latveria Server" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const isMember = await verifyDiscordGuildMembership("fake-access-token");
    expect(isMember).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: "Bearer fake-access-token" },
    });

    fetchSpy.mockRestore();
    if (originalGuild) process.env.DISCORD_GUILD_ID = originalGuild;
    else delete process.env.DISCORD_GUILD_ID;
  });

  it("rejects membership when user does not belong to target guild", async () => {
    const originalGuild = process.env.DISCORD_GUILD_ID;
    process.env.DISCORD_GUILD_ID = "target-guild-123";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "other-guild-456", name: "Other Server" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const isMember = await verifyDiscordGuildMembership("fake-access-token");
    expect(isMember).toBe(false);

    fetchSpy.mockRestore();
    if (originalGuild) process.env.DISCORD_GUILD_ID = originalGuild;
    else delete process.env.DISCORD_GUILD_ID;
  });
});
