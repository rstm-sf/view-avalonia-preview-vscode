import { NotificationType } from 'vscode-jsonrpc';
import { LanguageClient } from 'vscode-languageclient/node';

export interface StartPreviewMessage {
    htmlUrl: string;
    xamlFilePath: string
}

export namespace NotificationTypes {
    export const startPreview = new NotificationType<StartPreviewMessage>('view/avalonia/start-preview');
    export const stopPreview = new NotificationType<void>('view/avalonia/stop-preview');
}

interface StartPreviewCallback {
    (parameters: StartPreviewMessage): void
}

interface StopPreviewCallback {
    (): void
}

export function handleStartPreviewNotifications(languageClient: LanguageClient, callBack: StartPreviewCallback): void {
    languageClient.onReady().then(() => {
        languageClient.onNotification(NotificationTypes.startPreview, (notification: StartPreviewMessage) => {
            callBack(notification);
        });
    });
}

export function handleStopPreviewNotifications(languageClient: LanguageClient, callBack: StopPreviewCallback): void {
    languageClient.onReady().then(() => {
        languageClient.onNotification(NotificationTypes.stopPreview, () => {
            callBack();
        });
    });
}
