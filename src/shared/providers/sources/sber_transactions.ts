import {Account, ProviderAny, ProviderParams, Transaction} from "../base";
import {swFetch} from "@/shared/sw-fetch";
import {getMaxTransactions} from "@/shared/utils";
import {getAccountName, getCurrencyCodeMap, getFullNotice, OpeningBalanceDateDefault, logItems} from "@/shared/providers/utils";

const SETTINGS = {
    prefix: "sber_",
    name: "Сбер",
    icon: "sber.png",
    url: "https://online.sberbank.ru/app/main",
    baseUrlLogo: "sberbank.ru",
    baseUrl: "https://web-node4.online.sberbank.ru",
};

let cachedBaseUrl: string | null = null;

// Динамическое определение базового URL Сбербанка
async function getBaseUrl(): Promise<string> {
    if (cachedBaseUrl) return cachedBaseUrl;

    try {
        const mainPageResp = await swFetch('https://online.sberbank.ru/app/main');
        const html = await mainPageResp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const hosts = new Set<string>();
        doc.querySelectorAll('script[src]').forEach(script => {
            const src = script.getAttribute('src');
            if (src) {
                const match = src.match(/https:\/\/([^\\/]+\.online\.sberbank\.ru)/);
                if (match) hosts.add(match[1]);
            }
        });

        for (const host of hosts) {
            try {
                const resp = await swFetch(`https://${host}/main`);
                const text = await resp.text();
                const found = text.match(/"ufs\.block\.root\.url"\s*:\s*"([^"]+)"/);
                if (found) {
                    cachedBaseUrl = found[1].replace(/\/+$/, '');
                    return cachedBaseUrl;
                }
            } catch {
                continue;
            }
        }
    } catch { /* fallback to default */
    }

    cachedBaseUrl = SETTINGS.baseUrl;
    return cachedBaseUrl;
}

async function getAccountsMainScreen() {
    const baseUrl = await getBaseUrl();
    const requestOptions = {
        method: "POST",
        credentials: 'include',
        redirect: "follow",
        body: JSON.stringify({
            withData: true,
            forceUpdate: true,
        }),
        headers: {
            'x-requested-with': 'XMLHttpRequest',
            'content-type': 'application/json;charset=UTF-8'
        }
    } as RequestInit;
    const response = await swFetch(
        `${baseUrl}/main-screen/rest/v2/m1/web/section/meta`,
        requestOptions,
    );
    return await response.json();
}

// Получение данных в списке счетов
async function getSberTransactions(limit: number = 100, offset: number = 0) {
    const baseUrl = await getBaseUrl();
    const requestOptions = {
        method: "POST",
        credentials: 'include',
        redirect: "follow",
        body: JSON.stringify({
            "paginationOffset": offset,
            "paginationSize": limit,
            "showHidden": false,
            "showNotTransactionBonuses": true,
            "showOpenBanking": true
        }),
        headers: {
            'x-requested-with': 'XMLHttpRequest',
            'content-type': 'application/json;charset=UTF-8'
        }
    } as RequestInit;
    const response = await swFetch(
        `${baseUrl}/uoh-bh/v1/operations/list`,
        requestOptions,
    );
    return await response.json();
}

interface MapAccount {
    id: string;
    number?: string;
    cardHolder?: string;
    type?: string;
    externalId: string;
}


// Маппинг списка счетов
async function fetchMapResourceToAccountId(): Promise<MapAccount[]> {
    const mapAccounts: MapAccount[] = [];
    const resp = await getAccountsMainScreen();
    const productData = resp?.body?.sections?.technicalSection?.sectionProductData;
    if (!productData) return mapAccounts;

    for (const acct of productData?.ctaccounts?.data || []) {
        mapAccounts.push({
            id: `ct-account:${acct.id}`,
            number: acct?.number,
            cardHolder: undefined,
            type: 'debit',
            externalId: `${SETTINGS.prefix}ct-account:${acct.id}`
        });
    }

    for (const dep of productData.accounts.data) {
        mapAccounts.push({
            id: `account:${dep.id}`,
            number: dep?.number,
            cardHolder: undefined,
            type: 'debit',
            externalId: `${SETTINGS.prefix}account:${dep.id}`,
        });
    }

    for (const card of productData?.cardsInWallet?.data || []) {
        const account = mapAccounts.find(
            (acc) => card.cardAccount === acc.number
        )
        mapAccounts.push({
            id: `card:${card.id}`,
            number: card?.cardAccount,
            cardHolder: card?.cardHolder,
            type: card?.type,
            externalId: account?.externalId || '',
        })
    }
    return mapAccounts
}


