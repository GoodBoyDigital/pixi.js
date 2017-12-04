import { uid, BaseTextureCache, TextureCache } from '@pixi/utils';
import { FORMATS, TARGETS, TYPES, SCALE_MODES } from '@pixi/constants';

import Resource from './resources/Resource';
import BufferResource from './resources/BufferResource';
import { autoDetectResource } from './resources/autoDetectResource';

import { settings } from '@pixi/settings';
import EventEmitter from 'eventemitter3';
import bitTwiddle from 'bit-twiddle';

/**
 * A texture stores the information that represents an image. All textures have a base texture.
 *
 * @class
 * @extends PIXI.utils.EventEmitter
 * @memberof PIXI
 * @param {PIXI.resources.Resource|string|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} [resource=null]
 *        The current resource to use, for things that are `Resource` objects already, will be converted
 *        into a resource.
 * @param {Object} [options] - Collection of options
 * @param {boolean} [options.mipmap=PIXI.settings.MIPMAP_TEXTURES] - If mipmapping is enabled for texture
 * @param {PIXI.WRAP_MODES} [options.wrapMode=PIXI.settings.WRAP_MODE] - Wrap mode for textures
 * @param {PIXI.SCALE_MODES} [options.scaleMode=PIXI.settings.SCALE_MODE] - Default scale mode, linear, nearest
 * @param {PIXI.FORMATS} [options.format=PIXI.FORMATS.RGBA] - GL format type
 * @param {PIXI.TYPES} [options.type=PIXI.TYPES.UNSIGNED_BYTE] - GL data type
 * @param {PIXI.TARGETS} [options.target=PIXI.TARGETS.TEXTURE_2D] - GL texture target
 * @param {boolean} [options.premultiplyAlpha=true] - Pre multiply the image alpha
 * @param {Object} [options.params] - Optional parameters for resource, use for shared/dynamic resources
 * @param {number} [options.width=0] - Width of the texture
 * @param {number} [options.height=0] - Height of the texture
 */
