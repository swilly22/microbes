var Microbe = require('./microbe.js');
var Nutrient = require('./nutrient.js');
var TWEEN = require('tween.js');
var THREE = require('three');

var MICROBE_SMALL_SIZE = 3;
var MICROBE_REPULSION_DISTANCE = MICROBE_SMALL_SIZE * 2;

var camera;
var scene;
var renderer;

var microbeColors = [
		new THREE.Vector4(0.5, 0.0, 0.0, 0.0), 
		new THREE.Vector4(0.0, 0.5, 0.0, 0.0), 
		new THREE.Vector4(0.0, 0.0, 0.5, 0.0), 
		new THREE.Vector4(0.5, 0.5, 0.0, 0.0),
		new THREE.Vector4(0.5, 0.0, 0.5, 0.0),		
		new THREE.Vector4(0.0, 0.5, 0.5, 0.0)
	];

var worldTop;
var worldBottom;
var worldleft;
var worldRight;

var microbes = [];
var nutrients = [];

var mouse = {'x': 0, 'y': 0};

function init() {
	var WIDTH = window.innerWidth;
	var HEIGHT = window.innerHeight;

	// set some camera attributes
	var VIEW_ANGLE = 75;
	var ASPECT = WIDTH / HEIGHT;
	var NEAR = 1;
	var FAR = 2000;

	var container = document.getElementById('container');

	renderer = new THREE.WebGLRenderer();

	camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
	camera.position.z = 60;

	scene = new THREE.Scene();

	// the camera starts at 0,0,0
	camera.lookAt( scene.position );

	// var light = new THREE.AmbientLight( 0x404040 ); // soft white light
	// scene.add( light );

	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(WIDTH, HEIGHT);

	// attach the render-supplied DOM element
	container.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize, false );
}

document.addEventListener('mousemove', onMouseMove, false);
document.addEventListener('mouseup', onMouseUp, false);

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
}

function onMouseMove(event) {
    // update the mouse variable
    mouse.x = event.clientX;
    mouse.y = event.clientY;
}

function onMouseUp() {
	
	var worldCords = screenToWorld(new THREE.Vector2(mouse.x, mouse.y));
	addNutrients(worldCords);
}

function screenToWorld(vec) {
	var vector = new THREE.Vector3();
	vector.set(
    	( vec.x / window.innerWidth ) * 2 - 1,
    	- ( vec.y / window.innerHeight ) * 2 + 1,
    	0.5
    );

	vector.unproject( camera );

	var dir = vector.sub( camera.position ).normalize();

	var distance = - camera.position.z / dir.z;

	var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );

	return pos;
}

function addNutrients(pos) {
	var material = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

	for(var i = 0; i < (Math.random() * 5) + 1; i++) {
		var radius = (Math.random() * 0.5) + 0.2;
		var segments = 32;

		var circleGeometry = new THREE.CircleGeometry( radius, segments );
		var circle = new THREE.Mesh( circleGeometry, material );
		scene.add(circle);

		var position = new THREE.Vector3(
			pos.x + (Math.random() * 20) - 10,
			pos.y + (Math.random() * 20) - 10,
			0);

		circle.translateX(position.x);
		circle.translateY(position.y);
		circle.translateZ(position.z);		
		scene.add(circle);

		nutrients.push(new Nutrient(position, circle));
	}
}

function addMicrobe(pos, color) {	
	var microbe = new Microbe(pos, MICROBE_SMALL_SIZE, color);
	var mesh = microbe.getMesh();
	scene.add(mesh);
	microbes.push(microbe);
	return microbe;
}

function friction(microbe) {
	var dir = microbe.velocity.clone().normalize().multiplyScalar(-1);
	var mag = microbe.velocity.length() * microbe.velocity.length() * 0.6;
	return dir.multiplyScalar(mag);
}

function avoidScreenEdges(microbe) {
	var position = microbe.position;
	var force;

	var distanceFromLeft = Math.abs(worldleft - position.x);
	var distanceFromRight = Math.abs(worldRight - position.x);
	var distanceFromTop = Math.abs(worldTop - position.y);
	var distanceFromBottom = Math.abs(worldBottom - position.y);
	var strength;

	if (distanceFromLeft < (microbe.size * 10)) {
		force = new THREE.Vector3(1,0,0);
		strength = 1.5 / (distanceFromLeft * distanceFromLeft);
		force.multiplyScalar(strength);
		microbe.applyForce(force);
	} else if (distanceFromRight < (microbe.size * 10)) {
		force = new THREE.Vector3(-1,0,0);
		strength = 1.5 / (distanceFromRight * distanceFromRight);
		force.multiplyScalar(strength);
		microbe.applyForce(force);
	}

	if (distanceFromTop < (microbe.size * 10)) {
		force = new THREE.Vector3(0,-1,0);
		strength = 1.5 / (distanceFromTop * distanceFromTop);
		force.multiplyScalar(strength);
		microbe.applyForce(force);
	} else if (distanceFromBottom < (microbe.size * 10)) {
		force = new THREE.Vector3(0,1,0);
		strength = 1.5 / (distanceFromBottom * distanceFromBottom);
		force.multiplyScalar(strength);
		microbe.applyForce(force);
	}
}

