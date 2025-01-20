import { DOMAdapter } from '../../../../environment/adapter';
import { ExtensionType } from '../../../../extensions/Extensions';
import { ImageSource } from '../../../../rendering/renderers/shared/texture/sources/ImageSource';
import { getResolutionOfUrl } from '../../../../utils/network/getResolutionOfUrl';
import { checkDataUrl } from '../../../utils/checkDataUrl';
import { checkExtension } from '../../../utils/checkExtension';
import { WorkerManager } from '../../workers/WorkerManager';
import { LoaderParserPriority } from '../LoaderParser';
import { createTexture } from './utils/createTexture';

import type { TextureSourceOptions } from '../../../../rendering/renderers/shared/texture/sources/TextureSource';
import type { Texture } from '../../../../rendering/renderers/shared/texture/Texture';
import type { ResolvedAsset } from '../../../types';
import type { Loader } from '../../Loader';
import type { LoaderParser } from '../LoaderParser';

const validImageExtensions = ['.jpeg', '.jpg', '.png', '.webp', '.avif'];
const validImageMIMEs = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
];

/**
 * Configuration for the [loadTextures]{@link assets.loadTextures} plugin.
 * @see assets.loadTextures
 * @memberof assets
 */
export interface LoadTextureConfig
{
    /**
     * When set to `true`, loading and decoding images will happen with Worker thread,
     * if available on the browser. This is much more performant as network requests
     * and decoding can be expensive on the CPU. However, not all environments support
     * Workers, in some cases it can be helpful to disable by setting to `false`.
     * @default true
     */
    preferWorkers: boolean;
    /**
     * When set to `true`, loading and decoding images will happen with `createImageBitmap`,
     * otherwise it will use `new Image()`.
     * @default true
     */
    preferCreateImageBitmap: boolean;
    /**
     * The crossOrigin value to use for images when `preferCreateImageBitmap` is `false`.
     * @default 'anonymous'
     */
    crossOrigin: HTMLImageElement['crossOrigin'];
}

/**
 * Returns a promise that resolves an ImageBitmaps.
 * This function is designed to be used by a worker.
 * Part of WorkerManager!
 * @param url - The image to load an image bitmap for
 * @ignore
 */
export async function loadImageBitmap(url: string, asset?: ResolvedAsset<TextureSourceOptions<any>>): Promise<ImageBitmap>
{
    const response = await DOMAdapter.get().fetch(url);

    if (!response.ok)
    {
        throw new Error(`[loadImageBitmap] Failed to fetch ${url}: `
            + `${response.status} ${response.statusText}`);
    }

    const imageBlob = await response.blob();

    return asset?.data?.alphaMode === 'premultiplied-alpha'
        ? createImageBitmap(imageBlob, { premultiplyAlpha: 'none' })
        : createImageBitmap(imageBlob);
}

/**
 * A simple plugin to load our textures!
 * This makes use of imageBitmaps where available.
 * We load the `ImageBitmap` on a different thread using workers if possible.
 * We can then use the `ImageBitmap` as a source for a Pixi texture
 *
 * You can customize the behavior of this loader by setting the `config` property.
 * Which can be found [here]{@link assets.LoadTextureConfig}
 * ```js
 * // Set the config
 * import { loadTextures } from 'pixi.js';
 *
 * loadTextures.config = {
 *    // If true we will use a worker to load the ImageBitmap
 *    preferWorkers: true,
 *    // If false we will use new Image() instead of createImageBitmap,
 *    // we'll also disable the use of workers as it requires createImageBitmap
 *    preferCreateImageBitmap: true,
 *    crossOrigin: 'anonymous',
 * };
 * ```
 * @memberof assets
 */
export const loadTextures: LoaderParser<Texture, TextureSourceOptions, LoadTextureConfig> = {

    name: 'loadTextures',

    extension: {
        type: ExtensionType.LoadParser,
        priority: LoaderParserPriority.High,
        name: 'loadTextures',
    },

    config: {
        preferWorkers: true,
        preferCreateImageBitmap: true,
        crossOrigin: 'anonymous',
    },

    test(url: string): boolean
    {
        return checkDataUrl(url, validImageMIMEs) || checkExtension(url, validImageExtensions);
    },

    async load(url: string, asset: ResolvedAsset<TextureSourceOptions>, loader: Loader): Promise<Texture>
    {
        let src: any = null;

        if (globalThis.createImageBitmap && this.config.preferCreateImageBitmap)
        {
            if (this.config.preferWorkers && await WorkerManager.isImageBitmapSupported())
            {
                src = await WorkerManager.loadImageBitmap(url, asset);
            }
            else
            {
                src = await loadImageBitmap(url, asset);
            }
        }
        else
        {
            src = await new Promise((resolve, reject) =>
            {
                src = new Image();
                src.crossOrigin = this.config.crossOrigin;

                src.src = url;
                if (src.complete)
                {
                    resolve(src);
                }
                else
                {
                    src.onload = (): void =>
                    {
                        resolve(src);
                    };
                    src.onerror = reject;
                }
            });
        }

        const base = new ImageSource({
            resource: src,
            alphaMode: 'premultiply-alpha-on-upload',
            resolution: asset.data?.resolution || getResolutionOfUrl(url),
            ...asset.data,
        });

        return createTexture(base, loader, url);
    },

    unload(texture: Texture): void
    {
        texture.destroy(true);
    }
};