export default class BaseTexture extends EventEmitter
{
    constructor(resource = null, options = null)
    {
        super();

        // Set all the properties above with the default
        // or the optional user override
        options = Object.assign({
            mipmap: settings.MIPMAP_TEXTURES,
            wrapMode: settings.WRAP_MODE,
            resolution: settings.RESOLUTION,
            scaleMode: settings.SCALE_MODE,
            format: FORMATS.RGBA,
            type: TYPES.UNSIGNED_BYTE,
            target: TARGETS.TEXTURE_2D,
            premultiplyAlpha: true,
            height: 0,
            width: 0,
            // params: null,
        }, options);

        // Convert the resource to a Resource object
        if (resource && !(resource instanceof Resource))
        {
            resource = autoDetectResource(resource, options);
        }

        /**
         * The width of the base texture set when the image has loaded
         *
         * @readonly
         * @member {number}
         */
        this.width = null;

        /**
         * The height of the base texture set when the image has loaded
         *
         * @readonly
         * @member {number}
         */
        this.height = null;

        /**
         * The resolution / device pixel ratio of the texture
         *
         * @member {number}
         * @default PIXI.settings.RESOLUTION
         */
        this.resolution = null;

        /**
         * If mipmapping was used for this texture, enable and disable with enableMipmap()
         *
         * @member {boolean}
         */
        this.mipmap = null;

        /**
         * How the texture wraps
         * @member {number}
         */
        this.wrapMode = null;

        /**
         * The scale mode to apply when scaling this texture
         *
         * @member {number}
         * @default PIXI.settings.SCALE_MODE
         * @see PIXI.SCALE_MODES
         */
        this.scaleMode = null;

        /**
         * The pixel format of the texture
         *
         * @member {PIXI.FORMATS}
         * @default PIXI.FORMATS.RGBA
         */
        this.format = null;

        /**
         * The type of resource data
         *
         * @member {PIXI.TYPES}
         * @default PIXI.TYPES.UNSIGNED_BYTE
         */
        this.type = null;

        /**
         * The target type
         *
         * @member {PIXI.TARGETS}
         * @default PIXI.TARGETS.TEXTURE_2D
         */
        this.target = null;

        /**
         * Set to true to enable pre-multiplied alpha
         *
         * @member {boolean}
         * @default true
         */
        this.premultiplyAlpha = null;

        /**
         * Global unique identifier for this BaseTexture
         *
         * @member {string}
         * @private
         */
        this.uid = uid();

        /**
         * TODO: fill in description
         *
         * @member {number}
         * @private
         */
        this.touched = 0;

        /**
         * Whether or not the texture is a power of two, try to use power of two textures as much
         * as you can
         *
         * @readonly
         * @member {boolean}
         * @default false
         */
        this.isPowerOfTwo = false;

        /**
         * The map of render context textures where this is bound
         *
         * @member {Object}
         * @private
         */
        this._glTextures = {};

        /**
         * Used by TextureSystem to only update texture to the GPU when needed.
         *
         * @private
         * @member {number}
         */
        this.dirtyId = 0;

        /**
         * Used by TextureSystem to only update texture style when needed.
         *
         * @private
         * @member {number}
         */
        this.dirtyStyleId = 0;

        /**
         * Currently default cache ID.
         *
         * @member {string}
         */
        this.cacheId = null;

        /**
         * Generally speaking means when resource is loaded.
         * @readonly
         * @member {boolean}
         */
        this.valid = false;

        /**
         * The collection of alternative cache ids, since some BaseTextures
         * can have more than one ID, short name and longer full URL
         *
         * @member {Array<string>}
         * @readonly
         */
        this.textureCacheIds = [];

        /**
         * Flag if BaseTexture has been destroyed.
         *
         * @member {boolean}
         * @readonly
         */
        this.destroyed = false;

        /**
         * The resource used by this BaseTexture, there can only
         * be one resource per BaseTexture, but textures can share
         * resources.
         *
         * @member {PIXI.resources.Resource}
         * @readonly
         */
        this.resource = null;

        // Set all the properties
        Object.assign(this, options);

        // Set the resource
        this.setResource(resource);

        // Update the size
        this.setSize(this.height, this.width, this.resolution);

        /**
         * Fired when a not-immediately-available source finishes loading.
         *
         * @protected
         * @event PIXI.BaseTexture#loaded
         * @param {PIXI.BaseTexture} baseTexture - Resource loaded.
         */

        /**
         * Fired when a not-immediately-available source fails to load.
         *
         * @protected
         * @event PIXI.BaseTexture#error
         * @param {PIXI.BaseTexture} baseTexture - Resource errored.
         */

        /**
         * Fired when BaseTexture is updated.
         *
         * @protected
         * @event PIXI.BaseTexture#loaded
         * @param {PIXI.BaseTexture} baseTexture - Resource loaded.
         */

        /**
         * Fired when BaseTexture is destroyed.
         *
         * @protected
         * @event PIXI.BaseTexture#error
         * @param {PIXI.BaseTexture} baseTexture - Resource errored.
         */

        /**
         * Fired when BaseTexture is updated.
         *
         * @protected
         * @event PIXI.BaseTexture#update
         * @param {PIXI.BaseTexture} baseTexture - Instance of texture being updated.
         */

        /**
         * Fired when BaseTexture is destroyed.
         *
         * @protected
         * @event PIXI.BaseTexture#dispose
         * @param {PIXI.BaseTexture} baseTexture - Instance of texture being destroyed.
         */
    }

    /**
     * Pixel width of the source of this texture
     *
     * @readonly
     * @member {number}
     */
    get realWidth()
    {
        return this.width * this.resolution;
    }

    /**
     * Pixel height of the source of this texture
     *
     * @readonly
     * @member {number}
     */
    get realHeight()
    {
        return this.height * this.resolution;
    }

