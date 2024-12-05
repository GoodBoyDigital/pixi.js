import { Text } from '~/scene/text/Text';
import { BitmapText } from '~/scene/text-bitmap/BitmapText';

import type { TestScene } from '../../types';
import type { Container } from '~/scene/container/Container';

export const scene: TestScene = {
    it: 'should render large italics correctly',
    options: {
        width: 256,
        height: 128,
    },
    create: async (scene: Container) =>
    {
        scene.addChild(new BitmapText({
            text: 'WORLD',
            style: {
                fill: 'white',
                fontStyle: 'italic',
                fontSize: 64,
                fontWeight: 'bold',
            }
        }));

        scene.addChild(new Text({
            text: 'WORLD',
            style: {
                fill: 'white',
                fontStyle: 'italic',
                fontWeight: 'bold',
                fontSize: 64
            }
        })).position.set(0, 64);
    },
};
