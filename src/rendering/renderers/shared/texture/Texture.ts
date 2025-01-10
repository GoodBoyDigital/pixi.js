import EventEmitter from 'eventemitter3';
import { groupD8 } from '../../../../maths/matrix/groupD8';
import { Rectangle } from '../../../../maths/shapes/Rectangle';
import { uid } from '../../../../utils/data/uid';
import { deprecation, v8_0_0 } from '../../../../utils/logging/deprecation';
import { NOOP } from '../../../../utils/misc/NOOP';
import { BufferImageSource } from './sources/BufferImageSource';
import { TextureSource } from './sources/TextureSource';
import { TextureMatrix } from './TextureMatrix';

import type { TextureResourceOrOptions } from './utils/textureFrom';

/**
 * Stores the width of the non-scalable borders, for example when used with {@link scene.NineSlicePlane} texture.
 * @memberof rendering
 */
export interface TextureBorders
{
    /** left border in pixels */
    left: number;
    /** top border in pixels */
    top: number;
    /** right border in pixels */
    right: number;
    /** bottom border in pixels */
    bottom: number;
}

/**
 * The UVs data structure for a texture.
 * @memberof rendering
 */
export type UVs = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
};

/**
 * The options that can be passed to a new Texture
 * @memberof rendering
 */
export interface TextureOptions<TextureSourceType extends TextureSource = TextureSource>
{
    /** the underlying texture data that this texture will use  */
    source?: TextureSourceType;
    /** optional label, for debugging */
    label?: string;
    /** The rectangle frame of the texture to show */
    frame?: Rectangle;
    /** The area of original texture */
    orig?: Rectangle;
    /** Trimmed rectangle of original texture */
    trim?: Rectangle;
    /** Default anchor point used for sprite placement / rotation */
    defaultAnchor?: { x: number; y: number };
    /** Default borders used for 9-slice scaling {@link NineSlicePlane}*/
    defaultBorders?: TextureBorders;
    /** indicates how the texture was rotated by texture packer. See {@link groupD8} */
    rotate?: number;
    /**
     * Set to true if you plan on modifying this texture's frame, UVs, or swapping its source at runtime.
     * This is false by default as it improves performance. Generally, it's recommended to create new
     * textures and swap those rather than modifying an existing texture's properties unless you are
     * working with a dynamic frames.
     * Not setting this to true when modifying the texture can lead to visual artifacts.
     *
     * If this is false and you modify the texture, you can manually update the sprite's texture by calling
     * `sprite.onViewUpdate()`.
     */
    dynamic?: boolean;
}

export interface BindableTexture
{
    source: TextureSource;
}

export type TextureSourceLike = TextureSource | TextureResourceOrOptions | string;

/**
 * A texture stores the information that represents an image or part of an image.
 *
 * A texture must have a loaded resource passed to it to work. It does not contain any
 * loading mechanisms.
 *
 * The Assets class can be used to load a texture from a file. This is the recommended
 * way as it will handle the loading and caching for you.
 *
 * ```js
 *
 * const texture = await Assets.load('assets/image.png');
 *
 * // once Assets has loaded the image it will be available via the from method
 * const sameTexture = Texture.from('assets/image.png');
 * // another way to access the texture once loaded
 * const sameAgainTexture = Asset.get('assets/image.png');
 *
 * const sprite1 = new Sprite(texture);
 *
 * ```
 *
 * It cannot be added to the display list directly; instead use it as the texture for a Sprite.
 * If no frame is provided for a texture, then the whole image is used.
 *
 * You can directly create a texture from an image and then reuse it multiple times like this :
 *
 * ```js
 * import { Sprite, Texture } from 'pixi.js';
 *
 * const texture = await Assets.load('assets/image.png');
 * const sprite1 = new Sprite(texture);
 * const sprite2 = new Sprite(texture);
 * ```
 *
 * If you didn't pass the texture frame to constructor, it enables `noFrame` mode:
 * it subscribes on baseTexture events, it automatically resizes at the same time as baseTexture.
 * @memberof rendering
 * @class
 */
