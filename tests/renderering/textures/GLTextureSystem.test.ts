import { type WebGLRenderer } from '../../../src';
import { getRenderer } from '../../utils/getRenderer';
import { getTexture } from '../../utils/getTexture';

describe('GLTextureSystem', () =>
{
    it('should generate canvas from texture', async () =>
    {
        const renderer = (await getRenderer()) as WebGLRenderer;
        const texture = getTexture({ width: 10, height: 10 });
        const canvas = renderer.texture.generateCanvas(texture);

        expect(canvas).toBeInstanceOf(HTMLCanvasElement);
        expect(canvas.width).toBe(texture.width);
        expect(canvas.height).toBe(texture.height);
    });

    it('should get pixels from texture', async () =>
    {
        const renderer = (await getRenderer()) as WebGLRenderer;
        const texture = getTexture({ width: 10, height: 10 });
        const pixelInfo = renderer.texture.getPixels(texture);

        expect(pixelInfo.pixels.length).toBe(texture.width * texture.height * 4);
        expect(pixelInfo.width).toBe(texture.width);
        expect(pixelInfo.height).toBe(texture.height);
    });
});
