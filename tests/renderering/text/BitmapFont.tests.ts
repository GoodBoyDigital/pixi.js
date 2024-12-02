/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { groupD8 } from '../../../src';
import { Cache } from '../../../src/assets/cache/Cache';
import { Rectangle } from '../../../src/maths/shapes/Rectangle';
import { Texture } from '../../../src/rendering/renderers/shared/texture/Texture';
import { TextStyle } from '../../../src/scene/text/TextStyle';
import { BitmapFont } from '../../../src/scene/text-bitmap/BitmapFont';
import { BitmapFontManager } from '../../../src/scene/text-bitmap/BitmapFontManager';

describe('BitmapFont', () =>
{
    describe('from', () =>
    {
        afterEach(() =>
        {
            Cache.reset();
        });

        // eslint-disable-next-line func-names
        it('should register the font if a name is provided', function ()
        {
            jest.setTimeout(8000);
            const key = 'foo-bitmap';

            expect(Cache.has(key)).toBeFalse();

            BitmapFontManager.install({
                name: 'foo',
                style: {
                    fontFamily: 'Arial'
                }
            });

            expect(Cache.has(key)).toBeTrue();
        });

        // should have a test for BitmapFontManager.getFont() here
        it('should return the same font with getFont', () =>
        {
            const font1 = BitmapFontManager.getFont('foo', new TextStyle({ fontFamily: 'Arial' }));
            const font2 = BitmapFontManager.getFont('foo', new TextStyle({ fontFamily: 'Arial' }));

            expect(font1).toEqual(font2);
        });

        it('should draw all characters in a provided range', () =>
        {
            const font = BitmapFontManager.install({
                name: 'foo',
                chars: [['a', 'z']]
            });

            expect(Object.keys(font.chars).length).toEqual(26);
        });

        it('should draw emojis', () =>
        {
            const emojis = ['🔥', '🌏', '😀'];
            const font = BitmapFontManager.install('foo', {}, { chars: [emojis.join('')] });

            expect(Object.keys(font.chars).length).toEqual(emojis.length);

            const charIdKeys = Object.keys(font.chars).map((key) => String(font.chars[key].id));

            for (const emoji of emojis)
            {
                const char = String(emoji.codePointAt(0));

                expect(charIdKeys).toContain(char);
            }
        });

        it('should throw an error when an invalid range is given', () =>
        {
            expect(() => BitmapFontManager.install('foo', {}, { chars: [['l', 'i', 'm']] })).toThrow();
        });

        it('should throw an error when an invalid start/end of range', () =>
        {
            expect(() => BitmapFontManager.install('foo', {}, { chars: [['z', 'a']] })).toThrow();
        });

        it('should render resolution with proportional size', () =>
        {
            // resolution is adjust based on the size of the font, the base size is 100, so thats what
            // the size needs to be get the 1-1 resolution in this test
            const fontRes1 = BitmapFontManager.install('foo', { fontSize: 100 }, { chars: 'a' });
            const fontRes2 = BitmapFontManager.install('bar', { fontSize: 100 }, { chars: 'a', resolution: 2 });

            expect(fontRes1.chars['a'].texture.source.resolution).toEqual(1);
            expect(fontRes2.chars['a'].texture.source.resolution).toEqual(2);
        });

        it('should override and replace font', () =>
        {
            BitmapFontManager.install('foo', {}, { chars: 'a' });
            expect(Object.keys(Cache.get<BitmapFont>('foo-bitmap')!.chars)).toHaveLength(1);

            BitmapFontManager.install('foo', {}, { chars: 'bc' });
            expect(Object.keys(Cache.get<BitmapFont>('foo-bitmap')!.chars)).toHaveLength(2);
            expect(Cache.get<BitmapFont>('foo-bitmap')!.chars['a']).toBeUndefined();
        });

        it('should throw an error when no characters are passed', () =>
        {
            expect(() => BitmapFontManager.install('foo', {}, { chars: [] })).toThrow();
        });

        it('should use sub-texture as a font texture', () =>
        {
            const frame = new Rectangle(10, 20, 100, 100);
            const texture = new Texture({
                frame,
            });
            const font = new BitmapFont({
                textures: [texture],
                data: {
                    baseLineOffset: 0,
                    chars: {
                        a: {
                            id: 65,
                            page: 0,
                            x: 0,
                            y: 0,
                            width: 10,
                            height: 10,
                            letter: 'a',
                            xOffset: 0,
                            yOffset: 0,
                            kerning: {},
                            xAdvance: 0,
                        },
                    },
                    pages: [{ id: 0, file: '' }],
                    lineHeight: 12,
                    fontSize: 10,
                    fontFamily: 'font',
                }
            });

            expect(font.chars.a.texture.frame.x).toBe(10);
            expect(font.chars.a.texture.frame.y).toBe(20);
        });

        it('should take texture rotation into account', () =>
        {
            const texture = new Texture({ rotate: groupD8.S });
            const font = new BitmapFont({
                textures: [texture],
                data: {
                    baseLineOffset: 0,
                    chars: {
                        a: {
                            id: 65,
                            page: 0,
                            x: 0,
                            y: 0,
                            width: 10,
                            height: 10,
                            letter: 'a',
                            xOffset: 0,
                            yOffset: 0,
                            kerning: {},
                            xAdvance: 0,
                        },
                    },
                    pages: [{ id: 0, file: '' }],
                    lineHeight: 10,
                    fontSize: 10,
                    fontFamily: 'font'
                }
            });

            expect(font.chars.a.texture.rotate).toBe(groupD8.S);
        });
    });
});
