#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
in vec2 v_worldPos;

uniform int u_mode;

out vec4 fragColor;

void main() {
    if (u_mode == 0) {
        // Deep space background
        fragColor = vec4(0.008, 0.008, 0.2, 1.0);

    } else if (u_mode == 1) {
        // Black hole – perfect circle via discard
        float dist = length(v_uv);
        if (dist > 1.0) discard;

        // Inside the event horizon → pure black
        if (dist < 0.95) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
            // Thin bright event-horizon ring
            float ring = smoothstep(0.95, 0.98, dist);
            fragColor = vec4(1.0, 1.0, 1.0, 1.0 - ring);
        }
    } else if (u_mode == 2) {
        fragColor = vec4(1.0, 0.8, 0.4, 1);
    }
}