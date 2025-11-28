#version 300 es
precision highp float;
precision highp int;

in vec2 a_position;   // background quad
in vec2 a_corner;     // circle geometry

uniform vec2  u_resolution;
uniform vec2  u_translation;
uniform float u_zoom;
uniform int   u_mode;        // 0 = background, 1 = black hole
uniform float u_worldWidth;
uniform float u_worldHeight;

uniform vec2  u_center;
uniform float u_radius;

out vec2 v_uv;
out vec2 v_worldPos;

void main() {
    vec2 pos;

    if (u_mode == 0) {
        // Background – full-screen quad
        pos = a_position;
        v_uv = a_position * 0.5 + 0.5;
        v_worldPos = (v_uv * u_resolution / u_zoom) - u_translation;

        gl_Position = vec4(pos, 0.0, 1.0);
    } else if (u_mode == 1){
        // Black hole – 4-corner square turned into circle in fragment shader
        vec2 worldMeters = u_center + a_corner * u_radius; // radius is in meters
        vec2 normalized = worldMeters / vec2(u_worldWidth, u_worldHeight);
        vec2 cam   = (normalized + u_translation) * u_zoom;

        pos = cam ;
        pos.y = -pos.y;

        v_uv = a_corner;               // -1..1 from center
        v_worldPos = worldMeters;
        gl_Position = vec4(pos, 0.0, 1.0);
    } else if (u_mode == 2) {
        // Ray trail — FINAL VERSION THAT ACTUALLY WORKS
            vec2 proto = a_position / vec2(u_worldWidth, u_worldHeight);
    vec2 cam   = proto * u_zoom + u_translation;
    vec2 clip  = cam ;
    gl_Position = vec4(clip.x, clip.y, 0.0, 1.0);
        // vec2 forced = vec2(-1.0 + 2.0 * float(gl_VertexID % 2), 
        //                    -1.0 + 2.0 * float(gl_VertexID / 2 % 2));
        // gl_Position = vec4(forced, 0.0, 1.0);
    } 

}