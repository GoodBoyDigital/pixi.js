import { Color } from '../../../../color/Color';
import { DOMAdapter } from '../../../../environment/adapter';
import { Matrix } from '../../../../maths/matrix/Matrix';
import { ImageSource } from '../../../../rendering/renderers/shared/texture/sources/ImageSource';
import { Texture } from '../../../../rendering/renderers/shared/texture/Texture';
import { uid } from '../../../../utils/data/uid';
import { deprecation } from '../../../../utils/logging/deprecation';

import type { ColorSource } from '../../../../color/Color';
import type { CanvasAndContext } from '../../../../rendering/renderers/shared/texture/CanvasPool';
import type { TextureSpace } from '../FillTypes';

export type GradientType = 'linear' | 'radial';

/**
 * Represents the style options for a linear gradient fill.
 * @memberof scene
 */
export interface BaseGradientOptions
{
    /** The type of gradient */
    type?: GradientType;
    /** Array of colors stops to use in the gradient */
    colorStops?: { offset: number, color: ColorSource }[];
    /** Whether coordinates are 'global' or 'local' */
    textureSpace?: TextureSpace;
}

/**
 * Options specific to linear gradients.
 * A linear gradient creates a smooth transition between colors along a straight line defined by start and end points.
 * @extends BaseGradientOptions
 */
export interface LinearGradientOptions extends BaseGradientOptions
{
    /** The type of gradient. Must be 'linear' for linear gradients. */
    type?: 'linear';
    /** The x coordinate of the starting point where the gradient begins. In local coordinates by default. */
    x0?: number;
    /** The y coordinate of the starting point where the gradient begins. In local coordinates by default. */
    y0?: number;
    /** The x coordinate of the end point where the gradient ends. In local coordinates by default. */
    x1?: number;
    /** The y coordinate of the end point where the gradient ends. In local coordinates by default. */
    y1?: number;
}

/**
 * Options specific to radial gradients.
 * A radial gradient creates a smooth transition between colors that radiates outward in a circular pattern.
 * The gradient is defined by inner and outer circles, each with their own radius.
 * @extends BaseGradientOptions
 */
export interface RadialGradientOptions extends BaseGradientOptions
{
    /** The type of gradient. Must be 'radial' for radial gradients. */
    type?: 'radial';
    /**
     * The x coordinate of the center point of the inner circle
     * where the gradient begins. In local coordinates by default.
     */
    x0?: number;
    /**
     * The y coordinate of the center point of the inner circle
     * where the gradient begins. In local coordinates by default.
     */
    y0?: number;
    /** The radius of the inner circle where the gradient begins. */
    r0?: number;
    /** The x coordinate of the center point of the outer circle where the gradient ends. In local coordinates by default. */
    x1?: number;
    /** The y coordinate of the center point of the outer circle where the gradient ends. In local coordinates by default. */
    y1?: number;
    /** The radius of the outer circle where the gradient ends. */
    r1?: number;
}

export type GradientOptions = LinearGradientOptions | RadialGradientOptions;

/**
 * Class representing a gradient fill that can be used to fill shapes and text.
 * Supports both linear and radial gradients with multiple color stops.
 *
 * For linear gradients, color stops define colors and positions (0 to 1) along a line from start point (x0,y0)
 * to end point (x1,y1).
 *
 * For radial gradients, color stops define colors between two circles - an inner circle centered at (x0,y0) with radius r0,
 * and an outer circle centered at (x1,y1) with radius r1.
 * @example
 * ```ts
 * // Create a vertical linear gradient from red to blue
 * const linearGradient = new FillGradient({
 *     type: 'linear',
 *     x0: 0, y0: 0,      // Start at top
 *     x1: 0, y1: 1,      // End at bottom
 *     colorStops: [
 *         { offset: 0, color: 'red' },   // Red at start
 *         { offset: 1, color: 'blue' }   // Blue at end
 *     ],
 *     textureSpace: 'local'
 * });
 *
 * // Create a radial gradient from yellow center to green edge
 * const radialGradient = new FillGradient({
 *     type: 'radial',
 *     x0: 0.5, y0: 0.5,  // Inner circle center
 *     r0: 0,             // Inner circle radius (point)
 *     x1: 0.5, y1: 0.5,  // Outer circle center
 *     r1: 0.5,           // Outer circle radius
 *     colorStops: [
 *         { offset: 0, color: 'yellow' }, // Center color
 *         { offset: 1, color: 'green' }   // Edge color
 *     ],
 *     textureSpace: 'local'
 * });
 *
 * // Create a rainbow linear gradient in global coordinates
 * const globalGradient = new FillGradient({
 *     type: 'linear',
 *     x0: 0, y0: 0,
 *     x1: 100, y1: 0,
 *     colorStops: [
 *         { offset: 0, color: 0xff0000 },    // Red
 *         { offset: 0.33, color: 0x00ff00 }, // Green
 *         { offset: 0.66, color: 0x0000ff }, // Blue
 *         { offset: 1, color: 0xff00ff }     // Purple
 *     ],
 *     textureSpace: 'global'  // Use world coordinates
 * });
 *
 * // Create an offset radial gradient
 * const offsetRadial = new FillGradient({
 *     type: 'radial',
 *     x0: 0.3, y0: 0.3,  // Inner circle offset from center
 *     r0: 0.1,           // Small inner circle
 *     x1: 0.5, y1: 0.5,  // Outer circle centered
 *     r1: 0.5,           // Large outer circle
 *     colorStops: [
 *         { offset: 0, color: 'white' },
 *         { offset: 1, color: 'black' }
 *     ],
 *     textureSpace: 'local'
 * });
 * ```
 *
 * Internally this creates a  texture of the gradient then applies a
 * transform to it to give it the correct size and angle.
 *
 * This means that it's important to destroy a gradient when it is no longer needed
 * to avoid memory leaks.
 *
 * If you want to animate a gradient then it's best to modify and update an existing one
 * rather than creating a whole new one each time. That or use a custom shader.
 * @memberof scene
 * @implements {CanvasGradient}
 */
