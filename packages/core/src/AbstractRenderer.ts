import { hex2string, hex2rgb, EventEmitter, deprecation } from '@pixi/utils';
import { Matrix, Rectangle } from '@pixi/math';
import { RENDERER_TYPE } from '@pixi/constants';
import { settings } from '@pixi/settings';
import { RenderTexture } from './renderTexture/RenderTexture';

import type { SCALE_MODES, MSAA_QUALITY } from '@pixi/constants';
import type { ISystemConstructor } from './ISystem';
import type { IRenderingContext } from './IRenderingContext';
import type { IRenderableContainer, IRenderableObject } from './IRenderableObject';

const tempMatrix = new Matrix();

/**
 * Renderer options supplied to constructor.
 * @memberof PIXI
 * @see PIXI.settings.RENDER_OPTIONS
 */
export interface IRendererOptions extends GlobalMixins.IRendererOptions
{
    /** The canvas to use as the view. If omitted, a new canvas will be created. */
    view?: HTMLCanvasElement;
    /**
     * The width of the renderer's view.
     * @default 800
     */
    width?: number;
    /**
     * The height of the renderer's view.
     * @default 600
     */
    height?: number;
    /**
     * The resolution / device pixel ratio of the renderer.
     * @default PIXI.settings.RESOLUTION
     */
    resolution?: number;
    /**
     * Whether the CSS dimensions of the renderer's view should be resized automatically.
     * @default false
     */
    autoDensity?: boolean;

    /**
     * The background color used to clear the canvas. It accepts hex numbers (e.g. `0xff0000`).
     * @default 0x000000
     */
    backgroundColor?: number;
    /**
     * Transparency of the background color, value from `0` (fully transparent) to `1` (fully opaque).
     * @default 1
     */
    backgroundAlpha?: number;
    /**
     * Pass-through value for canvas' context attribute `alpha`. This option is for cases where the
     * canvas needs to be opaque, possibly for performance reasons on some older devices.
     * If you want to set transparency, please use `backgroundAlpha`.
     *
     * **WebGL Only:** When set to `'notMultiplied'`, the canvas' context attribute `alpha` will be
     * set to `true` and `premultipliedAlpha` will be to `false`.
     * @default true
     */
    useContextAlpha?: boolean | 'notMultiplied';
    /**
     * Use `backgroundAlpha` instead.
     * @deprecated since 6.0.0
     */
    transparent?: boolean;
    /**
     * Whether to clear the canvas before new render passes.
     * @default true
     */
    clearBeforeRender?: boolean;

    /** **WebGL Only.** User-provided WebGL rendering context object. */
    context?: IRenderingContext;
    /**
     * **WebGL Only.** Whether to enable anti-aliasing. This may affect performance.
     * @default false
     */
    antialias?: boolean;
    /**
     * **WebGL Only.** A hint indicating what configuration of GPU is suitable for the WebGL context,
     * can be `'default'`, `'high-performance'` or `'low-power'`.
     * Setting to `'high-performance'` will prioritize rendering performance over power consumption,
     * while setting to `'low-power'` will prioritize power saving over rendering performance.
     */
    powerPreference?: WebGLPowerPreference;
    /**
     * **WebGL Only.** Whether to enable drawing buffer preservation. If enabled, the drawing buffer will preserve
     * its value until cleared or overwritten. Enable this if you need to call `toDataUrl` on the WebGL context.
     * @default false
     */
    preserveDrawingBuffer?: boolean;
}

export interface IRendererPlugins
{
    [key: string]: any;
}

export interface IRendererRenderOptions
{
    renderTexture?: RenderTexture;
    clear?: boolean;
    transform?: Matrix;
    skipUpdateTransform?: boolean;
}

export interface IGenerateTextureOptions
{
    scaleMode?: SCALE_MODES;
    resolution?: number;
    region?: Rectangle;
    multisample?: MSAA_QUALITY;
}

/**
 * The AbstractRenderer is the base for a PixiJS Renderer. It is extended by the {@link PIXI.CanvasRenderer}
 * and {@link PIXI.Renderer} which can be used for rendering a PixiJS scene.
 * @abstract
 * @class
 * @extends PIXI.utils.EventEmitter
 * @memberof PIXI
 */
