import {
    CONTENT,
    EXTERNAL,
    Origin,
    WindowTransportRequestMessage,
} from '@blank/background/utils/types/communication';
import log from 'loglevel';
import { checkScriptLoad } from './utils/site';

// Check background settings for script load
chrome.runtime.sendMessage(
    { message: CONTENT.SHOULD_INJECT },
    (response: { shouldInject: boolean }): void => {
        const error = chrome.runtime.lastError;

        if (response.shouldInject !== true || shouldLoad !== true || error) {
            port.disconnect();
            window.removeEventListener('message', windowListenter);
            log.warn('BlockWallet: Provider not injected due to user setting.');
        } else {
            loadScript();
        }
    }
);

// Setup port connection
const port = chrome.runtime.connect({ name: Origin.PROVIDER });

// Send any messages from the extension back to the page
port.onMessage.addListener((message): void => {
    window.postMessage(
        { ...message, origin: Origin.BACKGROUND },
        window.location.href
    );
});

// Setup window listener
const windowListenter = ({
    data,
    source,
}: MessageEvent<WindowTransportRequestMessage>): void => {
    // Only allow messages from our window, by the inject
    if (
        source !== window ||
        data.origin !== Origin.PROVIDER ||
        !Object.values(EXTERNAL).includes(data.message)
    ) {
        return;
    }

    port.postMessage(data);
};

window.addEventListener('message', windowListenter);

// Script load
const shouldLoad = checkScriptLoad();

const loadScript = (): void => {
    try {
        const container = document.head || document.documentElement;
        const script = document.createElement('script');

        script.setAttribute('async', 'false');
        script.src = chrome.runtime.getURL('blankProvider.js');

        container.insertBefore(script, container.children[0]);

        window.addEventListener('DOMContentLoaded', () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        });
    } catch (error) {
        log.error('BlockWallet: Provider injection failed.', error);
    }
};
