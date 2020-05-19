import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Water } from 'three/examples/jsm/objects/Water';
import { Sky } from 'three/examples/jsm/objects/Sky';
import Ui from './ui.js';
import Clouds from './clouds.js';

var controls = {
    joystick: {x: 0, y:0, z:0},
    roll: 0,
    throttle: 0,
};
Ui.init('.ui-overlay');
Ui.MouseJoystick(e=>{
    controls.joystick = e;
})
Ui.RollSlider(e=>{
    controls.roll = e;
})
Ui.ThrottleSlider(e=>{
    controls.throttle = e;
})

const VIEW_FAR = 10000;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, VIEW_FAR );
camera.layers.enable( 1 );
var gltfloader = new GLTFLoader();

const color_water = 0x1c91ff;
const color_sky = 0xd9eeff;
const color_horizon = 0xc9d0d4;
const color_sun = 0xffffff;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

scene.background = new THREE.Color(color_sky);
// scene.fog = new THREE.Fog( color_horizon, VIEW_FAR / 2, VIEW_FAR );

// Ambient Light
var hemiLight = new THREE.HemisphereLight( color_sky, color_water, 1 );
scene.add( hemiLight );
var hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
scene.add( hemiLightHelper );

// Sunlight
var skyLight = new THREE.DirectionalLight( color_sun, 1 );
var skyLightBasePos = new THREE.Vector3(0, 0, 0);
// skyLight.position.set( -1, 1, 1 );
// skyLight.position.multiplyScalar( 300 );
var dirLightHelper = new THREE.DirectionalLightHelper( skyLight, 10 );
scene.add( dirLightHelper );

// Sun Shadows
scene.add( skyLight );
renderer.shadowMapEnabled = true;
skyLight.castShadow = true;
var d = 50;
skyLight.shadow.mapSize.width = 2048;
skyLight.shadow.mapSize.height = 2048;
skyLight.shadow.camera.left = - d;
skyLight.shadow.camera.right = d;
skyLight.shadow.camera.top = d;
skyLight.shadow.camera.bottom = - d;
skyLight.shadow.camera.far = VIEW_FAR / 2;
skyLight.shadow.bias = - 0.0001;
// var shadowHelper = new THREE.CameraHelper( skyLight.shadow.camera );
// scene.add( shadowHelper );


// Skybox
var sky = new Sky();

var uniforms = sky.material.uniforms;

uniforms[ 'turbidity' ].value = 10;
uniforms[ 'rayleigh' ].value = 2;
uniforms[ 'luminance' ].value = 1;
uniforms[ 'mieCoefficient' ].value = 0.005;
uniforms[ 'mieDirectionalG' ].value = 0.8;

var parameters = {
    distance: 400,
    inclination: 0.2,
    azimuth: 0.205
};

var cubeCamera = new THREE.CubeCamera( 0.1, 1, 512 );
cubeCamera.renderTarget.texture.generateMipmaps = true;
cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipmapLinearFilter;
scene.background = cubeCamera.renderTarget;

var grid = new THREE.GridHelper(10000, 100, 0xffffff);
grid.position.y = 1;
scene.add(grid);

// Water
var waterGeometry = new THREE.CircleBufferGeometry( VIEW_FAR, 32 );

var water = new Water(
    waterGeometry,
    {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load( 'waternormals3.jpg', function ( texture ) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        } ),
        // alpha: 0.1,
        sunDirection: skyLight.position.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: color_water,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    }
);
water.rotation.x = - Math.PI / 2;
water.receiveShadow = true;

scene.add( water );

function updateSun() {

    var theta = Math.PI * ( parameters.inclination - 0.5 );
    var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );

    skyLightBasePos.x = parameters.distance * Math.cos( phi );
    skyLightBasePos.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
    skyLightBasePos.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );
    skyLight.lookAt({x:0, y:0, z: 0});

    sky.material.uniforms[ 'sunPosition' ].value = skyLightBasePos.copy( skyLightBasePos );
    water.material.uniforms[ 'sunDirection' ].value.copy( skyLightBasePos ).normalize();

    cubeCamera.update( renderer, sky );

}
updateSun();

