import path from 'path';
import workspacesRun from 'workspaces-run';
import { bumpDependencies } from './bumpDependencies';
import { readJSON, writeJSON } from './utils/json';

// copy version from package.json to sandbox CI bundles so npm pack command works
async function main()
{
    const { CSB_PACKAGES_BASE_URL } = process.env;

    if (!CSB_PACKAGES_BASE_URL)
    {
        throw new Error('CSB_PACKAGES_BASE_URL environment variable is undefined!');
    }

    // eslint-disable-next-line no-console
    console.log('The CSB_PACKAGES_BASE_URL is: ', CSB_PACKAGES_BASE_URL);

    const { version } = await readJSON<{version: string}>(path.join(process.cwd(), 'package.json'));
    const { packages } = await readJSON<{packages: string[]}>(path.join(process.cwd(), '.codesandbox', 'ci.json'));

    const packageDirs = packages.map((relativeDir) => path.join(process.cwd(), relativeDir));

    // Update packages from codesandbox ci config with version
    await workspacesRun({ cwd: process.cwd() }, async (workspace) =>
    {
        if (!packageDirs.includes(workspace.dir) || workspace.config.private)
        {
            return;
        }

        if ('version' in workspace.config)
        {
            console.error(
                `Error: ${workspace.dir}/package.json should not have a "version" property. `
                + `Remove it before publishing.`);

            process.exit(1);
        }
        workspace.config = {
            // Ensure the "version" property is placed right after the "name" property
            ...{ name: workspace.config.name, version },
            ...workspace.config,
        };

        // point dependency versions to their local codesandbox versions
        const getDependencyUrl = (packageName: string) => `${CSB_PACKAGES_BASE_URL}/${packageName}`;

        bumpDependencies(workspace.config.dependencies, getDependencyUrl);
        bumpDependencies(workspace.config.devDependencies, getDependencyUrl);
        bumpDependencies(workspace.config.peerDependencies, getDependencyUrl);

        await writeJSON(path.join(workspace.dir, 'package.json'), workspace.config);
    });
}

main();