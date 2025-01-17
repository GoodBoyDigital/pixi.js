import { DOMAdapter } from '../../../environment/adapter';
import { fontStringFromTextStyle } from './utils/fontStringFromTextStyle';

import type { ICanvas, ICanvasRenderingContext2DSettings } from '../../../environment/canvas/ICanvas';
import type { ICanvasRenderingContext2D } from '../../../environment/canvas/ICanvasRenderingContext2D';
import type { TextStyle, TextStyleWhiteSpace } from '../TextStyle';

// The type for Intl.Segmenter is only available since TypeScript 4.7.2, so let's make a polyfill for it.
interface ISegmentData
{
    segment: string;
}
interface ISegments
{
    [Symbol.iterator](): IterableIterator<ISegmentData>;
}
interface ISegmenter
{
    segment(input: string): ISegments;
}
interface IIntl
{
    Segmenter?: {
        prototype: ISegmenter;
        new(): ISegmenter;
    };
}

/**
 * A number, or a string containing a number.
 * @memberof text
 * @typedef {object} FontMetrics
 * @property {number} ascent - Font ascent
 * @property {number} descent - Font descent
 * @property {number} fontSize - Font size
 */
export interface FontMetrics
{
    ascent: number;
    descent: number;
    fontSize: number;
}

type CharacterWidthCache = Record<string, number>;

// Default settings used for all getContext calls
const contextSettings: ICanvasRenderingContext2DSettings = {
    // TextMetrics requires getImageData readback for measuring fonts.
    willReadFrequently: true,
};

/**
 * The TextMetrics object represents the measurement of a block of text with a specified style.
 * @example
 * import { CanvasTextMetrics, TextStyle } from 'pixi.js';
 *
 * const style = new TextStyle({
 *     fontFamily: 'Arial',
 *     fontSize: 24,
 *     fill: 0xff1010,
 *     align: 'center',
 * });
 * const textMetrics = CanvasTextMetrics.measureText('Your text', style);
 * @memberof text
 */
export class CanvasTextMetrics
{
    /** The text that was measured. */
    public text: string;

    /** The style that was measured. */
    public style: TextStyle;

    /** The measured width of the text. */
    public width: number;

    /** The measured height of the text. */
    public height: number;

    /** An array of lines of the text broken by new lines and wrapping is specified in style. */
    public lines: string[];

    /** An array of the line widths for each line matched to `lines`. */
    public lineWidths: number[];

    /** The measured line height for this style. */
    public lineHeight: number;

    /** The maximum line width for all measured lines. */
    public maxLineWidth: number;

    /** The font properties object from TextMetrics.measureFont. */
    public fontProperties: FontMetrics;

    /**
     * String used for calculate font metrics.
     * These characters are all tall to help calculate the height required for text.
     */
    public static METRICS_STRING = '|ÉqÅ';

    /** Baseline symbol for calculate font metrics. */
    public static BASELINE_SYMBOL = 'M';

    /** Baseline multiplier for calculate font metrics. */
    public static BASELINE_MULTIPLIER = 1.4;

    /** Height multiplier for setting height of canvas to calculate font metrics. */
    public static HEIGHT_MULTIPLIER = 2.0;

    /**
     * A Unicode "character", or "grapheme cluster", can be composed of multiple Unicode code points,
     * such as letters with diacritical marks (e.g. `'\u0065\u0301'`, letter e with acute)
     * or emojis with modifiers (e.g. `'\uD83E\uDDD1\u200D\uD83D\uDCBB'`, technologist).
     * The new `Intl.Segmenter` API in ES2022 can split the string into grapheme clusters correctly. If it is not available,
     * PixiJS will fallback to use the iterator of String, which can only spilt the string into code points.
     * If you want to get full functionality in environments that don't support `Intl.Segmenter` (such as Firefox),
     * you can use other libraries such as [grapheme-splitter]{@link https://www.npmjs.com/package/grapheme-splitter}
     * or [graphemer]{@link https://www.npmjs.com/package/graphemer} to create a polyfill. Since these libraries can be
     * relatively large in size to handle various Unicode grapheme clusters properly, PixiJS won't use them directly.
     */
    public static graphemeSegmenter: (s: string) => string[] = (() =>
    {
        if (typeof (Intl as IIntl)?.Segmenter === 'function')
        {
            const segmenter = new (Intl as IIntl).Segmenter();

            return (s: string) => [...segmenter.segment(s)].map((x) => x.segment);
        }

        return (s: string) => [...s];
    })();

