import * as vscode from 'vscode';

export class AvaloniaPreviewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'view-avalonia-preview.AvaloniaPreview';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken): void | Thenable<void> {

        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
        };
    }

    public setHtmlToWebview(htmlUrl: string) {
        if (this._view) {
            this._view.webview.html = htmlUrl ? this._getHtmlForWebview(this._view.webview, htmlUrl) : '';
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview, htmlUrl: string): string {
        const stylePreviewUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'preview.css'));

        return `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="Content-Security-Policy"
                          content="default-src 'none'; frame-src ${htmlUrl}; style-src ${webview.cspSource}">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <title>Avalonia Previewer</title>

                    <link href="${stylePreviewUri}" rel="stylesheet">
                </head>
                <body>
                    <iframe src="${htmlUrl}" />
                </body>
            </html>`
    }
}