    /**
     * Changes style options of BaseTexture
     *
     * @param {object} options
     * @param {PIXI.SCALE_MODES} [scaleMode] - pixi scalemode
     * @param {boolean} [mipmap] - enable mipmaps
     * @param {PIXI.FORMATS} [format] - webgl pixel format
     * @param {PIXI.TYPES} [type] - webgl pixel type
     * @returns {BaseTexture} this
     */
    setStyle(options)
    {
        let dirty = false;

        for (const field in options)
        {
            if (this[field] !== options[field])
            {
                // Update the property
                this[field] = options[field];
                dirty = true;
            }
        }

        if (dirty)
        {
            this.dirtyStyleId++;
        }

        return this;
    }

    /**
     * Changes w/h/resolution. Texture becomes valid if width and height are greater than zero.
     *
     * @param {number} width w
     * @param {number} height h
     * @param {number} [resolution] res
     * @returns {BaseTexture} this
     */
    setSize(width, height, resolution)
    {
        this.resolution = resolution || this.resolution;
        this.width = width;
        this.height = height;
        this.isPowerOfTwo = bitTwiddle.isPow2(this.realWidth) && bitTwiddle.isPow2(this.realHeight);
        this.update();

        return this;
    }

    /**
     * Sets real size of baseTexture, preserves current resolution
     *
     * @param {number} realWidth w
     * @param {number} realHeight h
     * @returns {BaseTexture} this
     */
    setRealSize(realWidth, realHeight)
    {
        this.width = realWidth / this.resolution;
        this.height = realHeight / this.resolution;
        this.isPowerOfTwo = bitTwiddle.isPow2(this.realWidth) && bitTwiddle.isPow2(this.realHeight);
        this.update();

        return this;
    }

    /**
     * Changes resolution
     *
     * @param {number} [resolution] res
     * @returns {BaseTexture} this
     */
    setResolution(resolution)
    {
        const oldResolution = this.resolution;

        if (oldResolution === resolution)
        {
            return this;
        }

        this.resolution = resolution;

        if (this.valid)
        {
            this.width = this.width * oldResolution / resolution;
            this.height = this.height * oldResolution / resolution;
            this.emit('update');
        }

        return this;
    }

    /**
     * Sets the resource if it wasnt set. Throws error if resource already present
     *
     * @param {PIXI.resources.Resource} resource - that is managing this BaseTexture
     * @returns {BaseTexture} this
     */
    setResource(resource)
    {
        if (this.resource === resource)
        {
            return this;
        }

        if (this.resource)
        {
            throw new Error('Resource can be set only once');
        }

        resource.bind(this);

        this.resource = resource;

        return this;
    }

    /**
     * Called when a resource has been loaded
     * @private
     */
    validated()
    {
        this.valid = true;
    }

    /**
     * Invalidates the object. Texture becomes valid if width and height are greater than zero.
     */
    update()
    {
        if (!this.valid)
        {
            if (this.width > 0 && this.height > 0)
            {
                this.valid = true;
                this.emit('loaded', this);
                this.emit('update', this);
            }
        }
        else
        {
            this.dirtyId++;
            this.dirtyStyleId++;
            this.emit('update', this);
        }
    }

    /**
     * Destroys this base texture.
     * The method stops if resource doesn't want this texture to be destroyed.
     * Removes texture from all caches.
     */
    destroy()
    {
        // remove and destroy the resource
        if (this.resource)
        {
            this.resource.unbind(this);
            this.resource.destroy();
            this.resource = null;
        }

        if (this.cacheId)
        {
            delete BaseTextureCache[this.cacheId];
            delete TextureCache[this.cacheId];

            this.cacheId = null;
        }

        // finally let the webGL renderer know..
        this.dispose();

        BaseTexture.removeFromCache(this);
        this.textureCacheIds = null;

        this.destroyed = true;
    }

    /**
     * Frees the texture from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     *
     * @fires PIXI.BaseTexture#dispose
     */
    dispose()
    {
        this.emit('dispose', this);
    }

