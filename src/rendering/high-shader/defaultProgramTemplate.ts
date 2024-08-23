const vertexGPUTemplate = /* wgsl */`
    @in aPosition: vec2<f32>;
    @in aUV: vec2<f32>;

    @out @builtin(position) vPosition: vec4<f32>;
    @out vUV : vec2<f32>;
    @out vColor : vec4<f32>;

    {{header}}

    struct VSOutput {
        {{struct}}
    };

    @vertex
    fn main( {{in}} ) -> VSOutput {

        var worldTransformMatrix = globalUniforms.uWorldTransformMatrix;
        var modelMatrix = mat3x3<f32>(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        var position = aPosition;
        var uv = aUV;

        {{start}}

        vColor = vec4<f32>(1., 1., 1., 1.);

        {{main}}

        vUV = uv;

        var worldPosition = worldTransformMatrix * modelMatrix * vec3<f32>(position, 1.0);

        vPosition = vec4<f32>((globalUniforms.uProjectionMatrix * worldPosition).xy, 0.0, 1.0);

        vColor *= globalUniforms.uWorldColorAlpha;

        {{end}}

        {{return}}
    };
`;

const fragmentGPUTemplate = /* wgsl */`
    @in vUV : vec2<f32>;
    @in vColor : vec4<f32>;

    {{header}}

    @fragment
    fn main(
        {{in}}
      ) -> @location(0) vec4<f32> {

        {{start}}

        var outColor:vec4<f32>;

        {{main}}

        return outColor * vColor;
      };
`;

const vertexGlTemplate = /* glsl */`
    in vec2 aPosition;
    in vec2 aUV;

    out vec4 vColor;
    out vec2 vUV;

    {{header}}

    void main(void){

        mat3 worldTransformMatrix = uWorldTransformMatrix;
        mat3 modelMatrix = mat3(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        vec2 position = aPosition;
        vec2 uv = aUV;

        {{start}}

        vColor = vec4(1.);

        {{main}}

        vUV = uv;

        vec3 worldPosition = worldTransformMatrix * modelMatrix * vec3(position, 1.0);

        gl_Position = vec4((uProjectionMatrix * worldPosition).xy, 0.0, 1.0);

        vColor *= uWorldColorAlpha;

        {{end}}
    }
`;

const fragmentGlTemplate = /* glsl */`

    in vec4 vColor;
    in vec2 vUV;

    out vec4 finalColor;

    {{header}}

    void main(void) {

        {{start}}

        vec4 outColor;

        {{main}}

        finalColor = outColor * vColor;
    }
`;

export {
    fragmentGlTemplate,
    fragmentGPUTemplate,
    vertexGlTemplate,
    vertexGPUTemplate
};
