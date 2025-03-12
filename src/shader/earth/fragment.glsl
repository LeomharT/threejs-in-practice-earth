varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

uniform sampler2D uEarthDayMapTexture;
uniform sampler2D uEarthNightMapTexture;
uniform sampler2D uSpecularCloudsTexture;
uniform sampler2D uNoiseTexture;

uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

uniform float uTime;
uniform float uDayMixRemapEdge0;
uniform float uDayMixRemapEdge1;
uniform float uCloudsVolumn;


void main()
{
    vec2 uv = vUv;
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vPosition - cameraPosition);

    vec3 color = vec3(0.0);

    // Sun
    vec3 sunDirection = uSunDirection;
    float sunOrientation = dot(sunDirection, normal);

    // Earth Map
    float dayMix = smoothstep(
        uDayMixRemapEdge0,
        uDayMixRemapEdge1,
        sunOrientation
    );
    vec3 earthDayMap = texture2D(uEarthDayMapTexture, uv).rgb;
    vec3 earthNightMap = texture2D(uEarthNightMapTexture, uv).rgb;

    color = mix(
        earthNightMap,
        earthDayMap,
        dayMix
    );

    // Clouds
    vec4 noise = texture2D(uNoiseTexture, vec2(0.5, uTime * 0.25));

    vec2 cloudsUV = uv;
    cloudsUV.x -= uTime * 0.125;
   
    vec2 cloudsMap = texture2D(uSpecularCloudsTexture, cloudsUV).rg;
    vec2 specularCloudMap = texture2D(uSpecularCloudsTexture, uv).rg;

    float cloudMix = smoothstep(noise.r, 1.0, cloudsMap.g);
    cloudMix *= dayMix;

    color = mix(
        color,
        vec3(1.0),
        cloudMix
    );

    // Fresnel
    float frensnel = dot(viewDirection, normal) + 1.0;
    frensnel = pow(frensnel, 2.0);

    // Atmosphere
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(
        uAtmosphereTwilightColor,
        uAtmosphereDayColor,
        atmosphereDayMix
    );

    color = mix(
        color,
        atmosphereColor,
        frensnel * atmosphereDayMix
    );

    // Reflection
    vec3 reflection = reflect(-sunDirection, normal);
    float specular = dot(-reflection, viewDirection);
    specular = max(specular, 0.0);
    specular = pow(specular, 20.0);
    specular *= specularCloudMap.r;

    vec3 specularColor = mix(vec3(1.0), uAtmosphereTwilightColor, frensnel);
   
    color += specular * specularColor;
  
    // Final Color
    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}