// import * as from '../systems/shader/shader';
import { Preprocessor,
    defaultValue,
    compileProgram,
    mapSize,
    mapType,
    getTestContext } from './utils';
import { ProgramCache } from '@pixi/utils';
import defaultFragment from './defaultProgram.frag';
import defaultVertex from './defaultProgram.vert';

let UID = 0;

/**
 * Helper class to create a shader program.
 *
 * @class
 * @memberof PIXI
 */
export class Program
{
    /**
     * @param {string} [vertexSrc] - The source of the vertex shader.
     * @param {string} [fragmentSrc] - The source of the fragment shader.
     * @param {string} [name] - Name for shader
     * @param {object} [options = { isRawShader: false, defines: {} }] - Options for preprocessor,
     *  include isRawShader and defines, of other for custom preprocessors
     * @param {object} [preprocessor] - Object to preprocessing the shader program
     */
    constructor(vertexSrc, fragmentSrc, name, options, preprocessor)
    {
        this.id = UID++;

        if (!preprocessor)
        {
            preprocessor = new Preprocessor(
                vertexSrc || Program.defaultVertexSrc,
                fragmentSrc || Program.defaultFragmentSrc,
                name,
                options);
        }

        /**
         * The vertex shader.
         *
         * @member {string}
         */
        this.vertexSrc = preprocessor.vertex;

        /**
         * The fragment shader.
         *
         * @member {string}
         */
        this.fragmentSrc = preprocessor.fragment;

        // currently this does not extract structs only default types
        this.extractData(this.vertexSrc, this.fragmentSrc);

        // this is where we store shader references..
        this.glPrograms = {};

        this.syncUniforms = null;
    }

    /**
     * Extracts the data for a buy creating a small test program
     * or reading the src directly.
     * @protected
     *
     * @param {string} [vertexSrc] - The source of the vertex shader.
     * @param {string} [fragmentSrc] - The source of the fragment shader.
     */
    extractData(vertexSrc, fragmentSrc)
    {
        const gl = getTestContext();

        if (gl)
        {
            const program = compileProgram(gl, vertexSrc, fragmentSrc);

            this.attributeData = this.getAttributeData(program, gl);
            this.uniformData = this.getUniformData(program, gl);

            gl.deleteProgram(program);
        }
        else
        {
            this.uniformData = {};
            this.attributeData = {};
        }
    }

    /**
     * returns the attribute data from the program
     * @private
     *
     * @param {WebGLProgram} [program] - the WebGL program
     * @param {WebGLRenderingContext} [gl] - the WebGL context
     *
     * @returns {object} the attribute data for this program
     */
    getAttributeData(program, gl)
    {
        const attributes = {};
        const attributesArray = [];

        const totalAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

        for (let i = 0; i < totalAttributes; i++)
        {
            const attribData = gl.getActiveAttrib(program, i);
            const type = mapType(gl, attribData.type);

            /*eslint-disable */
            const data = {
                type: type,
                name: attribData.name,
                size: mapSize(type),
                location: 0,
            };
            /* eslint-enable */

            attributes[attribData.name] = data;
            attributesArray.push(data);
        }

        attributesArray.sort((a, b) => (a.name > b.name) ? 1 : -1); // eslint-disable-line no-confusing-arrow

        for (let i = 0; i < attributesArray.length; i++)
        {
            attributesArray[i].location = i;
        }

        return attributes;
    }

    /**
     * returns the uniform data from the program
     * @private
     *
     * @param {webGL-program} [program] - the webgl program
     * @param {context} [gl] - the WebGL context
     *
     * @returns {object} the uniform data for this program
     */
    getUniformData(program, gl)
    {
        const uniforms = {};

        const totalUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

        // TODO expose this as a prop?
        // const maskRegex = new RegExp('^(projectionMatrix|uSampler|translationMatrix)$');
        // const maskRegex = new RegExp('^(projectionMatrix|uSampler|translationMatrix)$');

        for (let i = 0; i < totalUniforms; i++)
        {
            const uniformData = gl.getActiveUniform(program, i);
            const name = uniformData.name.replace(/\[.*?\]/, '');

            const isArray = uniformData.name.match(/\[.*?\]/, '');
            const type = mapType(gl, uniformData.type);

            /*eslint-disable */
            uniforms[name] = {
                type: type,
                size: uniformData.size,
                isArray:isArray,
                value: defaultValue(type, uniformData.size),
            };
            /* eslint-enable */
        }

        return uniforms;
    }

    /**
     * The default vertex shader source
     *
     * @static
     * @constant
     * @member {string}
     */
    static get defaultVertexSrc()
    {
        return defaultVertex;
    }

    /**
     * The default fragment shader source
     *
     * @static
     * @constant
     * @member {string}
     */
    static get defaultFragmentSrc()
    {
        return defaultFragment;
    }

    /**
     * A short hand function to create a program based of a vertex and fragment shader
     * this method will also check to see if there is a cached program.
     *
     * @param {string} [vertexSrc] - The source of the vertex shader.
     * @param {string} [fragmentSrc] - The source of the fragment shader.
     * @param {string} [name=pixi-shader] - Name for shader
     * @param {object} [options = { isRawShader: false, defines: {} }] - Options for preprocessor,
     *  include isRawShader and defines, of other for custom preprocessors
     * @param {object} [preprocessor] - Object to preprocessing the shader program
     *
     * @returns {PIXI.Program} an shiny new Pixi shader!
     */
    static from(vertexSrc, fragmentSrc, name, options, preprocessor)
    {
        preprocessor = preprocessor || new Preprocessor(vertexSrc, fragmentSrc, name, options);

        const key = preprocessor.vertex + preprocessor.fragment;

        let program = ProgramCache[key];

        if (!program)
        {
            ProgramCache[key] = program = new Program(vertexSrc, fragmentSrc, name, options, preprocessor);
        }

        return program;
    }
}
