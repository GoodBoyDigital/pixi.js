import { ExtensionType } from '../../../../extensions/Extensions';
import { VideoSource } from '../../../../rendering/renderers/shared/texture/sources/VideoSource';
import { detectVideoAlphaMode } from '../../../../utils/browser/detectVideoAlphaMode';
import { isSafari } from '../../../../utils/browser/isSafari';
import { getResolutionOfUrl } from '../../../../utils/network/getResolutionOfUrl';
import { checkDataUrl } from '../../../utils/checkDataUrl';
import { checkExtension } from '../../../utils/checkExtension';
import { createTexture } from './utils/createTexture';

import type { VideoSourceOptions } from '../../../../rendering/renderers/shared/texture/sources/VideoSource';
import type { Texture } from '../../../../rendering/renderers/shared/texture/Texture';
import type { ResolvedAsset } from '../../../types';
import type { Loader } from '../../Loader';
import type { LoaderParser } from '../LoaderParser';

/**
 * Configuration for the [loadVideo]{@link assets.loadVideo} plugin.
 * @see assets.loadVideo
 * @memberof assets
 */
export interface LoadVideoConfig
{
    /**
     * The time in milliseconds to wait for the video 'canplay' event before timing out.
     * @default 30000
     */
    loadTimeoutMs?: number
}

const validVideoExtensions = ['.mp4', '.m4v', '.webm', '.ogg', '.ogv', '.h264', '.avi', '.mov'];
const validVideoMIMEs = validVideoExtensions.map((ext) => `video/${ext.substring(1)}`);

/**
 * Set cross origin based detecting the url and the crossorigin
 * @param element - Element to apply crossOrigin
 * @param url - URL to check
 * @param crossorigin - Cross origin value to use
 * @memberof assets
 */
export function crossOrigin(element: HTMLImageElement | HTMLVideoElement, url: string, crossorigin?: boolean | string): void
{
    if (crossorigin === undefined && !url.startsWith('data:'))
    {
        element.crossOrigin = determineCrossOrigin(url);
    }
    else if (crossorigin !== false)
    {
        element.crossOrigin = typeof crossorigin === 'string' ? crossorigin : 'anonymous';
    }
}

/**
 * Preload a video element
 * @param element - Video element to preload
 * @param options - preload options
 * @param options.timeoutMs - The time in milliseconds to wait preload before throw error
 */
export function preloadVideo(element: HTMLVideoElement, options: { timeoutMs?: number } = {}): Promise<void>
{
    const timeoutMs = options.timeoutMs;

    return new Promise((resolve, reject) =>
    {
        element.addEventListener('canplaythrough', loaded);
        element.addEventListener('error', error);
        const timeoutId = timeoutMs !== undefined ? setTimeout(
            () => error(new ErrorEvent(`preloadVideo exceeded timeout of ${timeoutMs}ms`)),
            timeoutMs
        ) : undefined;

        element.load();

        function loaded(): void
        {
            cleanup();
            resolve();
        }

        function error(err: ErrorEvent): void
        {
            cleanup();
            reject(err);
        }

        function cleanup(): void
        {
            element.removeEventListener('canplaythrough', loaded);
            element.removeEventListener('error', error);
            if (timeoutId) clearTimeout(timeoutId);
        }
    });
}

/**
 * Sets the `crossOrigin` property for this resource based on if the url
 * for this resource is cross-origin. If crossOrigin was manually set, this
 * function does nothing.
 * Nipped from the resource loader!
 * @ignore
 * @param url - The url to test.
 * @param {object} [loc=window.location] - The location object to test against.
 * @returns The crossOrigin value to use (or empty string for none).
 * @memberof assets
 */
export function determineCrossOrigin(url: string, loc: Location = globalThis.location): string
{
    // data: and javascript: urls are considered same-origin
    if (url.startsWith('data:'))
    {
        return '';
    }

    // default is window.location
    loc ||= globalThis.location;

    const parsedUrl = new URL(url, document.baseURI);

    // if cross origin
    if (parsedUrl.hostname !== loc.hostname || parsedUrl.port !== loc.port || parsedUrl.protocol !== loc.protocol)
    {
        return 'anonymous';
    }

    return '';
}

