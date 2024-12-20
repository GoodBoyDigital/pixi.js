import EventEmitter from 'eventemitter3';
import { Color, type ColorSource } from '../../color/Color';
import { deprecation, v8_0_0 } from '../../utils/logging/deprecation';
import { FillGradient } from '../graphics/shared/fill/FillGradient';
import { FillPattern } from '../graphics/shared/fill/FillPattern';
import { GraphicsContext } from '../graphics/shared/GraphicsContext';
import {
    toFillStyle,
    toStrokeStyle
} from '../graphics/shared/utils/convertFillInputToFillStyle';
import { generateTextStyleKey } from './utils/generateTextStyleKey';

import type { TextureDestroyOptions, TypeOrBool } from '../container/destroyTypes';
import type {
    ConvertedFillStyle,
    ConvertedStrokeStyle,
    FillInput,
    FillStyle,
    StrokeInput,
    StrokeStyle
} from '../graphics/shared/FillTypes';

export type TextStyleAlign = 'left' | 'center' | 'right' | 'justify';
export type TextStyleFill = string | string[] | number | number[] | CanvasGradient | CanvasPattern;
export type TextStyleFontStyle = 'normal' | 'italic' | 'oblique';
export type TextStyleFontVariant = 'normal' | 'small-caps';
// eslint-disable-next-line max-len
export type TextStyleFontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
export type TextStyleLineJoin = 'miter' | 'round' | 'bevel';
export type TextStyleTextBaseline = 'alphabetic' | 'top' | 'hanging' | 'middle' | 'ideographic' | 'bottom';
export type TextStyleWhiteSpace = 'normal' | 'pre' | 'pre-line';

/**
 * A collection of text related classes.
 * @namespace text
 */

/**
 * A drop shadow effect.
 * @memberof text
 */
export type TextDropShadow = {
    /** Set alpha for the drop shadow  */
    alpha: number;
    /** Set a angle of the drop shadow */
    angle: number;
    /** Set a shadow blur radius */
    blur: number;
    /** A fill style to be used on the  e.g., 'red', '#00FF00' */
    color: ColorSource;
    /** Set a distance of the drop shadow */
    distance: number;
};

/**
 * Constructor options used for `TextStyle` instances.
 * ```js
 * const textStyle = new TextStyle({
 *    fontSize: 12,
 *    fill: 'black',
 * });
 * ```
 * @see {@link text.TextStyle}
 * @memberof text
 */
export interface TextStyleOptions
{
    /**
     * Alignment for multiline text, does not affect single line text
     * @type {'left'|'center'|'right'|'justify'}
     */
    align?: TextStyleAlign;
    /** Indicates if lines can be wrapped within words, it needs `wordWrap` to be set to `true` */
    breakWords?: boolean;
    /** Set a drop shadow for the text */
    dropShadow?: boolean | Partial<TextDropShadow>;
    /**
     * A canvas fillstyle that will be used on the text e.g., 'red', '#00FF00'.
     * Can be an array to create a gradient, e.g., `['#000000','#FFFFFF']`
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle|MDN}
     * @type {string|string[]|number|number[]|CanvasGradient|CanvasPattern}
     */
    fill?: FillInput;
    /** The font family, can be a single font name, or a list of names where the first is the preferred font. */
    fontFamily?: string | string[];
    /** The font size (as a number it converts to px, but as a string, equivalents are '26px','20pt','160%' or '1.6em') */
    fontSize?: number | string;
    /**
     * The font style.
     * @type {'normal'|'italic'|'oblique'}
     */
    fontStyle?: TextStyleFontStyle;
    /**
     * The font variant.
     * @type {'normal'|'small-caps'}
     */
    fontVariant?: TextStyleFontVariant;
    /**
     * The font weight.
     * @type {'normal'|'bold'|'bolder'|'lighter'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900'}
     */
    fontWeight?: TextStyleFontWeight;
    /** The height of the line, a number that represents the vertical space that a letter uses. */
    leading?: number;
    /** The amount of spacing between letters, default is 0 */
    letterSpacing?: number;
    /** The line height, a number that represents the vertical space that a letter uses */
    lineHeight?: number;
    /**
     * Occasionally some fonts are cropped. Adding some padding will prevent this from
     * happening by adding padding to all sides of the text.
     */
    padding?: number;
    /** A canvas fillstyle that will be used on the text stroke, e.g., 'blue', '#FCFF00' */
    stroke?: StrokeInput;
    /**
     * The baseline of the text that is rendered.
     * @type {'alphabetic'|'top'|'hanging'|'middle'|'ideographic'|'bottom'}
     */
    textBaseline?: TextStyleTextBaseline;
    trim?: boolean,
    /**
     * Determines whether newlines & spaces are collapsed or preserved "normal"
     * (collapse, collapse), "pre" (preserve, preserve) | "pre-line" (preserve,
     * collapse). It needs wordWrap to be set to true.
     * @type {'normal'|'pre'|'pre-line'}
     */
    whiteSpace?: TextStyleWhiteSpace;
    /** Indicates if word wrap should be used */
    wordWrap?: boolean;
    /** The width at which text will wrap, it needs wordWrap to be set to true */
    wordWrapWidth?: number;
}

