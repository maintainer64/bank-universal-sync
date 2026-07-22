import {Component, createSignal, For, Show} from "solid-js";
import {useSetting} from "@/shared/settings";
import {navigateTo} from "@/shared/routing";
import {currentWidth} from "@/shared/width";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {TINVEST_API_PROD, TINVEST_API_SANDBOX} from "@/shared/settings";

// Пресеты адреса T-Invest API; «свой» задаётся правкой поля ниже.
const TINVEST_ENDPOINTS = [
    {label: "Боевой", url: TINVEST_API_PROD},
    {label: "Песочница", url: TINVEST_API_SANDBOX},
];

const STEPS = [
    {title: "Тип экспорта", description: "Выберите формат выгрузки данных"},
    {title: "Настройки Sure", description: "Укажите адрес вашего экземпляра Sure (необязательно)"},
    {title: "Настройки Firefly III", description: "Укажите адрес и токен Firefly III (необязательно)"},
    {title: "Т-Инвестиции", description: "Токен T-Invest OpenAPI для выгрузки сделок (необязательно)"},
    {title: "Имя пользователя", description: "Будет добавлено к названиям счетов при синхронизации (необязательно)"},
    {title: "Лимит операций", description: "Максимальное количество выгружаемых операций"},
];

const FORMATS = [
    {
        value: 'csv',
        label: 'Универсальный (CSV)',
        desc: 'Простой CSV-формат на русском языке'
    },
    {value: 'sure', label: 'Sure', desc: 'Формат для Sure'},
    {value: 'firefly', label: 'Firefly III', desc: 'Формат для Firefly III'},
]