export class FillGradient implements CanvasGradient
{
    /** Default width of the internal gradient texture */
    public static defaultTextureWidth = 256;

    /**
     * Default options for creating a gradient fill
     * @property {number} x0 - X coordinate of start point (default: 0)
     * @property {number} y0 - Y coordinate of start point (default: 0)
     * @property {number} x1 - X coordinate of end point (default: 1)
     * @property {number} y1 - Y coordinate of end point (default: 0)
     * @property {TextureSpace} textureSpace - Whether coordinates are 'global' or 'local' (default: 'local')
     */
    public static readonly defaultLinearOptions: LinearGradientOptions = {
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 1,
        colorStops: [],
        textureSpace: 'local',
        type: 'linear',
    };

    public static readonly defaultRadialOptions: RadialGradientOptions = {
        x0: 0.5,
        y0: 0.5,
        r0: 0,
        x1: 0.5,
        y1: 0.5,
        r1: 0.5,
        colorStops: [],
        textureSpace: 'local',
        type: 'radial',
    };

    /** Unique identifier for this gradient instance */
    public readonly uid: number = uid('fillGradient');
    /** Type of gradient - currently only supports 'linear' */
    public readonly type: GradientType = 'linear';

    /** X coordinate of gradient start point */
    public x0: number;
    /** Y coordinate of gradient start point */
    public y0: number;
    /** X coordinate of gradient end point */
    public x1: number;
    /** Y coordinate of gradient end point */
    public y1: number;
    /** Radius of gradient start point */
    public r0: number;
    /** Radius of gradient end point */
    public r1: number;

    /** Internal texture used to render the gradient */
    public texture: Texture;
    /** Transform matrix for positioning the gradient */
    public transform: Matrix;
    /** Array of color stops defining the gradient */
    public colorStops: Array<{ offset: number, color: string }> = [];

    /** Internal cache of the style key */
    private _styleKey: string | null = null;
    /** Whether gradient coordinates are in local or global space */
    public textureSpace: TextureSpace = 'local';
    /**
     * Creates a new gradient fill
     * @param options - The options for the gradient
     * @param {number} [options.x0=0] - X coordinate of start point
     * @param {number} [options.y0=0] - Y coordinate of start point
     * @param {number} [options.x1=1] - X coordinate of end point
     * @param {number} [options.y1=0] - Y coordinate of end point
     * @param {string} [options.textureSpace='local'] - Whether coordinates are 'global' or 'local'
     */
    constructor(options: GradientOptions);
    /** @deprecated since 8.5.2 */
    constructor(
        x0?: number,
        y0?: number,
        x1?: number,
        y1?: number,
        textureSpace?: 'global' | 'local'
    );
    constructor(...args: [GradientOptions] | [number?, number?, number?, number?, TextureSpace?])
    {
        let options = ensureGradientOptions(args);

        const defaults = options.type === 'radial' ? FillGradient.defaultRadialOptions : FillGradient.defaultLinearOptions;

        options = { ...defaults, ...options };

        this.x0 = options.x0;
        this.y0 = options.y0;

        this.x1 = options.x1;
        this.y1 = options.y1;

        if (options.type === 'radial')
        {
            this.r0 = options.r0;
            this.r1 = options.r1;
        }

        this.textureSpace = options.textureSpace;

        this.type = options.type;
        options.colorStops.forEach((stop) =>
        {
            this.addColorStop(stop.offset, stop.color);
        });
    }

    /**
     * Adds a color stop to the gradient
     * @param offset - Position of the stop (0-1)
     * @param color - Color of the stop
     * @returns This gradient instance for chaining
     */
    public addColorStop(offset: number, color: ColorSource): this
    {
        this.colorStops.push({ offset, color: Color.shared.setValue(color).toHexa() });
        this._styleKey = null;

        return this;
    }

