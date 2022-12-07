import { Assets } from '@pixi/assets';
import { Texture } from '@pixi/core';
import { Spritesheet } from '@pixi/spritesheet';

function wait(value = 500)
{
    // wait a bit...
    return new Promise<void>((resolve) =>
        setTimeout(() => resolve(), value));
}

describe('Assets bundles', () =>
{
    const basePath = process.env.GITHUB_ACTIONS
        ? `https://raw.githubusercontent.com/pixijs/pixijs/${process.env.GITHUB_SHA}/packages/assets/test/assets/`
        : 'http://localhost:8080/assets/test/assets/';

    beforeEach(() =>
    {
        // reset the loader
        Assets.reset();
    });

    it('should add and load bundle', async () =>
    {
        await Assets.init({
            basePath,
        });

        Assets.addBundle('testBundle', {
            bunny: 'textures/bunny.{png,webp}',
            spritesheet: 'spritesheet/spritesheet.json',
        });

        const assets = await Assets.loadBundle('testBundle');

        expect(assets.bunny).toBeInstanceOf(Texture);
        expect(assets.spritesheet).toBeInstanceOf(Spritesheet);
    });

    it('should load a bundle found in the manifest', async () =>
    {
        await Assets.init({
            basePath,
            manifest: 'json/asset-manifest-2.json',
        });

        const assets = await Assets.loadBundle('default');

        expect(assets.bunny).toBeInstanceOf(Texture);
        expect(assets['profile-abel']).toBeInstanceOf(Texture);
        expect(assets.spritesheet).toBeInstanceOf(Spritesheet);
    });

    it('should load multiple bundles', async () =>
    {
        await Assets.init({
            basePath,
            manifest: 'json/asset-manifest-2.json',
        });

        const progressMock = jest.fn();

        const assets = await Assets.loadBundle(['default', 'data'], progressMock);

        expect(progressMock).toHaveBeenCalledTimes(4);
        expect(progressMock.mock.calls).toEqual([[0.25], [0.5], [0.75], [1]]);
        expect(assets.default.bunny).toBeInstanceOf(Texture);
        expect(assets.default['profile-abel']).toBeInstanceOf(Texture);
        expect(assets.default.spritesheet).toBeInstanceOf(Spritesheet);

        expect(assets.data[`test.json`]).toEqual({ testNumber: 23, testString: 'Test String 23' });
    });

    it('should background load bundles', async () =>
    {
        await Assets.init({
            basePath,
            manifest: 'json/asset-manifest-2.json',
        });

        Assets.backgroundLoadBundle('default');

        // wait a bit...
        await wait();

        const expectTypes = {
            'json/asset-manifest-2.json': Object,
            'textures/bunny.png': Texture,
            'textures/profile-abel@2x.webp': Texture,
            'spritesheet/spritesheet.json': Spritesheet,
            'spritesheet/spritesheet.png': Texture,
        };

        for (const [key, type] of Object.entries(expectTypes))
        {
            const asset = await Assets.loader.promiseCache[basePath + key].promise;

            expect(asset).toBeInstanceOf(type);
        }
    });

    it('should unload bundles correctly', async () =>
    {
        await Assets.init({
            basePath,
        });

        Assets.addBundle('testBundle', {
            bunny: 'textures/bunny.{png,webp}',
            spritesheet: 'spritesheet/spritesheet.json',
        });

        const assets = await Assets.loadBundle('testBundle');

        expect(assets.bunny).toBeInstanceOf(Texture);
        expect(assets.spritesheet).toBeInstanceOf(Spritesheet);

        await Assets.unloadBundle('testBundle');

        expect(assets.bunny.baseTexture).toBe(null);
    });

    it('should load bundles with clashing names correctly', async () =>
    {
        const manifest = {
            bundles: [
                {
                    name: 'bunny1',
                    assets: [
                        {
                            name: 'character',
                            srcs: 'textures/bunny.png',
                        },
                    ],
                },
                {
                    name: 'bunny2',
                    assets: [
                        {
                            name: 'character',
                            srcs: 'textures/bunny-2.png',
                        },
                    ],
                },
            ]
        };

        await Assets.init({ manifest, basePath });

        const resources = await Assets.loadBundle('bunny1');
        const resources2 = await Assets.loadBundle('bunny2');

        expect(resources.character.textureCacheIds[0])
            .toBe(`${basePath}textures/bunny.png`);

        expect(resources2.character.textureCacheIds[0])
            .toBe(`${basePath}textures/bunny-2.png`);
    });

    it('should load bundles with clashing names correctly with key value pairs', async () =>
    {
        const manifest = {
            bundles: [
                {
                    name: 'bunny1',
                    assets: {
                        character: 'textures/bunny.png',
                    }
                },
                {
                    name: 'bunny2',
                    assets: {
                        character: 'textures/bunny-2.png',
                    }
                },
            ]
        };

        await Assets.init({ manifest, basePath });

        const resources = await Assets.loadBundle('bunny1');
        const resources2 = await Assets.loadBundle('bunny2');

        expect(resources.character.textureCacheIds[0])
            .toBe(`${basePath}textures/bunny.png`);

        expect(resources2.character.textureCacheIds[0])
            .toBe(`${basePath}textures/bunny-2.png`);
    });

    it.only('should load bundles with clashing names correctly with key value pairs', async () =>
    {
        const manifest = {
            bundles: [
                {
                    name: 'bunny1',
                    assets: [
                        {
                            name: ['character', 'character2'],
                            srcs: 'textures/bunny.png',
                        },
                    ],
                },
                {
                    name: 'bunny2',
                    assets: [
                        {
                            name: ['character', 'character2'],
                            srcs: 'textures/bunny-2.png',
                        },
                    ],
                },
            ]
        };

        await Assets.init({ manifest, basePath });

        const resources = await Assets.loadBundle('bunny1');
        const resources2 = await Assets.loadBundle('bunny2');

        expect(resources.character.textureCacheIds[0])
            .toBe(`${basePath}textures/bunny.png`);

        expect(resources2.character.textureCacheIds[0])
            .toBe(`${basePath}textures/bunny-2.png`);
    });
});
