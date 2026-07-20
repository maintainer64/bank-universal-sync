import {searchTrade, searchTransaction, parseFlexibleNumber} from "@/shared/providers/services/sure/searchTrade";
import {describe, expect, it} from "vitest";

describe("parseFlexibleNumber", () => {
    describe("European format (dot=thousands, comma=decimal)", () => {
        it("parses with currency symbol", () => {
            expect(parseFlexibleNumber("1.182,00 ₽")).toBe(1182);
            expect(parseFlexibleNumber("11.776,71 ₽")).toBe(11776.71);
            expect(parseFlexibleNumber("-705,00 ₽")).toBe(705);
        });

        it("removes all thousand-separator dots", () => {
            expect(parseFlexibleNumber("1.000,50")).toBe(1000.5);
            expect(parseFlexibleNumber("10.123,456")).toBe(10123.456);
            expect(parseFlexibleNumber("100.000,00")).toBe(100000);
            expect(parseFlexibleNumber("1.234.567,89")).toBe(1234567.89);
        });

        it("strips spaces and symbols", () => {
            expect(parseFlexibleNumber("€ 1.000,50")).toBe(1000.5);
            expect(parseFlexibleNumber("$ 500,00")).toBe(500);
            expect(parseFlexibleNumber("1 234,56")).toBe(1234.56);
            expect(parseFlexibleNumber("R$ 2.500,99")).toBe(2500.99);
        });
    });

    describe("International format (comma=thousands, dot=decimal)", () => {
        it("parses with currency symbol", () => {
            expect(parseFlexibleNumber("-¥6,000.00")).toBe(6000);
            expect(parseFlexibleNumber("$1,234.56")).toBe(1234.56);
            expect(parseFlexibleNumber("€ 1,000.50")).toBe(1000.5);
        });

        it("removes all thousand-separator commas", () => {
            expect(parseFlexibleNumber("1,234,567.89")).toBe(1234567.89);
            expect(parseFlexibleNumber("10,000.50")).toBe(10000.5);
        });
    });

    describe("Single separator type", () => {
        it("treats dot as decimal", () => {
            expect(parseFlexibleNumber("123.45")).toBe(123.45);
            expect(parseFlexibleNumber("-705.00")).toBe(705);
            expect(parseFlexibleNumber("0.5")).toBe(0.5);
        });

        it("treats comma as decimal", () => {
            expect(parseFlexibleNumber("123,45")).toBe(123.45);
            expect(parseFlexibleNumber("-705,00")).toBe(705);
            expect(parseFlexibleNumber("0,5")).toBe(0.5);
        });
    });

    describe("Plain numbers", () => {
        it("parses integers", () => {
            expect(parseFlexibleNumber("123")).toBe(123);
            expect(parseFlexibleNumber("0")).toBe(0);
            expect(parseFlexibleNumber("-42")).toBe(42);
        });

        it("handles null, undefined, and number type", () => {
            expect(parseFlexibleNumber(null)).toBe(0);
            expect(parseFlexibleNumber(undefined)).toBe(0);
            expect(parseFlexibleNumber(42)).toBe(42);
            expect(parseFlexibleNumber(-42)).toBe(-42);
            expect(parseFlexibleNumber(0)).toBe(0);
            expect(parseFlexibleNumber(1500.5)).toBe(1500.5);
        });
    });

    describe("Edge cases", () => {
        it("returns 0 for empty or invalid strings", () => {
            expect(parseFlexibleNumber("")).toBe(0);
            expect(parseFlexibleNumber("   ")).toBe(0);
            expect(parseFlexibleNumber("abc")).toBe(0);
            expect(parseFlexibleNumber("₽$€")).toBe(0);
            expect(parseFlexibleNumber("-")).toBe(0);
        });
    });
});

const accountId = "be6e1318-aafa-4b77-ab1d-4c140e8ceeef";
const otherAccountId = "other-account-id";

