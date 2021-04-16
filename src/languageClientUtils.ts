import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

export function createLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverExe = 'dotnet';
    let serverModule = context.asAbsolutePath(path.join('dist', 'LanguageServer', 'AvaloniaPreviewLanguageServer.dll'));

    let serverOptions: ServerOptions = {
        run: { command: serverExe, args: [serverModule] },
        debug: { command: serverExe, args: [serverModule] }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [
            {
                pattern: '**/*.axaml',
            },
            {
                pattern: '**/*.xaml',
            },
            {
                pattern: '**/*.paml',
            }
        ],
        synchronize: {
            configurationSection: 'AvaloniaPreviewLanguageServer',
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.csproj')
        },
    };

    return new LanguageClient(
        'AvaloniaPreviewLanguageServer', 'Avalonia Preview Language Server', serverOptions, clientOptions);
}
