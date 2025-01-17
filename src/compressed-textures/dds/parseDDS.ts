import { DDS, DXGI_TO_TEXTURE_FORMAT, FOURCC_TO_TEXTURE_FORMAT, TEXTURE_FORMAT_BLOCK_SIZE } from './const';

import type { TEXTURE_FORMATS } from '../../rendering/renderers/shared/texture/const';
import type { TextureSourceOptions } from '../../rendering/renderers/shared/texture/sources/TextureSource';

export function parseDDS(arrayBuffer: ArrayBuffer, supportedFormats: TEXTURE_FORMATS[]): TextureSourceOptions<Uint8Array[]>
{
    const {
        format,
        fourCC,
        width,
        height,
        dataOffset,
        mipmapCount,
    } = parseDDSHeader(arrayBuffer);

    if (!supportedFormats.includes(format))
    {
        throw new Error(`Unsupported texture format: ${fourCC} ${format}, supported: ${supportedFormats}`);
    }

    if (mipmapCount <= 1)
    { // No need bothering with the imageSize calculation!
        return {
            format,
            width,
            height,
            resource: [new Uint8Array(arrayBuffer, dataOffset)],
            alphaMode: 'no-premultiply-alpha',
        } as TextureSourceOptions;
    }

    const levelBuffers = getMipmapLevelBuffers(format, width, height, dataOffset, mipmapCount, arrayBuffer);

    const textureOptions: TextureSourceOptions = {
        format,
        width,
        height,
        resource: levelBuffers,
        alphaMode: 'no-premultiply-alpha'
    };

    return textureOptions;
}

function getMipmapLevelBuffers(format: TEXTURE_FORMATS, width: number, height: number,
    dataOffset: any, mipmapCount: number, arrayBuffer: ArrayBuffer)
{
    const levelBuffers = [];
    const blockBytes = TEXTURE_FORMAT_BLOCK_SIZE[format];

    let mipWidth = width;
    let mipHeight = height;
    let offset = dataOffset;

    for (let level = 0; level < mipmapCount; ++level)
    {
        // Each dimension must be aligned to a multiple of 4
        const alignedWidth = Math.ceil(Math.max(4, mipWidth) / 4) * 4;
        const alignedHeight = Math.ceil(Math.max(4, mipHeight) / 4) * 4;
        const byteLength = blockBytes
            ? alignedWidth / 4 * alignedHeight / 4 * blockBytes
            : mipWidth * mipHeight * 4;

        const levelBuffer = new Uint8Array(arrayBuffer, offset, byteLength);

        levelBuffers.push(levelBuffer);

        offset += byteLength;

        mipWidth = Math.max(mipWidth >> 1, 1);
        mipHeight = Math.max(mipHeight >> 1, 1);
    }

    return levelBuffers;
}

function parseDDSHeader(buffer: ArrayBuffer)
{
    const header = new Uint32Array(buffer, 0, DDS.HEADER_SIZE / Uint32Array.BYTES_PER_ELEMENT);

    if (header[DDS.HEADER_FIELDS.MAGIC] !== DDS.MAGIC_VALUE)
    {
        throw new Error('Invalid magic number in DDS header');
    }

    // DDS header fields
    const height = header[DDS.HEADER_FIELDS.HEIGHT];
    const width = header[DDS.HEADER_FIELDS.WIDTH];
    const mipmapCount = Math.max(1, header[DDS.HEADER_FIELDS.MIPMAP_COUNT]);
    const flags = header[DDS.HEADER_FIELDS.PF_FLAGS];
    const fourCC = header[DDS.HEADER_FIELDS.FOURCC];
    const format = getTextureFormat(header, flags, fourCC, buffer);

    const dataOffset = DDS.MAGIC_SIZE + DDS.HEADER_SIZE
        + ((fourCC === DDS.D3DFMT.DX10) ? DDS.HEADER_DX10_SIZE : 0);

    return {
        format,
        fourCC,
        width,
        height,
        dataOffset,
        mipmapCount
    };
}

