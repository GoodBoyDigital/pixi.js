import EventEmitter from 'eventemitter3';
import { deprecation, v8_0_0 } from '../../utils/logging/deprecation';

import type { Texture } from '../../rendering/renderers/shared/texture/Texture';
import type { FontMetrics } from '../text/canvas/CanvasTextMetrics';

/** @memberof text */
export interface CharData
{
    /** Unique id of character */
    id: number;
    /** x-offset to apply when rendering character */
    xOffset: number;
    /** y-offset to apply when rendering character. */
    yOffset: number;
    /** Advancement to apply to next character. */
    xAdvance: number;
    /** The kerning values for this character. */
    kerning: Record<string, number>;
    /** The texture of the character. */
    texture?: Texture;
}

/**
 * The raw data of a character in a bitmap font.
 * @memberof text
 */
export interface RawCharData extends Omit<CharData, 'texture'>
{
    /** The page of the font texture that the character is on. */
    page: number;
    /** The x position of the character in the page. */
    x: number;
    /** The y position of the character in the page. */
    y: number;
    /** The width of the character in the page. */
    width: number;
    /** The height of the character in the page. */
    height: number;
    /** The letter of the character. */
    letter: string;
}

/**
 * The raw data of a bitmap font.
 * @memberof text
 */
export interface BitmapFontData
{
    /** The offset of the font face from the baseline. */
    baseLineOffset: number;
    /** The map of characters by character code. */
    chars: Record<string, RawCharData>;
    /** The map of base page textures (i.e., sheets of glyphs). */
    pages: {
        /** Unique id for bitmap texture */
        id: number;
        /** File name */
        file: string
    }[];
    /** The line-height of the font face in pixels. */
    lineHeight: number;
    /** The size of the font face in pixels. */
    fontSize: number;
    /** The name of the font face. */
    fontFamily: string;
    /** The range and type of the distance field for this font. */
    distanceField?: {
        /** Type of distance field */
        type: 'sdf' | 'msdf' | 'none';
        /** Range of the distance field in pixels */
        range: number;
    } | undefined;
}

interface BitmapFontEvents<Type>
{
    destroy: [Type];
}

/**
 * An abstract representation of a bitmap font.
 * @memberof text
 */
export abstract class AbstractBitmapFont<FontType>
    extends EventEmitter<BitmapFontEvents<FontType>>
    implements Omit<BitmapFontData, 'chars' | 'pages' | 'fontSize'>
{
    /** The map of characters by character code. */
    public readonly chars: Record<string, CharData> = Object.create(null);

    /**
     * The line-height of the font face in pixels.
     * @type {number}
     */
    public readonly lineHeight: BitmapFontData['lineHeight'] = 0;

    /**
     * The name of the font face
     * @type {string}
     */
    public readonly fontFamily: BitmapFontData['fontFamily'] = '';
    /** The metrics of the font face. */
    public readonly fontMetrics: FontMetrics = { fontSize: 0, ascent: 0, descent: 0 };
    /**
     * The offset of the font face from the baseline.
     * @type {number}
     */
    public readonly baseLineOffset: BitmapFontData['baseLineOffset'] = 0;
    /** The range and type of the distance field for this font. */
    public readonly distanceField: BitmapFontData['distanceField'] = { type: 'none', range: 0 };
    /** The map of base page textures (i.e., sheets of glyphs). */
    public readonly pages: { texture: Texture }[] = [];
    /** should the fill for this font be applied as a tint to the text. */
    public applyFillAsTint = true;

    /** The size of the font face in pixels. */
    public readonly baseMeasurementFontSize: number = 100;
    protected baseRenderedFontSize = 100;

    /**
     * The name of the font face.
     * @deprecated since 8.0.0 Use `fontFamily` instead.
     */
    public get font(): BitmapFontData['fontFamily']
    {
        // #if _DEBUG
        deprecation(v8_0_0, 'BitmapFont.font is deprecated, please use BitmapFont.fontFamily instead.');
        // #endif

        return this.fontFamily;
    }

    /**
     * The map of base page textures (i.e., sheets of glyphs).
     * @deprecated since 8.0.0 Use `pages` instead.
     */
    public get pageTextures(): AbstractBitmapFont<FontType>['pages']
    {
        // #if _DEBUG
        deprecation(v8_0_0, 'BitmapFont.pageTextures is deprecated, please use BitmapFont.pages instead.');
        // #endif

        return this.pages;
    }

    /**
     * The size of the font face in pixels.
     * @deprecated since 8.0.0 Use `fontMetrics.fontSize` instead.
     */
    public get size(): BitmapFontData['fontSize']
    {
        // #if _DEBUG
        deprecation(v8_0_0, 'BitmapFont.size is deprecated, please use BitmapFont.fontMetrics.fontSize instead.');
        // #endif

        return this.fontMetrics.fontSize;
    }

    /**
     * The kind of distance field for this font or "none".
     * @deprecated since 8.0.0 Use `distanceField.type` instead.
     */
    public get distanceFieldRange(): NonNullable<BitmapFontData['distanceField']>['range']
    {
        // #if _DEBUG
        // eslint-disable-next-line max-len
        deprecation(v8_0_0, 'BitmapFont.distanceFieldRange is deprecated, please use BitmapFont.distanceField.range instead.');
        // #endif

        return this.distanceField.range;
    }

    /**
     * The range of the distance field in pixels.
     * @deprecated since 8.0.0 Use `distanceField.range` instead.
     */
    public get distanceFieldType(): NonNullable<BitmapFontData['distanceField']>['type']
    {
        // #if _DEBUG
        deprecation(v8_0_0, 'BitmapFont.distanceFieldType is deprecated, please use BitmapFont.distanceField.type instead.');
        // #endif

        return this.distanceField.type;
    }

    public destroy(destroyTextures = false): void
    {
        this.emit('destroy', this as unknown as FontType);

        this.removeAllListeners();

        for (const i in this.chars)
        {
            // texture may not exist if the char is " ", \n, \r, or \t.
            this.chars[i].texture?.destroy();
        }

        (this.chars as null) = null;

        if (destroyTextures)
        {
            this.pages.forEach((page) => page.texture.destroy(true));
            (this.pages as any) = null;
        }
    }
}
