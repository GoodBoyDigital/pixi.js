import { Graphics } from '../../../../src/scene/graphics/shared/Graphics';

import type { Container } from '../../../../src/scene/container/Container';
import type { TestScene } from '../../types';

export const scene: TestScene = {
    it: 'should set tint of graphics correctly',
    only: true,
    create: async (scene: Container) =>
    {
        const rect = new Graphics().rect(0, 0, 100, 100).fill('black');

        // should remain black!
        rect.tint = 0xff0000;

        scene.addChild(rect);
    },
};
