import {
    EXTERNAL,
    Origin,
    WindowTransportRequestMessage,
} from '@blank/background/utils/types/communication';
import log from 'loglevel';
import { checkScriptLoad } from './utils/site';

// Connect to the extension
const port = chrome.runtime.connect({ name: Origin.PROVIDER });

// Send any messages from the extension back to the page
port.onMessage.addListener((message): void => {
    window.postMessage(
        { ...message, origin: Origin.BACKGROUND },
        window.location.href
    );
});

// All messages from the page, pass them to the extension
window.addEventListener(
    'message',
    ({ data, source }: MessageEvent<WindowTransportRequestMessage>): void => {
        // Only allow messages from our window, by the inject
        if (
            source !== window ||
            data.origin !== Origin.PROVIDER ||
            !Object.values(EXTERNAL).includes(data.message)
        ) {
            return;
        }

        port.postMessage(data);
    }
);

// Load script
if (checkScriptLoad()) {
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
}