    public static _experimentalLetterSpacingSupported?: boolean;

    /**
     * Checking that we can use modern canvas 2D API.
     *
     * Note: This is an unstable API, Chrome < 94 use `textLetterSpacing`, later versions use `letterSpacing`.
     * @see TextMetrics.experimentalLetterSpacing
     * @see https://developer.mozilla.org/en-US/docs/Web/API/ICanvasRenderingContext2D/letterSpacing
     * @see https://developer.chrome.com/origintrials/#/view_trial/3585991203293757441
     */
    public static get experimentalLetterSpacingSupported(): boolean
    {
        let result = CanvasTextMetrics._experimentalLetterSpacingSupported;

        if (result !== undefined)
        {
            const proto = DOMAdapter.get().getCanvasRenderingContext2D().prototype;

            result
                = CanvasTextMetrics._experimentalLetterSpacingSupported
                = 'letterSpacing' in proto || 'textLetterSpacing' in proto;
        }

        return result;
    }

    /**
     * New rendering behavior for letter-spacing which uses Chrome's new native API. This will
     * lead to more accurate letter-spacing results because it does not try to manually draw
     * each character. However, this Chrome API is experimental and may not serve all cases yet.
     * @see TextMetrics.experimentalLetterSpacingSupported
     */
    public static experimentalLetterSpacing = false;

    /** Cache of {@see TextMetrics.FontMetrics} objects. */
    private static _fonts: Record<string, FontMetrics> = {};

    /** Cache of new line chars. */
    private static readonly _newlines: number[] = [
        0x000A, // line feed
        0x000D, // carriage return
    ];

    /** Cache of breaking spaces. */
    private static readonly _breakingSpaces: number[] = [
        0x0009, // character tabulation
        0x0020, // space
        0x2000, // en quad
        0x2001, // em quad
        0x2002, // en space
        0x2003, // em space
        0x2004, // three-per-em space
        0x2005, // four-per-em space
        0x2006, // six-per-em space
        0x2008, // punctuation space
        0x2009, // thin space
        0x200A, // hair space
        0x205F, // medium mathematical space
        0x3000, // ideographic space
    ];

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static __canvas: ICanvas;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static __context: ICanvasRenderingContext2D;

    private static readonly _measurementCache: Record<string, CanvasTextMetrics> = {};

    /**
     * @param text - the text that was measured
     * @param style - the style that was measured
     * @param width - the measured width of the text
     * @param height - the measured height of the text
     * @param lines - an array of the lines of text broken by new lines and wrapping if specified in style
     * @param lineWidths - an array of the line widths for each line matched to `lines`
     * @param lineHeight - the measured line height for this style
     * @param maxLineWidth - the maximum line width for all measured lines
     * @param {FontMetrics} fontProperties - the font properties object from TextMetrics.measureFont
     */
    constructor(text: string, style: TextStyle, width: number, height: number, lines: string[], lineWidths: number[],
        lineHeight: number, maxLineWidth: number, fontProperties: FontMetrics)
    {
        this.text = text;
        this.style = style;
        this.width = width;
        this.height = height;
        this.lines = lines;
        this.lineWidths = lineWidths;
        this.lineHeight = lineHeight;
        this.maxLineWidth = maxLineWidth;
        this.fontProperties = fontProperties;
    }

