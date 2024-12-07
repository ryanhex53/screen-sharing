import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Only allow requests from the same origin
    const referer = req.headers.referer || req.headers.origin;
    const protocol = referer ? new URL(referer).protocol : "https:";
    const allowedOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
    if (!referer || !allowedOrigins.some((origin) => origin && referer.startsWith(protocol + "//" + origin))) {
        return res.status(403).json({ error: "Forbidden" });
    }

    try {
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

        const turnConfig = await response.json();
        res.status(200).json(turnConfig);
    } catch (error) {
        console.error("Error fetching TURN credentials:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
