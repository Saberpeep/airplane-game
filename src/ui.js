import Zdog from 'Zdog';

var ui = {
    init: init,
    MouseJoystick: MouseJoystick,
};
var canvas;
var els = {};
var now = 0;

//accepts normalized 2d vector as percentages to anchor element to
function anchor2d(el, vec2){
    window.addEventListener('resize', ()=>{
        if (!el) return;

        el.translate = {
            x: (canvas.width / 2) * vec2.x,
            y: (canvas.height / 2) * vec2.y,
        };

    }, {passive: true})
}

function init(el){
    if (!el) throw new Error('ui requires a canvas or svg');

    if (typeof el == "string") el = document.querySelector(el);
    canvas = el;

    els.illo = new Zdog.Illustration({
        element: canvas || '.zdog-canvas',
        resize: true,
    });
    requestAnimationFrame(render);
}
function render(e){
    now = e;
    els.illo.updateRenderGraph();
    requestAnimationFrame(render);
}
function MouseJoystick(handler){
    var outerBound = 300;
    var deadZone = 50;
    els.mjs = {};
    els.mjs.group = new Zdog.Group({
        addTo: els.illo,
    })
    els.mjs.outer = new Zdog.Ellipse({
        addTo: els.mjs.group,
        diameter: outerBound * 2,
        stroke: 10,
        color: '#fff',
    });
    els.mjs.inner = new Zdog.Ellipse({
        addTo: els.mjs.group,
        diameter: deadZone * 2,
        stroke: 5,
        color: '#fff',
        visible: false,
    });
    els.mjs.pointer = new Zdog.Ellipse({
        addTo: els.mjs.group,
        diameter: 20,
        stroke: 10,
        color: '#fff',
        visible: false,
    });

    const origin = {x: 0, y: 0};
    var target = {x: 0, y: 0},
        pointer = {x: 0, y: 0};
    
    //enable-disable pointer lock
    canvas.addEventListener('click', e =>{
        if(getDistance({x: canvas.width / 2, y: canvas.height / 2}, {x:e.offsetX, y:e.offsetY}) <= outerBound){
            canvas.requestPointerLock();
            document.addEventListener('pointerlockerror', e=>{ throw e }, false);
            document.addEventListener('pointerlockchange', e=>{
                if (document.pointerLockElement === canvas){
                    els.mjs.pointer.visible = true;
                    els.mjs.inner.visible = true;
                    document.addEventListener("mousemove", updatePosition, false);
                }else{
                    els.mjs.pointer.visible = false;
                    els.mjs.inner.visible = false;
                    document.removeEventListener("mousemove", updatePosition, false);
                    target = {x: 0, y: 0},
                    pointer = {x: 0, y: 0};
                }
            }, false);
        }
    });

    //capture and translate mouse input
    function updatePosition(e){
        target.x += e.movementX
        target.y += e.movementY;

        if (getDistance(origin, target) > outerBound){
            var angle = getAngle(origin, target);
            var point = getPointAtRadius(outerBound, angle);
            target = point;
            pointer = copy(point);
        }else{
            pointer = copy(target);
        }

        els.mjs.pointer.translate = copy(pointer);
    }
    

    // var event = new CustomEvent('move', { detail: {  } });
    // ui.canvas.dispatchEvent(event);

    return {};
}

function getDistance(p1, p2){
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function getAngle(p1, p2){
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI; 
    //returns radians (...* 180 / Math.PI for degrees)
    //adding pi to offset ouput into positive range (0-360)
}

function getPointAtRadius(radius, angle){
    //x=rsinθ , y=rcosθ
    // angle = angle * Math.PI / 180; //to radians
    return {y: -radius * Math.sin(angle), x: -radius * Math.cos(angle)}
}

function mapScale(num, in_min, in_max, out_min, out_max){
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function copy(obj){
    return JSON.parse(JSON.stringify(obj));
}

export default ui;