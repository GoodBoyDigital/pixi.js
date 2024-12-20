import { AbstractText, ensureTextOptions } from '../text/AbstractText';
import { HTMLTextStyle } from './HTMLTextStyle';
import { measureHtmlText } from './utils/measureHtmlText';

import type { View } from '../../rendering/renderers/shared/view/View';
import type { TextOptions, TextString } from '../text/AbstractText';
import type { HTMLTextStyleOptions } from './HTMLTextStyle';

/**
 * Constructor options used for `HTMLText` instances.
 * @property {string} [text=''] - The string that you would like the text to display.
 * @property {text.HTMLTextStyle | text.HTMLTextStyleOptions} [style] - The style of the text.
 * @memberof text
 */
export type HTMLTextOptions = TextOptions<HTMLTextStyle, HTMLTextStyleOptions>;

/**
 * A HTMLText Object will create a line or multiple lines of text.
 *
 * To split a line you can use '\n' in your text string, or, on the `style` object,
 * change its `wordWrap` property to true and and give the `wordWrapWidth` property a value.
 *
 * HTMLText uses an svg foreignObject to render HTML text.
 *
 *
 * The primary advantages of this render mode are:
 *
 *  - Supports [HTML tags](https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/HTML_text_fundamentals)
 * for styling such as `<strong>`, or `<em>`, as well as `<span style="">`
 *
 *       - Better support for emojis and other HTML layout features, better compatibility with CSS
 *     line-height and letter-spacing.
 *
 *
 * The primary disadvantages are:
 *   - Unlike `text`, `html` rendering will vary slightly between platforms and browsers.
 * `html` uses SVG/DOM to render text and not Context2D's fillText like `text`.
 *
 *   - Performance and memory usage is on-par with `text` (that is to say, slow and heavy)
 *
 *   - Only works with browsers that support <foreignObject>.
 * @example
 * import { HTMLText } from 'pixi.js';
 *
 * const text = new HTMLText({
 *     text: 'Hello Pixi!',
 *     style: {
 *         fontFamily: 'Arial',
 *         fontSize: 24,
 *         fill: 0xff1010,
 *         align: 'center',
 *     }
 * });
 * @memberof scene
 */
export class HTMLText extends AbstractText<HTMLTextStyle, HTMLTextStyleOptions> implements View
{
    public override readonly renderPipeId: string = 'htmlText';

    /**
     * @param {text.HTMLTextOptions} options - The options of the html text.
     */
    constructor(options?: HTMLTextOptions);
    /** @deprecated since 8.0.0 */
    constructor(text?: TextString, options?: Partial<HTMLTextStyle>);
    constructor(...args: [HTMLTextOptions?] | [TextString, Partial<HTMLTextStyle>])
    {
        const options = ensureTextOptions<HTMLTextStyle, HTMLTextStyleOptions>(args, 'HtmlText');

        super(options, HTMLTextStyle);
    }

    /** @private */
    protected updateBounds()
    {
        const bounds = this._bounds;
        const anchor = this._anchor;

        const htmlMeasurement = measureHtmlText(this.text, this._style as HTMLTextStyle);

        const { width, height } = htmlMeasurement;

        bounds.minX = (-anchor._x * width);
        bounds.maxX = bounds.minX + width;
        bounds.minY = (-anchor._y * height);
        bounds.maxY = bounds.minY + height;
    }
}
