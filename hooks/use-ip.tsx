"use client";

import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

const IpContext = createContext<string>("");

export function IpProvider({ children }: PropsWithChildren) {
    const [ip, setIp] = useState<string>("");

    useEffect(() => {
        const fetchIp = async () => {
            try {
                const userIp = await fetch("https://api64.ipify.org").then((res) => res.text());
                setIp(userIp);
            } catch (error) {
                console.error("Error fetching IP:", error);
            }
        };
        if (!ip) {
            fetchIp();
        }
    }, [ip]);

    return <IpContext.Provider value={ip}>{children}</IpContext.Provider>;
}

export function useIp(): string {
    return useContext(IpContext);
}
