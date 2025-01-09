import { basePath } from '@test-utils';
import { Assets } from '~/assets';
import { Matrix } from '~/maths';
import { FillGradient, Graphics } from '~/scene';

import type { TestScene } from '../../types';
import type { Texture } from '~/rendering';
import type { Container } from '~/scene';

export const scene: TestScene = {
    it: 'should render rects with fills, strokes, gradients using textures',
    // TODO - fix this test on the CI - it works fine locally, but renders without texture wrapping on the CI. Mystery!
    skipCI: true,
    create: async (scene: Container) =>
    {
        const texture = await Assets.load<Texture>({
            src: `${basePath}textures/bunny.png`,
            data: {
                resolution: 1,
                width: 13,
                height: 19,
            }
        });
        const texture2 = await Assets.load<Texture>({
            src: `${basePath}textures/piece-newt-single.png`,
            data: {
                resolution: 1,
            }
        });

        // texture fill
        const rect1 = new Graphics();

        rect1.rect(50, 0, 50, 50).fill({ texture, textureSpace: 'global' });
        scene.addChild(rect1);

        // gradient fill
        const rect2 = new Graphics();
        const gradient = new FillGradient(0, 0, 50, 50, 'global');

        gradient.addColorStop(0, 0xff0000);
        gradient.addColorStop(0.5, 0x00ff00);
        gradient.addColorStop(1, 0x0000ff);

        rect2.rect(0, 0, 50, 50).fill(gradient);
        scene.addChild(rect2);

        // texture fill & transform matrix on texture
        const rect3 = new Graphics();

        rect3.rect(0, 50, 50, 50).fill({ texture, textureSpace: 'global', matrix: new Matrix().rotate(0.5).scale(0.5, 1) });
        scene.addChild(rect3);

        // line with texture fill
        const line = new Graphics();

        line.lineTo(50, 50).stroke({ width: 5, texture, textureSpace: 'global' })
            .moveTo(0, 50).lineTo(50, 0)
            .stroke({ width: 10, texture, textureSpace: 'global' });
        scene.addChild(line);

        // rect with separate texture fill
        const rect4 = new Graphics();

        rect4.rect(50, 50, 50, 50).fill({ texture: texture2, textureSpace: 'global', matrix: new Matrix().scale(0.2, 0.2) })
            .stroke({ width: 5, texture, color: 0xff0000, textureSpace: 'global' });

        scene.addChild(rect4);
    },
};
