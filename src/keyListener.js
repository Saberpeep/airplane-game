class KeyListener {
    constructor(){
        this.tasks = {};
        this.activeKeys = {};
    }    

    add(name, keys, task, context){
        if (this.tasks[name])
            console.warn(`task ${name} already exists, will be overwritten`);

        this.tasks[name] = {
            task: task.bind(context),
            keys: keys,
        }
    }
    remove(name){
        delete this.tasks[name];
    }
    start(){
        document.addEventListener('keydown', this.keyHandler.bind(this));
        document.addEventListener('keyup', this.keyHandler.bind(this));
        document.addEventListener('blur', this.clear.bind(this));
    }
    stop(){
        document.removeEventListener('keydown', this.keyHandler);
        document.removeEventListener('keyup', this.keyHandler);
        document.removeEventListener('blur', this.clear);
    }
    keyHandler(e){
        if (e.type == "keydown"){
            this.activeKeys[e.key && e.key.toLowerCase()] = true;
        }else{
            delete this.activeKeys[e.key && e.key.toLowerCase()];
        }
        this.triggerTasks(e);
    }
    clear(e) {
        this.activeKeys = {};
        this.triggerTasks(e);
    }
    triggerTasks(e) {
        for (let t of Object.keys(this.tasks)){
            if(this.tasks.hasOwnProperty(t)){
                let item = this.tasks[t];
                if(item.keys.includes(e.key && e.key.toLowerCase())){
                    item.task(this.activeKeys, e);
                }
            }
        }
    }
}
export default KeyListener;