function update() {
	for(var i = 0; i < nutrients.length; i++) {
		var nutrient = nutrients[i];
		nutrient.update();
		// compute distance between current nutrient and microbes.
		for(var j = 0; j < microbes.length; j++) {
			var microbe = microbes[j];
			if(!microbe.hungry) { continue; }

			var distance = nutrient.position.clone().sub(microbe.position).length();
			
			if (distance < microbe.size * 3 + nutrient.mesh.geometry.boundingSphere.radius) {
				microbe.boost();
			}

			var attractionForce = nutrient.attract(microbe);
			microbe.applyForce(attractionForce);

			if(distance < microbe.size/2 + nutrient.mesh.geometry.boundingSphere.radius) {
				// Remove nutrient.
				scene.remove(nutrient.mesh);
				nutrients.splice(i, 1);
				microbe.eat(nutrient.calories);
				break;
			}
		}			
	}

	// avoid microbes collision
	for(var i = 0; i < microbes.length; i++) {
		var microbeA = microbes[i];		
		for(var j = i+1; j < microbes.length; j++) {
			var microbeB = microbes[j];

			var distance = microbeA.position.clone().sub(microbeB.position).length();
			if(distance < MICROBE_REPULSION_DISTANCE) {

				var repulsionForce = microbeA.position.clone().sub(microbeB.position);
				repulsionForce.normalize();
				repulsionForce.multiplyScalar(1 / (repulsionForce.length() * repulsionForce.length()));
				microbeA.applyForce(repulsionForce);

				repulsionForce = microbeB.position.clone().sub(microbeA.position);
				repulsionForce.normalize();
				repulsionForce.multiplyScalar(1 / (repulsionForce.length() * repulsionForce.length()));
				microbeB.applyForce(repulsionForce);
			}
		}
	}

	for(var i = 0; i < microbes.length; i++) {
		var microbe = microbes[i];

		avoidScreenEdges(microbe);

		// apply friction.
		var frictionForce = friction(microbe);
		microbe.applyForce(frictionForce);

		microbe.update();

		if(microbe.health >= 100) {
			// Multiply
			var pos = microbe.position.clone();
			var color = microbe.color;
			microbes.splice(i, 1);			
			addMicrobe(pos, color);
			addMicrobe(pos, color);
			scene.remove(microbe.getMesh());

		} else if(microbe.health <= 0) {
			// die.
			(function(m) {
				setTimeout(function(){
					scene.remove(m.getMesh());
				}, 1000 * 7);
			})(microbe);

			microbe.die();
			microbes.splice(i, 1);
		}
	}
}

var lastUpdateDate;
var FPS = 1000 / 64;

function render(time) {
	var now = new Date();

	TWEEN.update(time);
	requestAnimationFrame( render );
	renderer.render( scene, camera );
	if (now - lastUpdateDate > FPS) {
		update();
		lastUpdateDate = new Date();
	}
}

window.run = function() {
	init();
	lastUpdateDate = new Date();

	render();

	var topLeft = screenToWorld(new THREE.Vector2(0, 0));
	var bottomRight = screenToWorld(new THREE.Vector2(window.innerWidth, window.innerHeight));

	worldTop = topLeft.y;
	worldBottom = bottomRight.y;
	worldleft = topLeft.x;
	worldRight = bottomRight.x;
	
	var initialMicrobesCount = Math.random() * 30;
	// var initialMicrobesCount = 1;
	
	for(var i = 0; i < initialMicrobesCount; i++) {
		var vertex = new THREE.Vector3();
		vertex.x = Math.random() * Math.abs( worldRight - worldleft ) + worldleft;
		vertex.y = Math.random() * Math.abs( worldTop - worldBottom ) + worldBottom;
		vertex.z = 0;

		var color = microbeColors[ Math.round( Math.random() * ( microbeColors.length-1 ) ) ];

		addMicrobe( vertex, color );
	}	

	setInterval(function(){
		if(nutrients.length < microbes.length * 5) {
			var pos = new THREE.Vector3(
				Math.random() * Math.abs(worldRight - worldleft) + worldleft,
				Math.random() * Math.abs(worldTop - worldBottom) + worldBottom,
				0);
			addNutrients(pos);
		}
	}, 1000 * 5);
};