import { FillGradient } from '../../fill/FillGradient';
import { FillPattern } from '../../fill/FillPattern';
import { type ConvertedFillStyle, type FillStyle } from '../../FillTypes';
import { toFillStyle } from '../convertFillInputToFillStyle';
import { Color } from '~/color/Color';
import { Texture } from '~/rendering/renderers/shared/texture/Texture';

describe('toFillStyle', () =>
{
    const defaultStyle: ConvertedFillStyle = {
        color: 0x0,
        alpha: 1,
        texture: null,
        matrix: null,
        textureSpace: null,
        fill: null,
    };

    it('should handle null/undefined values', () =>
    {
        expect(toFillStyle(null, defaultStyle)).toBe(null);
        expect(toFillStyle(undefined, defaultStyle)).toBe(null);
    });

    it('should handle color-like values', () =>
    {
        // Hex number
        const hexResult = toFillStyle(0xff0000, defaultStyle);

        expect(hexResult.color).toBe(0xff0000);
        expect(hexResult.alpha).toBe(1);
        expect(hexResult.texture).toBe(Texture.WHITE);

        // Color instance
        const colorResult = toFillStyle(new Color(0x00ff00), defaultStyle);

        expect(colorResult.color).toBe(0x00ff00);
        expect(colorResult.alpha).toBe(1);
        expect(colorResult.texture).toBe(Texture.WHITE);

        // RGB object
        const rgbResult = toFillStyle({ r: 0, g: 0, b: 255 }, defaultStyle);

        expect(rgbResult.color).toBe(0x0000ff);
        expect(rgbResult.alpha).toBe(1);
        expect(rgbResult.texture).toBe(Texture.WHITE);
    });

    it('should handle texture', () =>
    {
        const texture = new Texture({});
        const result = toFillStyle(texture, defaultStyle);

        expect(result.texture).toBe(texture);
    });

    it('should handle fill pattern', () =>
    {
        const pattern = new FillPattern(Texture.WHITE);
        const result = toFillStyle(pattern, defaultStyle);

        expect(result.fill).toBe(pattern);
        expect(result.color).toBe(0xffffff);
        expect(result.texture).toBe(pattern.texture);
        expect(result.matrix).toBe(pattern.transform);
    });

    it('should handle fill gradient', () =>
    {
        const gradient = new FillGradient(0, 0, 100, 0);

        gradient.addColorStop(0, 'red');
        gradient.addColorStop(1, 'blue');

        const result = toFillStyle(gradient, defaultStyle);

        expect(result.fill).toBe(gradient);
        expect(result.color).toBe(0xffffff);
        expect(result.texture).toBe(gradient.texture);
        expect(result.matrix).toBe(gradient.transform);
        expect(result.textureSpace).toBe(gradient.textureSpace);
    });

    it('should handle fill style object', () =>
    {
        const style: FillStyle = {
            color: 0xff0000,
            alpha: 0.5,
            texture: Texture.WHITE,
            matrix: null,
        };

        const result = toFillStyle(style, defaultStyle);

        expect(result.color).toBe(0xff0000);
        expect(result.alpha).toBe(0.5);
        expect(result.texture).toBe(Texture.WHITE);
        expect(result.matrix).toBe(null);
    });

    it('should handle fill style object with pattern', () =>
    {
        const pattern = new FillPattern(Texture.WHITE);
        const style = {
            fill: pattern,
            alpha: 0.5,
        };

        const result = toFillStyle(style, defaultStyle);

        expect(result.fill).toBe(pattern);
        expect(result.color).toBe(0xffffff);
        expect(result.texture).toBe(pattern.texture);
        expect(result.matrix).toBe(pattern.transform);
        expect(result.alpha).toBe(0.5);
    });

    it('should handle fill style object with gradient', () =>
    {
        const gradient = new FillGradient({});

        gradient.addColorStop(0, 'red');
        gradient.addColorStop(1, 'blue');

        const style = {
            fill: gradient,
            alpha: 0.5,
        };

        const result = toFillStyle(style, defaultStyle);

        expect(result.fill).toBe(gradient);
        expect(result.color).toBe(0xffffff);
        expect(result.texture).toBe(gradient.texture);
        expect(result.matrix).toBe(gradient.transform);
        expect(result.textureSpace).toBe(gradient.textureSpace);
        expect(result.alpha).toBe(0.5);
    });
});
