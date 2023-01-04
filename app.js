import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.137.4/build/three.module.js";

class App {
	constructor() {
		this.toUpdate = [];
		this.camera = new THREE.PerspectiveCamera(
			45,
			innerWidth / innerHeight,
			0.1,
			100.0
		);
		this.camera.position.set(2, 1.5, 2);
    this.camera.lookAt(new THREE.Vector3());
		this.initRenderer();

		// this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		// this.controls.target = new THREE.Vector3(0, 0, 0);
		// this.toUpdate.push(this.controls);

		this.scene = new THREE.Scene();

		this.name = "Sunshine";
		this.version = 1;
		this.initSun();
	}

	gradient() {
		var c = document.createElement("canvas");
		var g = c.getContext("2d");
		c.width = 64;
		c.height = 4;
		var grad = g.createLinearGradient(0, 0, 64, 0);
		grad.addColorStop(0, "white");
		grad.addColorStop(0.16, "#FEF28C");
		grad.addColorStop(0.39, "#FFDE69");
		grad.addColorStop(0.59, "#E36700");
		grad.addColorStop(0.78, "#5C2200");
		grad.addColorStop(1, "black");
		g.fillStyle = grad;
		g.fillRect(0, 0, 64, 4);
		return c;
	}

	initSun() {
		this.sun = new THREE.Mesh(
			new THREE.SphereGeometry(1, 40, 40),
			this.sunShader()
		);

		var corona = new THREE.Mesh(
			new THREE.CylinderGeometry(2.4, 1.0, 0.01, 32, 1, true),
			this.coronaShader()
		);
		corona.material.uniforms.scale.value = new THREE.Vector2(7, 0.2);
		this.scene.add(corona);

		for (var i = 0; i < 5; i++) {
			corona = corona.clone();
			this.scene.add(corona);
			corona.rotation.x = Math.random() * 4;
			corona.rotation.y = Math.random() * 4;
			corona.rotation.z = Math.random() * 4;
		}

		this.scene.add(this.sun);
		this.toUpdate.push({
			update: () => {
				this.sun.material.uniforms.time.value = performance.now() / 500;
				corona.material.uniforms.time.value = -performance.now() / 500;
			}
		});
	}

	coronaShader() {
		return new THREE.ShaderMaterial({
			vertexShader: `
                    varying vec2 vUV;
                    
                    void main() {  
                        vUV = uv;
                        gl_Position= projectionMatrix * modelViewMatrix* vec4(position, 1.0);

                    }
                `,
			side: THREE.DoubleSide,
			fragmentShader: `


                varying vec2 vUV;
                uniform float time;
                uniform vec2 scale;
                uniform sampler2D grad;
                uniform vec2 resolution;
                    float random (in vec2 _st) {
                    return fract(sin(dot(_st.xy,
                                        vec2(12.9898,78.233)))*
                        43758.5453123);
                }

                // Based on Morgan McGuire @morgan3d
                // https://www.shadertoy.com/view/4dS3Wd
                float noise (in vec2 _st) {
                    vec2 i = floor(_st);
                    vec2 f = fract(_st);

                    // Four corners in 2D of a tile
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));

                    vec2 u = f * f * (3.0 - 2.0 * f);

                    return mix(a, b, u.x) +
                            (c - a)* u.y * (1.0 - u.x) +
                            (d - b) * u.x * u.y;
                }

                #define NUM_OCTAVES 6

                float fbm ( in vec2 _st) {
                    float v = 0.0;
                    float a = 0.5;
                    vec2 shift = vec2(100.0);
                    // Rotate to reduce axial bias
                    mat2 rot = mat2(cos(0.5), sin(0.5),
                                    -sin(0.5), cos(0.50));
                    for (int i = 0; i < NUM_OCTAVES; ++i) {
                        v += a * noise(_st);
                        _st = rot * _st * 2.0 + shift;
                        a *= 0.5;
                    }
                    return v;
                }

                void main() {
                    vec2 st = vUV*8.; //TODO get the resolution at the poles right...
                    st *=scale;
                    // st += st * abs(sin(time*0.1)*3.0);
                    vec3 color = vec3(0.0);

                    vec2 q = vec2(0.);
                    q.x = fbm( st + 0.00*time);
                    q.y = fbm( st + vec2(1.0));

                    vec2 r = vec2(0.);
                    r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*time );
                    r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*time);

                    float f = fbm(st+r);

                    color = mix(vec3(0.101961,0.619608,0.666667),
                                vec3(0.666667,0.666667,0.498039),
                                clamp((f*f)*4.0,0.0,1.0));

                    color = mix(color,
                                vec3(0,0,0.164706),
                                clamp(length(q),0.0,1.0));

                    color = mix(color,
                                vec3(0.666667,1,1),
                                clamp(length(r.x),0.0,1.0));

                    gl_FragColor = vec4((f*f*f+.6*f*f+.5*f)*color,1.);
                    gl_FragColor*=1.-st.y;
                    gl_FragColor.r+=smoothstep(0.11, 0.0, st.y);
                    gl_FragColor.rgb*=smoothstep(0., 0.1, st.y);

                    gl_FragColor = texture2D(grad, vec2(pow(1.-gl_FragColor.b, 0.35), 0.5));
										  gl_FragColor*= smoothstep(1., 0.5,st.y);
                    
                }
                `,
			transparent: true,
			blending: THREE.AdditiveBlending,
			// depthTest: false,
			depthWrite: false,
			uniforms: {
				resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
				time: { value: 0 },
				scale: { value: new THREE.Vector2(1, 1) },
				grad: { value: this.sun.material.uniforms.grad.value }
			}
		});
	}

