#version 300 es
precision highp float;

out vec4 fragColor;

in vec2 v_position;

uniform vec2 u_bhPosition;
uniform float u_bhVisualRadius;

void main() {
    vec2 uv = v_position; // already in -1..1 range

    float dist = length(uv - u_bhPosition);
    
    if (dist < u_bhVisualRadius) {
        fragColor = vec4(1.0, 0.0, 0.0, 1.0); // bright red
    } else {
        fragColor = vec4(0.0, 0.0, 0.1, 1.0); // dark space blue
    }
}