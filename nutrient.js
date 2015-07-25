var THREE = require('three');
var Simplex = require('perlin-simplex');
var simplex = new Simplex();

function clampVectorLength(v, maxLength) {
	if (v.length() > maxLength) {
		v.setLength(maxLength);
	}
}

function Nutrient(position, ui) {
	this.mesh = ui;
	this.position = position;
	this.velocity = new THREE.Vector3(0, 0, 0);
	this.acceleration = new THREE.Vector3(0, 0, 0);

	this.calories = Math.random() * 10;
	this.perlinXSeed = Math.random() * 50;
	this.perlinYSeed = Math.random() * 500;
	this.MAX_STEP_SIZE = 0.04;
}

Nutrient.prototype.update = function() {
	this.perlinXSeed += 0.01;
	this.perlinYSeed += 0.01;
	var x = simplex.noise(this.perlinXSeed, this.perlinYSeed);
	var y = simplex.noise(this.perlinYSeed, this.perlinXSeed);
	var movement = new THREE.Vector3(x, y, 0);
	clampVectorLength(movement, this.MAX_STEP_SIZE);
	this.applyForce(movement);

	this.velocity.add(this.acceleration);
	clampVectorLength(this.velocity, this.MAX_STEP_SIZE);

	this.position.add(this.velocity);

	this.mesh.position.setX(this.position.x);
	this.mesh.position.setY(this.position.y);
	this.mesh.position.setZ(0);

	// Clear acceleration.
	this.acceleration.multiplyScalar(0);
};

Nutrient.prototype.applyForce = function(force) {
	this.acceleration.add(force);
	clampVectorLength(this.acceleration, this.MAX_STEP_SIZE);
};

Nutrient.prototype.attract = function(obj) {
	var force = this.position.clone().sub(obj.position);
	var distance = force.length();

	if (distance < 5) {
		distance = 5;
	}

	force.normalize();
	var strength = (this.calories * 45) / (distance * distance);
	force.multiplyScalar(strength);

	return force;
};

module.exports = Nutrient;