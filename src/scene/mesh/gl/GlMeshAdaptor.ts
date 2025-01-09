import { ExtensionType } from '../../../extensions/Extensions';
import { Matrix } from '../../../maths/matrix/Matrix';
import { compileHighShaderGlProgram } from '../../../rendering/high-shader/compileHighShaderToProgram';
import { localUniformBitGl } from '../../../rendering/high-shader/shader-bits/localUniformBit';
import { roundPixelsBitGl } from '../../../rendering/high-shader/shader-bits/roundPixelsBit';
import { textureBitGl } from '../../../rendering/high-shader/shader-bits/textureBit';
import { Shader } from '../../../rendering/renderers/shared/shader/Shader';
import { Texture } from '../../../rendering/renderers/shared/texture/Texture';
import { warn } from '../../../utils/logging/warn';

import type { Geometry } from '../../../rendering/renderers/shared/geometry/Geometry';
import type { Mesh } from '../shared/Mesh';
import type { MeshAdaptor, MeshPipe } from '../shared/MeshPipe';

/**
 * A MeshAdaptor that uses the WebGL to render meshes.
 * @memberof rendering
 * @ignore
 */
export class GlMeshAdaptor implements MeshAdaptor
{
    public static extension = {
        type: [
            ExtensionType.WebGLPipesAdaptor,
        ],
        name: 'mesh',
    } as const;

    private _shader: Shader;

    public init(): void
    {
        const glProgram = compileHighShaderGlProgram({
            name: 'mesh',
            bits: [
                localUniformBitGl,
                textureBitGl,
                roundPixelsBitGl,
            ]
        });

        this._shader = new Shader({
            glProgram,
            resources: {
                uTexture: Texture.EMPTY.source,
                textureUniforms: {
                    uTextureMatrix: { type: 'mat3x3<f32>', value: new Matrix() },
                }
            }
        });
    }

    public execute(meshPipe: MeshPipe, mesh: Mesh<Geometry>): void
    {
        const renderer = meshPipe.renderer;

        let shader: Shader = mesh._shader;

        if (!shader)
        {
            shader = this._shader;

            const texture = mesh.texture;
            const source = texture.source;

            shader.resources.uTexture = source;
            shader.resources.uSampler = source.style;
            shader.resources.textureUniforms.uniforms.uTextureMatrix = texture.textureMatrix.mapCoord;
        }
        else if (!shader.glProgram)
        {
            // #if _DEBUG
            warn('Mesh shader has no glProgram', mesh.shader);
            // #endif

            return;
        }

        // setting the groups to be high to be compatible and not
        // overlap any other groups
        shader.groups[100] = renderer.globalUniforms.bindGroup;
        shader.groups[101] = meshPipe.localUniformsBindGroup;

        renderer.encoder.draw({
            geometry: mesh._geometry,
            shader,
            state: mesh.state,
        });
    }

    public destroy(): void
    {
        this._shader.destroy(true);
        this._shader = null;
    }
}