    /**
     * Measures the supplied string of text and returns a Rectangle.
     * @param text - The text to measure.
     * @param style - The text style to use for measuring
     * @param canvas - optional specification of the canvas to use for measuring.
     * @param wordWrap
     * @returns Measured width and height of the text.
     */
    public static measureText(
        text = ' ',
        style: TextStyle,
        canvas: ICanvas = CanvasTextMetrics._canvas,
        wordWrap: boolean = style.wordWrap,
    ): CanvasTextMetrics
    {
        const textKey = `${text}:${style.styleKey}`;

        // TODO - if we find this starts to go nuts with memory, we can remove the cache
        // or instead just stick a usage tick that we increment each time we return it.
        // if some are not used, we can just tidy them up!
        if (CanvasTextMetrics._measurementCache[textKey]) return CanvasTextMetrics._measurementCache[textKey];

        const font = fontStringFromTextStyle(style);
        const fontProperties = CanvasTextMetrics.measureFont(font);

        // fallback in case UA disallow canvas data extraction
        if (fontProperties.fontSize === 0)
        {
            fontProperties.fontSize = style.fontSize as number;
            fontProperties.ascent = style.fontSize as number;
        }

        const context = CanvasTextMetrics.__context; // canvas.getContext('2d', contextSettings);

        context.font = font;

        const outputText = wordWrap ? CanvasTextMetrics._wordWrap(text, style, canvas) : text;
        const lines = outputText.split(/(?:\r\n|\r|\n)/);
        const lineWidths = new Array<number>(lines.length);
        let maxLineWidth = 0;

        for (let i = 0; i < lines.length; i++)
        {
            const lineWidth = CanvasTextMetrics._measureText(lines[i], style.letterSpacing, context);

            lineWidths[i] = lineWidth;
            maxLineWidth = Math.max(maxLineWidth, lineWidth);
        }

        const strokeWidth = style._stroke?.width || 0;

        let width = maxLineWidth + strokeWidth;

        if (style.dropShadow)
        {
            width += style.dropShadow.distance;
        }

        const lineHeight = style.lineHeight || fontProperties.fontSize;

        let height = Math.max(lineHeight, fontProperties.fontSize + (strokeWidth))
            + ((lines.length - 1) * (lineHeight + style.leading));

        if (style.dropShadow)
        {
            height += style.dropShadow.distance;
        }

        const measurements = new CanvasTextMetrics(
            text,
            style,
            width,
            height,
            lines,
            lineWidths,
            lineHeight + style.leading,
            maxLineWidth,
            fontProperties
        );

        // CanvasTextMetrics._measurementCache[textKey] = measurements;

        return measurements;
    }

    private static _measureText(
        text: string,
        letterSpacing: number,
        context: ICanvasRenderingContext2D
    )
    {
        let useExperimentalLetterSpacing = false;

        if (CanvasTextMetrics.experimentalLetterSpacingSupported)
        {
            if (CanvasTextMetrics.experimentalLetterSpacing)
            {
                context.letterSpacing = `${letterSpacing}px`;
                context.textLetterSpacing = `${letterSpacing}px`;
                useExperimentalLetterSpacing = true;
            }
            else
            {
                context.letterSpacing = '0px';
                context.textLetterSpacing = '0px';
            }
        }

        const metrics = context.measureText(text);
        let metricWidth = metrics.width;
        const actualBoundingBoxLeft = -metrics.actualBoundingBoxLeft;
        const actualBoundingBoxRight = metrics.actualBoundingBoxRight;
        let boundsWidth = actualBoundingBoxRight - actualBoundingBoxLeft;

        if (metricWidth > 0)
        {
            if (useExperimentalLetterSpacing)
            {
                metricWidth -= letterSpacing;
                boundsWidth -= letterSpacing;
            }
            else
            {
                const val = (CanvasTextMetrics.graphemeSegmenter(text).length - 1) * letterSpacing;

                metricWidth += val;
                boundsWidth += val;
            }
        }

        // NOTE: this is a bit of a hack as metrics.width and the bounding box width do not measure the same thing
        // We can't seem to exclusively use one or the other, so are taking the largest of the two
        return Math.max(metricWidth, boundsWidth);
    }

