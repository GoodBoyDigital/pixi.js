import { Color } from '../../../../color/Color';
import { extractSvgUrlId } from './utils/extractSvgUrlId';

import type { ConvertedFillStyle, ConvertedStrokeStyle, FillStyle, StrokeStyle } from '../FillTypes';
import type { Session } from './SVGParser';

/**
 * A map of SVG style attributes and their default values.
 * Each attribute has a type and default value used for SVG parsing.
 * - 'paint' type can be a color or gradient
 * - 'number' type is a numeric value
 * - 'string' type is a text value
 */
export const styleAttributes = {
    // Fill properties
    fill: { type: 'paint', default: 0 }, // Fill color/gradient
    'fill-opacity': { type: 'number', default: 1 }, // Fill transparency

    // Stroke properties
    stroke: { type: 'paint', default: 0 }, // Stroke color/gradient
    'stroke-width': { type: 'number', default: 1 }, // Width of stroke
    'stroke-opacity': { type: 'number', default: 1 }, // Stroke transparency
    'stroke-linecap': { type: 'string', default: 'butt' }, // End cap style: butt, round, square
    'stroke-linejoin': { type: 'string', default: 'miter' }, // Join style: miter, round, bevel
    'stroke-miterlimit': { type: 'number', default: 10 }, // Limit on miter join sharpness
    'stroke-dasharray': { type: 'string', default: 'none' }, // Dash pattern
    'stroke-dashoffset': { type: 'number', default: 0 }, // Offset for dash pattern

    // Global properties
    opacity: { type: 'number', default: 1 }, // Overall opacity
};
/** Represents the result of parsing SVG style attributes */
export type StyleResult = {
    /** The stroke style properties */
    strokeStyle: StrokeStyle;
    /** The fill style properties */
    fillStyle: FillStyle;
    /** Whether fill should be applied */
    useFill: boolean;
    /** Whether stroke should be applied */
    useStroke: boolean;
};

/**
 * Parses SVG style attributes and inline styles to determine fill and stroke properties.
 * Handles both direct attributes and CSS-style declarations in the style attribute.
 * @param svg - The SVG element to parse styles from
 * @param session - The current SVG parsing session containing definitions
 * @returns An object containing the parsed fill and stroke styles
 */
export function parseSVGStyle(svg: SVGElement, session: Session): StyleResult
{
    const style = svg.getAttribute('style');

    const strokeStyle: StrokeStyle = {};

    const fillStyle: FillStyle = {};

    const result: StyleResult = {
        strokeStyle,
        fillStyle,
        useFill: false,
        useStroke: false,
    };

    // First parse direct style attributes
    for (const key in styleAttributes)
    {
        const attribute = svg.getAttribute(key);

        if (attribute)
        {
            parseAttribute(session, result, key, attribute.trim());
        }
    }

    // Then parse inline styles which override direct attributes
    if (style)
    {
        const styleParts = style.split(';');

        for (let i = 0; i < styleParts.length; i++)
        {
            const stylePart = styleParts[i].trim();

            const [key, value] = stylePart.split(':');

            if (styleAttributes[key as keyof typeof styleAttributes])
            {
                parseAttribute(session, result, key, value.trim());
            }
        }
    }

    return {
        strokeStyle: result.useStroke ? (strokeStyle as ConvertedStrokeStyle) : null,
        fillStyle: result.useFill ? (fillStyle as ConvertedFillStyle) : null,
        useFill: result.useFill,
        useStroke: result.useStroke,
    };
}

/**
 * Parses a single SVG style attribute and updates the style result accordingly.
 * Handles color values, gradients, opacities and other style properties.
 * @param session - The current SVG parsing session containing definitions
 * @param result - The style result object to update
 * @param id - The attribute name/id to parse
 * @param value - The attribute value to parse
 */
export function parseAttribute(
    session: Session,
    result: StyleResult,
    id: string,
    value: string
): void
{
    switch (id)
    {
        case 'stroke':
            if (value !== 'none')
            {
                if (value.startsWith('url('))
                {
                    // Extract gradient/pattern id from url reference
                    const id = extractSvgUrlId(value);

                    result.strokeStyle.fill = session.defs[id];
                }
                else
                {
                    // Parse as color value
                    result.strokeStyle.color = Color.shared.setValue(value).toNumber();
                }

                result.useStroke = true;
            }

            break;
        case 'stroke-width':
            result.strokeStyle.width = Number(value);
            break;
        case 'fill':
            if (value !== 'none')
            {
                if (value.startsWith('url('))
                {
                    // Extract gradient/pattern id from url reference
                    const id = extractSvgUrlId(value);

                    result.fillStyle.fill = session.defs[id];
                }
                else
                {
                    // Parse as color value
                    result.fillStyle.color = Color.shared.setValue(value).toNumber();
                }

                result.useFill = true;
            }
            break;
        case 'fill-opacity':
            result.fillStyle.alpha = Number(value);
            break;
        case 'stroke-opacity':
            result.strokeStyle.alpha = Number(value);
            break;
        case 'opacity':
            // Global opacity affects both fill and stroke
            result.fillStyle.alpha = Number(value);
            result.strokeStyle.alpha = Number(value);
            break;
    }
}
