import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { AvaloniaPreviewProvider } from './AvaloniaPreviewProvider';
import { createLanguageClient } from './languageClientUtils';
import { handlePreviewNotifications, PreviewParameters } from './notifications';

const srcLink = 'http://127.0.0.1:6001/';

let _client: LanguageClient;
let _provider: AvaloniaPreviewProvider;
let _previewerProcess: ChildProcessWithoutNullStreams;

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

        handlePreviewNotifications(_client, function (parameters: PreviewParameters): void {
            _previewerProcess?.kill('SIGKILL');
            _previewerProcess = getPreviewerProcess(parameters);
            _previewerProcess.on('exit', () => _provider.setHtmlToWebview(''));
            _provider.setHtmlToWebview(getHtmlForWebview());
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

function getHtmlForWebview(): string {
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
        <iframe width = "100%"" height="100%" src="${srcLink}" frameborder="0" />`;
}

function getPreviewerProcess(parameters: PreviewParameters): ChildProcessWithoutNullStreams {
    return spawn(
        'dotnet',
        [
            'exec',
            '--runtimeconfig',
            parameters.projectRuntimeConfigFilePath,
            '--depsfile',
            parameters.projectDepsFilePath,
            parameters.avaloniaPreviewPath,
            '--transport',
            'file://' + parameters.xamlFilePath,
            '--method',
            'html',
            '--html-url',
            srcLink,
            parameters.targetPath
        ]
    );
}
