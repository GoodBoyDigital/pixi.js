import * as core from '../../core';
import glCore from 'pixi-gl-core';
import { default as Mesh } from '../Mesh';

const glslify = require('glslify'); // eslint-disable-line no-undef

/**
 * WebGL renderer plugin for tiling sprites
 */
export default class MeshRenderer extends core.ObjectRenderer {

    /**
     * constructor for renderer
     *
     * @param {WebGLRenderer} renderer The renderer this tiling awesomeness works for.
     */
    constructor(renderer)
    {
        super(renderer);

        this.shader = null;
    }

    /**
     * Sets up the renderer context and necessary buffers.
     *
     * @private
     */
    onContextChange()
    {
        const gl = this.renderer.gl;

        this.shader = new core.Shader(gl,
            glslify('./mesh.vert'),
            glslify('./mesh.frag'));
    }

    /**
     * renders mesh
     *
     * @param {PIXI.mesh.Mesh} mesh mesh instance
     */
    render(mesh)
    {
        const renderer = this.renderer;
        const gl = renderer.gl;
        const texture = mesh._texture;

        if (!texture.valid)
        {
            return;
        }

        let glData = mesh._glDatas[renderer.CONTEXT_UID];

        if (!glData)
        {
            glData = {
                shader: this.shader,
                vertexBuffer: glCore.GLBuffer.createVertexBuffer(gl, mesh.vertices, gl.STREAM_DRAW),
                uvBuffer: glCore.GLBuffer.createVertexBuffer(gl, mesh.uvs, gl.STREAM_DRAW),
                indexBuffer: glCore.GLBuffer.createIndexBuffer(gl, mesh.indices, gl.STATIC_DRAW),
                // build the vao object that will render..
                vao: new glCore.VertexArrayObject(gl),
                dirty: mesh.dirty,
                indexDirty: mesh.indexDirty,
            };

            // build the vao object that will render..
            glData.vao = new glCore.VertexArrayObject(gl)
                .addIndex(glData.indexBuffer)
                .addAttribute(glData.vertexBuffer, glData.shader.attributes.aVertexPosition, gl.FLOAT, false, 2 * 4, 0)
                .addAttribute(glData.uvBuffer, glData.shader.attributes.aTextureCoord, gl.FLOAT, false, 2 * 4, 0);

            mesh._glDatas[renderer.CONTEXT_UID] = glData;
        }

        if (mesh.dirty !== glData.dirty)
        {
            glData.dirty = mesh.dirty;
            glData.uvBuffer.upload();
        }

        if (mesh.indexDirty !== glData.indexDirty)
        {
            glData.indexDirty = mesh.indexDirty;
            glData.indexBuffer.upload();
        }

        glData.vertexBuffer.upload();

        renderer.bindShader(glData.shader);

        glData.shader.uniforms.uSampler = renderer.bindTexture(texture);
        renderer.state.setBlendMode(mesh.blendMode);

        glData.shader.uniforms.translationMatrix = mesh.worldTransform.toArray(true);
        glData.shader.uniforms.alpha = mesh.worldAlpha;
        glData.shader.uniforms.tint = mesh.tintRgb;

        const drawMode = mesh.drawMode === Mesh.DRAW_MODES.TRIANGLE_MESH ? gl.TRIANGLE_STRIP : gl.TRIANGLES;

        glData.vao.bind()
            .draw(drawMode, mesh.indices.length)
            .unbind();
    }
}

core.WebGLRenderer.registerPlugin('mesh', MeshRenderer);