export abstract class AbstractRenderer extends EventEmitter
{
    public resolution: number;
    public clearBeforeRender?: boolean;
    public readonly options: IRendererOptions;
    public readonly type: RENDERER_TYPE;
    public readonly screen: Rectangle;
    public readonly view: HTMLCanvasElement;
    public readonly plugins: IRendererPlugins;
    public readonly useContextAlpha: boolean | 'notMultiplied';
    public readonly autoDensity: boolean;
    public readonly preserveDrawingBuffer: boolean;

    protected _backgroundColor: number;
    protected _backgroundColorString: string;
    _backgroundColorRgba: number[];
    _lastObjectRendered: IRenderableObject;

    /**
     * @param type - The renderer type.
     * @param {PIXI.IRendererOptions} [options] - The optional renderer parameters.
     * @param {HTMLCanvasElement} [options.view=null] -
     *  The canvas to use as the view. If omitted, a new canvas will be created.
     * @param {number} [options.width=800] - The width of the renderer's view.
     * @param {number} [options.height=600] - The height of the renderer's view.
     * @param {number} [options.resolution=PIXI.settings.RESOLUTION] -
     *  The resolution / device pixel ratio of the renderer.
     * @param {boolean} [options.autoDensity=false] -
     *  Whether the CSS dimensions of the renderer's view should be resized automatically.
     * @param {number} [options.backgroundColor=0x000000] -
     *  The background color used to clear the canvas. It accepts hex numbers (e.g. `0xff0000`).
     * @param {number} [options.backgroundAlpha=1] -
     *  Transparency of the background color, value from `0` (fully transparent) to `1` (fully opaque).
     * @param {boolean} [options.transparent] -
     *  **Deprecated since 6.0.0, Use `backgroundAlpha` instead.** \
     *  `true` sets `backgroundAlpha` to `0`, `false` sets `backgroundAlpha` to `1`.
     * @param {boolean|'notMultiplied'} [options.useContextAlpha=true] -
     *  Pass-through value for canvas' context attribute `alpha`. This option is for cases where the
     *  canvas needs to be opaque, possibly for performance reasons on some older devices.
     *  If you want to set transparency, please use `backgroundAlpha`. \
     *  **WebGL Only:** When set to `'notMultiplied'`, the canvas' context attribute `alpha` will be
     *  set to `true` and `premultipliedAlpha` will be to `false`.
     * @param {boolean} [options.clearBeforeRender=true] - Whether to clear the canvas before new render passes.
     * @param {PIXI.IRenderingContext} [options.context] - **WebGL Only.** User-provided WebGL rendering context object.
     * @param {boolean} [options.antialias=false] -
     *  **WebGL Only.** Whether to enable anti-aliasing. This may affect performance.
     * @param {string} [options.powerPreference] -
     *  **WebGL Only.** A hint indicating what configuration of GPU is suitable for the WebGL context,
     *  can be `'default'`, `'high-performance'` or `'low-power'`.
     *  Setting to `'high-performance'` will prioritize rendering performance over power consumption,
     *  while setting to `'low-power'` will prioritize power saving over rendering performance.
     * @param {boolean} [options.premultipliedAlpha=true] -
     *  **WebGL Only.** Whether the compositor will assume the drawing buffer contains colors with premultiplied alpha.
     * @param {boolean} [options.preserveDrawingBuffer=false] -
     *  **WebGL Only.** Whether to enable drawing buffer preservation. If enabled, the drawing buffer will preserve
     *  its value until cleared or overwritten. Enable this if you need to call `toDataUrl` on the WebGL context.
     */
    constructor(type: RENDERER_TYPE = RENDERER_TYPE.UNKNOWN, options?: IRendererOptions)
    {
        super();

        // Add the default render options
        options = Object.assign({}, settings.RENDER_OPTIONS, options);

        /**
         * The supplied constructor options.
         * @member {object}
         * @readonly
         */
        this.options = options;

        /**
         * The type of the renderer.
         * @member {number}
         * @default PIXI.RENDERER_TYPE.UNKNOWN
         * @see PIXI.RENDERER_TYPE
         */
        this.type = type;

        /**
         * Measurements of the screen. (0, 0, screenWidth, screenHeight).
         *
         * Its safe to use as filterArea or hitArea for the whole stage.
         * @member {PIXI.Rectangle}
         */
        this.screen = new Rectangle(0, 0, options.width, options.height);

        /**
         * The canvas element that everything is drawn to.
         * @member {HTMLCanvasElement}
         */
        this.view = options.view || settings.ADAPTER.createCanvas();

        /**
         * The resolution / device pixel ratio of the renderer.
         * @member {number}
         * @default PIXI.settings.RESOLUTION
         */
        this.resolution = options.resolution || settings.RESOLUTION;

        /**
         * Pass-thru setting for the canvas' context `alpha` property. This is typically
         * not something you need to fiddle with. If you want transparency, use `backgroundAlpha`.
         * @member {boolean}
         */
        this.useContextAlpha = options.useContextAlpha;

        /**
         * Whether CSS dimensions of canvas view should be resized to screen dimensions automatically.
         * @member {boolean}
         */
        this.autoDensity = !!options.autoDensity;

        /**
         * The value of the preserveDrawingBuffer flag affects whether or not the contents of
         * the stencil buffer is retained after rendering.
         * @member {boolean}
         */
        this.preserveDrawingBuffer = options.preserveDrawingBuffer;

        /**
         * This sets if the CanvasRenderer will clear the canvas or not before the new render pass.
         * If the scene is NOT transparent PixiJS will use a canvas sized fillRect operation every
         * frame to set the canvas background color. If the scene is transparent PixiJS will use clearRect
         * to clear the canvas every frame. Disable this by setting this to false. For example, if
         * your game has a canvas filling background image you often don't need this set.
         * @member {boolean}
         * @default
         */
        this.clearBeforeRender = options.clearBeforeRender;

        /**
         * The background color as a number.
         * @member {number}
         * @protected
         */
        this._backgroundColor = 0x000000;

        /**
         * The background color as an [R, G, B, A] array.
         * @member {number[]}
         * @protected
         */
        this._backgroundColorRgba = [0, 0, 0, 1];

        /**
         * The background color as a string.
         * @member {string}
         * @protected
         */
        this._backgroundColorString = '#000000';

        this.backgroundColor = options.backgroundColor || this._backgroundColor; // run bg color setter
        this.backgroundAlpha = options.backgroundAlpha;

        // @deprecated
        if (options.transparent !== undefined)
        {
            // #if _DEBUG
            deprecation('6.0.0', 'Option transparent is deprecated, please use backgroundAlpha instead.');
            // #endif
            this.useContextAlpha = options.transparent;
            this.backgroundAlpha = options.transparent ? 0 : 1;
        }

        /**
         * The last root object that the renderer tried to render.
         * @member {PIXI.DisplayObject}
         * @protected
         */
        this._lastObjectRendered = null;

        /**
         * Collection of plugins.
         * @readonly
         * @member {object}
         */
        this.plugins = {};
    }