export const sberTransactions: ProviderAny = {
    getName: () => {
        return SETTINGS.name
    },
    getIcon: () => {
        return SETTINGS.icon
    },
    getUrl: () => {
        return SETTINGS.url
    },
    baseUrlLogo: () => {
        return SETTINGS.baseUrlLogo
    },

    getTransactions: async (params: ProviderParams): Promise<[Transaction[], any?]> => {
        const rows: Transaction[] = [];
        const maxLimit = getMaxTransactions(params.maxTransactions);
        let operations = [];
         
        while (true) {
            const page = await getSberTransactions(100, operations.length);
            const operationsPage = page?.body?.operations || [];
            operations.push(...operationsPage);
            if (operations.length >= maxLimit || operationsPage.length <= 0) {
                break;
            }
        }
        operations = operations.slice(0, maxLimit);
        const mapAccounts = await fetchMapResourceToAccountId();
        for (const operation of operations) {
            if (operation?.state?.category?.toLowerCase() !== "executed") continue;
            if (!operation?.externalId) {
                console.warn("Operation has not externalId", operation);
            }
            const isoDate = (operation?.date ? new Date(operation.date.replace(/^(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1') + "+03:00") : new Date()).toISOString();
            const base = {
                date: isoDate,
                amount: Math.abs(parseFloat(operation?.operationAmount?.amount || "0.00")),
                name: operation?.description || operation?.correspondent,
                description: operation?.correspondent,
                notes: getFullNotice(
                    operation?.classificationCode,
                    operation?.type,
                    operation?.form,
                    operation?.imageUrl,
                ),
                currency: getCurrencyCodeMap(operation?.operationAmount?.currencyCode),
                external_id: operation?.externalId,
                source: SETTINGS.prefix,
                external_account_id: '',
                nature: parseFloat(operation?.operationAmount?.amount || "0.00") > 0 ? 'income' : 'expense',
            } as Transaction
            if (operation?.fromResource?.id) {
                const account = mapAccounts.find((acc) => acc.id === operation?.fromResource?.id) || mapAccounts?.[0]
                rows.push({
                    ...base,
                    external_account_id: account.externalId,
                    nature: 'expense',
                })
            }
            if (operation?.toResource?.id) {
                const account = mapAccounts.find((acc) => acc.id === operation?.toResource?.id) || mapAccounts?.[0]
                rows.push({
                    ...base,
                    external_id: operation?.fromResource?.id ? `${operation?.externalId}_transfer` : `${operation?.externalId}`,
                    external_account_id: account.externalId,
                    nature: 'income',
                })
            }
        }
        logItems("Сбер", "операций разобрано", rows, operations);
        return [rows, operations];
    },

    getAccounts: async (params: ProviderParams): Promise<[Account[], any?]> => {
        const rows: Account[] = [];
        const resp = await getAccountsMainScreen();
        const productData = resp?.body?.sections?.technicalSection?.sectionProductData;
        if (!productData) return [rows, {}];

        // 1. Транзакционные счета (текущие, не кредитные)
        for (const acct of productData?.ctaccounts?.data || []) {
            rows.push({
                name: getAccountName(acct.name || 'Платёжный счёт', params.userName, sberTransactions.getName()),
                currency: getCurrencyCodeMap(acct.balance?.currency?.code),
                opening_balance_date: OpeningBalanceDateDefault.toISOString().split('T')[0],
                institution_name: `${SETTINGS.prefix}ct-account:${acct.id}`,
                institution_domain: SETTINGS.baseUrlLogo,
                subtype: 'checking',
                accountable_type: 'Depository',
                notes: acct.number ? `Счёт: ${acct.number}` : undefined,
            } as Account);
        }

        // 2. Вклады и накопительные счета
        for (const dep of productData?.accounts?.data || []) {
            const notesParts = [];
            if (dep.rate) notesParts.push(`Ставка: ${dep.rate}%`);
            if (dep.number) notesParts.push(`Счёт: ${dep.number}`);

            rows.push({
                name: getAccountName(dep.name || 'Вклад', params.userName, sberTransactions.getName()),
                currency: getCurrencyCodeMap(dep.balance?.currency?.code),
                opening_balance_date: (dep.openDate ? dep.openDate.split('.').reverse().join('-') : OpeningBalanceDateDefault.toLocaleDateString('en-CA')),
                institution_name: `${SETTINGS.prefix}account:${dep.id}`,
                institution_domain: SETTINGS.baseUrlLogo,
                subtype: 'savings', // при наличии closeDate можно менять на 'cd'
                accountable_type: 'Depository',
                expiration_date: dep.closeDate || undefined,
                notes: notesParts.join(';') || undefined,
            } as Account);
        }
        logItems("Сбер", "счетов разобрано", rows, resp);
        return [rows, resp];
    },
}