function getTextureFormat(header: Uint32Array, flags: number, fourCC: number, buffer: ArrayBuffer)
{
    if (flags & DDS.PIXEL_FORMAT_FLAGS.FOURCC)
    {
        if (fourCC === DDS.D3DFMT.DX10)
        {
            const dx10Header = new Uint32Array(
                buffer,
                DDS.MAGIC_SIZE + DDS.HEADER_SIZE, // there is a 20-byte DDS_HEADER_DX10 after DDS_HEADER
                DDS.HEADER_DX10_SIZE / Uint32Array.BYTES_PER_ELEMENT);

            const miscFlag = dx10Header[DDS.HEADER_DX10_FIELDS.MISC_FLAG];

            if (miscFlag === DDS.RESOURCE_MISC_TEXTURECUBE)
            {
                throw new Error('DDSParser does not support cubemap textures');
            }

            const resourceDimension = dx10Header[DDS.HEADER_DX10_FIELDS.RESOURCE_DIMENSION];

            if (resourceDimension === DDS.D3D10_RESOURCE_DIMENSION.DDS_DIMENSION_TEXTURE3D)
            {
                throw new Error('DDSParser does not supported 3D texture data');
            }

            const dxgiFormat = dx10Header[DDS.HEADER_DX10_FIELDS.DXGI_FORMAT];

            if (dxgiFormat in DXGI_TO_TEXTURE_FORMAT)
            {
                return DXGI_TO_TEXTURE_FORMAT[dxgiFormat];
            }

            throw new Error(`DDSParser cannot parse texture data with DXGI format ${dxgiFormat}`);
        }

        if (fourCC in FOURCC_TO_TEXTURE_FORMAT)
        {
            return FOURCC_TO_TEXTURE_FORMAT[fourCC];
        }

        throw new Error(`DDSParser cannot parse texture data with fourCC format ${fourCC}`);
    }

    if (flags & DDS.PIXEL_FORMAT_FLAGS.RGB || flags & DDS.PIXEL_FORMAT_FLAGS.RGBA)
    {
        return getUncompressedTextureFormat(header);
    }

    if (flags & DDS.PIXEL_FORMAT_FLAGS.YUV)
    {
        throw new Error('DDSParser does not supported YUV uncompressed texture data.');
    }
    if (flags & DDS.PIXEL_FORMAT_FLAGS.LUMINANCE || flags & DDS.PIXEL_FORMAT_FLAGS.LUMINANCEA)
    {
        throw new Error('DDSParser does not support single-channel (lumninance) texture data!');
    }
    if (flags & DDS.PIXEL_FORMAT_FLAGS.ALPHA || flags & DDS.PIXEL_FORMAT_FLAGS.ALPHAPIXELS)
    {
        throw new Error('DDSParser does not support single-channel (alpha) texture data!');
    }

    throw new Error('DDSParser failed to load a texture file due to an unknown reason!');
}

function getUncompressedTextureFormat(header: Uint32Array)
{
    const bitCount = header[DDS.HEADER_FIELDS.RGB_BITCOUNT];
    const rBitMask = header[DDS.HEADER_FIELDS.R_BIT_MASK];
    const gBitMask = header[DDS.HEADER_FIELDS.G_BIT_MASK];
    const bBitMask = header[DDS.HEADER_FIELDS.B_BIT_MASK];
    const aBitMask = header[DDS.HEADER_FIELDS.A_BIT_MASK];

    // https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide
    // https://github.com/microsoft/DirectXTex/blob/main/DDSTextureLoader/DDSTextureLoader11.cpp#L892
    switch (bitCount)
    {
        case 32:
            if (rBitMask === 0x000000ff && gBitMask === 0x0000ff00 && bBitMask === 0x00ff0000 && aBitMask === 0xff000000)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_R8G8B8A8_UNORM];
            }
            if (rBitMask === 0x00ff0000 && gBitMask === 0x0000ff00 && bBitMask === 0x000000ff && aBitMask === 0xff000000)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_B8G8R8A8_UNORM];
            }
            if (rBitMask === 0x3ff00000 && gBitMask === 0x000ffc00 && bBitMask === 0x000003ff && aBitMask === 0xc0000000)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_R10G10B10A2_UNORM];
            }
            if (rBitMask === 0x0000ffff && gBitMask === 0xffff0000 && bBitMask === 0 && aBitMask === 0)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_R16G16_UNORM];
            }
            if (rBitMask === 0xffffffff && gBitMask === 0 && bBitMask === 0 && aBitMask === 0)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_R32_FLOAT];
            }
            break;
        case 24:
            if (rBitMask === 0xff0000 && gBitMask === 0xff00 && bBitMask === 0xff && aBitMask === 0x8000)
            {
                // rgb8unorm not supported?
                // return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_B5G5R5A1_UNORM];
            }
            break;
        case 16:
            if (rBitMask === 0x7c00 && gBitMask === 0x03e0 && bBitMask === 0x001f && aBitMask === 0x8000)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_B5G5R5A1_UNORM];
            }
            if (rBitMask === 0xf800 && gBitMask === 0x07e0 && bBitMask === 0x001f && aBitMask === 0)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_B5G6R5_UNORM];
            }
            if (rBitMask === 0x0f00 && gBitMask === 0x00f0 && bBitMask === 0x000f && aBitMask === 0xf000)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_B4G4R4A4_UNORM];
            }
            if (rBitMask === 0x00ff && gBitMask === 0 && bBitMask === 0 && aBitMask === 0xff00)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_R8G8_UNORM];
            }
            if (rBitMask === 0xffff && gBitMask === 0 && bBitMask === 0 && aBitMask === 0)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_R16_UNORM];
            }
            break;

        case 8:
            if (rBitMask === 0xff && gBitMask === 0 && bBitMask === 0 && aBitMask === 0)
            {
                return DXGI_TO_TEXTURE_FORMAT[DDS.DXGI_FORMAT.DXGI_FORMAT_R8_UNORM];
            }
            break;
    }

    throw new Error(`DDSParser does not support uncompressed texture with configuration:
                bitCount = ${bitCount}, rBitMask = ${rBitMask}, gBitMask = ${gBitMask}, aBitMask = ${aBitMask}`);
}
