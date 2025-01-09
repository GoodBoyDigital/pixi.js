import { BlurFilter } from '../../../../src/filters/defaults/blur/BlurFilter';
import { Graphics } from '../../../../src/scene/graphics/shared/Graphics';

import type { Container } from '../../../../src/scene/container/Container';
import type { TestScene } from '../../types';

export const scene: TestScene = {
    it: 'should correctly render a blurred black and white square',
    create: async (scene: Container) =>
    {
        const graphics = new Graphics()
            .rect(0, 0, 50, 50)
            .fill(0x000000)
            .rect(25, 25, 50, 50)
            .fill(0xffffff);

        graphics.position.set((128 - 75) / 2);

        graphics.filters = [new BlurFilter({ strength: 15, quality: 3 })];

        scene.addChild(graphics);
    },
};
