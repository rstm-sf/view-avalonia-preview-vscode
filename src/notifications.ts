import * as vscode from 'vscode';
import { NotificationType } from 'vscode-jsonrpc';
import { LanguageClient } from 'vscode-languageclient/node';

export interface PreviewParameters {
    avaloniaPreviewPath: string;
    targetPath: string;
    projectDepsFilePath: string;
    projectRuntimeConfigFilePath: string;
    xamlFilePath: string;
}

export namespace NotificationTypes {
    export const preview = new NotificationType<PreviewParameters>('view/avalonia/preview');
}

interface PreviewRunnerCallback {
    (parameters: PreviewParameters): void
}

export function handlePreviewNotifications(languageClient: LanguageClient, callBack: PreviewRunnerCallback): void {
    languageClient.onReady().then(() => {
        languageClient.onNotification(NotificationTypes.preview, (notification: PreviewParameters) => {
            callBack(notification);
        });
    });
}
