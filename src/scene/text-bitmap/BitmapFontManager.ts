import { Cache } from '../../assets/cache/Cache';
import { deprecation, v8_0_0 } from '../../utils/logging/deprecation';
import { warn } from '../../utils/logging/warn';
import { TextStyle } from '../text/TextStyle';
import { DynamicBitmapFont } from './DynamicBitmapFont';
import { getBitmapTextLayout } from './utils/getBitmapTextLayout';
import { resolveCharacters } from './utils/resolveCharacters';

import type { TextStyleOptions } from '../text/TextStyle';
import type { BitmapFont } from './BitmapFont';
import type { BitmapTextLayoutData } from './utils/getBitmapTextLayout';

let fontCount = 0;

/**
 *
 * The options for installing a new BitmapFont. Once installed the font will be available for use in the BitmapText.
 * It can be accessed by the `fontFamily` property of the TextStyle.
 *
 * Install a new BitmapFont will create the characters provided for the font and store them in the cache.
 * But don't worry, if a character is requested that hasn't been generated yet, it will be created on the fly.
 * @memberof text
 */
export interface BitmapFontInstallOptions
{
    /** the name of the font, this will be the name you use in the fontFamily of text style to access this font */
    name?: string;
    /**
     * Characters included in the font set. You can also use ranges.
     * For example, `[['a', 'z'], ['A', 'Z'], "!@#$%^&*()~{}[] "]`.
     * Don't forget to include spaces ' ' in your character set!
     * @default BitmapFont.ALPHANUMERIC
     */
    chars?: string | (string | string[])[];
    /**
     * Render resolution for glyphs.
     * @default 1
     */
    resolution?: number;
    /**
     * Padding between glyphs on texture atlas. Lower values could mean more visual artifacts
     * and bleeding from other glyphs, larger values increase the space required on the texture.
     * @default 4
     */
    padding?: number;
    /**
     * Skip generation of kerning information for the BitmapFont.
     * If true, this could potentially increase the performance, but may impact the rendered text appearance.
     * @default false
     */
    skipKerning?: boolean;
    /** Style options to render with BitmapFont. */
    style?: TextStyle | TextStyleOptions;
}

/**
 * The BitmapFontManager is a helper that exists to install and uninstall fonts
 * into the cache for BitmapText objects.
 * @memberof text
 * @name BitmapFontManager
 * @example
 * import { BitmapFontManager, BitmapText } from 'pixi.js';
 *
 * BitmapFontManager.install({
 *   name: 'TitleFont',
 *   style: {}
 * });
 *
 * const title = new BitmapText({ text: 'This is the title', style: { fontFamily: 'TitleFont' }});
 */
class BitmapFontManagerClass
{
    /**
     * This character set includes all the letters in the alphabet (both lower- and upper- case).
     * @type {string[][]}
     * @example
     * BitmapFont.from('ExampleFont', style, { chars: BitmapFont.ALPHA })
     */
    public readonly ALPHA = [['a', 'z'], ['A', 'Z'], ' '];

    /**
     * This character set includes all decimal digits (from 0 to 9).
     * @type {string[][]}
     * @example
     * BitmapFont.from('ExampleFont', style, { chars: BitmapFont.NUMERIC })
     */
    public readonly NUMERIC = [['0', '9']];

    /**
     * This character set is the union of `BitmapFont.ALPHA` and `BitmapFont.NUMERIC`.
     * @type {string[][]}
     */
    public readonly ALPHANUMERIC = [['a', 'z'], ['A', 'Z'], ['0', '9'], ' '];

    /**
     * This character set consists of all the ASCII table.
     * @member {string[][]}
     * @see http://www.asciitable.com/
     */
    public readonly ASCII = [[' ', '~']];

    /** Default options for installing a new BitmapFont. */
    public defaultOptions: Omit<BitmapFontInstallOptions, 'style'> = {
        chars: this.ALPHANUMERIC,
        resolution: 1,
        padding: 4,
        skipKerning: false,
    };

