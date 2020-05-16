class RenderTasks {
    constructor(){
        this.tasks = {};
        this.running = false;
    }    

    add(name, task, context){
        if (this.tasks[name])
            console.warn(`task ${name} already exists, will be overwritten`);
        if (task.toString().includes('requestAnimationFrame'))
            throw new Error(`task ${name} calls requestAnimationFrame internally`);

        this.tasks[name] = task.bind(context);
    }
    remove(name){
        delete this.tasks[name];
    }
    start(){
        this.running = true;
        requestAnimationFrame(this.render.bind(this));
    }
    stop(){
        this.running = false;
    }

    render(time){
        if (!this.running) return;

        for (let task of Object.keys(this.tasks)){
            if(this.tasks.hasOwnProperty(task)){
                this.tasks[task](time);
            }
        }
        requestAnimationFrame(this.render.bind(this))
    }
}
export default RenderTasks;