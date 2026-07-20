import {Component, Match, Switch, createEffect, onMount} from "solid-js";
import {Navigation} from "@/components/navigation";
import {currentRoute, navigateTo} from "@/shared/routing";
import {useActiveTabUrl} from "@/shared/hooks/useActiveTabUrl";
import {sourceProviders, providerKind} from "@/shared/providers/registry";
import {ProviderKind} from "@/shared/providers/base";
import {SettingsPage} from "@/pages/settings";
import {Space} from "@/components/ui/card";
import {ServicesPage} from "@/pages/services/services-list-page";
import {OnboardingPage} from "@/pages/onboarding/onboarding-page";
import {SyncPage} from "@/pages/sync/sync-page";
import {Toaster} from "solid-toast";
import {currentWidth, setCurrentWidth} from "@/shared/width";


const ROUTE_BY_KIND: Record<ProviderKind, "banks" | "investments" | "shops"> = {
    bank: "banks",
    investment: "investments",
    shop: "shops",
};

export const App: Component = () => {
    const isStandalone = window.outerWidth > 700;
    const tab = useActiveTabUrl();
    let jumped = false;

    createEffect(() => {
        const url = tab.url();
        if (jumped || !url || currentRoute() === "onboarding" || currentRoute() === "sync") return;
        const found = sourceProviders.find((provider) => url.startsWith(provider.getUrl()));
        if (!found) return;
        jumped = true;
        const route = ROUTE_BY_KIND[providerKind(found)];
        if (route !== currentRoute()) navigateTo(route);
    });

    onMount(() => {
        if (isStandalone || currentRoute() === "sync") {
            setCurrentWidth("100%");
        } else {
            setCurrentWidth("600px");
        }

        if (currentRoute() !== "onboarding" && currentRoute() !== "sync"
            && localStorage.getItem('onboarding-completed') !== 'true') {
            navigateTo('onboarding');
        }
    });

    return (
        <div class="min-h-screen" style={{width: currentWidth()}}>
            <Switch>
                <Match when={currentRoute() === "onboarding"}>
                    <OnboardingPage/>
                </Match>
                <Match when={currentRoute() === "sync"}>
                    <SyncPage/>
                </Match>
                <Match when={true}>
                    <Navigation/>
                    <main class="container mx-auto px-0 py-0">
                        <Switch fallback={
                            <Space>
                                <div class="text-center py-8">
                                    <div class="text-gray-500 text-lg mb-2">Раздел не найден</div>
                                    <div class="text-sm text-gray-400">Текущий путь: {currentRoute()}</div>
                                </div>
                            </Space>
                        }>
                            <Match when={currentRoute() === "banks"}>
                                <ServicesPage kind="bank"/>
                            </Match>
                            <Match when={currentRoute() === "investments"}>
                                <ServicesPage kind="investment"/>
                            </Match>
                            <Match when={currentRoute() === "shops"}>
                                <ServicesPage kind="shop"/>
                            </Match>
                            <Match when={currentRoute() === "settings"}>
                                <SettingsPage/>
                            </Match>
                        </Switch>
                        <Toaster
                            position="top-center"
                            gutter={8}
                            containerClassName=""
                            containerStyle={{}}
                            toastOptions={{
                                className: '',
                                duration: 5000,
                            }}
                        />
                    </main>
                </Match>
            </Switch>
        </div>
    );
};
