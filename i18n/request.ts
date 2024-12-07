import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

const LOCALES = ["en", "zh"];

export default getRequestConfig(async () => {
    // Provide a static locale, fetch a user setting,
    // read locale from `cookies()`, `headers()`, etc.
    // languages with region code
    const languages = (await headers())
        .get("accept-language")
        ?.split(",")
        .map((l) => l.replace(/;q=[\.\d]+/, ""));
    // languages without region code
    const langs = languages?.map((l) => l.replace(/-[A-Z]+$/, ""));
    const locale = languages?.find((l) => LOCALES.includes(l)) || langs?.find((l) => LOCALES.includes(l)) || "en";

    return {
        locale,
        messages: (await import(`./messages/${locale}.json`)).default
    };
});
