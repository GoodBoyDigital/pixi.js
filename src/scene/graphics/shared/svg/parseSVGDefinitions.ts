import { Color } from '../../../../color/Color';
import { warn } from '../../../../utils/logging/warn';
import { FillGradient } from '../fill/FillGradient';
import { parseSVGFloatAttribute } from './parseSVGFloatAttribute';

import type { Session } from './SVGParser';

/**
 * Parses SVG gradient definitions and stores them in the session for later use.
 * Currently supports linear gradients and has placeholder support for radial gradients.
 * @param svg - The root SVG element to parse definitions from
 * @param session - The parsing session to store definitions in
 */
export function parseSVGDefinitions(svg: SVGElement, session: Session): void
{
    // Find all <defs> elements in the SVG
    const definitions = svg.querySelectorAll('defs');

    // Process each <defs> element
    for (let i = 0; i < definitions.length; i++)
    {
        const definition = definitions[i];

        // Process each child element in the <defs>
        for (let j = 0; j < definition.children.length; j++)
        {
            const child = definition.children[j];

            // Handle different types of gradient definitions
            switch (child.nodeName.toLowerCase())
            {
                case 'lineargradient':
                    // Store the parsed linear gradient in the session defs using the gradient's ID
                    session.defs[child.id] = parseLinearGradient(child as SVGElement);
                    break;
                case 'radialgradient':
                    session.defs[child.id] = parseRadialGradient(child as SVGElement);
                    break;
                default:
                    break;
            }
        }
    }
}

/**
 * Parses an SVG linear gradient element into a FillGradient.
 * @param child - The SVG linear gradient element to parse
 * @returns A FillGradient configured based on the SVG element
 */
function parseLinearGradient(child: SVGElement): FillGradient
{
    // Parse the gradient vector coordinates (defaults: horizontal line from 0 to 1)
    const x0 = parseSVGFloatAttribute(child, 'x1', 0);
    const y0 = parseSVGFloatAttribute(child, 'y1', 0);
    const x1 = parseSVGFloatAttribute(child, 'x2', 1);
    const y1 = parseSVGFloatAttribute(child, 'y2', 0);

    // Get the gradient coordinate system
    const gradientUnit = child.getAttribute('gradientUnits') || 'objectBoundingBox';

    // Create gradient with coordinates and space mapping
    const gradient = new FillGradient(
        x0,
        y0,
        x1,
        y1,
        gradientUnit === 'objectBoundingBox' ? 'local' : 'global'
    );

    // Process each gradient stop
    for (let k = 0; k < child.children.length; k++)
    {
        const stop = child.children[k] as SVGElement;

        // Get stop position (0-1) and color
        const offset = parseSVGFloatAttribute(stop, 'offset', 0);
        const color = Color.shared.setValue(stop.getAttribute('stop-color')).toNumber();

        gradient.addColorStop(offset, color);
    }

    return gradient;
}

/**
 * Placeholder function for parsing SVG radial gradients.
 * Currently returns a simple horizontal linear gradient and logs a warning.
 * @param _child - The SVG radial gradient element (currently unused)
 * @returns A default linear gradient
 */
function parseRadialGradient(_child: SVGElement): FillGradient
{
    warn('[SVG Parser] Radial gradients are not yet supported');

    return new FillGradient(0, 0, 1, 0);
}
