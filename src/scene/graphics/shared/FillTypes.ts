import type { ColorSource } from '../../../color/Color';
import type { Matrix } from '../../../maths/matrix/Matrix';
import type { Texture } from '../../../rendering/renderers/shared/texture/Texture';
import type { LineCap, LineJoin } from './const';
import type { FillGradient } from './fill/FillGradient';
import type { FillPattern } from './fill/FillPattern';

/**
 * Determines how texture coordinates are calculated
 * Local Space:              Global Space:
 * ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
 * │ A   B   │  │ A   B   │  │ A...B   │  │ ...B... │
 * │         │  │         │  │         │  │         │
 * │ C   D   │  │ C   D   │  │ C...D   │  │ ...D... │
 * └─────────┘  └─────────┘  └─────────┘  └─────────┘
 * (Each shape   (Each shape  (Texture continues across
 * gets full     gets full    shapes as if they're
texture)      texture)     windows to same texture)
 */
export type TextureSpace =
    /**
     * 'local' - Texture coordinates are relative to the shape's bounds.
     * The texture will stretch/fit to each individual shape's boundaries.
     * Think of it like the shape having its own coordinate system.
     */
    | 'local'
    /**
     * 'global' - Texture coordinates are in world space.
     * The texture position is consistent across all shapes,
     * as if the texture was laid down first and shapes were cut out of it.
     * Think of it like wallpaper that shows through shaped holes.
     */
    | 'global';

/**
 * A fill style object.
 * @memberof scene
 */
export interface FillStyle
{
    /** The color to use for the fill. */
    color?: ColorSource;
    /** The alpha value to use for the fill. */
    alpha?: number;
    /** The texture to use for the fill. */
    texture?: Texture | null;
    /** The matrix to apply. */
    matrix?: Matrix | null;
    /** The fill pattern to use. */
    fill?: FillPattern | FillGradient | null;
    /** The fill units to use. */
    textureSpace?: TextureSpace;
}

/**
 * A stroke attribute object, used to define properties for a stroke.
 * @memberof scene
 */
export interface StrokeAttributes
{
    /** The width of the stroke. */
    width?: number;
    /** The alignment of the stroke. */
    alignment?: number;
    /** The line cap style to use. */
    cap?: LineCap;
    /** The line join style to use. */
    join?: LineJoin;
    /** The miter limit to use. */
    miterLimit?: number;
    /** If the stroke is a pixel line. NOTE: this is only available for Graphic fills */
    pixelLine?: boolean;
}

/**
 * A stroke style object.
 * @memberof scene
 */
export interface StrokeStyle extends FillStyle, StrokeAttributes {}

/**
 * These can be directly used as a fill or a stroke
 * ```ts
 * graphics.fill(0xff0000);
 * graphics.fill(new FillPattern(texture));
 * graphics.fill(new FillGradient(0, 0, 200, 0));
 * graphics.fill({
 *   color: 0xff0000,
 *   alpha: 0.5,
 *   texture?: null,
 *   matrix?: null,
 * });
 * graphics.fill({
 *   fill: new FillPattern(texture),
 * });
 * graphics.fill({
 *   fill: new FillGradient(0, 0, 200, 0),
 * });
 * ```
 * @memberof scene
 */
export type FillInput = ColorSource | FillGradient | FillPattern | FillStyle;

/**
 * These can be directly used as a stroke
 * ```ts
 * graphics.stroke(0xff0000);
 * graphics.stroke(new FillPattern(texture));
 * graphics.stroke(new FillGradient(0, 0, 200, 0));
 * graphics.stroke({
 *   color: 0xff0000,
 *   width?: 1,
 *   alignment?: 0.5,
 * });
 * graphics.stroke({
 *   fill: new FillPattern(texture),
 *   width: 1,
 *   alignment: 0.5,
 * });
 * graphics.stroke({
 *   fill: new FillGradient(0, 0, 200, 0),
 *   width: 1,
 *   alignment: 0.5,
 * });
 * ```
 * @memberof scene
 */
export type StrokeInput = ColorSource | FillGradient | FillPattern | StrokeStyle;

// used internally and is a complete fill style
export type ConvertedFillStyle = Omit<Required<FillStyle>, 'color'> & { color: number };
// used internally and is a complete stroke style
export type ConvertedStrokeStyle = ConvertedFillStyle & Required<StrokeAttributes>;

/**
 * @deprecated since v8.1.6
 * @see scene.FillInput
 */
// eslint-disable-next-line max-len
export type FillStyleInputs = ColorSource | FillGradient | FillPattern | FillStyle | ConvertedFillStyle | StrokeStyle | ConvertedStrokeStyle;
