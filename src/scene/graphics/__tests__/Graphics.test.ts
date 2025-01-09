import { Graphics } from '../shared/Graphics';
import { GraphicsContext } from '../shared/GraphicsContext';
import { GraphicsPath } from '../shared/path/GraphicsPath';
import { toFillStyle } from '../shared/utils/convertFillInputToFillStyle';
import { getWebGLRenderer } from '@test-utils';
import { Matrix } from '~/maths';
import { Texture } from '~/rendering';

describe('Graphics', () =>
{
    describe('constructor', () =>
    {
        it('should set defaults', () =>
        {
            const graphics = new Graphics();

            expect(graphics.fillStyle.color).toEqual(0xFFFFFF);
            expect(graphics.fillStyle.alpha).toEqual(1);
            expect(graphics.strokeStyle.width).toEqual(1);
            expect(graphics.strokeStyle.color).toEqual(0xffffff);
            expect(graphics.tint).toEqual(0xFFFFFF);
            expect(graphics.blendMode).toEqual('inherit');
        });
    });

    describe('utils', () =>
    {
        it('should parse the alpha component from a color string value', () =>
        {
            const style = toFillStyle({ color: '#ff000080' }, GraphicsContext.defaultFillStyle);

            expect(style.alpha).toBe(0.5);
        });

        it('should multiply alpha component from a color string value with a passed alpha value', () =>
        {
            const style = toFillStyle(
                { color: '#ff000080', alpha: 0.5 },
                GraphicsContext.defaultFillStyle
            );

            expect(style.alpha).toBe(0.25);
        });
    });

    describe('Stroke & Fill', () =>
    {
        it('should support stroke object parameter and use defaults', () =>
        {
            const graphics = new Graphics();
            const matrix = new Matrix();
            const texture = Texture.WHITE;

            graphics.strokeStyle = {
                width: 1,
                alpha: 0.5,
                color: 0xff0000,
                matrix,
                texture,
                alignment: 1,
            };

            expect(graphics.strokeStyle).toEqual({
                ...GraphicsContext.defaultStrokeStyle,
                width: 1,
                alpha: 0.5,
                color: 0xff0000,
                matrix,
                texture,
                alignment: 1,
            });

            // expect defaults from empty assignment
            graphics.strokeStyle = {};

            expect(graphics.strokeStyle).toEqual({
                ...GraphicsContext.defaultStrokeStyle,
                matrix: null,
                texture: Texture.WHITE,
            });

            graphics.destroy();
        });

        it('should support fill object parameter and use defaults', () =>
        {
            const graphics = new Graphics();
            const matrix = new Matrix();
            const texture = Texture.WHITE;

            graphics.fillStyle = {
                color: 0xff0000,
                alpha: 0.5,
                matrix,
                texture,
            };

            expect(graphics.fillStyle).toEqual({
                ...GraphicsContext.defaultFillStyle,
                color: 0xff0000,
                alpha: 0.5,
                matrix,
                texture,
            });

            // expect defaults from empty assignment
            graphics.fillStyle = {};

            expect(graphics.fillStyle).toEqual({
                ...GraphicsContext.defaultFillStyle,
                matrix: null,
                texture: Texture.WHITE,
            });

            graphics.destroy();
        });
    });

    describe('tint', () =>
    {
        it('should allow for other color sources', () =>
        {
            const graphics = new Graphics();

            graphics.tint = 'red';
            expect(graphics.tint).toEqual(0xff0000);
            graphics.destroy();
        });
    });

    describe('chaining', () =>
    {
        it('should chain draw commands', () =>
        {
            const texture = Texture.WHITE;
            const graphics = new Graphics();

            graphics
                .texture(texture, 'red')
                .beginPath()
                .cut()
                .arc(100, 100, 50, 0, Math.PI)
                .arcTo(100, 100, 200, 200, 50)
                .arcToSvg(50, 50, 0, 1, 0, 100, 100)
                .bezierCurveTo(100, 100, 200, 200, 300, 300)
                .closePath()
                .ellipse(100, 100, 50, 75)
                .circle(100, 100, 50)
                .path(new GraphicsPath())
                .setStrokeStyle({ width: 1, color: 0xffffff, alpha: 1, texture })
                .setFillStyle({ color: 0xffffff, alpha: 1, texture })
                .lineTo(200, 200)
                .moveTo(100, 100)
                .quadraticCurveTo(100, 100, 200, 200)
                .rect(100, 100, 200, 150)
                .roundRect(100, 100, 200, 150, 20)
                .poly([100, 100, 200, 200, 300, 300], true)
                .star(100, 100, 5, 70, 35, Math.PI / 4)
                .svg('<svg></svg>')
                .restore()
                .save()
                .resetTransform()
                .rotateTransform(Math.PI / 4)
                .scaleTransform(1.5)
                .setTransform(new Matrix())
                .transform(new Matrix())
                .translateTransform(100, 100)
                .clear();

            // just to pass test, the chaining above is the real test
            expect(graphics).not.toBeUndefined();
        });

        it('should destroy correctly if there are no batches', async () =>
        {
            const renderer = await getWebGLRenderer();

            const container = new Graphics();

            const rect = new Graphics();

            rect.rect(192, 192, 128, 128);

            container.addChild(rect);
            renderer.render(container);

            rect.clear();
            renderer.render(container);

            // dont throw an error:
            expect(() => rect.destroy()).not.toThrow();
        });

        it('should destroy the graphics after the renderer has been destroyed', async () =>
        {
            const renderer = await getWebGLRenderer();

            const container = new Graphics();

            const rect = new Graphics();

            rect.rect(192, 192, 128, 128);

            container.addChild(rect);
            renderer.render(container);

            rect.clear();
            renderer.render(container);

            renderer.destroy();

            // dont throw an error:
            expect(() => rect.destroy()).not.toThrow();
        });

        it('should  calculate the buffer sizes for large graphics correctly', async () =>
        {
            const renderer = await getWebGLRenderer();

            const graphics = new Graphics()
                .rect(0, 0, 1000, 1000)
                .rect(1000, 1000, 1000, 1000)
                .rect(2000, 2000, 1000, 1000)
                .fill('red');

            graphics.context.batchMode = 'no-batch';

            renderer.render(graphics);

            const graphicsData = renderer.graphicsContext['_graphicsDataContextHash'][graphics.context.uid];

            expect(graphicsData.batcher.geometry.indexBuffer.data.length).toEqual(3 * 6);
            expect(graphicsData.batcher.geometry.buffers[0].data.length).toEqual(3 * 4 * 6);
        });

        it('should clear a graphics correctly', async () =>
        {
            const graphics = new Graphics()
                .rect(0, 0, 1000, 1000)
                .rect(1000, 1000, 1000, 1000)
                .rect(2000, 2000, 1000, 1000);

            graphics.clear();

            expect(graphics.context['_activePath'].instructions.length).toEqual(0);
            expect(graphics.context.instructions.length).toEqual(0);
            expect(graphics.context['_transform'].toArray()).toEqual(Matrix.IDENTITY.toArray());
        });
    });

    // todo: all these tests should be moved to GraphicsContext.test.ts, with equivalent changes for api
    // ticket: https://github.com/orgs/pixijs/projects/2/views/4?pane=issue&itemId=44801478
    // eslint-disable-next-line jest/no-commented-out-tests
    // it.skip('should support adaptive curves', () =>
    // {
    //     const defMode = Graphics.curves.adaptive;
    //     const defMaxLen = Graphics.curves.maxLength;
    //     const myMaxLen = Graphics.curves.maxLength = 1.0;
    //     const graphics = new Graphics();

    //     Graphics.curves.adaptive = true;

    //     graphics.beginFill(0xffffff, 1.0);
    //     graphics.moveTo(610, 500);
    //     graphics.quadraticCurveTo(600, 510, 590, 500);
    //     graphics.endFill();

    //     const pointsLen = (graphics.geometry.graphicsData[0].shape as Polygon).points.length / 2;
    //     const arcLen = Math.PI / 2 * Math.sqrt(200);
    //     const estimate = Math.ceil(arcLen / myMaxLen) + 1;

    //     expect(pointsLen).toBeCloseTo(estimate, 2.0);

    //     Graphics.curves.adaptive = defMode;
    //     Graphics.curves.maxLength = defMaxLen;
    // });

    // eslint-disable-next-line jest/no-commented-out-tests
    // describe('geometry', () =>
    // {
    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('validateBatching should return false if any of textures is invalid', () =>
    //     {
    //         const graphics = new Graphics();
    //         const invalidTex = Texture.EMPTY;
    //         const validTex = Texture.WHITE;

    //         graphics.fillStyle = { texture: invalidTex };
    //         graphics.beginPath().rect(0, 0, 10, 10).fill().closePath();

    //         graphics.fillStyle = { texture: validTex };
    //         graphics.beginPath().rect(0, 0, 10, 10).fill().closePath();

    //         // graphics.beginTextureFill({ texture: invalidTex });
    //         // graphics.drawRect(0, 0, 10, 10);
    //         // graphics.beginTextureFill({ texture: validTex });
    //         // graphics.drawRect(0, 0, 10, 10);

    //         // const geometry = graphics.geometry;
    //         // const instructions = graphics.context.instructions;

    //         // expect(geometry['validateBatching']()).toBe(false);
    //     });

    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('validateBatching should return true if all textures is valid', () =>
    //     {
    //         const graphics = new Graphics();
    //         const validTex = Texture.WHITE;

    //         graphics.beginTextureFill({ texture: validTex });
    //         graphics.drawRect(0, 0, 10, 10);
    //         graphics.beginTextureFill({ texture: validTex });
    //         graphics.drawRect(0, 0, 10, 10);

    //         const geometry = graphics.geometry;

    //         expect(geometry['validateBatching']()).toBe(true);
    //     });

    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('should be batchable if graphicsData is empty', () =>
    //     {
    //         const graphics = new Graphics();
    //         const geometry = graphics.geometry;

    //         geometry.updateBatches();
    //         expect(geometry.batchable).toBe(true);
    //     });

    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('_compareStyles should return true for identical styles', () =>
    //     {
    //         const graphics = new Graphics();
    //         const geometry = graphics.geometry;

    //         const first = new FillStyle();

    //         first.color = 0xff00ff;
    //         first.alpha = 0.1;
    //         first.visible = true;

    //         const second = first.clone();

    //         expect(geometry['_compareStyles'](first, second)).toBe(true);

    //         const firstLine = new LineStyle();

    //         firststrokeStyle.color = 0xff00ff;
    //         firststrokeStyle.native = false;
    //         firststrokeStyle.alignment = 1;

    //         const secondLine = firststrokeStyle.clone();

    //         expect(geometry['_compareStyles'](firstLine, secondLine)).toBe(true);
    //     });

    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('should be 1 batch for same styles', () =>
    //     {
    //         const graphics = new Graphics();

    //         graphics.beginFill(0xff00ff, 0.5);
    //         graphics.drawRect(0, 0, 20, 20);
    //         graphics.drawRect(100, 0, 20, 20);

    //         const geometry = graphics.geometry;

    //         geometry.updateBatches();
    //         expect(geometry.batches).toHaveLength(1);
    //     });

    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('should be 2 batches for 2 different styles', () =>
    //     {
    //         const graphics = new Graphics();

    //         // first style
    //         graphics.beginFill(0xff00ff, 0.5);
    //         graphics.drawRect(0, 0, 20, 20);

    //         // second style
    //         graphics.beginFill(0x0, 0.5);
    //         graphics.drawRect(100, 0, 20, 20);

    //         // third shape with same style
    //         graphics.drawRect(0, 0, 20, 20);

    //         const geometry = graphics.geometry;

    //         geometry.updateBatches();
    //         expect(geometry.batches).toHaveLength(2);
    //     });

    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('should be 1 batch if fill and line are the same', () =>
    //     {
    //         const graphics = new Graphics();

    //         graphics.lineStyle(10.0, 0x00ffff);
    //         graphics.beginFill(0x00ffff);
    //         graphics.drawRect(50, 50, 100, 100);
    //         graphics.drawRect(150, 150, 100, 100);

    //         const geometry = graphics.geometry;

    //         geometry.updateBatches();
    //         expect(geometry.batches).toHaveLength(1);
    //     });

    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('should not use fill if triangulation does nothing', () =>
    //     {
    //         const graphics = new Graphics();

    //         graphics
    //             .lineStyle(2, 0x00ff00)
    //             .beginFill(0xff0000)
    //             .drawRect(0, 0, 100, 100)
    //             .moveTo(200, 0)
    //             .lineTo(250, 200);

    //         const geometry = graphics.geometry;

    //         geometry.updateBatches();
    //         expect(geometry.batches).toHaveLength(2);
    //         expect(geometry.batches[0].style.color).toEqual(0xff0000);
    //         expect(geometry.batches[0].size).toEqual(6);
    //         expect(geometry.batches[1].style.color).toEqual(0x00ff00);
    //         expect(geometry.batches[1].size).toEqual(30);
    //     });
    // });
});
