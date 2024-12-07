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

export type ShortLink = {
    id: number;
    originalURL: string;
    DomainId?: number;
    archived: boolean;
    path: string;
    source?: "website" | "api" | "public" | "spreadsheets" | "slack" | "telegram";
    redirectType?: "301" | "302" | "307" | "308";
    createdAt: string;
    OwnerId?: number;
    updatedAt: string;
    secureShortURL: string;
    hasPassword?: boolean;
    shortURL: string;
    duplicate: boolean;
};

/**
 * get short link from short.io
 * @param originalURL original URL to be shortened
 */
export async function getShortLink(originalURL: string): Promise<ShortLink> {
    const domain = process.env.SHORT_IO_DOMAIN;
    const key = process.env.SHORT_IO_API_KEY;

    if (!domain || !key) {
        throw new Error("Short.io are not properly configured");
    }

    const data = { domain, originalURL };

    const response = await fetch("https://api.short.io/links/public", {
        method: "POST",
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            authorization: key
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error("Failed to fetch short link: " + error);
    }

    return response.json();
}
