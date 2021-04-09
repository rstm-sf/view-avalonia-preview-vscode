import * as vscode from 'vscode';

export class AvaloniaPreviewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'view-avalonia-preview.AvaloniaPreview';

    private _view?: vscode.WebviewView;

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken): void | Thenable<void> {

        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
        };
    }

    public setHtmlToWebview(html: string) {
        if (this._view) {
            this._view.webview.html = html;
        }
    }
}