    /**
     * Builds the internal texture and transform for the gradient.
     * Called automatically when the gradient is first used.
     * @internal
     */
    public buildLinearGradient(): void
    {
        if (this.texture) return;

        const defaultSize = FillGradient.defaultTextureWidth;

        const { canvas, context } = getCanvas(defaultSize, 1);

        const gradient = context.createLinearGradient(0, 0, FillGradient.defaultTextureWidth, 0);

        addColorStops(gradient, this.colorStops);

        context.fillStyle = gradient;
        context.fillRect(0, 0, defaultSize, 1);

        this.texture = new Texture({
            source: new ImageSource({
                resource: canvas,
            }),
        });

        // generate some UVS based on the gradient direction sent

        const { x0, y0, x1, y1 } = this;

        const m = new Matrix();

        // get angle
        const dx = x1 - x0;
        const dy = y1 - y0;

        const dist = Math.sqrt((dx * dx) + (dy * dy));
        const angle = Math.atan2(dy, dx);

        // this matrix is inverted when used in the graphics
        m.scale(dist / defaultSize, 1);
        m.rotate(angle);
        m.translate(x0, y0);

        if (this.textureSpace === 'local')
        {
            m.scale(defaultSize, defaultSize);
        }

        this.transform = m;
        this._styleKey = null;
    }

    public buildGradient(): void
    {
        if (this.type === 'linear')
        {
            this.buildLinearGradient();
        }
        else
        {
            this.buildRadialGradient();
        }
    }
    public buildRadialGradient(): void
    {
        if (this.texture) return;

        const defaultSize = FillGradient.defaultTextureWidth;

        const { colorStops: gradientStops } = this;

        const { canvas, context } = getCanvas(defaultSize, defaultSize);

        const { x0, y0, r0, x1, y1, r1 } = this;

        const ox = x1 - r1;
        const oy = y1 - r1;

        const scale = defaultSize / (r1 * 2);

        const gradient = context.createRadialGradient(
            (x0 - ox) * scale,
            (y0 - oy) * scale,
            r0 * scale,
            (x1 - ox) * scale,
            (y1 - oy) * scale,
            r1 * scale
        );

        addColorStops(gradient, gradientStops);

        context.fillStyle = gradient;
        context.fillRect(0, 0, defaultSize, defaultSize);

        this.texture = new Texture({
            source: new ImageSource({
                resource: canvas,
                addressModeU: 'clamp-to-edge',
                addressModeV: 'clamp-to-edge',
            }),
        });

        const m = new Matrix();

        // this matrix is inverted when used in the graphics
        m.scale(1 / scale, 1 / scale);
        m.translate(ox, oy);

        if (this.textureSpace === 'local')
        {
            m.scale(defaultSize, defaultSize);
        }

        this.transform = m;
        this._styleKey = null;
    }

    /**
     * Gets a unique key representing the current state of the gradient.
     * Used internally for caching.
     * @returns Unique string key
     */
    public get styleKey(): string
    {
        if (this._styleKey)
        {
            return this._styleKey;
        }

        const stops = this.colorStops.map((stop) => `${stop.offset}-${stop.color}`).join('-');
        const texture = this.texture.uid;
        const transform = this.transform.toArray().join('-');

        // eslint-disable-next-line max-len
        return `fill-gradient-${this.uid}-${this.type}-${stops}-${texture}-${transform}-${this.x0}-${this.y0}-${this.x1}-${this.y1}`;
    }

    public destroy(): void
    {
        this.texture?.destroy(true);
        this.texture = null;
    }
}

function addColorStops(gradient: CanvasGradient, colorStops: { offset: number, color: string }[]): void
{
    for (let i = 0; i < colorStops.length; i++)
    {
        const stop = colorStops[i];

        gradient.addColorStop(stop.offset, stop.color);
    }
}

function getCanvas(width: number, height: number): CanvasAndContext
{
    const canvas = DOMAdapter.get().createCanvas();

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    return { canvas, context };
}

/**
 * Helper function to ensure consistent handling of gradient options.
 * This function handles both the new options object format and the deprecated parameter format.
 * @example
 * // New recommended way:
 * const options = ensureGradientOptions([{
 *     x0: 0,
 *     y0: 0,
 *     x1: 100,
 *     y1: 100,
 *     textureSpace: 'local'
 * }]);
 *
 * // Deprecated way (will show warning in debug):
 * const options = ensureGradientOptions([0, 0, 100, 100, 'local']);
 * @param args - Arguments passed to gradient constructor
 * @returns Normalized gradient options object
 * @internal
 */
function ensureGradientOptions(
    args: any[],
): GradientOptions
{
    let options = (args[0] ?? {}) as GradientOptions;

    // @deprecated
    if (typeof options === 'number' || args[1])
    {
        // #if _DEBUG
        deprecation('8.5.2', `use options object instead`);
        // #endif

        options = {
            x0: args[0],
            y0: args[1],
            x1: args[2],
            y1: args[3],
            textureSpace: args[4] as 'global' | 'local',
        };
    }

    return options;
}