/**
 * A TextStyle Object contains information to decorate a Text objects.
 *
 * An instance can be shared between multiple Text objects; then changing the style will update all text objects using it.
 * @memberof text
 * @example
 * import { TextStyle } from 'pixi.js';
 * const style = new TextStyle({
 *   fontFamily: ['Helvetica', 'Arial', 'sans-serif'],
 *   fontSize: 36,
 * });
 */
export class TextStyle extends EventEmitter<{
    update: TextDropShadow
}>
{
    /** The default drop shadow settings */
    public static defaultDropShadow: TextDropShadow = {
        /** Set alpha for the drop shadow */
        alpha: 1,
        /** Set a angle of the drop shadow */
        angle: Math.PI / 6,
        /** Set a shadow blur radius */
        blur: 0,
        /** A fill style to be used on the  e.g., 'red', '#00FF00' */
        color: 'black',
        /** Set a distance of the drop shadow */
        distance: 5,
    };

    /** The default text style settings */
    public static defaultTextStyle: TextStyleOptions = {
        /**
         * See {@link TextStyle.align}
         * @type {'left'|'center'|'right'|'justify'}
         */
        align: 'left',
        /** See {@link TextStyle.breakWords} */
        breakWords: false,
        /** See {@link TextStyle.dropShadow} */
        dropShadow:  null,
        /**
         * See {@link TextStyle.fill}
         * @type {string|string[]|number|number[]|CanvasGradient|CanvasPattern}
         */
        fill: 'black',
        /**
         * See {@link TextStyle.fontFamily}
         * @type {string|string[]}
         */
        fontFamily: 'Arial',
        /**
         * See {@link TextStyle.fontSize}
         * @type {number|string}
         */
        fontSize: 26,
        /**
         * See {@link TextStyle.fontStyle}
         * @type {'normal'|'italic'|'oblique'}
         */
        fontStyle: 'normal',
        /**
         * See {@link TextStyle.fontVariant}
         * @type {'normal'|'small-caps'}
         */
        fontVariant: 'normal',
        /**
         * See {@link TextStyle.fontWeight}
         * @type {'normal'|'bold'|'bolder'|'lighter'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900'}
         */
        fontWeight: 'normal',
        /** See {@link TextStyle.leading} */
        leading: 0,
        /** See {@link TextStyle.letterSpacing} */
        letterSpacing: 0,
        /** See {@link TextStyle.lineHeight} */
        lineHeight: 0,
        /** See {@link TextStyle.padding} */
        padding: 0,
        /**
         * See {@link TextStyle.stroke}
         * @type {string|number}
         */
        stroke: null,
        /**
         * See {@link TextStyle.textBaseline}
         * @type {'alphabetic'|'top'|'hanging'|'middle'|'ideographic'|'bottom'}
         */
        textBaseline: 'alphabetic',
        /** See {@link TextStyle.trim} */
        trim: false,
        /**
         * See {@link TextStyle.whiteSpace}
         * @type {'normal'|'pre'|'pre-line'}
         */
        whiteSpace: 'pre',
        /** See {@link TextStyle.wordWrap} */
        wordWrap: false,
        /** See {@link TextStyle.wordWrapWidth} */
        wordWrapWidth: 100,
    };

    // colors!!
    public _fill: ConvertedFillStyle;
    private _originalFill: FillInput;

    public _stroke: ConvertedStrokeStyle;
    private _originalStroke: StrokeInput;

    private _dropShadow: TextDropShadow;

    private _fontFamily: string | string[];
    private _fontSize: number;
    private _fontStyle: TextStyleFontStyle;
    private _fontVariant: TextStyleFontVariant;
    private _fontWeight: TextStyleFontWeight;

    private _breakWords: boolean;
    private _align: TextStyleAlign;
    private _leading: number;
    private _letterSpacing: number;
    private _lineHeight: number;

    private _textBaseline: TextStyleTextBaseline;
    private _whiteSpace: TextStyleWhiteSpace;
    private _wordWrap: boolean;
    private _wordWrapWidth: number;

    private _padding: number;

    protected _styleKey: string;
    private _trim: boolean;

    constructor(style: Partial<TextStyleOptions> = {})
    {
        super();

        convertV7Tov8Style(style);

        const fullStyle = { ...TextStyle.defaultTextStyle, ...style };

        for (const key in fullStyle)
        {
            const thisKey = key as keyof typeof this;

            this[thisKey] = fullStyle[key as keyof TextStyleOptions] as any;
        }

        this.update();
    }

    /**
     * Alignment for multiline text, does not affect single line text.
     * @member {'left'|'center'|'right'|'justify'}
     */
    get align(): TextStyleAlign { return this._align; }
    set align(value: TextStyleAlign) { this._align = value; this.update(); }
    /** Indicates if lines can be wrapped within words, it needs wordWrap to be set to true. */
    get breakWords(): boolean { return this._breakWords; }
    set breakWords(value: boolean) { this._breakWords = value; this.update(); }
    /** Set a drop shadow for the text. */
    get dropShadow(): TextDropShadow { return this._dropShadow; }
    set dropShadow(value: boolean | TextDropShadow)
    {
        if (value !== null && typeof value === 'object')
        {
            this._dropShadow = this._createProxy({ ...TextStyle.defaultDropShadow, ...value });
        }
        else
        {
            this._dropShadow = value ? this._createProxy({ ...TextStyle.defaultDropShadow }) : null;
        }

        this.update();
    }
    /** The font family, can be a single font name, or a list of names where the first is the preferred font. */
    get fontFamily(): string | string[] { return this._fontFamily; }
    set fontFamily(value: string | string[]) { this._fontFamily = value; this.update(); }
    /** The font size (as a number it converts to px, but as a string, equivalents are '26px','20pt','160%' or '1.6em') */
    get fontSize(): number { return this._fontSize; }
    set fontSize(value: string | number)
    {
        if (typeof value === 'string')
        {
            // eg '34px' to number
            this._fontSize = parseInt(value as string, 10);
        }
        else
        {
            this._fontSize = value as number;
        }
        this.update();
    }
    /**
     * The font style.
     * @member {'normal'|'italic'|'oblique'}
     */
    get fontStyle(): TextStyleFontStyle { return this._fontStyle; }
    set fontStyle(value: TextStyleFontStyle)
    {
        this._fontStyle = value.toLowerCase() as TextStyleFontStyle;
        this.update();
    }
    /**
     * The font variant.
     * @member {'normal'|'small-caps'}
     */
    get fontVariant(): TextStyleFontVariant { return this._fontVariant; }
    set fontVariant(value: TextStyleFontVariant) { this._fontVariant = value; this.update(); }
    /**
     * The font weight.
     * @member {'normal'|'bold'|'bolder'|'lighter'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900'}
     */
    get fontWeight(): TextStyleFontWeight { return this._fontWeight; }
    set fontWeight(value: TextStyleFontWeight) { this._fontWeight = value; this.update(); }
    /** The space between lines. */
    get leading(): number { return this._leading; }
    set leading(value: number) { this._leading = value; this.update(); }
    /** The amount of spacing between letters, default is 0. */
    get letterSpacing(): number { return this._letterSpacing; }
    set letterSpacing(value: number) { this._letterSpacing = value; this.update(); }
    /** The line height, a number that represents the vertical space that a letter uses. */
    get lineHeight(): number { return this._lineHeight; }
    set lineHeight(value: number) { this._lineHeight = value; this.update(); }
    /**
     * Occasionally some fonts are cropped. Adding some padding will prevent this from happening
     * by adding padding to all sides of the text.
     */
    get padding(): number { return this._padding; }
    set padding(value: number) { this._padding = value; this.update(); }

    /** Trim transparent borders. This is an expensive operation so only use this if you have to! */
    get trim(): boolean { return this._trim; }
    set trim(value: boolean) { this._trim = value; this.update(); }
    /**
     * The baseline of the text that is rendered.
     * @member {'alphabetic'|'top'|'hanging'|'middle'|'ideographic'|'bottom'}
     */
    get textBaseline(): TextStyleTextBaseline { return this._textBaseline; }
    set textBaseline(value: TextStyleTextBaseline) { this._textBaseline = value; this.update(); }
    /**
     * How newlines and spaces should be handled.
     * Default is 'pre' (preserve, preserve).
     *
     *  value       | New lines     |   Spaces
     *  ---         | ---           |   ---
     * 'normal'     | Collapse      |   Collapse
     * 'pre'        | Preserve      |   Preserve
     * 'pre-line'   | Preserve      |   Collapse
     * @member {'normal'|'pre'|'pre-line'}
     */
    get whiteSpace(): TextStyleWhiteSpace { return this._whiteSpace; }
    set whiteSpace(value: TextStyleWhiteSpace) { this._whiteSpace = value; this.update(); }
    /** Indicates if word wrap should be used. */
    get wordWrap(): boolean { return this._wordWrap; }
    set wordWrap(value: boolean) { this._wordWrap = value; this.update(); }
    /** The width at which text will wrap, it needs wordWrap to be set to true. */
    get wordWrapWidth(): number { return this._wordWrapWidth; }
    set wordWrapWidth(value: number) { this._wordWrapWidth = value; this.update(); }

    /**
     * The fill style that will be used to color the text.
     * This can be:
     * - A color string like 'red', '#00FF00', or 'rgba(255,0,0,0.5)'
     * - A hex number like 0xff0000 for red
     * - A FillStyle object with properties like { color: 0xff0000, alpha: 0.5 }
     * - A FillGradient for gradient fills
     * - A FillPattern for pattern/texture fills
     *
     * When using a FillGradient, vertical gradients (angle of 90 degrees) are applied per line of text,
     * while gradients at any other angle are spread across the entire text body as a whole.
     * @example
     * // Vertical gradient applied per line
     * const verticalGradient = new FillGradient(0, 0, 0, 1)
     *     .addColorStop(0, 0xff0000)
     *     .addColorStop(1, 0x0000ff);
     *
     * const text = new Text({
     *     text: 'Line 1\nLine 2',
     *     style: { fill: verticalGradient }
     * });
     *
     * To manage the gradient in a global scope, set the textureSpace property of the FillGradient to 'global'.
     * @type {string|number|FillStyle|FillGradient|FillPattern}
     */
    get fill(): FillInput
    {
        return this._originalFill;
    }

    set fill(value: FillInput)
    {
        if (value === this._originalFill) return;

        this._originalFill = value;

        if (this._isFillStyle(value))
        {
            this._originalFill = this._createProxy({ ...GraphicsContext.defaultFillStyle, ...value }, () =>
            {
                this._fill = toFillStyle(
                    { ...this._originalFill as FillStyle },
                    GraphicsContext.defaultFillStyle
                );
            });
        }

        this._fill = toFillStyle(
            value === 0x0 ? 'black' : value,
            GraphicsContext.defaultFillStyle
        );
        this.update();
    }

    /** A fillstyle that will be used on the text stroke, e.g., 'blue', '#FCFF00'. */
    get stroke(): StrokeInput
    {
        return this._originalStroke;
    }

    set stroke(value: StrokeInput)
    {
        if (value === this._originalStroke) return;

        this._originalStroke = value;

        if (this._isFillStyle(value))
        {
            this._originalStroke = this._createProxy({ ...GraphicsContext.defaultStrokeStyle, ...value }, () =>
            {
                this._stroke = toStrokeStyle(
                    { ...this._originalStroke as StrokeStyle },
                    GraphicsContext.defaultStrokeStyle
                );
            });
        }

        this._stroke = toStrokeStyle(value, GraphicsContext.defaultStrokeStyle);
        this.update();
    }

    protected _generateKey(): string
    {
        this._styleKey = generateTextStyleKey(this);

        return this._styleKey;
    }

    public update()
    {
        this._styleKey = null;
        this.emit('update', this);
    }

    /** Resets all properties to the default values */
    public reset()
    {
        const defaultStyle = TextStyle.defaultTextStyle;

        for (const key in defaultStyle)
        {
            this[key as keyof typeof this] = defaultStyle[key as keyof TextStyleOptions] as any;
        }
    }

    get styleKey()
    {
        return this._styleKey || this._generateKey();
    }

    /**
     * Creates a new TextStyle object with the same values as this one.
     * @returns New cloned TextStyle object
     */
    public clone(): TextStyle
    {
        return new TextStyle({
            align: this.align,
            breakWords: this.breakWords,
            dropShadow: this._dropShadow ? { ...this._dropShadow } : null,
            fill: this._fill,
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontStyle: this.fontStyle,
            fontVariant: this.fontVariant,
            fontWeight: this.fontWeight,
            leading: this.leading,
            letterSpacing: this.letterSpacing,
            lineHeight: this.lineHeight,
            padding: this.padding,
            stroke: this._stroke,
            textBaseline: this.textBaseline,
            whiteSpace: this.whiteSpace,
            wordWrap: this.wordWrap,
            wordWrapWidth: this.wordWrapWidth,
        });
    }

    /**
     * Destroys this text style.
     * @param options - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @param {boolean} [options.texture=false] - Should it destroy the texture of the this style
     * @param {boolean} [options.textureSource=false] - Should it destroy the textureSource of the this style
     */
    public destroy(options: TypeOrBool<TextureDestroyOptions> = false)
    {
        this.removeAllListeners();

        const destroyTexture = typeof options === 'boolean' ? options : options?.texture;

        if (destroyTexture)
        {
            const destroyTextureSource = typeof options === 'boolean' ? options : options?.textureSource;

            if (this._fill?.texture)
            {
                this._fill.texture.destroy(destroyTextureSource);
            }

            if ((this._originalFill as FillStyle)?.texture)
            {
                (this._originalFill as FillStyle).texture.destroy(destroyTextureSource);
            }

            if (this._stroke?.texture)
            {
                this._stroke.texture.destroy(destroyTextureSource);
            }

            if ((this._originalStroke as FillStyle)?.texture)
            {
                (this._originalStroke as FillStyle).texture.destroy(destroyTextureSource);
            }
        }

        this._fill = null;
        this._stroke = null;
        this.dropShadow = null;
        this._originalStroke = null;
        this._originalFill = null;
    }

    private _createProxy<T extends object>(value: T, cb?: (property: string, newValue: any) => void): T
    {
        return new Proxy<T>(value, {
            set: (target, property, newValue) =>
            {
                target[property as keyof T] = newValue;
                cb?.(property as string, newValue);
                this.update();

                return true;
            }
        });
    }

    private _isFillStyle(value: FillInput): value is FillStyle
    {
        return ((value ?? null) !== null
            && !(Color.isColorLike(value) || value instanceof FillGradient || value instanceof FillPattern));
    }
}

