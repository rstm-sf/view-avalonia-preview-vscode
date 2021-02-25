import * as path from 'path';
import * as util from 'util';
import { IAssemblyInfo } from './IAssemblyInfo';

const exec = util.promisify(require('child_process').exec);

export async function findAssemblyInfoCollection(filePath: string): Promise<Array<IAssemblyInfo>> {
    const { stdout, stderr } = await exec(`dotnet build ${ filePath } --nologo`);

    if (stderr) {
        return new Array<IAssemblyInfo>();
    }

    return (stdout as string)
        .split('\n')
        .filter(x => x.indexOf('.dll') > 0)
        .map(x => {
            const kv = x.split(' -> ');

            const name = kv[0].trimStart();
            const dllPath = kv[1].replace(/\r/g, '');

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
}

export async function findAvaloniaPreviewTool(): Promise<string> {
    const { stdout, stderr } = await exec('dotnet nuget locals global-packages --list');

    if (stderr) {
        return '';
    }

    return path.normalize((stdout as string)
        .split(': ')
        .pop()!
        .replace(/(\r|\n)/g, '')
        .concat('avalonia/0.10.0/tools/netcoreapp2.0/designer/Avalonia.Designer.HostApp.dll'));
}