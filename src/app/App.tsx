import { useEffect } from 'react';
import {
	Color,
	Mesh,
	PerspectiveCamera,
	Scene,
	ShaderMaterial,
	SphereGeometry,
	WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Pane } from 'tweakpane';
import earthFragmentShader from '../shader/earth/fragment.glsl?raw';
import earthVertexShader from '../shader/earth/vertex.glsl?raw';

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
		camera.position.set(3, 3, 3);
		camera.lookAt(scene.position);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;

		const stats = new Stats();
		el.append(stats.dom);

		/**
		 * Scene
		 */

		const uniforms = {};

		// Earth

		const earthGeometry = new SphereGeometry(2, 64, 64);
		const earthMaterial = new ShaderMaterial({
			vertexShader: earthVertexShader,
			fragmentShader: earthFragmentShader,
			uniforms,
		});
		const earth = new Mesh(earthGeometry, earthMaterial);
		scene.add(earth);

		/**
		 * Pane
		 */

		const pane = new Pane({ title: 'Debug Params' });
		pane.element.parentElement!.style.width = '380px';
		if (location.hash !== '#debug') pane.element.hidden = true;
		{
			const scenePane = pane.addFolder({ title: '📺 Scene' });
			scenePane
				.addBinding(scene, 'background', {
					label: 'Background Color',
					color: { type: 'float' },
				})
				.on('change', (val) => (scene.background = val.value));
		}
		{
			const earth = pane.addFolder({ title: '🌏 Earth' });
			earth.addBinding(earthMaterial, 'wireframe', {
				label: 'Wireframe',
			});
		}
		{
			const sunPane = pane.addFolder({ title: '🌞 Sun' });
		}

		/**
		 * Events
		 */

		function render(time: number = 0) {
			requestAnimationFrame(render);

			stats.update();
			controls.update(time);

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