    /**
     * Applies newlines to a string to have it optimally fit into the horizontal
     * bounds set by the Text object's wordWrapWidth property.
     * @param text - String to apply word wrapping to
     * @param style - the style to use when wrapping
     * @param canvas - optional specification of the canvas to use for measuring.
     * @returns New string with new lines applied where required
     */
    private static _wordWrap(
        text: string,
        style: TextStyle,
        canvas: ICanvas = CanvasTextMetrics._canvas
    ): string
    {
        const context = canvas.getContext('2d', contextSettings);

        let width = 0;
        let line = '';
        let lines = '';

        const cache: CharacterWidthCache = Object.create(null);
        const { letterSpacing, whiteSpace } = style;

        // How to handle whitespaces
        const collapseSpaces = CanvasTextMetrics._collapseSpaces(whiteSpace);
        const collapseNewlines = CanvasTextMetrics._collapseNewlines(whiteSpace);

        // whether or not spaces may be added to the beginning of lines
        let canPrependSpaces = !collapseSpaces;

        // There is letterSpacing after every char except the last one
        // t_h_i_s_' '_i_s_' '_a_n_' '_e_x_a_m_p_l_e_' '_!
        // so for convenience the above needs to be compared to width + 1 extra letterSpace
        // t_h_i_s_' '_i_s_' '_a_n_' '_e_x_a_m_p_l_e_' '_!_
        // ________________________________________________
        // And then the final space is simply no appended to each line
        const wordWrapWidth = style.wordWrapWidth + letterSpacing;

        // break text into words, spaces and newline chars
        const tokens = CanvasTextMetrics._tokenize(text);

        for (let i = 0; i < tokens.length; i++)
        {
            // get the word, space or newlineChar
            let token = tokens[i];

            // if word is a new line
            if (CanvasTextMetrics._isNewline(token))
            {
                // keep the new line
                if (!collapseNewlines)
                {
                    lines += CanvasTextMetrics._addLine(line);
                    canPrependSpaces = !collapseSpaces;
                    line = '';
                    width = 0;
                    continue;
                }

                // if we should collapse new lines
                // we simply convert it into a space
                token = ' ';
            }

            // if we should collapse repeated whitespaces
            if (collapseSpaces)
            {
                // check both this and the last tokens for spaces
                const currIsBreakingSpace = CanvasTextMetrics.isBreakingSpace(token);
                const lastIsBreakingSpace = CanvasTextMetrics.isBreakingSpace(line[line.length - 1]);

                if (currIsBreakingSpace && lastIsBreakingSpace)
                {
                    continue;
                }
            }

            // get word width from cache if possible
            const tokenWidth = CanvasTextMetrics._getFromCache(token, letterSpacing, cache, context);

            // word is longer than desired bounds
            if (tokenWidth > wordWrapWidth)
            {
                // if we are not already at the beginning of a line
                if (line !== '')
                {
                    // start newlines for overflow words
                    lines += CanvasTextMetrics._addLine(line);
                    line = '';
                    width = 0;
                }

                // break large word over multiple lines
                if (CanvasTextMetrics.canBreakWords(token, style.breakWords))
                {
                    // break word into characters
                    const characters = CanvasTextMetrics.wordWrapSplit(token);

                    // loop the characters
                    for (let j = 0; j < characters.length; j++)
                    {
                        let char = characters[j];
                        let lastChar = char;

                        let k = 1;

                        // we are not at the end of the token
                        while (characters[j + k])
                        {
                            const nextChar = characters[j + k];

                            // should not split chars
                            if (!CanvasTextMetrics.canBreakChars(lastChar, nextChar, token, j, style.breakWords))
                            {
                                // combine chars & move forward one
                                char += nextChar;
                            }
                            else
                            {
                                break;
                            }

                            lastChar = nextChar;
                            k++;
                        }

                        j += k - 1;

                        const characterWidth = CanvasTextMetrics._getFromCache(char, letterSpacing, cache, context);

                        if (characterWidth + width > wordWrapWidth)
                        {
                            lines += CanvasTextMetrics._addLine(line);
                            canPrependSpaces = false;
                            line = '';
                            width = 0;
                        }

                        line += char;
                        width += characterWidth;
                    }
                }

                // run word out of the bounds
                else
                {
                    // if there are words in this line already
                    // finish that line and start a new one
                    if (line.length > 0)
                    {
                        lines += CanvasTextMetrics._addLine(line);
                        line = '';
                        width = 0;
                    }

                    const isLastToken = i === tokens.length - 1;

                    // give it its own line if it's not the end
                    lines += CanvasTextMetrics._addLine(token, !isLastToken);
                    canPrependSpaces = false;
                    line = '';
                    width = 0;
                }
            }

            // word could fit
            else
            {
                // word won't fit because of existing words
                // start a new line
                if (tokenWidth + width > wordWrapWidth)
                {
                    // if its a space we don't want it
                    canPrependSpaces = false;

                    // add a new line
                    lines += CanvasTextMetrics._addLine(line);

                    // start a new line
                    line = '';
                    width = 0;
                }

                // don't add spaces to the beginning of lines
                if (line.length > 0 || !CanvasTextMetrics.isBreakingSpace(token) || canPrependSpaces)
                {
                    // add the word to the current line
                    line += token;

                    // update width counter
                    width += tokenWidth;
                }
            }
        }

        lines += CanvasTextMetrics._addLine(line, false);

        return lines;
    }