export class Texture<TextureSourceType extends TextureSource = TextureSource> extends EventEmitter<{
    update: Texture
    destroy: Texture
}> implements BindableTexture
{
    /**
     * Helper function that creates a returns Texture based on the source you provide.
     * The source should be loaded and ready to go. If not its best to grab the asset using Assets.
     * @param id - String or Source to create texture from
     * @param skipCache - Skip adding the texture to the cache
     * @returns The texture based on the Id provided
     */
    public static from: (id: TextureSourceLike, skipCache?: boolean) => Texture;

    /** label used for debugging */
    public label?: string;
    /** unique id for this texture */
    public readonly uid: number = uid('texture');
    /**
     * Has the texture been destroyed?
     * @readonly
     */
    public destroyed: boolean;

    public _source: TextureSourceType;

    /**
     * Indicates whether the texture is rotated inside the atlas
     * set to 2 to compensate for texture packer rotation
     * set to 6 to compensate for spine packer rotation
     * can be used to rotate or mirror sprites
     * See {@link maths.groupD8} for explanation
     */
    public readonly rotate: number;
    /** A uvs object based on the given frame and the texture source */
    public readonly uvs: UVs = { x0: 0, y0: 0, x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0 };
    /**
     * Anchor point that is used as default if sprite is created with this texture.
     * Changing the `defaultAnchor` at a later point of time will not update Sprite's anchor point.
     * @default {0,0}
     */
    public readonly defaultAnchor?: { x: number; y: number };
    /**
     * Default width of the non-scalable border that is used if 9-slice plane is created with this texture.
     * @since 7.2.0
     * @see scene.NineSliceSprite
     */
    public readonly defaultBorders?: TextureBorders;
    /**
     * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
     * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
     */
    public readonly frame = new Rectangle();
    /** This is the area of original texture, before it was put in atlas. */
    public readonly orig: Rectangle;
    /**
     * This is the trimmed area of original texture, before it was put in atlas
     * Please call `updateUvs()` after you change coordinates of `trim` manually.
     */
    public readonly trim: Rectangle;

    /**
     * Does this Texture have any frame data assigned to it?
     *
     * This mode is enabled automatically if no frame was passed inside constructor.
     *
     * In this mode texture is subscribed to baseTexture events, and fires `update` on any change.
     *
     * Beware, after loading or resize of baseTexture event can fired two times!
     * If you want more control, subscribe on baseTexture itself.
     * @example
     * texture.on('update', () => {});
     */
    public noFrame = false;

    /**
     * Set to true if you plan on modifying the uvs of this texture.
     * When this is the case, sprites and other objects using the texture will
     * make sure to listen for changes to the uvs and update their vertices accordingly.
     */
    public dynamic = false;

    private _textureMatrix: TextureMatrix;

    /** is it a texture? yes! used for type checking */
    public readonly isTexture = true;

    /**
     * @param {rendering.TextureOptions} options - Options for the texture
     */
    constructor({
        source,
        label,
        frame,
        orig,
        trim,
        defaultAnchor,
        defaultBorders,
        rotate,
        dynamic
    }: TextureOptions<TextureSourceType> = {})
    {
        super();

        this.label = label;
        this.source = (source?.source ?? new TextureSource()) as TextureSourceType;

        this.noFrame = !frame;

        if (frame)
        {
            this.frame.copyFrom(frame);
        }
        else
        {
            const { width, height } = this._source;

            this.frame.width = width;
            this.frame.height = height;
        }

        this.orig = orig || this.frame;
        this.trim = trim;

        this.rotate = rotate ?? 0;
        this.defaultAnchor = defaultAnchor;
        this.defaultBorders = defaultBorders;

        this.destroyed = false;
        this.dynamic = dynamic || false;

        this.updateUvs();
    }

    set source(value: TextureSourceType)
    {
        if (this._source)
        {
            this._source.off('resize', this.update, this);
        }

        this._source = value;

        value.on('resize', this.update, this);

        this.emit('update', this);
    }

    /** the underlying source of the texture (equivalent of baseTexture in v7) */
    get source(): TextureSourceType
    {
        return this._source;
    }

    /** returns a TextureMatrix instance for this texture. By default, that object is not created because its heavy. */
    get textureMatrix()
    {
        if (!this._textureMatrix)
        {
            this._textureMatrix = new TextureMatrix(this);
        }

        return this._textureMatrix;
    }

    /** The width of the Texture in pixels. */
    get width(): number
    {
        return this.orig.width;
    }

    /** The height of the Texture in pixels. */
    get height(): number
    {
        return this.orig.height;
    }

    /** Call this function when you have modified the frame of this texture. */
    public updateUvs()
    {
        const { uvs, frame } = this;
        const { width, height } = this._source;

        const nX = frame.x / width;
        const nY = frame.y / height;

        const nW = frame.width / width;
        const nH = frame.height / height;

        let rotate = this.rotate;

        if (rotate)
        {
            // width and height div 2 div baseFrame size
            const w2 = nW / 2;
            const h2 = nH / 2;

            // coordinates of center
            const cX = nX + w2;
            const cY = nY + h2;

            rotate = groupD8.add(rotate, groupD8.NW); // NW is top-left corner
            uvs.x0 = cX + (w2 * groupD8.uX(rotate));
            uvs.y0 = cY + (h2 * groupD8.uY(rotate));

            rotate = groupD8.add(rotate, 2); // rotate 90 degrees clockwise
            uvs.x1 = cX + (w2 * groupD8.uX(rotate));
            uvs.y1 = cY + (h2 * groupD8.uY(rotate));

            rotate = groupD8.add(rotate, 2);
            uvs.x2 = cX + (w2 * groupD8.uX(rotate));
            uvs.y2 = cY + (h2 * groupD8.uY(rotate));

            rotate = groupD8.add(rotate, 2);
            uvs.x3 = cX + (w2 * groupD8.uX(rotate));
            uvs.y3 = cY + (h2 * groupD8.uY(rotate));
        }

        else
        {
            uvs.x0 = nX;
            uvs.y0 = nY;
            uvs.x1 = nX + nW;
            uvs.y1 = nY;
            uvs.x2 = nX + nW;
            uvs.y2 = nY + nH;
            uvs.x3 = nX;
            uvs.y3 = nY + nH;
        }
    }

    /**
     * Destroys this texture
     * @param destroySource - Destroy the source when the texture is destroyed.
     */
    public destroy(destroySource = false)
    {
        if (this._source)
        {
            if (destroySource)
            {
                this._source.destroy();
                this._source = null;
            }
        }

        this._textureMatrix = null;
        this.destroyed = true;
        this.emit('destroy', this);
        this.removeAllListeners();
    }

    /**
     * Call this if you have modified the `texture outside` of the constructor.
     *
     * If you have modified this texture's source, you must separately call `texture.source.update()` to see those changes.
     */
    public update(): void
    {
        if (this.noFrame)
        {
            this.frame.width = this._source.width;
            this.frame.height = this._source.height;
        }

        this.updateUvs();
        this.emit('update', this);
    }

    /** @deprecated since 8.0.0 */
    get baseTexture(): TextureSource
    {
        // #if _DEBUG
        deprecation(v8_0_0, 'Texture.baseTexture is now Texture.source');
        // #endif

        return this._source;
    }

    /** an Empty Texture used internally by the engine */
    public static EMPTY: Texture;
    /** a White texture used internally by the engine */
    public static WHITE: Texture<BufferImageSource>;
}

Texture.EMPTY = new Texture({
    label: 'EMPTY',
    source: new TextureSource({
        label: 'EMPTY',
    })
});

Texture.EMPTY.destroy = NOOP;

Texture.WHITE = new Texture({
    source: new BufferImageSource({
        resource: new Uint8Array([255, 255, 255, 255]),
        width: 1,
        height: 1,
        alphaMode: 'premultiply-alpha-on-upload',
        label: 'WHITE',
    }),
    label: 'WHITE',
});

Texture.WHITE.destroy = NOOP;
