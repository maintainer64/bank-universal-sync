// Интеграционные тесты инвестиционной части против ЖИВОГО Sure.
// Проверяют путь: Investment-счёт -> trades (buy/sell/dividend) -> holdings,
// и клиентский дедуп (у trades в Sure нет external_id, повтор не должен плодить дубли).
import {beforeAll, describe, expect, it} from "vitest";
import {SureService} from "@/shared/providers/services/sure/intex";
import {Api} from "@/shared/providers/services/sure/sureClient/Api";
import type {Trade} from "@/shared/providers/base";

const BASE_URL = process.env.SURE_BASE_URL ?? "http://localhost";
const API_KEY = process.env.SURE_API_KEY ?? "";
// Счёт заводится сидом test/sure-seed-investment.rb: создание счетов в расширении
// идёт через internal CSRF-флоу (DOMParser), который в Node недоступен.
const DOMAIN = process.env.SURE_INVEST_DOMAIN ?? "tinvest-test";
const ACCOUNT_NAME = "Брокерский счёт (тест)";

const api = new Api({
    baseUrl: BASE_URL,
    baseApiParams: {headers: {"X-Api-Key": API_KEY}},
});

function makeTrades(): Trade[] {
    return [
        {
            external_account_id: DOMAIN, date: "2026-02-02", type: "buy",
            ticker: "SBER", name: "Сбербанк", qty: 10, price: 5,
            currency: "USD", external_id: "op-buy-1", source: "tinvest_",
        },
        {
            external_account_id: DOMAIN, date: "2026-02-03", type: "sell",
            ticker: "SBER", name: "Сбербанк", qty: 4, price: 6,
            currency: "USD", external_id: "op-sell-1", source: "tinvest_",
        },
        {
            external_account_id: DOMAIN, date: "2026-02-04", type: "dividend",
            ticker: "SBER", name: "Дивиденды Сбербанк", amount: 12,
            currency: "USD", external_id: "op-div-1", source: "tinvest_",
        },
    ];
}

async function tradesCount(): Promise<number> {
    const res = await api.v1TradesList({per_page: 100});
    const json = await res.json();
    return (json.trades ?? []).filter(
        (t: {account?: {name?: string}}) => t.account?.name === ACCOUNT_NAME,
    ).length;
}

describe("Sure инвестиции (живой инстанс)", () => {
    beforeAll(() => {
        expect(API_KEY, "SURE_API_KEY должен быть задан").not.toEqual("");
    });

    it("инвестиционный счёт доступен для сделок", async () => {
        const res = await api.v1AccountsList({per_page: 100, include_disabled: true});
        const json = await res.json();
        const found = json.accounts.find(
            (a: {institution_name?: string}) => a.institution_name === DOMAIN,
        );
        expect(found, `счёт ${DOMAIN} не найден (прогоните test/sure-seed-investment.rb)`).toBeTruthy();
        expect(found.account_type?.toLowerCase()).toContain("investment");
    });

    it("создаёт сделки и считает позицию (holdings)", async () => {
        const service = new SureService(BASE_URL, API_KEY);

        await service.createTradesIfNotExists(makeTrades());

        // Ровно наши 3 сделки на этом счёте — независимо от того, был ли прогон раньше
        // (дедуп гарантирует идемпотентность).
        expect(await tradesCount()).toBe(3);

        // Holdings пересчитывает воркер (Sidekiq) асинхронно — ждём появления позиции.
        // Тикер лежит в security.ticker (на верхнем уровне его нет).
        // Holdings хранятся снимками по датам — берём самый свежий.
        type Holding = {date?: string; qty?: string; security?: {ticker?: string}};
        let holding: Holding | undefined;
        for (let attempt = 0; attempt < 20 && !holding; attempt++) {
            const res = await api.v1HoldingsList({per_page: 100});
            const json = await res.json();
            const sber = (json.holdings ?? []).filter((h: Holding) => h.security?.ticker === "SBER");
            holding = sber.sort((a: Holding, b: Holding) =>
                (b.date ?? "").localeCompare(a.date ?? ""))[0];
            if (!holding) await new Promise((r) => setTimeout(r, 1000));
        }
        expect(holding, "позиция по SBER не появилась (воркер не пересчитал holdings)").toBeTruthy();
        // Куплено 10, продано 4 -> в позиции должно остаться 6
        expect(Number(holding!.qty)).toBe(6);
    }, 60000);

    it("повторный прогон не плодит дубли (клиентский дедуп)", async () => {
        const service = new SureService(BASE_URL, API_KEY);
        const before = await tradesCount();

        await service.createTradesIfNotExists(makeTrades());

        expect(await tradesCount()).toBe(before);
    });
});
