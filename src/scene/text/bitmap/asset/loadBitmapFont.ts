import { LoaderParserPriority } from '../../../../assets/loader/parsers/LoaderParser';
import { copySearchParams } from '../../../../assets/utils/copySearchParams';
import { DOMAdapter } from '../../../../environment/adapter';
import { ExtensionType } from '../../../../extensions/Extensions';
import { path } from '../../../../utils/path';
import { BitmapFont } from '../BitmapFont';
import { bitmapFontTextParser } from './bitmapFontTextParser';
import { bitmapFontXMLStringParser } from './bitmapFontXMLStringParser';

import type { Loader } from '../../../../assets/loader/Loader';
import type { LoaderParser } from '../../../../assets/loader/parsers/LoaderParser';
import type { ResolvedAsset } from '../../../../assets/types';
import type { Texture } from '../../../../rendering/renderers/shared/texture/Texture';

const validExtensions = ['.xml', '.fnt'];

/** simple loader plugin for loading in bitmap fonts! */
export const bitmapFontCachePlugin = {
    extension: ExtensionType.CacheParser,
    test: (asset: BitmapFont) => asset instanceof BitmapFont,
    getCacheableAssets(keys: string[], asset: BitmapFont)
    {
        const out: Record<string, BitmapFont> = {};

        keys.forEach((key) =>
        {
            out[key] = asset;
        });

        out[`${asset.fontFamily}-bitmap`] = asset;

        return out;
    }
};

export const loadBitmapFont = {
    extension: {
        type: ExtensionType.LoadParser,
        priority: LoaderParserPriority.Normal,
    },

    test(url: string): boolean
    {
        return validExtensions.includes(path.extname(url).toLowerCase());
    },

    async testParse(data: string): Promise<boolean>
    {
        return bitmapFontTextParser.test(data) || bitmapFontXMLStringParser.test(data);
    },

    async parse(asset: string, data: ResolvedAsset, loader: Loader): Promise<BitmapFont>
    {
        const bitmapFontData = bitmapFontTextParser.test(asset)
            ? bitmapFontTextParser.parse(asset)
            : bitmapFontXMLStringParser.parse(asset);

        const { src } = data;
        const { pages } = bitmapFontData;
        const textureUrls = [];

        for (let i = 0; i < pages.length; ++i)
        {
            const pageFile = pages[i].file;
            let imagePath = path.join(path.dirname(src), pageFile);

            imagePath = copySearchParams(imagePath, src);

            textureUrls.push(imagePath);
        }

        const alphaMode = bitmapFontData.distanceField && bitmapFontData.distanceField.type !== 'none'
            ? 'no-premultiply-alpha' : 'premultiply-alpha-on-upload';
        const mappedUrls: ResolvedAsset[] = textureUrls.map((url) => ({
            src: url,
            data: {
                alphaMode
            }
        }));
        const loadedTextures = await loader.load<Texture>(mappedUrls);
        const textures = textureUrls.map((url) => loadedTextures[url]);

        const bitmapFont = new BitmapFont({
            data: bitmapFontData,
            textures
        }, src);

        return bitmapFont;
    },

    async load(url: string, _options: ResolvedAsset): Promise<string>
    {
        const response = await DOMAdapter.get().fetch(url);

        if (!response.ok)
        {
            throw new Error(`Failed to load bitmap font ${url}`);
        }

        return await response.text();
    },

    unload(bitmapFont: BitmapFont): void
    {
        bitmapFont.destroy();
    }
} as LoaderParser;
