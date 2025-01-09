import { FillGradient } from '../../fill/FillGradient';
import { FillPattern } from '../../fill/FillPattern';
import { toFillStyle, toStrokeStyle } from '../convertFillInputToFillStyle';
import { Color } from '~/color';
import { Texture } from '~/rendering';

import type { ConvertedStrokeStyle } from '../../FillTypes';

describe('convertStrokeInputToStrokeStyle', () =>
{
    const getDefaultValue = (): ConvertedStrokeStyle => ({
        width: 5,
        color: 0xffffff,
        alpha: 1,
        alignment: 0.5,
        miterLimit: 10,
        cap: 'butt',
        join: 'miter',
        texture: Texture.WHITE,
        textureSpace: 'global',
        matrix: null,
        fill: null,
        pixelLine: false,
    });

    it('should return null when value is undefined', () =>
    {
        const result = toStrokeStyle(undefined, getDefaultValue());

        expect(result).toBeNull();
    });

    it('should return null when value is null', () =>
    {
        const result = toStrokeStyle(null, getDefaultValue());

        expect(result).toBeNull();
    });

    it('should convert Color to stroke style', () =>
    {
        const defaultStyle = getDefaultValue();
        const color = new Color(0xff0000);

        color.setAlpha(0.5);
        const result = toStrokeStyle(color, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            color: color.toNumber(),
            alpha: color.alpha,
        });
    });

    it('should convert color object to stroke style', () =>
    {
        const defaultStyle = getDefaultValue();
        const result = toStrokeStyle({ r: 255, g: 0, b: 0 }, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            color: 0xff0000,
        });
    });

    it('should convert FillPattern to stroke style', () =>
    {
        const defaultStyle = getDefaultValue();
        const pattern = new FillPattern(Texture.WHITE);
        const result = toStrokeStyle(pattern, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            fill: pattern,
            color: 0xffffff,
            alpha: 1,
            texture: pattern.texture,
            matrix: pattern.transform,
        });
    });

    it('should convert FillGradient to stroke style with global space', () =>
    {
        const defaultStyle = getDefaultValue();
        const gradient = new FillGradient(0, 0, 200, 0, 'global');
        const result = toStrokeStyle(gradient, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            fill: gradient,
            color: 0xffffff,
            alpha: 1,
            texture: gradient.texture,
            matrix: gradient.transform,
        });
    });

    it('should convert FillGradient to stroke style with local space', () =>
    {
        const defaultStyle = getDefaultValue();
        const gradient = new FillGradient(0, 0, 200, 0, 'local');
        const result = toStrokeStyle(gradient, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            textureSpace: 'local',
            fill: gradient,
            color: 0xffffff,
            alpha: 1,
            texture: gradient.texture,
            matrix: gradient.transform,
        });
    });

    it('should convert stroke object to stroke style', () =>
    {
        const defaultStyle = getDefaultValue();
        const result = toStrokeStyle({ color: 0xff0000, alpha: 0.5, width: 4 }, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            color: 0xff0000,
            width: 4,
            alpha: 0.5,
        });
    });

    it('should convert stroke object with Color to stroke style', () =>
    {
        const defaultStyle = getDefaultValue();
        const color = new Color(0xff0000);

        color.setAlpha(0.5);
        const result = toStrokeStyle({ color, alpha: 0.5 }, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            color: 0xff0000,
            alpha: 0.5 * 0.5, // alpha is multiplied
        });
    });

    it('should convert stroke object with fill to stroke style', () =>
    {
        const defaultStyle = getDefaultValue();
        const pattern = new FillPattern(Texture.WHITE);
        const result = toStrokeStyle({ fill: pattern, alpha: 0.5 }, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            fill: pattern,
            color: 0xffffff,
            alpha: 0.5,
            texture: pattern.texture,
            matrix: pattern.transform
        });
    });

    it('should convert stroke object with gradient to stroke style', () =>
    {
        const defaultStyle = getDefaultValue();
        const gradient = new FillGradient(0, 0, 200, 0, 'global');
        const result = toStrokeStyle({ fill: gradient, alpha: 0.5 }, defaultStyle);

        expect(result).toEqual({
            ...defaultStyle,
            fill: gradient,
            alpha: 0.5,
            color: 0xffffff,
            texture: gradient.texture,
            matrix: gradient.transform
        });
    });

    it('should only build FillGradient once', () =>
    {
        const defaultStyle = getDefaultValue();
        const gradient = new FillGradient(0, 0, 200, 0);

        toFillStyle(gradient, defaultStyle);

        const texture = gradient.texture;

        toFillStyle(gradient, defaultStyle);

        expect(texture).toBe(gradient.texture);
    });
});
