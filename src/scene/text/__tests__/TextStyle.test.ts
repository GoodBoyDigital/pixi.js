/* eslint-disable jest/no-commented-out-tests */
import { FillGradient } from '../../graphics/shared/fill/FillGradient';
import { FillPattern } from '../../graphics/shared/fill/FillPattern';
import { GraphicsContext } from '../../graphics/shared/GraphicsContext';
import { HTMLTextStyle } from '../../text-html/HTMLTextStyle';
import { TextStyle } from '../TextStyle';
import { Color } from '~/color';
import { Texture } from '~/rendering';

import type { TextStyleOptions } from '../TextStyle';

describe('TextStyle', () =>
{
    it('reset reverts style to default', () =>
    {
        const textStyle = new TextStyle();
        const defaultFontSize = textStyle.fontSize;

        textStyle.fontSize = 1000;

        expect(textStyle.fontSize).toEqual(1000);
        textStyle.reset();
        expect(textStyle.fontSize).toEqual(defaultFontSize);
    });

    it('should clone correctly', () =>
    {
        const textStyle = new TextStyle({ fontSize: 1000 });

        const clonedTextStyle = textStyle.clone();

        expect(textStyle.fontSize).toEqual(1000);
        expect(clonedTextStyle.fontSize).toEqual(textStyle.fontSize);
    });

    it('should assume pixel fonts', () =>
    {
        // note: had to convert to HTMLTextStyle since textStyleToCSS only supports it
        const style = new HTMLTextStyle({ fontSize: 72 });
        const font = style.cssStyle;

        expect(font).toBeString();
        expect(font).toContain('font-size: 72px');
    });

    it('should handle multiple fonts as array', () =>
    {
        const fontFamily = ['Georgia', 'Arial', 'sans-serif'];
        const style = new HTMLTextStyle({
            fontFamily,
        });

        expect(style.cssStyle).toContain(fontFamily.join(','));
    });

    it('should handle multiple fonts as string', () =>
    {
        const style = new HTMLTextStyle({
            fontFamily: 'Georgia,"Arial",sans-serif',
        });

        expect(style.cssStyle).toContain(style.fontFamily);
    });

    // note: gradients?
    // it('should not shared array / object references between different instances', () =>
    // {
    //     const defaultStyle = new TextStyle();
    //     const style = new TextStyle();

    //     expect(defaultStyle.fillGradientStops.length).toEqual(style.fillGradientStops.length);
    //     style.fillGradientStops.push(0);
    //     expect(defaultStyle.fillGradientStops.length).not.toEqual(style.fillGradientStops.length);
    // });

    it('should not quote generic font families when calling toFontString', () =>
    {
        // Should match the list in TextStyle
        const genericFontFamilies = [
            'serif',
            'sans-serif',
            'monospace',
            'cursive',
            'fantasy',
            'system-ui',
        ];

        // Regex to find any of the generic families surrounded by either type of quote mark
        const incorrectRegexTemplate = '["\']FAMILY["\']';

        for (const genericFamily of genericFontFamilies)
        {
            const style = new HTMLTextStyle({
                fontFamily: ['Georgia', 'Arial', genericFamily],
            });

            // Create regex from template substituting target family
            const regex = new RegExp(incorrectRegexTemplate.replace('FAMILY', genericFamily));
            const result = style.cssStyle.match(regex);

            expect(result).toBeNull();
        }
    });

    it('should convert dropShadow properties', () =>
    {
        const style = {
            dropShadow: true,
            dropShadowAlpha: 0.5,
            dropShadowAngle: 45,
            dropShadowBlur: 10,
            dropShadowColor: 0x000000,
            dropShadowDistance: 5,
        };

        const textstyle = new TextStyle(style);

        expect(textstyle.dropShadow).toEqual({
            alpha: 0.5,
            angle: 45,
            blur: 10,
            color: 0x000000,
            distance: 5,
        });

        const style2 = {
            dropShadow: false,
            dropShadowAlpha: 0.5,
        };

        const textstyle2 = new TextStyle(style2);

        expect(textstyle2.dropShadow).toBeNull();
    });

    it('should convert strokeThickness property for colors', () =>
    {
        const style = {
            stroke: 0xff0000,
            strokeThickness: 5,
        };

        expect(new TextStyle(style)._stroke).toEqual({
            ...GraphicsContext.defaultStrokeStyle,
            color: 0xff0000,
            width: 5,
        });

        const style2 = {
            stroke: new Color(0xff0000),
            strokeThickness: 5,
        };

        expect(new TextStyle(style2)._stroke).toEqual({
            ...GraphicsContext.defaultStrokeStyle,
            color: 0xff0000,
            width: 5,
        });

        const style3 = {
            stroke: {
                color: 0xff0000,
            },
            strokeThickness: 5,
        };

        expect(new TextStyle(style3)._stroke).toEqual({
            ...GraphicsContext.defaultStrokeStyle,
            color: 0xff0000,
            width: 5,
        });

        const style4 = {
            stroke: {
                color: new Color(0xff0000),
            },
            strokeThickness: 5,
        };

        expect(new TextStyle(style4)._stroke).toEqual({
            ...GraphicsContext.defaultStrokeStyle,
            color: 0xff0000,
            width: 5,
        });
    });

    it('should keep other stroke properties', () =>
    {
        const style: TextStyleOptions & {strokeThickness: number} = {
            stroke: {
                color: 0xff0000,
                alignment: 0.5,
                cap: 'round',
                join: 'round',
                miterLimit: 15,
            },
            strokeThickness: 5,
        };

        expect(new TextStyle(style)._stroke).toEqual({
            ...GraphicsContext.defaultStrokeStyle,
            color: 0xff0000,
            width: 5,
            alignment: 0.5,
            cap: 'round',
            join: 'round',
            miterLimit: 15,
        });
    });

    it('should convert fill object to FillPattern', () =>
    {
        const pattern = new FillPattern(Texture.WHITE);
        const style = {
            stroke: pattern,
            strokeThickness: 5,
        };

        const textStyle = new TextStyle(style);

        expect(textStyle._stroke.fill).toBeInstanceOf(FillPattern);
        expect(textStyle._stroke).toEqual({
            ...GraphicsContext.defaultStrokeStyle,
            fill: pattern,
            width: 5,
            texture: pattern.texture,
            matrix: pattern.transform,
        });
    });

    it('should convert fillGradientStops array to FillGradient', () =>
    {
        const style = {
            fillGradientStops: [0x000000, 0xff0000, 0xFFFFFF],
        };

        const textStyle = new TextStyle(style as TextStyleOptions);

        expect(textStyle._fill.fill).toBeInstanceOf(FillGradient);
        expect((textStyle._fill.fill as FillGradient).colorStops).toEqual([
            { offset: 0, color: '#000000ff' },
            { offset: 0.5, color: '#ff0000ff' },
            { offset: 1, color: '#ffffffff' },
        ]);
    });
});
