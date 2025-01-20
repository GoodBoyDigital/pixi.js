import { Cache } from '../../cache/Cache';
import { Loader } from '../Loader';
import { loadJson } from '../parsers/loadJson';
import { loadWebFont } from '../parsers/loadWebFont';
import { loadSvg } from '../parsers/textures/loadSVG';
import { loadTextures } from '../parsers/textures/loadTextures';
import { basePath } from '@test-utils';
import { Texture } from '~/rendering';

import type { LoaderParser } from '../parsers/LoaderParser';
import type { GraphicsContext } from '~/scene';

describe('Loader', () =>
{
    beforeEach(() =>
    {
        Cache.reset();
    });

    it('should load a single image', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadTextures);

        const texture = await loader.load<Texture>(`${basePath}textures/bunny.png`);

        expect(texture.width).toBe(26);
        expect(texture.height).toBe(37);
    });

    it('should load an svg', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadSvg);

        const graphicsContext = await loader.load<GraphicsContext>({
            src: `${basePath}svg/logo.svg`,
            data: { parseAsGraphicsContext: true }
        });

        expect(graphicsContext.bounds.width).toBe(512);
        expect(graphicsContext.bounds.height).toBe(512);
    });

    it('should load a single image one after multiple loads', async () =>
    {
        const loader = new Loader();
        const texturesPromises = [];

        loader['_parsers'].push(loadTextures);

        for (let i = 0; i < 10; i++)
        {
            texturesPromises.push(loader.load<Texture>(`${basePath}textures/bunny.png`));
        }

        const textures = await Promise.all(texturesPromises);
        const ogTexture = textures[0];

        textures.forEach((texture) =>
        {
            expect(texture).toBe(ogTexture);
        });
    });

    it('should load multiple images', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadTextures);

        const assetsUrls = [`${basePath}textures/bunny.png`, `${basePath}textures/bunny-2.png`];
        const textures = await loader.load<Texture>(assetsUrls);

        expect(textures[`${basePath}textures/bunny.png`]).toBeInstanceOf(Texture);
        expect(textures[`${basePath}textures/bunny-2.png`]).toBeInstanceOf(Texture);
    });

    it('should load json file', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadJson);

        const json = await loader.load(`${basePath}json/test.json`);

        expect(json).toEqual({
            testNumber: 23,
            testString: 'Test String 23',
        });
    });

    it('should load a web font', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadWebFont);

        const font = await loader.load<FontFace>(`${basePath}fonts/outfit.woff2`);

        let foundFont = false;

        document.fonts.forEach((f: FontFace) =>
        {
            if (f.family === 'Outfit')
            {
                foundFont = true;
            }
        });

        document.fonts.delete(font);

        expect(foundFont).toBe(true);
    });

    it('should load a web font with custom attributes', async () =>
    {
        const loader = new Loader();

        document.fonts.clear();
        loader['_parsers'].push(loadWebFont);

        const font = await loader.load<FontFace>({
            data: {
                family: 'Overridden',
                style: 'italic',
                weights: ['normal'],
            },
            src: `${basePath}fonts/outfit.woff2`,
        });

        let count = 0;

        document.fonts.forEach((f: FontFace) =>
        {
            count++;
            expect(f.family).toBe('Overridden');
            expect(f.weight).toBe('normal');
            expect(f.style).toBe('italic');
        });

        document.fonts.delete(font);

        expect(count).toBe(1);
    });

    it('should load with metaData', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push({
            name: 'test',
            test: () => true,
            load: async (url, options) =>
                url + options.data.whatever,
        } as LoaderParser<string>);

        const sillyID = await loader.load<string>({
            src: `${basePath}textures/bunny.png`,
            data: { whatever: 23 },
        });

        expect(sillyID).toBe(`${basePath}textures/bunny.png23`);
    });

    it('should unload a texture', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadTextures);

        const texture = await loader.load<Texture>(`${basePath}textures/bunny.png`);

        expect(texture.baseTexture.destroyed).toBe(false);

        const baseTexture = texture.baseTexture;

        await loader.unload(`${basePath}textures/bunny.png`);

        expect(texture.baseTexture).toBe(null);
        expect(baseTexture.destroyed).toBe(true);
    });

    it('should unload a web font', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadWebFont);

        await loader.load(`${basePath}fonts/outfit.woff2`);
        await loader.unload(`${basePath}fonts/outfit.woff2`);

        let foundFont = false;

        document.fonts.forEach((f: FontFace) =>
        {
            if (f.family === 'Outfit')
            {
                foundFont = true;
            }
        });

        expect(foundFont).toBe(false);
    });

    it('should throw a warning if a parser specified does not exist', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadTextures);

        const spy = jest.spyOn(console, 'warn');

        await loader.load({
            src: `${basePath}textures/bunny.png`,
            loadParser: 'chicken'
        });

        // eslint-disable-next-line max-len
        expect(spy.mock.calls[0][1]).toBe(`[Assets] specified load parser "chicken" not found while loading ${basePath}textures/bunny.png`);

        spy.mockRestore();
    });

    it('should throw a warning if a parser is added with the same name', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadTextures);
        loader['_parsers'].push(loadTextures);

        const spy = jest.spyOn(console, 'warn');

        await loader.load({
            src: `${basePath}textures/bunny.other`,
            loadParser: 'loadTextures'
        });

        expect(spy.mock.calls[0][1]).toBe('[Assets] loadParser name conflict "loadTextures"');

        spy.mockRestore();
    });

    it('should load and parse with specified loader', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadTextures);

        const texture = await loader.load({
            src: `${basePath}textures/bunny.other`,
            loadParser: 'loadTextures'
        });

        expect(texture.width).toBe(26);
        expect(texture.height).toBe(37);
    });

    it('should error out if loader fails (preferCreateImageBitmap = false)', async () =>
    {
        const loader = new Loader();

        loader['_parsers'].push(loadTextures);
        const config = loadTextures.config;
        const defValue = config.preferCreateImageBitmap;

        config.preferCreateImageBitmap = false;
        await loader.load(`${basePath}textures/bunny_no_img.png`).catch(
            (e) => expect(e).toBeInstanceOf(Error)
        );
        config.preferCreateImageBitmap = defValue;
    });
});
