import {Component, createEffect, createSignal, Match, onMount, Switch} from "solid-js";
import {FaSolidCircleCheck, FaSolidCircleXmark, FaSolidSpinner} from "solid-icons/fa";
import {ProviderParams, SyncProgress} from "@/shared/providers/base";
import {findProviderByName} from "@/shared/providers/registry";
import {useServices} from "@/shared/hooks/useServices";
import {takeSyncRequest, SyncRequest} from "@/shared/sync-launch";
import {ProgressBar} from "@/components/ui/progress";

type Status = "running" | "done" | "error";

export const SyncPage: Component = () => {
    const services = useServices();
    const [request] = createSignal<SyncRequest | null>(takeSyncRequest());
    const [progress, setProgress] = createSignal<SyncProgress>({stage: "Подготовка…"});
    const [status, setStatus] = createSignal<Status>("running");
    const [errorMsg, setErrorMsg] = createSignal("");
    const [started, setStarted] = createSignal(false);

    const runSync = async (req: SyncRequest) => {
        const provider = findProviderByName(req.providerName);
        const service = services().services.find(s => s.getName() === req.serviceName);

        if (!provider) {
            setErrorMsg(`Провайдер «${req.providerName}» не найден`);
            setStatus("error");
            return;
        }
        if (!service) {
            setErrorMsg(`Сервис «${req.serviceName}» не настроен`);
            setStatus("error");
            return;
        }

        const params: ProviderParams = {
            url: req.url,
            maxTransactions: req.maxTransactions,
            userName: req.userName,
        };

        try {
            // Подготовка (напр. у Яндекса — поиск операций в webpack-бандле).
            if (provider.prepare) {
                setProgress({stage: "Подготовка…"});
                await provider.prepare(params, setProgress);
            }

            setProgress({stage: "Загрузка счетов из банка…"});
            const [accounts] = await provider.getAccounts?.(params) || [[], undefined];
            await service.createAccountsIfNotExists(accounts, setProgress);

            setProgress({stage: "Загрузка операций из банка…"});
            const [transactions] = await provider.getTransactions?.(params) || [[], undefined];
            await service.createTransactionsIfNotExists(transactions, setProgress);

            setProgress({stage: "Готово"});
            setStatus("done");
        } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : String(e));
            setStatus("error");
        }
    };

    onMount(() => {
        if (!request()) {
            setErrorMsg("Нет запроса на синхронизацию");
            setStatus("error");
        }
    });

    // Сервисы поднимаются из localStorage асинхронно (onMount useUniversalStorage),
    // поэтому ждём, пока нужный сервис появится, и стартуем один раз.
    createEffect(() => {
        const req = request();
        if (!req || started() || status() === "error") return;
        const ready = services().services.some(s => s.getName() === req.serviceName);
        if (ready) {
            setStarted(true);
            void runSync(req);
        }
    });

    return (
        <div class="min-h-screen flex flex-col items-center justify-center gap-6 p-8" style={{width: "100%"}}>
            <div class="w-full max-w-sm flex flex-col gap-5">
                <h2 class="text-lg font-semibold text-center">
                    Синхронизация{request() ? ` · ${request()!.providerName} → ${request()!.serviceName}` : ""}
                </h2>

                <Switch>
                    <Match when={status() === "running"}>
                        <div class="flex flex-col gap-4">
                            <div class="flex justify-center text-blue-500 text-2xl">
                                <FaSolidSpinner class="animate-spin"/>
                            </div>
                            <ProgressBar
                                stage={progress().stage}
                                current={progress().current}
                                total={progress().total}
                            />
                            <p class="text-xs text-gray-400 text-center">
                                Окно можно свернуть — синхронизация не прервётся. Не закрывайте его до завершения.
                            </p>
                        </div>
                    </Match>

                    <Match when={status() === "done"}>
                        <div class="flex flex-col items-center gap-3">
                            <FaSolidCircleCheck class="text-green-500 text-4xl"/>
                            <p class="text-center">Синхронизация завершена</p>
                            <button
                                class="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                onClick={() => window.close()}
                            >
                                Закрыть
                            </button>
                        </div>
                    </Match>

                    <Match when={status() === "error"}>
                        <div class="flex flex-col items-center gap-3">
                            <FaSolidCircleXmark class="text-red-500 text-4xl"/>
                            <p class="text-center text-sm text-gray-600 break-words">{errorMsg()}</p>
                            <button
                                class="mt-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                                onClick={() => window.close()}
                            >
                                Закрыть
                            </button>
                        </div>
                    </Match>
                </Switch>
            </div>
        </div>
    );
};
