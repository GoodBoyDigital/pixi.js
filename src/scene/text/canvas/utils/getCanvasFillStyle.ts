import { Color } from '../../../../color/Color';
import { Matrix } from '../../../../maths/matrix/Matrix';
import { Texture } from '../../../../rendering/renderers/shared/texture/Texture';
import { warn } from '../../../../utils/logging/warn';
import { FillGradient } from '../../../graphics/shared/fill/FillGradient';
import { FillPattern } from '../../../graphics/shared/fill/FillPattern';

import type { ICanvasRenderingContext2D } from '../../../../environment/canvas/ICanvasRenderingContext2D';
import type { ConvertedFillStyle } from '../../../graphics/shared/FillTypes';
import type { CanvasTextMetrics } from '../CanvasTextMetrics';

// 5 decimal places
const PRECISION = 100000;

/**
 * Converts a PixiJS fill style into a Canvas-compatible fill style.
 * Handles solid colors, textures, patterns, and gradients.
 * @param fillStyle - The PixiJS fill style to convert
 * @param context - The canvas rendering context
 * @param textMetrics - Metrics about the text being rendered
 * @param padding - Padding to add to the text metrics (used to ensure that the gradient accommodates the stroke width)
 * @returns Canvas-compatible fill style (string, CanvasGradient, or CanvasPattern)
 */
export function getCanvasFillStyle(
    fillStyle: ConvertedFillStyle,
    context: ICanvasRenderingContext2D,
    textMetrics?: CanvasTextMetrics,
    padding = 0
): string | CanvasGradient | CanvasPattern
{
    // Solid color fill
    if (fillStyle.texture === Texture.WHITE && !fillStyle.fill)
    {
        return Color.shared.setValue(fillStyle.color).setAlpha(fillStyle.alpha ?? 1).toHexa();
    }
    // Basic texture fill
    else if (!fillStyle.fill)
    {
        const pattern = context.createPattern(fillStyle.texture.source.resource, 'repeat');
        const tempMatrix = fillStyle.matrix.copyTo(Matrix.shared);

        tempMatrix.scale(fillStyle.texture.frame.width, fillStyle.texture.frame.height);
        pattern.setTransform(tempMatrix);

        return pattern;
    }
    // Pattern fill
    else if (fillStyle.fill instanceof FillPattern)
    {
        const fillPattern = fillStyle.fill;
        const pattern = context.createPattern(fillPattern.texture.source.resource, 'repeat');
        const tempMatrix = fillPattern.transform.copyTo(Matrix.shared);

        tempMatrix.scale(
            fillPattern.texture.frame.width,
            fillPattern.texture.frame.height
        );

        pattern.setTransform(tempMatrix);

        return pattern;
    }
    // Gradient fill
    else if (fillStyle.fill instanceof FillGradient)
    {
        const fillGradient = fillStyle.fill;

        const { x0, y0, x1, y1 } = fillGradient;
        const isLinear = fillGradient.type === 'linear';
        const isLocal = fillGradient.textureSpace === 'local';

        let width = 1;
        let height = 1;

        // Use text dimensions if in local space
        if (isLocal && textMetrics)
        {
            width = textMetrics.width + padding;
            height = textMetrics.height + padding;
        }

        const gradient = isLinear ? context.createLinearGradient(
            x0 * width,
            y0 * height,
            x1 * width,
            y1 * height
        ) : context.createRadialGradient(
            x0 * width,
            y0 * height,
            fillGradient.r0 * width,
            x1 * width,
            y1 * height,
            fillGradient.r1 * width
        );

        // Check if gradient is nearly vertical (10% threshold)
        const isNearlyVertical = Math.abs(x1 - x0) < Math.abs((y1 - y0) * 0.1);

        // For vertical gradients in local space, repeat gradient per text line
        if (isLinear && isNearlyVertical && isLocal && textMetrics)
        {
            const ratio = (textMetrics.lineHeight) / height;

            for (let i = 0; i < textMetrics.lines.length; i++)
            {
                const start = ((i * textMetrics.lineHeight) + (padding / 2)) / height;

                fillGradient.colorStops.forEach((stop) =>
                {
                    // Convert to global space
                    const globalStop = start + (stop.offset * ratio);

                    gradient.addColorStop(
                        // fix to 5 decimal places to avoid floating point precision issues
                        Math.floor(globalStop * PRECISION) / PRECISION,
                        Color.shared.setValue(stop.color).toHex()
                    );
                });
            }
        }
        else
        {
            // Standard global space gradient handling
            fillGradient.colorStops.forEach((stop) =>
            {
                gradient.addColorStop(stop.offset, Color.shared.setValue(stop.color).toHex());
            });
        }

        return gradient;
    }

    // #if _DEBUG
    warn('FillStyle not recognised', fillStyle);
    // #endif

    return 'red';
}
