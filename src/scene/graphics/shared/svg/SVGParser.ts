import { warn } from '../../../../utils/logging/warn';
import { GraphicsPath } from '../path/GraphicsPath';
import { parseSVGDefinitions } from './parseSVGDefinitions';
import { parseSVGFloatAttribute } from './parseSVGFloatAttribute';
import { parseSVGStyle } from './parseSVGStyle';

import type { FillGradient } from '../fill/FillGradient';
import type { FillStyle, StrokeStyle } from '../FillTypes';
import type {
    GraphicsContext,
} from '../GraphicsContext';

/** Represents a session for SVG parsing. Contains the current state and resources needed during parsing. */
export interface Session
{
    /** The graphics context to render to */
    context: GraphicsContext;
    /** The current path being constructed */
    path: GraphicsPath;
    /** Map of definitions by id */
    defs: Record<string, FillGradient>;
}

/**
 * Parses an SVG element or string and renders it to a graphics context.
 * Handles both SVG strings and SVG DOM elements as input.
 * @param svg - The SVG content to parse, either as a string or element
 * @param graphicsContext - Optional graphics context to render to
 * @returns The graphics context with the SVG rendered into it
 */
export function SVGParser(
    svg: string | SVGElement | SVGSVGElement,
    graphicsContext?: GraphicsContext
): GraphicsContext
{
    // Convert string input to SVG element
    if (typeof svg === 'string')
    {
        const div = document.createElement('div');

        div.innerHTML = svg.trim();
        svg = div.querySelector('svg') as SVGElement;
    }

    // Initialize parsing session
    const session = {
        context: graphicsContext,
        defs: {},
        path: new GraphicsPath(),
    };

    // Parse definitions (gradients, etc) first
    parseSVGDefinitions(svg, session);

    // Process all child elements except defs
    const children = svg.children;

    const { fillStyle, strokeStyle } = parseSVGStyle(svg, session);

    for (let i = 0; i < children.length; i++)
    {
        const child = children[i] as SVGElement;

        if (child.nodeName.toLowerCase() === 'defs') continue;
        renderChildren(child, session, fillStyle, strokeStyle);
    }

    return graphicsContext;
}

/**
 * Recursively renders SVG elements and their children.
 * Handles styling inheritance and different SVG shape types.
 * @param svg - The SVG element to render
 * @param session - The current parsing session
 * @param fillStyle - The inherited fill style
 * @param strokeStyle - The inherited stroke style
 */
function renderChildren(svg: SVGElement, session: Session, fillStyle: FillStyle, strokeStyle: StrokeStyle): void
{
    const children = svg.children;

    // Parse element's style and merge with inherited styles
    const { fillStyle: f1, strokeStyle: s1 } = parseSVGStyle(svg, session);

    if (f1 && fillStyle)
    {
        fillStyle = { ...fillStyle, ...f1 };
    }
    else if (f1)
    {
        fillStyle = f1;
    }

    if (s1 && strokeStyle)
    {
        strokeStyle = { ...strokeStyle, ...s1 };
    }
    else if (s1)
    {
        strokeStyle = s1;
    }

    const noStyle = !fillStyle && !strokeStyle;

    // Default to black fill if no styles specified
    if (noStyle)
    {
        fillStyle = { color: 0 };
    }

    // Variables for shape attributes
    let x;
    let y;
    let x1;
    let y1;
    let x2;
    let y2;
    let cx;
    let cy;
    let r;
    let rx;
    let ry;
    let points;
    let pointsString;
    let d;
    let graphicsPath;
    let width;
    let height;

    // Handle different SVG element types
    switch (svg.nodeName.toLowerCase())
    {
        case 'path':
            d = svg.getAttribute('d') as string;

            if (svg.getAttribute('fill-rule') as string === 'evenodd')
            {
                warn('SVG Evenodd fill rule not supported, your svg may render incorrectly');
            }

            graphicsPath = new GraphicsPath(d, true);
            session.context.path(graphicsPath);
            if (fillStyle) session.context.fill(fillStyle);
            if (strokeStyle) session.context.stroke(strokeStyle);
            break;

        case 'circle':
            cx = parseSVGFloatAttribute(svg, 'cx', 0);
            cy = parseSVGFloatAttribute(svg, 'cy', 0);
            r = parseSVGFloatAttribute(svg, 'r', 0);
            session.context.ellipse(cx, cy, r, r);
            if (fillStyle) session.context.fill(fillStyle);
            if (strokeStyle) session.context.stroke(strokeStyle);
            break;

        case 'rect':
            x = parseSVGFloatAttribute(svg, 'x', 0);
            y = parseSVGFloatAttribute(svg, 'y', 0);
            width = parseSVGFloatAttribute(svg, 'width', 0);
            height = parseSVGFloatAttribute(svg, 'height', 0);
            rx = parseSVGFloatAttribute(svg, 'rx', 0);
            ry = parseSVGFloatAttribute(svg, 'ry', 0);

            if (rx || ry)
            {
                session.context.roundRect(x, y, width, height, rx || ry);
            }
            else
            {
                session.context.rect(x, y, width, height);
            }

            if (fillStyle) session.context.fill(fillStyle);
            if (strokeStyle) session.context.stroke(strokeStyle);
            break;

        case 'ellipse':
            cx = parseSVGFloatAttribute(svg, 'cx', 0);
            cy = parseSVGFloatAttribute(svg, 'cy', 0);
            rx = parseSVGFloatAttribute(svg, 'rx', 0);
            ry = parseSVGFloatAttribute(svg, 'ry', 0);

            session.context.beginPath();
            session.context.ellipse(cx, cy, rx, ry);

            if (fillStyle) session.context.fill(fillStyle);
            if (strokeStyle) session.context.stroke(strokeStyle);
            break;

        case 'line':
            x1 = parseSVGFloatAttribute(svg, 'x1', 0);
            y1 = parseSVGFloatAttribute(svg, 'y1', 0);
            x2 = parseSVGFloatAttribute(svg, 'x2', 0);
            y2 = parseSVGFloatAttribute(svg, 'y2', 0);

            session.context.beginPath();
            session.context.moveTo(x1, y1);
            session.context.lineTo(x2, y2);

            if (strokeStyle) session.context.stroke(strokeStyle);
            break;

        case 'polygon':
            pointsString = svg.getAttribute('points') as string;
            points = pointsString.match(/\d+/g).map((n) => parseInt(n, 10));
            session.context.poly(points, true);
            if (fillStyle) session.context.fill(fillStyle);
            if (strokeStyle) session.context.stroke(strokeStyle);
            break;

        case 'polyline':
            pointsString = svg.getAttribute('points') as string;
            points = pointsString.match(/\d+/g).map((n) => parseInt(n, 10));
            session.context.poly(points, false);
            if (strokeStyle) session.context.stroke(strokeStyle);
            break;

        // Group elements - just process children
        case 'g':
        case 'svg':
            break;

        default: {
            // Log unsupported elements
            warn(`[SVG parser] <${svg.nodeName}> elements unsupported`);
            break;
        }
    }

    if (noStyle)
    {
        fillStyle = null;
    }

    // Recursively process child elements
    for (let i = 0; i < children.length; i++)
    {
        renderChildren(children[i] as SVGElement, session, fillStyle, strokeStyle);
    }
}
