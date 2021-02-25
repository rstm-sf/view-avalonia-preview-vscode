import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';

const readdir = util.promisify(require('fs').readdir);

export async function findProjectOrSolutionFilePath(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const files = await readdir(workspaceFolder.uri.fsPath);

    const file = files.find((x: string) => {
        var ext = path.extname(x);
        return ext === '.sln' || ext === '.csproj';
    });

    return file === undefined ? '' : file;
}