const trades = [
    {
        id: "1", date: "2026-07-17", amount: "-11.776,71 ₽",
        currency: "RUB", name: "Interest", notes: null,
        qty: "0.0", price: "0,00 ₽",
        investment_activity_label: "Interest",
        account: {id: accountId, name: "Брокерский счёт", account_type: "investment"},
        security: {id: "s1", ticker: "RU000A1084B2", name: "Bond"},
        category: null, created_at: "2026-07-21T17:39:40Z", updated_at: "2026-07-21T17:39:40Z",
    },
    {
        id: "2", date: "2026-07-17", amount: "-11.776,71 ₽",
        currency: "RUB", name: "Interest", notes: null,
        qty: "0.0", price: "0,00 ₽",
        investment_activity_label: "Interest",
        account: {id: accountId, name: "Брокерский счёт", account_type: "investment"},
        security: {id: "s2", ticker: "CASH-BE6E1318", name: "Cash"},
        category: null, created_at: "2026-07-21T09:53:42Z", updated_at: "2026-07-21T09:53:42Z",
    },
    {
        id: "3", date: "2026-07-15", amount: "500,00 ₽",
        currency: "RUB", name: "Dividend", notes: null,
        qty: "0.0", price: "0,00 ₽",
        investment_activity_label: "Dividend",
        account: {id: accountId, name: "Брокерский счёт", account_type: "investment"},
        security: {id: "s3", ticker: "AAPL", name: "Apple"},
        category: null, created_at: "2026-07-15T10:00:00Z", updated_at: "2026-07-15T10:00:00Z",
    },
    {
        id: "4", date: "2026-07-16", amount: "0,00 ₽",
        currency: "RUB", name: "Buy", notes: null,
        qty: "10", price: "1.500,50 ₽",
        investment_activity_label: "Buy",
        account: {id: accountId, name: "Брокерский счёт", account_type: "investment"},
        security: {id: "s4", ticker: "SBER", name: "Сбер Банк"},
        category: null, created_at: "2026-07-16T10:00:00Z", updated_at: "2026-07-16T10:00:00Z",
    },
    {
        id: "5", date: "2026-07-16", amount: "0,00 ₽",
        currency: "RUB", name: "Sell", notes: null,
        qty: "5", price: "1.600,00 ₽",
        investment_activity_label: "Sell",
        account: {id: accountId, name: "Брокерский счёт", account_type: "investment"},
        security: {id: "s5", ticker: "GAZP", name: "Газпром"},
        category: null, created_at: "2026-07-16T10:00:00Z", updated_at: "2026-07-16T10:00:00Z",
    },
];

describe("searchTrade", () => {
    it("finds interest trade by account, date, type, and amount", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-17", type: "interest",
            ticker: "RU000A1084B2", name: "Interest", amount: 11776.71,
            currency: "RUB", external_id: "e1", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeTruthy();
        expect(result?.id).toBe("1");
    });

    it("returns undefined when no trades exist", () => {
        const result = searchTrade([], {
            external_account_id: "acc", date: "2026-07-17", type: "interest",
            ticker: "T", name: "Interest", amount: 100, currency: "RUB",
            external_id: "e1", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeUndefined();
    });

    it("returns undefined when account does not match", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-17", type: "interest",
            ticker: "RU000A1084B2", name: "Interest", amount: 11776.71,
            currency: "RUB", external_id: "e1", source: "test", dataProviders: ["test"],
        }, otherAccountId);
        expect(result).toBeUndefined();
    });

    it("returns undefined when date does not match", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2099-01-01", type: "interest",
            ticker: "RU000A1084B2", name: "Interest", amount: 11776.71,
            currency: "RUB", external_id: "e1", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeUndefined();
    });

    it("returns undefined when both type and name do not match", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-17", type: "dividend",
            ticker: "T", name: "SomethingElse", amount: 11776.71,
            currency: "RUB", external_id: "e1", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeUndefined();
    });

    it("finds buy trade by qty and price", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-16", type: "buy",
            ticker: "SBER", name: "Buy", qty: 10, price: 1500.5,
            currency: "RUB", external_id: "e2", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeTruthy();
        expect(result?.id).toBe("4");
    });

    it("finds sell trade by qty and price", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-16", type: "sell",
            ticker: "GAZP", name: "Sell", qty: 5, price: 1600,
            currency: "RUB", external_id: "e3", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeTruthy();
        expect(result?.id).toBe("5");
    });

    it("returns undefined for buy with different qty", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-16", type: "buy",
            ticker: "SBER", name: "Buy", qty: 999, price: 1500.5,
            currency: "RUB", external_id: "e2", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeUndefined();
    });

    it("returns undefined for buy with different price", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-16", type: "buy",
            ticker: "SBER", name: "Buy", qty: 10, price: 1,
            currency: "RUB", external_id: "e2", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeUndefined();
    });

    it("is case-insensitive for trade type", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-16", type: "BUY",
            ticker: "SBER", name: "Buy", qty: 10, price: 1500.5,
            currency: "RUB", external_id: "e2", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeTruthy();
    });

    it("matches dividend by amount with tolerance 0.0001", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-15", type: "dividend",
            ticker: "AAPL", name: "Dividend", amount: 500,
            currency: "RUB", external_id: "e4", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeTruthy();
        expect(result?.id).toBe("3");
    });

    it("returns undefined for interest with different amount", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-17", type: "interest",
            ticker: "RU000A1084B2", name: "Interest", amount: 99999,
            currency: "RUB", external_id: "e1", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeUndefined();
    });

    it("finds sell trade with international format price (comma=thousands)", () => {
        const result = searchTrade([
            {
                id: "a8d10929", date: "2025-01-26",
                amount: "-1.625,40 ₽", currency: "RUB",
                name: "Sell 3000.0 shares of HYDR", notes: null,
                qty: "-3000.0", price: "0,54 ₽",
                investment_activity_label: "Sell",
                account: {id: accountId, name: "Acc", account_type: "investment"},
                security: {id: "s6", ticker: "HYDR", name: "РусГидро"},
                category: null, created_at: "", updated_at: "",
            }],
            {
                external_account_id: "acc", date: "2025-01-26",
                type: "sell", ticker: "HYDR", name: "РусГидро",
                currency: "RUB", external_id: "e5", source: "test",
                dataProviders: [], qty: 3000, price: 0.5418,
            }, accountId);
        expect(result).toBeDefined();
    });

    it("matches by amount when qty*price fallback is used", () => {
        const result = searchTrade([
            {
                id: "s1", date: "2025-06-01",
                amount: "-1625.40", currency: "RUB",
                name: "Sell", notes: null,
                qty: "3000", price: "0.5418",
                investment_activity_label: "Sell",
                account: {id: accountId, name: "Acc", account_type: "investment"},
                security: null, category: null, created_at: "", updated_at: "",
            },
        ], {
            external_account_id: "acc", date: "2025-06-01",
            type: "sell", ticker: "HYDR", name: "Sell",
            currency: "RUB", external_id: "e6", source: "test",
            dataProviders: [], qty: 3000, price: 0.5418,
        }, accountId);
        expect(result).toBeDefined();
    });

    it("respects currency mismatch", () => {
        const result = searchTrade(trades, {
            external_account_id: "acc", date: "2026-07-17", type: "interest",
            ticker: "RU000A1084B2", name: "Interest", amount: 11776.71,
            currency: "USD", external_id: "e1", source: "test", dataProviders: ["test"],
        }, accountId);
        expect(result).toBeUndefined();
    });

});