    /**
     * Convenience function for logging each line added during the wordWrap method.
     * @param line    - The line of text to add
     * @param newLine - Add new line character to end
     * @returns A formatted line
     */
    private static _addLine(line: string, newLine = true): string
    {
        line = CanvasTextMetrics._trimRight(line);

        line = (newLine) ? `${line}\n` : line;

        return line;
    }

    /**
     * Gets & sets the widths of calculated characters in a cache object
     * @param key            - The key
     * @param letterSpacing  - The letter spacing
     * @param cache          - The cache
     * @param context        - The canvas context
     * @returns The from cache.
     */
    private static _getFromCache(key: string, letterSpacing: number, cache: CharacterWidthCache,
        context: ICanvasRenderingContext2D): number
    {
        let width = cache[key];

        if (typeof width !== 'number')
        {
            width = CanvasTextMetrics._measureText(key, letterSpacing, context) + letterSpacing;
            cache[key] = width;
        }

        return width;
    }

    /**
     * Determines whether we should collapse breaking spaces.
     * @param whiteSpace - The TextStyle property whiteSpace
     * @returns Should collapse
     */
    private static _collapseSpaces(whiteSpace: TextStyleWhiteSpace): boolean
    {
        return (whiteSpace === 'normal' || whiteSpace === 'pre-line');
    }

    /**
     * Determines whether we should collapse newLine chars.
     * @param whiteSpace - The white space
     * @returns should collapse
     */
    private static _collapseNewlines(whiteSpace: TextStyleWhiteSpace): boolean
    {
        return (whiteSpace === 'normal');
    }

    /**
     * Trims breaking whitespaces from string.
     * @param text - The text
     * @returns Trimmed string
     */
    private static _trimRight(text: string): string
    {
        if (typeof text !== 'string')
        {
            return '';
        }

        for (let i = text.length - 1; i >= 0; i--)
        {
            const char = text[i];

            if (!CanvasTextMetrics.isBreakingSpace(char))
            {
                break;
            }

            text = text.slice(0, -1);
        }

        return text;
    }

    /**
     * Determines if char is a newline.
     * @param char - The character
     * @returns True if newline, False otherwise.
     */
    private static _isNewline(char: string): boolean
    {
        if (typeof char !== 'string')
        {
            return false;
        }

        return CanvasTextMetrics._newlines.includes(char.charCodeAt(0));
    }

    /**
     * Determines if char is a breaking whitespace.
     *
     * It allows one to determine whether char should be a breaking whitespace
     * For example certain characters in CJK langs or numbers.
     * It must return a boolean.
     * @param char - The character
     * @param [_nextChar] - The next character
     * @returns True if whitespace, False otherwise.
     */
    public static isBreakingSpace(char: string, _nextChar?: string): boolean
    {
        if (typeof char !== 'string')
        {
            return false;
        }

        return CanvasTextMetrics._breakingSpaces.includes(char.charCodeAt(0));
    }

    /**
     * Splits a string into words, breaking-spaces and newLine characters
     * @param text - The text
     * @returns A tokenized array
     */
    private static _tokenize(text: string): string[]
    {
        const tokens: string[] = [];
        let token = '';

        if (typeof text !== 'string')
        {
            return tokens;
        }

        for (let i = 0; i < text.length; i++)
        {
            const char = text[i];
            const nextChar = text[i + 1];

            if (CanvasTextMetrics.isBreakingSpace(char, nextChar) || CanvasTextMetrics._isNewline(char))
            {
                if (token !== '')
                {
                    tokens.push(token);
                    token = '';
                }

                tokens.push(char);

                continue;
            }

            token += char;
        }

        if (token !== '')
        {
            tokens.push(token);
        }

        return tokens;
    }

