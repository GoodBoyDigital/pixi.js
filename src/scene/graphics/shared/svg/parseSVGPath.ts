import parse from 'parse-svg-path';
import { warn } from '../../../../utils/logging/warn';

import type { GraphicsPath } from '../path/GraphicsPath';

interface SubPath
{
    startX: number;
    startY: number;
}

/**
 * Parses an SVG path data string and builds a GraphicsPath object from the commands.
 * This function handles all standard SVG path commands including moves, lines, curves and arcs.
 * It maintains state for the current position and subpaths to properly handle relative commands
 * and path closures.
 *
 * Supported SVG commands:
 * - M/m: Move to absolute/relative
 * - L/l: Line to absolute/relative
 * - H/h: Horizontal line absolute/relative
 * - V/v: Vertical line absolute/relative
 * - C/c: Cubic bezier curve absolute/relative
 * - S/s: Smooth cubic bezier curve absolute/relative
 * - Q/q: Quadratic bezier curve absolute/relative
 * - T/t: Smooth quadratic bezier curve absolute/relative
 * - A/a: Arc absolute/relative
 * - Z/z: Close path
 * @param svgPath - The SVG path data string to parse (e.g. "M0,0 L100,100")
 * @param path - The GraphicsPath object to build the path into
 * @returns The input path object with the SVG commands applied
 */
export function parseSVGPath(svgPath: string, path: GraphicsPath): GraphicsPath
{
    // Parse the SVG path string into an array of commands
    const commands = parse(svgPath);

    // Track subpaths for proper path closure handling
    const subpaths: SubPath[] = [];
    let currentSubPath: SubPath | null = null;

    // Track current position for relative commands
    let lastX = 0;
    let lastY = 0;

    // Process each command in sequence
    for (let i = 0; i < commands.length; i++)
    {
        const command = commands[i];
        const type = command[0]; // The command letter
        const data = command; // The command parameters, 1-based indexed

        switch (type)
        {
            case 'M': // Move To (absolute)
                lastX = data[1];
                lastY = data[2];

                path.moveTo(lastX, lastY);
                break;
            case 'm': // Move To (relative)
                lastX += data[1];
                lastY += data[2];

                path.moveTo(lastX, lastY);
                break;
            case 'H': // Horizontal Line To (absolute)
                lastX = data[1];

                path.lineTo(lastX, lastY);
                break;
            case 'h': // Horizontal Line To (relative)
                lastX += data[1];

                path.lineTo(lastX, lastY);
                break;
            case 'V': // Vertical Line To (absolute)
                lastY = data[1];

                path.lineTo(lastX, lastY);
                break;
            case 'v': // Vertical Line To (relative)
                lastY += data[1];

                path.lineTo(lastX, lastY);
                break;
            case 'L': // Line To (absolute)
                lastX = data[1];
                lastY = data[2];

                path.lineTo(lastX, lastY);
                break;
            case 'l': // Line To (relative)
                lastX += data[1];
                lastY += data[2];

                path.lineTo(lastX, lastY);
                break;
            case 'C': // Cubic Bezier Curve (absolute)
                lastX = data[5];
                lastY = data[6];

                path.bezierCurveTo(
                    data[1], data[2], // First control point
                    data[3], data[4], // Second control point
                    lastX, lastY // End point
                );
                break;
            case 'c': // Cubic Bezier Curve (relative)
                path.bezierCurveTo(
                    lastX + data[1], lastY + data[2], // First control point
                    lastX + data[3], lastY + data[4], // Second control point
                    lastX + data[5], lastY + data[6] // End point
                );

                lastX += data[5];
                lastY += data[6];
                break;
            case 'S': // Smooth Cubic Bezier Curve (absolute)
                lastX = data[3];
                lastY = data[4];

                path.bezierCurveToShort(
                    data[1], data[2], // Control point
                    lastX, lastY // End point
                );
                break;
            case 's': // Smooth Cubic Bezier Curve (relative)
                path.bezierCurveToShort(
                    lastX + data[1], lastY + data[2], // Control point
                    lastX + data[3], lastY + data[4], // End point
                );

                lastX += data[3];
                lastY += data[4];
                break;
            case 'Q': // Quadratic Bezier Curve (absolute)
                lastX = data[3];
                lastY = data[4];

                path.quadraticCurveTo(
                    data[1], data[2], // Control point
                    lastX, lastY // End point
                );
                break;
            case 'q': // Quadratic Bezier Curve (relative)
                path.quadraticCurveTo(
                    lastX + data[1], lastY + data[2], // Control point
                    lastX + data[3], lastY + data[4] // End point
                );

                lastX += data[3];
                lastY += data[4];
                break;
            case 'T': // Smooth Quadratic Bezier Curve (absolute)
                lastX = data[1];
                lastY = data[2];

                path.quadraticCurveToShort(
                    lastX, lastY // End point
                );
                break;
            case 't': // Smooth Quadratic Bezier Curve (relative)
                lastX += data[1];
                lastY += data[2];

                path.quadraticCurveToShort(
                    lastX, lastY // End point
                );
                break;
            case 'A': // Arc (absolute)
                lastX = data[6];
                lastY = data[7];

                path.arcToSvg(
                    data[1], // rx
                    data[2], // ry
                    data[3], // x-axis-rotation
                    data[4], // large-arc-flag
                    data[5], // sweep-flag
                    lastX, lastY // End point
                );
                break;
            case 'a': // Arc (relative)
                lastX += data[6];
                lastY += data[7];

                path.arcToSvg(
                    data[1], // rx
                    data[2], // ry
                    data[3], // x-axis-rotation
                    data[4], // large-arc-flag
                    data[5], // sweep-flag
                    lastX, lastY // End point
                );
                break;
            case 'Z': // Close Path
            case 'z':
                path.closePath();
                if (subpaths.length > 0)
                {
                    // Return to the start of the current subpath
                    currentSubPath = subpaths.pop();
                    if (currentSubPath)
                    {
                        lastX = currentSubPath.startX;
                        lastY = currentSubPath.startY;
                    }
                    else
                    {
                        lastX = 0;
                        lastY = 0;
                    }
                }
                currentSubPath = null;
                break;
            default:
                // #if _DEBUG
                warn(`Unknown SVG path command: ${type}`);
                // #endif
        }

        // Track subpath starts for path closure
        if (type !== 'Z' && type !== 'z')
        {
            if (currentSubPath === null)
            {
                currentSubPath = { startX: lastX, startY: lastY };
                subpaths.push(currentSubPath);
            }
        }
    }

    return path;
}
