"use server";

export async function getTurnCredentials() {
    const key = process.env.CLOUDFLARE_TURN_KEY;
    const code = process.env.CLOUDFLARE_TURN_CODE;

    if (!key || !code) {
        throw new Error("TURN credentials are not properly configured");
    }

    const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${key}/credentials/generate`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${code}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ ttl: 86400 })
    });

    if (!response.ok) {
        throw new Error("Failed to fetch TURN credentials");
    }

    return response.json();
}