    /**
     * Get a font for the specified text and style.
     * @param text - The text to get the font for
     * @param style - The style to use
     */
    public getFont(text: string, style: TextStyle): BitmapFont
    {
        let fontFamilyKey = `${style.fontFamily as string}-bitmap`;
        let overrideFill = true;

        // assuming there is no texture we can use a tint!
        if (style._fill.fill && !style._stroke)
        {
            fontFamilyKey += style._fill.fill.styleKey;
            overrideFill = false;
        }
        else if (style._stroke || style.dropShadow)
        {
            // if there is a stoke, we need to use the style key as this the font generated cannot be tinted
            // due to the fact the font has at least two colors.
            let key = style.styleKey;

            // remove the font size..
            key = key.substring(0, key.lastIndexOf('-'));

            fontFamilyKey = `${key}-bitmap`;
            overrideFill = false;
        }

        // first get us the the right font...
        if (!Cache.has(fontFamilyKey))
        {
            const fnt = new DynamicBitmapFont({
                style,
                overrideFill,
                overrideSize: true,
                ...this.defaultOptions,
            });

            fontCount++;

            // warn users if they have created too many dynamic fonts
            if (fontCount > 50)
            {
                // eslint-disable-next-line max-len
                warn('BitmapText', `You have dynamically created ${fontCount} bitmap fonts, this can be inefficient. Try pre installing your font styles using \`BitmapFont.install({name:"style1", style})\``);
            }

            fnt.once('destroy', () =>
            {
                fontCount--;
                Cache.remove(fontFamilyKey);
            });

            Cache.set(
                fontFamilyKey as string,
                fnt
            );
        }

        const dynamicFont = Cache.get(fontFamilyKey);

        (dynamicFont as DynamicBitmapFont).ensureCharacters?.(text);

        return dynamicFont;
    }

    /**
     * Get the layout of a text for the specified style.
     * @param text - The text to get the layout for
     * @param style - The style to use
     * @param trimEnd - Whether to ignore whitespaces at the end of each line
     */
    public getLayout(text: string, style: TextStyle, trimEnd: boolean = true): BitmapTextLayoutData
    {
        const bitmapFont = this.getFont(text, style);

        return getBitmapTextLayout(text, style, bitmapFont, trimEnd);
    }

    /**
     * Measure the text using the specified style.
     * @param text - The text to measure
     * @param style - The style to use
     * @param trimEnd - Whether to ignore whitespaces at the end of each line
     */
    public measureText(
        text: string,
        style: TextStyle,
        trimEnd: boolean = true
    ): { width: number; height: number; scale: number; offsetY: number }
    {
        return this.getLayout(text, style, trimEnd);
    }

    /**
     * Generates a bitmap-font for the given style and character set
     * @param options - Setup options for font generation.
     * @returns Font generated by style options.
     * @example
     * import { BitmapFontManager, BitmapText } from 'pixi.js';
     *
     * BitmapFontManager.install('TitleFont', {
     *     fontFamily: 'Arial',
     *     fontSize: 12,
     *     strokeThickness: 2,
     *     fill: 'purple',
     * });
     *
     * const title = new BitmapText({ text: 'This is the title', fontFamily: 'TitleFont' });
     */
    public install(options: BitmapFontInstallOptions): BitmapFont;
    /** @deprecated since 7.0.0 */
    public install(name: string, style?: TextStyle | TextStyleOptions, options?: BitmapFontInstallOptions): BitmapFont;
    // eslint-disable-next-line max-len
    public install(...args: [string | BitmapFontInstallOptions, (TextStyle | TextStyleOptions)?, BitmapFontInstallOptions?]): BitmapFont
    {
        let options = args[0] as BitmapFontInstallOptions;

        if (typeof options === 'string')
        {
            options = {
                name: options,
                style: args[1],
                chars: args[2]?.chars,
                resolution: args[2]?.resolution,
                padding: args[2]?.padding,
                skipKerning: args[2]?.skipKerning,
            } as BitmapFontInstallOptions;

            // #if _DEBUG
            // eslint-disable-next-line max-len
            deprecation(v8_0_0, 'BitmapFontManager.install(name, style, options) is deprecated, use BitmapFontManager.install({name, style, ...options})');
            // #endif
        }

        const name = options?.name;

        if (!name)
        {
            throw new Error('[BitmapFontManager] Property `name` is required.');
        }

        options = { ...this.defaultOptions, ...options };

        const textStyle = options.style;

        const style = textStyle instanceof TextStyle ? textStyle : new TextStyle(textStyle);
        const overrideFill = style._fill.fill !== null && style._fill.fill !== undefined;
        const font = new DynamicBitmapFont({
            style,
            overrideFill,
            skipKerning: options.skipKerning,
            padding: options.padding,
            resolution: options.resolution,
            overrideSize: false
        });

        const flatChars = resolveCharacters(options.chars);

        font.ensureCharacters(flatChars.join(''));

        Cache.set(`${name}-bitmap`, font);

        font.once('destroy', () => Cache.remove(`${name}-bitmap`));

        return font;
    }

    /**
     * Uninstalls a bitmap font from the cache.
     * @param {string} name - The name of the bitmap font to uninstall.
     */
    public uninstall(name: string)
    {
        const cacheKey = `${name}-bitmap`;
        const font = Cache.get<BitmapFont>(cacheKey);

        if (font)
        {
            font.destroy();
        }
    }
}

export const BitmapFontManager = new BitmapFontManagerClass();