describe("searchTransaction", () => {
    const txAccountId = "sdfdsfsdfsdfsfds";

    const withdrawalTx = {
        id: "erew434eufsdufsdfsdfsd",
        date: "2026-05-28",
        amount: "12,00 ₽",
        currency: "RUB",
        name: "Withdrawal from",
        classification: "expense",
        account: {id: txAccountId, name: "dssdfsfsd", account_type: "investment"},
        tags: [],
        created_at: "2026-07-22T07:56:14Z",
        updated_at: "2026-07-22T07:56:14Z",
    };

    const currentWithdrawal = {
        external_account_id: "tbank_tinvest_2022900423",
        date: "2026-05-28",
        type: "withdrawal",
        ticker: "T",
        name: "Т-Технологии",
        currency: "RUB",
        external_id: "5694585039",
        source: "tbank_tinvest_",
        dataProviders: ["moex_public", "tinkoff_invest"],
        amount: 12,
    };

    it("finds withdrawal by name containing type and matching amount", () => {
        const result = searchTransaction([withdrawalTx], currentWithdrawal, txAccountId);
        expect(result).toBeDefined();
        expect(result?.id).toBe(withdrawalTx.id);
    });

    it("returns undefined when no transactions exist", () => {
        const result = searchTransaction([], currentWithdrawal, txAccountId);
        expect(result).toBeUndefined();
    });

    it("returns undefined when account does not match", () => {
        const result = searchTransaction([withdrawalTx], currentWithdrawal, "other-account");
        expect(result).toBeUndefined();
    });

    it("returns undefined when date does not match", () => {
        const result = searchTransaction([withdrawalTx], {...currentWithdrawal, date: "2099-01-01"}, txAccountId);
        expect(result).toBeUndefined();
    });

    it("returns undefined when name does not contain type", () => {
        const result = searchTransaction([
            {
                ...withdrawalTx,
                name: "Some random transaction",
            },
        ], currentWithdrawal, txAccountId);
        expect(result).toBeUndefined();
    });

    it("returns undefined when amount differs", () => {
        const result = searchTransaction([withdrawalTx], {...currentWithdrawal, amount: 999}, txAccountId);
        expect(result).toBeUndefined();
    });

    it("respects currency mismatch", () => {
        const result = searchTransaction([withdrawalTx], {...currentWithdrawal, currency: "USD"}, txAccountId);
        expect(result).toBeUndefined();
    });

    it("matches deposit transaction by name and amount", () => {
        const depositTx = {
            ...withdrawalTx,
            id: "deposit-1",
            amount: "5.000,00 ₽",
            name: "Deposit to Брокерский счёт",
        };
        const result = searchTransaction([depositTx], {
            ...currentWithdrawal,
            type: "deposit",
            name: "Deposit",
            amount: 5000,
        }, txAccountId);
        expect(result).toBeDefined();
        expect(result?.id).toBe("deposit-1");
    });
});