    /**
     * Overridable helper method used internally by TextMetrics, exposed to allow customizing the class's behavior.
     *
     * It allows one to customise which words should break
     * Examples are if the token is CJK or numbers.
     * It must return a boolean.
     * @param _token - The token
     * @param breakWords - The style attr break words
     * @returns Whether to break word or not
     */
    public static canBreakWords(_token: string, breakWords: boolean): boolean
    {
        return breakWords;
    }

    /**
     * Overridable helper method used internally by TextMetrics, exposed to allow customizing the class's behavior.
     *
     * It allows one to determine whether a pair of characters
     * should be broken by newlines
     * For example certain characters in CJK langs or numbers.
     * It must return a boolean.
     * @param _char - The character
     * @param _nextChar - The next character
     * @param _token - The token/word the characters are from
     * @param _index - The index in the token of the char
     * @param _breakWords - The style attr break words
     * @returns whether to break word or not
     */
    public static canBreakChars(_char: string, _nextChar: string, _token: string, _index: number,
        _breakWords: boolean): boolean
    {
        return true;
    }

    /**
     * Overridable helper method used internally by TextMetrics, exposed to allow customizing the class's behavior.
     *
     * It is called when a token (usually a word) has to be split into separate pieces
     * in order to determine the point to break a word.
     * It must return an array of characters.
     * @param token - The token to split
     * @returns The characters of the token
     * @see CanvasTextMetrics.graphemeSegmenter
     */
    public static wordWrapSplit(token: string): string[]
    {
        return CanvasTextMetrics.graphemeSegmenter(token);
    }

    /**
     * Calculates the ascent, descent and fontSize of a given font-style
     * @param font - String representing the style of the font
     * @returns Font properties object
     */
    public static measureFont(font: string): FontMetrics
    {
        // as this method is used for preparing assets, don't recalculate things if we don't need to
        if (CanvasTextMetrics._fonts[font])
        {
            return CanvasTextMetrics._fonts[font];
        }

        const context = CanvasTextMetrics._context;

        context.font = font;
        const metrics = context.measureText(CanvasTextMetrics.METRICS_STRING + CanvasTextMetrics.BASELINE_SYMBOL);

        const properties = {
            ascent: metrics.actualBoundingBoxAscent,
            descent: metrics.actualBoundingBoxDescent,
            fontSize: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        };

        CanvasTextMetrics._fonts[font] = properties;

        return properties;
    }

    /**
     * Clear font metrics in metrics cache.
     * @param {string} [font] - font name. If font name not set then clear cache for all fonts.
     */
    public static clearMetrics(font = ''): void
    {
        if (font)
        {
            delete CanvasTextMetrics._fonts[font];
        }
        else
        {
            CanvasTextMetrics._fonts = {};
        }
    }

    /**
     * Cached canvas element for measuring text
     * TODO: this should be private, but isn't because of backward compat, will fix later.
     * @ignore
     */
    public static get _canvas(): ICanvas
    {
        if (!CanvasTextMetrics.__canvas)
        {
            let canvas: ICanvas;

            try
            {
                // OffscreenCanvas2D measureText can be up to 40% faster.
                const c = new OffscreenCanvas(0, 0);
                const context = c.getContext('2d', contextSettings);

                if (context?.measureText)
                {
                    CanvasTextMetrics.__canvas = c as ICanvas;

                    return c as ICanvas;
                }

                canvas = DOMAdapter.get().createCanvas();
            }
            catch (_cx)
            {
                canvas = DOMAdapter.get().createCanvas();
            }
            canvas.width = canvas.height = 10;
            CanvasTextMetrics.__canvas = canvas;
        }

        return CanvasTextMetrics.__canvas;
    }

    /**
     * TODO: this should be private, but isn't because of backward compat, will fix later.
     * @ignore
     */
    public static get _context(): ICanvasRenderingContext2D
    {
        if (!CanvasTextMetrics.__context)
        {
            CanvasTextMetrics.__context = CanvasTextMetrics._canvas.getContext('2d', contextSettings);
        }

        return CanvasTextMetrics.__context;
    }
}
