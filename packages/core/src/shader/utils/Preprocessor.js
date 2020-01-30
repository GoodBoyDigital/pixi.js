/**
 * Created by hazed on 30.01.2020.
 */

import { setPrecision } from './setPrecision.js';
import { getMaxFragmentPrecision } from './getMaxFragmentPrecision.js';
import { PRECISION } from '@pixi/constants';
import { settings } from '@pixi/settings';

const nameCache = {};

/**
 * Helper class to preprocessing a shader program.
 *
 * @class
 * @memberof PIXI
 */
export class Preprocessor
{
    /**
     * @param {string} [vertexSrc] - The source of the vertex shader.
     * @param {string} [fragmentSrc] - The source of the fragment shader.
     * @param {string} [name=pixi-shader] - Name for shader
     * @param {object} [options = { isRawShader: false, defines: {} }] - Options for preprocessor,
     *  include isRawShader and defines, of other for custom preprocessors
     */
    constructor(vertexSrc, fragmentSrc, name = 'pixi-shader', options = { isRawShader: false, defines: {} })
    {
        this.vertex = vertexSrc.trim();
        this.fragment = fragmentSrc.trim();

        options.isRawShader = options.isRawShader || (this.vertex.substring(0, 8) === '#version');

        if (!options.isRawShader)
        {
            name = name.replace(/\s+/g, '-');

            if (nameCache[name])
            {
                nameCache[name]++;
                name += `-${nameCache[name]}`;
            }
            else
            {
                nameCache[name] = 1;
            }

            // Setup default define for shader name
            options.defines.SHADER_NAME = name;

            // Setup custom defines
            for (const define in options.defines)
            {
                const value = options.defines[define];

                this.vertex = `#define ${define} ${value}\n${this.vertex}`;
                this.fragment = `#define ${define} ${value}\n${this.fragment}`;
            }

            this.vertex = setPrecision(this.vertex, settings.PRECISION_VERTEX, PRECISION.HIGH);
            this.fragment = setPrecision(this.fragment, settings.PRECISION_FRAGMENT, getMaxFragmentPrecision());
        }
    }
}
