precision mediump float;
#define LOWPREC lowp
// Uniforms look like they're shared between vertex and fragment shaders in GLSL, so we have to be careful to avoid name clashes

uniform sampler2D gm_BaseTexture;

uniform bool gm_PS_FogEnabled;
uniform vec4 gm_FogColour;
uniform bool gm_AlphaTestEnabled;
uniform float gm_AlphaRefValue;

void DoAlphaTest(vec4 SrcColour)
{
	if (gm_AlphaTestEnabled)
	{
		if (SrcColour.a <= gm_AlphaRefValue)
		{
			discard;
		}
	}
}

void DoFog(inout vec4 SrcColour, float fogval)
{
	if (gm_PS_FogEnabled)
	{
		SrcColour = mix(SrcColour, gm_FogColour, clamp(fogval, 0.0, 1.0)); 
	}
}

#define _YY_GLSLES_ 1
varying vec2 v_vTexcoord;
varying vec4 v_vColour;

uniform vec2 texel;
uniform float vignette_scale;
uniform float vignette_intensity;
uniform float chromatic_scale;
uniform float filter_amount;
uniform float time;

void main()
{	
	vec4 col = texture2D( gm_BaseTexture, v_vTexcoord);
	
	//RGB filter
	float rgbindex = floor(mod(gl_FragCoord.x+gl_FragCoord.y-time,3.));
	vec3 rgbcol = vec3(max(0.,1.-rgbindex),mod(rgbindex,2.0)*0.5,max(0.,rgbindex-1.));
	col.rgb = mix(col.rgb,rgbcol,filter_amount);

	//Chromatic aberration 
	float dist = length(v_vTexcoord - vec2(0.5,0.5));
	dist *= chromatic_scale;
	float signdist = sign(chromatic_scale);
    float shift = texel.x*(signdist+dist);
    col.r = texture2D(gm_BaseTexture, vec2(v_vTexcoord.x + shift, v_vTexcoord.y)).r;
    col.b = texture2D(gm_BaseTexture, vec2(v_vTexcoord.x - shift, v_vTexcoord.y)).b;

	//Vignette
	vec2 vuv = v_vTexcoord * (1.0 - v_vTexcoord.yx);    
    float vig = vuv.x*vuv.y * vignette_intensity;
    float bri = pow(vig, vignette_scale);
	col.rgb *= bri;
		
    gl_FragColor = col * v_vColour;
}