//Clouds

var cloudVolume = new THREE.Group();
var clouds = new Clouds(cloudVolume, 500, 500, 500, 100);
scene.add(cloudVolume);


// // Orbit Camera
// var controls = new OrbitControls( camera, renderer.domElement );
// camera.position.set( 0, 60, 20 );
// orbitcam.update();

// Airplane
var airplane = new THREE.Group();
var gimbal = new THREE.Group();
airplane.add(gimbal);
airplane.position.set(0, 50, 0);
skyLight.target = airplane;

gltfloader.load(
	// resource URL
	'airplane.gltf',
	// called when the resource is loaded
	function ( gltf ) {
        console.log(gltf);
        while(gltf.scene.children.length){
            var c = gltf.scene.children[0];
            if (!c.geometry){
                gltf.scene.remove(c);
                continue;
            };
            c.castShadow = true;
            c.receiveShadow = true;
            c.geometry.computeBoundingBox();
            gimbal.add(c);
        }
        airplane.add(camera);
        camera.position.set(0, 5, 20);
        camera.lookAt(airplane.position);
        scene.add(airplane);
        // orbitcam.target = airplane.position;
        // orbitcam.update();
	},
	// called while loading is progressing
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( e ) {
		console.error( 'error loading model', e );
	}
);


// Contrails
//R
var contrailAnchorR = new THREE.Group();
gimbal.add(contrailAnchorR);
contrailAnchorR.position.set(7.4, 3.7, 0.2);
var contrailR = new Contrail(contrailAnchorR);
//L
var contrailAnchorL = new THREE.Group();
gimbal.add(contrailAnchorL);
contrailAnchorL.position.set(-7.4, 3.7, 0.2);
var contrailL = new Contrail(contrailAnchorL);


