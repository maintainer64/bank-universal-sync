import {createEffect, createSignal, For, onMount, Show} from "solid-js";
import {ActiveTab, useActiveTabUrl} from "@/shared/hooks/useActiveTabUrl";
import {ServiceDetailsPage} from "@/pages/services/service-details-page";
import {ProviderAny} from "@/shared/providers/base";
import {sourceProviders as services} from "@/shared/providers/registry";


export const ServicesPage = () => {
    const activeTab: ActiveTab = useActiveTabUrl();
    const [serviceFound, setServiceFound] = createSignal<
        ProviderAny | undefined
    >(undefined);

    // Эффект для поиска сервиса
    createEffect(() => {
        const currentUrl = activeTab.url() || "";
        const found = services.find((service) => currentUrl.startsWith(service.getUrl()));
        setServiceFound(found);
    });

    // Начальная проверка при монтировании компонента (на случай, если эффект не сработал сразу)
    onMount(() => {
    });

    return (
        <>
            <Show when={serviceFound()}>
                <ServiceDetailsPage provider={serviceFound()!}/>
            </Show>
            <Show when={!serviceFound()}>
                <div class="flex flex-col gap-2 p-4">
                    <For each={services}>
                        {(service) => (
                            <a
                                href={service.getUrl()}
                                class="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-sm transition-colors"
                                target="_blank"
                            >
                                <span class="text-xl">
                                    <img
                                        width="18"
                                        height="18"
                                        src={`/services/${service.getIcon()}`}
                                        alt={service.getIcon()}
                                    />
                                </span>
                                <span>{service.getName()}</span>
                            </a>
                        )}
                    </For>
                </div>
            </Show>
        </>
    );
}