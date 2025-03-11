import { useEffect } from 'react';
import {
	BackSide,
	Color,
	EquirectangularReflectionMapping,
	IcosahedronGeometry,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	PointLight,
	Scene,
	ShaderMaterial,
	SphereGeometry,
	Spherical,
	SRGBColorSpace,
	TextureLoader,
	Uniform,
	Vector3,
	WebGLRenderer,
} from 'three';
import {
	GroundedSkybox,
	Lensflare,
	LensflareElement,
	OrbitControls,
} from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Pane } from 'tweakpane';
import atmosphereFragmentShader from '../shader/atmosphere/fragment.glsl?raw';
import atmosphereVertexShader from '../shader/atmosphere/vertex.glsl?raw';
import earthFragmentShader from '../shader/earth/fragment.glsl?raw';
import earthVertexShader from '../shader/earth/vertex.glsl?raw';
const ASSETS_PATH = import.meta.env.PROD ? './' : '/';

export default function App() {
	async function initialScene() {
		const el = document.querySelector('#container') as HTMLDivElement;

		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight,
			pixelRatio: Math.max(2, window.devicePixelRatio),
		};

		/**
		 * Basic
		 */

		const renderer = new WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(sizes.pixelRatio);
		el.append(renderer.domElement);

		const scene = new Scene();
		scene.background = new Color(0x000011);

		const camera = new PerspectiveCamera(
			75,
			sizes.width / sizes.height,
			0.1,
			1000
		);
		camera.position.set(4, 0, -1.5);
		camera.lookAt(scene.position);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.enablePan = false;
		controls.enableZoom = false;

		const stats = new Stats();
		el.append(stats.dom);

		/**
		 * Loader
		 */

		const textureLoader = new TextureLoader();
		textureLoader.setPath(ASSETS_PATH + 'assets/');

		/**
		 * Textures
		 */

		const milkyWayTexture = textureLoader.load('2k_stars_milky_way.jpg');
		milkyWayTexture.colorSpace = SRGBColorSpace;
		milkyWayTexture.mapping = EquirectangularReflectionMapping;
		scene.environment = milkyWayTexture;

		const earthDayMapTexture = textureLoader.load('2k_earth_daymap.jpg');
		earthDayMapTexture.colorSpace = SRGBColorSpace;
		earthDayMapTexture.anisotropy = 8;

		const earthNightMapTexture = textureLoader.load('2k_earth_nightmap.jpg');
		earthNightMapTexture.colorSpace = SRGBColorSpace;
		earthNightMapTexture.anisotropy = 8;

		const earthCloudsTexture = textureLoader.load('specularClouds.jpg');
		earthCloudsTexture.colorSpace = SRGBColorSpace;
		earthCloudsTexture.anisotropy = 8;

		const lensflareTexture0 = textureLoader.load('lensflare0.png');
		const lensflareTexture2 = textureLoader.load('lensflare2.png');
		const lensflareTexture3 = textureLoader.load('lensflare3.png');

		/**
		 * Scene
		 */

		const sunSpherical = new Spherical(1.0, Math.PI / 2, 0.5);
		const sunDirection = new Vector3();

		const uniforms = {
			uEarthDayMapTexture: new Uniform(earthDayMapTexture),
			uEarthNightMapTexture: new Uniform(earthNightMapTexture),
			uSpecularCloudsTexture: new Uniform(earthCloudsTexture),

			uDayMixRemapEdge0: new Uniform(-0.25),
			uDayMixRemapEdge1: new Uniform(0.5),

			uCloudsVolumn: new Uniform(0.25),

			uAtmosphereDayColor: new Uniform(new Color('#00aaff')),
			uAtmosphereTwilightColor: new Uniform(new Color('#ff6600')),

			uSunDirection: new Uniform(new Vector3(0, 0, 1)),
			uSunRadius: new Uniform(5),
		};

		// Earth
		const earthGeometry = new SphereGeometry(2, 64, 64);
		const earthMaterial = new ShaderMaterial({
			vertexShader: earthVertexShader,
			fragmentShader: earthFragmentShader,
			uniforms,
			transparent: true,
		});
		const earth = new Mesh(earthGeometry, earthMaterial);
		scene.add(earth);

		// Sun
		const sun = new Mesh(
			new IcosahedronGeometry(0.1, 3),
			new MeshBasicMaterial({
				depthWrite: false,
			})
		);
		scene.add(sun);

		// Lensflare
		const pointLight = new PointLight(0xffffff, 1.0);
		scene.add(pointLight);

		const lensflare = new Lensflare();
		lensflare.addElement(new LensflareElement(lensflareTexture0, 700, 0));
		lensflare.addElement(new LensflareElement(lensflareTexture2, 600, 0.6));
		lensflare.addElement(new LensflareElement(lensflareTexture3, 60, 0.6));
		lensflare.addElement(new LensflareElement(lensflareTexture3, 70, 0.7));
		lensflare.addElement(new LensflareElement(lensflareTexture2, 700, 0.7));
		lensflare.addElement(new LensflareElement(lensflareTexture3, 120, 0.9));
		lensflare.addElement(new LensflareElement(lensflareTexture3, 70, 1));

		pointLight.add(lensflare);

		function updateSun() {
			// Sun
			sunDirection.setFromSpherical(sunSpherical);

			// Debug
			sun.position.copy(sunDirection).multiplyScalar(uniforms.uSunRadius.value);
			pointLight.position
				.copy(sunDirection)
				.multiplyScalar(uniforms.uSunRadius.value);

			// Uniform
			uniforms.uSunDirection.value.copy(sunDirection);
		}
		updateSun();

		// Atmosphere
		const atmosphereGeometry = new SphereGeometry(2, 64, 64);
		const atmosphereMaterial = new ShaderMaterial({
			vertexShader: atmosphereVertexShader,
			fragmentShader: atmosphereFragmentShader,
			uniforms,
			transparent: true,
			side: BackSide,
		});
		const atmosphere = new Mesh(atmosphereGeometry, atmosphereMaterial);
		atmosphere.scale.setScalar(1.04);
		scene.add(atmosphere);

		// Sky Box
		const skyBox = new GroundedSkybox(milkyWayTexture, 75, 125, 512);
		scene.add(skyBox);

		/**
		 * Pane
		 */

		const pane = new Pane({ title: 'Debug Params' });
		pane.element.parentElement!.style.width = '380px';
		if (location.hash !== '#debug') pane.element.hidden = true;
		// Scene Pane
		{
			const scenePane = pane.addFolder({ title: '📺 Scene' });
			scenePane
				.addBinding(scene, 'background', {
					label: 'Background Color',
					color: { type: 'float' },
				})
				.on('change', (val) => (scene.background = val.value));
		}
		// Earth Pane
		{
			const earth = pane.addFolder({ title: '🌏 Earth' });
			earth.addBinding(earthMaterial, 'wireframe', {
				label: 'Wireframe',
			});
			earth.addBinding(uniforms.uDayMixRemapEdge0, 'value', {
				label: 'Day Mix Remap Edge 0',
				min: -1,
				max: 1,
				step: 0.001,
			});
			earth.addBinding(uniforms.uDayMixRemapEdge1, 'value', {
				label: 'Day Mix Remap Edge 1',
				min: -1,
				max: 1,
				step: 0.001,
			});
			earth
				.addBinding(uniforms.uAtmosphereDayColor, 'value', {
					label: 'Atmosphere Day Color',
					color: { type: 'float' },
				})
				.on('change', (val) =>
					uniforms.uAtmosphereDayColor.value.set(val.value)
				);
			earth
				.addBinding(uniforms.uAtmosphereTwilightColor, 'value', {
					label: 'Atmosphere Twilight Color',
					color: { type: 'float' },
				})
				.on('change', (val) =>
					uniforms.uAtmosphereTwilightColor.value.set(val.value)
				);
		}
		// Clouds Pane
		{
			const cloudsPane = pane.addFolder({ title: '🌥️ Clouds' });
			cloudsPane.addBinding(uniforms.uCloudsVolumn, 'value', {
				label: 'Clouds Volumn',
				min: 0,
				max: 1,
				step: 0.01,
			});
		}
		// Sun Pane
		{
			const sunPane = pane.addFolder({ title: '🌞 Sun' });
			sunPane
				.addBinding(uniforms.uSunRadius, 'value', {
					label: 'Sun Radius',
					min: 1,
					max: 5,
					step: 0.001,
				})
				.on('change', updateSun);
			sunPane
				.addBinding(sunSpherical, 'phi', {
					label: 'Sun Pih',
					min: 0,
					max: Math.PI,
					step: 0.01,
				})
				.on('change', updateSun);
			sunPane
				.addBinding(sunSpherical, 'theta', {
					label: 'Sun Theta',
					min: 0,
					max: Math.PI * 2,
					step: 0.01,
				})
				.on('change', updateSun);
		}

		/**
		 * Events
		 */

		function render(time: number = 0) {
			requestAnimationFrame(render);

			stats.update();
			controls.update(time);

			earth.rotation.y += 0.001;

			renderer.render(scene, camera);
		}
		render();

		function resize() {
			sizes.width = window.innerWidth;
			sizes.height = window.innerHeight;

			renderer.setSize(sizes.width, sizes.height);

			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();
		}
		window.addEventListener('resize', resize);
	}

	useEffect(() => {
		initialScene();
	}, []);

	return <div id='container'></div>;
}