function Contrail(anchorObj){
    
    var DAMPING = 0.03;
    var DRAG = 1 - DAMPING;
    var MASS = 0.1;
    var restDistance = 0.1;

    var xSegs = 3;
    var ySegs = 20;

    var clothFunction = plane( restDistance * xSegs, restDistance * ySegs );

    var cloth = new Cloth( xSegs, ySegs );

    var GRAVITY = 13;
    var gravity = new THREE.Vector3( 0, - GRAVITY, 0 ).multiplyScalar( MASS );

    var TIMESTEP = 18 / 1000;
    var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

    var pins = [];
    for (let i = 0; i <= cloth.w; i++){
        pins.push(i);
    }

    var windForce = new THREE.Vector3( 0, 0, 0 );
    var windStrength = 1;

    var tmpForce = new THREE.Vector3();

    var lastTime;

    var clothMaterial = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, color: 0xff0000 });
    var clothGeometry = new THREE.ParametricBufferGeometry( clothFunction, cloth.w, cloth.h ); //(func, width, height)
    var object = new THREE.Mesh( clothGeometry, clothMaterial );
    object.layers.set( 1 );
    anchorObj.add(object);

    var anchorRotation = new THREE.Quaternion();
    anchorObj.getWorldQuaternion(anchorRotation);

    this.update = simulate;

    function plane( width, height ) {

        return function ( u, v, target ) {

            var x = ( u - 0.5 ) * width;
            var y = 0;
            var z = ( v + 0.5 ) * height;

            target.set( x, y, z );

        };

    }

    function Particle( x, y, z, mass ) {

        this.position = new THREE.Vector3();
        this.previous = new THREE.Vector3();
        this.original = new THREE.Vector3();
        this.a = new THREE.Vector3( 0, 0, 0 ); // acceleration
        this.mass = mass;
        this.invMass = 1 / mass;
        this.tmp = new THREE.Vector3();
        this.tmp2 = new THREE.Vector3();

        // init

        clothFunction( x, y, this.position ); // position
        clothFunction( x, y, this.previous ); // previous
        clothFunction( x, y, this.original );

    }

    // Force -> Acceleration

    Particle.prototype.addForce = function ( force ) {

        this.a.add(
            this.tmp2.copy( force ).multiplyScalar( this.invMass )
        );

    };


    // Performs Verlet integration
    Particle.prototype.integrate = function ( timesq ) {

        var newPos = this.tmp.subVectors( this.position, this.previous );
        newPos.multiplyScalar( DRAG ).add( this.position );
        newPos.add( this.a.multiplyScalar( timesq ) );

        this.tmp = this.previous;
        this.previous = this.position;
        this.position = newPos;

        this.a.set( 0, 0, 0 );

    };


    var diff = new THREE.Vector3();

    function satisfyConstraints( p1, p2, distance ) {

        diff.subVectors( p2.position, p1.position );
        var currentDist = diff.length();
        if ( currentDist === 0 ) return; // prevents division by 0
        var correction = diff.multiplyScalar( 1 - distance / currentDist );
        var correctionHalf = correction.multiplyScalar( 0.5 );
        p1.position.add( correctionHalf );
        p2.position.sub( correctionHalf );

    }

    function Cloth( w, h ) {

        w = w || 10;
        h = h || 10;
        this.w = w;
        this.h = h;

        var particles = [];
        var constraints = [];

        var u, v;

        // Create particles
        for ( v = 0; v <= h; v ++ ) {
            for ( u = 0; u <= w; u ++ ) {
                particles.push(
                    new Particle( u / w, v / h, 0, MASS )
                );
            }
        }

        // Structural

        for ( v = 0; v < h; v ++ ) {
            for ( u = 0; u < w; u ++ ) {
                constraints.push( [
                    particles[ index( u, v ) ],
                    particles[ index( u, v + 1 ) ],
                    restDistance
                ] );

                constraints.push( [
                    particles[ index( u, v ) ],
                    particles[ index( u + 1, v ) ],
                    restDistance
                ] );
            }
        }

        for ( u = w, v = 0; v < h; v ++ ) {
            constraints.push( [
                particles[ index( u, v ) ],
                particles[ index( u, v + 1 ) ],
                restDistance
            ] );

        }

        for ( v = h, u = 0; u < w; u ++ ) {

            constraints.push( [
                particles[ index( u, v ) ],
                particles[ index( u + 1, v ) ],
                restDistance
            ] );

        }

        this.particles = particles;
        this.constraints = constraints;

        function index( u, v ) {

            return u + v * ( w + 1 );

        }

        this.index = index;

    }

    function simulate( time, windV ) {

        if ( ! lastTime ) {
            lastTime = time;
            return;
        }

        var i, j, il, particles, particle, constraints, constraint;

        // Aerodynamics forces
        if ( windV ) {

            // windForce.set( Math.sin( time / 2000 ), Math.cos( time / 3000 ), Math.sin( time / 1000 ) );
            // windForce.normalize();
            // tmpForce.set(1,1,1);
            // windForce.subVectors(tmpForce, windForce);
            windForce.set(1,1,1); //debug only
            windForce.multiply(windV);
            windForce.multiplyScalar( windStrength );
            

            var indx;
            var normal = new THREE.Vector3();
            var indices = clothGeometry.index;
            var normals = clothGeometry.attributes.normal;

            particles = cloth.particles;

            for ( i = 0, il = indices.count; i < il; i += 3 ) {

                for ( j = 0; j < 3; j ++ ) {

                    indx = indices.getX( i + j );
                    normal.fromBufferAttribute( normals, indx );
                    tmpForce.copy( normal ).normalize().multiplyScalar( normal.dot( windForce ) );
                    particles[ indx ].addForce( tmpForce );

                }

            }

        }

        for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

            particle = particles[ i ];
            particle.addForce( gravity );

            particle.integrate( TIMESTEP_SQ );

        }

        // Start Constraints
        constraints = cloth.constraints;
        il = constraints.length;
        for ( i = 0; i < il; i ++ ) {

            constraint = constraints[ i ];
            satisfyConstraints( constraint[ 0 ], constraint[ 1 ], constraint[ 2 ] );

        }

        // Floor Constraints
        for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {

            particle = particles[ i ];
            var pos = particle.position;
            if ( pos.y < -250 ) {
                pos.y = -250;
            }

        }

        // Pin Constraints
        for ( i = 0, il = pins.length; i < il; i ++ ) {
            var xy = pins[ i ];
            var p = particles[ xy ];
            p.position.copy( p.original );
            p.previous.copy( p.original );
        }

        // Update render
        var p = cloth.particles;
        for ( var i = 0, il = p.length; i < il; i ++ ) {

            var v = p[ i ].position;
            clothGeometry.attributes.position.setXYZ( i, v.x, v.y, v.z );
        }
        clothGeometry.attributes.position.needsUpdate = true;
        clothGeometry.computeVertexNormals();
    }


    // const MAX_SEGMENTS = 500;
    // const SEGMENT_SIZE = 3 * 3; //vertex is 3 numbers

    // // geometry
    // var geometry = new THREE.BufferGeometry();
    
    // // attributes
    // var positions = new Float32Array( MAX_SEGMENTS * SEGMENT_SIZE ); // 3 vertices per point
    // geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    
    // // material
    // var material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
    
    // // mesh
    // this.mesh = new THREE.Mesh( geometry,  material );
    // this.mesh.dynamic = true;
	// this.mesh.matrixAutoUpdate = false;
    // this.mesh.frustumCulled = false;
    // scene.add( this.mesh );
    
    // var newPos = new THREE.Vector3();
    // this.update = function updateContrails(){
    //     var positions = this.mesh.geometry.attributes.position.array;

    //     anchorObj.getWorldPosition(newPos);

    //     // VERTEX
    //     // shift all segments down
    //     for (var s = MAX_SEGMENTS - 2; s >= 0; s--){
    //         let curr = (s * SEGMENT_SIZE);
    //         let next = ((s + 1) * SEGMENT_SIZE);
    //         for (var i = 0; i < SEGMENT_SIZE; i++){
    //             positions[next + i] = positions[curr + i];
    //         }
    //     }
    //     var origin = [newPos.x * 1, newPos.y * 1, newPos.z * 1];
    //     var seg = [
    //         [origin[0], origin[1], origin[2]],
    //         [origin[0], origin[1] + 2, origin[2]],
    //         [origin[0], origin[1] + 2, origin[2] + 2],
    //     ]
    //     // add new segment
    //     for (var v = 0; v < seg.length; v++){
    //         for (var i = 0; i < seg[v].length; i++){
    //             positions[v * 3 + i] = seg[v][i];
    //         }
    //     }
    //     this.mesh.geometry.attributes.position.needsUpdate = true;
    // }
}


