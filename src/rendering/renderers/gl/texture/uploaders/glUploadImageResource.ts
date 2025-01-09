import type { CanvasSource } from '../../../shared/texture/sources/CanvasSource';
import type { ImageSource } from '../../../shared/texture/sources/ImageSource';
import type { GlRenderingContext } from '../../context/GlRenderingContext';
import type { GlTexture } from '../GlTexture';
import type { GLTextureUploader } from './GLTextureUploader';

export const glUploadImageResource = {

    id: 'image',

    upload(source: ImageSource | CanvasSource, glTexture: GlTexture, gl: GlRenderingContext, webGLVersion: number)
    {
        const premultipliedAlpha = source.alphaMode === 'premultiply-alpha-on-upload';

        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultipliedAlpha);

        const glWidth = glTexture.width;
        const glHeight = glTexture.height;

        const textureWidth = source.pixelWidth;
        const textureHeight = source.pixelHeight;

        const resourceWidth = source.resourceWidth;
        const resourceHeight = source.resourceHeight;

        if (resourceWidth < textureWidth || resourceHeight < textureHeight)
        {
            if (glWidth !== textureWidth || glHeight !== textureHeight)
            {
                gl.texImage2D(
                    glTexture.target,
                    0,
                    glTexture.internalFormat,
                    textureWidth,
                    textureHeight,
                    0,
                    glTexture.format,
                    glTexture.type,
                    null
                );
            }

            if (webGLVersion === 2)
            {
                gl.texSubImage2D(
                    gl.TEXTURE_2D,
                    0,
                    0,
                    0,
                    resourceWidth,
                    resourceHeight,
                    glTexture.format,
                    glTexture.type,
                    source.resource as TexImageSource
                );
            }
            else
            {
                gl.texSubImage2D(
                    gl.TEXTURE_2D,
                    0,
                    0,
                    0,
                    glTexture.format,
                    glTexture.type,
                    source.resource as TexImageSource
                );
            }
        }
        else if (glWidth === textureWidth || glHeight === textureHeight)
        {
            gl.texImage2D(
                glTexture.target,
                0,
                glTexture.internalFormat,
                glTexture.format,
                glTexture.type,
                source.resource as TexImageSource
            );
        }
        else if (webGLVersion === 2)
        {
            gl.texImage2D(
                glTexture.target,
                0,
                glTexture.internalFormat,
                textureWidth,
                textureHeight,
                0,
                glTexture.format,
                glTexture.type,
                source.resource as TexImageSource
            );
        }
        else
        {
            gl.texImage2D(
                glTexture.target,
                0,
                glTexture.internalFormat,
                glTexture.format,
                glTexture.type,
                source.resource as TexImageSource
            );
        }

        glTexture.width = textureWidth;
        glTexture.height = textureHeight;
    }
} as GLTextureUploader;

