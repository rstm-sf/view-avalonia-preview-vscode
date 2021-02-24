import { ChildProcessWithoutNullStreams, exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { AvaloniaPreviewProvider } from './AvaloniaPreviewProvider';
import { IAssemblyInfo } from './IAssemblyInfo';

const srcLink = 'http://127.0.0.1:6001/';

let _currentDoc: vscode.TextDocument;
let _provider: AvaloniaPreviewProvider;
let _previewToolPath: string | undefined;
let _assemblyNameToPathCollection: Array<IAssemblyInfo> | undefined;
let _previewerProcess: ChildProcessWithoutNullStreams | undefined;

export function activate(context: vscode.ExtensionContext) {

    initializeRequirements();

    _provider = new AvaloniaPreviewProvider;

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AvaloniaPreviewProvider.viewType, _provider));

    vscode.window.onDidChangeActiveTextEditor(editor => {
        return openPreview(editor);
    });

    // Try preview when this extension is activated the first time
    openPreview(vscode.window.activeTextEditor);
}

export function deactivate() {}

function initializeRequirements() {
    if (vscode.workspace.workspaceFolders !== undefined) {
        initAssembly(vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]);
        initPrewiewToolPath();
    } else {
        let message = "view-avalonia-preview: Working folder not found, open a folder an try again";
        vscode.window.showErrorMessage(message);
    }
}

function initAssembly(workspaceFolders: vscode.WorkspaceFolder[]) {
    workspaceFolders.forEach(folder => fs.readdir(folder.uri.fsPath, (err, files) => {
        if (err === null) {
            let file = files.find(x => {
                var ext = path.extname(x);
                return ext === '.sln' || ext === '.csproj';
            });

            if (file === undefined) {
                return;
            }

            exec('dotnet build '.concat(path.join(folder.uri.fsPath, file!)) + ' --nologo')
                .stdout?.on('data', (data: string) => {
                    let keys = data.split('\n')
                        .filter(x => x.indexOf('.dll') > 0)
                        .map(
                            x => {
                                const kv = x.split(' -> ');

                                const name = kv[0].trimStart();
                                const dllPath = path.normalize(kv[1].replace(/\r/g, ''));

                                const dllDirectory = path.dirname(dllPath);

                                let csprojDirectory = dllDirectory.split(path.sep)
                                    .filter(x => !x.startsWith('net') && !x.startsWith('Debug') && !x.startsWith('bin'))
                                    .join(path.sep);

                                return <IAssemblyInfo>{
                                    name: name,
                                    dllPath: dllPath,
                                    csprojDirectory: csprojDirectory,
                                    runtimeConfigPath: path.join(dllDirectory, name + '.runtimeconfig.json'),
                                    depsPath: path.join(dllDirectory, name + '.deps.json'),
                                };
                            });

                    if (_assemblyNameToPathCollection === undefined) {
                        _assemblyNameToPathCollection = keys;
                    } else {
                        _assemblyNameToPathCollection = _assemblyNameToPathCollection.concat(keys);
                    }
                });
        }
    }));
}

function initPrewiewToolPath() {
    exec('dotnet nuget locals global-packages --list')
        .stdout?.on('data', (data: string) => {
            _previewToolPath = path.normalize(data
                .split(': ')
                .pop()!
                .replace(/(\r|\n)/g, '')
                .concat('avalonia/0.10.0/tools/netcoreapp2.0/designer/Avalonia.Designer.HostApp.dll'));
        });
}

function openPreview(editor: vscode.TextEditor | undefined) {
    closePreview();

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
        if (_previewerProcess === undefined) {
            return;
        }

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

function getPreviewerProcess(fileName: string): ChildProcessWithoutNullStreams | undefined {
    if (_previewToolPath === undefined || _assemblyNameToPathCollection === undefined) {
        return undefined;
    }

    const assembly = _assemblyNameToPathCollection.find(x => fileName.startsWith(x.csprojDirectory))!;
    return spawn(
        'dotnet',
        [
            'exec',
            '--runtimeconfig',
            assembly.runtimeConfigPath,
            '--depsfile',
            assembly.depsPath,
            _previewToolPath!,
            '--transport',
            'file://' + fileName,
            '--method',
            'html',
            '--html-url',
            srcLink,
            assembly.dllPath
        ]
    );
}

function closePreview() {
    _provider.setHtmlToWebview('');
    _previewerProcess?.kill('SIGKILL');
}