export const OnboardingPage: Component = () => {
    const [step, setStep] = createSignal(0);
    const [exportType, setExportType] = useSetting('export-type');
    const [sureUrl, setSureUrl] = useSetting('sure-url');
    const [sureToken, setSureToken] = useSetting('sure-token');
    const [fireflyUrl, setFireflyUrl] = useSetting('firefly-url');
    const [fireflyToken, setFireflyToken] = useSetting('firefly-token');
    const [tbankInvestToken, setTbankInvestToken] = useSetting('tbank-invest-token');
    const [tbankInvestApiUrl, setTbankInvestApiUrl] = useSetting('tbank-invest-api-url');
    const [maxTransactions, setMaxTransactions] = useSetting('general-max-transactions');
    const [userName, setUserName] = useSetting('user-name');
    const [, setCompleted] = useSetting('onboarding-completed');

    const isLast = () => step() === STEPS.length - 1;

    const next = () => {
        if (isLast()) {
            setCompleted(true);
            navigateTo('banks');
        } else {
            setStep(s => s + 1);
        }
    };

    const skip = () => {
        if (isLast()) {
            setCompleted(true);
            navigateTo('banks');
        } else {
            setStep(s => s + 1);
        }
    };

    const selectExport = (type: string) => {
        setExportType(type);
    };

    return (
        <div class="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
             style={{width: currentWidth()}}>
            <div class="w-full max-w-lg">
                {/* Progress bar */}
                <div class="flex items-center justify-between mb-8">
                    <For each={STEPS}>
                        {(_, i) => (
                            <div class="flex items-center flex-1">
                                <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    i() <= step() ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {i() + 1}
                                </div>
                                {i() < STEPS.length - 1 && (
                                    <div class={`flex-1 h-1 mx-2 rounded ${
                                        i() < step() ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}/>
                                )}
                            </div>
                        )}
                    </For>
                </div>

                {/* Card */}
                <div class="bg-white rounded-2xl shadow-xl p-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">{STEPS[step()].title}</h2>
                    <p class="text-gray-500 mb-8">{STEPS[step()].description}</p>

                    {/* Step 1: Export type */}
                    <Show when={step() === 0}>
                        <div class="space-y-3">
                            <For each={FORMATS}>
                                {(format) => (
                                    <button
                                        onClick={() => selectExport(format.value)}
                                        class={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                            exportType() === format.value
                                                ? 'border-blue-500 bg-blue-50 shadow-xs'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div class="font-semibold text-gray-900">{format.label}</div>
                                        <div class="text-sm text-gray-500 mt-1">{format.desc}</div>
                                    </button>
                                )}
                            </For>
                        </div>
                    </Show>

                    {/* Step 2: Sure settings */}
                    <Show when={step() === 1}>
                        <div class="space-y-4">
                            <div>
                                <Label for="onb-sure-url">Адрес Sure</Label>
                                <Input
                                    id="onb-sure-url"
                                    placeholder="https://ваш-sure.example.com"
                                    value={sureUrl()}
                                    onChange={setSureUrl}
                                />
                            </div>
                            <div>
                                <Label for="onb-sure-token">API ключ</Label>
                                <Input
                                    id="onb-sure-token"
                                    type="password"
                                    placeholder="Введите API ключ Sure"
                                    value={sureToken()}
                                    onChange={setSureToken}
                                />
                            </div>
                            <p class="text-sm text-gray-400">Можно пропустить и настроить позже в настройках.</p>
                        </div>
                    </Show>

                    {/* Step 3: Firefly III settings */}
                    <Show when={step() === 2}>
                        <div class="space-y-4">
                            <div>
                                <Label for="onb-firefly-url">Адрес Firefly III</Label>
                                <Input
                                    id="onb-firefly-url"
                                    placeholder="https://ваш-firefly.example.com"
                                    value={fireflyUrl()}
                                    onChange={setFireflyUrl}
                                />
                            </div>
                            <div>
                                <Label for="onb-firefly-token">API токен</Label>
                                <Input
                                    id="onb-firefly-token"
                                    type="password"
                                    placeholder="Введите Personal Access Token"
                                    value={fireflyToken()}
                                    onChange={setFireflyToken}
                                />
                            </div>
                            <p class="text-sm text-gray-400">Можно пропустить и настроить позже в настройках.</p>
                        </div>
                    </Show>

                    {/* Step 4: T-Invest */}
                    <Show when={step() === 3}>
                        <div class="space-y-4">
                            <div>
                                <Label for="onb-tinvest-token">Токен T-Invest OpenAPI</Label>
                                <Input
                                    id="onb-tinvest-token"
                                    type="password"
                                    placeholder="Введите токен OpenAPI"
                                    value={tbankInvestToken()}
                                    onChange={setTbankInvestToken}
                                />
                            </div>
                            <div>
                                <Label for="onb-tinvest-api">Адрес API</Label>
                                <div class="flex gap-2 mb-2">
                                    <For each={TINVEST_ENDPOINTS}>
                                        {(endpoint) => (
                                            <button
                                                type="button"
                                                onClick={() => setTbankInvestApiUrl(endpoint.url)}
                                                class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                                                    tbankInvestApiUrl() === endpoint.url
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                            >
                                                {endpoint.label}
                                            </button>
                                        )}
                                    </For>
                                </div>
                                {/* «Свой» — любой адрес: правится прямо здесь, если банк сменит хост */}
                                <Input
                                    id="onb-tinvest-api"
                                    placeholder="https://invest-public-api.tbank.ru/rest"
                                    value={tbankInvestApiUrl()}
                                    onChange={setTbankInvestApiUrl}
                                />
                            </div>
                            <p class="text-sm text-gray-400">
                                Нужен для выгрузки брокерских счетов и сделок. Токен выпускается в
                                настройках Т-Инвестиций → «Токен для OpenAPI». Адрес можно
                                отредактировать вручную, если банк его сменит. Можно пропустить.
                            </p>
                        </div>
                    </Show>

                    {/* Step 5: Username */}
                    <Show when={step() === 4}>
                        <div class="space-y-4">
                            <div>
                                <Label for="onb-user-name">Имя пользователя</Label>
                                <Input
                                    id="onb-user-name"
                                    placeholder="Например: Иван"
                                    value={userName()}
                                    onChange={setUserName}
                                />
                            </div>
                            <p class="text-sm text-gray-400">
                                Это имя будет добавлено к названиям счетов при синхронизации, 
                                чтобы сразу было понятно, чей это счёт. Можно пропустить.
                            </p>
                        </div>
                    </Show>

                    {/* Step 6: Max transactions */}
                    <Show when={step() === 5}>
                        <div class="space-y-4">
                            <div>
                                <Label for="onb-max-ops">Максимальное количество операций</Label>
                                <Input
                                    id="onb-max-ops"
                                    placeholder="1000"
                                    value={maxTransactions()}
                                    onChange={setMaxTransactions}
                                />
                            </div>
                        </div>
                    </Show>

                    {/* Navigation buttons */}
                    <div class="flex justify-between mt-8 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => setStep(s => Math.max(0, s - 1))}
                            class={`px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors ${
                                step() === 0 ? 'invisible' : ''
                            }`}
                        >
                            Назад
                        </button>
                        <div class="flex gap-3">
                            <button
                                onClick={skip}
                                class="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                {isLast() ? 'Завершить' : 'Пропустить'}
                            </button>
                            <button
                                onClick={next}
                                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                {isLast() ? 'Завершить настройку' : 'Далее'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