    /**
     * Initialize the plugins.
     * @protected
     * @param {object} staticMap - The dictionary of statically saved plugins.
     */
    initPlugins(staticMap: IRendererPlugins): void
    {
        for (const o in staticMap)
        {
            this.plugins[o] = new (staticMap[o])(this);
        }
    }

    /**
     * Same as view.width, actual number of pixels in the canvas by horizontal.
     * @member {number}
     * @readonly
     * @default 800
     */
    get width(): number
    {
        return this.view.width;
    }

    /**
     * Same as view.height, actual number of pixels in the canvas by vertical.
     * @member {number}
     * @readonly
     * @default 600
     */
    get height(): number
    {
        return this.view.height;
    }

    /**
     * Resizes the screen and canvas as close as possible to the specified width and height.
     * Canvas dimensions are multiplied by resolution and rounded to the nearest integers.
     * The new canvas dimensions divided by the resolution become the new screen dimensions.
     * @param desiredScreenWidth - The desired width of the screen.
     * @param desiredScreenHeight - The desired height of the screen.
     */
    resize(desiredScreenWidth: number, desiredScreenHeight: number): void
    {
        this.view.width = Math.round(desiredScreenWidth * this.resolution);
        this.view.height = Math.round(desiredScreenHeight * this.resolution);

        const screenWidth = this.view.width / this.resolution;
        const screenHeight = this.view.height / this.resolution;

        this.screen.width = screenWidth;
        this.screen.height = screenHeight;

        if (this.autoDensity)
        {
            this.view.style.width = `${screenWidth}px`;
            this.view.style.height = `${screenHeight}px`;
        }

        /**
         * Fired after view has been resized.
         * @event PIXI.Renderer#resize
         * @param {number} screenWidth - The new width of the screen.
         * @param {number} screenHeight - The new height of the screen.
         */
        this.emit('resize', screenWidth, screenHeight);
    }

