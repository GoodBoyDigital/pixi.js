import { Assets } from '../../../../src/assets/Assets';
import { Container } from '../../../../src/scene/container/Container';
import { FillGradient } from '../../../../src/scene/graphics/shared/fill/FillGradient';
import { Graphics } from '../../../../src/scene/graphics/shared/Graphics';

import type { TestScene } from '../../types';

export const scene: TestScene = {
    it: 'render correct render fills',
    create: async (scene: Container) =>
    {
        const grad = new FillGradient(0, 0, 50, 50, 'global');

        const texture = await Assets.load('bg_scene_rotate.jpg');

        grad.addColorStop(0, 'red');
        grad.addColorStop(1, 'blue');

        const grad2 = new FillGradient(0, 0, 0, 1, 'local');

        grad2.addColorStop(0, 'blue');
        grad2.addColorStop(1, 'yellow');

        const g1 = new Graphics().rect(0, 0, 100, 100).fill({ texture, textureSpace: 'local' });
        const g2 = new Graphics().rect(0, 0, 100, 100).fill({ texture, textureSpace: 'global' });
        const g3 = new Graphics().rect(0, 0, 100, 100).fill({ fill: grad });
        const g4 = new Graphics().rect(0, 0, 100, 100).fill({ fill: grad2 });

        g2.x = 100;
        g3.y = 100;
        g4.x = 100;
        g4.y = 100;

        const allRects = new Container();

        allRects.addChild(g1, g2, g3, g4);

        allRects.setSize(128, 128);
        scene.addChild(allRects);
    },
};
