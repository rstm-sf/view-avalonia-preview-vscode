import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { AvaloniaPreviewProvider } from './AvaloniaPreviewProvider';
import { createLanguageClient } from './languageClientUtils';
import { handleStartPreviewNotifications, handleStopPreviewNotifications, StartPreviewMessage } from './notifications';

let _client: LanguageClient;
let _provider: AvaloniaPreviewProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Window
    };

    await vscode.window.withProgress(progressOptions, async progress => {

        progress.report({
            message: 'Initialising View for Avalonia Preview...'
        });

        _provider = new AvaloniaPreviewProvider;

        _client = createLanguageClient(context);
        const disposable = _client.start();
        context.subscriptions.push(disposable);

        handleStartPreviewNotifications(_client, function (parameters: StartPreviewMessage): void {
            _provider.setHtmlToWebview(getHtmlForWebview(parameters.htmlUrl));
        });

        handleStopPreviewNotifications(_client, function (): void {
            _provider.setHtmlToWebview('');
        });

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(AvaloniaPreviewProvider.viewType, _provider));
    });
}

export function deactivate(): Thenable<void> | undefined {
    if (!_client) {
        return undefined;
    }
    return _client.stop();
}

function getHtmlForWebview(htmlUrl: string): string {
    return `<style>
            body {
                margin: 0;
            }
            iframe{
                position: fixed;
                top: 0;
                left: 0;
            }
        </style>
        <iframe width = "100%"" height="100%" src="${htmlUrl}" frameborder="0" />`;
}
