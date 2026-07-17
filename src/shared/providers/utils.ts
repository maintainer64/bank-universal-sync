export const getFullNotice = (...args: any): string => {
    const filteredArray = args.filter((item: string | any[]) => typeof item === 'string' && item.length > 0);
    const uniqueArray = [...new Set(filteredArray)];
    return uniqueArray.join(';');
};

export const OpeningBalanceDateDefault = new Date(2000, 0, 1);

export const getAccountName = (accountName: string, userName?: string, source?: string): string => {
    return [accountName, userName ? `(${userName})` : '', source ? `(${source})` : ''].join(' ')
};

export const getCurrencyCodeMap = (currency?: string): string => {
    if (currency === "RUR") return "RUB"
    return currency || "RUB";
};