    /**
     * Helper function that creates a base texture based on the source you provide.
     * The source can be - image url, image element, canvas element. If the
     * source is an image url or an image element and not in the base texture
     * cache, it will be created and loaded.
     *
     * @static
     * @param {string|HTMLImageElement|HTMLCanvasElement|SVGElement|HTMLVideoElement} source - The
     *        source to create base texture from.
     * @param {object} [options] See constructor for options.
     * @return {PIXI.BaseTexture} The new base texture.
     */
    static from(source, options)
    {
        let cacheId = null;

        if (typeof source === 'string')
        {
            cacheId = source;
        }
        else
        {
            if (!source._pixiId)
            {
                source._pixiId = `pixiid_${uid()}`;
            }

            cacheId = source._pixiId;
        }

        let baseTexture = BaseTextureCache[cacheId];

        if (!baseTexture)
        {
            baseTexture = new BaseTexture(source, options);
            baseTexture.cacheId = cacheId;
            BaseTexture.addToCache(baseTexture, cacheId);
        }

        return baseTexture;
    }

    /**
     * Create a new BaseTexture with a BufferResource from a Float32Array.
     * RGBA values are floats from 0 to 1.
     * @static
     * @param {number} width - Width of the resource
     * @param {number} height - Height of the resource
     * @param {Float32Array|UintArray} [data] The optional array to use, if no data
     *        is provided, the data type is a float.
     * @return {PIXI.BaseTexture} The resulting new BaseTexture
     */
    static fromBuffer(width, height, data)
    {
        data = data || new Float32Array(width * height * 4);

        const resource = new BufferResource(data, { width, height });
        const type = data instanceof Float32Array ? TYPES.FLOAT : TYPES.UNSIGNED_BYTE;

        return BaseTexture(resource, {
            scaleMode: SCALE_MODES.NEAREST,
            format: FORMATS.RGBA,
            type,
            width,
            height,
        });
    }

    /**
     * Adds a BaseTexture to the global BaseTextureCache. This cache is shared across the whole PIXI object.
     *
     * @static
     * @param {PIXI.BaseTexture} baseTexture - The BaseTexture to add to the cache.
     * @param {string} id - The id that the BaseTexture will be stored against.
     */
    static addToCache(baseTexture, id)
    {
        if (id)
        {
            if (baseTexture.textureCacheIds.indexOf(id) === -1)
            {
                baseTexture.textureCacheIds.push(id);
            }

            if (BaseTextureCache[id])
            {
                // eslint-disable-next-line no-console
                console.warn(`BaseTexture added to the cache with an id [${id}] that already had an entry`);
            }

            BaseTextureCache[id] = baseTexture;
        }
    }

    /**
     * Remove a BaseTexture from the global BaseTextureCache.
     *
     * @static
     * @param {string|PIXI.BaseTexture} baseTexture - id of a BaseTexture to be removed, or a BaseTexture instance itself.
     * @return {PIXI.BaseTexture|null} The BaseTexture that was removed.
     */
    static removeFromCache(baseTexture)
    {
        if (typeof baseTexture === 'string')
        {
            const baseTextureFromCache = BaseTextureCache[baseTexture];

            if (baseTextureFromCache)
            {
                const index = baseTextureFromCache.textureCacheIds.indexOf(baseTexture);

                if (index > -1)
                {
                    baseTextureFromCache.textureCacheIds.splice(index, 1);
                }

                delete BaseTextureCache[baseTexture];

                return baseTextureFromCache;
            }
        }
        else if (baseTexture && baseTexture.textureCacheIds)
        {
            for (let i = 0; i < baseTexture.textureCacheIds.length; ++i)
            {
                delete BaseTextureCache[baseTexture.textureCacheIds[i]];
            }

            baseTexture.textureCacheIds.length = 0;

            return baseTexture;
        }

        return null;
    }
}