    /**
     * Useful function that returns a texture of the display object that can then be used to create sprites
     * This can be quite useful if your displayObject is complicated and needs to be reused multiple times.
     * @method PIXI.AbstractRenderer#generateTexture
     * @param displayObject - The displayObject the object will be generated from.
     * @param {object} options - Generate texture options.
     * @param {PIXI.SCALE_MODES} options.scaleMode - The scale mode of the texture.
     * @param {number} options.resolution - The resolution / device pixel ratio of the texture being generated.
     * @param {PIXI.Rectangle} options.region - The region of the displayObject, that shall be rendered,
     *        if no region is specified, defaults to the local bounds of the displayObject.
     * @param {PIXI.MSAA_QUALITY} options.multisample - The number of samples of the frame buffer.
     * @returns A texture of the graphics object.
     */
    generateTexture(displayObject: IRenderableObject, options?: IGenerateTextureOptions): RenderTexture;

    /**
     * Please use the options argument instead.
     * @method PIXI.AbstractRenderer#generateTexture
     * @deprecated Since 6.1.0
     * @param displayObject - The displayObject the object will be generated from.
     * @param scaleMode - The scale mode of the texture.
     * @param resolution - The resolution / device pixel ratio of the texture being generated.
     * @param region - The region of the displayObject, that shall be rendered,
     *        if no region is specified, defaults to the local bounds of the displayObject.
     * @returns A texture of the graphics object.
     */
    generateTexture(
        displayObject: IRenderableObject,
        scaleMode?: SCALE_MODES,
        resolution?: number,
        region?: Rectangle): RenderTexture;

    /**
     * @ignore
     */
    generateTexture(displayObject: IRenderableObject,
        options: IGenerateTextureOptions | SCALE_MODES = {},
        resolution?: number, region?: Rectangle): RenderTexture
    {
        // @deprecated parameters spread, use options instead
        if (typeof options === 'number')
        {
            // #if _DEBUG
            deprecation('6.1.0', 'generateTexture options (scaleMode, resolution, region) are now object options.');
            // #endif

            options = { scaleMode: options, resolution, region };
        }

        const { region: manualRegion, ...textureOptions } = options;

        region = manualRegion || (displayObject as IRenderableContainer).getLocalBounds(null, true);

        // minimum texture size is 1x1, 0x0 will throw an error
        if (region.width === 0) region.width = 1;
        if (region.height === 0) region.height = 1;

        const renderTexture = RenderTexture.create(
            {
                width: region.width,
                height: region.height,
                ...textureOptions,
            });

        tempMatrix.tx = -region.x;
        tempMatrix.ty = -region.y;

        this.render(displayObject, {
            renderTexture,
            clear: false,
            transform: tempMatrix,
            skipUpdateTransform: !!displayObject.parent
        });

        return renderTexture;
    }

    /**
     * Adds a new system to the renderer.
     * @param ClassRef - Class reference
     * @param name - Property name for system
     * @returns Return instance of renderer
     */
    abstract addSystem(ClassRef: ISystemConstructor, name: string): this;

    abstract render(displayObject: IRenderableObject, options?: IRendererRenderOptions): void;

    /**
     * Removes everything from the renderer and optionally removes the Canvas DOM element.
     * @param [removeView=false] - Removes the Canvas element from the DOM.
     */
    destroy(removeView?: boolean): void
    {
        for (const o in this.plugins)
        {
            this.plugins[o].destroy();
            this.plugins[o] = null;
        }

        if (removeView && this.view.parentNode)
        {
            this.view.parentNode.removeChild(this.view);
        }

        const thisAny = this as any;

        // null-ing all objects, that's a tradition!

        thisAny.plugins = null;
        thisAny.type = RENDERER_TYPE.UNKNOWN;
        thisAny.view = null;
        thisAny.screen = null;
        thisAny._tempDisplayObjectParent = null;
        thisAny.options = null;
        this._backgroundColorRgba = null;
        this._backgroundColorString = null;
        this._lastObjectRendered = null;
    }

    /**
     * The background color to fill if not transparent
     * @member {number}
     */
    get backgroundColor(): number
    {
        return this._backgroundColor;
    }

    set backgroundColor(value: number)
    {
        this._backgroundColor = value;
        this._backgroundColorString = hex2string(value);
        hex2rgb(value, this._backgroundColorRgba);
    }

    /**
     * The background color alpha. Setting this to 0 will make the canvas transparent.
     * @member {number}
     */
    get backgroundAlpha(): number
    {
        return this._backgroundColorRgba[3];
    }
    set backgroundAlpha(value: number)
    {
        this._backgroundColorRgba[3] = value;
    }
}