function convertV7Tov8Style(style: TextStyleOptions)
{
    const oldStyle = style as TextStyleOptions & {
        dropShadowAlpha?: number;
        dropShadowAngle?: number;
        dropShadowBlur?: number;
        dropShadowColor?: number;
        dropShadowDistance?: number;
        fillGradientStops?: number[];
        strokeThickness?: number;
    };

    if (typeof oldStyle.dropShadow === 'boolean' && oldStyle.dropShadow)
    {
        const defaults = TextStyle.defaultDropShadow;

        style.dropShadow = {
            alpha: oldStyle.dropShadowAlpha ?? defaults.alpha,
            angle: oldStyle.dropShadowAngle ?? defaults.angle,
            blur: oldStyle.dropShadowBlur ?? defaults.blur,
            color: oldStyle.dropShadowColor ?? defaults.color,
            distance:   oldStyle.dropShadowDistance ?? defaults.distance,
        };
    }

    if (oldStyle.strokeThickness !== undefined)
    {
        // #if _DEBUG
        deprecation(v8_0_0, 'strokeThickness is now a part of stroke');
        // #endif

        const color = oldStyle.stroke;
        let obj: FillStyle = {};

        // handles stroke: 0x0, stroke: { r: 0, g: 0, b: 0, a: 0 } stroke: new Color(0x0)
        if (Color.isColorLike(color as ColorSource))
        {
            obj.color = color as ColorSource;
        }
        // handles stroke: new FillGradient()
        else if (color instanceof FillGradient || color instanceof FillPattern)
        {
            obj.fill = color as FillGradient | FillPattern;
        }
        // handles stroke: { color: 0x0 } or stroke: { fill: new FillGradient() }
        else if (Object.hasOwnProperty.call(color, 'color') || Object.hasOwnProperty.call(color, 'fill'))
        {
            obj = color as FillStyle;
        }
        else
        {
            throw new Error('Invalid stroke value.');
        }

        style.stroke = {
            ...obj,
            width: oldStyle.strokeThickness
        };
    }

    if (Array.isArray(oldStyle.fillGradientStops))
    {
        // #if _DEBUG
        deprecation(v8_0_0, 'gradient fill is now a fill pattern: `new FillGradient(...)`');
        // #endif

        let fontSize: number;

        // eslint-disable-next-line no-eq-null, eqeqeq
        if (style.fontSize == null)
        {
            style.fontSize = TextStyle.defaultTextStyle.fontSize;
        }
        else if (typeof style.fontSize === 'string')
        {
            // eg '34px' to number
            fontSize = parseInt(style.fontSize as string, 10);
        }
        else
        {
            fontSize = style.fontSize as number;
        }

        const gradientFill = new FillGradient(0, 0, 0, fontSize * 1.7);

        const fills: number[] = oldStyle.fillGradientStops
            .map((color: ColorSource) => Color.shared.setValue(color).toNumber());

        fills.forEach((number, index) =>
        {
            const ratio = index / (fills.length - 1);

            gradientFill.addColorStop(ratio, number);
        });

        style.fill = {
            fill: gradientFill
        };
    }
}

