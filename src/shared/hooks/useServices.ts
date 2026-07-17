import {useUniversalStorage} from "@/shared/hooks/useUniversalStorage";
import {createMemo} from "solid-js";
import {SureService} from "@/shared/providers/services/sure/intex";
import {ProviderFormatCSV, ProviderSync} from "@/shared/providers/base";
import {FireflyService} from "@/shared/providers/services/firefly-service";
import {DefaultCsvService} from "@/shared/providers/services/default-csv";

export function useServices() {
    const [exportType] = useUniversalStorage('export-type', 'csv');
    const [sureUrl] = useUniversalStorage('sure-url', '');
    const [sureToken] = useUniversalStorage('sure-token', '');
    const [fireFlyUrl] = useUniversalStorage('firefly-url', '');
    const [fireFlyToken] = useUniversalStorage('firefly-token', '');

    return createMemo(() => {
        const defaultService = new DefaultCsvService();
        const services: ProviderSync[] = [];

        const sureUrlClean = sureUrl().replace(/\/+$/, '');
        const fireflyUrlClean = fireFlyUrl().replace(/\/+$/, '');

        // Всегда создаём сервисы
        const sureService = new SureService(sureUrlClean, sureToken());
        const fireflyService = new FireflyService(fireflyUrlClean, fireFlyToken());

        if (sureUrl() !== '') {
            services.push(sureService);
        }
        if (fireFlyUrl() !== '') {
            services.push(fireflyService);
        }

        let csv: ProviderFormatCSV = defaultService;
        if (exportType() === 'sure' && sureUrl() !== '') {
            csv = sureService;
        } else if (exportType() === 'firefly' && fireFlyUrl() !== '') {
            csv = fireflyService;
        }

        return {csv, services};
    });
}