import RenderTasks from './renderTasks.js';
import KeyListener from './keyListener.js';

var ui = {
    init: init,
    MouseJoystick: MouseJoystick,
    RollSlider: RollSlider,
    ThrottleSlider: ThrottleSlider,
};
var container;
var renderTasks = new RenderTasks();
var keyListener = new KeyListener();

//debug
keyListener.add('debug', 'p', e=>{
    if(e['p']) { debugger };
})

function init(el){
    if (!el) throw new Error('ui requires a canvas or svg');

    if (typeof el == "string") el = document.querySelector(el);
    container = el;
    keyListener.start();
    renderTasks.start();
}
function RollSlider(handler){
    var outerBound = 300;
    var keyup = 'e';
    var keydown = 'q';
    var id = 'slider-roll';

    var wrapEl = document.querySelector(`.slider-holder.h`);
    if (!wrapEl){
        wrapEl = document.createElement('div');
        wrapEl.classList.add('slider-holder','h');
        container.append(wrapEl);
    }
    var barEl = document.createElement('div');
    barEl.classList.add('slider');
    barEl.style.setProperty('--length', `${outerBound * 2}px`);
    
    var pointerEl = document.createElement('div');
    pointerEl.classList.add('pointer');

    barEl.append(pointerEl);
    wrapEl.append(barEl);

    var target = 0;
    var current = 0;
    var percentSmoothing = 10;

    keyListener.add(id, [keyup, keydown], function(e){
        if(e[keyup]){
            target = 1;
        }else if(e[keydown]){
            target = -1;
        }else{
            target = 0;
        }
    }, this);

    function tween(){
        var increment = mapScale((outerBound / percentSmoothing), 0, outerBound * 2, 0, target - current);
        current += increment;
        if(Math.abs(current) <= 0.001) current = 0;

        translateTo(pointerEl, {x: outerBound * current, y: 0});

        handler(current);
    }
    renderTasks.add(id, tween, this);
}
function ThrottleSlider(handler){
    var outerBound = 300;
    var keyup = 'w';
    var keydown = 's';
    var keyboost = 'shift';
    var id = 'slider-throttle';

    var wrapEl = document.querySelector(`.slider-holder.v`);
    if (!wrapEl){
        wrapEl = document.createElement('div');
        wrapEl.classList.add('slider-holder', 'v');
        container.append(wrapEl);
    }
    var barEl = document.createElement('div');
    barEl.classList.add('slider');
    barEl.style.setProperty('--length', `${outerBound * 2}px`);
    
    var pointerEl = document.createElement('div');
    pointerEl.classList.add('pointer');

    barEl.append(pointerEl);
    wrapEl.append(barEl);

    var baseSpeed = 1;
    var target = baseSpeed;
    var current = 1;
    var percentSmoothing = 10;

    keyListener.add(id, [keyup, keydown, keyboost], function(e){
        if(e[keyup]){
            if(e[keyboost]){
                target = baseSpeed * 4;
            }else{
                target = baseSpeed * 2;
            }
        }else if(e[keydown]){
            target = baseSpeed / 2;
        }else{
            target = baseSpeed;
        }
    }, this);

    function tween(){
        var increment = mapScale((outerBound / percentSmoothing), 0, outerBound * 2, 0, target - current);
        current += increment;

        var visualScale = mapScale(current, 0, baseSpeed * 4, outerBound, -outerBound);
        translateTo(pointerEl, {x: 0, y: visualScale});

        handler(current);
    }
    renderTasks.add(id, tween, this);
}

