import { Assets } from '../../../../../src/assets/Assets';
import { Filter } from '../../../../../src/filters/Filter';
import { Sprite } from '../../../../../src/scene/sprite/Sprite';
import circleFrag from './circle.frag';
import circleVert from './circle.vert';
import circleWgsl from './circle.wgsl';

import type { Container } from '../../../../../src/scene/container/Container';
import type { TestScene } from '../../../types';

export const scene: TestScene = {
    it: 'do not clip to viewport filter texture',
    create: async (scene: Container) =>
    {
        const texture = await Assets.load('desert.jpg');
        const sprite = new Sprite({
            texture,
            width: 128,
            height: 128,
        });

        sprite.x = -64;

        const customFilter = Filter.from({
            clipToViewport: false,
            gpu: {
                vertex: {
                    source: circleWgsl,
                    entryPoint: 'mainVertex',
                },
                fragment: {
                    source: circleWgsl,
                    entryPoint: 'mainFragment',
                },
            },
            gl: {
                vertex: circleVert,
                fragment: circleFrag,
            },
        });

        sprite.filters = customFilter;

        scene.addChild(sprite);
    },
};
