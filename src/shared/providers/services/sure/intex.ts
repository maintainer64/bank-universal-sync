import {SureInternalApi} from "@/shared/providers/services/sure/sureInternalClient/base";
import {Api as SureExternalApi} from "@/shared/providers/services/sure/sureClient/Api";
import {AccountCollection, AccountDetail} from "./sureClient/data-contracts";
import {Account, OnProgress, ProviderFormatCSV, ProviderSync, Transaction} from "@/shared/providers/base";
import {mapAccountToParams} from "@/shared/providers/services/sure/map";

const MAX_PAGES = 1000;

export class SureService implements ProviderSync, ProviderFormatCSV {
    private readonly internalApi: SureInternalApi;
    private readonly externalApi: SureExternalApi;

    // apiKey задаётся в настройках и прокидывается сюда напрямую
    // (без регенерации через /settings/api_key).
    constructor(baseUrl: string, apiKey: string) {
        this.internalApi = new SureInternalApi(baseUrl)
        this.externalApi = new SureExternalApi({
            baseUrl,
            baseApiParams: {
                credentials: 'include',
                headers: {
                    "X-Api-Key": apiKey,
                },
            },
        })
    }


    getName(): string {
        return "Sure"
    }

    async accountsToCSV(accounts: Account[]): Promise<any[]> {
        return accounts.map(a => ({
            "Account type*": a.accountable_type || '',
            "Name*": a.name + ", " + a.institution_domain,
            "Balance*": 0,
            "Currency": a.currency || "",
            "Balance Date": a.opening_balance_date || "",
        }));
    }

    async transactionsToCSV(transactions: Transaction[]): Promise<any[]> {
        return transactions.map(t => ({
            "date*": t.date,
            "amount*": t.nature === "income" || t.nature === "inflow" ? t.amount : -t.amount,
            "name": t.name || t.description,
            "currency": t.currency,
            "category": '',
            "tags": '',
            "account": t.external_account_id,
            "notes": t.notes,
        }));
    }

    async createTransactionsIfNotExists(transactions: Transaction[], onProgress?: OnProgress): Promise<void> {
        onProgress?.({stage: "Проверка счетов в Sure…"});
        const accountsInDb = await this.getFullAccountsInDb();
        const externalApi = this.externalApi;

        const total = transactions.length;
        let current = 0;
        for (const transaction of transactions) {
            const accountInDb = this.getAccountsInDbById(
                accountsInDb,
                transaction.external_account_id,
            )
            if (!accountInDb) throw Error(`Невозможно найти счёт ${transaction.external_account_id}`);
            await externalApi.v1TransactionsCreate({
                transaction: {
                    account_id: accountInDb.id,
                    date: transaction.date,
                    amount: transaction.amount,
                    name: transaction.name,
                    description: transaction.description,
                    notes: transaction.notes,
                    currency: transaction.currency,
                    nature: transaction.nature,
                    external_id: transaction.external_id,
                    source: transaction.source,
                },
            })
            current++;
            onProgress?.({stage: "Отправка операций в Sure", current, total});
        }
    }

    private async getFullAccountsInDb(): Promise<AccountDetail[]> {
        const externalApi = this.externalApi;
        const accountsInDb = [];

        for (let page = 1; page <= MAX_PAGES; page++) {
            const response = await externalApi.v1AccountsList({
                include_disabled: true,
                page: page,
                per_page: 100
            });

            // Расширяем интерфейс ответа, добавляя туда поле pagination
            const result: AccountCollection = await response.json();

            // Если данных нет вообще — выходим
            if (!result.accounts || result.accounts.length === 0) {
                break;
            }

            accountsInDb.push(...result.accounts);

            // Условие выхода: если в ответе есть пагинация и текущая страница
            // равна или больше общего количества страниц — прекращаем цикл
            if (result.pagination && page >= result.pagination.total_pages) {
                break;
            }
        }
        return accountsInDb;
    }

    private getAccountsInDbById(db: AccountDetail[], id?: string): AccountDetail | undefined {
        return db.find((account) => {
            // Защита на случай, если domain окажется undefined или null
            if (!account.institution_domain || !id) {
                return false;
            }
            if (account.status === "pending_deletion") {
                return false
            }

            // Проверяем, начинается ли домен из БД с домена из account
            return account.institution_domain.startsWith(id);
        });
    }

    async createAccountsIfNotExists(accounts: Account[], onProgress?: OnProgress): Promise<void> {
        onProgress?.({stage: "Проверка счетов в Sure…"});
        const accountsInDb = await this.getFullAccountsInDb()
        const total = accounts.length;
        let current = 0;
        for (const account of accounts) {
            const accountInDb = this.getAccountsInDbById(
                accountsInDb,
                account.institution_domain
            )
            current++;
            onProgress?.({stage: "Создание счетов в Sure", current, total});
            if (accountInDb) continue;
            if (!account.accountable_type) {
                console.warn("Счёт не имеет типа", account);
            }
            const response = await this.internalApi.createDepository(mapAccountToParams(account))
            if (!response.ok) {
                throw Error(`Не удалось синхронизировать счёт ${account.name} ${account.institution_domain}`)
            }
        }
    }
}