function MouseJoystick(handler){
    var outerBound = 150;
    var deadZone = 50;

    var wrapEl = document.createElement('div');
    wrapEl.classList.add('virtual-joystick');
    wrapEl.style.setProperty('--outerBound', `${outerBound * 2}px`);
    wrapEl.style.setProperty('--deadzone', `${deadZone * 2}px`);

    var outerRingEl = document.createElement('div');
    outerRingEl.classList.add('outer');

    var innerRingEl = document.createElement('div');
    innerRingEl.classList.add('inner');

    var pointerEl = document.createElement('div');
    pointerEl.classList.add('pointer');

    wrapEl.append(outerRingEl);
    wrapEl.append(innerRingEl);
    wrapEl.append(pointerEl);
    container.append(wrapEl);

    const origin = {x: 0, y: 0};
    var target = {x: 0, y: 0},
        pointer = {x: 0, y: 0};
    
    //request pointer lock if circle clicked
    wrapEl.addEventListener('click', e =>{
        if(getDistance(getCenter(e.target), {x:e.offsetX, y:e.offsetY}) <= outerBound){
            container.requestPointerLock();
        }
    });
    //start stop on pointer lock/unlock
    document.addEventListener('pointerlockerror', e=>{ throw e }, false);
    document.addEventListener('pointerlockchange', e=>{
        if (document.pointerLockElement === container){
            wrapEl.classList.add('active');
            document.addEventListener("mousemove", updatePosition, false);
            renderTasks.add('mjs', tween, this);
        }else{
            renderTasks.remove('mjs');
            wrapEl.classList.remove('active');
            document.removeEventListener("mousemove", updatePosition, false);
            target = {x: 0, y: 0},
            pointer = {x: 0, y: 0};
            translateTo(pointerEl, pointer);
            handler(copy(origin));
        }
    }, false);

    var movementX = 0;
    var movementY = 0;
    var lastUpdate = 0;

    //capture and translate mouse input
    function updatePosition(e){
        movementX = e.movementX;
        movementY = e.movementY;
        lastUpdate = performance.now();
    }

    //smooth mouse input
    var percentSmoothing = 10;
    function tween(time){
        //if not locked, stop loop;
        if (document.pointerLockElement !== container) return;

        //parse movement this frame
        target.x += movementX;
        target.y += movementY;

        // if pointer has reached target, skip tweening
        if (equalsRounded(target, pointer)){
            pointer = copy(target);
        }else{
            //limit to outerbound circle
            if (getDistance(origin, target) > outerBound){
                var angle = getAngle(origin, target);
                var point = getPointAtRadius(outerBound, angle);
                target = point;
            }
            //snap to deadzone center
            // motion = Math.max(Math.abs(movementX), Math.abs(movementY));
            if (movementX == 0 && movementY == 0 && getDistance(origin, target) < deadZone){
                target = copy(origin);
            }

            //calc tweening
            var incrementX = mapScale(outerBound - (outerBound / percentSmoothing), 0, outerBound * 2, 0, target.x - pointer.x);
            var incrementY = mapScale(outerBound - (outerBound / percentSmoothing), 0, outerBound * 2, 0, target.y - pointer.y);
            pointer.x += incrementX;
            pointer.y += incrementY;
            translateTo(pointerEl, pointer);
    
            //output
            var normalized = {
                x: mapScale(pointer.x, -outerBound, outerBound, -1, 1),
                y: mapScale(pointer.y, -outerBound, outerBound, -1, 1),
            }
            //clear motion for this frame (lets motion checks know we have handled this frame)
            // but only clear it if the mouse update is not busy
            if (time - lastUpdate > 16){
                movementX = 0;
                movementY = 0;
            }
            

            //output changes
            handler(normalized);
        }        
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

const twoSqrt2 = 2 * Math.sqrt(2);
function mapCircleToSquare(p1){
    //u = xCircle and v = yCircle;
    // x = ½ √( 2 + u² - v² + 2u√2 ) - ½ √( 2 + u² - v² - 2u√2 )
    // y = ½ √( 2 - u² + v² + 2v√2 ) - ½ √( 2 - u² + v² - 2v√2 )

    let u = p1.x;
    let v = p1.y;
    let usq = u * u;
    let vsq = v * v;
    let fu = twoSqrt2 * u;
    let fv = twoSqrt2 * v;
    let x =
        0.5 * Math.sqrt(2 + fu + usq - vsq) - 0.5 * Math.sqrt(2 - fu + usq - vsq);
    let y =
        0.5 * Math.sqrt(2 + fv - usq + vsq) - 0.5 * Math.sqrt(2 - fv - usq + vsq);
    return {
        x: x,
        y: y,
    };

    // var u = p1.x;
    // var v = p1.y;
    // var u2 = u * u;
    // var v2 = v * v;
    // var twosqrt2 = 2.0 * Math.sqrt(2.0);
    // var subtermx = 2.0 + u2 - v2;
    // var subtermy = 2.0 - u2 + v2;
    // var termx1 = subtermx + u * twosqrt2;
    // var termx2 = subtermx - u * twosqrt2;
    // var termy1 = subtermy + v * twosqrt2;
    // var termy2 = subtermy - v * twosqrt2;
    // return {
    //     x: 0.5 * Math.sqrt(termx1) - 0.5 * Math.sqrt(termx2),
    //     y: 0.5 * Math.sqrt(termy1) - 0.5 * Math.sqrt(termy2),
    // }
    

    // return {
    //     x: 0.5 * Math.sqrt(2 + (p1.x * p1.x) - (p1.y * p1.y) + 2 * p1.x * Math.sqrt(2)) 
    //      - 0.5 * Math.sqrt(2 + (p1.x * p1.x) - (p1.y * p1.y) - 2 * p1.x * Math.sqrt(2)),
    //     y: 0.5 * Math.sqrt(2 - (p1.x * p1.x) + (p1.y * p1.y) + 2 * p1.y * Math.sqrt(2)) 
    //      - 0.5 * Math.sqrt(2 - (p1.x * p1.x) + (p1.y * p1.y) - 2 * p1.y * Math.sqrt(2)),
    // }

}

function getSign(num){
    return num / Math.abs(num);
}

function copy(obj){
    return JSON.parse(JSON.stringify(obj));
}
function equals(p1, p2){
    return p1.x == p2.x && p1.y == p2.y;
}
function equalsRounded(p1, p2){
    return Math.round(p1.x) == Math.round(p2.x) && Math.round(p1.y) == Math.round(p2.y);
}

function hide(el){
    el.classList.add('hidden');
}
function show(el){
    el.classList.remove('hidden');
}
function translateTo(el, p1){
    el.style.setProperty('transform', `translate(${p1.x}px,${p1.y}px)`)
}
function getCenter(el){
    var rect = el.getBoundingClientRect(el);
    return {x: rect.width / 2, y: rect.height / 2};
}

export default ui;