var z = new THREE.Vector3(0,0,1),
    y = new THREE.Vector3(0,1,0),
    x = new THREE.Vector3(1,0,0);
var gimbalTarget = new THREE.Quaternion();
var tempQuat = new THREE.Quaternion();
var rotationTarget = new THREE.Quaternion();
var tempVect = new THREE.Vector3();
var localInertia = new THREE.Vector3();
var inertia = new THREE.Vector3();
var lastFrame = 0;
var animate = function (now) {
    let delta;
    let frameTimeDelta = now - lastFrame;

    //visual flair
    gimbalTarget.setFromAxisAngle(z, Math.PI / 3 * -controls.joystick.x); //left-right
    gimbalTarget.multiply(tempQuat.setFromAxisAngle(x, Math.PI / 8 * Math.abs(controls.joystick.x))); //slight up-down for left-right
    gimbalTarget.multiply(tempQuat.setFromAxisAngle(x, Math.PI / 6 * -controls.joystick.y)); //up-down
    delta = gimbal.quaternion.angleTo(gimbalTarget);
    gimbal.quaternion.rotateTowards(gimbalTarget, delta / 10);

    //rotation (joystick)
    rotationTarget.copy(airplane.quaternion);
    rotationTarget.multiply(tempQuat.setFromAxisAngle(y, Math.PI / 16 * -controls.joystick.x)); //turn left-right
    rotationTarget.multiply(tempQuat.setFromAxisAngle(x, Math.PI / 8 * -controls.joystick.y)); //pitch up-down
    //rotation (roll)
    rotationTarget.multiply(tempQuat.setFromAxisAngle(z, Math.PI / 10 * -controls.roll));
    //rotation acceleration
    delta = airplane.quaternion.angleTo(rotationTarget);
    airplane.quaternion.rotateTowards(rotationTarget, delta / 10);

    //movement
    // airplane.translateOnAxis(z, -controls.throttle);
    // if(controls.throttle < 1){
    //     airplane.position.y -= 0.5 * (1 - controls.throttle);
    // }
    //inertia
    tempVect.set(0,0,0);
    tempVect.z = -controls.throttle; //forward movement
    tempVect.applyQuaternion(airplane.quaternion); //make (previous transforms) local to airplane rotation
    if(controls.throttle < 1){
        tempVect.y = -0.5 * (1 - controls.throttle);
    }
    inertia.add(tempVect.multiplyScalar(0.1)); //how fast inertia goes up
    inertia.multiplyScalar(0.97); //how fast inertia goes down
    airplane.position.add(inertia);

    //propeller rotation
    var propeller = airplane.getObjectByName("Propeller");
    if(propeller){
        propeller.rotation.y += 0.3 * controls.throttle;
    }

    //wind + tassles
    localInertia.copy(inertia);
    localInertia.negate();
    tempQuat.copy(airplane.quaternion);
    tempQuat.inverse();
    localInertia.applyQuaternion(tempQuat);
    tempQuat.copy(gimbal.quaternion);
    tempQuat.inverse();
    localInertia.applyQuaternion(tempQuat);

    tempQuat.setFromAxisAngle(x, Math.PI / 4 * -controls.roll);
    tempVect.copy(localInertia);
    tempVect.applyQuaternion(tempQuat);
    contrailR.update(now, tempVect);

    tempQuat.setFromAxisAngle(x, Math.PI / 4 * controls.roll);
    tempVect.copy(localInertia);
    tempVect.applyQuaternion(tempQuat);
    contrailL.update(now, tempVect);

    //sun follow player
    skyLight.position.addVectors(airplane.position, skyLightBasePos);
    //water follow player
    water.position.multiplyVectors(tempVect.set(1,0,1), airplane.position);

    // orbitcam.update();

    renderer.render( scene, camera );
    requestAnimationFrame( animate );
};
animate();

addEventListener('resize', e =>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function loadAsPromise(loader, url){
    return new Promise((resolve, reject)=>{
        loader.load(url, resolve, null, reject);
    })
}

function rotateAroundObjectAxis(object, axis, radians) {
    var rotationMatrix = new THREE.Matrix4();

    rotationMatrix.makeRotationAxis(axis.normalize(), radians);
    object.matrix.multiply(rotationMatrix);
    object.rotation.setFromRotationMatrix( object.matrix );

}

function rotateAroundWorldAxis(object, axis, radians ) {

  var rotationMatrix = new THREE.Matrix4();

  rotationMatrix.makeRotationAxis( axis.normalize(), radians );
  rotationMatrix.multiply( object.matrix );                       // pre-multiply
  object.matrix = rotationMatrix;
  object.rotation.setFromRotationMatrix( object.matrix );
}