import { url } from '@pixi/utils';
import { Spritesheet } from './Spritesheet';

import { LoaderResource, Loader } from '@pixi/loaders';
/**
 * {@link PIXI.Loader Loader} middleware for loading texture atlases that have been created with
 * TexturePacker or similar JSON-based spritesheet.
 *
 * This middleware automatically generates Texture resources.
 *
 * @class
 * @memberof PIXI
 * @implements PIXI.ILoaderPlugin
 */
export class SpritesheetLoader
{
    /**
     * Called after a resource is loaded.
     * @see PIXI.Loader.loaderMiddleware
     * @param {PIXI.LoaderResource} resource
     * @param {function} next
     */
    static use(resource: LoaderResource, next: (...args: any[]) => void): void
    {
        // because this is middleware, it execute in loader context. `this` = loader
        const loader = (this as any) as Loader;
        const imageResourceName = `${resource.name}_image`;

        // skip if no data, its not json, it isn't spritesheet data, or the image resource already exists
        if (!resource.data
            || resource.type !== LoaderResource.TYPE.JSON
            || !resource.data.frames
            || loader.resources[imageResourceName]
        )
        {
            next();

            return;
        }

        const loadOptions = {
            crossOrigin: resource.crossOrigin,
            metadata: (resource.metadata as any).imageMetadata,
            parentResource: resource,
        };

        const resourcePath = SpritesheetLoader.getResourcePath(resource, loader.baseUrl);

        // load the image for this sheet
        loader.add(imageResourceName, resourcePath, loadOptions, function onImageLoad(res: LoaderResource)
        {
            if (res.error)
            {
                next(res.error);

                return;
            }

            const spritesheet = new Spritesheet(
                res.texture.baseTexture,
                resource.data,
                resource.url
            );

            spritesheet.parse(() =>
            {
                resource.spritesheet = spritesheet;

                // TODO remove me
                (resource as any).textures = spritesheet.textures;
                next();
            });
        });
    }

    /**
     * Get the spritesheets root path
     * @param {PIXI.LoaderResource} resource - Resource to check path
     * @param {string} baseUrl - Base root url
     */
    private static getResourcePath(resource: LoaderResource, baseUrl: string): string
    {
        // Prepend url path unless the resource image is a data url
        if (resource.isDataUrl)
        {
            return resource.data.meta.image;
        }

        return url.resolve(resource.url.replace(baseUrl, ''), resource.data.meta.image);
    }
}
