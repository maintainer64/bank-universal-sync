import {ProviderAny, ProviderParams} from "@/shared/providers/base";
import {Component, For, Show} from "solid-js";
import {FaSolidDownload, FaSolidRotate, FaSolidFileWord} from "solid-icons/fa";
import {convertJsonToCSVString, downloadFile} from "@/shared/utils";
import {useActiveTabUrl} from "@/shared/hooks/useActiveTabUrl";
import {AsyncButton} from "@/components/ui/button";
import {useSetting, useSettingsSnapshot} from "@/shared/settings";
import {useServices} from "@/shared/hooks/useServices";
import {launchSyncWindow} from "@/shared/sync-launch";

interface ServiceDetailsPageProps {
    provider: ProviderAny;
}

export const ServiceDetailsPage: Component<ServiceDetailsPageProps> = (props) => {
    const p = props.provider;
    const tab = useActiveTabUrl();
    const services = useServices();
    const [maxTransactions] = useSetting('general-max-transactions');
    const [userName] = useSetting('user-name');
    const [fetchJsonProviderData] = useSetting('fetch-json-provider-data');
    const settingsSnapshot = useSettingsSnapshot();

    // Единая сборка параметров: провайдер объявляет нужные ему настройки
    // через getConfigKeys(), страница отдаёт их значения в config.
    const buildParams = (): ProviderParams => ({
        url: tab.url() ?? "",
        maxTransactions: maxTransactions(),
        userName: userName(),
        config: settingsSnapshot(p.getConfigKeys?.()),
    });
    return (
        <div class="flex flex-col gap-2 p-4">
            <h3 class="font-semibold text-lg mb-2 flex items-center gap-3 px-2">
                <span class="text-xl">
                    <img
                        width="18"
                        height="18"
                        src={`/services/${p.getIcon()}`}
                        alt={p.getIcon()}
                    />
                </span>
                <span>{p.getName()}</span>
            </h3>

            <Show when={(p.getTransactions || p.getAccounts || p.getTrades) && fetchJsonProviderData()}>
                <AsyncButton
                    icon={<FaSolidFileWord/>}
                    label="Выгрузить в JSON"
                    loadingLabel="Экспорт..."
                    onClick={async () => {
                        const params: ProviderParams = buildParams();
                        const [, accounts] = await props.provider?.getAccounts?.(params) || [[], undefined];
                        const [, transactions] = await props.provider?.getTransactions?.(params) || [[], undefined];
                        const [, trades] = await props.provider?.getTrades?.(params) || [[], undefined];
                        downloadFile(
                            "debug.json",
                            JSON.stringify({accounts, transactions, trades},
                                null,
                                2
                            )
                        );
                    }}
                    successMessage={`Счета и операции успешно выгружены в JSON`}
                    errorMessage={`Ошибка при выгрузке в JSON`}
                />
            </Show>

            <Show when={p.getAccounts || p.getTransactions || p.getTrades}>
                <For each={services().services}>
                    {(service) => (
                        <AsyncButton
                            icon={<FaSolidRotate/>}
                            label={`Синхронизировать в ${service.getName()}`}
                            loadingLabel="Открываю окно..."
                            onClick={async () => {
                                // Синк идёт в отдельном окне (#/sync): переживает
                                // случайное закрытие popup и показывает прогресс.
                                launchSyncWindow({
                                    providerName: p.getName(),
                                    serviceName: service.getName(),
                                    url: tab.url() ?? "",
                                    maxTransactions: maxTransactions(),
                                    userName: userName(),
                                    config: settingsSnapshot(p.getConfigKeys?.()),
                                });
                            }}
                            successMessage={`Открыто окно синхронизации с ${service.getName()}`}
                            errorMessage={`Не удалось открыть окно синхронизации`}
                        />
                    )}
                </For>
            </Show>

            <Show when={p.getTransactions}>
                <AsyncButton
                    icon={<FaSolidDownload/>}
                    label="Операции в CSV"
                    loadingLabel="Экспорт..."
                    onClick={async () => {
                        const params: ProviderParams = buildParams();
                        const [transactions] = await p.getTransactions?.(params) || [[], undefined];
                        const rows = await services().csv.transactionsToCSV(transactions);
                        const csv = convertJsonToCSVString(rows);
                        downloadFile("data.csv", csv);
                    }}
                    successMessage="Операции успешно экспортированы в CSV"
                    errorMessage="Ошибка при экспорте в CSV"
                />
            </Show>

            <Show when={p.getAccounts}>
                <AsyncButton
                    icon={<FaSolidDownload/>}
                    label="Счета в CSV"
                    loadingLabel="Экспорт..."
                    onClick={async () => {
                        const params: ProviderParams = buildParams();
                        const [accounts] = await p.getAccounts?.(params) || [[], undefined];
                        const rows = await services().csv.accountsToCSV(accounts);
                        const csv = convertJsonToCSVString(rows);
                        downloadFile("data.csv", csv);
                    }}
                    successMessage="Счета успешно экспортированы в CSV"
                    errorMessage="Ошибка при экспорте в CSV"
                />
            </Show>

            <Show when={p.getProducts}>
                <AsyncButton
                    icon={<FaSolidDownload/>}
                    label="Заказы в CSV"
                    loadingLabel="Экспорт..."
                    onClick={async () => {
                        const params: ProviderParams = buildParams();
                        const products = await p.getProducts?.(params) || [];
                        const csv = convertJsonToCSVString(products);
                        downloadFile("data.csv", csv);
                    }}
                    successMessage="Заказы и продукты успешно экспортированы в CSV"
                    errorMessage="Ошибка при экспорте в CSV"
                />
            </Show>
        </div>
    );
};