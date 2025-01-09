import { Graphics } from '../../../../src/scene/graphics/shared/Graphics';

import type { Container } from '../../../../src/scene/container/Container';
import type { TestScene } from '../../types';

export const scene: TestScene = {
    it: 'should svg gradients correctly',
    create: async (scene: Container) =>
    {
        const fourRects = `
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Fill gradients -->
                <linearGradient id="fillGrad1">  <!-- Horizontal left to right -->
                    <stop offset="0" stop-color="red"/>
                    <stop offset="1" stop-color="blue"/>
                </linearGradient>
                
                <linearGradient id="fillGrad2">  <!-- Vertical top to bottom -->
                    <stop offset="0" stop-color="yellow"/>
                    <stop offset="1" stop-color="green"/>
                </linearGradient>
                
                <!-- Stroke gradients -->
                <linearGradient id="strokeGrad1">  <!-- Diagonal top-left to bottom-right -->
                    <stop offset="0" stop-color="purple"/>
                    <stop offset="1" stop-color="orange"/>
                </linearGradient>
                
                <linearGradient id="strokeGrad2">  <!-- Diagonal top-right to bottom-left -->
                    <stop offset="0" stop-color="cyan"/>
                    <stop offset="1" stop-color="magenta"/>
                </linearGradient>
            </defs>

            <!-- Rest of SVG remains unchanged -->
            <rect x="20" y="20" 
                width="150" height="150"
                fill="url(#fillGrad1)"
                stroke="url(#strokeGrad1)"
                stroke-width="10"/>

            <rect x="220" y="20" 
                width="150" height="150"
                style="fill:url(#fillGrad2); 
                        stroke:url(#strokeGrad2); 
                        stroke-width: 10;"/>

            <rect x="20" y="220" 
                width="150" height="150"
                fill="url(#fillGrad1)"
                style="stroke:url(#strokeGrad2); 
                        stroke-width: 10;"/>

            <rect x="220" y="220" 
                width="150" height="150"
                stroke="url(#strokeGrad1)"
                stroke-width="10"
                style="fill: url(#fillGrad2);"/>
        </svg>`;

        const svg = new Graphics().svg(fourRects);

        svg.setSize(118, 118);

        scene.addChild(svg);
    },
};