/**
 * A simple plugin to load video textures.
 *
 * You can pass VideoSource options to the loader via the .data property of the asset descriptor
 * when using Asset.load().
 * ```js
 * // Set the data
 * const texture = await Assets.load({
 *     src: './assets/city.mp4',
 *     data: {
 *         preload: true,
 *         autoPlay: true,
 *     },
 * });
 * ```
 * @memberof assets
 */
export const loadVideoTextures = {

    name: 'loadVideo',

    extension: {
        type: ExtensionType.LoadParser,
        name: 'loadVideo',
    },

    test(url: string): boolean
    {
        const isValidDataUrl = checkDataUrl(url, validVideoMIMEs);
        const isValidExtension = checkExtension(url, validVideoExtensions);

        return isValidDataUrl || isValidExtension;
    },

    async load(url: string, asset: ResolvedAsset<VideoSourceOptions & LoadVideoConfig>, loader: Loader): Promise<Texture>
    {
        const { loadTimeoutMs = 30000, ...rest } = asset.data;
        // --- Merge default and provided options ---
        const options: VideoSourceOptions = {
            ...VideoSource.defaultOptions,
            resolution: asset.data?.resolution || getResolutionOfUrl(url),
            alphaMode: asset.data?.alphaMode || await detectVideoAlphaMode(),
            ...rest,
        };

        // --- Create and configure HTMLVideoElement ---
        const videoElement = document.createElement('video');

        // Set attributes based on options
        const attributeMap = {
            preload: options.autoLoad !== false ? 'auto' : undefined,
            'webkit-playsinline': options.playsinline !== false ? '' : undefined,
            playsinline: options.playsinline !== false ? '' : undefined,
            muted: options.muted === true ? '' : undefined,
            loop: options.loop === true ? '' : undefined,
            autoplay: options.autoPlay !== false ? '' : undefined
        };

        Object.keys(attributeMap).forEach((key) =>
        {
            const value = attributeMap[key as keyof typeof attributeMap];

            if (value !== undefined) videoElement.setAttribute(key, value);
        });

        if (options.muted === true)
        {
            videoElement.muted = true;
        }

        crossOrigin(videoElement, url, options.crossorigin); // Assume crossOrigin is globally available

        // --- Set up source and MIME type ---
        const sourceElement = document.createElement('source');

        // Determine MIME type
        let mime: string | undefined;

        if (url.startsWith('data:'))
        {
            mime = url.slice(5, url.indexOf(';'));
        }
        else if (!url.startsWith('blob:'))
        {
            const ext = url.split('?')[0].slice(url.lastIndexOf('.') + 1).toLowerCase();

            mime = VideoSource.MIME_TYPES[ext] || `video/${ext}`;
        }

        sourceElement.src = url;

        if (mime)
        {
            sourceElement.type = mime;
        }

        // this promise will make sure that video is ready to play - as in we have a valid width, height and it can be
        // uploaded to the GPU. Our textures are kind of dumb now, and don't want to handle resizing right now.
        return new Promise<void>((resolve, reject) =>
        {
            setTimeout(() => reject(new ErrorEvent(`loadVideo exceeded timeout of ${loadTimeoutMs}ms`)), loadTimeoutMs);
            if (isSafari()
                && typeof options.width === 'number'
                && typeof options.height === 'number'
                && options.width > 0
                && options.height > 0)
            {
                videoElement.appendChild(sourceElement);
                resolve();
            }
            else
            {
                videoElement.addEventListener('canplay', () => resolve());
                videoElement.appendChild(sourceElement);
            }
        })
            .then(async (): Promise<Texture> =>
            {
                const base = new VideoSource({ ...options, resource: videoElement });

                if (asset.data.preload)
                {
                    await preloadVideo(videoElement, { timeoutMs: options.preloadTimeoutMs });
                }

                return createTexture(base, loader, url);
            });
    },

    unload(texture: Texture): void
    {
        texture.destroy(true);
    }
} satisfies LoaderParser<Texture, VideoSourceOptions & LoadVideoConfig, LoadVideoConfig>;
