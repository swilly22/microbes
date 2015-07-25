var THREE = require('three');
var TWEEN = require('tween.js');
var Simplex = require('perlin-simplex');
var simplex = new Simplex();

var microbeTexture = THREE.ImageUtils.loadTexture( "gray_microbe_128.png" );

function Microbe(position, size, color) {
	var self = this;
	this.health = 30;
	this.position = position.clone();
	this.velocity = new THREE.Vector3(0, 0, 0);
	this.acceleration = new THREE.Vector3(0, 0, 0);
	this.color = color;
	this.hungry = true;
	this.size = size;
	
	var brightness = 0.5;
	var mesh = null;	
	var adult = false;
	var MAX_STEP_SIZE = this.size / 8;
	var stepSize = MAX_STEP_SIZE;

	var perlinXSeed = Math.random() * 100;
	var perlinYSeed = Math.random() * 1000;

	// Microbe visual representation
	createMesh();

	// speed up
	this.boost = function() {
		// already boosted
		if (stepSize >= MAX_STEP_SIZE + MAX_STEP_SIZE / 2) {
			return;
		}

		stepSize += MAX_STEP_SIZE / 2;

		setTimeout( function() {
			stepSize -= MAX_STEP_SIZE / 2;
		}, 400);
	};

	this.update = function() {

		perlinXSeed += 0.01;
		perlinYSeed += 0.01;

		var previousVelocity = this.velocity.clone();

		var x = simplex.noise(perlinXSeed, perlinYSeed);
		var y = simplex.noise(perlinYSeed, perlinXSeed);
		var movement = new THREE.Vector3(x, y, 0);
		clampVectorLength(movement, stepSize);

		this.applyForce(movement);

		this.velocity.add(this.acceleration);
		clampVectorLength(this.velocity, stepSize);

		this.position.add(this.velocity);

		mesh.position.setX(this.position.x);
		mesh.position.setY(this.position.y);
		mesh.position.setZ(0);

		// Clear acceleration.
		this.acceleration.multiplyScalar(0);

		faceHeading(previousVelocity, this.velocity);
	};

	this.eat = function(calories) {
		this.health += calories;
		this.hungry = false;

		setTimeout(function(){
			self.hungry = true;
		}, 400);

		// become adult
		if (!adult && this.health > 60) {
			adult = true;
			this.size *= 1.5;
			mesh.scale.x = this.size;
			mesh.scale.y = this.size;
		}

		var tween = new TWEEN.Tween( { brightness: brightness } )
		.to( { brightness: 0.8 }, 400 )
		.easing( TWEEN.Easing.Sinusoidal.InOut )
		.onUpdate( function () {
			mesh.material.uniforms.brightness.value = this.brightness;
		} )
		.repeat( 1 )
		.yoyo( true )
		.start();
	};

	// starvation
	var starvationInterval = setInterval(function() {
		self.starve();
	},10 * 1000);

	this.starve = function() {
		self.health -= 10;

		var tween = new TWEEN.Tween( { brightness: brightness } )
		.to( { brightness: 0.2 }, 400 )
		.easing( TWEEN.Easing.Sinusoidal.InOut )
		.onUpdate( function () {
			mesh.material.uniforms.brightness.value = this.brightness;
		} )
		.repeat( 1 )
		.yoyo( true )
		.start();
	};

	this.applyForce = function(force) {
		this.acceleration.add(force);		
		clampVectorLength(this.acceleration, stepSize);
	};

	this.getMesh = function() {		
		return mesh;
	};

	this.die = function() {
		clearInterval(starvationInterval);
		this.color = new THREE.Vector4( 0.0, 0.0, 0.0, 0.0 );
		mesh.material.uniforms.color.value = this.color;
	};

	function createMesh() {		
		var geometry = new THREE.PlaneGeometry(1.0, 1.0);
		
		var material = new THREE.ShaderMaterial({
            uniforms: {
                texture: {type: 't', value: microbeTexture},
                color: {type: 'v4', value: self.color},
                brightness: {type: 'f', value: brightness}
            },
            vertexShader: document.getElementById('vertShader').text,
            fragmentShader: document.getElementById('fragShader').text,
            transparent: true
        });

		mesh = new THREE.Mesh(geometry, material);
		
		mesh.translateX(self.position.x);
		mesh.translateY(self.position.y);

		mesh.scale.x = self.size;
		mesh.scale.y = self.size;

		// rotate mesh 90 degrees.
		mesh.rotateOnAxis(new THREE.Vector3(0,0,1).normalize(), Math.PI/2);
	}

	function clampVectorLength(v, maxLength) {
		if (v.length() > maxLength) {
			v.setLength(maxLength);
		}
	}

	function faceHeading(previousVelocity, velocity) {
		// rotate microbe in direction it's heading.
		// compute angle between current velocity and new velocity.
		if(previousVelocity.length() === 0) {
			previousVelocity.setX(1);
		}

		// angle = arccos( ( aXb ) / |a| * |b|)
		var angle = Math.acos((previousVelocity.dot(velocity)) / (previousVelocity.length() * velocity.length()));
		
		// determin angle direction, positive or negative
		var angleDirection = (previousVelocity.x * velocity.y) - (previousVelocity.y * velocity.x);
		if (angleDirection < 0) {
			angle *=-1;
		}

		// rotate by angle around Z axis.
		mesh.rotateOnAxis(new THREE.Vector3(0,0,1).normalize(), angle);
	}
}

module.exports = Microbe;