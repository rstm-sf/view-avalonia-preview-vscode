import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { AvaloniaPreviewProvider } from './AvaloniaPreviewProvider';
import { findAssemblyInfoCollection, findAvaloniaPreviewTool } from './dotnetUtils';
import { findProjectOrSolutionFilePath as findProjectOrSolutionFileName } from './fsUtils';
import { IAssemblyInfo } from './IAssemblyInfo';

const srcLink = 'http://127.0.0.1:6001/';

let _currentDoc: vscode.TextDocument;
let _provider: AvaloniaPreviewProvider;
let _previewToolPath: string;
let _assemblyNameToPathCollection: Array<IAssemblyInfo> = Array<IAssemblyInfo>();
let _previewerProcess: ChildProcessWithoutNullStreams | null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    const outputChannel = vscode.window.createOutputChannel('View-Avalonia-Preview');
    const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Window
    };

    await vscode.window.withProgress(progressOptions, async progress => {

        progress.report({
            message: 'Initialising View for Avalonia Preview...'
        });

        await initializeRequirements();

        if (_previewToolPath === '') {
            outputChannel.appendLine(`Cannot initialize View for Avalonia Preview.`);
            return;
        }

        _provider = new AvaloniaPreviewProvider;

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(AvaloniaPreviewProvider.viewType, _provider));

        vscode.window.onDidChangeActiveTextEditor(editor => {
            return openPreview(editor);
        });

        // Try preview when this extension is activated the first time
        openPreview(vscode.window.activeTextEditor);
    });
}

export function deactivate() {}

async function initializeRequirements(): Promise<void> {
    if (vscode.workspace.workspaceFolders !== undefined) {
        for (const workspaceFolder of vscode.workspace.workspaceFolders) {
            const fileName = await findProjectOrSolutionFileName(workspaceFolder);
            if (fileName === '') {
                return;
            }
            
            const result = await findAssemblyInfoCollection(path.join(workspaceFolder.uri.fsPath, fileName));
            _assemblyNameToPathCollection = _assemblyNameToPathCollection.concat(result);
        }
        
        _previewToolPath = await findAvaloniaPreviewTool();
    } else {
        let message = "view-avalonia-preview: Working folder not found, open a folder an try again";
        vscode.window.showErrorMessage(message);
    }
}

function openPreview(editor: vscode.TextEditor | undefined) {

    _previewerProcess?.kill('SIGKILL');

    if (!editor) {
        return;
    }

    let doc = editor.document;
    let extName = path.extname(doc.fileName);
    let isXaml = extName === '.axaml' || extName === '.xaml' || extName === '.paml';
    if (!isXaml) {
        return;
    }

    if (doc !== _currentDoc) {
        _previewerProcess = getPreviewerProcess(doc.fileName);
        if (_previewerProcess === null) {
            return;
        }

        _previewerProcess.on('exit', () => _provider.setHtmlToWebview(''));
        _provider.setHtmlToWebview(getHtmlForWebview());
        _currentDoc = doc;
    }
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

function getPreviewerProcess(fileName: string): ChildProcessWithoutNullStreams | null {

    const assembly = _assemblyNameToPathCollection.find(x => fileName.startsWith(x.csprojDirectory));
    if (assembly === undefined) {
        return null;
    }

    return spawn(
        'dotnet',
        [
            'exec',
            '--runtimeconfig',
            assembly!.runtimeConfigPath,
            '--depsfile',
            assembly!.depsPath,
            _previewToolPath!,
            '--transport',
            'file://' + fileName,
            '--method',
            'html',
            '--html-url',
            srcLink,
            assembly!.dllPath
        ]
    );
}
