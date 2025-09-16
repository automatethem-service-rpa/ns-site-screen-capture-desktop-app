class Work {
    constructor() {
        this.running = false;
    }

    async start() {
        this.running = true;
        console.log("작업 시작");
        return `start response`;
    }

    async stop() {
        console.log("작업 중단");
        this.running = false;
        return `stop response`;
    }
}

module.exports = Work;