	sunShader() {
		return new THREE.ShaderMaterial({
			vertexShader: `
                    varying vec2 vUV;
                    
                    void main() {  
                        vUV = uv;
                        // vUV.x *= (2.-abs(position.y));
                        gl_Position= projectionMatrix * modelViewMatrix* vec4(position, 1.0);

                    }
                `,
			fragmentShader: `


                varying vec2 vUV;
                uniform float time;
                uniform vec2 scale;
                uniform sampler2D grad;
                uniform vec2 resolution;
                    float random (in vec2 _st) {
                    return fract(sin(dot(_st.xy,
                                        vec2(12.9898,78.233)))*
                        43758.5453123);
                }

                // Based on Morgan McGuire @morgan3d
                // https://www.shadertoy.com/view/4dS3Wd
                float noise (in vec2 _st) {
                    vec2 i = floor(_st);
                    vec2 f = fract(_st);

                    // Four corners in 2D of a tile
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));

                    vec2 u = f * f * (3.0 - 2.0 * f);

                    return mix(a, b, u.x) +
                            (c - a)* u.y * (1.0 - u.x) +
                            (d - b) * u.x * u.y;
                }

                #define NUM_OCTAVES 6

                float fbm ( in vec2 _st) {
                    float v = 0.0;
                    float a = 0.5;
                    vec2 shift = vec2(100.0);
                    // Rotate to reduce axial bias
                    mat2 rot = mat2(cos(0.5), sin(0.5),
                                    -sin(0.5), cos(0.50));
                    for (int i = 0; i < NUM_OCTAVES; ++i) {
                        v += a * noise(_st);
                        _st = rot * _st * 2.0 + shift;
                        a *= 0.5;
                    }
                    return v;
                }

                void main() {
                    vec2 st = vUV*8.; //TODO get the resolution at the poles right...
                    st *=scale;
                    // st += st * abs(sin(time*0.1)*3.0);
                    vec3 color = vec3(0.0);

                    vec2 q = vec2(0.);
                    q.x = fbm( st + 0.00*time);
                    q.y = fbm( st + vec2(1.0));

                    vec2 r = vec2(0.);
                    r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*time );
                    r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*time);

                    float f = fbm(st+r);

                    color = mix(vec3(0.101961,0.619608,0.666667),
                                vec3(0.666667,0.666667,0.498039),
                                clamp((f*f)*4.0,0.0,1.0));

                    color = mix(color,
                                vec3(0,0,0.164706),
                                clamp(length(q),0.0,1.0));

                    color = mix(color,
                                vec3(0.666667,1,1),
                                clamp(length(r.x),0.0,1.0));

                    gl_FragColor = vec4((f*f*f+.6*f*f+.5*f)*color,1.);
                    gl_FragColor = texture2D(grad, vec2(clamp(pow(1.-gl_FragColor.b, 1.4), 0., 1.) , 0.5));
                }
                `,
			uniforms: {
				resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
				time: { value: 0 },
				scale: { value: new THREE.Vector2(1, 1) },
				grad: { value: new THREE.CanvasTexture(this.gradient()) }
			}
		});
	}
	initRenderer() {
		this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
		this.renderer.setSize(innerWidth, innerHeight);
		//   this.renderer.setClearColor(0x202020);
		this.renderer.setAnimationLoop((e) => this.update(e));
		this.renderer.setPixelRatio(devicePixelRatio);

		this.renderer.xr.enabled = true;
		document.body.appendChild(this.renderer.domElement);
	}

	update(e) {
		this.toUpdate.forEach((e) => e.update());
		this.camera.position.x += 0.01 * Math.sin(Date.now() / 1900);
		this.camera.position.y += 0.01 * Math.cos(Date.now() / 1700);
    this.camera.lookAt(new THREE.Vector3());

    this.renderer.render(this.scene, this.camera);
	}
}

var app = (window.app = new App());
