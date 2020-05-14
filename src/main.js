import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Water } from 'three/examples/jsm/objects/Water';
import { Sky } from 'three/examples/jsm/objects/Sky';
import Ui from './ui.js'

var controls = {};
Ui.init('.ui-overlay');
Ui.MouseJoystick(e=>{
    controls.joystick = e;
})
Ui.Buttons(e=>{
    controls.buttons = e.buttons;
    controls.roll = e.roll;
})

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 4000 );
var gltfloader = new GLTFLoader();

const color_water = 0x1c91ff;
const color_sky = 0xd9eeff;
const color_horizon = 0xc9d0d4;
const color_sun = 0xffffff;

var renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

scene.background = new THREE.Color(color_sky);
// scene.fog = new THREE.Fog( color_horizon, 1, 1000 );

var hemiLight = new THREE.HemisphereLight( color_sky, color_water, 1 );
scene.add( hemiLight );
var hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
scene.add( hemiLightHelper );
                
var skyLight = new THREE.DirectionalLight( color_sun, 1 );
skyLight.position.set( - 1, 1.75, 1 );
skyLight.position.multiplyScalar( 30 );
scene.add( skyLight );

// Sun Shadows
renderer.shadowMapEnabled = true;
skyLight.castShadow = true;
skyLight.shadow.mapSize.width = 2048;
skyLight.shadow.mapSize.height = 2048;
var d = 50;
skyLight.shadow.camera.left = - d;
skyLight.shadow.camera.right = d;
skyLight.shadow.camera.top = d;
skyLight.shadow.camera.bottom = - d;
skyLight.shadow.camera.far = 3500;
skyLight.shadow.bias = - 0.0001;

var dirLightHelper = new THREE.DirectionalLightHelper( skyLight, 10 );
scene.add( dirLightHelper );

var groundGeo = new THREE.PlaneBufferGeometry( 10000, 10000 );
var groundMat = new THREE.MeshPhongMaterial( { color: color_water } );
var ground = new THREE.Mesh( groundGeo, groundMat );
ground.position.y = - 33;
ground.rotation.x = - Math.PI / 2;
// ground.receiveShadow = true;
scene.add( ground );

var grid = new THREE.GridHelper(10000, 100, 0xffffff);
grid.position.y = 1;
scene.add(grid);

// Water
var waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );

var water = new Water(
    waterGeometry,
    {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load( 'waternormals3.jpg', function ( texture ) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        } ),
        alpha: 0.1,
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

function updateSun() {

    var theta = Math.PI * ( parameters.inclination - 0.5 );
    var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );

    skyLight.position.x = parameters.distance * Math.cos( phi );
    skyLight.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
    skyLight.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );

    sky.material.uniforms[ 'sunPosition' ].value = skyLight.position.copy( skyLight.position );
    water.material.uniforms[ 'sunDirection' ].value.copy( skyLight.position ).normalize();

    cubeCamera.update( renderer, sky );

}
updateSun();


// // Orbit Camera
// var controls = new OrbitControls( camera, renderer.domElement );
// camera.position.set( 0, 60, 20 );
// orbitcam.update();

// Airplane
var airplane = new THREE.Group();
var gimbal = new THREE.Group();
airplane.add(gimbal);
airplane.position.set(0, 50, 0);

gltfloader.load(
	// resource URL
	'airplane.gltf',
	// called when the resource is loaded
	function ( gltf ) {
        console.log(gltf);
        while(gltf.scene.children.length){
            var c = gltf.scene.children[0];
            c.castShadow = true;
            c.receiveShadow = true;
            gimbal.add(c);
            airplane.add(camera);
            camera.position.set(0, 5, 20);
            camera.lookAt(airplane.position);
        }
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
		console.log( 'error loading model', e );
	}
);

var z = new THREE.Vector3(0,0,1),
    y = new THREE.Vector3(0,1,0),
    x = new THREE.Vector3(1,0,0);
var gimbalTarget = new THREE.Quaternion();
var tempQuat = new THREE.Quaternion();
var movementTarget = new THREE.Quaternion();
var currentQuaternion = new THREE.Quaternion();
var animate = function () {

    var propeller = airplane.getObjectByName("Propeller");
    if(propeller){
        propeller.rotation.y += 0.3;
    }
    let delta;

    if (controls.joystick){
        //visual flair
        gimbalTarget.setFromAxisAngle(z, Math.PI / 3 * -controls.joystick.x); //left-right
        gimbalTarget.multiply(tempQuat.setFromAxisAngle(x, Math.PI / 8 * Math.abs(controls.joystick.x))) //slight up-down for left-right
        gimbalTarget.multiply(tempQuat.setFromAxisAngle(x, Math.PI / 6 * -controls.joystick.y)) //up-down
        delta = gimbal.quaternion.angleTo(gimbalTarget);
        gimbal.quaternion.rotateTowards(gimbalTarget, delta / 10);

        //rotation
        movementTarget.setFromAxisAngle(y, Math.PI / 8 * -controls.joystick.x); //turn left-right
        movementTarget.multiply(tempQuat.setFromAxisAngle(x, Math.PI / 8 * -controls.joystick.y)) //pitch up-down
        movementTarget.multiply(airplane.quaternion); //continous increment
        delta = airplane.quaternion.angleTo(movementTarget);
        airplane.quaternion.rotateTowards(movementTarget, delta / 10);

    }
    if (controls.buttons){
        if (controls.roll){
            movementTarget.setFromAxisAngle(z, Math.PI / 10 * controls.roll); //roll left-right
            movementTarget.multiply(airplane.quaternion); //continous increment
            delta = airplane.quaternion.angleTo(movementTarget);
            airplane.quaternion.rotateTowards(movementTarget, delta / 10);
        }
    }

    //movement
    airplane.translateOnAxis(z, -1);
    
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